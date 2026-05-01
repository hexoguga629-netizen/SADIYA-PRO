import { IpcMain, BrowserWindow } from 'electron'
import { spawn } from 'child_process'
import path from 'path'

export default function registerSystemControl(ipcMain: IpcMain) {
  const sanitizePath = (inputPath: string) => {
    let clean = path.normalize(inputPath)
    if (clean.endsWith(path.sep)) clean = clean.slice(0, -1)
    return clean
  }

  ipcMain.handle('run-shell-command', async (_event, { command, cwd }) => {
    return new Promise((resolve) => {
      const safeCwd = cwd ? sanitizePath(cwd) : undefined
      const win = BrowserWindow.getAllWindows()[0]
      const child = spawn('powershell.exe', ['-Command', command], {
        cwd: safeCwd,
        shell: true
      })
      let output = ''
      child.stdout.on('data', (data: Buffer) => {
        const text = data.toString()
        output += text
        if (win) win.webContents.send('terminal-data', text)
      })
      child.stderr.on('data', (data: Buffer) => {
        const text = data.toString()
        output += text
        if (win) win.webContents.send('terminal-data', text)
      })
      child.on('close', (code: number) => {
        resolve({ output, exitCode: code })
      })
    })
  })
}
