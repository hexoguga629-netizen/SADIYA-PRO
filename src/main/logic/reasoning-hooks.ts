import { BrowserWindow } from 'electron'
import { emitReasoning, selectBestCapability } from './reasoning-core'

export function emitRouterStart(win: BrowserWindow | null, input: string, protocol?: string) {
  const ranked = selectBestCapability(input, protocol)
  const ranking = ranked
    ? [
        {
          name: ranked.name,
          score: ranked.score || 0
        }
      ]
    : []

  emitReasoning(win, {
    agent: 'Router',
    type: 'tool-ranking',
    message: ranked
      ? `Selected ${ranked.name} for current request`
      : 'No capability match found, fallback to AI chat',
    confidence: ranked ? Math.min(0.99, (ranked.score || 0) / 120) : 0.5,
    currentTool: ranked?.name,
    toolRanking: ranking,
    metadata: { input, protocol }
  })

  return ranked
}

export function emitNodeEvent(
  win: BrowserWindow | null,
  payload: {
    agent: string
    type: 'node-start' | 'node-success' | 'node-failed' | 'analysis' | 'reflection' | 'consensus' | 'status'
    message: string
    confidence?: number
    retries?: number
    activeNode?: string
    currentTool?: string
    metadata?: Record<string, any>
  }
) {
  emitReasoning(win, payload)
}
