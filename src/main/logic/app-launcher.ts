import { IpcMain } from 'electron'
import { execFile, exec } from 'child_process'

const PROTECTED_PROCESSES = [
  'explorer.exe', 'dwm.exe', 'svchost.exe', 'lsass.exe', 'csrss.exe',
  'wininit.exe', 'winlogon.exe', 'services.exe', 'taskmgr.exe', 'system', 'registry'
]

const SHELL_META = /[;&|`$(){}[\]!#~<>"'\\\n\r]/

export default function registerAppLauncher(ipcMain: IpcMain) {
  ipcMain.removeHandler('open-app')
  ipcMain.handle('open-app', async (_e, appId) => {
    const id = typeof appId === 'object' ? appId.appId : appId
    if (typeof id !== 'string' || SHELL_META.test(id)) {
      return { success: false, error: 'Invalid app identifier' }
    }
    return new Promise((resolve) => {
      if (process.platform === 'win32') {
        execFile('cmd', ['/c', 'start', '', id], (error) => {
          resolve({ success: !error, error: error ? error.message : null })
        })
      } else {
        execFile('xdg-open', [id], (error) => {
          resolve({ success: !error, error: error ? error.message : null })
        })
      }
    })
  })

  ipcMain.removeHandler('close-app')
  ipcMain.handle('close-app', async (_e, processName) => {
    const name = typeof processName === 'object' ? processName.processName : processName
    if (typeof name !== 'string' || SHELL_META.test(name)) {
      return { success: false, error: 'Invalid process name' }
    }
    if (PROTECTED_PROCESSES.includes(name.toLowerCase())) {
      return { success: false, error: 'Protected process' }
    }
    return new Promise((resolve) => {
      if (process.platform === 'win32') {
        execFile('taskkill', ['/IM', name, '/F'], (error) => {
          resolve({ success: !error, error: error ? error.message : null })
        })
      } else {
        execFile('pkill', ['-f', name], (error) => {
          resolve({ success: !error, error: error ? error.message : null })
        })
      }
    })
  })

  ipcMain.removeHandler('get-running-processes')
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
