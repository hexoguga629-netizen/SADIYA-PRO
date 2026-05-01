import { IpcMain, app } from 'electron'
import bcrypt from 'bcryptjs'
import fs from 'fs'
import path from 'path'

const vaultPath = () => path.join(app.getPath('userData'), 'sadiya_secure_vault.json')

interface SecureVault {
  apiKeys: Record<string, string>
  settings: Record<string, string>
  passwordHash?: string
}

function loadVault(): SecureVault {
  try {
    if (fs.existsSync(vaultPath())) {
      return JSON.parse(fs.readFileSync(vaultPath(), 'utf-8'))
    }
  } catch {}
  return { apiKeys: {}, settings: {} }
}

function saveVault(vault: SecureVault): void {
  fs.writeFileSync(vaultPath(), JSON.stringify(vault, null, 2))
}

export default function registerSecurity(ipcMain: IpcMain) {
  ipcMain.removeHandler('security-set-password')
  ipcMain.handle('security-set-password', async (_e, { password }) => {
    try {
      const vault = loadVault()
      vault.passwordHash = await bcrypt.hash(password, 10)
      saveVault(vault)
      return { success: true }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })

  ipcMain.removeHandler('security-verify-password')
  ipcMain.handle('security-verify-password', async (_e, { password }) => {
    try {
      const vault = loadVault()
      if (!vault.passwordHash) return { success: true, verified: true }
      const match = await bcrypt.compare(password, vault.passwordHash)
      return { success: true, verified: match }
    } catch (e) {
      return { success: false, verified: false, error: String(e) }
    }
  })

  ipcMain.removeHandler('security-save-api-key')
  ipcMain.handle('security-save-api-key', async (_e, { provider, apiKey }) => {
    try {
      const vault = loadVault()
      vault.apiKeys[provider] = apiKey
      saveVault(vault)
      return { success: true }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })

  ipcMain.removeHandler('security-get-api-key')
  ipcMain.handle('security-get-api-key', async (_e, { provider }) => {
    try {
      const vault = loadVault()
      return { success: true, apiKey: vault.apiKeys[provider] || '' }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })

  ipcMain.removeHandler('security-get-all-keys')
  ipcMain.handle('security-get-all-keys', async () => {
    try {
      const vault = loadVault()
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
    try {
      const vault = loadVault()
      delete vault.apiKeys[provider]
      saveVault(vault)
      return { success: true }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })

  ipcMain.removeHandler('security-save-setting')
  ipcMain.handle('security-save-setting', async (_e, { key, value }) => {
    try {
      const vault = loadVault()
      vault.settings[key] = value
      saveVault(vault)
      return { success: true }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })

  ipcMain.removeHandler('security-get-setting')
  ipcMain.handle('security-get-setting', async (_e, { key }) => {
    try {
      const vault = loadVault()
      return { success: true, value: vault.settings[key] || '' }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })
}
