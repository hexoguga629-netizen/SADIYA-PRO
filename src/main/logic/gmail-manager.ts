import { IpcMain } from 'electron'

export default function registerGmailHandlers(ipcMain: IpcMain) {
  ipcMain.handle('gmail-send', async () => {
    return { success: false, error: 'Gmail not configured' }
  })
  ipcMain.handle('gmail-list', async () => {
    return []
  })
}
