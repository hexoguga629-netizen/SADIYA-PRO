type ProtocolResult = {
  protocol: string
  confidence: number
}

export function detectProtocol(
  input: string
): ProtocolResult {
  const text = input.toLowerCase()

  if (
    text.includes('bug') ||
    text.includes('fix') ||
    text.includes('error') ||
    text.includes('crash')
  ) {
    return {
      protocol: 'debug',
      confidence: 0.92
    }
  }

  if (
    text.includes('build') ||
    text.includes('architecture') ||
    text.includes('system') ||
    text.includes('scalable')
  ) {
    return {
      protocol: 'architect',
      confidence: 0.88
    }
  }

  if (
    text.includes('code') ||
    text.includes('create file') ||
    text.includes('typescript') ||
    text.includes('react')
  ) {
    return {
      protocol: 'coding',
      confidence: 0.95
    }
  }

  if (
    text.includes('terminal') ||
    text.includes('powershell') ||
    text.includes('cmd')
  ) {
    return {
      protocol: 'terminal',
      confidence: 0.91
    }
  }

  return {
    protocol: 'default',
    confidence: 0.5
  }
}
