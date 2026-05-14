import { BrowserWindow, ipcMain } from 'electron'

export function registerBrowserAutomationIPC(getMainWindow: () => BrowserWindow | null) {
  // Navigation
  ipcMain.handle('dashboard-browser-open', async (_e, url: string) => {
    const win = getMainWindow()
    if (win) {
      win.webContents.send('browser-navigate', url)
      return { success: true, url }
    }
    return { success: false, error: 'Main window not found' }
  })

  ipcMain.handle('dashboard-browser-search-youtube', async (_e, query: string) => {
    const win = getMainWindow()
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(String(query || ''))}`
    if (win) win.webContents.send('browser-navigate', url)
    return { success: true, url }
  })

  ipcMain.handle('dashboard-browser-search-google', async (_e, query: string) => {
    const win = getMainWindow()
    const url = `https://www.google.com/search?q=${encodeURIComponent(String(query || ''))}`
    if (win) win.webContents.send('browser-navigate', url)
    return { success: true, url }
  })

  // Automation (Click/Type)
  ipcMain.handle('dashboard-browser-click-text', async (_e, query: string) => {
    const win = getMainWindow()
    if (win) {
      win.webContents.send('browser-click-text', query)
      return { success: true }
    }
    return { success: false, error: 'Main window not found' }
  })

  ipcMain.handle('dashboard-browser-type-text', async (_e, payload: { query: string; text: string }) => {
    const win = getMainWindow()
    if (win) {
      win.webContents.send('browser-type-text', payload)
      return { success: true }
    }
    return { success: false, error: 'Main window not found' }
  })
}
