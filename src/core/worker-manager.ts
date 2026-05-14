import { Worker } from 'worker_threads'
import path from 'path'

type ActiveWorker = {
  id: string
  worker: Worker
  task: string
  startedAt: number
}

const workers = new Map<string, ActiveWorker>()

function createId() {
  return `worker_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 7)}`
}

export function runWorker(
  workerFile: string,
  payload: any
) {
  return new Promise((resolve, reject) => {
    const id = createId()

    // Ensure path is resolved relative to the main process
    const absolutePath = path.isAbsolute(workerFile) 
      ? workerFile 
      : path.resolve(process.cwd(), workerFile)

    const worker = new Worker(
      absolutePath,
      {
        workerData: payload
      }
    )

    workers.set(id, {
      id,
      worker,
      task: payload?.task || 'unknown',
      startedAt: Date.now()
    })

    worker.on('message', (data) => {
      resolve(data)

      worker.terminate()

      workers.delete(id)
    })

    worker.on('error', (err) => {
      reject(err)

      worker.terminate()

      workers.delete(id)
    })

    worker.on('exit', () => {
      workers.delete(id)
    })
  })
}

export function listWorkers() {
  return Array.from(workers.values()).map(
    (w) => ({
      id: w.id,
      task: w.task,
      startedAt: w.startedAt
    })
  )
}

export function stopWorker(id: string) {
  const target = workers.get(id)

  if (!target) return false

  target.worker.terminate()

  workers.delete(id)

  return true
}
