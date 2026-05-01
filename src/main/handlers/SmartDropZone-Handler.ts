import { IpcMain } from 'electron'

export default function registerDropZoneControl(ipcMain: IpcMain) {
  ipcMain.handle('dropzone-process', async () => {
    return { success: false, error: 'DropZone not configured' }
  })
}
