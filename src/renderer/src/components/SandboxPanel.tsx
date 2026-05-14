import { useEffect, useMemo, useState } from 'react'
import { listSandboxes, onSandboxStream, runNodeSandbox, runShellSandbox, stopSandbox } from '../functions/sandbox-api'

export default function SandboxPanel() {
  const [mode, setMode] = useState<'node' | 'shell'>('node')
  const [code, setCode] = useState(`console.log('sandbox ready')\nreturn { ok: true }`)
  const [command, setCommand] = useState(`echo sandbox ready`)
  const [projectPath, setProjectPath] = useState('')
  const [output, setOutput] = useState('')
  const [active, setActive] = useState<any[]>([])
  const [running, setRunning] = useState(false)

  useEffect(() => {
    refresh()

    const off = onSandboxStream((data) => {
      if (data?.line) {
        setOutput((prev) => prev + data.line + '\n')
      } else if (data?.message) {
        setOutput((prev) => prev + `[${data.stage}] ${data.message}\n`)
      }
    })

    return () => {
      off()
    }
  }, [])

  async function refresh() {
    const items = await listSandboxes()
    setActive(Array.isArray(items) ? items : [])
  }

  async function run() {
    setRunning(true)
    setOutput('')
    try {
      const res =
        mode === 'node'
          ? await runNodeSandbox(code, projectPath || undefined, {})
          : await runShellSandbox(command, projectPath || undefined)

      setOutput((prev) => prev + '\n=== RESULT ===\n' + JSON.stringify(res, null, 2))
      await refresh()
    } finally {
      setRunning(false)
    }
  }

  const activeCount = useMemo(() => active.length, [active])

  return (
    <div className="w-full h-full bg-[#050b14] text-white p-4 overflow-auto">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-2xl font-bold">REAL SANDBOX</div>
          <div className="text-xs text-white/40">Docker-isolated execution</div>
        </div>
        <div className="text-sm text-cyan-300">Active: {activeCount}</div>
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex gap-2">
            <button
              onClick={() => setMode('node')}
              className={`px-3 py-2 rounded-xl border ${mode === 'node' ? 'bg-cyan-500/20 border-cyan-500/40' : 'border-white/10'}`}
            >
              Node
            </button>
            <button
              onClick={() => setMode('shell')}
              className={`px-3 py-2 rounded-xl border ${mode === 'shell' ? 'bg-cyan-500/20 border-cyan-500/40' : 'border-white/10'}`}
            >
              Shell
            </button>
          </div>

          <input
            value={projectPath}
            onChange={(e) => setProjectPath(e.target.value)}
            placeholder="Project path to mount"
            className="w-full mt-3 px-3 py-2 rounded-xl bg-black/30 border border-white/10 outline-none"
          />

          {mode === 'node' ? (
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full h-72 mt-3 px-3 py-2 rounded-xl bg-black/30 border border-white/10 outline-none font-mono text-sm"
            />
          ) : (
            <textarea
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              className="w-full h-72 mt-3 px-3 py-2 rounded-xl bg-black/30 border border-white/10 outline-none font-mono text-sm"
            />
          )}

          <div className="mt-3 flex gap-2">
            <button
              onClick={run}
              disabled={running}
              className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 disabled:opacity-50"
            >
              {running ? 'Running...' : 'Run'}
            </button>
            <button
              onClick={refresh}
              className="px-4 py-2 rounded-xl border border-white/10"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-sm text-white/50 mb-2">Live Output</div>
          <pre className="h-72 overflow-auto whitespace-pre-wrap text-xs text-green-300 bg-black/30 rounded-xl p-3 border border-white/10">
            {output || 'No output yet.'}
          </pre>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="text-sm text-white/50 mb-3">Active Sandboxes</div>
        <div className="space-y-2">
          {active.length === 0 ? (
            <div className="text-white/30 text-sm">No active sandbox.</div>
          ) : (
            active.map((sbx) => (
              <div key={sbx.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
                <div>
                  <div className="font-semibold">{sbx.name}</div>
                  <div className="text-xs text-white/40">{sbx.mode} • {new Date(sbx.startedAt).toLocaleTimeString()}</div>
                </div>
                <button
                  onClick={() => stopSandbox(sbx.id).then(refresh)}
                  className="px-3 py-2 rounded-xl border border-red-500/30 text-red-300"
                >
                  Stop
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
