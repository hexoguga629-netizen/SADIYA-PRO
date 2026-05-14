import { spawn, execFile } from 'child_process'

function runAdb(args: string[], timeoutMs = 20000) {
  return new Promise<{ success: boolean; stdout?: string; stderr?: string; error?: string }>((resolve) => {
    const child = spawn('adb', args, { windowsHide: true })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill()
      resolve({ success: false, error: 'ADB timeout' })
    }, timeoutMs)

    child.stdout.on('data', (d) => (stdout += d.toString()))
    child.stderr.on('data', (d) => (stderr += d.toString()))

    child.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0) resolve({ success: true, stdout: stdout.trim() })
      else resolve({ success: false, stderr: stderr.trim(), error: stderr.trim() || `adb exit ${code}` })
    })
  })
}

export async function adbDevices() {
  return runAdb(['devices'])
}

export async function adbTap(x: number, y: number) {
  return runAdb(['shell', 'input', 'tap', String(Math.round(x)), String(Math.round(y))])
}

export async function adbSwipe(x1: number, y1: number, x2: number, y2: number, durationMs = 300) {
  return runAdb([
    'shell',
    'input',
    'swipe',
    String(Math.round(x1)),
    String(Math.round(y1)),
    String(Math.round(x2)),
    String(Math.round(y2)),
    String(Math.max(50, Math.round(durationMs)))
  ])
}

export async function adbType(text: string) {
  const safe = String(text).replace(/ /g, '%s')
  return runAdb(['shell', 'input', 'text', safe])
}

export async function adbBack() {
  return runAdb(['shell', 'input', 'keyevent', '4'])
}

export async function adbLaunch(packageName: string) {
  const pkg = String(packageName || '').trim()
  if (!pkg) return { success: false, error: 'Missing package name' }
  return runAdb(['shell', 'monkey', '-p', pkg, '-c', 'android.intent.category.LAUNCHER', '1'])
}

export async function adbScreenshot() {
  return new Promise<{ success: boolean; base64?: string; error?: string }>((resolve) => {
    execFile(
      'adb',
      ['exec-out', 'screencap', '-p'],
      { encoding: 'buffer', maxBuffer: 20 * 1024 * 1024, windowsHide: true },
      (error, stdout) => {
        if (error) {
          resolve({ success: false, error: error.message })
          return
        }
        const base64 = Buffer.from(stdout).toString('base64')
        resolve({ success: true, base64 })
      }
    )
  })
}
