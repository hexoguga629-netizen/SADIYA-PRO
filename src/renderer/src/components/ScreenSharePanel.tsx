import { useEffect, useRef, useState } from 'react'
import { startScreenShare } from '../ai/screen-share'

export default function ScreenSharePanel() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [sourceLabel, setSourceLabel] = useState('No source selected')
  const [isActive, setIsActive] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!videoRef.current) return
    if (stream) {
      videoRef.current.srcObject = stream
      videoRef.current.play().catch(() => {})
    }
  }, [stream])

  const stopShare = () => {
    if (!stream) return
    stream.getTracks().forEach((track) => track.stop())
    setStream(null)
    setSourceLabel('No source selected')
    setIsActive(false)
  }

  const applySourceLabel = (captureStream: MediaStream | null) => {
    if (!captureStream) return
    const label = captureStream.getTracks()[0]?.label || 'Screen / window source'
    setSourceLabel(label)
  }

  async function handleStart() {
    setErrorMessage('')
    try {
      const captureStream = await startScreenShare(videoRef.current!)
      if (captureStream) {
        setStream(captureStream)
        applySourceLabel(captureStream)
        setIsActive(true)
      }
    } catch (err) {
      setErrorMessage('Unable to start display share. Grant screen access and try again.')
      console.error(err)
    }
  }

  async function handleSwitchSource() {
    stopShare()
    await handleStart()
  }

  return (
    <div className="w-full h-full relative flex flex-col bg-[#06101c]/100 backdrop-blur-xl rounded-3xl overflow-hidden border border-white/10 shadow-[inset_0_0_40px_rgba(16,185,129,0.08)]">
      <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white/5">
        <div>
          <div className="text-[10px] font-bold tracking-[0.3em] uppercase text-cyan-300/90">DISPLAY SHARE</div>
          <div className="text-xs text-zinc-300 mt-2">Live visual uplink to SADIYA. Visible content is presented directly in the panel.</div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-mono tracking-[0.25em] uppercase px-3 py-2 rounded-full ${isActive ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20' : 'bg-zinc-900/60 text-zinc-400 border border-white/10'}`}>
            {isActive ? 'DISPLAY SHARE ACTIVE' : 'OFFLINE'}
          </span>
          <button
            onClick={isActive ? stopShare : handleStart}
            className={`px-4 py-2 rounded-2xl text-[11px] font-semibold tracking-[0.2em] transition-all ${isActive ? 'bg-red-500/15 text-red-300 border border-red-500/20 hover:bg-red-500/20' : 'bg-cyan-500/15 text-cyan-200 border border-cyan-500/25 hover:bg-cyan-500/25'}`}
          >
            {isActive ? 'STOP SHARE' : 'START SHARE'}
          </button>
          <button
            onClick={handleSwitchSource}
            disabled={!isActive}
            className="px-4 py-2 rounded-2xl text-[11px] font-semibold tracking-[0.2em] bg-white/5 text-white border border-white/10 hover:bg-white/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            SWITCH SOURCE
          </button>
        </div>
      </div>

      <div className="relative flex-1 bg-black/80 overflow-hidden">
        <div className="absolute inset-x-0 top-4 z-20 px-4 flex items-center justify-between text-[10px] uppercase tracking-[0.35em] text-white/70">
          <span className="bg-black/60 px-3 py-1 rounded-full border border-white/10">Visible to SADIYA</span>
          <span className="bg-black/60 px-3 py-1 rounded-full border border-white/10">{sourceLabel}</span>
        </div>
        <div className="absolute inset-0 flex items-center justify-center border border-dashed border-white/10">
          {!isActive && (
            <div className="text-zinc-500 text-xs font-mono text-center px-6">
              Display share is paused.
              <br />Start the uplink to show SADIYA exactly what is on your screen.
            </div>
          )}
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={`w-full h-full object-contain transition-all duration-500 ${isActive ? 'opacity-100' : 'opacity-0'}`}
          />
        </div>
      </div>

      <div className="p-4 border-t border-white/10 flex flex-col gap-3 bg-[#04070b]/80">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-mono">
          <span className={`inline-flex h-2 w-2 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-700'}`}></span>
          {isActive ? 'Live stream available for visual analysis' : 'No active display feed'}
        </div>
        {errorMessage && (
          <div className="text-[12px] text-rose-300 font-medium">{errorMessage}</div>
        )}
      </div>
    </div>
  )
}
