type Capability = {
  name: string
  description: string
  agent: string
  protocols: string[]
  priority: number
}

class CapabilityRegistry {
  private capabilities: Capability[] = []

  register(cap: Capability) {
    this.capabilities.push(cap)
  }

  getCapabilities(protocol?: string) {
    if (!protocol) return this.capabilities

    return this.capabilities.filter((c) =>
      c.protocols.includes(protocol)
    )
  }

  findBest(query: string) {
    // Basic priority ranking for now. 
    // Can be enhanced with semantic matching against query in the future.
    return this.capabilities.sort(
      (a, b) => b.priority - a.priority
    )
  }
}

export const capabilityRegistry =
  new CapabilityRegistry()
