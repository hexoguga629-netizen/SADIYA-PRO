import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as faceapi from 'face-api.js'
import { GiArtificialIntelligence } from 'react-icons/gi'
import {
  RiKey2Line,
  RiSave3Line,
  RiUserVoiceLine,
  RiUserLine,
  RiLockPasswordLine,
  RiScan2Line,
  RiAddLine,
  RiRecordCircleLine,
  RiLock2Line,
  RiSettings4Line,
  RiShieldKeyholeLine,
  RiPlugLine,
  RiBrainLine,
  RiCloudLine,
  RiCpuLine,
  RiTerminalWindowLine,
  RiRefreshLine,
  RiDownloadCloud2Line,
  RiRocketLine
} from 'react-icons/ri'
import {
  loadLocalProfile,
  saveLocalProfile,
  type VoiceGender,
  type VoiceMood
} from '../utils/sadiya-voice-profile'

interface SettingsProps {
  isSystemActive: boolean
}

type TabType = 'updates' | 'general' | 'keys' | 'security'

const SettingsView = ({ isSystemActive }: SettingsProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('updates')

  type VoiceProfile = 'MALE' | 'FEMALE' | 'NEUTRAL'
  type VoiceMood = 'ROMANTIC' | 'WARM' | 'NEUTRAL' | 'CONFIDENT'

  const [voice, setVoice] = useState<VoiceProfile>(
    (localStorage.getItem('sadiya_voice_gender') as VoiceProfile) || 'NEUTRAL'
  )
  const [voiceMood, setVoiceMood] = useState<VoiceMood>(
    (localStorage.getItem('sadiya_voice_mood') as VoiceMood) || 'NEUTRAL'
  )
  const [assistantName, setAssistantName] = useState(localStorage.getItem('sadiya_assistant_name') || 'SADIYA')
  const [personality, setPersonality] = useState('')
  const [userName, setUserName] = useState(localStorage.getItem('sadiya_user_name') || '')
  const [operatorName, setOperatorName] = useState(localStorage.getItem('sadiya_user_name') || '')
  const [voiceGender, setVoiceGender] = useState<VoiceProfile>(voice)
  const [teachingNotesText, setTeachingNotesText] = useState(() =>
    loadLocalProfile().teachingNotes.join('\n')
  )

  const [geminiKey, setGeminiKey] = useState(localStorage.getItem('SADIYA_custom_api_key') || '')
  const [groqKey, setGroqKey] = useState(localStorage.getItem('SADIYA_groq_api_key') || '')
  const [hfKey, setHfKey] = useState(localStorage.getItem('SADIYA_hf_api_key') || '')
  const [tailvyKey, setTailvyKey] = useState(localStorage.getItem('SADIYA_tailvy_api_key') || '')

  const [isSecurityUnlocked, setIsSecurityUnlocked] = useState(false)
  const [authPin, setAuthPin] = useState('')
  const [authError, setAuthError] = useState(false)

  const [newPin, setNewPin] = useState('')
  const [faceCount, setFaceCount] = useState(0)

  const [isScanningFace, setIsScanningFace] = useState(false)
  const [enrollStatus, setEnrollStatus] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)

  const [appVersion, setAppVersion] = useState('1.1.5')
  const [updateStatus, setUpdateStatus] = useState<
    'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error'
  >('idle')
  const [updateVersion, setUpdateVersion] = useState('')
  const [updateNotes, setUpdateNotes] = useState('No new updates detected.')
  const [downloadProgress, setDownloadProgress] = useState(0)

  useEffect(() => {
    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.invoke('get-personality').then((res) => {
        if (res) setPersonality(res)
      })
      window.electron.ipcRenderer.invoke('get-assistant-profile').then((profile) => {
        if (!profile) return
        const next = {
          ...loadLocalProfile(),
          ...profile,
          teachingNotes: Array.isArray(profile.teachingNotes) ? profile.teachingNotes : []
        }
        saveLocalProfile(next)
        setAssistantName(next.assistantName || 'SADIYA')
        setOperatorName(next.operatorName || 'Operator')
        setPersonality(next.personality || '')
        setVoiceGender(next.voiceGender || 'NEUTRAL')
        setVoiceMood(next.voiceMood || 'WARM')
        setTeachingNotesText((next.teachingNotes || []).join('\n'))
        if (next.voiceGender === 'MALE' || next.voiceGender === 'FEMALE') setVoice(next.voiceGender)
      })
      window.electron.ipcRenderer
        .invoke('check-vault-status')
        .then((res) => setFaceCount(res?.faceCount || 0))

      window.electron.ipcRenderer.invoke('get-app-version').then((v) => setAppVersion(v))

      window.electron.ipcRenderer.on('updater-event', (_e, { status, data, error }) => {
        if (status === 'checking') setUpdateStatus('checking')
        if (status === 'available') {
          setUpdateStatus('available')
          setUpdateVersion(data.version)
          setUpdateNotes(data.releaseNotes || 'Bug fixes and performance improvements.')
        }
        if (status === 'not-available') {
          setUpdateStatus('idle')
          setUpdateNotes('System is up to date.')
        }
        if (status === 'downloading') {
          setUpdateStatus('downloading')
          setDownloadProgress(Math.round(data.percent))
        }
        if (status === 'downloaded') setUpdateStatus('ready')
        if (status === 'error') {
          setUpdateStatus('error')
          setUpdateNotes(`Error: ${error}`)
        }
      })
    }
    return () => {
      if (window.electron?.ipcRenderer)
        window.electron.ipcRenderer.removeAllListeners('updater-event')
    }
  }, [])

  const checkForUpdates = () => window.electron.ipcRenderer.invoke('check-for-updates')
  const downloadUpdate = () => window.electron.ipcRenderer.invoke('download-update')
  const installUpdate = () => window.electron.ipcRenderer.invoke('install-update')

  const handleVoiceChange = (v: VoiceProfile) => {
    if (isSystemActive) return
    setVoice(v)
    localStorage.setItem('sadiya_voice_gender', v)
  }

  const saveVoiceProfile = () => {
    localStorage.setItem('sadiya_assistant_name', assistantName.trim() || 'SADIYA')
    localStorage.setItem('sadiya_voice_gender', voice)
    localStorage.setItem('sadiya_voice_mood', voiceMood)
    alert('Voice profile saved.')
  }

  const handlePersonalityChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value
    const words = text
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0)
    if (words.length <= 150) setPersonality(text)
  }

  const savePersonality = async () => {
    if (window.electron?.ipcRenderer) {
      await window.electron.ipcRenderer.invoke('set-personality', personality)
      alert('Personality Matrix Saved Securely to OS.')
    }
  }

  const saveVoiceStudio = async () => {
    const teachingNotes = teachingNotesText
      .split(/\r?\n/)
      .map((note) => note.trim())
      .filter(Boolean)
      .slice(0, 25)

    const profile = {
      assistantName: assistantName.trim() || 'SADIYA',
      personality: personality.trim(),
      voiceGender: voice,
      voiceMood,
      operatorName: operatorName.trim() || 'Operator',
      teachingNotes
    }

    saveLocalProfile(profile)
    localStorage.setItem('SADIYA_user_name', profile.operatorName)
    localStorage.setItem('sadiya_voice_gender', profile.voiceGender)
    localStorage.setItem('sadiya_voice_mood', profile.voiceMood)

    if (window.electron?.ipcRenderer) {
      await window.electron.ipcRenderer.invoke('set-assistant-profile', profile)
    }

    setTeachingNotesText(teachingNotes.join('\n'))
    alert('Voice profile saved.')
  }

  const saveUserName = () => {
    localStorage.setItem('SADIYA_user_name', userName)
    localStorage.setItem('sadiya_user_name', userName)
    alert('User Designation Saved.')
  }

  const saveApiKeys = async () => {
    localStorage.setItem('SADIYA_custom_api_key', geminiKey)
    localStorage.setItem('SADIYA_groq_api_key', groqKey)
    localStorage.setItem('SADIYA_hf_api_key', hfKey)
    localStorage.setItem('SADIYA_tailvy_api_key', tailvyKey)

    if (window.electron?.ipcRenderer) {
      try {
        await window.electron.ipcRenderer.invoke('secure-save-keys', { groqKey, geminiKey })
      } catch (e) {}
    }
    alert(
      'All Neural Uplinks (API Keys) secured locally and in OS Vault. Restart AI modules to apply.'
    )
  }

  const currentWordCount = personality
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length

  const unlockSecurityModule = async () => {
    if (!window.electron?.ipcRenderer) return
    const isValid = await window.electron.ipcRenderer.invoke('verify-vault-pin', authPin)
    if (isValid) {
      setIsSecurityUnlocked(true)
      setAuthPin('')
    } else {
      setAuthError(true)
      setTimeout(() => setAuthError(false), 1000)
    }
  }

  const updateMasterPin = async () => {
    if (newPin.length !== 4 || !window.electron?.ipcRenderer) return
    await window.electron.ipcRenderer.invoke('setup-vault-pin', newPin)
    setNewPin('')
    alert('Master PIN Updated Successfully.')
  }

  const startFaceEnrollment = async () => {
    setIsScanningFace(true)
    setEnrollStatus('INITIALIZING CAMERA...')
    try {
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri('./models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('./models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('./models')
      ])

      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setEnrollStatus('POSITION FACE IN FRAME')

        const scanInterval = setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState !== 4) return
          const detection = await faceapi
            .detectSingleFace(videoRef.current)
            .withFaceLandmarks()
            .withFaceDescriptor()

          if (detection) {
            clearInterval(scanInterval)
            setEnrollStatus('FACE ACQUIRED. ENCRYPTING...')
            const descriptorArray = Array.from(detection.descriptor)

            if (window.electron?.ipcRenderer) {
              await window.electron.ipcRenderer.invoke('setup-vault-face', descriptorArray)
            }

            stream.getTracks().forEach((t) => t.stop())
            setIsScanningFace(false)
            setFaceCount((prev) => prev + 1)
            alert('New Biometric Identity Saved.')
          }
        }, 1000)
      }
    } catch (e) {
      setEnrollStatus('CAMERA ERROR')
      setTimeout(() => setIsScanningFace(false), 2000)
    }
  }

  const cardClass =
    'bg-[#0f0f13] border border-white/10 p-6 md:p-8 rounded-2xl flex flex-col gap-5 hover:border-white/20 transition-all shadow-lg'
  const inputContainerClass =
    'flex items-center bg-[#050505] border border-white/10 rounded-lg px-4 py-3 focus-within:border-white/30 focus-within:bg-black transition-all duration-300 w-full'
  const titleClass = 'text-sm font-semibold text-white flex items-center gap-2'

  return (
    <div className="flex-1 p-6 md:p-10 lg:p-16 flex flex-col items-center bg-black min-h-screen text-zinc-100 overflow-y-auto scrollbar-small">
      <motion.div
        className="w-full max-w-4xl flex flex-col gap-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/10 pb-6">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-[#111] rounded-2xl border border-white/10 flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.03)]">
              <GiArtificialIntelligence size={36} className="text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-white">Command Center</h2>
              <p className="text-xs text-zinc-400 font-mono mt-1 tracking-widest flex items-center gap-2 uppercase">
                <RiRecordCircleLine
                  className={`${isSystemActive ? 'text-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]' : 'text-zinc-600'}`}
                  size={14}
                />
                {isSystemActive ? 'System Online' : 'System Offline'}
              </p>
            </div>
          </div>

          <div className="flex bg-[#0a0a0c] p-1 rounded-xl border border-white/10 w-full md:w-fit shadow-lg overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab('updates')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 text-xs font-bold tracking-widest rounded-lg transition-all duration-300 ${activeTab === 'updates' ? 'bg-white text-black shadow-md' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
            >
              <RiTerminalWindowLine size={16} /> SYSTEM
            </button>
            <button
              onClick={() => setActiveTab('general')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 text-xs font-bold tracking-widest rounded-lg transition-all duration-300 ${activeTab === 'general' ? 'bg-white text-black shadow-md' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
            >
              <RiSettings4Line size={16} /> GENERAL
            </button>
            <button
              onClick={() => setActiveTab('keys')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 text-xs font-bold tracking-widest rounded-lg transition-all duration-300 ${activeTab === 'keys' ? 'bg-white text-black shadow-md' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
            >
              <RiPlugLine size={16} /> API KEYS
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 text-xs font-bold tracking-widest rounded-lg transition-all duration-300 ${activeTab === 'security' ? 'bg-white text-black shadow-md' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
            >
              <RiShieldKeyholeLine size={16} /> SECURITY
            </button>
          </div>
        </div>

        <div className="relative min-h-125 pb-12 mt-2">
          <AnimatePresence mode="wait">
            {activeTab === 'updates' && (
              <motion.div
                key="updates"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6 absolute w-full"
              >
                <div className={`${cardClass} md:col-span-1 border-emerald-500/20`}>
                  <div className="flex justify-between items-center border-b border-white/10 pb-4">
                    <span className={titleClass}>
                      <RiRocketLine className="text-emerald-400" size={18} /> OS Firmware
                    </span>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded font-mono font-bold tracking-widest">
                      v{appVersion}
                    </span>
                  </div>

                  <div className="flex flex-col gap-4 items-center justify-center flex-1 py-4 text-center">
                    {updateStatus === 'idle' || updateStatus === 'error' ? (
                      <>
                        <RiTerminalWindowLine size={48} className="text-zinc-700" />
                        <p className="text-xs text-zinc-400 font-mono">Current build is stable.</p>
                        <button
                          onClick={checkForUpdates}
                          className="mt-2 w-full py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold tracking-widest text-[11px] flex items-center justify-center gap-2 transition-all cursor-pointer"
                        >
                          <RiRefreshLine size={16} /> CHECK FOR UPDATES
                        </button>
                      </>
                    ) : updateStatus === 'checking' ? (
                      <>
                        <RiRefreshLine size={48} className="text-emerald-500 animate-spin" />
                        <p className="text-xs text-emerald-400 font-mono animate-pulse">
                          PINGING NEURAL NETWORK...
                        </p>
                      </>
                    ) : updateStatus === 'available' ? (
                      <>
                        <RiDownloadCloud2Line size={48} className="text-cyan-400" />
                        <p className="text-xs text-cyan-400 font-mono">
                          NEW BUILD FOUND: v{updateVersion}
                        </p>
                        <button
                          onClick={downloadUpdate}
                          className="mt-2 w-full py-3 rounded-lg bg-cyan-500/20 hover:bg-cyan-500 text-cyan-400 hover:text-black font-bold tracking-widest text-[11px] flex items-center justify-center gap-2 transition-all border border-cyan-500/50 cursor-pointer"
                        >
                          <RiDownloadCloud2Line size={16} /> INITIALIZE DOWNLOAD
                        </button>
                      </>
                    ) : updateStatus === 'downloading' ? (
                      <div className="w-full flex flex-col gap-3">
                        <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                          <span>DOWNLOADING PATCH...</span>
                          <span>{downloadProgress}%</span>
                        </div>
                        <div className="w-full h-2 bg-black rounded-full overflow-hidden border border-white/10">
                          <div
                            className="h-full bg-cyan-500 shadow-[0_0_10px_#06b6d4] transition-all duration-300"
                            style={{ width: `${downloadProgress}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <RiRecordCircleLine size={48} className="text-emerald-400 animate-pulse" />
                        <p className="text-xs text-emerald-400 font-mono">PATCH DOWNLOADED</p>
                        <button
                          onClick={installUpdate}
                          className="mt-2 w-full py-3 rounded-lg bg-emerald-500 text-black font-bold tracking-widest text-[11px] flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] cursor-pointer"
                        >
                          <RiRocketLine size={16} /> EXECUTE RESTART
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className={`${cardClass} md:col-span-1`}>
                  <div className="flex justify-between items-center border-b border-white/10 pb-4">
                    <span className={titleClass}>
                      <RiTerminalWindowLine className="text-zinc-400" size={18} /> Patch Notes
                    </span>
                  </div>
                  <div className="flex-1 bg-[#050505] border border-white/5 rounded-xl p-4 overflow-y-auto max-h-60 scrollbar-small">
                    <pre className="text-[11px] font-mono text-zinc-400 whitespace-pre-wrap leading-relaxed">
                      {updateNotes}
                    </pre>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'general' && (
              <motion.div
                key="general"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6 absolute w-full"
              >
                <div className={`${cardClass} md:col-span-2`}>
                  <div className="flex justify-between items-center">
                    <span className={titleClass}>
                      <RiUserLine className="text-zinc-400" size={18} /> AI Personality Matrix
                    </span>
                    <div className="flex items-center gap-4">
                      <span
                        className={`text-[10px] font-mono tracking-widest ${currentWordCount >= 150 ? 'text-red-400' : 'text-zinc-400'}`}
                      >
                        {currentWordCount} / 150 WORDS
                      </span>
                      <button
                        onClick={savePersonality}
                        className="text-zinc-400 hover:text-white transition-colors bg-white/5 p-2 rounded-md hover:bg-white/10 border border-white/5"
                      >
                        <RiSave3Line size={18} />
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={personality}
                    onChange={handlePersonalityChange}
                    placeholder="Define who SADIYA is. Example: 'You are a sassy, highly technical assistant...'"
                    className="bg-[#050505] border border-white/10 rounded-lg p-4 text-sm text-zinc-200 h-32 resize-none focus:border-white/30 outline-none transition-all scrollbar-small"
                  />
                </div>

                <div className={`${cardClass} relative`}>
                  <div className="flex justify-between items-center">
                    <span className={titleClass}>
                      <RiUserVoiceLine className="text-zinc-400" size={18} /> Voice Profile
                    </span>
                    {isSystemActive && (
                      <span className="text-[10px] text-red-400 font-mono tracking-widest flex items-center gap-1 bg-red-500/10 px-2 py-1 rounded-md border border-red-500/20">
                        <RiLock2Line /> LOCKED WHILE SYSTEM IS ON
                      </span>
                    )}
                  </div>

                  <div className={inputContainerClass}>
                    <input
                      type="text"
                      value={assistantName}
                      onChange={(e) => setAssistantName(e.target.value)}
                      placeholder="Assistant name (SADIYA)"
                      className="bg-transparent border-none outline-none text-sm text-zinc-100 w-full placeholder:text-zinc-600"
                    />
                    <button
                      onClick={saveVoiceProfile}
                      className="text-zinc-500 hover:text-white transition-colors ml-2"
                    >
                      <RiSave3Line size={20} />
                    </button>
                  </div>

                  <div className="mt-4">
                    <p className="text-[10px] text-zinc-500 mb-2 tracking-[0.25em] uppercase">
                      Voice Gender
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      {(['FEMALE', 'MALE', 'NEUTRAL'] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => handleVoiceChange(s)}
                          disabled={isSystemActive}
                          className={`py-3 rounded-lg text-[12px] font-bold tracking-widest border transition-all ${
                            voice === s
                              ? 'bg-white text-black border-white'
                              : 'bg-[#050505] border-white/10 text-zinc-400 hover:text-white hover:border-white/30'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-[10px] text-zinc-500 mb-2 tracking-[0.25em] uppercase">
                      Voice Mood
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {(['ROMANTIC', 'WARM', 'NEUTRAL', 'CONFIDENT'] as const).map((m) => (
                        <button
                          key={m}
                          onClick={() => {
                            if (isSystemActive) return
                            setVoiceMood(m)
                            localStorage.setItem('sadiya_voice_mood', m)
                          }}
                          disabled={isSystemActive}
                          className={`py-3 rounded-lg text-[12px] font-bold tracking-widest border transition-all ${
                            voiceMood === m
                              ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                              : 'bg-[#050505] border-white/10 text-zinc-400 hover:text-white hover:border-white/30'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className={cardClass}>
                  <div className="flex justify-between items-end">
                    <span className={titleClass}>
                      <RiUserLine className="text-zinc-400" size={18} /> User Designation
                    </span>
                  </div>
                  <div className={inputContainerClass}>
                    <input
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="Enter operator name..."
                      className="bg-transparent border-none outline-none text-sm text-zinc-100 w-full placeholder:text-zinc-600 font-medium"
                    />
                    <button
                      onClick={saveUserName}
                      className="text-zinc-500 hover:text-white transition-colors ml-2"
                    >
                      <RiSave3Line size={20} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'keys' && (
              <motion.div
                key="keys"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 gap-6 absolute w-full"
              >
                <div className={`${cardClass} gap-6`}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
                    <span className={titleClass}>
                      <RiKey2Line className="text-zinc-400" size={18} /> External API Endpoints
                    </span>
                    <button
                      onClick={saveApiKeys}
                      className="bg-white text-black px-6 py-2.5 rounded-lg text-xs font-bold tracking-widest hover:bg-zinc-200 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.1)] flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <RiSave3Line size={16} /> SAVE ALL KEYS
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] text-zinc-400 font-mono tracking-widest uppercase flex items-center gap-2">
                        <RiBrainLine size={14} /> Gemini Pro Core
                      </label>
                      <div className={inputContainerClass}>
                        <input
                          type="password"
                          value={geminiKey}
                          onChange={(e) => setGeminiKey(e.target.value)}
                          placeholder="AIzaSy_..."
                          className="bg-transparent border-none outline-none text-sm font-mono text-zinc-100 w-full placeholder:text-zinc-700"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] text-zinc-400 font-mono tracking-widest uppercase flex items-center gap-2">
                        <RiCpuLine size={14} /> Groq Fast Inferencing
                      </label>
                      <div className={inputContainerClass}>
                        <input
                          type="password"
                          value={groqKey}
                          onChange={(e) => setGroqKey(e.target.value)}
                          placeholder="gsk_..."
                          className="bg-transparent border-none outline-none text-sm font-mono text-zinc-100 w-full placeholder:text-zinc-700"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 md:col-span-2">
                      <label className="text-[10px] text-zinc-400 font-mono tracking-widest uppercase flex items-center gap-2">
                        <RiCloudLine size={14} /> Hugging Face Vision
                      </label>
                      <div className={inputContainerClass}>
                        <input
                          type="password"
                          value={hfKey}
                          onChange={(e) => setHfKey(e.target.value)}
                          placeholder="hf_..."
                          className="bg-transparent border-none outline-none text-sm font-mono text-zinc-100 w-full placeholder:text-zinc-700"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 md:col-span-2">
                      <label className="text-[10px] text-zinc-400 font-mono tracking-widest uppercase flex items-center gap-2">
                        <RiPlugLine size={14} /> Tailvy Builder Agent
                      </label>
                      <div className={inputContainerClass}>
                        <input
                          type="password"
                          value={tailvyKey}
                          onChange={(e) => setTailvyKey(e.target.value)}
                          placeholder="tlv_..."
                          className="bg-transparent border-none outline-none text-sm font-mono text-zinc-100 w-full placeholder:text-zinc-700"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'security' && (
              <motion.div
                key="security"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6 absolute w-full"
              >
                {!isSecurityUnlocked ? (
                  <div className={`${cardClass} md:col-span-2 items-center justify-center py-16`}>
                    <RiLockPasswordLine size={48} className="text-zinc-700 mb-4" />
                    <h3 className="text-lg font-bold tracking-widest mb-2">SECURITY MODULE LOCKED</h3>
                    <p className="text-xs text-zinc-500 font-mono mb-8">
                      ENTER MASTER PIN TO ACCESS VAULT
                    </p>
                    <div className="flex flex-col gap-4 w-full max-w-xs">
                      <input
                        type="password"
                        maxLength={4}
                        value={authPin}
                        onChange={(e) => setAuthPin(e.target.value)}
                        className={`bg-white/5 border ${authError ? 'border-red-500' : 'border-white/10'} rounded-lg px-4 py-4 text-center text-2xl tracking-[1em] outline-none focus:border-white/30 transition-all`}
                        placeholder="****"
                      />
                      <button
                        onClick={unlockSecurityModule}
                        className="py-4 bg-white text-black rounded-lg font-bold tracking-widest text-xs hover:bg-zinc-200 transition-all shadow-xl cursor-pointer"
                      >
                        UNLOCK SYSTEM
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={cardClass}>
                      <span className={titleClass}>
                        <RiLock2Line className="text-cyan-400" size={18} /> Update Master PIN
                      </span>
                      <div className="flex flex-col gap-4">
                        <input
                          type="password"
                          maxLength={4}
                          value={newPin}
                          onChange={(e) => setNewPin(e.target.value)}
                          className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-white/30"
                          placeholder="Enter new 4-digit PIN"
                        />
                        <button
                          onClick={updateMasterPin}
                          className="py-3 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-lg font-bold tracking-widest text-xs hover:bg-cyan-500/20 transition-all cursor-pointer"
                        >
                          UPDATE SECURITY KEY
                        </button>
                      </div>
                    </div>

                    <div className={cardClass}>
                      <div className="flex justify-between items-center">
                        <span className={titleClass}>
                          <RiScan2Line className="text-emerald-400" size={18} /> Biometric Vault
                        </span>
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded font-mono">
                          {faceCount} FACES ENROLLED
                        </span>
                      </div>
                      <div className="relative aspect-video bg-black rounded-xl border border-white/5 overflow-hidden flex items-center justify-center">
                        {isScanningFace ? (
                          <>
                            <video
                              ref={videoRef}
                              autoPlay
                              muted
                              playsInline
                              className="absolute inset-0 w-full h-full object-cover opacity-60"
                            />
                            <div className="absolute inset-0 border-2 border-emerald-500/50 animate-pulse m-8 rounded-full" />
                            <div className="absolute bottom-4 left-0 right-0 text-center">
                              <p className="text-[10px] font-mono text-emerald-400 bg-black/80 inline-block px-4 py-1 rounded">
                                {enrollStatus}
                              </p>
                            </div>
                          </>
                        ) : (
                          <div className="text-center p-8">
                            <RiUserLine size={32} className="text-zinc-800 mx-auto mb-3" />
                            <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest leading-relaxed">
                              Face descriptors are encrypted <br /> and stored only on this device.
                            </p>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={startFaceEnrollment}
                        disabled={isScanningFace}
                        className="py-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg font-bold tracking-widest text-xs hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                      >
                        <RiAddLine size={18} /> ENROLL BIOMETRIC
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}

export default SettingsView
