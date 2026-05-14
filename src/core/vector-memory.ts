import fs from 'fs'
import path from 'path'
import { app } from 'electron'

export type MemoryType =
  | 'episodic'
  | 'procedural'
  | 'project'
  | 'conversation'
  | 'tool-learning'
  | 'autonomy'

export type MemoryEntry = {
  id: string
  type: MemoryType
  text: string
  tags: string[]
  embedding: number[]
  createdAt: number
  metadata?: Record<string, any>
}

const MEMORY_DIR = path.join(
  app.getPath('userData'),
  'vector-memory'
)

const MEMORY_FILE = path.join(
  MEMORY_DIR,
  'memory.json'
)

if (!fs.existsSync(MEMORY_DIR)) {
  fs.mkdirSync(MEMORY_DIR, { recursive: true })
}

function ensureFile() {
  if (!fs.existsSync(MEMORY_FILE)) {
    fs.writeFileSync(MEMORY_FILE, '[]')
  }
}

export function loadMemory(): MemoryEntry[] {
  ensureFile()

  try {
    return JSON.parse(
      fs.readFileSync(MEMORY_FILE, 'utf-8')
    )
  } catch {
    return []
  }
}

function saveMemory(memories: MemoryEntry[]) {
  fs.writeFileSync(
    MEMORY_FILE,
    JSON.stringify(memories, null, 2)
  )
}

let pipeline: any = null
async function getPipeline() {
  if (pipeline) return pipeline
  const { pipeline: loadPipeline } = await import('@xenova/transformers')
  pipeline = await loadPipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
  return pipeline
}

async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const pipe = await getPipeline()
    const output = await pipe(text, { pooling: 'mean', normalize: true })
    return Array.from(output.data)
  } catch (e) {
    console.warn('[MEMORY] Embedding failed, falling back to hash:', e)
    const size = 384
    const vec = new Array(size).fill(0)
    const tokens = text.toLowerCase().split(/\s+/).filter(Boolean)
    for (const token of tokens) {
      let hash = 0
      for (let i = 0; i < token.length; i++) hash = (hash * 31 + token.charCodeAt(i)) % size
      vec[Math.abs(hash)] += 1
    }
    return vec
  }
}

function cosineSimilarity(a: number[], b: number[]) {
  let dot = 0; let magA = 0; let magB = 0
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB) || 1)
}

export async function storeMemory(
  type: MemoryType,
  text: string,
  tags: string[] = [],
  metadata: Record<string, any> = {}
) {
  const memories = loadMemory()
  const embedding = await generateEmbedding(text)

  memories.unshift({
    id: `mem_${Date.now()}`,
    type,
    text,
    tags,
    metadata,
    embedding,
    createdAt: Date.now()
  })

  saveMemory(memories.slice(0, 5000))
}

export async function searchMemory(
  query: string,
  limit = 8
) {
  const memories = loadMemory()
  const queryEmbedding = await generateEmbedding(query)

  return memories
    .map((memory) => ({
      ...memory,
      score: cosineSimilarity(queryEmbedding, memory.embedding)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
