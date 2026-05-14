import { app, BrowserWindow, IpcMain } from 'electron'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { ChildProcess, spawn, spawnSync } from 'child_process'
import * as readline from 'readline'

type SandboxMode = 'node' | 'shell'

export type SandboxRunRequest = {
  mode: SandboxMode
  code?: string
  command?: string
  projectPath?: string
  workingDir?: string
  timeoutMs?: number
  allowNetwork?: boolean
  memoryMb?: number
  cpus?: number
  input?: Record<string, any>
  env?: Record<string, string>
}

type ActiveSandbox = {
  id: string
  name: string
  mode: SandboxMode
  startedAt: number
  timeoutMs: number
  child: ChildProcess
  workDir: string
  projectPath?: string
}

type SandboxResult = {
  success: boolean
  id: string
  mode: SandboxMode
  exitCode: number | null
  stdout: string
  stderr: string
  result?: any
  error?: string
  timedOut?: boolean
}

const DEFAULT_IMAGE = process.env.SADIYA_SANDBOX_IMAGE || 'node:20-bookworm-slim'
const RESULT_TOKEN = '__SADIYA_SANDBOX_RESULT__'
const SANDBOX_ROOT = path.join(app.getPath('userData'), 'sandboxes')

const activeSandboxes = new Map<string, ActiveSandbox>()

if (!fs.existsSync(SANDBOX_ROOT)) {
  fs.mkdirSync(SANDBOX_ROOT, { recursive: true })
}

function createId() {
  return `sbx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function ensureDockerAvailable() {
  const probe = spawnSync('docker', ['--version'], { encoding: 'utf-8' })
  return !probe.error && probe.status === 0
}

function toDockerHostPath(p: string) {
  const resolved = path.resolve(p)
  return os.platform() === 'win32' ? resolved.replace(/\\/g, '/') : resolved
}

function safeJsonParse(input: string) {
  try {
    return JSON.parse(input)
  } catch {
    return null
  }
}

function emit(win: BrowserWindow | null, channel: string, payload: any) {
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, payload)
  }
}

function cleanupDir(dir: string) {
  try {
    fs.rmSync(dir, { recursive: true, force: true })
  } catch {
    // ignore
  }
}

function buildNodeRunnerSource() {
  return String.raw`
const fs = require('fs')
const path = require('path')
const os = require('os')
const crypto = require('crypto')
const child_process = require('child_process')

function safeStringify(value) {
  try {
    const s = JSON.stringify(value)
    return typeof s === 'string' ? s : 'null'
  } catch {
    return 'null'
  }
}

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
const payloadPath = '/sandbox/payload.js'

async function main() {
  const input = (() => {
    try {
      return JSON.parse(process.env.SANDBOX_INPUT || '{}')
    } catch {
      return {}
    }
  })()

  const code = fs.readFileSync(payloadPath, 'utf8')

  const tools = {
    fs,
    path,
    os,
    crypto,
    child_process,
    Buffer,
    process,
    console,
    fetch: global.fetch,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    URL,
    URLSearchParams,
    TextDecoder,
    TextEncoder,
    atob: (s) => Buffer.from(String(s), 'base64').toString('utf-8'),
    btoa: (s) => Buffer.from(String(s), 'utf-8').toString('base64')
  }

  try {
    const fn = new AsyncFunction(
      'input',
      'tools',
      '"use strict";\nconst { fs, path, os, crypto, child_process, Buffer, process, console, fetch, setTimeout, clearTimeout, setInterval, clearInterval, URL, URLSearchParams, TextDecoder, TextEncoder, atob, btoa } = tools;\n' +
        code
    )

    const result = await fn(input, tools)

    process.stdout.write(
      '${RESULT_TOKEN}' +
        safeStringify({
          success: true,
          result: typeof result === 'undefined' ? null : result
        }) +
        '\n'
    )
  } catch (error) {
    const message = error && error.stack ? error.stack : String(error)
    process.stdout.write(
      '${RESULT_TOKEN}' +
        safeStringify({
          success: false,
          error: message
        }) +
        '\n'
    )
    process.exitCode = 1
  }
}

main()
`
}

function writeSandboxFiles(params: {
  workDir: string
  mode: SandboxMode
  code?: string
  command?: string
}) {
  const { workDir, mode, code, command } = params

  if (!fs.existsSync(workDir)) {
    fs.mkdirSync(workDir, { recursive: true })
  }

  if (mode === 'node') {
    fs.writeFileSync(path.join(workDir, 'payload.js'), String(code || ''), 'utf8')
    fs.writeFileSync(path.join(workDir, 'runner.js'), buildNodeRunnerSource(), 'utf8')
  } else {
    const shellScript = [
      '#!/bin/sh',
      'set -eu',
      '',
      String(command || '')
    ].join('\n')

    fs.writeFileSync(path.join(workDir, 'payload.sh'), shellScript, 'utf8')
  }
}

function addVolumeArg(args: string[], hostPath: string, containerPath: string, readOnly = false) {
  const mount = `${toDockerHostPath(hostPath)}:${containerPath}${readOnly ? ':ro' : ''}`
  args.push('-v', mount)
}

function buildDockerArgs(req: SandboxRunRequest, workDir: string, id: string) {
  const containerName = `sadiya_${id}`
  const image = DEFAULT_IMAGE
  const mode = req.mode || 'node'
  const memoryMb = Math.max(256, Math.min(Number(req.memoryMb || 1024), 8192))
  const cpus = Math.max(0.25, Math.min(Number(req.cpus || 1), 8))
  const timeoutMs = Math.max(1000, Math.min(Number(req.timeoutMs || 15000), 300000))
  const allowNetwork = !!req.allowNetwork

  const args: string[] = [
    'run',
    '--rm',
    '--init',
    '--name',
    containerName,
    '--label',
    `sadiya.sandbox=${id}`,
    '--cap-drop',
    'ALL',
    '--security-opt',
    'no-new-privileges',
    '--pids-limit',
    '256',
    '--memory',
    `${memoryMb}m`,
    '--cpus',
    String(cpus),
    '-i'
  ]

  if (!allowNetwork) {
    args.push('--network', 'none')
  }

  if (typeof process.getuid === 'function' && typeof process.getgid === 'function' && os.platform() !== 'win32') {
    args.push('--user', `${process.getuid()}:${process.getgid()}`)
  }

  addVolumeArg(args, workDir, '/sandbox', false)

  if (req.projectPath) {
    const projectAbs = path.resolve(req.projectPath)
    addVolumeArg(args, projectAbs, '/workspace/project', false)

    const containerWorkDir = req.workingDir
      ? `/workspace/project/${String(req.workingDir).replace(/^\/+/, '')}`
      : '/workspace/project'

    args.push('-w', containerWorkDir)
  } else {
    args.push('-w', '/sandbox')
  }

  args.push('-e', `SANDBOX_INPUT=${JSON.stringify(req.input || {})}`)
  args.push('-e', `SANDBOX_WORKDIR=${req.projectPath ? '/workspace/project' : '/sandbox'}`)

  if (req.env) {
    for (const [key, value] of Object.entries(req.env)) {
      args.push('-e', `${key}=${String(value)}`)
    }
  }

  if (mode === 'node') {
    args.push(image, 'node', '/sandbox/runner.js')
  } else {
    args.push(image, 'sh', '/sandbox/payload.sh')
  }

  return { args, containerName, timeoutMs }
}

function listSandboxTasks() {
  return Array.from(activeSandboxes.values()).map((sbx) => ({
    id: sbx.id,
    name: sbx.name,
    mode: sbx.mode,
    startedAt: sbx.startedAt,
    timeoutMs: sbx.timeoutMs,
    projectPath: sbx.projectPath || null,
    workDir: sbx.workDir
  }))
}

export function stopSandboxTask(id: string) {
  const sbx = activeSandboxes.get(id)
  if (!sbx) return false

  try {
    sbx.child.kill('SIGTERM')
  } catch {
    // ignore
  }

  spawnSync('docker', ['rm', '-f', sbx.name], { stdio: 'ignore' })
  activeSandboxes.delete(id)
  cleanupDir(sbx.workDir)
  return true
}

export async function runDockerSandbox(
  req: SandboxRunRequest,
  getMainWindow: () => BrowserWindow | null
): Promise<SandboxResult> {
  if (!ensureDockerAvailable()) {
    return {
      success: false,
      id: '',
      mode: req.mode || 'node',
      exitCode: null,
      stdout: '',
      stderr: '',
      error: 'Docker is not available on this machine.'
    }
  }

  const mode = req.mode || 'node'
  const inputCode = mode === 'node' ? String(req.code || '') : String(req.command || '')

  if (!inputCode.trim()) {
    return {
      success: false,
      id: '',
      mode,
      exitCode: null,
      stdout: '',
      stderr: '',
      error: mode === 'node' ? 'Sandbox code is empty.' : 'Sandbox command is empty.'
    }
  }

  const id = createId()
  const name = `sadiya_${id}`
  const workDir = path.join(SANDBOX_ROOT, id)

  writeSandboxFiles({
    workDir,
    mode,
    code: req.code,
    command: req.command
  })

  const { args, timeoutMs } = buildDockerArgs(req, workDir, id)
  const win = getMainWindow()

  const child = spawn('docker', args, {
    stdio: ['ignore', 'pipe', 'pipe']
  })

  activeSandboxes.set(id, {
    id,
    name,
    mode,
    startedAt: Date.now(),
    timeoutMs,
    child,
    workDir,
    projectPath: req.projectPath ? path.resolve(req.projectPath) : undefined
  })

  emit(win, 'sandbox:stream', {
    id,
    stage: 'started',
    mode,
    message: `Sandbox started: ${name}`
  })

  let stdout = ''
  let stderr = ''
  let exitCode: number | null = null
  let timedOut = false
  let resolved = false
  let resultPayload: any = null
  let resultSeen = false

  const parseLine = (line: string, streamType: 'stdout' | 'stderr') => {
    if (!line) return

    if (line.startsWith(RESULT_TOKEN)) {
      resultSeen = true
      const raw = line.slice(RESULT_TOKEN.length).trim()
      resultPayload = safeJsonParse(raw) || { success: false, error: 'Sandbox result parse failed.' }
      return
    }

    if (streamType === 'stdout') stdout += line + '\n'
    else stderr += line + '\n'

    emit(win, 'sandbox:stream', {
      id,
      stage: 'log',
      stream: streamType,
      line
    })
  }

  const stdoutRl = readline.createInterface({ input: child.stdout })
  const stderrRl = readline.createInterface({ input: child.stderr })

  stdoutRl.on('line', (line) => parseLine(line, 'stdout'))
  stderrRl.on('line', (line) => parseLine(line, 'stderr'))

  const timer = setTimeout(() => {
    timedOut = true
    emit(win, 'sandbox:stream', {
      id,
      stage: 'timeout',
      message: `Sandbox timed out after ${timeoutMs}ms`
    })

    try {
      child.kill('SIGTERM')
    } catch {
      // ignore
    }

    spawn('docker', ['rm', '-f', name], { stdio: 'ignore' })
  }, timeoutMs)

  return await new Promise<SandboxResult>((resolve) => {
    const finalize = (payload: SandboxResult) => {
      if (resolved) return
      resolved = true
      clearTimeout(timer)
      stdoutRl.close()
      stderrRl.close()
      activeSandboxes.delete(id)
      cleanupDir(workDir)
      resolve(payload)
    }

    child.on('error', (error) => {
      emit(win, 'sandbox:stream', {
        id,
        stage: 'error',
        message: error.message
      })

      finalize({
        success: false,
        id,
        mode,
        exitCode,
        stdout,
        stderr,
        error: error.message,
        timedOut
      })
    })

    child.on('close', (code) => {
      exitCode = code

      if (!resultSeen && !timedOut) {
        resultPayload = {
          success: code === 0,
          error: code === 0 ? undefined : `Sandbox exited with code ${code}`
        }
      }

      emit(win, 'sandbox:stream', {
        id,
        stage: 'exit',
        message: `Sandbox exited with code ${code}`
      })

      finalize({
        success: !!resultPayload?.success && !timedOut,
        id,
        mode,
        exitCode: code,
        stdout,
        stderr,
        result: resultPayload?.result,
        error: resultPayload?.error,
        timedOut
      })
    })
  })
}

export function registerDockerSandboxIpc(
  ipcMain: IpcMain,
  getMainWindow: () => BrowserWindow | null
) {
  ipcMain.removeHandler('sandbox:run')
  ipcMain.handle('sandbox:run', async (_event, payload: SandboxRunRequest) => {
    return runDockerSandbox(payload, getMainWindow)
  })

  ipcMain.removeHandler('sandbox:stop')
  ipcMain.handle('sandbox:stop', async (_event, id: string) => {
    return { success: stopSandboxTask(String(id)) }
  })

  ipcMain.removeHandler('sandbox:list')
  ipcMain.handle('sandbox:list', async () => {
    return listSandboxTasks()
  })

  app.on('before-quit', () => {
    for (const id of Array.from(activeSandboxes.keys())) {
      stopSandboxTask(id)
    }
  })
}

export function getActiveSandboxes() {
  return listSandboxTasks()
}
