import { IpcMain, App, BrowserWindow, shell, desktopCapturer } from 'electron'
import { loadSecureVault } from '../security/vault'
import { chatWithAI, getActiveProvider } from '../services/ai-providers'
import fs from 'fs'
import path from 'path'
import os from 'os'

interface Task {
  id: string
  text: string
  status: 'running' | 'completed' | 'failed'
  agent: string
  timestamp: string
  result?: string
}

interface AgentStatus {
  name: string
  status: 'ACTIVE' | 'IDLE'
  desc: string
}

let tasks: Task[] = []
let agentStatuses: AgentStatus[] = [
  { name: 'Planner Agent', status: 'IDLE', desc: 'Waiting for instructions...' },
  { name: 'Research Agent', status: 'IDLE', desc: 'Standing by...' },
  { name: 'Browser Agent', status: 'IDLE', desc: 'Ready to browse...' },
  { name: 'Memory Agent', status: 'IDLE', desc: 'Monitoring context...' },
  { name: 'System Agent', status: 'ACTIVE', desc: 'Monitoring system health...' }
]

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

function notifyRenderer(win: BrowserWindow | null, channel: string, data: unknown) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, data)
}

function setAgent(name: string, status: 'ACTIVE' | 'IDLE', desc: string) {
  const agent = agentStatuses.find((a) => a.name === name)
  if (agent) {
    agent.status = status
    agent.desc = desc
  }
}

function addTask(text: string, agent: string): Task {
  const task: Task = { id: genId(), text, status: 'running', agent, timestamp: new Date().toISOString() }
  tasks.unshift(task)
  if (tasks.length > 50) tasks = tasks.slice(0, 50)
  return task
}

function completeTask(id: string, status: 'completed' | 'failed', result?: string) {
  const task = tasks.find((t) => t.id === id)
  if (task) {
    task.status = status
    task.result = result
  }
}

type CommandIntent =
  | { type: 'open_app'; app: string }
  | { type: 'search_web'; query: string }
  | { type: 'search_files'; query: string; ext?: string }
  | { type: 'system_info' }
  | { type: 'screenshot' }
  | { type: 'open_url'; url: string }
  | { type: 'research'; query: string }
  | { type: 'remember'; fact: string }
  | { type: 'recall_memory' }
  | { type: 'list_files'; dir?: string }
  | { type: 'ai_chat'; prompt: string }

function parseCommand(input: string): CommandIntent {
  const lower = input.toLowerCase().trim()

  // Open app commands
  const openMatch = lower.match(/^(?:open|launch|start|run)\s+(.+)$/i)
  if (openMatch) {
    const target = openMatch[1].trim()
    // Check if it's a URL
    if (target.match(/^https?:\/\//) || target.match(/\.(com|org|net|io|dev|ai)\b/)) {
      const url = target.startsWith('http') ? target : `https://${target}`
      return { type: 'open_url', url }
    }
    return { type: 'open_app', app: target }
  }

  // Web search
  const searchWebMatch = lower.match(/^(?:search|google|look up|find online|web search)\s+(.+)$/i)
  if (searchWebMatch) return { type: 'search_web', query: searchWebMatch[1] }

  // File search
  const searchFileMatch = lower.match(/^(?:find files?|search files?|locate)\s+(.+)$/i)
  if (searchFileMatch) return { type: 'search_files', query: searchFileMatch[1] }

  // System info
  if (lower.match(/^(?:system (?:info|status|stats|health)|show system|cpu|ram|memory usage|check system)$/))
    return { type: 'system_info' }

  // Screenshot
  if (lower.match(/^(?:take (?:a )?screenshot|screenshot|capture screen|screen capture|snap screen)$/))
    return { type: 'screenshot' }

  // Research
  const researchMatch = lower.match(/^(?:research|deep research|analyze|investigate)\s+(.+)$/i)
  if (researchMatch) return { type: 'research', query: researchMatch[1] }

  // Memory save
  const rememberMatch = lower.match(/^(?:remember|save to memory|memorize|note)\s+(.+)$/i)
  if (rememberMatch) return { type: 'remember', fact: rememberMatch[1] }

  // Memory recall
  if (lower.match(/^(?:recall memory|show memory|what do you remember|memory bank|memories)$/))
    return { type: 'recall_memory' }

  // List directory
  const listMatch = lower.match(/^(?:list files|ls|dir|show files|show directory)(?:\s+(.+))?$/i)
  if (listMatch) return { type: 'list_files', dir: listMatch[1] }

  // Default: send to AI
  return { type: 'ai_chat', prompt: input }
}

export default function registerCommandRouter({
  ipcMain,
  app,
  getMainWindow
}: {
  ipcMain: IpcMain
  app: App
  getMainWindow: () => BrowserWindow | null
}) {
  // Task tracking handlers
  ipcMain.removeHandler('get-tasks')
  ipcMain.handle('get-tasks', () => tasks)

  ipcMain.removeHandler('get-agent-statuses')
  ipcMain.handle('get-agent-statuses', () => agentStatuses)

  ipcMain.removeHandler('add-task')
  ipcMain.handle('add-task', (_e, { text, agent }: { text: string; agent: string }) => {
    return addTask(text, agent)
  })

  // Smart command execution
  ipcMain.removeHandler('execute-command')
  ipcMain.handle('execute-command', async (_e, input: string) => {
    const win = getMainWindow()
    const intent = parseCommand(input)

    switch (intent.type) {
      case 'open_app': {
        const task = addTask(`Open ${intent.app}`, 'Browser Agent')
        setAgent('Browser Agent', 'ACTIVE', `Opening ${intent.app}...`)
        notifyRenderer(win, 'task-update', tasks)
        notifyRenderer(win, 'agent-update', agentStatuses)

        try {
          const appMap: Record<string, string> = {
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
          const appId = appMap[intent.app.toLowerCase()] || intent.app
          const { execFile } = await import('child_process')
          await new Promise<void>((resolve, reject) => {
            if (process.platform === 'win32') {
              execFile('cmd', ['/c', 'start', '', appId], (err) => (err ? reject(err) : resolve()))
            } else {
              execFile('xdg-open', [appId], (err) => {
                if (err) {
                  execFile(appId, [], (err2) => (err2 ? reject(err2) : resolve()))
                } else {
                  resolve()
                }
              })
            }
          })
          completeTask(task.id, 'completed', `Opened ${intent.app}`)
          setAgent('Browser Agent', 'IDLE', 'Ready to browse...')
          notifyRenderer(win, 'task-update', tasks)
          notifyRenderer(win, 'agent-update', agentStatuses)
          return { success: true, text: `✓ Opened ${intent.app}` }
        } catch (err) {
          completeTask(task.id, 'failed', String(err))
          setAgent('Browser Agent', 'IDLE', 'Ready to browse...')
          notifyRenderer(win, 'task-update', tasks)
          notifyRenderer(win, 'agent-update', agentStatuses)
          return { success: false, error: `Failed to open ${intent.app}: ${String(err)}` }
        }
      }

      case 'open_url': {
        const task = addTask(`Open ${intent.url}`, 'Browser Agent')
        setAgent('Browser Agent', 'ACTIVE', `Navigating to ${intent.url}...`)
        notifyRenderer(win, 'task-update', tasks)
        notifyRenderer(win, 'agent-update', agentStatuses)

        try {
          await shell.openExternal(intent.url)
          completeTask(task.id, 'completed', `Opened ${intent.url}`)
          setAgent('Browser Agent', 'IDLE', 'Ready to browse...')
          notifyRenderer(win, 'task-update', tasks)
          notifyRenderer(win, 'agent-update', agentStatuses)
          return { success: true, text: `✓ Opened ${intent.url} in your browser` }
        } catch (err) {
          completeTask(task.id, 'failed', String(err))
          setAgent('Browser Agent', 'IDLE', 'Ready to browse...')
          notifyRenderer(win, 'task-update', tasks)
          notifyRenderer(win, 'agent-update', agentStatuses)
          return { success: false, error: `Failed to open URL: ${String(err)}` }
        }
      }

      case 'search_web': {
        const task = addTask(`Web search: ${intent.query}`, 'Research Agent')
        setAgent('Research Agent', 'ACTIVE', `Searching: ${intent.query}...`)
        notifyRenderer(win, 'task-update', tasks)
        notifyRenderer(win, 'agent-update', agentStatuses)

        try {
          // Use existing web-search IPC handler via puppeteer
          const puppeteer = await import('puppeteer-extra')
          const StealthPlugin = await import('puppeteer-extra-plugin-stealth')
          const cheerio = await import('cheerio')
          puppeteer.default.use(StealthPlugin.default())

          const browser = await puppeteer.default.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
          })
          const page = await browser.newPage()
          await page.goto(`https://www.google.com/search?q=${encodeURIComponent(intent.query)}`, {
            waitUntil: 'domcontentloaded',
            timeout: 15000
          })
          const html = await page.content()
          await browser.close()

          const $ = cheerio.load(html)
          const results: { title: string; link: string; snippet: string }[] = []
          $('div.g').each((_, el) => {
            const title = $(el).find('h3').text()
            const link = $(el).find('a').attr('href') || ''
            const snippet = $(el).find('.VwiC3b').text()
            if (title && link) results.push({ title, link, snippet })
          })
          const top = results.slice(0, 5)

          const resultText = top.length > 0
            ? `Found ${top.length} results:\n` + top.map((r, i) => `${i + 1}. ${r.title}\n   ${r.snippet}`).join('\n')
            : 'No results found.'

          completeTask(task.id, 'completed', resultText)
          setAgent('Research Agent', 'IDLE', 'Standing by...')
          notifyRenderer(win, 'task-update', tasks)
          notifyRenderer(win, 'agent-update', agentStatuses)
          return { success: true, text: resultText }
        } catch (err) {
          completeTask(task.id, 'failed', String(err))
          setAgent('Research Agent', 'IDLE', 'Standing by...')
          notifyRenderer(win, 'task-update', tasks)
          notifyRenderer(win, 'agent-update', agentStatuses)
          return { success: false, error: `Search failed: ${String(err)}` }
        }
      }

      case 'search_files': {
        const task = addTask(`Search files: ${intent.query}`, 'System Agent')
        setAgent('System Agent', 'ACTIVE', `Searching files: ${intent.query}...`)
        notifyRenderer(win, 'task-update', tasks)
        notifyRenderer(win, 'agent-update', agentStatuses)

        try {
          const searchDir = os.homedir()
          const results: { name: string; path: string; size: number }[] = []
          const maxResults = 20

          const search = (dir: string, depth: number) => {
            if (depth > 4 || results.length >= maxResults) return
            try {
              const entries = fs.readdirSync(dir, { withFileTypes: true })
              for (const entry of entries) {
                if (results.length >= maxResults) return
                if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
                const fullPath = path.join(dir, entry.name)
                if (entry.isDirectory()) {
                  search(fullPath, depth + 1)
                } else if (entry.isFile() && entry.name.toLowerCase().includes(intent.query.toLowerCase())) {
                  try {
                    const stat = fs.statSync(fullPath)
                    results.push({ name: entry.name, path: fullPath, size: stat.size })
                  } catch { /* skip */ }
                }
              }
            } catch { /* skip */ }
          }
          search(searchDir, 0)

          const resultText = results.length > 0
            ? `Found ${results.length} file(s):\n` + results.map((r) => `• ${r.name} (${(r.size / 1024).toFixed(1)} KB)\n  ${r.path}`).join('\n')
            : `No files matching "${intent.query}" found.`

          completeTask(task.id, 'completed', resultText)
          setAgent('System Agent', 'ACTIVE', 'Monitoring system health...')
          notifyRenderer(win, 'task-update', tasks)
          notifyRenderer(win, 'agent-update', agentStatuses)
          return { success: true, text: resultText }
        } catch (err) {
          completeTask(task.id, 'failed', String(err))
          setAgent('System Agent', 'ACTIVE', 'Monitoring system health...')
          notifyRenderer(win, 'task-update', tasks)
          notifyRenderer(win, 'agent-update', agentStatuses)
          return { success: false, error: `File search failed: ${String(err)}` }
        }
      }

      case 'system_info': {
        const task = addTask('Get system information', 'System Agent')
        setAgent('System Agent', 'ACTIVE', 'Collecting system data...')
        notifyRenderer(win, 'task-update', tasks)
        notifyRenderer(win, 'agent-update', agentStatuses)

        const totalMem = os.totalmem()
        const freeMem = os.freemem()
        const cpus = os.cpus()
        const uptimeH = (os.uptime() / 3600).toFixed(1)

        const info = [
          `OS: ${os.type()} ${os.release()} (${os.arch()})`,
          `CPU: ${cpus[0]?.model || 'Unknown'} (${cpus.length} cores)`,
          `RAM: ${((totalMem - freeMem) / 1024 ** 3).toFixed(1)} / ${(totalMem / 1024 ** 3).toFixed(1)} GB used`,
          `Uptime: ${uptimeH}h`,
          `Hostname: ${os.hostname()}`,
          `Home: ${os.homedir()}`
        ].join('\n')

        completeTask(task.id, 'completed', info)
        setAgent('System Agent', 'ACTIVE', 'Monitoring system health...')
        notifyRenderer(win, 'task-update', tasks)
        notifyRenderer(win, 'agent-update', agentStatuses)
        return { success: true, text: info }
      }

      case 'screenshot': {
        const task = addTask('Capture screenshot', 'System Agent')
        setAgent('System Agent', 'ACTIVE', 'Capturing screen...')
        notifyRenderer(win, 'task-update', tasks)
        notifyRenderer(win, 'agent-update', agentStatuses)

        try {
          const sources = await desktopCapturer.getSources({
            types: ['screen'],
            thumbnailSize: { width: 1920, height: 1080 }
          })
          if (sources.length === 0) throw new Error('No screen source found')

          const screenshotDir = path.join(app.getPath('userData'), 'Screenshots')
          if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true })
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
          const filePath = path.join(screenshotDir, `screenshot-${timestamp}.png`)
          fs.writeFileSync(filePath, sources[0].thumbnail.toPNG())

          completeTask(task.id, 'completed', `Saved: ${filePath}`)
          setAgent('System Agent', 'ACTIVE', 'Monitoring system health...')
          notifyRenderer(win, 'task-update', tasks)
          notifyRenderer(win, 'agent-update', agentStatuses)
          return { success: true, text: `✓ Screenshot saved to ${filePath}` }
        } catch (err) {
          completeTask(task.id, 'failed', String(err))
          setAgent('System Agent', 'ACTIVE', 'Monitoring system health...')
          notifyRenderer(win, 'task-update', tasks)
          notifyRenderer(win, 'agent-update', agentStatuses)
          return { success: false, error: `Screenshot failed: ${String(err)}` }
        }
      }

      case 'research': {
        const task = addTask(`Research: ${intent.query}`, 'Research Agent')
        setAgent('Planner Agent', 'ACTIVE', `Planning research on: ${intent.query}...`)
        setAgent('Research Agent', 'ACTIVE', `Researching: ${intent.query}...`)
        notifyRenderer(win, 'task-update', tasks)
        notifyRenderer(win, 'agent-update', agentStatuses)

        try {
          const vault = loadSecureVault()
          const tavilyKey = vault.apiKeys['tavily'] || ''
          const hasAI = !!getActiveProvider(vault)

          if (!hasAI && !tavilyKey) {
            completeTask(task.id, 'failed', 'No API keys configured')
            setAgent('Planner Agent', 'IDLE', 'Waiting for instructions...')
            setAgent('Research Agent', 'IDLE', 'Standing by...')
            notifyRenderer(win, 'task-update', tasks)
            notifyRenderer(win, 'agent-update', agentStatuses)
            return { success: false, error: 'No AI API key configured. Go to Settings and add at least one (Gemini, Groq, HuggingFace, or NVIDIA).' }
          }

          let searchResults = ''
          if (tavilyKey) {
            try {
              const { tavily } = await import('@tavily/core')
              const tvly = tavily({ apiKey: tavilyKey })
              const response = await tvly.search(intent.query, { maxResults: 5 })
              searchResults = response.results
                .map((r: { title: string; content: string; url: string }) => `[${r.title}](${r.url})\n${r.content}`)
                .join('\n\n')
            } catch { /* continue without tavily */ }
          }

          if (hasAI) {
            const prompt = searchResults
              ? `Based on these search results, provide a comprehensive analysis:\n\nQuery: ${intent.query}\n\nSearch Results:\n${searchResults}\n\nProvide a detailed, well-structured response.`
              : `Research and provide a comprehensive analysis on: ${intent.query}`

            const result = await chatWithAI(prompt, [{ role: 'user', content: prompt }], vault)

            if (result.success && result.text) {
              completeTask(task.id, 'completed', result.text.slice(0, 200) + '...')
              setAgent('Planner Agent', 'IDLE', 'Waiting for instructions...')
              setAgent('Research Agent', 'IDLE', 'Standing by...')
              notifyRenderer(win, 'task-update', tasks)
              notifyRenderer(win, 'agent-update', agentStatuses)
              return { success: true, text: result.text }
            }
          }

          completeTask(task.id, 'completed', searchResults.slice(0, 200))
          setAgent('Planner Agent', 'IDLE', 'Waiting for instructions...')
          setAgent('Research Agent', 'IDLE', 'Standing by...')
          notifyRenderer(win, 'task-update', tasks)
          notifyRenderer(win, 'agent-update', agentStatuses)
          return { success: true, text: searchResults || 'No results found.' }
        } catch (err) {
          completeTask(task.id, 'failed', String(err))
          setAgent('Planner Agent', 'IDLE', 'Waiting for instructions...')
          setAgent('Research Agent', 'IDLE', 'Standing by...')
          notifyRenderer(win, 'task-update', tasks)
          notifyRenderer(win, 'agent-update', agentStatuses)
          return { success: false, error: `Research failed: ${String(err)}` }
        }
      }

      case 'remember': {
        const task = addTask(`Save memory: ${intent.fact}`, 'Memory Agent')
        setAgent('Memory Agent', 'ACTIVE', 'Storing to memory bank...')
        notifyRenderer(win, 'task-update', tasks)
        notifyRenderer(win, 'agent-update', agentStatuses)

        try {
          const memDir = path.resolve(app.getPath('userData'), 'Memory')
          const memFile = path.join(memDir, 'saved-user-memory.json')
          if (!fs.existsSync(memDir)) fs.mkdirSync(memDir, { recursive: true })

          let bank: { fact: string; timestamp: string }[] = []
          if (fs.existsSync(memFile)) {
            try { bank = JSON.parse(fs.readFileSync(memFile, 'utf-8')) || [] } catch { bank = [] }
          }
          bank.push({ fact: intent.fact, timestamp: new Date().toISOString() })
          fs.writeFileSync(memFile, JSON.stringify(bank, null, 2))

          completeTask(task.id, 'completed', `Saved: "${intent.fact}"`)
          setAgent('Memory Agent', 'IDLE', 'Monitoring context...')
          notifyRenderer(win, 'task-update', tasks)
          notifyRenderer(win, 'agent-update', agentStatuses)
          return { success: true, text: `✓ Saved to memory: "${intent.fact}"` }
        } catch (err) {
          completeTask(task.id, 'failed', String(err))
          setAgent('Memory Agent', 'IDLE', 'Monitoring context...')
          notifyRenderer(win, 'task-update', tasks)
          notifyRenderer(win, 'agent-update', agentStatuses)
          return { success: false, error: `Memory save failed: ${String(err)}` }
        }
      }

      case 'recall_memory': {
        const task = addTask('Recall memory bank', 'Memory Agent')
        setAgent('Memory Agent', 'ACTIVE', 'Reading memory bank...')
        notifyRenderer(win, 'task-update', tasks)
        notifyRenderer(win, 'agent-update', agentStatuses)

        try {
          const memFile = path.join(app.getPath('userData'), 'Memory', 'saved-user-memory.json')
          let bank: { fact: string; timestamp: string }[] = []
          if (fs.existsSync(memFile)) {
            try { bank = JSON.parse(fs.readFileSync(memFile, 'utf-8')) || [] } catch { bank = [] }
          }

          const text = bank.length > 0
            ? `Memory bank (${bank.length} entries):\n` + bank.map((m) => `• ${m.fact} (${new Date(m.timestamp).toLocaleDateString()})`).join('\n')
            : 'Memory bank is empty. Use "remember [fact]" to save something.'

          completeTask(task.id, 'completed', text.slice(0, 200))
          setAgent('Memory Agent', 'IDLE', 'Monitoring context...')
          notifyRenderer(win, 'task-update', tasks)
          notifyRenderer(win, 'agent-update', agentStatuses)
          return { success: true, text }
        } catch (err) {
          completeTask(task.id, 'failed', String(err))
          setAgent('Memory Agent', 'IDLE', 'Monitoring context...')
          notifyRenderer(win, 'task-update', tasks)
          notifyRenderer(win, 'agent-update', agentStatuses)
          return { success: false, error: `Memory recall failed: ${String(err)}` }
        }
      }

      case 'list_files': {
        const task = addTask(`List files${intent.dir ? ': ' + intent.dir : ''}`, 'System Agent')
        setAgent('System Agent', 'ACTIVE', 'Reading directory...')
        notifyRenderer(win, 'task-update', tasks)
        notifyRenderer(win, 'agent-update', agentStatuses)

        try {
          const dir = intent.dir ? path.resolve(intent.dir) : os.homedir()
          const entries = fs.readdirSync(dir, { withFileTypes: true })
          const items = entries
            .filter((e) => !e.name.startsWith('.'))
            .slice(0, 30)
            .map((e) => {
              const icon = e.isDirectory() ? '📁' : '📄'
              return `${icon} ${e.name}`
            })
          const text = `${dir}:\n${items.join('\n')}`

          completeTask(task.id, 'completed', `Listed ${items.length} items`)
          setAgent('System Agent', 'ACTIVE', 'Monitoring system health...')
          notifyRenderer(win, 'task-update', tasks)
          notifyRenderer(win, 'agent-update', agentStatuses)
          return { success: true, text }
        } catch (err) {
          completeTask(task.id, 'failed', String(err))
          setAgent('System Agent', 'ACTIVE', 'Monitoring system health...')
          notifyRenderer(win, 'task-update', tasks)
          notifyRenderer(win, 'agent-update', agentStatuses)
          return { success: false, error: `List failed: ${String(err)}` }
        }
      }

      case 'ai_chat': {
        const task = addTask(`AI Chat: ${intent.prompt.slice(0, 50)}...`, 'Planner Agent')
        setAgent('Planner Agent', 'ACTIVE', 'Processing your request...')
        notifyRenderer(win, 'task-update', tasks)
        notifyRenderer(win, 'agent-update', agentStatuses)

        try {
          const vault = loadSecureVault()
          const active = getActiveProvider(vault)
          if (!active) {
            completeTask(task.id, 'failed', 'No AI API key')
            setAgent('Planner Agent', 'IDLE', 'Waiting for instructions...')
            notifyRenderer(win, 'task-update', tasks)
            notifyRenderer(win, 'agent-update', agentStatuses)
            return { success: false, error: 'No AI API key configured. Go to Settings and add at least one (Gemini, Groq, HuggingFace, or NVIDIA).' }
          }

          const chatDir = path.resolve(app.getPath('userData'), 'Chat')
          const chatFile = path.join(chatDir, 'iris_memory.json')
          if (!fs.existsSync(chatDir)) fs.mkdirSync(chatDir, { recursive: true })

          let history: { role: string; content: string; timestamp: string }[] = []
          if (fs.existsSync(chatFile)) {
            try { history = JSON.parse(fs.readFileSync(chatFile, 'utf-8')) || [] } catch { history = [] }
          }

          history.push({ role: 'user', content: intent.prompt, timestamp: new Date().toISOString() })
          const trimmed = history.length > 30 ? history.slice(-30) : history
          fs.writeFileSync(chatFile, JSON.stringify(trimmed, null, 2))

          const result = await chatWithAI(intent.prompt, trimmed, vault)

          if (!result.success) {
            // Rollback orphaned user message
            try {
              const current = JSON.parse(fs.readFileSync(chatFile, 'utf-8')) || []
              if (current.length > 0 && current[current.length - 1].role === 'user') {
                current.pop()
                fs.writeFileSync(chatFile, JSON.stringify(current, null, 2))
              }
            } catch { /* best-effort rollback */ }

            completeTask(task.id, 'failed', result.error || 'Unknown error')
            setAgent('Planner Agent', 'IDLE', 'Waiting for instructions...')
            notifyRenderer(win, 'task-update', tasks)
            notifyRenderer(win, 'agent-update', agentStatuses)
            return result
          }

          const text = result.text ?? ''

          // Re-read to avoid overwriting concurrent writes
          let current: { role: string; content: string; timestamp: string }[] = []
          if (fs.existsSync(chatFile)) {
            try { current = JSON.parse(fs.readFileSync(chatFile, 'utf-8')) || [] } catch { current = [] }
          }
          current.push({ role: 'model', content: text, timestamp: new Date().toISOString() })
          const finalTrimmed = current.length > 30 ? current.slice(-30) : current
          fs.writeFileSync(chatFile, JSON.stringify(finalTrimmed, null, 2))

          if (win && !win.isDestroyed()) win.webContents.send('gemini-response', text)

          completeTask(task.id, 'completed', `[${result.provider}] ${text.slice(0, 100)}`)
          setAgent('Planner Agent', 'IDLE', 'Waiting for instructions...')
          notifyRenderer(win, 'task-update', tasks)
          notifyRenderer(win, 'agent-update', agentStatuses)
          return { success: true, text, provider: result.provider }
        } catch (err) {
          // Rollback orphaned user message
          try {
            const chatFile = path.join(app.getPath('userData'), 'Chat', 'iris_memory.json')
            if (fs.existsSync(chatFile)) {
              const current = JSON.parse(fs.readFileSync(chatFile, 'utf-8')) || []
              if (current.length > 0 && current[current.length - 1].role === 'user') {
                current.pop()
                fs.writeFileSync(chatFile, JSON.stringify(current, null, 2))
              }
            }
          } catch { /* best-effort rollback */ }

          completeTask(task.id, 'failed', String(err))
          setAgent('Planner Agent', 'IDLE', 'Waiting for instructions...')
          notifyRenderer(win, 'task-update', tasks)
          notifyRenderer(win, 'agent-update', agentStatuses)
          return { success: false, error: String(err) }
        }
      }

      default:
        return { success: false, error: 'Unknown command type' }
    }
  })

  // Memory retrieval for UI
  ipcMain.removeHandler('get-memory-items')
  ipcMain.handle('get-memory-items', async () => {
    try {
      const memFile = path.join(app.getPath('userData'), 'Memory', 'saved-user-memory.json')
      if (!fs.existsSync(memFile)) return []
      const bank = JSON.parse(fs.readFileSync(memFile, 'utf-8')) || []
      return bank.slice(-10).reverse()
    } catch {
      return []
    }
  })
}
