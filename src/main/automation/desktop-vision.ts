import { app, desktopCapturer, screen } from 'electron'
import fs from 'fs'
import path from 'path'
import Tesseract from 'tesseract.js'
import { winClick, winType, winHotkey } from './windows-native'

type OCRWord = {
  text: string
  bbox: { x0: number; y0: number; x1: number; y1: number }
}

const screenshotDir = path.join(app.getPath('userData'), 'Screenshots')
if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true })

async function captureScreenBase64() {
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: 1920, height: 1080 }
  })

  if (!sources.length) throw new Error('No screen source found')
  return sources[0].thumbnail.toDataURL()
}

export async function takeDesktopScreenshot() {
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: 1920, height: 1080 }
  })

  if (!sources.length) return { success: false, error: 'No screen source found' }

  const image = sources[0].thumbnail
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filePath = path.join(screenshotDir, `screenshot-${timestamp}.png`)
  fs.writeFileSync(filePath, image.toPNG())

  return {
    success: true,
    filePath,
    base64: image.toDataURL(),
    screen: screen.getPrimaryDisplay().workAreaSize
  }
}

export async function ocrDesktopScreenshot(imageDataUrl?: string) {
  const dataUrl = imageDataUrl || (await captureScreenBase64())
  const result = await Tesseract.recognize(dataUrl, 'eng')
  const data = result.data as any
  const words: OCRWord[] = (data.words || [])
    .filter((w: any) => w.text?.trim())
    .map((w: any) => ({
      text: w.text,
      bbox: w.bbox
    }))

  return {
    success: true,
    text: result.data.text,
    words
  }
}

export async function findTextOnScreen(query: string) {
  const shot = await ocrDesktopScreenshot()
  const q = String(query || '').toLowerCase().trim()
  if (!q) return { success: false, error: 'Empty query' }

  const tokens = q.split(/\s+/).filter(Boolean)
  let best: { word: OCRWord; score: number } | null = null

  for (const word of shot.words as OCRWord[]) {
    const text = word.text.toLowerCase()
    let score = 0
    for (const t of tokens) {
      if (text.includes(t)) score += 3
      if (text === t) score += 5
    }
    if (!best || score > best.score) best = { word, score }
  }

  if (!best || best.score <= 0) {
    return { success: false, error: `No match for "${query}"` }
  }

  const word = best.word
  const x = Math.round((word.bbox.x0 + word.bbox.x1) / 2)
  const y = Math.round((word.bbox.y0 + word.bbox.y1) / 2)

  return { success: true, query, x, y, score: best.score, word: word.text }
}

export async function clickTextOnScreen(query: string) {
  const found = await findTextOnScreen(query)
  if (!found.success) return found

  const clickX = found.x ?? 0
  const clickY = found.y ?? 0
  const result = await winClick(clickX, clickY)
  return { ...found, click: result }
}

export async function typeOnScreen(text: string) {
  return winType(text)
}

export async function hotkeyOnScreen(keys: string[]) {
  return winHotkey(keys)
}
