import { useState, useEffect, useRef, useCallback } from 'react'
import {
  RiTerminalBoxLine,
  RiTaskLine,
  RiRobot2Line,
  RiBrainLine,
  RiFolderOpenLine,
  RiGlobalLine,
  RiPlugLine,
  RiComputerLine,
  RiSettings4Line,
  RiSearchLine,
  RiPlayCircleLine,
  RiLightbulbLine,
  RiBarChartBoxLine,
  RiBookOpenLine,
  RiMicLine,
  RiMicOffLine,
  RiSendPlane2Line,
  RiCpuLine,
  RiTimeLine,
  RiCheckDoubleLine,
  RiArrowRightSLine,
  RiCameraLine,
  RiAddLine,
  RiEqualizer2Line,
  RiShieldLine,
  RiEyeLine,
  RiLoader4Line,
  RiCloseCircleLine,
  RiVolumeUpLine
} from 'react-icons/ri'
import { HiComputerDesktop } from 'react-icons/hi2'
import sadiyaAvatar from '../assets/sadiya-avatar.png'
import { getSystemStatus, SystemStats } from '../services/system-info'
import { getHistory, ChatMessage } from '../services/iris-ai-brain'

const glassPanel =
  'bg-[#0a1628]/80 backdrop-blur-2xl border border-cyan-500/15 rounded-2xl shadow-[0_0_40px_rgba(6,182,212,0.05),inset_0_1px_0_rgba(255,255,255,0.03)]'

const glowBorder =
  'before:absolute before:inset-0 before:rounded-2xl before:p-[1px] before:bg-gradient-to-b before:from-cyan-500/20 before:to-transparent before:pointer-events-none before:-z-10'

const navItems = [
  { id: 'console', icon: RiTerminalBoxLine, label: 'CONSOLE' },
  { id: 'tasks', icon: RiTaskLine, label: 'TASKS' },
  { id: 'agents', icon: RiRobot2Line, label: 'AGENTS' },
  { id: 'memory', icon: RiBrainLine, label: 'MEMORY' },
  { id: 'files', icon: RiFolderOpenLine, label: 'FILES' },
  { id: 'browser', icon: RiGlobalLine, label: 'BROWSER' },
  { id: 'plugins', icon: RiPlugLine, label: 'PLUGINS' },
  { id: 'system', icon: RiComputerLine, label: 'SYSTEM' },
  { id: 'settings', icon: RiSettings4Line, label: 'SETTINGS' }
]

interface AgentStatus {
  name: string
  status: 'ACTIVE' | 'IDLE'
  desc: string
}

interface TaskItem {
  id: string
  text: string
  status: 'running' | 'completed' | 'failed'
  agent: string
  timestamp: string
  result?: string
}

interface MemoryItem {
  fact: string
  timestamp: string
}

const AGENT_META: Record<string, { color: string; icon: typeof RiLightbulbLine }> = {
  'Planner Agent': { color: 'from-blue-500 to-cyan-500', icon: RiLightbulbLine },
  'Research Agent': { color: 'from-purple-500 to-pink-500', icon: RiSearchLine },
  'Browser Agent': { color: 'from-green-500 to-emerald-500', icon: RiGlobalLine },
  'Memory Agent': { color: 'from-amber-500 to-orange-500', icon: RiBrainLine },
  'System Agent': { color: 'from-cyan-500 to-blue-500', icon: RiShieldLine }
}

const TASK_ICON_MAP: Record<string, typeof RiSearchLine> = {
  'Planner Agent': RiLightbulbLine,
  'Research Agent': RiSearchLine,
  'Browser Agent': RiGlobalLine,
  'Memory Agent': RiBrainLine,
  'System Agent': HiComputerDesktop
}

const capabilities = [
  { label: 'THINK', icon: RiLightbulbLine, angle: 270 },
  { label: 'EXECUTE', icon: RiPlayCircleLine, angle: 330 },
  { label: 'LEARN', icon: RiBookOpenLine, angle: 30 },
  { label: 'AUTOMATE', icon: RiSettings4Line, angle: 90 },
  { label: 'ANALYZE', icon: RiBarChartBoxLine, angle: 210 },
  { label: 'SEARCH', icon: RiSearchLine, angle: 150 }
]

function CircularGauge({
  value,
  label,
  detail,
  color,
  size = 90
}: {
  value: number
  label: string
  detail?: string
  color: string
  size?: number
}) {
  const radius = (size - 12) / 2
  const circumference = 2 * Math.PI * radius

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-[11px] font-mono tracking-[0.2em] text-zinc-400 font-semibold">{label}</span>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="5" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#grad-${label})`}
            strokeWidth="5"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - (value / 100) * circumference}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
            style={{ filter: `drop-shadow(0 0 12px ${color})` }}
          />
          <defs>
            <linearGradient id={`grad-${label}`}>
              <stop offset="0%" stopColor={color} />
              <stop offset="100%" stopColor={color} stopOpacity="0.3" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-black font-mono text-white leading-none">{value}<span className="text-xs text-zinc-500">%</span></span>
        </div>
      </div>
      {detail && <span className="text-[9px] font-mono text-zinc-500 text-center">{detail}</span>}
    </div>
  )
}

export default function SadiyaDashboard({ onOpenSettings }: { onOpenSettings?: () => void }) {
  const [activeNav, setActiveNav] = useState('console')
  const [time, setTime] = useState(new Date())
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [commandInput, setCommandInput] = useState('')
  const [voiceActive, setVoiceActive] = useState(false)
  const [pulsePhase, setPulsePhase] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Dynamic state from backend
  const [liveTasks, setLiveTasks] = useState<TaskItem[]>([])
  const [liveAgents, setLiveAgents] = useState<AgentStatus[]>([
    { name: 'Planner Agent', status: 'IDLE', desc: 'Waiting for instructions...' },
    { name: 'Research Agent', status: 'IDLE', desc: 'Standing by...' },
    { name: 'Browser Agent', status: 'IDLE', desc: 'Ready to browse...' },
    { name: 'Memory Agent', status: 'IDLE', desc: 'Monitoring context...' },
    { name: 'System Agent', status: 'ACTIVE', desc: 'Monitoring system health...' }
  ])
  const [memoryItems, setMemoryItems] = useState<MemoryItem[]>([])
  const [commandError, setCommandError] = useState<string | null>(null)

  // Voice recognition refs
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null)
  const voiceWantedRef = useRef(false)

  // System stats polling
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date())
      getSystemStatus().then((s) => { if (s) setStats(s) })
    }, 2000)
    getSystemStatus().then((s) => { if (s) setStats(s) })
    return () => clearInterval(timer)
  }, [])

  // Chat history polling
  useEffect(() => {
    const fetchHistory = async () => {
      const history = await getHistory()
      if (Array.isArray(history)) setChatHistory(history.slice(-15))
    }
    fetchHistory()
    const interval = setInterval(fetchHistory, 3000)
    return () => clearInterval(interval)
  }, [])

  // Task & agent polling from backend
  useEffect(() => {
    const fetchState = async () => {
      try {
        const [tasks, agents, memories] = await Promise.all([
          window.electron.ipcRenderer.invoke('get-tasks'),
          window.electron.ipcRenderer.invoke('get-agent-statuses'),
          window.electron.ipcRenderer.invoke('get-memory-items')
        ])
        if (Array.isArray(tasks)) setLiveTasks(tasks)
        if (Array.isArray(agents)) setLiveAgents(agents)
        if (Array.isArray(memories)) setMemoryItems(memories)
      } catch { /* handlers may not be ready yet */ }
    }
    fetchState()
    const interval = setInterval(fetchState, 2000)
    return () => clearInterval(interval)
  }, [])

  // Listen for real-time task/agent updates from backend
  useEffect(() => {
    const ipc = window.electron.ipcRenderer
    const onTaskUpdate = (_e: unknown, data: TaskItem[]) => { if (Array.isArray(data)) setLiveTasks(data) }
    const onAgentUpdate = (_e: unknown, data: AgentStatus[]) => { if (Array.isArray(data)) setLiveAgents(data) }
    const unsubTask = ipc.on('task-update', onTaskUpdate)
    const unsubAgent = ipc.on('agent-update', onAgentUpdate)
    return () => {
      unsubTask()
      unsubAgent()
    }
  }, [])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [chatHistory])

  useEffect(() => {
    const interval = setInterval(() => setPulsePhase((p) => (p + 1) % 360), 40)
    return () => clearInterval(interval)
  }, [])

  const cpuVal = stats ? parseInt(stats.cpu) || 24 : 24
  const ramVal = stats ? parseInt(stats.memory.usedPercentage) || 48 : 48
  const ramTotal = stats ? stats.memory.total : '15.9 GB'
  const ramFree = stats ? stats.memory.free : '7.6 GB'
  const diskVal = 62
  const gpuVal = 21

  // Execute command via smart router
  const executeCommand = useCallback(async (input: string) => {
    if (!input.trim()) return
    setCommandError(null)
    setIsProcessing(true)
    try {
      const result = await window.electron.ipcRenderer.invoke('execute-command', input.trim())
      if (result && !result.success) {
        setCommandError(result.error || 'Unknown error from AI core')
      }
    } catch (err) {
      setCommandError(err instanceof Error ? err.message : 'Neural link disrupted. Retry your command.')
    } finally {
      setIsProcessing(false)
    }
  }, [])

  const handleCommand = useCallback(async () => {
    if (!commandInput.trim() || isProcessing) return
    const cmd = commandInput.trim()
    setCommandInput('')
    await executeCommand(cmd)
  }, [commandInput, isProcessing, executeCommand])

  // Quick action handlers — each triggers a real command
  const handleQuickAction = useCallback((action: string) => {
    switch (action) {
      case 'Open Terminal':
        executeCommand('open terminal')
        break
      case 'System Info':
        executeCommand('system info')
        break
      case 'Search Files':
        setCommandInput('find files ')
        break
      case 'Take Screenshot':
        executeCommand('take screenshot')
        break
      case 'New Task':
        setCommandInput('')
        break
    }
  }, [executeCommand])

  // Quick action pills — real commands
  const handlePill = useCallback((pill: string) => {
    executeCommand(pill)
  }, [executeCommand])

  // Sidebar nav actions — focus on section or trigger command
  const handleNavClick = useCallback((id: string) => {
    if (id === 'settings' && onOpenSettings) {
      onOpenSettings()
    } else if (id === 'system') {
      executeCommand('system info')
      setActiveNav(id)
    } else if (id === 'memory') {
      executeCommand('recall memory')
      setActiveNav(id)
    } else if (id === 'files') {
      executeCommand('list files')
      setActiveNav(id)
    } else if (id === 'browser') {
      executeCommand('open chrome')
      setActiveNav(id)
    } else {
      setActiveNav(id)
    }
  }, [executeCommand, onOpenSettings])

  // Voice: Web Speech API
  const startRecognition = useCallback(() => {
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognitionCtor) {
      setCommandError('Speech recognition not supported. Use Chrome or Edge.')
      voiceWantedRef.current = false
      setVoiceActive(false)
      return
    }

    const recognition = new SpeechRecognitionCtor()
    recognition.continuous = true
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const last = event.results[event.results.length - 1]
      if (last.isFinal) {
        const transcript = last[0].transcript.trim()
        if (transcript) {
          setCommandInput(transcript)
          executeCommand(transcript)
        }
      }
    }

    recognition.onerror = (event: Event & { error?: string }) => {
      const err = event.error || 'unknown'
      if (err === 'aborted' || err === 'no-speech') return
      setCommandError(`Voice error: ${err}. Check microphone access.`)
      voiceWantedRef.current = false
      setVoiceActive(false)
      recognitionRef.current = null
    }

    recognition.onend = () => {
      if (voiceWantedRef.current) {
        try { recognition.start() } catch { /* already started */ }
      } else {
        setVoiceActive(false)
        recognitionRef.current = null
      }
    }

    recognition.start()
    recognitionRef.current = recognition
    setVoiceActive(true)
  }, [executeCommand])

  const toggleVoice = useCallback(() => {
    if (voiceWantedRef.current) {
      voiceWantedRef.current = false
      window.speechSynthesis?.cancel()
      if (recognitionRef.current) {
        recognitionRef.current.stop()
        recognitionRef.current = null
      }
      setVoiceActive(false)
      return
    }
    voiceWantedRef.current = true
    setVoiceActive(true)
    startRecognition()
  }, [startRecognition])

  // Text-to-speech for AI responses
  useEffect(() => {
    const ipc = window.electron.ipcRenderer
    const onGeminiResponse = (_e: unknown, text: string) => {
      if (voiceWantedRef.current && text && window.speechSynthesis) {
        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(text.slice(0, 500))
        utterance.rate = 1.0
        utterance.pitch = 1.0
        utterance.lang = 'en-US'
        synthRef.current = utterance
        window.speechSynthesis.speak(utterance)
      }
    }
    const unsub = ipc.on('gemini-response', onGeminiResponse)
    return () => { unsub() }
  }, [])

  // Console messages from real chat history
  const consoleMessages = chatHistory.length > 0
    ? chatHistory.map((msg) => ({
        sender: msg.role === 'user' ? 'YOU' : 'SADIYA',
        text: msg.parts[0]?.text || '',
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        type: msg.role === 'user' ? 'user' : 'ai'
      }))
    : [
        { sender: 'SADIYA', text: 'Hello! I\'m your AI OS companion. Type a command or ask me anything. Try: "open chrome", "search files test", "system info", "research AI trends", or just chat.', time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }), type: 'ai' }
      ]

  const greeting = (() => {
    const h = time.getHours()
    if (h < 12) return 'Good Morning'
    if (h < 17) return 'Good Afternoon'
    return 'Good Evening'
  })()

  const dateStr = time.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="flex-1 flex overflow-hidden bg-[#020a14] relative">
      {/* Ambient background effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-gradient-to-b from-cyan-500/[0.04] via-purple-500/[0.02] to-transparent rounded-full blur-3xl"
          style={{ animation: 'pulse 8s ease-in-out infinite' }}
        />
        <div className="absolute bottom-0 left-1/4 w-[800px] h-[500px] bg-gradient-to-t from-blue-600/[0.03] to-transparent rounded-full blur-3xl" />
        <div
          className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-gradient-to-l from-purple-600/[0.03] to-transparent rounded-full blur-3xl"
          style={{ animation: 'pulse 12s ease-in-out infinite' }}
        />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: 'linear-gradient(rgba(6,182,212,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.3) 1px, transparent 1px)',
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      {/* ==================== LEFT SIDEBAR ==================== */}
      <div className="w-60 flex flex-col border-r border-cyan-500/10 bg-[#040d1a]/90 backdrop-blur-xl z-10">
        {/* Logo Header */}
        <div className="p-5 flex items-center gap-4 border-b border-cyan-500/10">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.4)] relative">
            <div
              className="absolute inset-0 rounded-full border-2 border-cyan-400/30"
              style={{ animation: 'spin 8s linear infinite' }}
            />
            <span className="text-white font-black text-base">S</span>
          </div>
          <div className="flex flex-col">
            <span className="font-black text-lg tracking-[0.2em] text-white">SADIYA</span>
            <span className="text-[10px] text-cyan-500/60 tracking-[0.3em] font-mono">AI OS LAYER</span>
          </div>
        </div>

        {/* Profile */}
        <div className="px-4 py-4 flex items-center gap-3 border-b border-cyan-500/10">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/30 to-purple-500/30 border border-cyan-500/20 flex items-center justify-center">
            <RiRobot2Line className="text-cyan-400 text-lg" />
          </div>
          <div className="flex flex-col flex-1">
            <span className="text-sm font-bold text-white tracking-wide">SADIYA</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.6)]" />
              <span className="text-[10px] text-green-400 font-mono font-semibold">ONLINE</span>
            </div>
          </div>
          <RiArrowRightSLine className="text-zinc-600 text-xl" />
        </div>

        {/* Navigation — BIGGER ICONS */}
        <nav className="flex-1 py-3 px-3 space-y-1.5 overflow-y-auto scrollbar-thin">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-[12px] font-bold tracking-[0.15em] transition-all duration-300 cursor-pointer group ${
                activeNav === item.id
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-400 border border-cyan-500/25 shadow-[0_0_25px_rgba(6,182,212,0.12)]'
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04] border border-transparent'
              }`}
            >
              <item.icon className={`text-2xl transition-all duration-300 ${activeNav === item.id ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]' : 'group-hover:text-zinc-300'}`} />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Voice Section — Compact Premium */}
        <div className="px-3 pb-3 border-t border-cyan-500/10 pt-3">
          <div className={`${glassPanel} p-3 flex items-center gap-3 relative overflow-hidden`}>
            {/* Animated background glow when active */}
            {voiceActive && (
              <div className="absolute inset-0 pointer-events-none">
                <div
                  className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-purple-500/5 to-cyan-500/5"
                  style={{ animation: 'pulse 2s ease-in-out infinite' }}
                />
              </div>
            )}

            {/* Mic Button */}
            <button
              onClick={toggleVoice}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 cursor-pointer relative flex-shrink-0 ${
                voiceActive
                  ? 'bg-gradient-to-br from-cyan-500 to-blue-600 shadow-[0_0_40px_rgba(6,182,212,0.5)]'
                  : 'bg-zinc-800/80 border border-zinc-700/50 hover:border-cyan-500/30'
              }`}
            >
              {voiceActive && (
                <>
                  <div className="absolute inset-0 rounded-full border-2 border-cyan-400/30" style={{ animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite' }} />
                  <div className="absolute -inset-1 rounded-full border border-cyan-400/10" style={{ animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite 0.5s' }} />
                </>
              )}
              <RiMicLine className={`text-2xl relative z-10 ${voiceActive ? 'text-white' : 'text-zinc-400'}`} />
            </button>

            {/* Waveform + Label */}
            <div className="flex-1 flex flex-col gap-1.5 min-w-0 relative z-10">
              <span className={`text-[10px] font-bold tracking-[0.25em] ${voiceActive ? 'text-cyan-400' : 'text-zinc-600'}`}>
                {voiceActive ? 'VOICE ACTIVE' : 'VOICE STANDBY'}
              </span>
              <div className="flex items-center gap-[2px] h-6">
                {Array.from({ length: 40 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-[2px] rounded-full transition-all duration-75 ${voiceActive ? 'bg-gradient-to-t from-cyan-500/40 to-cyan-300/80' : 'bg-zinc-700/30'}`}
                    style={{
                      height: voiceActive
                        ? `${3 + Math.sin((pulsePhase + i * 9) * Math.PI / 180) * 10 + Math.random() * 4}px`
                        : '2px'
                    }}
                  />
                ))}
              </div>
              <span className="text-[8px] text-zinc-600 font-mono tracking-wider">
                {voiceActive ? 'Listening...' : 'Tap mic to speak'}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Stats Bar */}
        <div className="px-4 pb-3 flex justify-between text-[9px] font-mono">
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-zinc-600 tracking-wider">TEMP</span>
            <span className="text-cyan-400/80 font-bold">{stats?.temperature ?? 48}°C</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-zinc-600 tracking-wider">NET</span>
            <span className="text-cyan-400/80 font-bold">120 Mbps</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-zinc-600 tracking-wider">BATTERY</span>
            <span className="text-green-400 font-bold">100%</span>
          </div>
        </div>
      </div>

      {/* ==================== MAIN CONTENT ==================== */}
      <div className="flex-1 flex flex-col min-w-0 z-10">
        {/* Top Bar */}
        <div className="h-12 flex items-center justify-between px-6 border-b border-cyan-500/10 bg-[#040d1a]/60 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-48 rounded-full bg-gradient-to-r from-cyan-500/60 via-purple-500/40 to-transparent" />
          </div>
          <span className="text-[11px] font-mono tracking-[0.3em] text-cyan-500/40 font-bold">SADIYA AI OS LAYER</span>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <RiEqualizer2Line className="text-zinc-500 text-base cursor-pointer hover:text-cyan-400 transition-colors" />
            </div>
            <RiSettings4Line
              className="text-zinc-500 text-base cursor-pointer hover:text-cyan-400 transition-colors"
              onClick={onOpenSettings}
            />
            <div className="flex items-center gap-2 text-[10px] font-mono">
              <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]" />
              <span className="text-green-400 font-semibold">Online</span>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-white font-mono leading-none">
                {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </div>
              <div className="text-[9px] text-zinc-500 font-mono">{dateStr}</div>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="flex-1 flex overflow-hidden p-4 gap-4">
          {/* ===== CENTER COLUMN ===== */}
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            {/* Greeting Card — CENTER ALIGNED, MORE FUTURISTIC */}
            <div className={`${glassPanel} p-7 relative overflow-hidden`}>
              {/* Top accent line */}
              <div className="h-[2px] w-full bg-gradient-to-r from-cyan-500/60 via-purple-500/40 to-cyan-500/20 rounded-full mb-6" />

              {/* Centered greeting */}
              <div className="text-center">
                <h1 className="text-4xl font-black text-white tracking-tight">
                  {greeting}, I&apos;m{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 drop-shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                    SADIYA
                  </span>
                </h1>
                <p className="text-zinc-400 text-sm mt-3 font-mono tracking-wider">
                  Your AI OS Companion. Ready to assist, automate and execute.
                </p>
              </div>

              {/* Quick action pills */}
              <div className="flex gap-3 mt-6 flex-wrap justify-center">
                {[
                  { label: 'System Status', cmd: 'system info' },
                  { label: 'Research AI Trends', cmd: 'research latest AI trends 2025' },
                  { label: 'My Memories', cmd: 'recall memory' },
                  { label: 'Search Files', cmd: 'find files documents' }
                ].map((q) => (
                  <button
                    key={q.label}
                    onClick={() => handlePill(q.cmd)}
                    className="px-5 py-2.5 text-[11px] font-semibold tracking-wider bg-white/[0.04] border border-white/10 rounded-xl text-zinc-400 hover:text-cyan-400 hover:border-cyan-500/30 hover:bg-cyan-500/[0.08] hover:shadow-[0_0_20px_rgba(6,182,212,0.1)] transition-all duration-300 cursor-pointer"
                  >
                    {q.label}
                  </button>
                ))}
              </div>

              {/* Bottom accent */}
              <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
            </div>

            {/* AI Avatar + Capabilities Ring */}
            <div className={`${glassPanel} flex-1 flex items-center justify-center relative overflow-hidden min-h-0`}>
              {/* Orbit rings */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-80 h-80 rounded-full border border-cyan-500/10" style={{ animation: 'spin 25s linear infinite' }} />
                <div className="absolute w-[420px] h-[420px] rounded-full border border-cyan-500/8" style={{ animation: 'spin 40s linear infinite reverse' }} />
                <div className="absolute w-[520px] h-[520px] rounded-full border border-purple-500/5" style={{ animation: 'spin 60s linear infinite' }} />
              </div>

              {/* Avatar */}
              <div className="relative z-10 flex flex-col items-center">
                <div className="relative">
                  <div className="absolute -inset-5 rounded-full bg-gradient-to-b from-cyan-500/10 to-purple-500/5 blur-xl" />
                  <div className="absolute -inset-2 rounded-full border border-cyan-500/20" style={{ animation: 'pulse 3s ease-in-out infinite' }} />
                  <div className="w-52 h-52 rounded-full overflow-hidden border-2 border-cyan-500/30 shadow-[0_0_80px_rgba(6,182,212,0.2),0_0_160px_rgba(139,92,246,0.08)] relative">
                    <img src={sadiyaAvatar} alt="SADIYA AI" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/10 to-transparent" />
                  </div>
                </div>

                {/* Capabilities around avatar */}
                {capabilities.map((cap) => {
                  const rad = (cap.angle * Math.PI) / 180
                  const orbRadius = 170
                  const x = Math.cos(rad) * orbRadius
                  const y = Math.sin(rad) * orbRadius

                  return (
                    <div
                      key={cap.label}
                      className="absolute flex items-center gap-2 transition-all"
                      style={{
                        transform: `translate(${x}px, ${y}px)`,
                        top: '50%',
                        left: '50%',
                        marginTop: '-14px',
                        marginLeft: '-45px'
                      }}
                    >
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                        <cap.icon className="text-cyan-400 text-base" />
                      </div>
                      <span className="text-[10px] font-bold tracking-[0.15em] text-zinc-400">{cap.label}</span>
                    </div>
                  )
                })}

                {/* Core Active Label */}
                <div className="mt-6 flex items-center gap-2">
                  <div className="w-8 h-[1px] bg-gradient-to-r from-transparent to-cyan-500/40" />
                  <span className="text-[9px] font-mono tracking-[0.3em] text-cyan-500/60">SADIYA CORE ACTIVE</span>
                  <div className="w-8 h-[1px] bg-gradient-to-l from-transparent to-cyan-500/40" />
                </div>
              </div>
            </div>

            {/* Bottom Panels Row — TALLER Console + Task Timeline */}
            <div className="flex gap-4 h-72">
              {/* Console — TALLER */}
              <div className={`${glassPanel} flex-1 flex flex-col min-w-0 relative ${glowBorder}`}>
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-cyan-500/10">
                  <div className="flex items-center gap-2.5">
                    <RiTerminalBoxLine className="text-cyan-400 text-lg" />
                    <span className="text-[12px] font-bold tracking-[0.2em] text-white">CONSOLE</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-cyan-500/50 font-mono">SADIYA CORE ACTIVE</span>
                    <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.6)]" />
                  </div>
                </div>
                <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-3 space-y-4 scrollbar-thin">
                  {consoleMessages.map((msg, i) => (
                    <div key={i} className="flex items-start gap-3 group">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5 ${
                          msg.type === 'ai'
                            ? 'bg-gradient-to-br from-cyan-500/30 to-blue-500/20 text-cyan-400 border border-cyan-500/20'
                            : msg.type === 'user'
                              ? 'bg-gradient-to-br from-purple-500/30 to-pink-500/20 text-purple-400 border border-purple-500/20'
                              : 'bg-gradient-to-br from-green-500/30 to-emerald-500/20 text-green-400 border border-green-500/20'
                        }`}
                      >
                        {msg.type === 'ai' ? 'S' : msg.type === 'user' ? 'Y' : '\u2713'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[11px] font-bold tracking-wider ${
                              msg.type === 'ai'
                                ? 'text-cyan-400'
                                : msg.type === 'user'
                                  ? 'text-purple-400'
                                  : 'text-green-400'
                            }`}
                          >
                            {msg.sender}
                          </span>
                        </div>
                        <p className="text-[12px] text-zinc-300 mt-1 leading-relaxed">{msg.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Task Timeline — TALLER */}
              <div className={`${glassPanel} flex-1 flex flex-col min-w-0 relative ${glowBorder}`}>
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-cyan-500/10">
                  <div className="flex items-center gap-2.5">
                    <RiTimeLine className="text-cyan-400 text-lg" />
                    <span className="text-[12px] font-bold tracking-[0.2em] text-white">TASK TIMELINE</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                    <span className="text-[10px] text-red-400 font-mono font-semibold">Live</span>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3 scrollbar-thin">
                  {liveTasks.length > 0 ? liveTasks.slice(0, 10).map((task) => {
                    const TaskIcon = TASK_ICON_MAP[task.agent] || RiTaskLine
                    const taskTime = new Date(task.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
                    return (
                      <div key={task.id} className="flex items-center gap-3 group">
                        <span className="text-[10px] text-zinc-600 font-mono w-10 flex-shrink-0">{taskTime}</span>
                        <div className={`w-9 h-9 rounded-xl bg-white/[0.05] border flex items-center justify-center flex-shrink-0 transition-colors ${
                          task.status === 'running' ? 'border-cyan-500/30' : 'border-white/5 group-hover:border-cyan-500/20'
                        }`}>
                          {task.status === 'running'
                            ? <RiLoader4Line className="text-cyan-400 text-base animate-spin" />
                            : <TaskIcon className={`text-base transition-colors ${task.status === 'failed' ? 'text-red-400' : 'text-zinc-400 group-hover:text-cyan-400'}`} />
                          }
                        </div>
                        <span className="text-[12px] text-zinc-300 flex-1 truncate">{task.text}</span>
                        {task.status === 'completed' ? (
                          <div className="flex items-center gap-1.5 bg-green-500/10 px-2.5 py-1 rounded-full border border-green-500/15">
                            <RiCheckDoubleLine className="text-green-400 text-sm" />
                            <span className="text-[9px] text-green-400 font-mono font-semibold">Done</span>
                          </div>
                        ) : task.status === 'failed' ? (
                          <div className="flex items-center gap-1.5 bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/15">
                            <RiCloseCircleLine className="text-red-400 text-sm" />
                            <span className="text-[9px] text-red-400 font-mono font-semibold">Failed</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-cyan-400 font-mono font-bold bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/15 animate-pulse">
                            Running
                          </span>
                        )}
                      </div>
                    )
                  }) : (
                    <div className="flex items-center justify-center h-full text-zinc-600 text-[11px] font-mono">
                      No tasks yet. Type a command to get started.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ===== RIGHT COLUMN — WIDER ===== */}
          <div className="w-96 flex flex-col gap-4 flex-shrink-0">
            {/* System Overview — BIGGER */}
            <div className={`${glassPanel} p-6 relative ${glowBorder}`}>
              <div className="flex items-center justify-between mb-5">
                <span className="text-[12px] font-bold tracking-[0.2em] text-white">SYSTEM OVERVIEW</span>
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center cursor-pointer hover:bg-cyan-500/20 transition-colors">
                  <RiCpuLine className="text-cyan-400 text-base" />
                </div>
              </div>
              <div className="flex justify-between gap-3">
                <CircularGauge value={cpuVal} label="CPU" detail="3.2 GHz" color="#06b6d4" size={80} />
                <CircularGauge value={ramVal} label="RAM" detail={`${ramFree} / ${ramTotal}`} color="#a855f7" size={80} />
                <CircularGauge value={diskVal} label="DISK" detail="233 / 476 GB" color="#22c55e" size={80} />
                <CircularGauge value={gpuVal} label="GPU" detail="NVIDIA RTX" color="#f59e0b" size={80} />
              </div>
              <div className="mt-5 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                <span>OS: {stats?.os?.type ?? 'Windows 11'}</span>
                <span>Uptime: {stats?.os?.uptime ?? '3h 42m'}</span>
                <span>
                  Status: <span className="text-green-400 font-bold">Optimal</span>
                </span>
              </div>
            </div>

            {/* Active Agents — BIGGER */}
            <div className={`${glassPanel} p-6 relative ${glowBorder}`}>
              <div className="flex items-center justify-between mb-5">
                <span className="text-[12px] font-bold tracking-[0.2em] text-white">ACTIVE AGENTS</span>
                <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                  <span className="text-[11px] font-bold text-cyan-400">{liveAgents.filter((a) => a.status === 'ACTIVE').length}</span>
                </div>
              </div>
              <div className="space-y-3.5">
                {liveAgents.map((agent, i) => {
                  const meta = AGENT_META[agent.name] || { color: 'from-gray-500 to-gray-600', icon: RiRobot2Line }
                  const AgentIcon = meta.icon
                  return (
                    <div key={i} className="flex items-center gap-3.5 group">
                      <div
                        className={`w-11 h-11 rounded-xl bg-gradient-to-br ${meta.color} flex items-center justify-center shadow-lg flex-shrink-0 opacity-90 group-hover:opacity-100 transition-opacity`}
                      >
                        <AgentIcon className="text-white text-lg" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[12px] font-bold text-white block">{agent.name}</span>
                        <span className="text-[10px] text-zinc-500 block truncate">{agent.desc}</span>
                      </div>
                      <span
                        className={`text-[9px] font-bold tracking-wider px-3 py-1.5 rounded-full ${
                          agent.status === 'ACTIVE'
                            ? 'bg-green-500/15 text-green-400 border border-green-500/20 shadow-[0_0_10px_rgba(74,222,128,0.1)]'
                            : 'bg-zinc-700/30 text-zinc-500 border border-zinc-600/20'
                        }`}
                      >
                        {agent.status}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Memory Snapshot — BIGGER */}
            <div className={`${glassPanel} p-6 flex-1 relative ${glowBorder}`}>
              <div className="flex items-center justify-between mb-5">
                <span className="text-[12px] font-bold tracking-[0.2em] text-white">MEMORY SNAPSHOT</span>
                <span className="text-[10px] text-cyan-400 font-mono cursor-pointer hover:text-cyan-300 transition-colors">
                  View All
                </span>
              </div>
              <div className="space-y-4">
                {memoryItems.length > 0 ? memoryItems.map((item, i) => {
                  const daysDiff = Math.floor((Date.now() - new Date(item.timestamp).getTime()) / 86400000)
                  const timeLabel = daysDiff === 0 ? 'Today' : daysDiff === 1 ? 'Yesterday' : `${daysDiff}d ago`
                  const colors = ['text-purple-400', 'text-cyan-400', 'text-blue-400', 'text-green-400', 'text-amber-400']
                  return (
                    <div key={i} className="flex items-center gap-3.5 group">
                      <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/5 flex items-center justify-center flex-shrink-0 group-hover:border-cyan-500/20 transition-colors">
                        <RiBrainLine className={`text-base ${colors[i % colors.length]}`} />
                      </div>
                      <span className="text-[12px] text-zinc-300 flex-1 truncate">{item.fact}</span>
                      <span className="text-[9px] text-zinc-600 font-mono flex-shrink-0">{timeLabel}</span>
                    </div>
                  )
                }) : (
                  <div className="text-zinc-600 text-[11px] font-mono text-center py-4">
                    No memories stored. Try: &quot;remember I like dark mode&quot;
                  </div>
                )}
              </div>

              {/* SADIYA Status */}
              <div className="mt-6 pt-4 border-t border-cyan-500/10">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold tracking-[0.15em] text-white">SADIYA STATUS</span>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]" />
                    <span className="text-[10px] text-green-400 font-mono font-bold">All Systems Operational</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===== COMMAND BAR ===== */}
        <div className="px-4 pb-4">
          {/* Cinematic Error Display */}
          {commandError && (
            <div className="mb-2 px-5 py-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
              <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-red-400 text-sm font-bold">!</span>
              </div>
              <p className="text-[12px] text-red-300 font-mono flex-1">{commandError.length > 150 ? commandError.slice(0, 150) + '…' : commandError}</p>
              <button
                onClick={() => setCommandError(null)}
                className="text-red-400/60 hover:text-red-300 text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>
          )}
          <div className={`${glassPanel} flex items-center gap-3 px-5 py-3.5`}>
            <input
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCommand()}
              placeholder={isProcessing ? 'Processing...' : 'Type a command or ask anything... (try: open chrome, search AI news, system info)'}
              className="flex-1 bg-transparent text-sm text-white placeholder-zinc-600 outline-none font-mono"
              disabled={isProcessing}
            />
            <button
              onClick={handleCommand}
              disabled={isProcessing}
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                isProcessing
                  ? 'bg-zinc-700 shadow-none'
                  : 'bg-gradient-to-br from-cyan-500 to-blue-600 shadow-[0_0_25px_rgba(6,182,212,0.3)] hover:shadow-[0_0_35px_rgba(6,182,212,0.5)]'
              }`}
            >
              {isProcessing
                ? <RiLoader4Line className="text-zinc-400 text-lg animate-spin" />
                : <RiSendPlane2Line className="text-white text-lg" />
              }
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-5 mt-2.5 px-1 justify-center">
            {[
              { icon: RiTerminalBoxLine, label: 'Open Terminal' },
              { icon: HiComputerDesktop, label: 'System Info' },
              { icon: RiSearchLine, label: 'Search Files' },
              { icon: RiCameraLine, label: 'Take Screenshot' },
              { icon: RiAddLine, label: 'New Task' }
            ].map((action) => (
              <button
                key={action.label}
                onClick={() => handleQuickAction(action.label)}
                className="flex items-center gap-2 text-[10px] text-zinc-600 hover:text-cyan-400 transition-all duration-300 cursor-pointer font-mono tracking-wider group"
              >
                <action.icon className="text-sm group-hover:drop-shadow-[0_0_6px_rgba(6,182,212,0.4)]" />
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
