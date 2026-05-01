import { ipcMain, BrowserWindow, screen, desktopCapturer } from 'electron'

export default function registerPhantomControl() {
  ipcMain.removeHandler('phantom-move-mouse')
  ipcMain.handle('phantom-move-mouse', async (_e, { x, y }) => {
    try {
      const win = BrowserWindow.getFocusedWindow()
      if (win) {
        const [wx, wy] = win.getPosition()
        win.setPosition(wx + x, wy + y)
      }
      return { success: true }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })

  ipcMain.removeHandler('phantom-get-screens')
  ipcMain.handle('phantom-get-screens', async () => {
    try {
      const displays = screen.getAllDisplays()
      return displays.map((d) => ({
        id: d.id,
        bounds: d.bounds,
        size: d.size,
        scaleFactor: d.scaleFactor,
        rotation: d.rotation,
        isPrimary: d.id === screen.getPrimaryDisplay().id
      }))
    } catch {
      return []
    }
  })

  ipcMain.removeHandler('phantom-get-windows')
  ipcMain.handle('phantom-get-windows', async () => {
    try {
      const windows = BrowserWindow.getAllWindows()
      return windows.map((w) => ({
        id: w.id,
        title: w.getTitle(),
        bounds: w.getBounds(),
        isVisible: w.isVisible(),
        isFocused: w.isFocused()
      }))
    } catch {
      return []
    }
  })

  ipcMain.removeHandler('phantom-focus-window')
  ipcMain.handle('phantom-focus-window', async (_e, { windowId }) => {
    try {
      const win = BrowserWindow.fromId(windowId)
      if (win) {
        win.focus()
        win.show()
        return { success: true }
      }
      return { success: false, error: 'Window not found' }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })

  ipcMain.removeHandler('phantom-capture')
  ipcMain.handle('phantom-capture', async () => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1920, height: 1080 }
      })
      if (sources.length > 0) {
        return { success: true, image: sources[0].thumbnail.toDataURL() }
      }
      return { success: false, error: 'No capture source' }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })
}
