export const readGalleryImages = async () => {
  try {
    const images: any[] = await window.electron.ipcRenderer.invoke('get-gallery')
    if (!images || images.length === 0) return 'Visual Vault is empty. No images found.'

    return images
      .slice(0, 25)
      .map((img) => `🖼️ Name: "${img.displayName}" | Path: ${img.path}`)
      .join('\n')
  } catch {
    return 'System Error: Could not access Visual Vault.'
  }
}

export const analyzeDirectPhoto = async (filePath: string, socket: WebSocket | null) => {
  try {
    const url = `file:///${filePath.replace(/\\/g, '/')}`
    const res = await fetch(url)
    if (!res.ok) return '❌ Error loading image file.'

    const blob = await res.blob()

    return new Promise<string>((resolve) => {
      const reader = new FileReader()

      reader.onloadend = () => {
        const result = String(reader.result || '')
        const base64data = result.includes(',') ? result.split(',')[1] : ''

        if (!base64data) {
          resolve('❌ Could not encode image.')
          return
        }

        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(
            JSON.stringify({
              realtimeInput: {
                mediaChunks: [
                  {
                    mimeType: 'image/png',
                    data: base64data
                  }
                ]
              }
            })
          )

          resolve('✅ Photo injected into vision stream.')
        } else {
          resolve('❌ Failed: vision socket not connected.')
        }
      }

      reader.onerror = () => resolve('❌ Error reading image.')
      reader.readAsDataURL(blob)
    })
  } catch {
    return '❌ Error loading direct photo.'
  }
}
