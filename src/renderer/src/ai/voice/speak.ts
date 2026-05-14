export function speak(text: string) {
  speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(text)
  utter.rate = 0.95
  utter.pitch = 1

  const voices = speechSynthesis.getVoices()
  const female = voices.find(v => v.name.includes('Aria') || v.name.includes('Google US English'))

  if (female) utter.voice = female
  speechSynthesis.speak(utter)
}
