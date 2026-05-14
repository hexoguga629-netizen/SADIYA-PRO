---
name: testing-dashboard
description: Test the SADIYA dashboard end-to-end. Use when verifying UI, system gauges, voice, AI chat, or agent functionality.
---

# Testing SADIYA Dashboard

## Prerequisites
- Node.js v22+
- Run `npm install --legacy-peer-deps` first

## Launch App
```bash
cd /home/ubuntu/sadiya-app
DISPLAY=:0 npx electron-vite dev &
```
Wait ~10 seconds for the app to render, then maximize:
```bash
DISPLAY=:0 wmctrl -r :ACTIVE: -b add,maximized_vert,maximized_horz
```

## Devin Secrets Needed
None required for basic testing. For AI chat testing, API keys should be saved via the Settings panel (not hardcoded).

## Key Test Areas

### 1. System Gauges (SYSTEM OVERVIEW panel, top-right)
- **CPU/RAM**: Should show non-zero, updating values
- **DISK**: Should show real used/total GB (e.g. "17 / 121.7 GB"), NOT "233 / 476 GB"
- **GPU**: Detail should say "Est. from CPU" (value is estimated, no real GPU detected)
- Zoom into the gauge area to read detail text clearly

### 2. AI Chat (Console input, bottom)
- Type a question (e.g. "what is 2+2") and click the cyan send button
- Expect real AI response in console (not an error)
- Task Timeline should show the task with "Done" status
- If no API keys saved, expect error: "Configure a Gemini, Groq, HuggingFace, or NVIDIA API key"

### 3. Voice Toggle (bottom-left VOICE STANDBY area)
- Click mic button to toggle
- On VM without mic: expect "Microphone access denied" error (clean, not raw JS crash)
- On real PC: should show VOICE ACTIVE with cyan glow and waveform animation
- Voice requires a real microphone — cannot be fully tested on headless VMs

### 4. Quick Action Buttons (pills below greeting)
- "System Status", "Research AI Trends", "My Memories", "Search Files"
- Each should trigger a real backend command and show in Task Timeline

### 5. Settings Panel
- Click SETTINGS in sidebar
- 6 providers: Google Gemini, Groq, Notion, Tavily, Hugging Face, NVIDIA
- Save a key → should show green ACTIVE badge
- Keys persist across navigation (leave Settings, come back → still there)

## Known Limitations
- Voice/mic cannot be tested on VMs without audio hardware
- Voice race condition (rapid on/off toggle) is a code-level fix verified by review, not UI testing
- The `use-fake-ui-for-media-stream` Electron flag auto-accepts permission dialogs but does not provide a fake audio device

## Common Issues
- If Chrome window covers the app, click the SADIYA icon in the taskbar
- If app doesn't appear, check `DISPLAY=:0` is set
- If `wmctrl` not found, install with `sudo apt-get install -y wmctrl`
