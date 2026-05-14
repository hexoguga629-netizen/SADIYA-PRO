import { chromium, Browser, Page } from 'playwright'

type TabInfo = {
  title: string
  url: string
}

function normalize(s: string) {
  return String(s || '').trim().toLowerCase()
}

function tokenScore(haystack: string, needle: string) {
  const h = normalize(haystack)
  const n = normalize(needle)
  if (!h || !n) return 0

  const ht = new Set(h.split(/\s+/).filter(Boolean))
  const nt = n.split(/\s+/).filter(Boolean)

  let score = 0
  for (const t of nt) {
    if (h.includes(t)) score += 3
    if (ht.has(t)) score += 2
  }

  if (h === n) score += 10
  return score
}

export class BrowserController {
  private browser: Browser | null = null
  private pages = new Map<number, Page>()
  private activePageIndex = 0

  private async ensureBrowser() {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: false
      })
    }
  }

  private async currentPage() {
    await this.ensureBrowser()
    let page = this.pages.get(this.activePageIndex)
    if (!page || page.isClosed()) {
      page = await this.browser!.newPage()
      page.setDefaultTimeout(12000)
      this.pages.set(this.activePageIndex, page)
    }
    return page
  }

  async open(url: string) {
    const page = await this.currentPage()
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 })
    return { success: true, url }
  }

  async newTab(url: string) {
    await this.ensureBrowser()
    this.activePageIndex = this.pages.size
    const page = await this.browser!.newPage()
    page.setDefaultTimeout(12000)
    this.pages.set(this.activePageIndex, page)
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 })
    return { success: true, index: this.activePageIndex, url }
  }

  async closeTab(index?: number) {
    const idx = typeof index === 'number' ? index : this.activePageIndex
    const page = this.pages.get(idx)
    if (!page) return { success: false, error: 'Tab not found' }
    await page.close().catch(() => {})
    this.pages.delete(idx)
    if (this.activePageIndex === idx) this.activePageIndex = Math.max(0, idx - 1)
    return { success: true }
  }

  async listTabs(): Promise<TabInfo[]> {
    await this.ensureBrowser()
    const out: TabInfo[] = []
    for (const [index, page] of this.pages.entries()) {
      let title = ''
      let url = ''
      try {
        title = await page.title()
        url = page.url()
      } catch {}
      out.push({ title: `${index}: ${title || 'Untitled'}`, url })
    }
    return out
  }

  async searchGoogle(query: string) {
    const q = String(query || '').trim()
    if (!q) return { success: false, error: 'Missing query' }
    const page = await this.currentPage()
    await page.goto(`https://www.google.com/search?q=${encodeURIComponent(q)}`, {
      waitUntil: 'domcontentloaded',
      timeout: 20000
    })
    return { success: true, query: q }
  }

  async searchYouTube(query: string) {
    const q = String(query || '').trim()
    if (!q) return { success: false, error: 'Missing query' }
    const page = await this.currentPage()
    await page.goto('https://youtube.com', { waitUntil: 'domcontentloaded', timeout: 20000 })
    await page.waitForTimeout(1500)
    await this.fillByMeaning('search', q)
    await page.keyboard.press('Enter')
    return { success: true, query: q }
  }

  async clickByMeaning(query: string) {
    const page = await this.currentPage()
    const target = await this.pickBestElement(page, query)
    if (!target) return { success: false, error: `No matching element for "${query}"` }

    await target.click({ timeout: 8000 }).catch(async () => {
      const box = await target.boundingBox().catch(() => null)
      if (box) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    })

    return { success: true, query }
  }

  async fillByMeaning(query: string, text: string) {
    const page = await this.currentPage()
    const locator = await this.pickBestFillable(page, query)
    if (!locator) return { success: false, error: `No fillable field for "${query}"` }
    await locator.fill(String(text), { timeout: 8000 })
    return { success: true, query, text }
  }

  async screenshotAndDescribe() {
    const page = await this.currentPage()
    const title = await page.title().catch(() => '')
    const url = page.url()
    const bodyText = await page.locator('body').innerText({ timeout: 8000 }).catch(() => '')
    return {
      success: true,
      title,
      url,
      text: bodyText.slice(0, 5000)
    }
  }

  async multiTabPlan(goal: string) {
    const g = normalize(goal)
    const steps: Array<{ action: string; payload: any }> = []

    if (g.includes('youtube')) {
      steps.push({ action: 'browser.open', payload: { url: 'https://youtube.com' } })
      if (g.includes('search')) {
        const query = goal.replace(/.*search/i, '').trim()
        steps.push({ action: 'browser.youtube.search', payload: { query: query || goal } })
      }
    } else if (g.includes('google')) {
      steps.push({ action: 'browser.open', payload: { url: 'https://google.com' } })
    }

    if (g.includes('github')) steps.push({ action: 'browser.newTab', payload: { url: 'https://github.com' } })
    if (g.includes('docs')) steps.push({ action: 'browser.newTab', payload: { url: 'https://docs.google.com' } })

    return { success: true, goal, steps }
  }

  private async pickBestElement(page: Page, query: string) {
    const q = normalize(query)
    const candidates = await page.evaluate(() => {
      const selector = [
        'button',
        'a',
        'input',
        'textarea',
        '[role="button"]',
        '[role="link"]',
        '[role="textbox"]',
        '[aria-label]',
        '[title]'
      ].join(',')

      return Array.from(document.querySelectorAll(selector)).map((el) => {
        const e = el as HTMLElement
        const text = [
          e.innerText,
          e.textContent,
          e.getAttribute('aria-label'),
          e.getAttribute('placeholder'),
          e.getAttribute('title'),
          (e as HTMLInputElement).value
        ]
          .filter(Boolean)
          .join(' | ')
        const rect = e.getBoundingClientRect()
        return {
          text,
          x: rect.x,
          y: rect.y,
          w: rect.width,
          h: rect.height
        }
      })
    })

    let best: (typeof candidates)[number] | null = null
    let bestScore = 0

    for (const c of candidates) {
      const s = tokenScore(c.text, q)
      if (s > bestScore) {
        bestScore = s
        best = c
      }
    }

    if (!best) return null

    return page.locator('body').evaluateHandle((body) => body).then(async () => {
      const handle = await page.evaluateHandle(({ query }) => {
        const selector = [
          'button',
          'a',
          'input',
          'textarea',
          '[role="button"]',
          '[role="link"]',
          '[role="textbox"]',
          '[aria-label]',
          '[title]'
        ].join(',')

        const els = Array.from(document.querySelectorAll(selector)) as HTMLElement[]
        let chosen: HTMLElement | null = null
        let bestScore = 0

        const score = (txt: string) => {
          const h = txt.toLowerCase()
          const n = query.toLowerCase()
          const ht = new Set(h.split(/\s+/).filter(Boolean))
          let s = 0
          for (const t of n.split(/\s+/).filter(Boolean)) {
            if (h.includes(t)) s += 3
            if (ht.has(t)) s += 2
          }
          return s
        }

        for (const el of els) {
          const txt = [
            el.innerText,
            el.textContent,
            el.getAttribute('aria-label'),
            el.getAttribute('placeholder'),
            el.getAttribute('title')
          ]
            .filter(Boolean)
            .join(' ')
          const s = score(txt)
          if (s > bestScore) {
            bestScore = s
            chosen = el
          }
        }
        return chosen
      }, { query: q })

      const el = handle.asElement()
      if (!el) return null
      return el
    })
  }

  private async pickBestFillable(page: Page, query: string) {
    const q = normalize(query)
    const locator = page.locator('input, textarea, [contenteditable="true"]').filter({
      hasText: ''
    })

    const count = await locator.count().catch(() => 0)
    if (!count) return null

    let bestIndex = 0
    let bestScore = -1

    for (let i = 0; i < count; i++) {
      const el = locator.nth(i)
      const attrs = await el.evaluate((node) => {
        const e = node as HTMLElement
        return [
          e.getAttribute('aria-label'),
          e.getAttribute('placeholder'),
          e.getAttribute('title'),
          (e as HTMLInputElement).name,
          (e as HTMLInputElement).id
        ]
          .filter(Boolean)
          .join(' ')
      }).catch(() => '')

      const s = tokenScore(attrs, q)
      if (s > bestScore) {
        bestScore = s
        bestIndex = i
      }
    }

    return locator.nth(bestIndex)
  }
}

export const browserController = new BrowserController()
