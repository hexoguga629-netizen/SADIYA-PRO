import { IpcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import os from 'os'

export default function registerFileSearch(ipcMain: IpcMain) {
  ipcMain.removeHandler('search-files')
  ipcMain.handle('search-files', async (_e, { query, directory, extensions }) => {
    try {
      const searchDir = directory || os.homedir()
      const results: { name: string; path: string; size: number; modified: Date; type: string }[] = []
      const maxResults = 100
      const exts = extensions ? extensions.split(',').map((e: string) => e.trim().toLowerCase()) : null

      const search = (dir: string, depth: number) => {
        if (depth > 5 || results.length >= maxResults) return
        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true })
          for (const entry of entries) {
            if (results.length >= maxResults) return
            if (entry.name.startsWith('.') || entry.name === 'node_modules') continue

            const fullPath = path.join(dir, entry.name)
            if (entry.isDirectory()) {
              search(fullPath, depth + 1)
            } else if (entry.isFile()) {
              const ext = path.extname(entry.name).toLowerCase()
              if (exts && !exts.includes(ext)) continue
              if (entry.name.toLowerCase().includes(query.toLowerCase())) {
                try {
                  const stat = fs.statSync(fullPath)
                  results.push({
                    name: entry.name,
                    path: fullPath,
                    size: stat.size,
                    modified: stat.mtime,
                    type: ext || 'file'
                  })
                } catch {}
              }
            }
          }
        } catch {}
      }

      search(searchDir, 0)
      return { success: true, results, total: results.length }
    } catch (e) {
      return { success: false, error: String(e), results: [] }
    }
  })

  try { ipcMain.removeHandler('read-file') } catch {}
  ipcMain.handle('read-file', async (_e, { filePath }) => {
    try {
      if (!fs.existsSync(filePath)) return { success: false, error: 'File not found' }
      const stat = fs.statSync(filePath)
      if (stat.size > 5 * 1024 * 1024) return { success: false, error: 'File too large (max 5MB)' }

      const ext = path.extname(filePath).toLowerCase()
      if (['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'].includes(ext)) {
        const base64 = fs.readFileSync(filePath).toString('base64')
        return { success: true, type: 'image', content: `data:image/${ext.slice(1)};base64,${base64}` }
      }

      const content = fs.readFileSync(filePath, 'utf-8')
      return { success: true, type: 'text', content }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })

  ipcMain.removeHandler('write-file')
  ipcMain.handle('write-file', async (_e, { filePath, content }) => {
    try {
      const dir = path.dirname(filePath)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(filePath, content, 'utf-8')
      return { success: true }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })

  ipcMain.removeHandler('list-directory')
  ipcMain.handle('list-directory', async (_e, { directory }) => {
    try {
      const dir = directory || os.homedir()
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      const items = entries
        .filter((e: fs.Dirent) => !e.name.startsWith('.'))
        .map((e: fs.Dirent) => {
          const fullPath = path.join(dir, e.name)
          try {
            const stat = fs.statSync(fullPath)
            return {
              name: e.name,
              path: fullPath,
              isDirectory: e.isDirectory(),
              size: stat.size,
              modified: stat.mtime
            }
          } catch {
            return {
              name: e.name,
              path: fullPath,
              isDirectory: e.isDirectory(),
              size: 0,
              modified: new Date()
            }
          }
        })
      return { success: true, items, currentDir: dir }
    } catch (e) {
      return { success: false, error: String(e), items: [] }
    }
  })
}
