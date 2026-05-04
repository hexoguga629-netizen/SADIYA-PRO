import path from 'path'
import { IpcMain, App } from 'electron'
import { withChatLock, readChatHistory, writeChatHistory } from './chat-lock'

export default function registerIpcHandlers({ ipcMain, app }: { ipcMain: IpcMain; app: App }) {
  const CHAT_DIR = path.resolve(app.getPath('userData'), 'Chat')
  const FILE_PATH = path.join(CHAT_DIR, 'iris_memory.json')

  ipcMain.removeHandler('add-message')
  ipcMain.removeHandler('get-history')

  ipcMain.handle('add-message', async (_event, msg) => {
    return withChatLock(async () => {
      try {
        const history = readChatHistory(CHAT_DIR, FILE_PATH)

        const newEntry: { role: string; content: string; timestamp: string } = {
          role: msg.role,
          content: msg.parts[0].text,
          timestamp: new Date().toISOString()
        }
        history.push(newEntry)

        writeChatHistory(CHAT_DIR, FILE_PATH, history)
        return true
      } catch {
        return false
      }
    })
  })

  ipcMain.handle('get-history', async () => {
    return withChatLock(async () => {
      try {
        const history = readChatHistory(CHAT_DIR, FILE_PATH)
        return history.map((m) => ({
          role: m.role === 'iris' ? 'model' : m.role,
          parts: [{ text: m.content }]
        }))
      } catch {
        return []
      }
    })
  })
}
