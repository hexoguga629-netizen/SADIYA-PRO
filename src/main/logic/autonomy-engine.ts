import { IpcMain, BrowserWindow, app, shell } from 'electron'
import { execFile } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { chatWithAI } from '../services/ai-providers'
import { loadSecureVault } from '../security/vault'

type ToolName =
  | 'ai_chat'
  | 'open_app'
  | 'open_url'
  | 'search_web'
  | 'search_files'
  | 'list_files'
  | 'system_info'
  | 'remember'
  | 'recall_memory'
  | 'activate_protocol'
  | 'open_project'
  | 'run_terminal'
  | 'screenshot'
  | 'android_adb'

type GraphNode = {
  id: string
  title: string
  tool: ToolName
  args: Record<string, any>
  dependsOn?: string[]
  retries?: number
  score?: number
}

type GraphPlan = {
  goal: string
  protocol: string
  summary: string
  nodes: GraphNode[]
  edges: Array<{ from: string; to: string }>
  successCriteria: string[]
}

type NodeResult = {
  nodeId: string
  tool: ToolName
  success: boolean
  output: string
  error?: string
  attempt: number
  startedAt: number
  finishedAt: number
}

// Re-use MemoryEntry from vector-memory as MemoryItem
import type { MemoryEntry as MemoryItem, MemoryType } from '../../core/vector-memory'

type RuntimeState = {
  activeGraph: GraphPlan | null
  results: NodeResult[]
  lastPlan: GraphPlan | null
  activeProtocol: string
}

const MEMORY_DIR = path.join(app.getPath('userData'), 'autonomy')
const MEMORY_FILE = path.join(MEMORY_DIR, 'memory.json')
const STATE_FILE = path.join(MEMORY_DIR, 'state.json')

if (!fs.existsSync(MEMORY_DIR)) {
  fs.mkdirSync(MEMORY_DIR, { recursive: true })
}

function ensureJsonFile(filePath: string, fallback: unknown) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), 'utf-8')
  }
}

function readJson<T>(filePath: string, fallback: T): T {
  ensureJsonFile(filePath, fallback)
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T
  } catch {
    return fallback
  }
}

function writeJson(filePath: string, data: unknown) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

function genId(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

function normalizeText(text: string) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s._/-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function embedText(text: string, dims = 64): number[] {
  const vec = new Array(dims).fill(0)
  const tokens = normalizeText(text).split(' ').filter(Boolean)

  for (const token of tokens) {
    let hash = 0
    for (let i = 0; i < token.length; i++) {
      hash = (hash * 31 + token.charCodeAt(i)) >>> 0
    }
    vec[hash % dims] += 1
  }

  const norm = Math.sqrt(vec.reduce((sum, n) => sum + n * n, 0)) || 1
  return vec.map((n) => n / norm)
}

function cosineSimilarity(a: number[], b: number[]) {
  const len = Math.min(a.length, b.length)
  let dot = 0
  let magA = 0
  let magB = 0

  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }

  const denom = Math.sqrt(magA) * Math.sqrt(magB) || 1
  return dot / denom
}

import { storeMemory, searchMemory, loadMemory } from '../../core/vector-memory'

// Wrapper that adapts the autonomy engine's call-pattern to storeMemory's signature
async function appendMemory(type: MemoryType, text: string, tags: string[] = []) {
  await storeMemory(type, text, tags, {})
}

function loadState(): RuntimeState {
  return readJson<RuntimeState>(STATE_FILE, {
    activeGraph: null,
    results: [],
    lastPlan: null,
    activeProtocol: 'default'
  })
}

function saveState(state: RuntimeState) {
  writeJson(STATE_FILE, state)
}

function getMainWindow(getMainWindow: () => BrowserWindow | null) {
  const win = getMainWindow()
  return win && !win.isDestroyed() ? win : null
}

function send(win: BrowserWindow | null, channel: string, payload: unknown) {
  if (win) win.webContents.send(channel, payload)
}

function toolScore(query: string, tool: ToolName) {
  const text = normalizeText(query)
  const weight: Record<ToolName, string[]> = {
    ai_chat: ['explain', 'reason', 'analyze', 'answer', 'compare'],
    open_app: ['open', 'launch', 'start', 'run app', 'app'],
    open_url: ['open url', 'website', 'link', 'page', 'open site'],
    search_web: ['search', 'google', 'web', 'internet', 'online'],
    search_files: ['find file', 'search file', 'locate file', 'file'],
    list_files: ['list', 'directory', 'folder', 'files'],
    system_info: ['system', 'cpu', 'ram', 'memory', 'health', 'status'],
    remember: ['remember', 'save memory', 'note', 'memorize'],
    recall_memory: ['recall', 'memory', 'what do you remember'],
    activate_protocol: ['protocol', 'mode', 'switch mode'],
    open_project: ['open project', 'workspace', 'load project', 'project'],
    run_terminal: ['terminal', 'cmd', 'shell', 'powershell', 'run command'],
    screenshot: ['screenshot', 'capture screen', 'screen capture', 'snap'],
    android_adb: ['android', 'adb', 'phone', 'mobile', 'device']
  }

  const tokens = weight[tool] || []
  let score = 0
  for (const t of tokens) {
    if (text.includes(t)) score += 1
  }
  return score
}

function rankTools(query: string) {
  const tools: ToolName[] = [
    'ai_chat',
    'open_app',
    'open_url',
    'search_web',
    'search_files',
    'list_files',
    'system_info',
    'remember',
    'recall_memory',
    'activate_protocol',
    'open_project',
    'run_terminal',
    'screenshot',
    'android_adb'
  ]

  return tools
    .map((tool) => ({ tool, score: toolScore(query, tool) }))
    .sort((a, b) => b.score - a.score)
}

function extractJson(raw: string) {
  const text = String(raw || '').trim()
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced?.[1]?.trim() || text
  const firstBrace = candidate.indexOf('{')
  const lastBrace = candidate.lastIndexOf('}')
  const slice =
    firstBrace >= 0 && lastBrace > firstBrace
      ? candidate.slice(firstBrace, lastBrace + 1)
      : candidate

  return JSON.parse(slice)
}

function getOpenAppTarget(appName: string) {
  const lower = appName.toLowerCase().trim()
  const map: Record<string, string> = {
    chrome: process.platform === 'win32' ? 'chrome' : 'google-chrome',
    firefox: 'firefox',
    notepad: 'notepad.exe',
    calculator: process.platform === 'win32' ? 'calc.exe' : 'gnome-calculator',
    terminal: process.platform === 'win32' ? 'cmd.exe' : 'x-terminal-emulator',
    'file manager': process.platform === 'win32' ? 'explorer.exe' : 'nautilus',
    explorer: 'explorer.exe',
    vscode: 'code',
    'vs code': 'code'
  }

  return map[lower] || appName
}

function runExecFile(file: string, args: string[]) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    execFile(file, args, { windowsHide: true, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(stderr || err.message))
        return
      }
      resolve({
        stdout: String(stdout || ''),
        stderr: String(stderr || '')
      })
    })
  })
}

function readDirTree(root: string, maxDepth = 2, maxFiles = 300) {
  const resolved = path.resolve(root)
  const results: string[] = []
  const queue: Array<{ dir: string; depth: number }> = [{ dir: resolved, depth: 0 }]
  const ignored = new Set(['node_modules', '.git', 'dist', 'build', 'out', '.next'])

  while (queue.length) {
    const current = queue.shift()!
    let entries: fs.Dirent[] = []
    try {
      entries = fs.readdirSync(current.dir, { withFileTypes: true })
    } catch {
      continue
    }

    for (const entry of entries) {
      if (results.length >= maxFiles) break
      if (ignored.has(entry.name.toLowerCase())) continue

      const full = path.join(current.dir, entry.name)
      if (entry.isDirectory() && current.depth < maxDepth) {
        queue.push({ dir: full, depth: current.depth + 1 })
      } else if (entry.isFile()) {
        results.push(full)
      }
    }
  }

  return results
}

async function executeNode(
  node: GraphNode,
  runtime: RuntimeState,
  getMainWindowFn: () => BrowserWindow | null
): Promise<string> {
  switch (node.tool) {
    case 'open_url': {
      const url = String(node.args?.url || '')
      if (!url) throw new Error('Missing url')
      const { browserController } = await import('../automation/browser-controller')
      await browserController.open(url)
      return `Opened URL in automation browser: ${url}`
    }

    case 'search_web': {
      const query = String(node.args?.query || '')
      if (!query) throw new Error('Missing query')
      const { browserController } = await import('../automation/browser-controller')
      await browserController.searchGoogle(query)
      return `Performed web search for: ${query}`
    }

    case 'screenshot': {
      const { desktopCapturer } = await import('electron')
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1920, height: 1080 }
      })
      if (sources[0]) {
        const screenshotDir = path.join(app.getPath('userData'), 'Screenshots')
        if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true })
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const filePath = path.join(screenshotDir, `screenshot-${timestamp}.png`)
        fs.writeFileSync(filePath, sources[0].thumbnail.toPNG())
        return `Screenshot captured and saved to: ${filePath}`
      }
      throw new Error('No screen sources found')
    }

    case 'android_adb': {
      const { adbDevices, adbScreenshot, adbLaunch } = await import('../automation/android-controller')
      const subaction = String(node.args?.subaction || 'devices')
      
      if (subaction === 'devices') {
        const res = await adbDevices()
        return res.stdout || 'No devices found'
      }
      if (subaction === 'screenshot') {
        const res = await adbScreenshot()
        return res.success ? `Captured Android screenshot (base64 length: ${res.base64?.length})` : `ADB Error: ${res.error}`
      }
      if (subaction === 'launch') {
        const pkg = String(node.args?.package || '')
        const res = await adbLaunch(pkg)
        return res.success ? `Launched ${pkg}` : `ADB Error: ${res.error}`
      }
      return 'Unknown ADB subaction'
    }

    case 'open_app': {
      const appName = String(node.args?.app || '')
      if (!appName) throw new Error('Missing app')
      const target = getOpenAppTarget(appName)

      const { execFile } = await import('child_process')
      if (process.platform === 'win32') {
        await new Promise<void>((resolve, reject) => {
          execFile('cmd', ['/c', 'start', '', target], (err) => (err ? reject(err) : resolve()))
        })
      } else {
        try {
          await new Promise<void>((resolve, reject) => {
            execFile('xdg-open', [target], (err) => (err ? reject(err) : resolve()))
          })
        } catch {
          await new Promise<void>((resolve, reject) => {
            execFile(target, [], (err) => (err ? reject(err) : resolve()))
          })
        }
      }

      return `Opened app: ${appName}`
    }

    case 'system_info': {
      return JSON.stringify(
        {
          platform: os.platform(),
          release: os.release(),
          arch: os.arch(),
          hostname: os.hostname(),
          totalMemGB: Math.round((os.totalmem() / 1024 / 1024 / 1024) * 10) / 10,
          freeMemGB: Math.round((os.freemem() / 1024 / 1024 / 1024) * 10) / 10,
          cpuCount: os.cpus().length
        },
        null,
        2
      )
    }

    case 'list_files': {
      const dir = String(node.args?.dir || process.cwd())
      const files = readDirTree(dir, 1, 100)
      return files.map((f) => path.relative(dir, f)).join('\n')
    }

    case 'search_files': {
      const query = normalizeText(String(node.args?.query || ''))
      const dir = String(node.args?.dir || process.cwd())
      const files = readDirTree(dir, 2, 200)

      const matches = files.filter((file) => {
        const name = normalizeText(path.basename(file))
        return name.includes(query)
      })

      return matches.length
        ? matches.map((m) => m).join('\n')
        : `No local file matches for: ${query}`
    }

    case 'remember': {
      const fact = String(node.args?.fact || '')
      if (!fact) throw new Error('Missing fact')
      await appendMemory('episodic', fact, ['manual', 'user'])
      return `Saved to memory: ${fact}`
    }

    case 'recall_memory': {
      const query = String(node.args?.query || '')
      const mems = query ? await searchMemory(query, 8) : loadMemory().slice(0, 8)
      return mems
        .map((m) => `${new Date(m.createdAt).toISOString()} | ${m.text} | score:${'score' in m ? (m as any).score?.toFixed?.(3) || '0.000' : 'n/a'}`)
        .join('\n')
    }

    case 'activate_protocol': {
      runtime.activeProtocol = String(node.args?.protocol || 'default')
      saveState(runtime)
      return `Protocol set to: ${runtime.activeProtocol}`
    }

    case 'open_project': {
      const projectPath = String(node.args?.projectPath || '')
      if (!projectPath) throw new Error('Missing projectPath')
      const resolved = path.resolve(projectPath)
      const files = readDirTree(resolved, 2, 200)
      saveState(runtime)
      return JSON.stringify(
        {
          root: resolved,
          totalFiles: files.length,
          sampleFiles: files.slice(0, 25)
        },
        null,
        2
      )
    }

    case 'run_terminal': {
      const command = String(node.args?.command || '')
      const cwd = String(node.args?.cwd || process.cwd())

      if (!command.trim()) throw new Error('Missing command')

      const { exec } = await import('child_process')
      return await new Promise<string>((resolve, reject) => {
        exec(command, { cwd, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
          if (err) return reject(new Error(stderr || err.message))
          resolve(String(stdout || stderr || 'Command executed.'))
        })
      })
    }

    case 'ai_chat': {
      const prompt = String(node.args?.prompt || '')
      if (!prompt) throw new Error('Missing prompt')

      const vault = loadSecureVault()
      const history = [
        {
          role: 'user',
          content: prompt
        }
      ]

      const result = await chatWithAI(prompt, history, vault)
      if (!result.success) throw new Error(result.error || 'AI execution failed')
      return result.text || ''
    }

    default:
      throw new Error(`Unsupported tool: ${node.tool}`)
  }
}

function buildPlannerPrompt(input: string, memories: MemoryItem[]) {
  const ranked = rankTools(input).slice(0, 6)
  const memoryText =
    memories.length > 0
      ? memories
          .map((m, i) => `${i + 1}. ${m.text} [tags: ${m.tags.join(', ')}]`)
          .join('\n')
      : 'No relevant memory found.'

  const toolText = ranked
    .map((t) => `- ${t.tool} (score ${t.score})`)
    .join('\n')

  return `
You are the autonomous planner for SADIYA.
Return ONLY valid JSON. No markdown, no explanation.

Task:
${input}

Relevant memory:
${memoryText}

Best tool candidates:
${toolText}

JSON schema:
{
  "goal": "string",
  "protocol": "default|coding|debug|architect|terminal|research",
  "summary": "string",
  "successCriteria": ["string"],
  "nodes": [
    {
      "id": "n1",
      "title": "string",
      "tool": "ai_chat|open_app|open_url|search_web|search_files|list_files|system_info|remember|recall_memory|activate_protocol|open_project|run_terminal|screenshot|android_adb",
      "args": {},
      "dependsOn": ["n0"],
      "retries": 2,
      "score": 0.0
    }
  ],
  "edges": [
    { "from": "n0", "to": "n1" }
  ]
}

Rules:
- Use 2 to 7 nodes max.
- Make the first node a protocol setup or context load node when relevant.
- Prefer the simplest plan that can actually work.
- If the request is coding/debugging, use protocol "coding" or "debug".
- Each node must be executable by the available tool list.
`.trim()
}

export async function planGraph(input: string) {
  const vault = loadSecureVault()
  const memories = await searchMemory(input, 6)
  const prompt = buildPlannerPrompt(input, memories)

  // IMPORTANT: our providers currently consume history, so send the whole prompt as a user message.
  const result = await chatWithAI(prompt, [{ role: 'user', content: prompt }], vault)

  if (!result.success) {
    throw new Error(result.error || 'Planner failed')
  }

  const parsed = extractJson(result.text || '')
  const graph: GraphPlan = {
    goal: String(parsed.goal || input),
    protocol: String(parsed.protocol || 'default'),
    summary: String(parsed.summary || ''),
    nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
    edges: Array.isArray(parsed.edges) ? parsed.edges : [],
    successCriteria: Array.isArray(parsed.successCriteria) ? parsed.successCriteria : []
  }

  if (!graph.nodes.length) {
    throw new Error('Planner returned no nodes')
  }

  return graph
}

async function reflectAfterRun(input: string, graph: GraphPlan, results: NodeResult[]) {
  const vault = loadSecureVault()
  const failed = results.filter((r) => !r.success)

  const prompt = `
Review this autonomous execution and produce a short JSON reflection only.

Input:
${input}

Plan:
${JSON.stringify(graph, null, 2)}

Results:
${JSON.stringify(results, null, 2)}

Return JSON:
{
  "summary": "string",
  "lessons": ["string"],
  "nextProtocol": "string",
  "memoryEntry": "string"
}

Focus on what worked, what failed, and what should be retried differently next time.
`.trim()

  const result = await chatWithAI(prompt, [{ role: 'user', content: prompt }], vault)
  if (!result.success) return null

  try {
    return extractJson(result.text || '')
  } catch {
    return null
  }
}

export async function executeGraph(
  graph: GraphPlan,
  input: string,
  getMainWindowFn: () => BrowserWindow | null
) {
  const runtime = loadState()
  runtime.activeGraph = graph
  runtime.results = []
  runtime.lastPlan = graph
  runtime.activeProtocol = graph.protocol || runtime.activeProtocol
  saveState(runtime)

  const win = getMainWindow(getMainWindowFn)

  const completed = new Set<string>()
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]))

  const canRun = (node: GraphNode) => {
    const deps = node.dependsOn || []
    return deps.every((d) => completed.has(d))
  }

  const ordered = [...graph.nodes]
  const pending = new Set(ordered.map((n) => n.id))
  let safetyCounter = 0

  while (pending.size > 0 && safetyCounter < 100) {
    safetyCounter += 1
    const ready = ordered.filter((node) => pending.has(node.id) && canRun(node))

    if (!ready.length) {
      throw new Error('Graph deadlock: unresolved dependencies')
    }

    for (const node of ready) {
      pending.delete(node.id)

      const maxRetries = typeof node.retries === 'number' ? node.retries : 1
      let attempt = 0
      let lastError = ''

      send(win, 'autonomy:update', {
        stage: 'node-start',
        node,
        progress: `${completed.size + 1}/${graph.nodes.length}`
      })

      while (attempt <= maxRetries) {
        attempt += 1
        const startedAt = Date.now()

        try {
          const output = await executeNode(node, runtime, getMainWindowFn)
          const finishedAt = Date.now()

          const result: NodeResult = {
            nodeId: node.id,
            tool: node.tool,
            success: true,
            output,
            attempt,
            startedAt,
            finishedAt
          }

          runtime.results.push(result)
          completed.add(node.id)
          saveState(runtime)

          await appendMemory(
            'autonomy',
            `${graph.goal} :: ${node.title} => ${output.slice(0, 500)}`,
            ['autonomy', graph.protocol, node.tool]
          )

          send(win, 'autonomy:update', {
            stage: 'node-success',
            node,
            result
          })

          break
        } catch (err: any) {
          lastError = err?.message || String(err)
          const finishedAt = Date.now()

          runtime.results.push({
            nodeId: node.id,
            tool: node.tool,
            success: false,
            output: '',
            error: lastError,
            attempt,
            startedAt,
            finishedAt
          })

          saveState(runtime)

          send(win, 'autonomy:update', {
            stage: 'node-failed',
            node,
            error: lastError,
            attempt,
            maxRetries
          })

          if (attempt > maxRetries) {
            await appendMemory(
              'autonomy',
              `${graph.goal} :: ${node.title} failed with ${lastError}`,
              ['autonomy', 'failure', node.tool]
            )
            break
          }

          // retry engine: ask AI to repair args before next attempt
          try {
            const vault = loadSecureVault()
            const repairPrompt = `
Repair this failed autonomy node. Return ONLY JSON:
{
  "args": {},
  "note": "string"
}

Node:
${JSON.stringify(node, null, 2)}

Error:
${lastError}

Goal:
${graph.goal}

Make the smallest possible change. Do not change the tool unless absolutely necessary.
`.trim()

            const repair = await chatWithAI(repairPrompt, [{ role: 'user', content: repairPrompt }], vault)
            if (repair.success && repair.text) {
              const repaired = extractJson(repair.text)
              if (repaired?.args && typeof repaired.args === 'object') {
                const original = nodeMap.get(node.id)
                if (original) original.args = { ...original.args, ...repaired.args }
                graph.nodes = graph.nodes.map((n) =>
                  n.id === node.id ? { ...n, args: { ...n.args, ...repaired.args } } : n
                )
                runtime.activeGraph = graph
                saveState(runtime)
              }
            }
          } catch {
            // ignore repair failure and continue retry
          }
        }
      }

      if (!completed.has(node.id)) {
        throw new Error(`Node failed permanently: ${node.id} (${lastError})`)
      }
    }
  }

  const reflection = await reflectAfterRun(input, graph, runtime.results)
  if (reflection?.memoryEntry) {
    await appendMemory(
      'autonomy',
      String(reflection.memoryEntry),
      ['autonomy', 'reflection', graph.protocol]
    )
  }

  runtime.activeGraph = null
  saveState(runtime)

  return {
    success: true,
    plan: graph,
    results: runtime.results,
    reflection
  }
}

export default function registerAutonomyEngine({
  ipcMain,
  getMainWindow
}: {
  ipcMain: IpcMain
  getMainWindow: () => BrowserWindow | null
}) {
  ipcMain.removeHandler('autonomy:plan')
  ipcMain.handle('autonomy:plan', async (_event, input: string) => {
    try {
      const graph = await planGraph(input)
      return { success: true, graph }
    } catch (err: any) {
      return { success: false, error: err?.message || String(err) }
    }
  })

  ipcMain.removeHandler('autonomy:run')
  ipcMain.handle('autonomy:run', async (_event, input: string) => {
    try {
      const graph = await planGraph(input)
      return await executeGraph(graph, input, getMainWindow)
    } catch (err: any) {
      return { success: false, error: err?.message || String(err) }
    }
  })

  ipcMain.removeHandler('autonomy:get-state')
  ipcMain.handle('autonomy:get-state', async () => {
    return loadState()
  })

  ipcMain.removeHandler('autonomy:get-memory')
  ipcMain.handle('autonomy:get-memory', async (_event, query?: string) => {
    if (query && query.trim()) {
      return searchMemory(query, 12)
    }
    return loadMemory()
  })

  ipcMain.removeHandler('autonomy:add-memory')
  ipcMain.handle('autonomy:add-memory', async (_event, text: string, tags: string[] = []) => {
    await appendMemory('episodic', String(text || ''), tags)
    return { success: true }
  })

  ipcMain.removeHandler('autonomy:rank-tools')
  ipcMain.handle('autonomy:rank-tools', async (_event, query: string) => {
    return rankTools(query)
  })

  ipcMain.removeHandler('autonomy:reset')
  ipcMain.handle('autonomy:reset', async () => {
    writeJson(STATE_FILE, {
      activeGraph: null,
      results: [],
      lastPlan: null,
      activeProtocol: 'default'
    })
    return { success: true }
  })
}
