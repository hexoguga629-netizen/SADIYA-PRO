import { IpcMain } from 'electron'
import fs from 'fs'
import path from 'path'

let ACTIVE_PROJECT: any = null
let ACTIVE_PROTOCOL = 'default'

const CODE_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.json',
  '.html',
  '.css',
  '.scss',
  '.py',
  '.java',
  '.cpp',
  '.c',
  '.rs',
  '.go'
]

function scanProject(root: string) {
  const result: any = {
    root,
    files: [],
    packageJson: null,
    readme: null,
    tsconfig: null
  }

  const queue = [root]

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current) continue

    let entries: fs.Dirent[] = []

    try {
      entries = fs.readdirSync(current, {
        withFileTypes: true
      })
    } catch {
      continue
    }

    for (const entry of entries) {
      const full = path.join(current, entry.name)

      if (entry.isDirectory()) {
        if (
          entry.name === 'node_modules' ||
          entry.name === '.git' ||
          entry.name === 'dist' ||
          entry.name === 'build'
        ) {
          continue
        }

        queue.push(full)
      } else {
        const ext = path.extname(entry.name)

        if (CODE_EXTENSIONS.includes(ext)) {
          result.files.push(full)
        }

        if (entry.name === 'package.json') {
          try {
            result.packageJson = JSON.parse(
              fs.readFileSync(full, 'utf-8')
            )
          } catch {}
        }

        if (entry.name.toLowerCase() === 'readme.md') {
          result.readme = fs.readFileSync(full, 'utf-8')
        }

        if (entry.name === 'tsconfig.json') {
          try {
            result.tsconfig = JSON.parse(
              fs.readFileSync(full, 'utf-8')
            )
          } catch {}
        }
      }
    }
  }

  return result
}

function detectProjectType(project: any) {
  const deps = project?.packageJson?.dependencies || {}
  const devDeps = project?.packageJson?.devDependencies || {}

  const all = {
    ...deps,
    ...devDeps
  }

  if (all['electron']) return 'electron'
  if (all['react']) return 'react'
  if (all['next']) return 'nextjs'
  if (all['vue']) return 'vue'
  if (all['express']) return 'node-backend'

  return 'generic'
}

export default function registerProjectProtocol(ipcMain: IpcMain) {
  ipcMain.removeHandler('open-project')

  ipcMain.handle('open-project', async (_event, projectPath: string) => {
    try {
      const resolved = path.resolve(projectPath)

      if (!fs.existsSync(resolved)) {
        return {
          success: false,
          error: 'Project path not found'
        }
      }

      const project = scanProject(resolved)

      const projectType = detectProjectType(project)

      ACTIVE_PROJECT = {
        ...project,
        projectType,
        openedAt: Date.now()
      }

      return {
        success: true,
        project: {
          root: ACTIVE_PROJECT.root,
          projectType,
          totalFiles: ACTIVE_PROJECT.files.length,
          hasReadme: !!ACTIVE_PROJECT.readme,
          hasTypeScript: !!ACTIVE_PROJECT.tsconfig
        }
      }
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || String(err)
      }
    }
  })

  ipcMain.removeHandler('get-active-project')

  ipcMain.handle('get-active-project', async () => {
    return ACTIVE_PROJECT
  })

  ipcMain.removeHandler('activate-protocol')

  ipcMain.handle('activate-protocol', async (_event, protocol: string) => {
    ACTIVE_PROTOCOL = protocol

    return {
      success: true,
      activeProtocol: ACTIVE_PROTOCOL,
      description:
        protocol === 'coding'
          ? 'Deep code editing + refactor mode'
          : protocol === 'debug'
          ? 'Debug analysis protocol'
          : protocol === 'architect'
          ? 'System design reasoning protocol'
          : 'Default assistant mode'
    }
  })

  ipcMain.removeHandler('get-active-protocol')

  ipcMain.handle('get-active-protocol', async () => {
    return ACTIVE_PROTOCOL
  })
}
