import { useEffect, useMemo, useState } from 'react'

type ReasoningEvent = {
  agent: string
  type: string
  message: string
  confidence?: number
  retries?: number
  activeNode?: string
  currentTool?: string
  toolRanking?: Array<{ name: string; score: number }>
  timestamp: number
}

export default function ReasoningPanel() {
  const [events, setEvents] = useState<ReasoningEvent[]>([])
  const [capabilities, setCapabilities] = useState<any[]>([])

  useEffect(() => {
    const ipc = window.electron.ipcRenderer

    const unsub = ipc.on('reasoning-stream', (_e, data: ReasoningEvent) => {
      setEvents((prev) => [data, ...prev].slice(0, 80))
    })

    window.electron.reasoningHistory().then((history: any) => {
      if (Array.isArray(history)) setEvents(history.slice(0, 80))
    })

    window.electron.listCapabilities().then((caps: any) => {
      if (Array.isArray(caps)) setCapabilities(caps)
    })

    return () => {
      unsub()
    }
  }, [])

  const active = useMemo(() => events[0], [events])

  return (
    <div className="w-full h-full overflow-hidden bg-[#050b14] text-white flex">
      <div className="w-[420px] border-r border-white/10 p-4 overflow-auto">
        <div className="text-xl font-bold">REASONING STREAM</div>
        <div className="text-xs text-white/40 mt-1">Live agent cognition trace</div>

        <div className="mt-5 space-y-3">
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4">
            <div className="text-xs text-white/40">Active Agent</div>
            <div className="text-lg font-semibold">{active?.agent || 'idle'}</div>

            <div className="mt-3 text-xs text-white/40">Current Tool</div>
            <div className="text-sm">{active?.currentTool || '-'}</div>

            <div className="mt-3 text-xs text-white/40">Confidence</div>
            <div className="text-sm">
              {typeof active?.confidence === 'number'
                ? `${Math.round(active.confidence * 100)}%`
                : '-'}
            </div>

            <div className="mt-3 text-xs text-white/40">Retries</div>
            <div className="text-sm">{active?.retries ?? 0}</div>
          </div>

          {active?.toolRanking?.length ? (
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4">
              <div className="text-sm font-semibold mb-3">Tool Ranking</div>
              <div className="space-y-2">
                {active.toolRanking.map((t) => (
                  <div key={t.name} className="flex items-center justify-between text-sm">
                    <span>{t.name}</span>
                    <span className="text-cyan-300">{t.score}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex-1 p-4 overflow-auto">
        <div className="text-sm text-white/40 mb-3">Reasoning Feed</div>
        <div className="space-y-3">
          {events.map((e, idx) => (
            <div key={`${e.timestamp}-${idx}`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="font-semibold">{e.agent}</div>
                <div className="text-xs text-white/30">{new Date(e.timestamp).toLocaleTimeString()}</div>
              </div>
              <div className="mt-2 text-sm text-white/80">{e.message}</div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-1 rounded-lg bg-white/5 border border-white/10">{e.type}</span>
                {e.activeNode ? (
                  <span className="px-2 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
                    node: {e.activeNode}
                  </span>
                ) : null}
                {typeof e.confidence === 'number' ? (
                  <span className="px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                    conf: {Math.round(e.confidence * 100)}%
                  </span>
                ) : null}
                {typeof e.retries === 'number' ? (
                  <span className="px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300">
                    retries: {e.retries}
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="w-[320px] border-l border-white/10 p-4 overflow-auto">
        <div className="text-lg font-bold">CAPABILITY REGISTRY</div>
        <div className="mt-4 space-y-3">
          {capabilities.map((cap) => (
            <div key={cap.name} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold">{cap.name}</div>
                <div className="text-cyan-300 text-sm">{cap.priority}</div>
              </div>
              <div className="text-xs text-white/40 mt-1">{cap.agent}</div>
              <div className="text-sm text-white/70 mt-2">{cap.description}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
