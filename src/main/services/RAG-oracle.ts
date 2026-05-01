import { IpcMain } from 'electron'

export default function registerOracle({ ipcMain }: { ipcMain: IpcMain }) {
  ipcMain.handle('rag-query', async (_e, { query }) => {
    return { answer: 'RAG Oracle not configured', query }
  })
  ipcMain.handle('rag-index', async () => {
    return { success: false, error: 'RAG Oracle not configured' }
  })
}
