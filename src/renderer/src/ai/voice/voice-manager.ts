import { sadiyaService } from '../../services/Sadiya-voice-ai'

export type VoiceMode = 'female' | 'male' | 'neutral'

export function speak(text: string) {
  // Always prioritize the high-fidelity Gemini Live voice
  if (sadiyaService.isConnected) {
    sadiyaService.speak(text)
  } else {
    // If disconnected, try to connect first
    sadiyaService.connect().then(() => {
      setTimeout(() => {
        sadiyaService.speak(text)
      }, 1000)
    }).catch(() => {
      console.error('SADIYA High-Fidelity Voice Service is unavailable.')
    })
  }
}

export function setVoice(id: string) {
  // Map the IDs to Gemini's internal voice names
  if (id.includes('female')) {
    sadiyaService.setOptions({ voice: 'Aoede' })
  } else if (id.includes('male')) {
    sadiyaService.setOptions({ voice: 'Puck' })
  }
}
