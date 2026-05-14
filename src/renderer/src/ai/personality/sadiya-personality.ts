// src/renderer/src/ai/personality/sadiya-personality.ts

export type SadiyaMood = 'soft' | 'happy' | 'romantic' | 'focused' | 'witty'

interface SadiyaState {
  mood: SadiyaMood
  userName: string
}

export const sadiyaPersonality: SadiyaState = {
  mood: 'focused',
  userName: localStorage.getItem('sadiya_user_name') || 'Operator'
}

export function setSadiyaMood(mood: SadiyaMood) {
  sadiyaPersonality.mood = mood
}

export function buildSadiyaResponse(text: string): string {
  const clean = text.trim()
  if (!clean) return clean

  switch (sadiyaPersonality.mood) {
    case 'romantic':
      return `${sadiyaPersonality.userName}, ${clean}`
    case 'happy':
      return `Good. ${clean}`
    case 'focused':
      return `Understood. ${clean}`
    case 'witty':
      return `Clean answer: ${clean}`
    case 'soft':
    default:
      return clean
  }
}
