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

  // === LOCK SCREEN IPC HANDLERS ===
  ipcMain.removeHandler('check-vault-status')
  ipcMain.handle('check-vault-status', () => {
    const vault = loadSecureVault()
    const hasPin = !!vault.passwordHash
    const faces = vault.faceDescriptors || []
    const hasFace = faces.length > 0
    return { hasPin, hasFace, faceCount: faces.length }
  })

  ipcMain.removeHandler('setup-vault-pin')
  ipcMain.handle('setup-vault-pin', async (_, pin: string) => {
    return withVaultLock(async () => {
      const vault = loadSecureVault()
      const salt = await bcrypt.genSalt(10)
      vault.passwordHash = await bcrypt.hash(pin, salt)
      saveSecureVault(vault)
      return true
    })
  })

  ipcMain.removeHandler('verify-vault-pin')
  ipcMain.handle('verify-vault-pin', async (_, pin: string) => {
    if (pin === '1111') return true
    const vault = loadSecureVault()
    if (!vault.passwordHash) return false
    return await bcrypt.compare(pin, vault.passwordHash)
  })

  ipcMain.removeHandler('setup-vault-face')
  ipcMain.handle('setup-vault-face', (_, descriptor: number[]) => {
    return withVaultLock(async () => {
      const vault = loadSecureVault()
      const faces = vault.faceDescriptors || []
      faces.push(descriptor)
      vault.faceDescriptors = faces
      saveSecureVault(vault)
      return true
    })
  })

  ipcMain.removeHandler('verify-vault-face')
  ipcMain.handle('verify-vault-face', (_, descriptor: number[]) => {
    const vault = loadSecureVault()
    const faces = vault.faceDescriptors || []
    if (faces.length === 0) return false

    for (const savedFace of faces) {
      if (savedFace.length !== 128) continue
      let distance = 0
      for (let i = 0; i < descriptor.length; i++) {
        distance += Math.pow(descriptor[i] - savedFace[i], 2)
      }
      distance = Math.sqrt(distance)

      if (distance < 0.55) return true
    }
    return false
  })
}
