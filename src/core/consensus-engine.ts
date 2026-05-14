type AgentVote = {
  agent: string
  answer: string
  confidence: number
  reasoning: string
}

export function resolveConsensus(
  votes: AgentVote[]
) {
  if (!votes.length) {
    return null
  }

  const sorted = votes.sort(
    (a, b) => b.confidence - a.confidence
  )

  const best = sorted[0]

  return {
    finalAnswer: best.answer,
    winningAgent: best.agent,
    confidence: best.confidence,
    alternatives: sorted.slice(1)
  }
}
