import { sadiyaService } from '../../services/Sadiya-voice-ai'
import { loadLocalProfile, activationLine } from '../../utils/sadiya-voice-profile'

export async function playStartupGreeting() {
  const profile = loadLocalProfile()
  const random = activationLine(profile)

  if (sadiyaService.isConnected) {
    sadiyaService.speak(random)
  } else {
    try {
      await sadiyaService.connect()
      setTimeout(() => {
        sadiyaService.speak(random)
      }, 1000)
    } catch (err) {
      console.warn('Could not play high-quality greeting, service not ready.')
    }
  }
}
