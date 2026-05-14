import { IpcMain, BrowserWindow } from 'electron'
import WebSocket from 'ws'

export function registerAudioBridge(ipcMain: IpcMain, getMainWindow: () => BrowserWindow | null) {
  let ws: WebSocket | null = null

  ipcMain.handle('audio-start', async () => {
    return new Promise((resolve) => {
      if (ws) {
        ws.close()
      }

      ws = new WebSocket('ws://127.0.0.1:8000/voice')

      ws.on('open', () => {
        console.log('[AudioBridge] Connected to Voice Server')
        resolve({ success: true })
      })

      ws.on('message', (data) => {
        const win = getMainWindow()
        if (win && !win.isDestroyed()) {
          const message = JSON.parse(data.toString())
          if (message.type === 'transcript') {
            win.webContents.send('voice:transcript', message.text)
          }
        }
      })

      ws.on('error', (err) => {
        console.error('[AudioBridge] WS Error:', err)
        resolve({ success: false, error: err.message })
      })

      ws.on('close', () => {
        console.log('[AudioBridge] Disconnected from Voice Server')
      })
    })
  })

  ipcMain.handle('audio-chunk', (_event, chunk: Buffer) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(chunk)
      return { success: true }
    }
    return { success: false, error: 'WebSocket not connected' }
  })

  ipcMain.handle('audio-stop', async () => {
    if (ws) {
      ws.close()
      ws = null
    }
    return { success: true }
  })
}
