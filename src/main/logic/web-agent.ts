import { IpcMain } from 'electron'
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import * as cheerio from 'cheerio'

puppeteer.use(StealthPlugin())

export default function registerWebAgent(ipcMain: IpcMain) {
  ipcMain.removeHandler('web-browse')
  ipcMain.handle('web-browse', async (_e, { url }) => {
    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      })
      const page = await browser.newPage()
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 })
      const html = await page.content()
      const title = await page.title()
      await browser.close()

      const $ = cheerio.load(html)
      $('script, style, noscript').remove()
      const text = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 5000)

      return { success: true, title, text, url }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })

  ipcMain.removeHandler('web-search')
  ipcMain.handle('web-search', async (_e, { query }) => {
    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      })
      const page = await browser.newPage()
      await page.goto(`https://www.google.com/search?q=${encodeURIComponent(query)}`, {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      })
      const html = await page.content()
      await browser.close()

      const $ = cheerio.load(html)
      const results: { title: string; link: string; snippet: string }[] = []
      $('div.g').each((_, el) => {
        const title = $(el).find('h3').text()
        const link = $(el).find('a').attr('href') || ''
        const snippet = $(el).find('.VwiC3b').text()
        if (title && link) results.push({ title, link, snippet })
      })

      return { success: true, results: results.slice(0, 10) }
    } catch (e) {
      return { success: false, error: String(e), results: [] }
    }
  })

  ipcMain.removeHandler('web-screenshot')
  ipcMain.handle('web-screenshot', async (_e, { url }) => {
    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      })
      const page = await browser.newPage()
      await page.setViewport({ width: 1280, height: 720 })
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 })
      const screenshot = await page.screenshot({ encoding: 'base64' })
      await browser.close()
      return { success: true, screenshot }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })
}
