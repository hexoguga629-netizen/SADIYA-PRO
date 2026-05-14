import { IpcMain, app } from 'electron'
import fs from 'fs'
import path from 'path'

let pipeline: any = null
let lancedb: any = null

const IGNORE_FOLDERS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'out',
  'coverage',
  '$recycle.bin',
  'system volume information',
  'appdata',
  'program files'
])

const VALID_EXTENSIONS = new Set([
  '.txt',
  '.md',
  '.js',
  '.ts',
  '.tsx',
  '.jsx',
  '.json',
  '.py',
  '.html',
  '.css',
  '.log',
  '.csv'
])

async function ensureDeps() {
  if (!pipeline) {
    pipeline = (await import('@xenova/transformers')).pipeline
  }
  if (!lancedb) {
    lancedb = await import('vectordb')
  }
}

async function scanFolder(root: string): Promise<string[]> {
  const files: string[] = []
  const queue = [path.resolve(root)]

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current) continue

    let entries: fs.Dirent[] = []
    try {
      entries = await fs.promises.readdir(current, { withFileTypes: true })
    } catch {
      continue
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name)
      const lower = entry.name.toLowerCase()

      if (entry.isDirectory()) {
        if (lower.startsWith('.') || IGNORE_FOLDERS.has(lower)) continue
        queue.push(fullPath)
      } else if (entry.isFile()) {
        if (VALID_EXTENSIONS.has(path.extname(lower))) {
          files.push(fullPath)
        }
      }
    }
  }

  return files
}

export default function registerIndexFolder(ipcMain: IpcMain) {
  ipcMain.removeHandler('index-folder')

  ipcMain.handle('index-folder', async (event, folderPath: string) => {
    try {
      const cleanPath = path.resolve(String(folderPath || ''))
      if (!cleanPath || !fs.existsSync(cleanPath)) {
        return '❌ Folder not found.'
      }

      await ensureDeps()

      event.sender.send('semantic-progress', {
        status: 'booting',
        text: 'Initializing semantic engine...',
        progress: 10
      })

      const dbPath = path.join(app.getPath('userData'), 'sadiya_semantic_db')
      const db = await lancedb.connect(dbPath)
      const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')

      event.sender.send('semantic-progress', {
        status: 'scanning',
        text: 'Scanning folder...',
        progress: 35
      })

      const files = await scanFolder(cleanPath)
      const records: any[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        try {
          const content = await fs.promises.readFile(file, 'utf-8')
          const trimmed = content.trim()
          if (!trimmed) continue

          const textChunk = trimmed.slice(0, 1000)
          const output = await extractor(textChunk, {
            pooling: 'mean',
            normalize: true
          })

          records.push({
            vector: Array.from(output.data),
            file_path: file,
            file_name: path.basename(file),
            content_snippet: textChunk.slice(0, 200)
          })

          if (i % 5 === 0) {
            event.sender.send('semantic-progress', {
              status: 'indexing',
              text: `Indexed: ${path.basename(file)}`,
              progress: 35 + Math.min(55, Math.floor((i / Math.max(files.length, 1)) * 55))
            })
          }
        } catch {
          continue
        }
      }

      event.sender.send('semantic-progress', {
        status: 'saving',
        text: 'Writing vector store...',
        progress: 95
      })

      if (records.length > 0) {
        try {
          const table = await db.openTable('files')
          await table.add(records)
        } catch {
          await db.createTable('files', records)
        }
      }

      return `✅ Successfully indexed ${records.length} files from ${files.length} candidates.`
    } catch (err) {
      return `❌ Indexing Error: ${String(err)}`
    }
  })
}
