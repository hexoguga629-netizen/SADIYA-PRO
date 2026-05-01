import { ipcMain, desktopCapturer, BrowserWindow, app } from 'electron'
import path from 'path'
import fs from 'fs'

export default function registerScreenPeeler() {
  const screenshotDir = path.join(app.getPath('userData'), 'Screenshots')
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true })

  ipcMain.removeHandler('take-screen-shot')
  ipcMain.handle('take-screen-shot', async () => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1920, height: 1080 }
      })
      if (sources.length === 0) return { success: false, error: 'No screen source found' }

      const source = sources[0]
      const image = source.thumbnail
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filePath = path.join(screenshotDir, `screenshot-${timestamp}.png`)

      fs.writeFileSync(filePath, image.toPNG())

      return { success: true, filePath, base64: image.toDataURL() }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })

  ipcMain.removeHandler('ocr-screenshot')
  ipcMain.handle('ocr-screenshot', async (_e, { imagePath }) => {
    try {
      const Tesseract = await import('tesseract.js')
      const result = await Tesseract.recognize(imagePath, 'eng')
      return { success: true, text: result.data.text }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })

  ipcMain.removeHandler('get-screenshots')
  ipcMain.handle('get-screenshots', async () => {
    try {
      const files = fs.readdirSync(screenshotDir)
        .filter((f: string) => f.endsWith('.png'))
        .map((f: string) => ({
          name: f,
          path: path.join(screenshotDir, f),
          created: fs.statSync(path.join(screenshotDir, f)).birthtime
        }))
        .sort((a: { created: Date }, b: { created: Date }) => b.created.getTime() - a.created.getTime())
      return files.slice(0, 20)
    } catch {
      return []
    }
  })

  ipcMain.removeHandler('start-screen-record')
  ipcMain.handle('start-screen-record', async () => {
    return { success: false, error: 'Screen recording requires additional setup' }
  })

  ipcMain.removeHandler('stop-screen-record')
  ipcMain.handle('stop-screen-record', async () => {
    return { success: false, error: 'No recording in progress' }
  })
}
