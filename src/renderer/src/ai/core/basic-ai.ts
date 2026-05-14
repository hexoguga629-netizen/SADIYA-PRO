export async function generateResponse(text: string) {
  const lower = text.toLowerCase()

  if (lower.includes('hello')) {
    return 'Hello. Nice to see you.'
  }

  if (lower.includes('your name')) {
    return 'My name is Sadiya.'
  }

  if (lower.includes('time')) {
    return `Current time is ${new Date().toLocaleTimeString()}`
  }

  return `You said ${text}`
}
