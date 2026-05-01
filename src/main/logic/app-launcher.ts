import { IpcMain } from 'electron'
import { exec } from 'child_process'

const PROTECTED_PROCESSES = [
  'explorer.exe', 'dwm.exe', 'svchost.exe', 'lsass.exe', 'csrss.exe',
  'wininit.exe', 'winlogon.exe', 'services.exe', 'taskmgr.exe', 'system', 'registry'
]

export default function registerAppLauncher(ipcMain: IpcMain) {
  ipcMain.handle('launch-app', async (_e, { appId }) => {
    return new Promise((resolve) => {
      exec(`start "" "${appId}"`, (error) => {
        resolve({ success: !error, error: error ? error.message : null })
      })
    })
  })

  ipcMain.handle('close-process', async (_e, { processName }) => {
    if (PROTECTED_PROCESSES.includes(processName.toLowerCase())) {
      return { success: false, error: 'Protected process' }
    }
    return new Promise((resolve) => {
      exec(`taskkill /IM "${processName}" /F`, (error) => {
        resolve({ success: !error, error: error ? error.message : null })
      })
    })
  })

  ipcMain.handle('get-running-processes', async () => {
    return new Promise((resolve) => {
      exec('tasklist /FO CSV /NH', (error, stdout) => {
        if (error) return resolve([])
        const processes = stdout.split('\n')
          .filter(Boolean)
          .map((line: string) => {
            const parts = line.split(',').map((p: string) => p.replace(/"/g, '').trim())
            return { name: parts[0], pid: parts[1], memory: parts[4] }
          })
        resolve(processes)
      })
    })
  })
}
