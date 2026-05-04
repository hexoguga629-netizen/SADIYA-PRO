import { useState, useEffect } from 'react'
import {
  RiSettings4Line,
  RiKey2Line,
  RiSaveLine,
  RiDeleteBinLine,
  RiExternalLinkLine,
  RiEyeLine,
  RiEyeOffLine,
  RiCheckLine,
  RiCloseLine,
  RiArrowLeftLine
} from 'react-icons/ri'

const glassPanel = 'bg-[#0b1929]/70 backdrop-blur-2xl border border-cyan-500/10 rounded-xl shadow-[0_0_40px_rgba(6,182,212,0.04)]'

interface ApiProvider {
  id: string
  name: string
  description: string
  link: string
  linkLabel: string
  placeholder: string
  color: string
}

const providers: ApiProvider[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'AI model for text generation, research & analysis',
    link: 'https://aistudio.google.com/apikey',
    linkLabel: 'Get API Key',
    placeholder: 'AIzaSy...',
    color: '#4285f4'
  },
  {
    id: 'groq',
    name: 'Groq',
    description: 'Ultra-fast LLM inference for real-time AI tasks',
    link: 'https://console.groq.com/keys',
    linkLabel: 'Get API Key',
    placeholder: 'gsk_...',
    color: '#f55036'
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Connect to your Notion workspace for notes & knowledge',
    link: 'https://www.notion.so/my-integrations',
    linkLabel: 'Create Integration',
    placeholder: 'ntn_...',
    color: '#ffffff'
  },
  {
    id: 'tavily',
    name: 'Tavily',
    description: 'AI-powered search for deep research & web scraping',
    link: 'https://app.tavily.com/home',
    linkLabel: 'Get API Key',
    placeholder: 'tvly-...',
    color: '#6366f1'
  },
  {
    id: 'huggingface',
    name: 'Hugging Face',
    description: 'Access 100k+ models for text, image & audio generation',
    link: 'https://huggingface.co/settings/tokens',
    linkLabel: 'Create Token',
    placeholder: 'hf_...',
    color: '#ffbd45'
  },
  {
    id: 'nvidia',
    name: 'NVIDIA',
    description: 'Access NVIDIA AI models via free API (Llama, Mistral, etc.)',
    link: 'https://build.nvidia.com/explore/discover',
    linkLabel: 'Get API Key',
    placeholder: 'nvapi-...',
    color: '#76b900'
  }
]

const AI_PROVIDERS = ['gemini', 'groq', 'huggingface', 'nvidia'] as const

export default function SettingsPanel({ onBack }: { onBack: () => void }) {
  const [keys, setKeys] = useState<Record<string, string>>({})
  const [savedKeys, setSavedKeys] = useState<Record<string, string>>({})
  const [showKey, setShowKey] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [activeProvider, setActiveProvider] = useState<string | null>(null)

  useEffect(() => {
    loadKeys()
  }, [])

  const loadKeys = async () => {
    const electronAPI = window.electron?.ipcRenderer
    if (!electronAPI) return

    for (const provider of providers) {
      try {
        const result = await electronAPI.invoke('security-get-api-key', { provider: provider.id })
        if (result?.success && result.apiKey) {
          setSavedKeys(prev => ({ ...prev, [provider.id]: result.apiKey }))
          setKeys(prev => ({ ...prev, [provider.id]: result.apiKey }))
        }
      } catch {}
    }

    try {
      const providerResult = await electronAPI.invoke('get-ai-provider')
      if (providerResult?.success && providerResult.provider) {
        setActiveProvider(providerResult.provider)
      }
    } catch {}
  }

  const selectProvider = async (providerId: string) => {
    const electronAPI = window.electron?.ipcRenderer
    if (!electronAPI) return
    try {
      await electronAPI.invoke('set-ai-provider', { provider: providerId })
      setActiveProvider(providerId)
    } catch {}
  }

  const saveKey = async (providerId: string) => {
    const electronAPI = window.electron?.ipcRenderer
    if (!electronAPI) return

    setSaving(providerId)
    try {
      await electronAPI.invoke('security-save-api-key', {
        provider: providerId,
        apiKey: keys[providerId] || ''
      })
      setSavedKeys(prev => ({ ...prev, [providerId]: keys[providerId] || '' }))
      setSaved(providerId)
      setTimeout(() => setSaved(null), 2000)
    } catch (e) {
      console.error('Failed to save key:', e)
    }
    setSaving(null)
  }

  const deleteKey = async (providerId: string) => {
    const electronAPI = window.electron?.ipcRenderer
    if (!electronAPI) return

    try {
      await electronAPI.invoke('security-delete-api-key', { provider: providerId })
      setKeys(prev => ({ ...prev, [providerId]: '' }))
      setSavedKeys(prev => ({ ...prev, [providerId]: '' }))
    } catch {}
  }

  const openLink = (url: string) => {
    const electronAPI = window.electron?.ipcRenderer
    if (electronAPI) {
      electronAPI.invoke('open-external-link', { url })
    } else {
      window.open(url, '_blank')
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#030912] p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-all cursor-pointer"
        >
          <RiArrowLeftLine className="text-lg" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <RiSettings4Line className="text-cyan-400" />
            API Key Settings
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Configure your API keys to enable all SADIYA features</p>
        </div>
      </div>

      {/* Active AI Provider Selector */}
      <div className={`${glassPanel} p-5 mb-6`}>
        <h2 className="text-sm font-bold text-white mb-3 tracking-wider">ACTIVE AI PROVIDER</h2>
        <p className="text-xs text-zinc-500 mb-4">Select which AI provider to use for chat and research. Only providers with saved API keys are selectable.</p>
        <div className="flex gap-3 flex-wrap">
          {AI_PROVIDERS.map((pid) => {
            const prov = providers.find(p => p.id === pid)
            if (!prov) return null
            const hasKey = !!savedKeys[pid]
            const isActive = activeProvider === pid
            return (
              <button
                key={pid}
                onClick={() => hasKey && selectProvider(pid)}
                disabled={!hasKey}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold tracking-wider border transition-all cursor-pointer ${
                  isActive
                    ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                    : hasKey
                      ? 'bg-white/[0.04] border-white/10 text-zinc-300 hover:border-cyan-500/30 hover:text-cyan-400'
                      : 'bg-white/[0.02] border-white/5 text-zinc-600 cursor-not-allowed'
                }`}
              >
                {prov.name} {isActive && '(Active)'} {!hasKey && '(No Key)'}
              </button>
            )
          })}
        </div>
      </div>

      {/* API Keys Grid */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin">
        {providers.map((provider) => {
          const hasKey = !!savedKeys[provider.id]
          const isChanged = keys[provider.id] !== savedKeys[provider.id]

          return (
            <div key={provider.id} className={`${glassPanel} p-5 transition-all hover:border-cyan-500/20`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: provider.color + '20', borderColor: provider.color + '30', borderWidth: 1 }}
                  >
                    <RiKey2Line className="text-lg" style={{ color: provider.color }} />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-sm">{provider.name}</h3>
                    <p className="text-[11px] text-zinc-500 mt-0.5">{provider.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {hasKey && (
                    <span className="text-[9px] font-bold tracking-wider px-2.5 py-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/20">
                      ACTIVE
                    </span>
                  )}
                  <button
                    onClick={() => openLink(provider.link)}
                    className="flex items-center gap-1.5 text-[10px] text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                  >
                    <RiExternalLinkLine className="text-xs" />
                    {provider.linkLabel}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <input
                    type={showKey[provider.id] ? 'text' : 'password'}
                    value={keys[provider.id] || ''}
                    onChange={(e) => setKeys(prev => ({ ...prev, [provider.id]: e.target.value }))}
                    placeholder={provider.placeholder}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-cyan-500/30 transition-colors font-mono"
                  />
                  <button
                    onClick={() => setShowKey(prev => ({ ...prev, [provider.id]: !prev[provider.id] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                  >
                    {showKey[provider.id] ? <RiEyeOffLine /> : <RiEyeLine />}
                  </button>
                </div>

                <button
                  onClick={() => saveKey(provider.id)}
                  disabled={!isChanged && hasKey}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[11px] font-bold tracking-wider transition-all cursor-pointer ${
                    saved === provider.id
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : isChanged || !hasKey
                        ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/25'
                        : 'bg-white/5 text-zinc-600 border border-white/5 cursor-not-allowed'
                  }`}
                >
                  {saved === provider.id ? <RiCheckLine /> : <RiSaveLine />}
                  {saving === provider.id ? 'Saving...' : saved === provider.id ? 'Saved' : 'Save'}
                </button>

                {hasKey && (
                  <button
                    onClick={() => deleteKey(provider.id)}
                    className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
                  >
                    <RiDeleteBinLine />
                  </button>
                )}
              </div>
            </div>
          )
        })}

        {/* Info Footer */}
        <div className={`${glassPanel} p-5 mt-6`}>
          <h3 className="text-white font-bold text-sm mb-3">How API Keys Work</h3>
          <ul className="space-y-2 text-[11px] text-zinc-500">
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 mt-0.5">1.</span>
              API keys are stored securely in your local encrypted vault
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 mt-0.5">2.</span>
              Keys are never sent to external servers except to their own provider
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 mt-0.5">3.</span>
              Click the link next to each provider to create/get your API key
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 mt-0.5">4.</span>
              SADIYA uses these keys to power AI features like research, generation, and automation
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
