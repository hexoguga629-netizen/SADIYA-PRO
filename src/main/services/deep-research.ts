import { IpcMain } from 'electron'
import { tavily } from '@tavily/core'
import { GoogleGenAI } from '@google/genai'

export default function registerDeepResearch({ ipcMain }: { ipcMain: IpcMain }) {
  ipcMain.removeHandler('deep-research')
  ipcMain.handle('deep-research', async (_e, { query, tavilyKey, geminiKey }) => {
    try {
      let searchResults = ''

      if (tavilyKey) {
        const tvly = tavily({ apiKey: tavilyKey })
        const response = await tvly.search(query, { maxResults: 5 })
        searchResults = response.results
          .map((r: { title: string; content: string; url: string }) => `[${r.title}](${r.url})\n${r.content}`)
          .join('\n\n')
      }

      if (geminiKey) {
        const ai = new GoogleGenAI({ apiKey: geminiKey })
        const prompt = searchResults
          ? `Based on these search results, provide a comprehensive analysis:\n\nQuery: ${query}\n\nSearch Results:\n${searchResults}\n\nProvide a detailed, well-structured response.`
          : `Research and provide a comprehensive analysis on: ${query}`

        const response = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: prompt
        })

        return {
          success: true,
          result: response.text || 'No response generated',
          sources: searchResults
        }
      }

      return {
        success: true,
        result: searchResults || 'No API keys configured. Please add Tavily and/or Gemini keys in Settings.',
        sources: ''
      }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })
}
