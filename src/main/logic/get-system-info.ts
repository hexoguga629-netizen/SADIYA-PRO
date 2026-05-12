import { IpcMain } from 'electron'
import os from 'os'
import fs from 'fs'
import { exec } from 'child_process'

const runCommand = (cmd: string): Promise<string> => {
  return new Promise((resolve) => {
    exec(cmd, { maxBuffer: 1024 * 1024 * 10, timeout: 5000 }, (error, stdout) => {
      if (error) {
      }
      resolve(stdout ? stdout.trim() : '')
    })
  })
}

let cpuLastSnapshot = os.cpus()

function getSystemCpuUsage() {
  const cpus = os.cpus()
  let idle = 0
  let total = 0
  for (let i = 0; i < cpus.length; i++) {
    const cpu = cpus[i]
    const prevCpu = cpuLastSnapshot[i]
    let currentTotal = 0
    for (const type in cpu.times) currentTotal += cpu.times[type]
    let prevTotal = 0
    for (const type in prevCpu.times) prevTotal += prevCpu.times[type]
    idle += cpu.times.idle - prevCpu.times.idle
    total += currentTotal - prevTotal
  }
  cpuLastSnapshot = cpus
  return total === 0 ? '0.0' : (((total - idle) / total) * 100).toFixed(1)
}

async function getCpuTemperature(): Promise<number> {
  const platform = os.platform()
  try {
    if (platform === 'linux') {
      const zones = [
        '/sys/class/thermal/thermal_zone0/temp',
        '/sys/class/hwmon/hwmon0/temp1_input',
        '/sys/class/hwmon/hwmon1/temp1_input'
      ]
      for (const zone of zones) {
        try {
          const raw = fs.readFileSync(zone, 'utf8').trim()
          const val = parseInt(raw, 10)
          if (val > 0) return Math.round(val / 1000)
        } catch { /* try next */ }
      }
    } else if (platform === 'win32') {
      const out = await runCommand('powershell "(Get-CimInstance MSAcpi_ThermalZoneTemperature -Namespace root/wmi -ErrorAction SilentlyContinue | Select-Object -First 1).CurrentTemperature"')
      if (out) {
        const kelvin = parseInt(out, 10)
        if (kelvin > 0) return Math.round(kelvin / 10 - 273.15)
      }
    } else if (platform === 'darwin') {
      const out = await runCommand('sudo powermetrics --samplers smc -i 1 -n 1 2>/dev/null | grep "CPU die temperature"')
      const match = out.match(/([\d.]+)\s*C/)
      if (match) return Math.round(parseFloat(match[1]))
    }
  } catch { /* fallback */ }
  return -1
}

let prevRx = 0
let prevTx = 0
let prevTime = Date.now()

async function getNetworkSpeed(): Promise<{ down: number; up: number }> {
  const platform = os.platform()
  try {
    if (platform === 'linux') {
      const ifaces = os.networkInterfaces()
      let ifName = ''
      for (const [name, addrs] of Object.entries(ifaces)) {
        if (name === 'lo' || !addrs) continue
        const hasIp = addrs.some((a) => a.family === 'IPv4' && !a.internal)
        if (hasIp) { ifName = name; break }
      }
      if (!ifName) return { down: 0, up: 0 }

      const rxPath = `/sys/class/net/${ifName}/statistics/rx_bytes`
      const txPath = `/sys/class/net/${ifName}/statistics/tx_bytes`
      const rx = parseInt(fs.readFileSync(rxPath, 'utf8').trim(), 10)
      const tx = parseInt(fs.readFileSync(txPath, 'utf8').trim(), 10)
      const now = Date.now()
      const elapsed = (now - prevTime) / 1000
      const down = elapsed > 0 && prevRx > 0 ? Math.round(((rx - prevRx) / elapsed) * 8 / 1_000_000) : 0
      const up = elapsed > 0 && prevTx > 0 ? Math.round(((tx - prevTx) / elapsed) * 8 / 1_000_000) : 0
      prevRx = rx
      prevTx = tx
      prevTime = now
      return { down: Math.max(0, down), up: Math.max(0, up) }
    } else if (platform === 'win32') {
      const out = await runCommand('powershell "(Get-NetAdapterStatistics | Select-Object -First 1 | Select ReceivedBytes, SentBytes | ConvertTo-Json)"')
      if (out) {
        const data = JSON.parse(out)
        const rx = data.ReceivedBytes || 0
        const tx = data.SentBytes || 0
        const now = Date.now()
        const elapsed = (now - prevTime) / 1000
        const down = elapsed > 0 && prevRx > 0 ? Math.round(((rx - prevRx) / elapsed) * 8 / 1_000_000) : 0
        const up = elapsed > 0 && prevTx > 0 ? Math.round(((tx - prevTx) / elapsed) * 8 / 1_000_000) : 0
        prevRx = rx
        prevTx = tx
        prevTime = now
        return { down: Math.max(0, down), up: Math.max(0, up) }
      }
    }
  } catch { /* fallback */ }
  return { down: 0, up: 0 }
}

async function getBattery(): Promise<{ percent: number; charging: boolean }> {
  const platform = os.platform()
  try {
    if (platform === 'linux') {
      const capPath = '/sys/class/power_supply/BAT0/capacity'
      const statusPath = '/sys/class/power_supply/BAT0/status'
      try {
        const cap = parseInt(fs.readFileSync(capPath, 'utf8').trim(), 10)
        const status = fs.readFileSync(statusPath, 'utf8').trim()
        return { percent: cap, charging: status === 'Charging' || status === 'Full' }
      } catch {
        return { percent: -1, charging: false }
      }
    } else if (platform === 'win32') {
      const out = await runCommand('powershell "(Get-CimInstance Win32_Battery | Select EstimatedChargeRemaining, BatteryStatus | ConvertTo-Json)"')
      if (out) {
        const data = JSON.parse(out)
        return { percent: data.EstimatedChargeRemaining ?? -1, charging: data.BatteryStatus === 2 }
      }
    } else if (platform === 'darwin') {
      const out = await runCommand('pmset -g batt')
      const match = out.match(/(\d+)%/)
      const charging = out.includes('charging') || out.includes('AC Power')
      return { percent: match ? parseInt(match[1], 10) : -1, charging }
    }
  } catch { /* fallback */ }
  return { percent: -1, charging: false }
}

async function getDiskUsage(): Promise<{ percent: number; usedGB: number; totalGB: number }> {
  const platform = os.platform()
  try {
    if (platform === 'win32') {
      const out = await runCommand('powershell "$d = Get-PSDrive C; Write-Output (([math]::round($d.Used/1GB,1)).ToString() + \",\" + ([math]::round(($d.Used+$d.Free)/1GB,1)).ToString())"')
      if (out) {
        const [usedStr, totalStr] = out.split(',')
        const usedGB = parseFloat(usedStr) || 0
        const totalGB = parseFloat(totalStr) || 1
        return { percent: Math.round((usedGB / totalGB) * 100), usedGB, totalGB }
      }
    } else {
      const out = await runCommand("df -BG / | tail -1 | awk '{print $3, $2}'")
      if (out) {
        const parts = out.split(/\s+/)
        const usedGB = parseFloat(parts[0]?.replace('G', '')) || 0
        const totalGB = parseFloat(parts[1]?.replace('G', '')) || 1
        return { percent: Math.round((usedGB / totalGB) * 100), usedGB, totalGB }
      }
    }
  } catch { /* fallback */ }
  return { percent: 0, usedGB: 0, totalGB: 0 }
}

function getOsName(): string {
  const platform = os.platform()
  if (platform === 'win32') {
    const rel = os.release()
    const major = parseInt(rel.split('.')[0], 10)
    const build = parseInt(rel.split('.')[2] || '0', 10)
    if (major >= 10 && build >= 22000) return 'Windows 11'
    if (major >= 10) return 'Windows 10'
    return `Windows ${rel}`
  }
  if (platform === 'darwin') {
    const rel = os.release()
    return `macOS ${rel}`
  }
  return `${os.type()} ${os.release()}`
}

export default function registerSystemHandlers(ipcMain: IpcMain) {

  ipcMain.removeHandler('get-installed-apps')
  ipcMain.handle('get-installed-apps', async () => {
    try {
      if (os.platform() !== 'win32') return []

      const cmd = `powershell "Get-StartApps | Select-Object Name, AppID | ConvertTo-Json -Depth 1"`

      const jsonOutput = await runCommand(cmd)

      if (!jsonOutput) return []

      let rawData
      try {
        rawData = JSON.parse(jsonOutput)
      } catch (parseError) {
        return []
      }

      const appsArray = Array.isArray(rawData) ? rawData : [rawData]

      return appsArray
        .filter((a: { Name?: string; AppID?: string }) => a && a.Name && a.AppID)
        .map((a: { Name: string; AppID: string }) => ({
          name: a.Name.trim(),
          id: a.AppID.trim()
        }))
        .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name))
    } catch (e) {
      return []
    }
  })

  ipcMain.removeHandler('get-system-stats')
  ipcMain.handle('get-system-stats', async () => {
    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const [temperature, network, battery, diskInfo] = await Promise.all([
      getCpuTemperature(),
      getNetworkSpeed(),
      getBattery(),
      getDiskUsage()
    ])
    return {
      cpu: getSystemCpuUsage(),
      memory: {
        total: (totalMem / 1024 ** 3).toFixed(1) + ' GB',
        free: (freeMem / 1024 ** 3).toFixed(1) + ' GB',
        usedPercentage: (((totalMem - freeMem) / totalMem) * 100).toFixed(1)
      },
      temperature: temperature > 0 ? temperature : null,
      network,
      battery,
      disk: diskInfo,
      os: {
        type: getOsName(),
        uptime: (os.uptime() / 3600).toFixed(1) + 'h'
      }
    }
  })

  ipcMain.removeHandler('get-drives')
  ipcMain.handle('get-drives', async () => {
    try {
      const cmd = `powershell "Get-PSDrive -PSProvider FileSystem | Select-Object Name, @{N='FreeGB';E={[math]::round($_.Free/1GB,2)}}, @{N='UsedGB';E={[math]::round($_.Used/1GB,2)}} | ConvertTo-Json"`
      const output = await runCommand(cmd)
      return output ? JSON.parse(output) : []
    } catch (e) {
      return []
    }
  })
}
