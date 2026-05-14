import { IpcMain, app } from 'electron'
import fs from 'fs'
import path from 'path'

const MEMORY_DIR = path.join(
  app.getPath('userData'),
  'memory'
)

const MEMORY_FILE = path.join(
  MEMORY_DIR,
  'active-context.json'
)

if (!fs.existsSync(MEMORY_DIR)) {
  fs.mkdirSync(MEMORY_DIR, { recursive: true })
}

function ensureMemoryFile() {
  if (!fs.existsSync(MEMORY_FILE)) {
    fs.writeFileSync(
      MEMORY_FILE,
      JSON.stringify(
        {
          sessions: [],
          activeProject: null,
          activeProtocol: 'default',
          recentActions: []
        },
        null,
        2
      )
    )
  }
}

function readMemory() {
  ensureMemoryFile()

  try {
    return JSON.parse(
      fs.readFileSync(MEMORY_FILE, 'utf-8')
    )
  } catch {
    return {
      sessions: [],
      activeProject: null,
      activeProtocol: 'default',
      recentActions: []
    }
  }
}

function writeMemory(data: any) {
  fs.writeFileSync(
    MEMORY_FILE,
    JSON.stringify(data, null, 2)
  )
}

export default function registerContextEngine(
  ipcMain: IpcMain
) {
  ipcMain.removeHandler('context:get')

  ipcMain.handle('context:get', async () => {
    return readMemory()
  })

  ipcMain.removeHandler('context:set-project')

  ipcMain.handle(
    'context:set-project',
    async (_event, projectData) => {
      const memory = readMemory()

      memory.activeProject = {
        ...projectData,
        updatedAt: Date.now()
      }

      writeMemory(memory)

      return {
        success: true
      }
    }
  )

  ipcMain.removeHandler('context:set-protocol')

  ipcMain.handle(
    'context:set-protocol',
    async (_event, protocol) => {
      const memory = readMemory()

      memory.activeProtocol = protocol

      writeMemory(memory)

      return {
        success: true
      }
    }
  )

  ipcMain.removeHandler('context:add-action')

  ipcMain.handle(
    'context:add-action',
    async (_event, action) => {
      const memory = readMemory()

      memory.recentActions.unshift({
        ...action,
        timestamp: Date.now()
      })

      memory.recentActions =
        memory.recentActions.slice(0, 50)

      writeMemory(memory)

      return {
        success: true
      }
    }
  )

  ipcMain.removeHandler('context:new-session')

  ipcMain.handle(
    'context:new-session',
    async (_event, title) => {
      const memory = readMemory()

      const session = {
        id: `session_${Date.now()}`,
        title,
        createdAt: Date.now()
      }

      memory.sessions.unshift(session)

      writeMemory(memory)

      return session
    }
  )
}
