import './assets/main.css'

import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

class SystemErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; errorMsg: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, errorMsg: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMsg: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen bg-[#030912] flex flex-col items-center justify-center font-mono p-6 text-center">
          <div className="w-20 h-20 rounded-full border-2 border-red-500/50 flex items-center justify-center mb-6 animate-pulse">
            <span className="text-red-500 text-3xl">!</span>
          </div>
          <h1 className="text-xl font-bold mb-4 text-red-400 tracking-[0.3em]">SADIYA CORE FAILURE</h1>
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300 max-w-2xl break-words backdrop-blur-xl">
            {this.state.errorMsg}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-2 bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-cyan-400 text-xs tracking-widest hover:bg-cyan-500/30 transition-all"
          >
            REBOOT SYSTEM
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SystemErrorBoundary>
      <App />
    </SystemErrorBoundary>
  </StrictMode>
)
