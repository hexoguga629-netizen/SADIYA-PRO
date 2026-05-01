import { IpcMain } from 'electron'

export default function registerWormhole({ ipcMain }: { ipcMain: IpcMain }) {
  ipcMain.handle('wormhole-transfer', async () => {
    return { success: false, error: 'Wormhole not configured' }
  })
}
