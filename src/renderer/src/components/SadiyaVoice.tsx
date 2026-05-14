import { useState } from 'react'
import { useSpeechRecognition } from '../ai/speech/useSpeechRecognition'
import { generateResponse } from '../ai/core/basic-ai'
import { speak } from '../ai/voice/speak'

export default function SadiyaVoice() {
  const [lastText, setLastText] = useState('')
  const [lastResponse, setLastResponse] = useState('')

  async function handleVoice(text: string) {
    setLastText(text)
    const response = await generateResponse(text)
    setLastResponse(response)
    console.log('AI RESPONSE:', response)
    speak(response)
  }

  const { listening, startListening, stopListening } = useSpeechRecognition(handleVoice)

  return (
    <div className="p-6 bg-[#0a1628] border border-cyan-500/20 rounded-2xl flex flex-col gap-4 shadow-2xl">
      <div className="flex items-center justify-between">
        <h3 className="text-cyan-400 font-mono text-sm tracking-widest">MINIMAL VOICE PIPELINE</h3>
        <div className={`w-3 h-3 rounded-full ${listening ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
      </div>

      <button
        onClick={() => {
          if (listening) stopListening()
          else startListening()
        }}
        className={`px-5 py-3 rounded-xl font-bold transition-all ${
          listening 
            ? 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30' 
            : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 hover:bg-cyan-500/30'
        }`}
      >
        {listening ? 'STOP LISTENING' : 'START LISTENING'}
      </button>

      <div className="flex flex-col gap-2 font-mono text-xs">
        <div className="p-3 bg-black/40 rounded-lg border border-white/5">
          <span className="text-cyan-500/60 block mb-1">USER SAID:</span>
          <span className="text-white">{lastText || 'Waiting for voice...'}</span>
        </div>
        <div className="p-3 bg-black/40 rounded-lg border border-white/5">
          <span className="text-purple-500/60 block mb-1">AI RESPONSE:</span>
          <span className="text-white">{lastResponse || '...'}</span>
        </div>
      </div>
    </div>
  )
}
