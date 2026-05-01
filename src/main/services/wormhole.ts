import { IpcMain } from 'electron'
import { HfInference } from '@huggingface/inference'

export default function registerWormhole({ ipcMain }: { ipcMain: IpcMain }) {
  ipcMain.removeHandler('wormhole-generate')
  ipcMain.handle('wormhole-generate', async (_e, { prompt, model, hfKey }) => {
    try {
      if (!hfKey) return { success: false, error: 'Hugging Face API key not configured. Add it in Settings.' }
      const hf = new HfInference(hfKey)
      const response = await hf.textGeneration({
        model: model || 'meta-llama/Meta-Llama-3-8B-Instruct',
        inputs: prompt,
        parameters: { max_new_tokens: 1024, temperature: 0.7 }
      })
      return { success: true, text: response.generated_text }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })

  ipcMain.removeHandler('wormhole-image')
  ipcMain.handle('wormhole-image', async (_e, { prompt, hfKey }) => {
    try {
      if (!hfKey) return { success: false, error: 'HF key not set' }
      const hf = new HfInference(hfKey)
      const image = await hf.textToImage({
        model: 'stabilityai/stable-diffusion-xl-base-1.0',
        inputs: prompt
      })
      const buffer = Buffer.from(await (image as Blob).arrayBuffer())
      return { success: true, image: `data:image/png;base64,${buffer.toString('base64')}` }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })

  ipcMain.removeHandler('wormhole-summarize')
  ipcMain.handle('wormhole-summarize', async (_e, { text, hfKey }) => {
    try {
      if (!hfKey) return { success: false, error: 'HF key not set' }
      const hf = new HfInference(hfKey)
      const result = await hf.summarization({
        model: 'facebook/bart-large-cnn',
        inputs: text
      })
      return { success: true, summary: result.summary_text }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })
}
