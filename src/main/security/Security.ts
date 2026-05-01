import { ipcMain } from 'electron'

export default function registerSecurityVault() {
  ipcMain.handle('vault-store', async () => {
    return { success: false, error: 'Security vault not configured' }
  })
  ipcMain.handle('vault-retrieve', async () => {
    return null
  })
}
