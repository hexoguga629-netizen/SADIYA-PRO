import { ipcMain } from 'electron'

export default function registerPhantomKeyboard() {
  ipcMain.handle('phantom-type', async () => {
    return { success: false, error: 'Not yet implemented' }
  })
  ipcMain.handle('phantom-click', async () => {
    return { success: false, error: 'Not yet implemented' }
  })
}
