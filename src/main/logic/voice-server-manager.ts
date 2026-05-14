import { ChildProcess, spawn } from 'child_process'
import path from 'path'
import { app } from 'electron'

class VoiceServerManager {
  private process: ChildProcess | null = null

  start() {
    if (this.process) return

    const projectRoot = app.getAppPath()
    const backendPath = path.join(projectRoot, 'backend', 'audio_server.py')
    
    // We assume python is in the path
    this.process = spawn('python', [backendPath], {
      cwd: projectRoot,
      env: { ...process.env, PYTHONUNBUFFERED: '1' }
    })

    this.process.stdout?.on('data', (data) => {
      console.log(`[VoiceServer] ${data}`)
    })

    this.process.stderr?.on('data', (data) => {
      console.error(`[VoiceServer Error] ${data}`)
    })

    this.process.on('close', (code) => {
      console.log(`[VoiceServer] Process exited with code ${code}`)
      this.process = null
    })
  }

  stop() {
    if (this.process) {
      this.process.kill()
      this.process = null
    }
  }
}

export const voiceServerManager = new VoiceServerManager()
