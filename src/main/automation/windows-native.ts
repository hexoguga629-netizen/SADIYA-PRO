import { execFile } from 'child_process'

function runPowerShell(script: string): Promise<{ success: boolean; output?: string; error?: string }> {
  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      ['-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { windowsHide: true, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          resolve({ success: false, error: stderr || error.message })
          return
        }
        resolve({ success: true, output: String(stdout || '').trim() })
      }
    )
  })
}

export async function winClick(x: number, y: number) {
  const script = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Mouse {
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, UIntPtr dwExtraInfo);
}
"@
[Mouse]::SetCursorPos(${Math.round(x)}, ${Math.round(y)})
Start-Sleep -Milliseconds 60
[Mouse]::mouse_event(0x02, 0, 0, 0, [UIntPtr]::Zero)
[Mouse]::mouse_event(0x04, 0, 0, 0, [UIntPtr]::Zero)
`
  return runPowerShell(script)
}

export async function winType(text: string) {
  const safe = String(text).replace(/'/g, "''")
  const script = `
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.SendKeys]::SendWait('${safe}')
`
  return runPowerShell(script)
}

export async function winHotkey(keys: string[]) {
  const combo = keys.map((k) => `'{${String(k).toUpperCase()}}'`).join(', ')
  const script = `
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.SendKeys]::SendWait(${combo})
`
  return runPowerShell(script)
}
