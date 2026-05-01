import { useState, useEffect } from 'react'
import {
  RiSubtractLine,
  RiCloseLine,
  RiCheckboxBlankLine,
  RiCheckboxMultipleBlankLine
} from 'react-icons/ri'

const TitleBar = () => {
  const [isMaximized, setIsMaximized] = useState(false)
  const [isMac, setIsMac] = useState(false)

  useEffect(() => {
    if (window.electron && window.electron.process) {
      setIsMac(window.electron.process.platform === 'darwin')
    } else {
      setIsMac(navigator.userAgent.toLowerCase().includes('mac'))
    }
  }, [])

  const minimize = () => window.electron.ipcRenderer.send('window-min')
  const toggleMaximize = () => {
    setIsMaximized(!isMaximized)
    window.electron.ipcRenderer.send('window-max')
  }
  const close = () => window.electron.ipcRenderer.send('window-close')

  return (
    <div
      className="w-full h-8 flex items-center justify-between px-4 bg-[#030912] border-b border-cyan-500/10 select-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {isMac && (
        <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <button onClick={close} className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 cursor-pointer" />
          <button onClick={minimize} className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 cursor-pointer" />
          <button onClick={toggleMaximize} className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 cursor-pointer" />
        </div>
      )}

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
        <span className="text-[10px] font-bold text-zinc-500 tracking-[0.3em]">SADIYA AI OS</span>
      </div>

      {!isMac && (
        <div className="flex h-full ml-auto -mr-4" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <button onClick={minimize} className="w-10 h-full flex items-center justify-center text-zinc-500 hover:bg-white/5 hover:text-white transition-colors cursor-pointer">
            <RiSubtractLine size={14} />
          </button>
          <button onClick={toggleMaximize} className="w-10 h-full flex items-center justify-center text-zinc-500 hover:bg-white/5 hover:text-white transition-colors cursor-pointer">
            {isMaximized ? <RiCheckboxMultipleBlankLine size={12} /> : <RiCheckboxBlankLine size={12} />}
          </button>
          <button onClick={close} className="w-10 h-full flex items-center justify-center text-zinc-500 hover:bg-red-600 hover:text-white transition-colors cursor-pointer">
            <RiCloseLine size={16} />
          </button>
        </div>
      )}
    </div>
  )
}

export default TitleBar
