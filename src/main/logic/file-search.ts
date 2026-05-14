import { IpcMain, app } from 'electron'
import fs from 'fs'
import path from 'path'
import os from 'os'

let pipeline: any = null
let lancedb: any = null

const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2'
const DB_FOLDER = 'SADIYA_semantic_db'

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

const IGNORE_FOLDERS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  'windows',
  'system volume information',
  '$recycle.bin',
  'appdata',
  'program files'
])

async function loadDeps() {
  if (!pipeline) {
    const mod = await import('@xenova/transformers')
    pipeline = mod.pipeline
  }

  if (!lancedb) {
    lancedb = await import('vectordb')
  }
}

async function embedText(text: string): Promise<number[]> {
  await loadDeps()
  const extractor = await pipeline('feature-extraction', MODEL_NAME)
  const output = await extractor(text.slice(0, 2000), {
    pooling: 'mean',
    normalize: true
  })
  return Array.from(output.data)
}

function isHiddenOrIgnored(name: string) {
  const lower = name.toLowerCase()
  return lower.startsWith('.') || lower.startsWith('$') || IGNORE_FOLDERS.has(lower)
}

async function scanFolderForFiles(root: string): Promise<string[]> {
  const files: string[] = []
  const queue = [path.resolve(root)]
  const visited = new Set<string>()

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current || visited.has(current)) continue
    visited.add(current)

    let entries: fs.Dirent[]
    try {
      entries = await fs.promises.readdir(current, { withFileTypes: true })
    } catch {
      continue
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name)

      if (entry.isDirectory()) {
        if (isHiddenOrIgnored(entry.name)) continue
        queue.push(fullPath)
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase()
        if (VALID_EXTENSIONS.has(ext)) files.push(fullPath)
      }
    }
  }

  return files
}

export default function registerFileSearch(ipcMain: IpcMain) {
  ipcMain.removeHandler('index-folder')
  ipcMain.handle('index-folder', async (event, folderPath: string) => {
    try {
      if (!folderPath) return '❌ Folder path missing.'

      event.sender.send('semantic-progress', {
        status: 'booting',
        text: 'Initializing vector engine...',
        progress: 10
      })

      await loadDeps()

      const dbPath = path.join(app.getPath('userData'), DB_FOLDER)
      const db = await lancedb.connect(dbPath)

      event.sender.send('semantic-progress', {
        status: 'scanning',
        text: 'Scanning folder...',
        progress: 30
      })

      const files = await scanFolderForFiles(folderPath)
      const records: any[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        try {
          const content = await fs.promises.readFile(file, 'utf-8')
          if (!content.trim()) continue

          const vector = await embedText(content)

          records.push({
            vector,
            file_path: file,
            file_name: path.basename(file),
            content_snippet: content.slice(0, 250)
          })

          if (i % 5 === 0) {
            event.sender.send('semantic-progress', {
              status: 'indexing',
              text: `Indexed: ${path.basename(file)}`,
              progress: 30 + Math.min(60, Math.floor((i / Math.max(files.length, 1)) * 60))
            })
          }
        } catch {
          continue
        }
      }

      event.sender.send('semantic-progress', {
        status: 'saving',
        text: 'Writing vector database...',
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

      return `✅ Indexed ${records.length} text files from ${files.length} candidates.`
    } catch (err) {
      return `❌ Indexing Error: ${String(err)}`
    }
  })

  ipcMain.removeHandler('search-files')
  ipcMain.handle('search-files', async (_event, { query, limit = 8 } : { query: string; limit?: number }) => {
    try {
      if (!query || !query.trim()) return '❌ Empty search query.'

      await loadDeps()

      const dbPath = path.join(app.getPath('userData'), DB_FOLDER)
      if (!fs.existsSync(dbPath)) {
        return '❌ No semantic index found. First index a folder.'
      }

      const db = await lancedb.connect(dbPath)
      const table = await db.openTable('files')
      const queryVector = await embedText(query)

      const results = await table.search(queryVector).limit(limit).execute()

      if (!results || results.length === 0) {
        return `No semantic matches found for: ${query}`
      }

      return (
        `🧠 SEMANTIC MATCHES FOR: "${query}"\n\n` +
        results
          .map((r: any, idx: number) => {
            const score = typeof r.score === 'number' ? ` | score: ${r.score.toFixed(4)}` : ''
            return `${idx + 1}. ${r.file_path}${score}\n   ${r.content_snippet || ''}`
          })
          .join('\n\n')
      )
    } catch (err) {
      return `❌ Search Error: ${String(err)}`
    }
  })
}
