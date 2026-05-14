import { IpcMain, app, shell } from 'electron'
import fs from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'

export default function registerGalleryHandlers(ipcMain: IpcMain) {
  const GALLERY_DIR = path.resolve(app.getPath('userData'), 'Gallery')

  if (!fs.existsSync(GALLERY_DIR)) {
    fs.mkdirSync(GALLERY_DIR, { recursive: true })
  }

  ipcMain.removeHandler('get-gallery')
  ipcMain.handle('get-gallery', async () => {
    try {
      const files = fs
        .readdirSync(GALLERY_DIR)
        .filter((file) => /\.(png|jpg|jpeg|webp|gif)$/i.test(file))

      return files
        .map((file) => {
          const filePath = path.join(GALLERY_DIR, file)
          const stats = fs.statSync(filePath)

          return {
            filename: file,
            displayName: file
              .replace(/_\d+_Generated_by_SADIYA\.png$/, '')
              .replace(/_/g, ' '),
            path: filePath,
            url: pathToFileURL(filePath).href,
            createdAt: stats.birthtime
          }
        })
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    } catch {
      return []
    }
  })

  ipcMain.removeHandler('save-image-to-gallery')
  ipcMain.handle('save-image-to-gallery', async (_event, { title, base64Data }) => {
    try {
      const safeTitle = (title || 'visual')
        .replace(/[^a-z0-9]/gi, '_')
        .toLowerCase()
        .slice(0, 50)

      const fileName = `${safeTitle}_${Date.now()}_Generated_by_SADIYA.png`
      const filePath = path.join(GALLERY_DIR, fileName)

      const data = String(base64Data).replace(/^data:image\/\w+;base64,/, '')
      const buffer = Buffer.from(data, 'base64')

      fs.writeFileSync(filePath, buffer)

      return { success: true, path: filePath }
    } catch (error: any) {
      return { success: false, error: error?.message || String(error) }
    }
  })

  ipcMain.removeHandler('delete-image')
  ipcMain.handle('delete-image', async (_event, filename) => {
    try {
      const filePath = path.join(GALLERY_DIR, filename)
      if (!fs.existsSync(filePath)) return false
      fs.unlinkSync(filePath)
      return true
    } catch {
      return false
    }
  })

  ipcMain.removeHandler('open-image-location')
  ipcMain.handle('open-image-location', async (_event, filePath) => {
    shell.showItemInFolder(filePath)
  })

  ipcMain.removeHandler('save-image-external')
  ipcMain.handle('save-image-external', async (_event, sourcePath) => {
    try {
      const { dialog } = require('electron')
      const { filePath } = await dialog.showSaveDialog({
        title: 'Save Image Copy',
        defaultPath: path.basename(sourcePath),
        filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }]
      })

      if (filePath) {
        fs.copyFileSync(sourcePath, filePath)
        return { success: true }
      }
      return { canceled: true }
    } catch (error: any) {
      return { success: false, error: error?.message || String(error) }
    }
  })
}
