import { IpcMain } from 'electron'

export default function registerGhostControl(ipcMain: IpcMain) {
  ipcMain.handle('ghost-click', async () => {
    return { success: false, error: 'Ghost control not available' }
  })
  ipcMain.handle('ghost-type', async () => {
    return { success: false, error: 'Ghost control not available' }
  })
}
