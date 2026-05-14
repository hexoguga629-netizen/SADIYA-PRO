import { BrowserWindow, IpcMain } from 'electron'
import { EventEmitter } from 'events'

export type ReasoningEvent = {
  agent: string
  type:
    | 'analysis'
    | 'tool-ranking'
    | 'node-start'
    | 'node-success'
    | 'node-failed'
    | 'protocol-switch'
    | 'memory-hit'
    | 'memory-miss'
    | 'reflection'
    | 'consensus'
    | 'status'
  message: string
  confidence?: number
  retries?: number
  activeNode?: string
  currentTool?: string
  toolRanking?: Array<{ name: string; score: number }>
  metadata?: Record<string, any>
  timestamp: number
}

export type Capability = {
  name: string
  agent: string
  description: string
  protocols: string[]
  keywords: string[]
  priority: number
  cost?: number
  score?: number
}

const emitter = new EventEmitter()
const reasoningHistory: ReasoningEvent[] = []

const capabilityRegistry: Capability[] = [
  {
    name: 'open_app',
    agent: 'Browser Agent',
    description: 'Launches desktop apps',
    protocols: ['default', 'coding', 'terminal'],
    keywords: ['open', 'launch', 'start', 'run app', 'app'],
    priority: 90,
    cost: 1
  },
  {
    name: 'search_web',
    agent: 'Research Agent',
    description: 'Searches the web',
    protocols: ['research', 'default'],
    keywords: ['search', 'web', 'online', 'google', 'research'],
    priority: 95,
    cost: 2
  },
  {
    name: 'search_files',
    agent: 'Memory Agent',
    description: 'Finds files locally',
    protocols: ['coding', 'default'],
    keywords: ['find file', 'search file', 'locate file', 'files'],
    priority: 88,
    cost: 1
  },
  {
    name: 'run_terminal',
    agent: 'System Agent',
    description: 'Runs shell commands',
    protocols: ['terminal', 'coding', 'debug'],
    keywords: ['terminal', 'cmd', 'shell', 'powershell', 'run command'],
    priority: 96,
    cost: 2
  },
  {
    name: 'open_project',
    agent: 'Coding Agent',
    description: 'Loads workspace context',
    protocols: ['coding', 'architect'],
    keywords: ['open project', 'workspace', 'load project', 'project'],
    priority: 94,
    cost: 1
  },
  {
    name: 'activate_protocol',
    agent: 'Planner Agent',
    description: 'Switches assistant mode',
    protocols: ['default', 'coding', 'debug', 'architect', 'research'],
    keywords: ['protocol', 'mode', 'switch mode', 'activate'],
    priority: 97,
    cost: 1
  },
  {
    name: 'remember',
    agent: 'Memory Agent',
    description: 'Stores long-term memory',
    protocols: ['default', 'research', 'coding'],
    keywords: ['remember', 'save', 'note', 'memorize'],
    priority: 85,
    cost: 1
  },
  {
    name: 'recall_memory',
    agent: 'Memory Agent',
    description: 'Retrieves memory',
    protocols: ['default', 'research', 'coding'],
    keywords: ['recall', 'memory', 'remember', 'what do you know'],
    priority: 84,
    cost: 1
  }
]

function pushHistory(event: ReasoningEvent) {
  reasoningHistory.unshift(event)
  if (reasoningHistory.length > 300) reasoningHistory.length = 300
}

export function emitReasoning(
  win: BrowserWindow | null,
  event: Omit<ReasoningEvent, 'timestamp'>
) {
  const payload: ReasoningEvent = {
    ...event,
    timestamp: Date.now()
  }

  pushHistory(payload)
  emitter.emit('reasoning', payload)

  if (win && !win.isDestroyed()) {
    win.webContents.send('reasoning-stream', payload)
  }
}

export function getReasoningHistory() {
  return reasoningHistory
}

export function registerCapability(capability: Capability) {
  const existing = capabilityRegistry.findIndex((c) => c.name === capability.name)
  if (existing >= 0) capabilityRegistry[existing] = capability
  else capabilityRegistry.push(capability)
}

export function listCapabilities(protocol?: string) {
  if (!protocol) return [...capabilityRegistry]

  return capabilityRegistry.filter((c) => c.protocols.includes(protocol))
}

function scoreCapability(query: string, capability: Capability, protocol?: string) {
  const text = query.toLowerCase()
  let score = capability.priority

  if (protocol && capability.protocols.includes(protocol)) score += 20
  if (protocol && !capability.protocols.includes(protocol)) score -= 15

  for (const kw of capability.keywords) {
    if (text.includes(kw)) score += 12
  }

  if (capability.name === 'run_terminal' && /fix|error|build|install|npm|pnpm|yarn/i.test(query)) {
    score += 25
  }

  if (capability.name === 'search_web' && /latest|news|find|research|compare/i.test(query)) {
    score += 25
  }

  if (capability.name === 'search_files' && /file|folder|project|workspace|source/i.test(query)) {
    score += 20
  }

  return score
}

export function rankCapabilities(query: string, protocol?: string) {
  return [...capabilityRegistry]
    .map((cap) => ({
      ...cap,
      score: scoreCapability(query, cap, protocol)
    }))
    .sort((a, b) => (b.score || 0) - (a.score || 0))
}

export function selectBestCapability(query: string, protocol?: string) {
  return rankCapabilities(query, protocol)[0] || null
}

export function registerReasoningCore(ipcMain: IpcMain) {
  ipcMain.removeHandler('reasoning:get-history')
  ipcMain.handle('reasoning:get-history', async () => getReasoningHistory())

  ipcMain.removeHandler('reasoning:list-capabilities')
  ipcMain.handle('reasoning:list-capabilities', async (_e, protocol?: string) => {
    return listCapabilities(protocol)
  })

  ipcMain.removeHandler('reasoning:rank-capabilities')
  ipcMain.handle('reasoning:rank-capabilities', async (_e, query: string, protocol?: string) => {
    return rankCapabilities(query, protocol)
  })

  ipcMain.removeHandler('reasoning:register-capability')
  ipcMain.handle('reasoning:register-capability', async (_e, capability: Capability) => {
    registerCapability(capability)
    return { success: true }
  })

  ipcMain.removeHandler('reasoning:clear-history')
  ipcMain.handle('reasoning:clear-history', async () => {
    reasoningHistory.length = 0
    return { success: true }
  })
}
