import { IpcMain } from 'electron'
import { spawn } from 'child_process'
import os from 'os'

const activeProcesses = new Map()

function getShell() {
  if (os.platform() === 'win32') {
    return {
      shell: 'powershell.exe',
      args: ['-NoLogo', '-NoProfile', '-Command']
    }
  }

  return {
    shell: '/bin/bash',
    args: ['-c']
  }
}

function generateId() {
  return `proc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export default function registerTerminal(ipcMain: IpcMain) {
  ipcMain.removeHandler('run-terminal')

  ipcMain.handle('run-terminal', async (event, payload) => {
    try {
      const command = String(payload?.command || '')
      const cwd = payload?.cwd || process.cwd()

      if (!command.trim()) {
        return {
          success: false,
          error: 'Empty command'
        }
      }

      const shellInfo = getShell()

      const child = spawn(
        shellInfo.shell,
        [...shellInfo.args, command],
        {
          cwd,
          env: process.env,
          windowsHide: true
        }
      )

      const processId = generateId()

      activeProcesses.set(processId, child)

      child.stdout.on('data', (data) => {
        event.sender.send('terminal:data', {
          processId,
          type: 'stdout',
          chunk: data.toString()
        })
      })

      child.stderr.on('data', (data) => {
        event.sender.send('terminal:data', {
          processId,
          type: 'stderr',
          chunk: data.toString()
        })
      })

      child.on('close', (code) => {
        activeProcesses.delete(processId)

        event.sender.send('terminal:exit', {
          processId,
          exitCode: code
        })
      })

      child.on('error', (err) => {
        event.sender.send('terminal:error', {
          processId,
          error: err.message
        })
      })

      return {
        success: true,
        processId
      }
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || String(err)
      }
    }
  })

  ipcMain.removeHandler('kill-terminal')

  ipcMain.handle('kill-terminal', async (_event, processId) => {
    try {
      const proc = activeProcesses.get(processId)

      if (!proc) {
        return {
          success: false,
          error: 'Process not found'
        }
      }

      proc.kill()

      activeProcesses.delete(processId)

      return {
        success: true
      }
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || String(err)
      }
    }
  })
}
