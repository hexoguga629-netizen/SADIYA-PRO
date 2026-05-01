import { ipcMain } from 'electron'

export default function registerScreenPeeler() {
  ipcMain.handle('take-screen-shot', async () => {
    return { success: false, error: 'Not yet implemented' }
  })
  ipcMain.handle('start-screen-record', async () => {
    return { success: false, error: 'Not yet implemented' }
  })
  ipcMain.handle('stop-screen-record', async () => {
    return { success: false, error: 'Not yet implemented' }
  })
}
