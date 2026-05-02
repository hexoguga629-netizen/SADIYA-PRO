import { IpcMain } from 'electron'
import bcrypt from 'bcryptjs'
import { loadSecureVault, saveSecureVault, withVaultLock } from './vault'

export default function registerSecurity(ipcMain: IpcMain) {
  ipcMain.removeHandler('security-set-password')
  ipcMain.handle('security-set-password', async (_e, { password }) => {
    return withVaultLock(async () => {
      try {
        const vault = loadSecureVault()
        vault.passwordHash = await bcrypt.hash(password, 10)
        saveSecureVault(vault)
        return { success: true }
      } catch (e) {
        return { success: false, error: String(e) }
      }
    })
  })

  ipcMain.removeHandler('security-verify-password')
  ipcMain.handle('security-verify-password', async (_e, { password }) => {
    try {
      const vault = loadSecureVault()
      if (!vault.passwordHash) return { success: true, verified: true }
      const match = await bcrypt.compare(password, vault.passwordHash)
      return { success: true, verified: match }
    } catch (e) {
      return { success: false, verified: false, error: String(e) }
    }
  })

  ipcMain.removeHandler('security-save-api-key')
  ipcMain.handle('security-save-api-key', async (_e, { provider, apiKey }) => {
    return withVaultLock(async () => {
      try {
        const vault = loadSecureVault()
        vault.apiKeys[provider] = apiKey
        saveSecureVault(vault)
        return { success: true }
      } catch (e) {
        return { success: false, error: String(e) }
      }
    })
  })

  ipcMain.removeHandler('security-get-api-key')
  ipcMain.handle('security-get-api-key', async (_e, { provider }) => {
    try {
      const vault = loadSecureVault()
      return { success: true, apiKey: vault.apiKeys[provider] || '' }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })

  ipcMain.removeHandler('security-get-all-keys')
  ipcMain.handle('security-get-all-keys', async () => {
    try {
      const vault = loadSecureVault()
      const masked: Record<string, string> = {}
      for (const [k, v] of Object.entries(vault.apiKeys)) {
        masked[k] = v ? `${v.slice(0, 6)}${'•'.repeat(Math.max(0, v.length - 10))}${v.slice(-4)}` : ''
      }
      return { success: true, keys: masked }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })

  ipcMain.removeHandler('security-delete-api-key')
  ipcMain.handle('security-delete-api-key', async (_e, { provider }) => {
    return withVaultLock(async () => {
      try {
        const vault = loadSecureVault()
        delete vault.apiKeys[provider]
        saveSecureVault(vault)
        return { success: true }
      } catch (e) {
        return { success: false, error: String(e) }
      }
    })
  })

  ipcMain.removeHandler('security-save-setting')
  ipcMain.handle('security-save-setting', async (_e, { key, value }) => {
    return withVaultLock(async () => {
      try {
        const vault = loadSecureVault()
        vault.settings[key] = value
        saveSecureVault(vault)
        return { success: true }
      } catch (e) {
        return { success: false, error: String(e) }
      }
    })
  })

  ipcMain.removeHandler('security-get-setting')
  ipcMain.handle('security-get-setting', async (_e, { key }) => {
    try {
      const vault = loadSecureVault()
      return { success: true, value: vault.settings[key] || '' }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })
}
