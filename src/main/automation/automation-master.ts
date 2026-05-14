import { BrowserWindow, IpcMain, shell } from 'electron'
import { browserController } from './browser-controller'
import {
  adbBack,
  adbDevices,
  adbLaunch,
  adbScreenshot,
  adbSwipe,
  adbTap,
  adbType
} from './android-controller'
import {
  clickTextOnScreen,
  findTextOnScreen,
  hotkeyOnScreen,
  ocrDesktopScreenshot,
  takeDesktopScreenshot,
  typeOnScreen
} from './desktop-vision'

type AutomationAction =
  | 'browser.open'
  | 'browser.newTab'
  | 'browser.closeTab'
  | 'browser.listTabs'
  | 'browser.searchGoogle'
  | 'browser.searchYouTube'
  | 'browser.clickText'
  | 'browser.fillText'
  | 'browser.describe'
  | 'browser.plan'
  | 'desktop.screenshot'
  | 'desktop.ocr'
  | 'desktop.findText'
  | 'desktop.clickText'
  | 'desktop.type'
  | 'desktop.hotkey'
  | 'android.devices'
  | 'android.screenshot'
  | 'android.tap'
  | 'android.swipe'
  | 'android.type'
  | 'android.launch'
  | 'android.back'
  | 'recover.retry'
  | 'system.openExternal'

type AutomationPayload = {
  action: AutomationAction
  target?: string
  url?: string
  query?: string
  text?: string
  selector?: string
  keys?: string[]
  payload?: any
  index?: number
  x?: number
  y?: number
  x2?: number
  y2?: number
  durationMs?: number
  packageName?: string
  maxRetries?: number
}

function getSafeMainWindow(getMW: () => BrowserWindow | null) {
  const win = getMW()
  return win && !win.isDestroyed() ? win : null
}

function send(win: BrowserWindow | null, channel: string, data: any) {
  if (win) win.webContents.send(channel, data)
}

async function executePlan(goal: string) {
  const steps: AutomationPayload[] = []
  const g = goal.toLowerCase()

  if (g.includes('youtube')) {
    steps.push({ action: 'browser.open', url: 'https://youtube.com' })
    const q = goal.replace(/.*search/i, '').trim()
    if (g.includes('search')) steps.push({ action: 'browser.searchYouTube', query: q || goal })
  } else if (g.includes('google')) {
    steps.push({ action: 'browser.open', url: 'https://google.com' })
    if (g.includes('search')) steps.push({ action: 'browser.searchGoogle', query: goal.replace(/.*search/i, '').trim() || goal })
  }

  if (g.includes('open') && g.includes('browser') && g.includes('github')) {
    steps.push({ action: 'browser.newTab', url: 'https://github.com' })
  }

  if (g.includes('android') || g.includes('phone')) {
    steps.push({ action: 'android.devices' })
  }

  return {
    success: true,
    goal,
    steps
  }
}

export async function executeAutomationAction(
  payload: AutomationPayload,
  getMW: () => BrowserWindow | null
): Promise<any> {
  const win = getSafeMainWindow(getMW)

  switch (payload.action) {
    case 'browser.open':
      return browserController.open(String(payload.url || payload.target || ''))

    case 'browser.newTab':
      return browserController.newTab(String(payload.url || payload.target || ''))

    case 'browser.closeTab':
      return browserController.closeTab(typeof payload.index === 'number' ? payload.index : undefined)

    case 'browser.listTabs':
      return browserController.listTabs()

    case 'browser.searchGoogle':
      return browserController.searchGoogle(String(payload.query || payload.target || ''))

    case 'browser.searchYouTube':
      return browserController.searchYouTube(String(payload.query || payload.target || ''))

    case 'browser.clickText':
      return browserController.clickByMeaning(String(payload.target || payload.text || ''))

    case 'browser.fillText':
      return browserController.fillByMeaning(String(payload.selector || payload.target || ''), String(payload.text || ''))

    case 'browser.describe':
      return browserController.screenshotAndDescribe()

    case 'browser.plan':
      return executePlan(String(payload.target || payload.query || ''))

    case 'desktop.screenshot': {
      const shot = await takeDesktopScreenshot()
      send(win, 'automation:desktop', { stage: 'screenshot', ...shot })
      return shot
    }

    case 'desktop.ocr': {
      const res = await ocrDesktopScreenshot()
      send(win, 'automation:desktop', { stage: 'ocr', ...res })
      return res
    }

    case 'desktop.findText':
      return findTextOnScreen(String(payload.target || payload.query || ''))

    case 'desktop.clickText': {
      const res = await clickTextOnScreen(String(payload.target || payload.text || ''))
      if (!res.success) {
        const shot = await takeDesktopScreenshot()
        send(win, 'automation:desktop', { stage: 'recovery-screenshot', ...shot })
      }
      return res
    }

    case 'desktop.type':
      return typeOnScreen(String(payload.text || ''))

    case 'desktop.hotkey':
      return hotkeyOnScreen(Array.isArray(payload.keys) ? payload.keys : [])

    case 'android.devices':
      return adbDevices()

    case 'android.screenshot':
      return adbScreenshot()

    case 'android.tap':
      return adbTap(Number(payload.x || 0), Number(payload.y || 0))

    case 'android.swipe':
      return adbSwipe(
        Number(payload.x || 0),
        Number(payload.y || 0),
        Number(payload.x2 || 0),
        Number(payload.y2 || 0),
        Number(payload.durationMs || 300)
      )

    case 'android.type':
      return adbType(String(payload.text || ''))

    case 'android.launch':
      return adbLaunch(String(payload.packageName || payload.target || ''))

    case 'android.back':
      return adbBack()

    case 'system.openExternal': {
      const url = String(payload.url || payload.target || '').trim()
      if (!url) return { success: false, error: 'Missing URL' }
      await shell.openExternal(url)
      return { success: true, url }
    }

    case 'recover.retry': {
      const maxRetries = Math.max(1, Math.min(Number(payload.maxRetries || 3), 5))
      const inner = payload.payload || {}
      let last: any = null

      for (let i = 0; i < maxRetries; i++) {
        try {
          last = await executeAutomationAction(inner, getMW)
          if (last?.success) return last
        } catch (err: any) {
          last = { success: false, error: err?.message || String(err) }
        }

        if (inner.action === 'browser.clickText') {
          const fallback = await clickTextOnScreen(String(inner.target || inner.text || ''))
          if (fallback.success) return fallback
        }

        if (inner.action === 'desktop.clickText') {
          const fallback = await clickTextOnScreen(String(inner.target || inner.text || ''))
          if (fallback.success) return fallback
        }
      }

      return last || { success: false, error: 'Recovery failed' }
    }

    default:
      return { success: false, error: `Unknown automation action: ${payload.action}` }
  }
}

export function registerAutomationMaster(
  ipcMain: IpcMain,
  getMainWindow: () => BrowserWindow | null
) {
  ipcMain.removeHandler('automation-exec')
  ipcMain.handle('automation-exec', async (_e, payload: AutomationPayload) => {
    return executeAutomationAction(payload, getMainWindow)
  })
}
