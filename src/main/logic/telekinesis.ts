import { IpcMain } from 'electron'

export default function registerTelekinesis({ ipcMain }: { ipcMain: IpcMain }) {
  ipcMain.handle('telekinesis-move', async () => {
    return { success: false, error: 'Telekinesis not available' }
  })
}
