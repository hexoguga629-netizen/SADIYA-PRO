import { ipcMain, dialog, app } from 'electron'
import fs from 'fs'
import path from 'path'
import mammoth from 'mammoth'

export default function registerSmartDropZone() {
  const uploadsDir = path.join(app.getPath('userData'), 'Uploads')
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

  ipcMain.removeHandler('smart-drop-file')
  ipcMain.handle('smart-drop-file', async (_e, { filePath }) => {
    try {
      if (!fs.existsSync(filePath)) return { success: false, error: 'File not found' }

      const ext = path.extname(filePath).toLowerCase()
      const name = path.basename(filePath)
      const stat = fs.statSync(filePath)

      let content = ''
      let type = 'unknown'

      if (['.txt', '.md', '.csv', '.json', '.ts', '.tsx', '.js', '.py', '.html', '.css'].includes(ext)) {
        content = fs.readFileSync(filePath, 'utf-8').slice(0, 20000)
        type = 'text'
      } else if (ext === '.docx') {
        const result = await mammoth.extractRawText({ path: filePath })
        content = result.value.slice(0, 20000)
        type = 'document'
      } else if (ext === '.pdf') {
        const pdfParse = ((await import('pdf-parse')) as any).default || (await import('pdf-parse'))
        const buffer = fs.readFileSync(filePath)
        const data = await pdfParse(buffer)
        content = data.text.slice(0, 20000)
        type = 'document'
      } else if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'].includes(ext)) {
        const base64 = fs.readFileSync(filePath).toString('base64')
        content = `data:image/${ext.slice(1)};base64,${base64}`
        type = 'image'
      } else {
        type = 'binary'
      }

      const destPath = path.join(uploadsDir, `${Date.now()}-${name}`)
      fs.copyFileSync(filePath, destPath)

      return {
        success: true,
        file: { name, path: destPath, size: stat.size, type, ext, content: content.slice(0, 5000) }
      }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })

  ipcMain.removeHandler('smart-drop-open-dialog')
  ipcMain.handle('smart-drop-open-dialog', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
        filters: [
          { name: 'All Files', extensions: ['*'] },
          { name: 'Documents', extensions: ['pdf', 'docx', 'txt', 'md'] },
          { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] },
          { name: 'Code', extensions: ['ts', 'tsx', 'js', 'py', 'html', 'css'] }
        ]
      })
      return { success: true, filePaths: result.filePaths, cancelled: result.canceled }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })

  ipcMain.removeHandler('smart-drop-list')
  ipcMain.handle('smart-drop-list', async () => {
    try {
      const files = fs.readdirSync(uploadsDir)
        .map((name: string) => {
          const fp = path.join(uploadsDir, name)
          const stat = fs.statSync(fp)
          return { name, path: fp, size: stat.size, created: stat.birthtime }
        })
        .sort((a: { created: Date }, b: { created: Date }) => b.created.getTime() - a.created.getTime())
      return files.slice(0, 50)
    } catch {
      return []
    }
  })
}
