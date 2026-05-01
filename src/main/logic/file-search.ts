import { IpcMain } from 'electron'
import path from 'path'
import fs from 'fs'

export default function registerFileSearch(ipcMain: IpcMain) {
  ipcMain.handle('search-files', async (_e, { directory, query }) => {
    try {
      const results: string[] = []
      const searchDir = (dir: string) => {
        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true })
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name)
            if (entry.name.toLowerCase().includes(query.toLowerCase())) {
              results.push(fullPath)
            }
            if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
              searchDir(fullPath)
            }
          }
        } catch {}
      }
      searchDir(directory)
      return results.slice(0, 100)
    } catch {
      return []
    }
  })
}
