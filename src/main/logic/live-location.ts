import { IpcMain } from 'electron'

export default function registerLocationHandlers(ipcMain: IpcMain) {
  ipcMain.removeHandler('get-live-location')
  ipcMain.handle('get-live-location', async () => {
    return { latitude: 0, longitude: 0, error: 'Location not available' }
  })
}
