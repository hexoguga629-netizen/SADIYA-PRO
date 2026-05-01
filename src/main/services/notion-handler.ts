import { IpcMain } from 'electron'
import { Client } from '@notionhq/client'

export default function registerNotion({ ipcMain }: { ipcMain: IpcMain }) {
  ipcMain.removeHandler('notion-search')
  ipcMain.handle('notion-search', async (_e, { query, notionKey }) => {
    try {
      if (!notionKey) return { success: false, error: 'Notion API key not configured' }
      const notion = new Client({ auth: notionKey })
      const response = await notion.search({ query, page_size: 10 })
      return {
        success: true,
        results: response.results.map((page: Record<string, unknown>) => ({
          id: page.id,
          type: page.object,
          title: (page as Record<string, unknown>).url || '',
          url: (page as Record<string, unknown>).url || ''
        }))
      }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })

  ipcMain.removeHandler('notion-create-page')
  ipcMain.handle('notion-create-page', async (_e, { parentId, title, content, notionKey }) => {
    try {
      if (!notionKey) return { success: false, error: 'Notion API key not configured' }
      const notion = new Client({ auth: notionKey })
      const page = await notion.pages.create({
        parent: { page_id: parentId },
        properties: {
          title: { title: [{ text: { content: title } }] }
        },
        children: [
          {
            object: 'block',
            type: 'paragraph',
            paragraph: { rich_text: [{ type: 'text', text: { content } }] }
          }
        ]
      })
      return { success: true, pageId: page.id }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })

  ipcMain.removeHandler('notion-list-databases')
  ipcMain.handle('notion-list-databases', async (_e, { notionKey }) => {
    try {
      if (!notionKey) return { success: false, error: 'Notion API key not configured' }
      const notion = new Client({ auth: notionKey })
      const response = await notion.search({ filter: { property: 'object', value: 'database' } })
      return { success: true, databases: response.results }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })
}
