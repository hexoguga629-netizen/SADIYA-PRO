import { IpcMain } from 'electron'
import { GoogleGenAI } from '@google/genai'
import fs from 'fs'
import path from 'path'
import mammoth from 'mammoth'

export default function registerOracle({ ipcMain }: { ipcMain: IpcMain }) {
  ipcMain.removeHandler('rag-query')
  ipcMain.handle('rag-query', async (_e, { query, filePath, geminiKey }) => {
    try {
      if (!geminiKey) return { answer: 'Gemini API key not configured. Add it in Settings.', sources: [] }

      let context = ''
      if (filePath && fs.existsSync(filePath)) {
        const ext = path.extname(filePath).toLowerCase()
        if (ext === '.txt' || ext === '.md' || ext === '.csv' || ext === '.json') {
          context = fs.readFileSync(filePath, 'utf-8').slice(0, 15000)
        } else if (ext === '.docx') {
          const result = await mammoth.extractRawText({ path: filePath })
          context = result.value.slice(0, 15000)
        } else if (ext === '.pdf') {
          const pdfParse = (await import('pdf-parse')).default
          const buffer = fs.readFileSync(filePath)
          const data = await pdfParse(buffer)
          context = data.text.slice(0, 15000)
        }
      }

      const ai = new GoogleGenAI({ apiKey: geminiKey })
      const prompt = context
        ? `Context from document:\n${context}\n\nQuestion: ${query}\n\nAnswer based on the context above.`
        : query

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt
      })

      return { answer: response.text || 'No response', sources: filePath ? [filePath] : [] }
    } catch (e) {
      return { answer: 'Error: ' + String(e), sources: [] }
    }
  })

  ipcMain.removeHandler('rag-index')
  ipcMain.handle('rag-index', async (_e, { directory }) => {
    try {
      if (!directory || !fs.existsSync(directory)) {
        return { success: false, error: 'Directory not found' }
      }
      const files: string[] = []
      const scan = (dir: string) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true })
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name)
          if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
            scan(fullPath)
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase()
            if (['.txt', '.md', '.pdf', '.docx', '.csv', '.json', '.ts', '.tsx', '.js', '.py'].includes(ext)) {
              files.push(fullPath)
            }
          }
        }
      }
      scan(directory)
      return { success: true, indexedFiles: files.length, files: files.slice(0, 50) }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })
}
