import { IpcMain, BrowserWindow } from 'electron'

let hackerWindow: BrowserWindow | null = null

export default function registerRealityHacker(ipcMain: IpcMain) {
  ipcMain.removeHandler('hack-website')
  ipcMain.handle('hack-website', async (_, { url }) => {
    try {
      if (hackerWindow) hackerWindow.close()
      hackerWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        show: true,
        autoHideMenuBar: true,
        webPreferences: { nodeIntegration: false, contextIsolation: true }
      })
      await hackerWindow.loadURL(url)
      return { success: true }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })

  ipcMain.removeHandler('close-hacker-window')
  ipcMain.handle('close-hacker-window', () => {
    if (hackerWindow) { hackerWindow.close(); hackerWindow = null }
    return { success: true }
  })
}
