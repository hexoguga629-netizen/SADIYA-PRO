export async function startScreenShare(video: HTMLVideoElement) {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false
    })

    video.srcObject = stream
    await video.play()

    return stream
  } catch (err) {
    console.error('Failed to start screen share:', err)
    return null
  }
}
