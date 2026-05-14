import { BrowserWindow, IpcMain, shell } from 'electron'

export function registerVoiceBridgeIpc(
  ipcMain: IpcMain,
  getMainWindow: () => BrowserWindow | null
) {
  ipcMain.removeHandler('open-browser-url')
  ipcMain.handle('open-browser-url', async (_event, url: string) => {
    const cleanUrl = String(url || '').trim()
    if (!cleanUrl) return { success: false, error: 'Empty URL' }

    const win = getMainWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send('browser:navigate', cleanUrl)
      win.webContents.send('browser:focus')
      return { success: true, mode: 'in-app', url: cleanUrl }
    }

    await shell.openExternal(cleanUrl)
    return { success: true, mode: 'external', url: cleanUrl }
  })

  ipcMain.removeHandler('run-terminal-command')
  ipcMain.handle('run-terminal-command', async (_event, command: string) => {
    const win = getMainWindow()
    if (!win || win.isDestroyed()) {
      return { success: false, error: 'Main window unavailable' }
    }

    win.webContents.send('terminal:run', String(command || ''))
    return { success: true, command }
  })

  ipcMain.removeHandler('open-app')
  ipcMain.handle('open-app', async (_event, appName: string) => {
    const win = getMainWindow()
    if (!win || win.isDestroyed()) {
      return { success: false, error: 'Main window unavailable' }
    }

    win.webContents.send('app:open', String(appName || ''))
    return { success: true, appName }
  })
}
