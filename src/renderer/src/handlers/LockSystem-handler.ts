export const lockSystemSchema = {
  name: 'lock_system_vault',
  description:
    "Instantly locks the IRIS OS system, disconnects the AI, and returns the user to the secure biometric lock screen. Use thi
}

export const executeLockSystem = async () => {

  if (window.electron?.ipcRenderer) {
    window.electron.ipcRenderer.send('trigger-lockdown')
  } else {
    window.location.reload()
  }

  return 'System successfully locked. Rebooting secure interface...'
}
