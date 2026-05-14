import { app, ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'

type VoiceGender = 'MALE' | 'FEMALE' | 'NEUTRAL'
type VoiceMood = 'ROMANTIC' | 'NEUTRAL' | 'WARM' | 'CONFIDENT'

type AssistantProfile = {
  assistantName: string
  personality: string
  voiceGender: VoiceGender
  voiceMood: VoiceMood
  operatorName: string
  teachingNotes: string[]
}

const PROFILE_FILE = path.join(app.getPath('userData'), 'sadiya_profile.json')

const DEFAULT_PROFILE: AssistantProfile = {
  assistantName: 'SADIYA',
  personality:
    'You are SADIYA, a premium warm assistant. Use only the SADIYA identity. Never sound sad.',
  voiceGender: 'NEUTRAL',
  voiceMood: 'WARM',
  operatorName: 'Operator',
  teachingNotes: []
}

function ensureProfileFile() {
  if (!fs.existsSync(PROFILE_FILE)) {
    fs.writeFileSync(PROFILE_FILE, JSON.stringify(DEFAULT_PROFILE, null, 2), 'utf-8')
  }
}

function readProfile(): AssistantProfile {
  ensureProfileFile()
  try {
    const raw = fs.readFileSync(PROFILE_FILE, 'utf-8')
    const parsed = JSON.parse(raw) as Partial<AssistantProfile>
    return {
      ...DEFAULT_PROFILE,
      ...parsed,
      teachingNotes: Array.isArray(parsed.teachingNotes) ? parsed.teachingNotes : []
    }
  } catch {
    return DEFAULT_PROFILE
  }
}

function writeProfile(profile: AssistantProfile) {
  fs.writeFileSync(PROFILE_FILE, JSON.stringify(profile, null, 2), 'utf-8')
}

export default function registerPersonalityStore() {
  ipcMain.handle('get-personality', async () => {
    return readProfile().personality
  })

  ipcMain.handle('set-personality', async (_e, personality: string) => {
    const profile = readProfile()
    profile.personality = String(personality || '').trim()
    writeProfile(profile)
    return { success: true }
  })

  ipcMain.handle('get-assistant-profile', async () => {
    return readProfile()
  })

  ipcMain.handle('set-assistant-profile', async (_e, patch: Partial<AssistantProfile>) => {
    const profile = readProfile()
    const next: AssistantProfile = {
      ...profile,
      ...patch,
      assistantName: String(patch.assistantName || profile.assistantName || 'SADIYA').trim() || 'SADIYA',
      personality: String(patch.personality || profile.personality || '').trim(),
      operatorName: String(patch.operatorName || profile.operatorName || 'Operator').trim() || 'Operator',
      voiceGender: (patch.voiceGender || profile.voiceGender || 'NEUTRAL') as VoiceGender,
      voiceMood: (patch.voiceMood || profile.voiceMood || 'WARM') as VoiceMood,
      teachingNotes: Array.isArray(patch.teachingNotes) ? patch.teachingNotes : profile.teachingNotes || []
    }

    writeProfile(next)
    return { success: true, profile: next }
  })

  ipcMain.handle('append-teaching-note', async (_e, note: string) => {
    const profile = readProfile()
    const clean = String(note || '').trim()
    if (!clean) return { success: false, error: 'Empty note' }

    profile.teachingNotes = [clean, ...(profile.teachingNotes || [])].slice(0, 25)
    writeProfile(profile)
    return { success: true, profile }
  })
}
