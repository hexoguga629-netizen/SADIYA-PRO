import { IpcMain } from 'electron'

export default function registerDeepResearch({ ipcMain }: { ipcMain: IpcMain }) {
  ipcMain.handle('deep-research', async (_e, { query }) => {
    return { result: 'Deep research not configured', query }
  })
}
