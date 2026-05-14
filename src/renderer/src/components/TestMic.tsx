import { useState } from 'react'
import { RiMicLine, RiCheckLine, RiErrorWarningLine } from 'react-icons/ri'

export default function TestMic() {
  const [status, setStatus] = useState<'idle' | 'requesting' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [tracks, setTracks] = useState<string[]>([])

  async function testMic() {
    setStatus('requesting')
    setError(null)
    try {
      console.log('SADIYA DEBUG: Requesting mic access...')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      console.log('SADIYA DEBUG: Mic success!', stream)
      
      const trackList = stream.getTracks().map(t => `${t.label} (${t.kind}) - ${t.enabled ? 'Enabled' : 'Disabled'}`)
      setTracks(trackList)
      setStatus('success')

      // Auto-stop after 3 seconds
      setTimeout(() => {
        stream.getTracks().forEach(t => t.stop())
        setStatus('idle')
      }, 3000)

    } catch (err: any) {
      console.error('SADIYA DEBUG: Mic error:', err)
      setStatus('error')
      setError(err?.message || String(err))
    }
  }

  return (
    <div className="p-4 bg-zinc-900/50 rounded-2xl border border-white/5 backdrop-blur-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-black tracking-widest text-zinc-500 uppercase">Hardware Diagnostics</h3>
        <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
          status === 'success' ? 'bg-green-500/20 text-green-400' :
          status === 'error' ? 'bg-red-500/20 text-red-400' :
          'bg-zinc-800 text-zinc-500'
        }`}>
          {status.toUpperCase()}
        </div>
      </div>

      <button
        onClick={testMic}
        disabled={status === 'requesting'}
        className={`w-full py-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-all duration-300 border ${
          status === 'requesting' ? 'bg-cyan-500/10 border-cyan-500/20 animate-pulse' :
          status === 'success' ? 'bg-green-500/10 border-green-500/30' :
          'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'
        }`}
      >
        {status === 'success' ? <RiCheckLine className="text-2xl text-green-400" /> : 
         status === 'error' ? <RiErrorWarningLine className="text-2xl text-red-400" /> :
         <RiMicLine className="text-2xl text-cyan-400" />}
        <span className="text-[10px] font-black tracking-widest uppercase">
          {status === 'requesting' ? 'Requesting...' : status === 'success' ? 'Mic Verified' : 'Trigger Mic Test'}
        </span>
      </button>

      {error && (
        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-[10px] text-red-400 font-mono break-all">{error}</p>
        </div>
      )}

      {tracks.length > 0 && (
        <div className="mt-3 space-y-1">
          {tracks.map((t, i) => (
            <div key={i} className="text-[9px] font-mono text-zinc-400 bg-white/5 p-1.5 rounded border border-white/5">
              {t}
            </div>
          ))}
        </div>
      )}
      
      <p className="mt-4 text-[9px] text-zinc-500 leading-relaxed italic">
        * This bypasses the neural engine to test raw hardware connectivity.
      </p>
    </div>
  )
}
