import { useEffect, useMemo, useState } from 'react'
import {
  autonomyMemory,
  autonomyPlan,
  autonomyRun,
  autonomyState,
  onAutonomyUpdate
} from '../tools/autonomy-api'

type StreamEvent = {
  stage: string
  node?: any
  result?: any
  error?: string
  attempt?: number
  maxRetries?: number
  progress?: string
}

export default function AutonomyPanel() {
  const [goal, setGoal] = useState('')
  const [loading, setLoading] = useState(false)

  const [planResult, setPlanResult] = useState<any>(null)
  const [runResult, setRunResult] = useState<any>(null)

  const [memory, setMemory] = useState<any[]>([])
  const [runtimeState, setRuntimeState] = useState<any>(null)

  const [events, setEvents] = useState<StreamEvent[]>([])

  useEffect(() => {
    refresh()

    onAutonomyUpdate((data: StreamEvent) => {
      setEvents((prev) => [data, ...prev].slice(0, 100))
    })
  }, [])

  async function refresh() {
    try {
      const [mem, state] = await Promise.all([
        autonomyMemory(),
        autonomyState()
      ])

      setMemory(mem || [])
      setRuntimeState(state)
    } catch (err) {
      console.error(err)
    }
  }

  async function handlePlan() {
    if (!goal.trim()) return

    setLoading(true)
    setEvents([])

    try {
      const result = await autonomyPlan(goal)

      setPlanResult(result)
      setRunResult(null)

      await refresh()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleRun() {
    if (!goal.trim()) return

    setLoading(true)
    setEvents([])

    try {
      const result = await autonomyRun(goal)

      setRunResult(result)
      setPlanResult(null)

      await refresh()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const currentPlan = useMemo(() => {
    return (
      planResult?.graph ||
      runResult?.plan ||
      runtimeState?.activeGraph
    )
  }, [planResult, runResult, runtimeState])

  return (
    <div className="w-full h-full bg-[#0b0f17] text-white flex flex-col overflow-hidden">

      {/* HEADER */}
      <div className="border-b border-white/10 p-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-wide">
            AUTONOMY ENGINE
          </h1>

          <p className="text-white/50 text-sm mt-1">
            Planner • Executor • Reflection • Memory
          </p>
        </div>

        <div className="text-right">
          <div className="text-xs text-white/40">
            Active Protocol
          </div>

          <div className="text-lg font-semibold text-cyan-400">
            {runtimeState?.activeProtocol || 'default'}
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT */}
        <div className="w-[420px] border-r border-white/10 flex flex-col overflow-hidden">

          {/* INPUT */}
          <div className="p-4 border-b border-white/10">
            <div className="text-sm text-white/60 mb-2">
              Goal / Objective
            </div>

            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Example:
Build a React dashboard and open VS Code.
OR
Find build error and fix TypeScript issues."
              className="w-full h-40 bg-black/40 border border-white/10 rounded-xl p-3 resize-none outline-none focus:border-cyan-500/50 transition-colors"
            />

            <div className="flex gap-3 mt-4">

              <button
                onClick={handlePlan}
                disabled={loading}
                className="flex-1 py-3 rounded-xl bg-cyan-500/20 border border-cyan-500/40 hover:bg-cyan-500/30 transition disabled:opacity-50"
              >
                {loading ? 'Planning...' : 'PLAN ONLY'}
              </button>

              <button
                onClick={handleRun}
                disabled={loading}
                className="flex-1 py-3 rounded-xl bg-green-500/20 border border-green-500/40 hover:bg-green-500/30 transition disabled:opacity-50"
              >
                {loading ? 'Running...' : 'RUN AUTONOMY'}
              </button>

            </div>
          </div>

          {/* EVENTS */}
          <div className="flex-1 overflow-auto p-4">

            <div className="text-sm text-white/50 mb-3">
              LIVE EXECUTION STREAM
            </div>

            <div className="space-y-3">

              {events.length === 0 && (
                <div className="text-white/30 text-sm">
                  Waiting for execution...
                </div>
              )}

              {events.map((event, idx) => (
                <div
                  key={idx}
                  className="bg-white/[0.03] border border-white/10 rounded-xl p-3 animate-in fade-in slide-in-from-top-2 duration-300"
                >
                  <div className="flex items-center justify-between">

                    <div className="font-semibold text-sm uppercase tracking-tighter">
                      {event.stage}
                    </div>

                    {event.progress && (
                      <div className="text-xs text-cyan-400">
                        {event.progress}
                      </div>
                    )}

                  </div>

                  {event.node && (
                    <div className="mt-2 text-sm text-white/70">
                      <div className="flex justify-between">
                        <span>Tool: <span className="text-cyan-300">{event.node.tool}</span></span>
                      </div>

                      <div className="mt-1">
                        Node: {event.node.title}
                      </div>
                    </div>
                  )}

                  {event.error && (
                    <div className="mt-2 text-red-400 text-sm whitespace-pre-wrap bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                      {event.error}
                    </div>
                  )}

                  {event.result?.output && (
                    <pre className="mt-2 text-xs text-green-300 whitespace-pre-wrap overflow-auto bg-black/40 p-2 rounded-lg border border-white/5">
                      {String(event.result.output).slice(0, 1200)}
                    </pre>
                  )}
                </div>
              ))}

            </div>
          </div>
        </div>

        {/* CENTER */}
        <div className="flex-1 overflow-auto bg-black/20">

          {/* PLAN */}
          <div className="p-5 border-b border-white/10">

            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">
                TASK GRAPH
              </h2>

              <div className="text-sm text-white/40">
                {currentPlan?.nodes?.length || 0} Nodes
              </div>
            </div>

            {!currentPlan && (
              <div className="mt-4 text-white/30 flex flex-col items-center py-20">
                <div className="text-4xl mb-2">⚡</div>
                No active graph. Generate a plan to begin.
              </div>
            )}

            {currentPlan && (
              <div className="mt-5 space-y-4">

                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 shadow-xl">
                  <div className="text-sm text-white/40">
                    Goal
                  </div>

                  <div className="mt-1 text-lg font-semibold text-cyan-100">
                    {currentPlan.goal}
                  </div>

                  <div className="mt-4 text-sm text-white/40">
                    Summary
                  </div>

                  <div className="mt-1 text-white/80 leading-relaxed">
                    {currentPlan.summary}
                  </div>
                </div>

                {currentPlan.nodes?.map((node: any, idx: number) => (
                  <div
                    key={node.id}
                    className="relative bg-white/[0.03] border border-white/10 rounded-2xl p-4 hover:border-white/20 transition-colors"
                  >
                    <div className="absolute top-3 right-3 text-xs text-cyan-400 font-mono">
                      {node.tool}
                    </div>

                    <div className="flex items-center gap-3">

                      <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-sm font-bold text-cyan-300">
                        {idx + 1}
                      </div>

                      <div>
                        <div className="font-semibold text-white/90">
                          {node.title}
                        </div>

                        <div className="text-xs text-white/30 font-mono">
                          {node.id}
                        </div>
                      </div>

                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">

                      <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                        <div className="text-xs text-white/40 mb-2 uppercase tracking-widest font-bold">
                          ARGS
                        </div>

                        <pre className="text-xs text-white/70 whitespace-pre-wrap overflow-auto max-h-40 scrollbar-hide">
                          {JSON.stringify(node.args, null, 2)}
                        </pre>
                      </div>

                      <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                        <div className="text-xs text-white/40 mb-2 uppercase tracking-widest font-bold">
                          DEPENDENCIES
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {(node.dependsOn || []).length === 0 && <span className="text-xs text-white/20 italic">None</span>}
                            {(node.dependsOn || []).map((dep: string) => (
                                <span key={dep} className="px-2 py-1 rounded-md bg-white/5 text-[10px] font-mono border border-white/10">
                                    {dep}
                                </span>
                            ))}
                        </div>
                      </div>

                    </div>

                  </div>
                ))}

              </div>
            )}

          </div>

          {/* REFLECTION */}
          {runResult?.reflection && (
            <div className="p-5 animate-in slide-in-from-bottom-4 duration-500">

              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
                SELF REFLECTION
              </h2>

              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 shadow-2xl">

                <div className="text-white/80 whitespace-pre-wrap leading-relaxed">
                  {runResult.reflection.summary}
                </div>

                <div className="mt-6">
                  <div className="text-xs text-white/40 mb-3 uppercase tracking-widest font-bold">
                    Distilled Lessons
                  </div>

                  <div className="space-y-2">
                    {(runResult.reflection.lessons || []).map(
                      (lesson: string, idx: number) => (
                        <div
                          key={idx}
                          className="bg-black/40 rounded-xl p-3 text-sm text-white/70 border border-white/5 flex gap-3 items-center"
                        >
                          <span className="text-cyan-500 text-lg">💡</span>
                          {lesson}
                        </div>
                      )
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>

        {/* RIGHT */}
        <div className="w-[360px] border-l border-white/10 overflow-auto p-4 bg-black/40">

          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold tracking-tight">
              MEMORY BANK
            </h2>

            <div className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] text-white/40 font-mono">
              {memory.length} ENTRIES
            </div>
          </div>

          <div className="space-y-4">

            {memory.length === 0 && (
                <div className="text-center py-20 opacity-20">
                    <div className="text-3xl mb-2">🧠</div>
                    Memory is empty
                </div>
            )}

            {memory.map((item, idx) => (
              <div
                key={idx}
                className="bg-white/[0.02] border border-white/10 rounded-xl p-4 hover:bg-white/[0.04] transition-all"
              >
                <div className="text-[10px] text-white/30 font-mono uppercase">
                  {new Date(item.createdAt).toLocaleString()}
                </div>

                <div className="mt-2 text-sm text-white/80 leading-snug">
                  {item.text}
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(item.tags || []).map((tag: string) => (
                    <div
                      key={tag}
                      className="px-2 py-0.5 rounded-md bg-cyan-500/5 border border-cyan-500/10 text-[10px] text-cyan-400 font-mono"
                    >
                      #{tag}
                    </div>
                  ))}
                </div>
              </div>
            ))}

          </div>

        </div>

      </div>
    </div>
  )
}
