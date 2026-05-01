import { IpcMain } from 'electron'

export default function registerWebAgent(ipcMain: IpcMain) {
  ipcMain.handle('web-browse', async (_e, { url }) => {
    return { success: false, error: 'Web agent not available', url }
  })
  ipcMain.handle('web-search', async (_e, { query }) => {
    return { success: false, error: 'Web search not available', query }
  })
}
