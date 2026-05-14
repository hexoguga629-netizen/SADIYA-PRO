type Memory = {
  action: string
  count: number
}

const memory = new Map<string, Memory>()

export function trackAction(action: string) {
  const existing = memory.get(action)
  if (existing) {
    existing.count += 1
    return
  }
  memory.set(action, {
    action,
    count: 1
  })
}

export function getTopActions() {
  return [...memory.values()]
    .sort((a, b) => b.count - a.count)
}
