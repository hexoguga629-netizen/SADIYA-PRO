import { IpcMain } from 'electron'
import { loadSecureVault, saveSecureVault, withVaultLock } from '../security/vault'
import { GoogleGenAI } from '@google/genai'
import Groq from 'groq-sdk'
import { HfInference } from '@huggingface/inference'

export type ProviderName = 'gemini' | 'groq' | 'huggingface' | 'nvidia'

interface ChatResult {
  success: boolean
  text?: string
  error?: string
  provider?: string
}

async function chatWithGemini(apiKey: string, prompt: string, history: { role: string; content: string }[]): Promise<ChatResult> {
  const ai = new GoogleGenAI({ apiKey })
  const recentHistory = history.slice(-10)
  const firstUserIdx = recentHistory.findIndex((m) => m.role !== 'model')
  const contents = (firstUserIdx > 0 ? recentHistory.slice(firstUserIdx) : recentHistory).map((m) => ({
    role: m.role === 'model' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }))

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents
  })
  return { success: true, text: response.text ?? '', provider: 'gemini' }
}

async function chatWithGroq(apiKey: string, prompt: string, history: { role: string; content: string }[]): Promise<ChatResult> {
  const groq = new Groq({ apiKey })
  const recentHistory = history.slice(-10)
  const firstUserIdx = recentHistory.findIndex((m) => m.role !== 'model')
  const messages = (firstUserIdx > 0 ? recentHistory.slice(firstUserIdx) : recentHistory).map((m) => ({
    role: (m.role === 'model' ? 'assistant' : 'user') as 'user' | 'assistant' | 'system',
    content: m.content
  }))

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages,
    max_tokens: 2048,
    temperature: 0.7
  })

  const text = response.choices?.[0]?.message?.content ?? ''
  return { success: true, text, provider: 'groq' }
}

async function chatWithHuggingFace(apiKey: string, prompt: string, _history: { role: string; content: string }[]): Promise<ChatResult> {
  const hf = new HfInference(apiKey)
  const response = await hf.textGeneration({
    model: 'meta-llama/Meta-Llama-3-8B-Instruct',
    inputs: prompt,
    parameters: { max_new_tokens: 1024, temperature: 0.7 }
  })
  return { success: true, text: response.generated_text || '', provider: 'huggingface' }
}

async function chatWithNvidia(apiKey: string, prompt: string, history: { role: string; content: string }[]): Promise<ChatResult> {
  const recentHistory = history.slice(-10)
  const firstUserIdx = recentHistory.findIndex((m) => m.role !== 'model')
  const messages = (firstUserIdx > 0 ? recentHistory.slice(firstUserIdx) : recentHistory).map((m) => ({
    role: m.role === 'model' ? 'assistant' : 'user',
    content: m.content
  }))

  const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'meta/llama-3.1-8b-instruct',
      messages,
      max_tokens: 2048,
      temperature: 0.7
    })
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => response.statusText)
    throw new Error(`NVIDIA API error ${response.status}: ${errText}`)
  }

  const data = await response.json()
  const text = data.choices?.[0]?.message?.content ?? ''
  return { success: true, text, provider: 'nvidia' }
}

const PROVIDER_FNS: Record<ProviderName, (apiKey: string, prompt: string, history: { role: string; content: string }[]) => Promise<ChatResult>> = {
  gemini: chatWithGemini,
  groq: chatWithGroq,
  huggingface: chatWithHuggingFace,
  nvidia: chatWithNvidia
}

const PROVIDER_PRIORITY: ProviderName[] = ['gemini', 'groq', 'huggingface', 'nvidia']

export function getActiveProvider(vault: { apiKeys: Record<string, string>; settings: Record<string, string> }): { provider: ProviderName; apiKey: string } | null {
  // Check if user has a preferred provider set
  const preferred = vault.settings['ai-provider'] as ProviderName | undefined
  if (preferred && vault.apiKeys[preferred]) {
    return { provider: preferred, apiKey: vault.apiKeys[preferred] }
  }

  // Auto-select first available provider
  for (const p of PROVIDER_PRIORITY) {
    if (vault.apiKeys[p]) {
      return { provider: p, apiKey: vault.apiKeys[p] }
    }
  }
  return null
}

export async function chatWithAI(
  prompt: string,
  history: { role: string; content: string }[],
  vault: { apiKeys: Record<string, string>; settings: Record<string, string> }
): Promise<ChatResult> {
  const active = getActiveProvider(vault)
  if (!active) {
    return {
      success: false,
      error: 'No AI API key configured. Go to Settings and add at least one API key (Gemini, Groq, HuggingFace, or NVIDIA).'
    }
  }

  try {
    return await PROVIDER_FNS[active.provider](active.apiKey, prompt, history)
  } catch (err) {
    // If preferred provider fails, try others as fallback
    for (const p of PROVIDER_PRIORITY) {
      if (p === active.provider) continue
      if (!vault.apiKeys[p]) continue
      try {
        const result = await PROVIDER_FNS[p](vault.apiKeys[p], prompt, history)
        return { ...result, provider: p }
      } catch { continue }
    }
    const errMsg = String(err).slice(0, 150)
    return { success: false, error: `All AI providers failed. Last error (${active.provider}): ${errMsg}` }
  }
}

export default function registerAIProviders({ ipcMain }: { ipcMain: IpcMain }) {
  // Set preferred AI provider
  ipcMain.removeHandler('set-ai-provider')
  ipcMain.handle('set-ai-provider', async (_e, { provider }: { provider: string }) => {
    return withVaultLock(async () => {
      try {
        if (!PROVIDER_PRIORITY.includes(provider as ProviderName)) {
          return { success: false, error: `Invalid provider: ${provider}` }
        }
        const vault = loadSecureVault()
        vault.settings['ai-provider'] = provider
        saveSecureVault(vault)
        return { success: true }
      } catch (e) {
        return { success: false, error: String(e) }
      }
    })
  })

  // Get current AI provider
  ipcMain.removeHandler('get-ai-provider')
  ipcMain.handle('get-ai-provider', async () => {
    try {
      const vault = loadSecureVault()
      const active = getActiveProvider(vault)
      return { success: true, provider: active?.provider || null }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })

  // Direct AI chat (multi-provider)
  ipcMain.removeHandler('ai-chat')
  ipcMain.handle('ai-chat', async (_e, { prompt, history }: { prompt: string; history?: { role: string; content: string }[] }) => {
    try {
      const vault = loadSecureVault()
      return await chatWithAI(prompt, history || [], vault)
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })
}
