type RunningTask = {
  id: string
  label: string
  status: 'running' | 'paused'
}

const tasks = new Map<string, RunningTask>()

export function registerTask(
  id: string,
  label: string
) {
  tasks.set(id, {
    id,
    label,
    status: 'running'
  })
}

export function stopTask(id: string) {
  tasks.delete(id)
}

export function pauseTask(id: string) {
  const task = tasks.get(id)

  if (task) {
    task.status = 'paused'
  }
}

export function resumeTask(id: string) {
  const task = tasks.get(id)

  if (task) {
    task.status = 'running'
  }
}

export function getTasks() {
  return Array.from(tasks.values())
}

export function interruptVoiceCommand(
  text: string
) {
  const lower = text.toLowerCase()

  if (
    lower.includes('stop') ||
    lower.includes('cancel')
  ) {
    tasks.clear()

    return {
      interrupted: true,
      action: 'all_tasks_cancelled'
    }
  }

  if (lower.includes('pause')) {
    tasks.forEach((task) => {
      task.status = 'paused'
    })

    return {
      interrupted: true,
      action: 'all_tasks_paused'
    }
  }

  if (
    lower.includes('resume') ||
    lower.includes('continue')
  ) {
    tasks.forEach((task) => {
      task.status = 'running'
    })

    return {
      interrupted: true,
      action: 'all_tasks_resumed'
    }
  }

  return {
    interrupted: false
  }
}
