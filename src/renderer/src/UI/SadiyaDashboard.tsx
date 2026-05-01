import { useState, useEffect, useRef } from 'react'
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
  RiSendPlane2Line,
  RiCpuLine,
  RiTimeLine,
  RiCheckDoubleLine,
  RiArrowRightSLine,
  RiCameraLine,
  RiAddLine,
  RiEqualizer2Line
} from 'react-icons/ri'
import { HiComputerDesktop } from 'react-icons/hi2'
import sadiyaAvatar from '../assets/sadiya-avatar.png'
import { getSystemStatus, SystemStats } from '../services/system-info'
import { getHistory, ChatMessage } from '../services/iris-ai-brain'

const glassPanel = 'bg-[#0b1929]/70 backdrop-blur-2xl border border-cyan-500/10 rounded-xl shadow-[0_0_40px_rgba(6,182,212,0.04)]'

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

const agents = [
  { name: 'Planner Agent', desc: 'Breaking down your goal...', status: 'ACTIVE', color: 'from-blue-500 to-cyan-500' },
  { name: 'Research Agent', desc: 'Collecting latest AI news...', status: 'ACTIVE', color: 'from-purple-500 to-pink-500' },
  { name: 'Browser Agent', desc: 'Navigating and extracting...', status: 'ACTIVE', color: 'from-green-500 to-emerald-500' },
  { name: 'Memory Agent', desc: 'Storing important context...', status: 'IDLE', color: 'from-amber-500 to-orange-500' },
  { name: 'System Agent', desc: 'Monitoring system health...', status: 'ACTIVE', color: 'from-cyan-500 to-blue-500' }
]

const memoryItems = [
  { icon: '🧠', text: 'You prefer responses in Hinglish', time: 'Today' },
  { icon: '💻', text: 'Working on SADIYA AI OS Layer', time: 'Today' },
  { icon: '👤', text: 'You are a developer and builder', time: 'Yesterday' },
  { icon: '⚡', text: 'Favorite tools: VS Code, Terminal, Chrome', time: 'Yesterday' },
  { icon: '🎯', text: 'Project: Build next-gen AI OS', time: '2 days ago' }
]

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
  const radius = (size - 10) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-[10px] font-mono tracking-wider text-zinc-400">{label}</span>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="4" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#grad-${label})`}
            strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
            style={{ filter: `drop-shadow(0 0 8px ${color})` }}
          />
          <defs>
            <linearGradient id={`grad-${label}`}>
              <stop offset="0%" stopColor={color} />
              <stop offset="100%" stopColor={color} stopOpacity="0.4" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold font-mono text-white">{value}%</span>
        </div>
      </div>
      {detail && <span className="text-[9px] font-mono text-zinc-500">{detail}</span>}
    </div>
  )
}

export default function SadiyaDashboard({ onOpenSettings }: { onOpenSettings?: () => void }) {
  const [activeNav, setActiveNav] = useState('console')
  const [time, setTime] = useState(new Date())
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [commandInput, setCommandInput] = useState('')
  const [voiceActive, setVoiceActive] = useState(true)
  const [pulsePhase, setPulsePhase] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date())
      getSystemStatus().then((s) => { if (s) setStats(s) })
    }, 2000)
    getSystemStatus().then((s) => { if (s) setStats(s) })
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const fetchHistory = async () => {
      const history = await getHistory()
      if (Array.isArray(history)) setChatHistory(history.slice(-10))
    }
    fetchHistory()
    const interval = setInterval(fetchHistory, 3000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [chatHistory])

  useEffect(() => {
    const interval = setInterval(() => setPulsePhase((p) => (p + 1) % 360), 50)
    return () => clearInterval(interval)
  }, [])

  const cpuVal = stats ? parseInt(stats.cpu) || 24 : 24
  const ramVal = stats ? parseInt(stats.memory.usedPercentage) || 48 : 48
  const ramTotal = stats ? stats.memory.total : '15.9 GB'
  const ramFree = stats ? stats.memory.free : '7.6 GB'
  const diskVal = 62
  const gpuVal = 21

  const handleCommand = () => {
    if (!commandInput.trim()) return
    setCommandInput('')
  }

  const consoleMessages = [
    { sender: 'SADIYA', text: 'Hello! How can I assist you today?', time: '11:45 PM', type: 'ai' },
    { sender: 'YOU', text: 'Open Chrome and search latest AI news', time: '11:45 PM', type: 'user' },
    { sender: 'SADIYA', text: 'Opening Chrome and searching for latest AI news...', time: '11:46 PM', type: 'ai' },
    { sender: 'TASK COMPLETED', text: 'Found 10+ recent articles. Would you like a summary?', time: '11:47 PM', type: 'task' }
  ]

  const tasks = [
    { time: '11:47', icon: RiSearchLine, text: 'Research latest AI news', progress: 80 },
    { time: '11:46', icon: RiGlobalLine, text: 'Open Chrome Browser', done: true },
    { time: '11:45', icon: HiComputerDesktop, text: 'System Information', done: true },
    { time: '11:44', icon: RiSearchLine, text: 'Search PDF files in Home', done: true },
    { time: '11:43', icon: RiBrainLine, text: 'Memory Recall', done: true }
  ]

  const greeting = (() => {
    const h = time.getHours()
    if (h < 12) return 'Good Morning'
    if (h < 17) return 'Good Afternoon'
    return 'Good Evening'
  })()

  const dateStr = time.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="flex-1 flex overflow-hidden bg-[#030912] relative">
      {/* Ambient background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-b from-cyan-500/[0.03] via-purple-500/[0.02] to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-[700px] h-[400px] bg-gradient-to-t from-blue-500/[0.03] to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-0 w-[400px] h-[400px] bg-gradient-to-l from-purple-500/[0.02] to-transparent rounded-full blur-3xl" />
      </div>

      {/* ==================== LEFT SIDEBAR ==================== */}
      <div className="w-56 flex flex-col border-r border-cyan-500/10 bg-[#040d1a]/80 backdrop-blur-xl z-10">
        {/* Logo Header */}
        <div className="p-5 flex items-center gap-3.5 border-b border-cyan-500/10">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center shadow-[0_0_25px_rgba(6,182,212,0.35)] relative">
            <div className="absolute inset-0 rounded-full border-2 border-cyan-400/30" style={{ animation: 'spin 8s linear infinite' }} />
            <span className="text-white font-black text-sm">S</span>
          </div>
          <div className="flex flex-col">
            <span className="font-black text-base tracking-[0.15em] text-white">SADIYA</span>
            <span className="text-[9px] text-zinc-500 tracking-wider">AI OS LAYER</span>
          </div>
        </div>

        {/* Profile */}
        <div className="px-4 py-3 flex items-center gap-3 border-b border-cyan-500/10">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500/30 to-purple-500/30 border border-cyan-500/20 flex items-center justify-center">
            <RiRobot2Line className="text-cyan-400 text-sm" />
          </div>
          <div className="flex flex-col flex-1">
            <span className="text-sm font-bold text-white tracking-wide">SADIYA</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]" />
              <span className="text-[9px] text-green-400 font-mono">ONLINE</span>
            </div>
          </div>
          <RiArrowRightSLine className="text-zinc-600 text-lg" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-3 space-y-1 overflow-y-auto scrollbar-thin">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'settings' && onOpenSettings) {
                  onOpenSettings()
                } else {
                  setActiveNav(item.id)
                }
              }}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-lg text-[11px] font-semibold tracking-[0.15em] transition-all duration-200 cursor-pointer ${
                activeNav === item.id
                  ? 'bg-gradient-to-r from-cyan-500/15 to-blue-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.1)]'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]'
              }`}
            >
              <item.icon className={`text-lg ${activeNav === item.id ? 'text-cyan-400' : ''}`} />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Voice Section - Large */}
        <div className="px-3 pb-2 border-t border-cyan-500/10 pt-3">
          <div className={`${glassPanel} p-4 flex flex-col items-center gap-2`}>
            <span className={`text-[10px] font-bold tracking-[0.25em] ${voiceActive ? 'text-cyan-400' : 'text-zinc-600'}`}>
              {voiceActive ? 'VOICE ACTIVE' : 'VOICE STANDBY'}
            </span>

            {/* Waveform - wider */}
            <div className="flex items-center gap-[2px] h-8 w-full justify-center">
              {Array.from({ length: 30 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-[2px] rounded-full transition-all duration-100 ${voiceActive ? 'bg-cyan-400/50' : 'bg-zinc-700/30'}`}
                  style={{
                    height: voiceActive
                      ? `${4 + Math.sin((pulsePhase + i * 12) * Math.PI / 180) * 12 + Math.random() * 6}px`
                      : '3px'
                  }}
                />
              ))}
            </div>

            <span className="text-[8px] text-zinc-500 font-mono tracking-wider">
              {voiceActive ? 'Listening...' : 'Tap to speak'}
            </span>

            {/* Big Mic Button */}
            <button
              onClick={() => setVoiceActive(!voiceActive)}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all cursor-pointer relative ${
                voiceActive
                  ? 'bg-gradient-to-br from-cyan-500 to-blue-600 shadow-[0_0_40px_rgba(6,182,212,0.5)]'
                  : 'bg-zinc-800/80 border border-zinc-700/50 hover:border-cyan-500/30'
              }`}
            >
              {voiceActive && (
                <div className="absolute inset-0 rounded-full border-2 border-cyan-400/20" style={{ animation: 'pulse 2s ease-in-out infinite' }} />
              )}
              <RiMicLine className={`text-2xl ${voiceActive ? 'text-white' : 'text-zinc-400'}`} />
            </button>
          </div>
        </div>

        {/* Bottom Stats Bar */}
        <div className="px-4 pb-3 flex justify-between text-[9px] font-mono">
          <div className="flex flex-col items-center">
            <span className="text-zinc-600">TEMP</span>
            <span className="text-cyan-400/80 font-bold">{stats?.temperature ?? 48}°C</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-zinc-600">NET</span>
            <span className="text-cyan-400/80 font-bold">120 Mbps</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-zinc-600">BATTERY</span>
            <span className="text-green-400 font-bold">100%</span>
          </div>
        </div>
      </div>

      {/* ==================== MAIN CONTENT ==================== */}
      <div className="flex-1 flex flex-col min-w-0 z-10">
        {/* Top Bar */}
        <div className="h-11 flex items-center justify-between px-5 border-b border-cyan-500/10 bg-[#040d1a]/60 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-40 rounded-full bg-gradient-to-r from-cyan-500/60 via-purple-500/40 to-transparent" />
          </div>
          <span className="text-[11px] font-mono tracking-[0.3em] text-cyan-500/50 font-bold">SADIYA AI OS LAYER</span>
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-1.5">
              <RiEqualizer2Line className="text-zinc-500 text-sm" />
            </div>
            <RiSettings4Line className="text-zinc-500 text-sm cursor-pointer hover:text-cyan-400 transition-colors" />
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
            {/* Greeting Card */}
            <div className={`${glassPanel} p-6`}>
              <div className="h-1 w-full bg-gradient-to-r from-cyan-500/50 via-purple-500/30 to-transparent rounded-full mb-5" />
              <h1 className="text-3xl font-bold text-white">
                {greeting}, I'm{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500">SADIYA</span>
              </h1>
              <p className="text-zinc-400 text-sm mt-2">Your AI OS Companion. Ready to assist, automate and execute.</p>
              <div className="flex gap-3 mt-5 flex-wrap">
                {["What's on my schedule?", "Analyze this for me", "Open research mode", "System status"].map((q) => (
                  <button
                    key={q}
                    className="px-4 py-2 text-[11px] font-medium tracking-wider bg-white/[0.04] border border-white/10 rounded-lg text-zinc-400 hover:text-cyan-400 hover:border-cyan-500/30 hover:bg-cyan-500/[0.06] transition-all cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* AI Avatar + Capabilities Ring */}
            <div className={`${glassPanel} flex-1 flex items-center justify-center relative overflow-hidden min-h-0`}>
              {/* Orbit rings */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-80 h-80 rounded-full border border-cyan-500/15" style={{ animation: 'spin 25s linear infinite' }} />
                <div className="absolute w-[420px] h-[420px] rounded-full border border-cyan-500/8" style={{ animation: 'spin 40s linear infinite reverse' }} />
                <div className="absolute w-[520px] h-[520px] rounded-full border border-purple-500/5" style={{ animation: 'spin 60s linear infinite' }} />
              </div>

              {/* Avatar */}
              <div className="relative z-10 flex flex-col items-center">
                <div className="relative">
                  {/* Glow rings */}
                  <div className="absolute -inset-4 rounded-full bg-gradient-to-b from-cyan-500/10 to-purple-500/5 blur-xl" />
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
                        marginTop: '-12px',
                        marginLeft: '-40px'
                      }}
                    >
                      <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                        <cap.icon className="text-cyan-400 text-sm" />
                      </div>
                      <span className="text-[10px] font-bold tracking-[0.15em] text-zinc-400">{cap.label}</span>
                    </div>
                  )
                })}

                {/* Core Active Label */}
                <div className="mt-6 flex items-center gap-2">
                  <div className="w-6 h-[1px] bg-gradient-to-r from-transparent to-cyan-500/40" />
                  <span className="text-[9px] font-mono tracking-[0.3em] text-cyan-500/60">SADIYA CORE ACTIVE</span>
                  <div className="w-6 h-[1px] bg-gradient-to-l from-transparent to-cyan-500/40" />
                </div>
              </div>
            </div>

            {/* Bottom Panels Row - Console + Task Timeline */}
            <div className="flex gap-4 h-52">
              {/* Console */}
              <div className={`${glassPanel} flex-1 flex flex-col min-w-0`}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-500/10">
                  <span className="text-[11px] font-bold tracking-[0.2em] text-white">CONSOLE</span>
                  <div className="flex items-center gap-1.5 text-zinc-500">
                    <span className="text-[8px]">SADIYA CORE ACTIVE</span>
                    <div className="flex gap-0.5">
                      <span className="text-zinc-600">&larr;</span>
                      <span className="text-zinc-600">&rarr;</span>
                    </div>
                  </div>
                </div>
                <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-2 space-y-3 scrollbar-thin">
                  {consoleMessages.map((msg, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 mt-0.5 ${
                        msg.type === 'ai' ? 'bg-cyan-500/20 text-cyan-400' :
                        msg.type === 'user' ? 'bg-purple-500/20 text-purple-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {msg.type === 'ai' ? 'S' : msg.type === 'user' ? 'Y' : '✓'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold tracking-wider ${
                            msg.type === 'ai' ? 'text-cyan-400' :
                            msg.type === 'user' ? 'text-purple-400' :
                            'text-green-400'
                          }`}>{msg.sender}</span>
                          <span className="text-[8px] text-zinc-600 font-mono">{msg.time}</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">{msg.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Task Timeline */}
              <div className={`${glassPanel} flex-1 flex flex-col min-w-0`}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-500/10">
                  <span className="text-[11px] font-bold tracking-[0.2em] text-white">TASK TIMELINE</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                    <span className="text-[9px] text-red-400 font-mono">Live</span>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2.5 scrollbar-thin">
                  {tasks.map((task, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-[9px] text-zinc-600 font-mono w-10 flex-shrink-0">{task.time}</span>
                      <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/5 flex items-center justify-center flex-shrink-0">
                        <task.icon className="text-zinc-400 text-xs" />
                      </div>
                      <span className="text-[11px] text-zinc-300 flex-1 truncate">{task.text}</span>
                      {task.done ? (
                        <div className="flex items-center gap-1">
                          <RiCheckDoubleLine className="text-green-400 text-xs" />
                          <span className="text-[9px] text-green-400 font-mono">Completed</span>
                        </div>
                      ) : (
                        <span className="text-[9px] text-cyan-400 font-mono font-bold">{task.progress}%</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ===== RIGHT COLUMN ===== */}
          <div className="w-80 flex flex-col gap-4 flex-shrink-0">
            {/* System Overview */}
            <div className={`${glassPanel} p-5`}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-bold tracking-[0.2em] text-white">SYSTEM OVERVIEW</span>
                <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center cursor-pointer hover:bg-cyan-500/20 transition-colors">
                  <RiCpuLine className="text-cyan-400 text-xs" />
                </div>
              </div>
              <div className="flex justify-between gap-2">
                <CircularGauge value={cpuVal} label="CPU" detail="3.2 GHz" color="#06b6d4" size={70} />
                <CircularGauge value={ramVal} label="RAM" detail={`${ramFree} / ${ramTotal}`} color="#a855f7" size={70} />
                <CircularGauge value={diskVal} label="DISK" detail="233 / 476 GB" color="#22c55e" size={70} />
                <CircularGauge value={gpuVal} label="GPU" detail="NVIDIA RTX" color="#f59e0b" size={70} />
              </div>
              <div className="mt-4 flex items-center justify-between text-[9px] font-mono text-zinc-500">
                <span>OS: {stats?.os?.type ?? 'Windows 11'}</span>
                <span>Uptime: {stats?.os?.uptime ?? '3h 42m'}</span>
                <span>Status: <span className="text-green-400 font-bold">Optimal</span></span>
              </div>
            </div>

            {/* Active Agents */}
            <div className={`${glassPanel} p-5`}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-bold tracking-[0.2em] text-white">ACTIVE AGENTS</span>
                <div className="w-7 h-7 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-cyan-400">{agents.filter(a => a.status === 'ACTIVE').length}</span>
                </div>
              </div>
              <div className="space-y-3">
                {agents.map((agent, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${agent.color} flex items-center justify-center shadow-lg flex-shrink-0 opacity-80`}>
                      <RiRobot2Line className="text-white text-sm" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] font-bold text-white block">{agent.name}</span>
                      <span className="text-[9px] text-zinc-500 block truncate">{agent.desc}</span>
                    </div>
                    <span className={`text-[9px] font-bold tracking-wider px-2.5 py-1 rounded-full ${
                      agent.status === 'ACTIVE'
                        ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                        : 'bg-zinc-700/30 text-zinc-500 border border-zinc-600/20'
                    }`}>{agent.status}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Memory Snapshot */}
            <div className={`${glassPanel} p-5 flex-1`}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-bold tracking-[0.2em] text-white">MEMORY SNAPSHOT</span>
                <span className="text-[9px] text-cyan-400 font-mono cursor-pointer hover:text-cyan-300">View All</span>
              </div>
              <div className="space-y-3">
                {memoryItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-sm flex-shrink-0">{item.icon}</span>
                    <span className="text-[11px] text-zinc-400 flex-1 truncate">{item.text}</span>
                    <span className="text-[9px] text-zinc-600 font-mono flex-shrink-0">{item.time}</span>
                  </div>
                ))}
              </div>

              {/* SADIYA Status */}
              <div className="mt-5 pt-4 border-t border-cyan-500/10">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-[0.15em] text-white">SADIYA STATUS</span>
                  <span className="text-[9px] text-green-400 font-mono font-bold">All Systems Operational</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===== COMMAND BAR ===== */}
        <div className="px-4 pb-4">
          <div className={`${glassPanel} flex items-center gap-3 px-5 py-3`}>
            <input
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCommand()}
              placeholder="Type a command or ask anything..."
              className="flex-1 bg-transparent text-sm text-white placeholder-zinc-600 outline-none font-mono"
            />
            <button
              onClick={handleCommand}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all cursor-pointer"
            >
              <RiSendPlane2Line className="text-white text-lg" />
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-4 mt-2 px-1 justify-center">
            {[
              { icon: RiTerminalBoxLine, label: 'Open Terminal' },
              { icon: HiComputerDesktop, label: 'System Info' },
              { icon: RiSearchLine, label: 'Search Files' },
              { icon: RiCameraLine, label: 'Take Screenshot' },
              { icon: RiAddLine, label: 'New Task' }
            ].map((action) => (
              <button
                key={action.label}
                className="flex items-center gap-1.5 text-[10px] text-zinc-600 hover:text-cyan-400 transition-colors cursor-pointer font-mono tracking-wider"
              >
                <action.icon className="text-xs" />
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
