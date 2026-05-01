import { useState, useEffect, useRef } from 'react'
import SadiyaDashboard from './UI/SadiyaDashboard'
import TitleBar from './components/Titlebar'

const App = () => {
  const [isOverlay, setIsOverlay] = useState(false)

  useEffect(() => {
    const electronAPI = window.electron?.ipcRenderer
    if (electronAPI) {
      electronAPI.on('overlay-mode', (_e: unknown, mode: boolean) => setIsOverlay(mode))
    }
    return () => {
      window.electron?.ipcRenderer?.removeAllListeners?.('overlay-mode')
    }
  }, [])

  if (isOverlay) {
    return (
      <div className="h-screen w-full bg-[#030912]/90 backdrop-blur-xl flex items-center justify-center">
        <div className="text-cyan-400 text-xs font-mono tracking-widest animate-pulse">
          SADIYA OVERLAY ACTIVE
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-full bg-[#030912] flex flex-col overflow-hidden">
      <TitleBar />
      <SadiyaDashboard />
    </div>
  )
}

export default App
