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
  RiRefreshLine,
  RiTimeLine,
  RiCheckDoubleLine,
  RiArrowRightSLine,
  RiEyeLine
} from 'react-icons/ri'
import { FaMemory } from 'react-icons/fa6'
import { HiComputerDesktop } from 'react-icons/hi2'
import sadiyaAvatar from '../assets/sadiya-avatar.png'
import { getSystemStatus, SystemStats } from '../services/system-info'
import { getHistory, ChatMessage } from '../services/iris-ai-brain'

const glassPanel = 'bg-[#0a1628]/60 backdrop-blur-2xl border border-cyan-500/10 rounded-xl shadow-[0_0_30px_rgba(6,182,212,0.05)]'

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
  { name: 'Planner Agent', desc: 'Breaking down your goal...', status: 'ACTIVE' },
  { name: 'Research Agent', desc: 'Collecting latest AI news...', status: 'ACTIVE' },
  { name: 'Browser Agent', desc: 'Navigating and extracting...', status: 'ACTIVE' },
  { name: 'Memory Agent', desc: 'Storing important context...', status: 'IDLE' },
  { name: 'System Agent', desc: 'Monitoring system health...', status: 'ACTIVE' }
]

const memoryItems = [
  { text: 'You prefer responses in Hinglish', time: 'Today' },
  { text: 'Working on SADIYA AI OS Layer', time: 'Today' },
  { text: 'You are a developer and builder', time: 'Today' },
  { text: 'Favorite tools: VS Code, Terminal, Chrome', time: 'Yesterday' },
  { text: 'Project: Build next-gen AI OS', time: '2 days ago' }
]

const capabilities = [
  { label: 'THINK', icon: RiLightbulbLine, angle: 300 },
  { label: 'EXECUTE', icon: RiPlayCircleLine, angle: 0 },
  { label: 'SEARCH', icon: RiSearchLine, angle: 240 },
  { label: 'AUTOMATE', icon: RiSettings4Line, angle: 60 },
  { label: 'ANALYZE', icon: RiBarChartBoxLine, angle: 180 },
  { label: 'LEARN', icon: RiBookOpenLine, angle: 120 }
]

function CircularGauge({ value, label, color, size = 72 }: { value: number; label: string; color: string; size?: number }) {
  const radius = (size - 8) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold font-mono" style={{ color }}>{value}%</span>
        </div>
      </div>
      <span className="text-[9px] font-mono tracking-widest text-zinc-500">{label}</span>
    </div>
  )
}

export default function SadiyaDashboard() {
  const [activeNav, setActiveNav] = useState('console')
  const [time, setTime] = useState(new Date())
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [commandInput, setCommandInput] = useState('')
  const [voiceActive, setVoiceActive] = useState(false)
  const [pulsePhase, setPulsePhase] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date())
      getSystemStatus().then((s) => { if (s) setStats(s) })
    }, 2000)
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
  const diskVal = 62
  const gpuVal = 21

  const handleCommand = () => {
    if (!commandInput.trim()) return
    setCommandInput('')
  }

  const consoleMessages = [
    { sender: 'SADIYA', text: 'Hello! How can I assist you today?', time: '11:45 PM' },
    { sender: 'YOU', text: 'Open Chrome and search latest AI news', time: '11:45 PM' },
    { sender: 'SADIYA', text: 'Opening Chrome and searching for latest AI news...', time: '11:46 PM' },
    { sender: 'TASK', text: 'Found 10+ recent articles. Would you like a summary?', time: '11:47 PM' }
  ]

  const tasks = [
    { time: '11:47', icon: RiSearchLine, text: 'Research latest AI news', progress: 80 },
    { time: '11:46', icon: RiGlobalLine, text: 'Open Chrome Browser', done: true },
    { time: '11:45', icon: RiComputerLine, text: 'System Information', done: true },
    { time: '11:44', icon: RiSearchLine, text: 'Search PDF files in Home', done: true },
    { time: '11:43', icon: RiBrainLine, text: 'Memory Recall', done: true }
  ]

  return (
    <div className="flex-1 flex overflow-hidden bg-[#030912] relative">
      {/* Ambient background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-cyan-500/3 via-purple-500/2 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-[600px] h-[300px] bg-gradient-to-t from-blue-500/3 to-transparent rounded-full blur-3xl" />
      </div>

      {/* Left Sidebar */}
      <div className="w-52 flex flex-col border-r border-cyan-500/10 bg-[#040d1a]/80 backdrop-blur-xl z-10">
        {/* Logo */}
        <div className="p-4 flex items-center gap-3 border-b border-cyan-500/10">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.3)]">
            <span className="text-white font-black text-xs">S</span>
          </div>
          <div className="flex flex-col">
            <span className="font-black text-sm tracking-[0.15em] text-white">SADIYA</span>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]" />
              <span className="text-[9px] text-green-400/80 font-mono">ONLINE</span>
            </div>
          </div>
          <RiArrowRightSLine className="ml-auto text-zinc-600" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium tracking-wider transition-all duration-200 cursor-pointer ${
                activeNav === item.id
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
              }`}
            >
              <item.icon className="text-base" />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Voice Section */}
        <div className="p-3 border-t border-cyan-500/10">
          <div className={`${glassPanel} p-3 flex flex-col items-center gap-2`}>
            <span className={`text-[9px] font-bold tracking-[0.2em] ${voiceActive ? 'text-cyan-400' : 'text-zinc-600'}`}>
              {voiceActive ? 'VOICE ACTIVE' : 'VOICE STANDBY'}
            </span>
            {/* Waveform */}
            <div className="flex items-center gap-0.5 h-6">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-0.5 rounded-full transition-all duration-150 ${voiceActive ? 'bg-cyan-400/60' : 'bg-zinc-700/40'}`}
                  style={{
                    height: voiceActive
                      ? `${6 + Math.sin((pulsePhase + i * 18) * Math.PI / 180) * 10 + Math.random() * 4}px`
                      : '3px'
                  }}
                />
              ))}
            </div>
            <span className="text-[8px] text-zinc-600 font-mono">
              {voiceActive ? 'Listening...' : 'Tap to speak'}
            </span>
            <button
              onClick={() => setVoiceActive(!voiceActive)}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                voiceActive
                  ? 'bg-gradient-to-br from-cyan-500 to-blue-600 shadow-[0_0_30px_rgba(6,182,212,0.4)]'
                  : 'bg-zinc-800/80 border border-zinc-700/50 hover:border-cyan-500/30'
              }`}
            >
              <RiMicLine className={`text-lg ${voiceActive ? 'text-white' : 'text-zinc-400'}`} />
            </button>
          </div>
        </div>

        {/* Bottom Stats */}
        <div className="px-3 pb-3 flex gap-3 text-[9px] font-mono text-zinc-600">
          <div className="flex flex-col items-center">
            <span className="text-zinc-500">TEMP</span>
            <span className="text-cyan-400/80">{stats?.temperature ?? 48}°C</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-zinc-500">NET</span>
            <span className="text-cyan-400/80">120 Mbps</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-zinc-500">BATTERY</span>
            <span className="text-green-400 font-bold">100%</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 z-10">
        {/* Top Bar */}
        <div className="h-10 flex items-center justify-between px-5 border-b border-cyan-500/10 bg-[#040d1a]/60 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <div className="h-1 w-32 rounded-full bg-gradient-to-r from-cyan-500/60 via-purple-500/40 to-transparent" />
          </div>
          <span className="text-[10px] font-mono tracking-[0.3em] text-cyan-500/60">SADIYA AI OS LAYER</span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-[10px] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_4px_rgba(74,222,128,0.6)]" />
              <span className="text-green-400/80">Online</span>
            </div>
            <span className="text-zinc-400 text-sm font-bold font-mono">
              {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
            </span>
          </div>
        </div>

        {/* Hero + Panels */}
        <div className="flex-1 flex overflow-hidden p-3 gap-3">
          {/* Center Column */}
          <div className="flex-1 flex flex-col gap-3 min-w-0">
            {/* Greeting */}
            <div className={`${glassPanel} p-5`}>
              <div className="h-0.5 w-full bg-gradient-to-r from-cyan-500/40 via-purple-500/30 to-transparent rounded-full mb-4" />
              <h1 className="text-2xl font-bold text-white">
                Good Evening, I'm <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">SADIYA</span>
              </h1>
              <p className="text-zinc-400 text-sm mt-1">Your AI OS Companion. Ready to assist, automate and execute.</p>
              <div className="flex gap-2 mt-4 flex-wrap">
                {["What's on my schedule?", "Analyze this for me", "Open research mode", "System status"].map((q) => (
                  <button
                    key={q}
                    className="px-3 py-1.5 text-[10px] font-medium tracking-wider bg-white/5 border border-white/10 rounded-lg text-zinc-400 hover:text-cyan-400 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* AI Avatar + Capabilities */}
            <div className={`${glassPanel} flex-1 flex items-center justify-center relative overflow-hidden min-h-0`}>
              {/* Orbit rings */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className="w-72 h-72 rounded-full border border-cyan-500/10"
                  style={{ animation: 'spin 30s linear infinite' }}
                />
                <div
                  className="absolute w-96 h-96 rounded-full border border-purple-500/5"
                  style={{ animation: 'spin 45s linear infinite reverse' }}
                />
              </div>

              {/* Avatar */}
              <div className="relative z-10 flex flex-col items-center">
                <div className="relative">
                  <div className="w-48 h-48 rounded-full overflow-hidden border-2 border-cyan-500/30 shadow-[0_0_60px_rgba(6,182,212,0.15),0_0_120px_rgba(139,92,246,0.08)]">
                    <img
                      src={sadiyaAvatar}
                      alt="SADIYA AI"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {/* Glow ring */}
                  <div
                    className="absolute -inset-3 rounded-full border border-cyan-400/20"
                    style={{
                      animation: 'pulse 3s ease-in-out infinite',
                      boxShadow: '0 0 40px rgba(6, 182, 212, 0.1)'
                    }}
                  />
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[9px] font-mono tracking-[0.3em] text-cyan-400/60">SADIYA CORE ACTIVE</span>
                </div>
              </div>

              {/* Capability nodes */}
              {capabilities.map((cap) => {
                const rad = (cap.angle * Math.PI) / 180
                const r = 170
                const x = Math.cos(rad) * r
                const y = Math.sin(rad) * r
                return (
                  <div
                    key={cap.label}
                    className="absolute flex items-center gap-2 group cursor-pointer"
                    style={{
                      left: `calc(50% + ${x}px)`,
                      top: `calc(50% + ${y}px)`,
                      transform: 'translate(-50%, -50%)'
                    }}
                  >
                    <div className="w-8 h-8 rounded-full bg-[#0a1628]/80 border border-cyan-500/20 flex items-center justify-center group-hover:border-cyan-400/50 group-hover:bg-cyan-500/10 transition-all shadow-[0_0_10px_rgba(6,182,212,0.1)]">
                      <cap.icon className="text-cyan-400/70 text-sm group-hover:text-cyan-300" />
                    </div>
                    <span className="text-[9px] font-bold tracking-[0.15em] text-zinc-500 group-hover:text-cyan-400 transition-colors">
                      {cap.label}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Bottom Row: Console + Task Timeline */}
            <div className="flex gap-3 h-52 shrink-0">
              {/* Console */}
              <div className={`${glassPanel} flex-1 flex flex-col overflow-hidden`}>
                <div className="px-3 py-2 border-b border-cyan-500/10 flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-[0.2em] text-zinc-300">CONSOLE</span>
                </div>
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-thin">
                  {consoleMessages.map((msg, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0 mt-0.5 ${
                        msg.sender === 'SADIYA' ? 'bg-cyan-500/20 text-cyan-400' :
                        msg.sender === 'YOU' ? 'bg-purple-500/20 text-purple-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {msg.sender[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-[9px] font-bold tracking-wider ${
                            msg.sender === 'SADIYA' ? 'text-cyan-400' :
                            msg.sender === 'YOU' ? 'text-purple-400' :
                            'text-green-400'
                          }`}>
                            {msg.sender === 'TASK' ? 'TASK COMPLETED' : msg.sender}
                          </span>
                          <span className="text-[8px] text-zinc-600 font-mono">{msg.time}</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">{msg.text}</p>
                      </div>
                    </div>
                  ))}
                  {/* Show real chat history too */}
                  {chatHistory.map((msg, i) => (
                    <div key={`h-${i}`} className="flex items-start gap-2">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0 mt-0.5 ${
                        msg.role === 'model' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-purple-500/20 text-purple-400'
                      }`}>
                        {msg.role === 'model' ? 'S' : 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={`text-[9px] font-bold tracking-wider ${
                          msg.role === 'model' ? 'text-cyan-400' : 'text-purple-400'
                        }`}>
                          {msg.role === 'model' ? 'SADIYA' : 'YOU'}
                        </span>
                        <p className="text-[11px] text-zinc-400 leading-relaxed mt-0.5">{msg.parts[0]?.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Task Timeline */}
              <div className={`${glassPanel} flex-1 flex flex-col overflow-hidden`}>
                <div className="px-3 py-2 border-b border-cyan-500/10 flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-[0.2em] text-zinc-300">TASK TIMELINE</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                    <span className="text-[9px] text-red-400/80 font-mono">Live</span>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {tasks.map((task, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-[9px] font-mono text-zinc-600 w-10 shrink-0">{task.time}</span>
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                        task.done ? 'bg-green-500/10' : 'bg-cyan-500/10'
                      }`}>
                        <task.icon className={`text-xs ${task.done ? 'text-green-400/70' : 'text-cyan-400/70'}`} />
                      </div>
                      <span className="text-[11px] text-zinc-400 flex-1 truncate">{task.text}</span>
                      {task.done ? (
                        <div className="flex items-center gap-1">
                          <RiCheckDoubleLine className="text-green-400/60 text-xs" />
                          <span className="text-[9px] text-green-400/60 font-mono">Completed</span>
                        </div>
                      ) : (
                        <span className="text-[9px] text-cyan-400/80 font-mono">{task.progress}%</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="w-72 flex flex-col gap-3 shrink-0">
            {/* System Overview */}
            <div className={`${glassPanel} p-4`}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold tracking-[0.2em] text-zinc-300">SYSTEM OVERVIEW</span>
                <button className="w-6 h-6 rounded-lg bg-cyan-500/10 flex items-center justify-center cursor-pointer hover:bg-cyan-500/20 transition-colors">
                  <RiRefreshLine className="text-cyan-400/60 text-xs" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2 mb-4">
                <CircularGauge value={cpuVal} label="CPU" color="#06b6d4" size={60} />
                <CircularGauge value={ramVal} label="RAM" color="#a855f6" size={60} />
                <CircularGauge value={diskVal} label="DISK" color="#3b82f6" size={60} />
                <CircularGauge value={gpuVal} label="GPU" color="#22c55e" size={60} />
              </div>
              <div className="space-y-1.5 text-[9px] font-mono">
                <div className="flex justify-between text-zinc-500">
                  <span>OS: {stats?.os?.type ?? 'Ubuntu 24.04 LTS'}</span>
                  <span>Uptime: {stats?.os?.uptime ?? '3h 42m'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Status:</span>
                  <span className="text-green-400 font-bold">Optimal</span>
                </div>
              </div>
            </div>

            {/* Active Agents */}
            <div className={`${glassPanel} p-4 flex-1 min-h-0 flex flex-col`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold tracking-[0.2em] text-zinc-300">ACTIVE AGENTS</span>
                <span className="w-6 h-6 rounded-lg bg-purple-500/15 flex items-center justify-center text-[10px] font-bold text-purple-400">
                  {agents.filter(a => a.status === 'ACTIVE').length}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2">
                {agents.map((agent, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/3 transition-colors">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      agent.status === 'ACTIVE' ? 'bg-cyan-500/10' : 'bg-zinc-800/60'
                    }`}>
                      <RiRobot2Line className={`text-sm ${agent.status === 'ACTIVE' ? 'text-cyan-400/70' : 'text-zinc-600'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-medium text-zinc-300">{agent.name}</div>
                      <div className="text-[9px] text-zinc-600 truncate">{agent.desc}</div>
                    </div>
                    <span className={`text-[8px] font-bold tracking-widest px-2 py-0.5 rounded ${
                      agent.status === 'ACTIVE'
                        ? 'bg-cyan-500/15 text-cyan-400'
                        : 'bg-zinc-800 text-zinc-500'
                    }`}>
                      {agent.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Memory Snapshot */}
            <div className={`${glassPanel} p-4`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold tracking-[0.2em] text-zinc-300">MEMORY SNAPSHOT</span>
                <span className="text-[9px] text-cyan-400/60 font-mono cursor-pointer hover:text-cyan-400">View All</span>
              </div>
              <div className="space-y-2">
                {memoryItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <RiBrainLine className="text-purple-400/40 text-xs shrink-0" />
                    <span className="text-[10px] text-zinc-400 flex-1 truncate">{item.text}</span>
                    <span className="text-[8px] text-zinc-600 font-mono shrink-0">{item.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* SADIYA Status */}
            <div className={`${glassPanel} p-3 flex items-center justify-between`}>
              <span className="text-[10px] font-bold tracking-[0.2em] text-zinc-300">SADIYA STATUS</span>
              <span className="text-[10px] text-cyan-400 font-mono">All Systems Operational</span>
            </div>
          </div>
        </div>

        {/* Bottom Command Bar */}
        <div className="px-5 pb-3 pt-1">
          <div className={`${glassPanel} flex items-center gap-3 px-4 py-2.5`}>
            <input
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCommand()}
              placeholder="Type a command or ask anything..."
              className="flex-1 bg-transparent text-sm text-zinc-300 placeholder-zinc-600 outline-none font-medium"
            />
            <button
              onClick={handleCommand}
              className="w-8 h-8 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center cursor-pointer hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all"
            >
              <RiSendPlane2Line className="text-white text-sm" />
            </button>
          </div>
          <div className="flex items-center gap-4 mt-2 px-2">
            {[
              { icon: RiTerminalBoxLine, label: 'Open Terminal' },
              { icon: RiComputerLine, label: 'System Info' },
              { icon: RiSearchLine, label: 'Search Files' },
              { icon: RiEyeLine, label: 'Take Screenshot' },
              { icon: RiTaskLine, label: 'New Task' }
            ].map((action) => (
              <button
                key={action.label}
                className="flex items-center gap-1.5 text-[9px] text-zinc-600 hover:text-cyan-400 transition-colors cursor-pointer"
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
