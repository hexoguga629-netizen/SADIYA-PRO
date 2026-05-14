// src/main/logic/systemCommands.ts
import { exec } from 'child_process';
import { ipcMain, shell, app } from 'electron';
import os from 'os';
import path from 'path';

export function registerSystemCommands() {

  // Open any app
  ipcMain.handle('open-app', async (_event, appName: string) => {
    const commands: Record<string, string> = {
      'notepad': 'notepad.exe',
      'calculator': 'calc.exe',
      'chrome': 'start chrome',
      'file explorer': 'explorer.exe',
      'task manager': 'taskmgr.exe',
      'paint': 'mspaint.exe',
      'cmd': 'cmd.exe',
      'terminal': 'wt.exe',
      'settings': 'start ms-settings:',
      'control panel': 'control.exe',
    };

    const cmd = commands[appName.toLowerCase()];
    if (cmd) {
      exec(cmd);
      return `Opening ${appName}`;
    }

    // Try opening directly
    try {
      exec(`start ${appName}`);
      return `Trying to open ${appName}`;
    } catch {
      return `Could not open ${appName}`;
    }
  });

  // System info
  ipcMain.handle('get-system-info', async () => {
    return {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalMemory: (os.totalmem() / (1024 ** 3)).toFixed(2) + ' GB',
      freeMemory: (os.freemem() / (1024 ** 3)).toFixed(2) + ' GB',
      uptime: (os.uptime() / 3600).toFixed(1) + ' hours',
    };
  });

  // Open website
  ipcMain.handle('open-website', async (_event, url: string) => {
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }
    shell.openExternal(url);
    return `Opening ${url}`;
  });

  // Shutdown / Restart / Lock
  ipcMain.handle('system-power', async (_event, action: string) => {
    const commands: Record<string, string> = {
      'shutdown': 'shutdown /s /t 5',
      'restart': 'shutdown /r /t 5',
      'lock': 'rundll32.exe user32.dll,LockWorkStation',
      'sleep': 'rundll32.exe powrprof.dll,SetSuspendState 0,1,0',
      'cancel shutdown': 'shutdown /a',
    };

    const cmd = commands[action.toLowerCase()];
    if (cmd) {
      exec(cmd);
      return `${action} command executed`;
    }
    return `Unknown power action: ${action}`;
  });

  // Search files
  ipcMain.handle('search-files', async (_event, query: string) => {
    return new Promise((resolve) => {
      exec(
        `where /R C:\\Users ${query}`,
        { timeout: 10000 },
        (error, stdout) => {
          if (error) {
            resolve([]);
          } else {
            const files = stdout.split('\n').filter(f => f.trim());
            resolve(files.slice(0, 20));
          }
        }
      );
    });
  });

  // Volume control
  ipcMain.handle('volume-control', async (_event, action: string) => {
    const commands: Record<string, string> = {
      'mute': 'nircmd.exe mutesysvolume 1',
      'unmute': 'nircmd.exe mutesysvolume 0',
      'volume up': 'nircmd.exe changesysvolume 5000',
      'volume down': 'nircmd.exe changesysvolume -5000',
    };
    const cmd = commands[action.toLowerCase()];
    if (cmd) {
      exec(cmd);
      return `${action} executed`;
    }
    return `Unknown volume action`;
  });
}
