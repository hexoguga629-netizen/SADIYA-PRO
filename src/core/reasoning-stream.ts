import { BrowserWindow } from 'electron'

type ReasoningEvent = {
  agent: string
  type: string
  message: string
  confidence?: number
  metadata?: any
  timestamp: number
}

const reasoningHistory: ReasoningEvent[] = []

export function emitReasoning(
  win: BrowserWindow | null,
  event: Omit<ReasoningEvent, 'timestamp'>
) {
  const payload: ReasoningEvent = {
    ...event,
    timestamp: Date.now()
  }

  reasoningHistory.unshift(payload)

  if (reasoningHistory.length > 300) {
    reasoningHistory.pop()
  }

  win?.webContents.send(
    'reasoning-stream',
    payload
  )
}

export function getReasoningHistory() {
  return reasoningHistory
}
