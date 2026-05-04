import fs from 'fs'
import path from 'path'

const CHAT_HISTORY_LIMIT = 30

let chatLock: Promise<unknown> = Promise.resolve()

export function withChatLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = chatLock.then(fn, fn)
  chatLock = next.catch(() => {})
  return next
}

export function readChatHistory(chatDir: string, chatFile: string): { role: string; content: string; timestamp: string }[] {
  if (!fs.existsSync(chatDir)) fs.mkdirSync(chatDir, { recursive: true })
  if (!fs.existsSync(chatFile)) return []
  try { return JSON.parse(fs.readFileSync(chatFile, 'utf-8')) || [] } catch { return [] }
}

export function writeChatHistory(chatDir: string, chatFile: string, history: { role: string; content: string; timestamp: string }[]) {
  if (!fs.existsSync(chatDir)) fs.mkdirSync(chatDir, { recursive: true })
  const trimmed = history.length > CHAT_HISTORY_LIMIT ? history.slice(-CHAT_HISTORY_LIMIT) : history
  fs.writeFileSync(chatFile, JSON.stringify(trimmed, null, 2))
}
