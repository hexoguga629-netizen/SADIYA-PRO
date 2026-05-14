type AgentMessage = {
  id: string
  from: string
  to?: string
  type: string
  payload: any
  timestamp: number
}

type AgentHandler = (
  message: AgentMessage
) => Promise<void>

class AgentBus {
  private agents = new Map<string, AgentHandler>()

  register(
    agentId: string,
    handler: AgentHandler
  ) {
    this.agents.set(agentId, handler)
  }

  unregister(agentId: string) {
    this.agents.delete(agentId)
  }

  async emit(message: AgentMessage) {
    if (message.to) {
      const target = this.agents.get(message.to)

      if (target) {
        await target(message)
      }

      return
    }

    await Promise.all(
      Array.from(this.agents.values()).map(
        (handler) => handler(message)
      )
    )
  }
}

export const agentBus = new AgentBus()
