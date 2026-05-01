import { ipcMain } from 'electron'

export default function registerWebsiteBuilder() {
  ipcMain.handle('build-animated-website', async () => {
    return { success: false, error: 'Not yet implemented' }
  })
}
