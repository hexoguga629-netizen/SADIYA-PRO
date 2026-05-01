# Building SADIYA AI Desktop Executable (.exe)

## Quick Build (Windows)

```bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Build the .exe installer
npm run build:win
```

The installer will be created at: `dist/sadiya-ai-1.0.0-setup.exe`

---

## Detailed Instructions

### Step 1: Prerequisites

1. Install **Node.js v18+** from https://nodejs.org (LTS recommended)
2. Verify installation:
   ```bash
   node --version   # Should show v18+ or v22+
   npm --version    # Should show v9+
   ```

### Step 2: Clone / Download the Project

```bash
git clone https://github.com/hexoguga629-netizen/SADIYA-AI.git
cd SADIYA-AI
```

### Step 3: Install Dependencies

```bash
npm install --legacy-peer-deps
```

This installs all required packages including Electron, React, Tailwind CSS, and build tools.

### Step 4: Test in Development Mode (Optional)

```bash
npm run dev
```

This launches the app in development mode with hot-reload. Press `Ctrl+C` to stop.

### Step 5: Build the Executable

#### Windows (.exe)
```bash
npm run build:win
```

This runs two steps:
1. `electron-vite build` - Bundles the React app and Electron main process
2. `electron-builder --win` - Packages everything into an NSIS installer

#### macOS (.dmg)
```bash
npm run build:mac
```

#### Linux (AppImage)
```bash
npm run build:linux
```

### Step 6: Find Your Executable

After building, check the `dist/` folder:

| Platform | File | Type |
|----------|------|------|
| Windows  | `dist/sadiya-ai-1.0.0-setup.exe` | NSIS Installer |
| macOS    | `dist/sadiya-ai-1.0.0.dmg` | Disk Image |
| Linux    | `dist/sadiya-ai-1.0.0.AppImage` | AppImage |

### Step 7: Install and Run

**Windows:**
1. Double-click `sadiya-ai-1.0.0-setup.exe`
2. Choose installation directory (or use default)
3. Click Install
4. Launch SADIYA from desktop shortcut or Start Menu

---

## Build Configuration

The build is configured in `electron-builder.yml`:

```yaml
appId: com.sadiya.ai
productName: SADIYA AI
win:
  executableName: sadiya-ai
  target:
    - target: nsis
      arch:
        - x64
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: always
  createStartMenuShortcut: true
```

## Troubleshooting

### "npm install" fails with peer dependency errors
Use `--legacy-peer-deps` flag:
```bash
npm install --legacy-peer-deps
```

### Build fails on Linux/macOS for Windows target
You need Wine installed for cross-compilation, or build on a Windows machine.

### App shows blank screen
Check that the build completed without errors. Run `npm run build` first, then check `out/` folder.

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development mode with hot-reload |
| `npm run build` | Build production bundle only |
| `npm run build:win` | Build + package Windows installer |
| `npm run build:mac` | Build + package macOS DMG |
| `npm run build:linux` | Build + package Linux AppImage |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
