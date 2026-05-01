import { IpcMain } from 'electron'
import { google } from 'googleapis'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'

export default function registerGmailHandlers(ipcMain: IpcMain) {
  const credentialsPath = path.join(app.getPath('userData'), 'gmail_credentials.json')
  const tokenPath = path.join(app.getPath('userData'), 'gmail_token.json')

  ipcMain.removeHandler('gmail-send')
  ipcMain.handle('gmail-send', async (_e, { to, subject, body }) => {
    try {
      if (!fs.existsSync(tokenPath)) {
        return { success: false, error: 'Gmail not authenticated. Please set up OAuth credentials.' }
      }
      const token = JSON.parse(fs.readFileSync(tokenPath, 'utf-8'))
      const auth = new google.auth.OAuth2()
      auth.setCredentials(token)
      const gmail = google.gmail({ version: 'v1', auth })

      const raw = Buffer.from(
        `To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${body}`
      ).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

      await gmail.users.messages.send({ userId: 'me', requestBody: { raw } })
      return { success: true }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })

  ipcMain.removeHandler('gmail-list')
  ipcMain.handle('gmail-list', async (_e, { maxResults = 10 }) => {
    try {
      if (!fs.existsSync(tokenPath)) return []
      const token = JSON.parse(fs.readFileSync(tokenPath, 'utf-8'))
      const auth = new google.auth.OAuth2()
      auth.setCredentials(token)
      const gmail = google.gmail({ version: 'v1', auth })

      const res = await gmail.users.messages.list({ userId: 'me', maxResults })
      const messages = res.data.messages || []

      const emails = await Promise.all(
        messages.slice(0, maxResults).map(async (msg: { id?: string | null }) => {
          if (!msg.id) return null
          const detail = await gmail.users.messages.get({ userId: 'me', id: msg.id })
          const headers = detail.data.payload?.headers || []
          return {
            id: msg.id,
            subject: headers.find((h: { name?: string }) => h.name === 'Subject')?.value || 'No Subject',
            from: headers.find((h: { name?: string }) => h.name === 'From')?.value || 'Unknown',
            date: headers.find((h: { name?: string }) => h.name === 'Date')?.value || '',
            snippet: detail.data.snippet || ''
          }
        })
      )

      return emails.filter(Boolean)
    } catch (e) {
      return []
    }
  })

  ipcMain.removeHandler('gmail-save-credentials')
  ipcMain.handle('gmail-save-credentials', async (_e, { credentials }) => {
    try {
      fs.writeFileSync(credentialsPath, JSON.stringify(credentials))
      return { success: true }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })
}
