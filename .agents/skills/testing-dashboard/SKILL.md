# SADIYA Dashboard Testing

## Environment Setup

```bash
cd /home/ubuntu/sadiya-app
npm install --legacy-peer-deps
```

Electron requires system libraries (installed via environment config):
- libgtk-3-0, libnss3, libxss1, libxtst6, libasound2, libsecret-1-0

## Running the App

```bash
DISPLAY=:0 npx electron-vite dev
```

The app window opens on the X11 display. Use `wmctrl` or `xdotool` to maximize it before testing.

## Build Verification

```bash
npx electron-vite build
```

Expected output: 3 bundles (main, preload, renderer) with no errors.

## Key Test Areas

### 1. Dashboard Layout
- Greeting should be center-aligned and show time-appropriate text (Good Morning/Afternoon/Evening)
- Sidebar icons should be visibly large (text-2xl)
- Console and Task Timeline panels should be tall (h-72)
- Voice section should be a compact horizontal bar at sidebar bottom
- All panels should have visible borders with glow effects
- Right column should be wider (w-96) with 4 system gauges
- Active Agents should show 5 agents with distinct colored icons
- Memory Snapshot should use React icons (not emojis)

### 2. Voice Toggle
- Click mic button to toggle between VOICE STANDBY and VOICE ACTIVE
- Active state: cyan gradient mic, animated waveform, pulse rings
- Standby state: dark mic, flat waveform

### 3. Console Command Bar
- Type a command and press Enter or click the send button
- Without Gemini API key: red error toast should appear with "No Gemini API key configured"
- With Gemini API key: response should appear in console chat history

### 4. System Gauges
- CPU/RAM values should update every 2 seconds (non-zero, changing values)
- Detail text should show GHz/GB values

### 5. Settings Panel
- Click SETTINGS in sidebar to open API key management
- 5 providers: Gemini, Groq, Notion, Tavily, Hugging Face
- Each has save/delete/show-hide functionality

## Devin Secrets Needed

- `GEMINI_API_KEY` — Required to test AI chat functionality (optional for UI testing)

## Known Constraints

- Gemini chat requires a valid API key saved via Settings panel
- The app runs as an Electron desktop app, not a web server — use computer/GUI tools for interaction
- ESLint may show compatibility errors with eslint-plugin-react (does not affect build)
- Voice recognition requires microphone access (may not work in headless environments)
- System gauges show real data from the host machine via `os-utils` and `systeminformation`
