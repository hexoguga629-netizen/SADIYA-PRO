import { chromium, Browser, Page } from 'playwright'

class BrowserController {
  browser: Browser | null = null
  page: Page | null = null

  async ensureBrowser() {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: false
      })
    }
    if (!this.page) {
      this.page = await this.browser.newPage()
    }
  }

  async open(url: string) {
    await this.ensureBrowser()
    await this.page!.goto(url)
    return { success: true }
  }

  async searchYouTube(query: string) {
    await this.ensureBrowser()
    await this.page!.goto('https://youtube.com')
    await this.page!.waitForTimeout(2000)
    await this.page!.fill('input[name="search_query"]', query)
    await this.page!.keyboard.press('Enter')
    return { success: true, query }
  }

  async googleSearch(query: string) {
    await this.ensureBrowser()
    await this.page!.goto('https://google.com')
    await this.page!.fill('textarea[name="q"]', query)
    await this.page!.keyboard.press('Enter')
    return { success: true, query }
  }

  async click(selector: string) {
    await this.ensureBrowser()
    await this.page!.click(selector)
    return { success: true }
  }

  async type(selector: string, text: string) {
    await this.ensureBrowser()
    await this.page!.fill(selector, text)
    return { success: true }
  }

  async getPageText() {
    await this.ensureBrowser()
    const text = await this.page!.textContent('body')
    return text
  }
}

export const browserController = new BrowserController()
