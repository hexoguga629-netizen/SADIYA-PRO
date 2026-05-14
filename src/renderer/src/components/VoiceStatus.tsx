type Props = {
  active: boolean
  muted: boolean
  onStop: () => void
  onToggleMic: () => void
}

export default function VoiceStatus({ active, muted, onStop, onToggleMic }: Props) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
      <div className={`h-3 w-3 rounded-full ${active ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
      <div className="flex-1">
        <div className="text-sm font-semibold">{active ? 'VOICE LIVE' : 'VOICE OFF'}</div>
        <div className="text-xs text-white/40">{muted ? 'Mic muted' : 'Listening'}</div>
      </div>
      <button onClick={onToggleMic} className="rounded-xl border border-white/10 px-3 py-2 text-sm">
        {muted ? 'UNMUTE' : 'MUTE'}
      </button>
      <button onClick={onStop} className="rounded-xl border border-red-500/30 px-3 py-2 text-sm text-red-300">
        STOP
      </button>
    </div>
  )
}
