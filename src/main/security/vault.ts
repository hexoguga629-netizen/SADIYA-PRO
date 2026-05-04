import { app, safeStorage } from 'electron'
import fs from 'fs'
import path from 'path'

export interface SecureVault {
  apiKeys: Record<string, string>
  settings: Record<string, string>
  passwordHash?: string
}

const vaultPath = (): string => path.join(app.getPath('userData'), 'sadiya_secure_vault.json')

let vaultLock: Promise<void> = Promise.resolve()

function encryptValue(value: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.encryptString(value).toString('base64')
  }
  return Buffer.from(value).toString('base64')
}

const BASE64_RE = /^[A-Za-z0-9+/]*={0,2}$/

function isValidBase64(str: string): boolean {
  return str.length > 0 && str.length % 4 === 0 && BASE64_RE.test(str)
}

function decryptValue(encoded: string): string {
  if (!isValidBase64(encoded)) {
    return encoded
  }
  if (safeStorage.isEncryptionAvailable()) {
    try {
      return safeStorage.decryptString(Buffer.from(encoded, 'base64'))
    } catch {
      return Buffer.from(encoded, 'base64').toString('utf-8')
    }
  }
  return Buffer.from(encoded, 'base64').toString('utf-8')
}

export function loadSecureVault(): SecureVault {
  try {
    if (fs.existsSync(vaultPath())) {
      const raw = JSON.parse(fs.readFileSync(vaultPath(), 'utf-8'))
      const apiKeys: Record<string, string> = {}
      if (raw.apiKeys) {
        for (const [k, v] of Object.entries(raw.apiKeys)) {
          apiKeys[k] = typeof v === 'string' && v ? decryptValue(v) : ''
        }
      }
      return {
        apiKeys,
        settings: raw.settings || {},
        passwordHash: raw.passwordHash
      }
    }
  } catch {}
  return { apiKeys: {}, settings: {} }
}

export function saveSecureVault(vault: SecureVault): void {
  const encrypted: Record<string, string> = {}
  for (const [k, v] of Object.entries(vault.apiKeys)) {
    encrypted[k] = v ? encryptValue(v) : ''
  }
  const toWrite = {
    apiKeys: encrypted,
    settings: vault.settings,
    passwordHash: vault.passwordHash
  }
  fs.writeFileSync(vaultPath(), JSON.stringify(toWrite, null, 2))
}

export function withVaultLock<T>(fn: () => T | Promise<T>): Promise<T> {
  const next = vaultLock.then(() => fn())
  vaultLock = next.then(
    () => {},
    () => {}
  )
  return next
}

export function vaultFileExists(): boolean {
  return fs.existsSync(vaultPath())
}
