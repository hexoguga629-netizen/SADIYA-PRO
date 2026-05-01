import { useState, useEffect } from 'react'
import SadiyaDashboard from './UI/SadiyaDashboard'
import SettingsPanel from './UI/SettingsPanel'
import TitleBar from './components/Titlebar'

const App = () => {
  const [isOverlay, setIsOverlay] = useState(false)
  const [currentView, setCurrentView] = useState<'dashboard' | 'settings'>('dashboard')

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
      {currentView === 'settings' ? (
        <SettingsPanel onBack={() => setCurrentView('dashboard')} />
      ) : (
        <SadiyaDashboard onOpenSettings={() => setCurrentView('settings')} />
      )}
    </div>
  )
}

export default App
