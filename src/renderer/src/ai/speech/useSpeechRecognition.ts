import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    webkitSpeechRecognition: any
  }
}

export function useSpeechRecognition(onResult: (text: string) => void) {
  const recognitionRef = useRef<any>(null)
  const [listening, setListening] = useState(false)

  useEffect(() => {
    const SpeechRecognition = window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      console.error('SpeechRecognition unsupported')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'hi-IN'
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onstart = () => {
      console.log('VOICE STARTED')
      setListening(true)
    }

    recognition.onend = () => {
      console.log('VOICE ENDED')
      setListening(false)
    }

    recognition.onerror = (err: any) => {
      console.error('VOICE ERROR', err)
    }

    recognition.onresult = (event: any) => {
      const text = event.results[event.results.length - 1][0].transcript
      console.log('USER SAID:', text)
      onResult(text)
    }

    recognitionRef.current = recognition
  }, [])

  function startListening() {
    try {
        recognitionRef.current?.start()
    } catch (e) {
        console.warn('Recognition already started')
    }
  }

  function stopListening() {
    recognitionRef.current?.stop()
  }

  return {
    listening,
    startListening,
    stopListening
  }
}
