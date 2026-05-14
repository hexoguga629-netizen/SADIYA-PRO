import { BrowserWindow, IpcMain, shell } from 'electron'
import { execFile } from 'child_process'

const WEB_SHORTCUTS: Record<string, string> = {
  youtube: 'https://youtube.com',
  google: 'https://google.com',
  gmail: 'https://mail.google.com',
  maps: 'https://maps.google.com',
  drive: 'https://drive.google.com'
}

const normalize = (value: any) => String(value ?? '').trim()

function runShellCommand(command: string, cwd?: string) {
  return new Promise<{ success: boolean; output?: string; error?: string }>((resolve) => {
    const isWin = process.platform === 'win32'
    const shellBin = isWin ? 'powershell.exe' : '/bin/bash'
    const args = isWin ? ['-NoLogo', '-NoProfile', '-Command', command] : ['-lc', command]

    execFile(
      shellBin,
      args,
      {
        cwd,
        windowsHide: true,
        maxBuffer: 10 * 1024 * 1024
      },
      (err, stdout, stderr) => {
        if (err) {
          resolve({
            success: false,
            error: stderr || err.message
          })
          return
        }

        resolve({
          success: true,
          output: String(stdout || stderr || '').trim()
        })
      }
    )
  })
}

export default function registerVoiceHandlerBridge(
  ipcMain: IpcMain,
  getMainWindow: () => BrowserWindow | null
) {
  ipcMain.removeHandler('google-search')
  ipcMain.handle('google-search', async (_e, query: string) => {
    const q = normalize(query)
    if (!q) return { success: false, error: 'Missing query' }
    await shell.openExternal(`https://www.google.com/search?q=${encodeURIComponent(q)}`)
    return { success: true, url: `https://www.google.com/search?q=${encodeURIComponent(q)}` }
  })

  ipcMain.removeHandler('open-website')
  ipcMain.handle('open-website', async (_e, url: string) => {
    const clean = normalize(url)
    if (!clean) return { success: false, error: 'Missing url' }
    await shell.openExternal(clean)
    return { success: true, url: clean }
  })

  ipcMain.removeHandler('open-youtube')
  ipcMain.handle('open-youtube', async () => {
    await shell.openExternal('https://youtube.com')
    return { success: true, url: 'https://youtube.com' }
  })

  ipcMain.removeHandler('run-terminal-command')
  ipcMain.handle('run-terminal-command', async (_e, command: string, cwd?: string) => {
    const clean = normalize(command)
    if (!clean) return { success: false, error: 'Missing command' }
    return runShellCommand(clean, cwd ? normalize(cwd) : undefined)
  })

  ipcMain.removeHandler('open-project')
  ipcMain.handle('open-project', async (_e, projectPath: string) => {
    const clean = normalize(projectPath)
    if (!clean) return { success: false, error: 'Missing project path' }

    try {
      if (process.platform === 'win32') {
        execFile('cmd', ['/c', 'start', '', clean], { windowsHide: true }, () => {})
      } else if (process.platform === 'darwin') {
        execFile('open', [clean], { windowsHide: true }, () => {})
      } else {
        execFile('xdg-open', [clean], { windowsHide: true }, () => {})
      }

      const win = getMainWindow()
      win?.webContents.send('project-opened', clean)
      return { success: true, projectPath: clean }
    } catch (error: any) {
      return { success: false, error: error?.message || String(error) }
    }
  })

  ipcMain.removeHandler('open-shortcut-url')
  ipcMain.handle('open-shortcut-url', async (_e, name: string) => {
    const key = normalize(name).toLowerCase()
    const url = WEB_SHORTCUTS[key]
    if (!url) return { success: false, error: `Unknown shortcut: ${name}` }
    await shell.openExternal(url)
    return { success: true, url }
  })
}
