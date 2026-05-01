import { ipcMain, BrowserWindow } from 'electron'

export default function registerWidgetMaker() {
  ipcMain.handle('create-widget', async (_e, { html, title }) => {
    try {
      const win = new BrowserWindow({
        width: 400,
        height: 300,
        title: title || 'SADIYA Widget',
        autoHideMenuBar: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      })
      await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
      return { success: true }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })
}
