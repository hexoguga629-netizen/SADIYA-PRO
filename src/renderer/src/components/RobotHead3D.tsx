import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export function RobotHead3D({ isListening }: { isListening?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const geometriesRef = useRef<THREE.BufferGeometry[]>([])
  const materialsRef = useRef<THREE.Material[]>([])
  const animationFrameRef = useRef<number>()
  const headGroupRef = useRef<THREE.Group | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000000)

    // Camera
    const width = containerRef.current.clientWidth
    const height = containerRef.current.clientHeight
    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 1000)
    camera.position.z = 2.8

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    scene.add(ambientLight)

    const keyLight = new THREE.PointLight(0x00d9ff, 1.2)
    keyLight.position.set(3, 2, 3)
    scene.add(keyLight)

    const fillLight = new THREE.PointLight(0x0066ff, 0.6)
    fillLight.position.set(-3, 1, 2)
    scene.add(fillLight)

    const rimLight = new THREE.PointLight(0x00ffff, 0.4)
    rimLight.position.set(0, 0, -3)
    scene.add(rimLight)

    // Head group
    const headGroup = new THREE.Group()
    headGroupRef.current = headGroup
    scene.add(headGroup)

    // Main face geometry
    const faceGeometry = new THREE.IcosahedronGeometry(0.95, 5)
    const faceMaterial = new THREE.MeshStandardMaterial({
      color: 0x0a1f3f,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0x0044aa,
      emissiveIntensity: 0.25
    })
    geometriesRef.current.push(faceGeometry)
    materialsRef.current.push(faceMaterial)
    const faceMesh = new THREE.Mesh(faceGeometry, faceMaterial)
    headGroup.add(faceMesh)

    // Left Eye
    const eyeGeometry = new THREE.SphereGeometry(0.2, 32, 32)
    const eyeMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 1,
      metalness: 0.4,
      roughness: 0.1
    })
    geometriesRef.current.push(eyeGeometry)
    materialsRef.current.push(eyeMaterial)
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
    leftEye.position.set(-0.32, 0.25, 0.85)
    leftEye.scale.set(1, 1.2, 1)
    headGroup.add(leftEye)

    // Right Eye
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
    rightEye.position.set(0.32, 0.25, 0.85)
    rightEye.scale.set(1, 1.2, 1)
    headGroup.add(rightEye)

    // Eye pupils
    const pupilGeometry = new THREE.SphereGeometry(0.08, 16, 16)
    const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x001a4d })
    geometriesRef.current.push(pupilGeometry)
    materialsRef.current.push(pupilMaterial)
    
    const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial)
    leftPupil.position.set(-0.32, 0.25, 1.05)
    headGroup.add(leftPupil)

    const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial)
    rightPupil.position.set(0.32, 0.25, 1.05)
    headGroup.add(rightPupil)

    // Nose ridge
    const noseGeometry = new THREE.ConeGeometry(0.12, 0.5, 8)
    const noseMaterial = new THREE.MeshStandardMaterial({
      color: 0x081c38,
      metalness: 0.7,
      roughness: 0.3
    })
    geometriesRef.current.push(noseGeometry)
    materialsRef.current.push(noseMaterial)
    const nose = new THREE.Mesh(noseGeometry, noseMaterial)
    nose.position.set(0, 0.05, 0.85)
    nose.rotation.z = Math.PI / 2
    headGroup.add(nose)

    // Mouth line (glow effect)
    const mouthGeometry = new THREE.TubeGeometry(
      new THREE.LineCurve3(
        new THREE.Vector3(-0.3, -0.35, 0.8),
        new THREE.Vector3(0.3, -0.35, 0.8)
      ),
      1,
      0.04,
      4,
      false
    )
    const mouthMaterial = new THREE.MeshBasicMaterial({ color: 0x00aaff })
    geometriesRef.current.push(mouthGeometry)
    materialsRef.current.push(mouthMaterial)
    const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial)
    headGroup.add(mouth)

    // Create 3 rotating rings around head
    const ringsGroup = new THREE.Group()
    scene.add(ringsGroup)

    const ringColors = [0x00d9ff, 0x0099ff, 0x00aaff]
    for (let i = 0; i < 3; i++) {
      const ringGeometry = new THREE.TorusGeometry(1.3 + i * 0.65, 0.06, 16, 40)
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: ringColors[i],
        transparent: true,
        opacity: 0.7
      })
      geometriesRef.current.push(ringGeometry)
      materialsRef.current.push(ringMaterial)

      const ring = new THREE.Mesh(ringGeometry, ringMaterial)
      if (i === 0) ring.rotation.x = Math.PI / 3
      else if (i === 1) ring.rotation.y = Math.PI / 2.5
      else ring.rotation.set(Math.PI / 2.2, Math.PI / 3.5, 0)

      ringsGroup.add(ring)
    }

    // Glow sphere around head
    const glowGeometry = new THREE.SphereGeometry(1.2, 32, 32)
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x0066ff,
      transparent: true,
      opacity: 0.1,
      side: THREE.BackSide
    })
    geometriesRef.current.push(glowGeometry)
    materialsRef.current.push(glowMaterial)
    const glow = new THREE.Mesh(glowGeometry, glowMaterial)
    headGroup.add(glow)

    // Particle system
    const particleGeometry = new THREE.BufferGeometry()
    const particleCount = 80
    const positions = new Float32Array(particleCount * 3)

    for (let i = 0; i < particleCount * 3; i += 3) {
      const radius = 1.8 + Math.random() * 1.2
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(Math.random() * 2 - 1)
      positions[i] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i + 2] = radius * Math.cos(phi)
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const particleMaterial = new THREE.PointsMaterial({
      color: 0x00d9ff,
      size: 0.08,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.8
    })
    geometriesRef.current.push(particleGeometry)
    materialsRef.current.push(particleMaterial)
    const particles = new THREE.Points(particleGeometry, particleMaterial)
    scene.add(particles)

    // Animation
    let time = 0
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate)
      time += 0.01

      // Head rotation
      headGroup.rotation.y += 0.004
      if (isListening) {
        headGroup.rotation.x = Math.sin(time * 1.2) * 0.08
        headGroup.position.y = Math.sin(time * 0.8) * 0.08
      }

      // Ring animations
      ringsGroup.children.forEach((ring, idx) => {
        ring.rotation.z += (0.35 + idx * 0.12) * (isListening ? 1.8 : 1)
        if (idx % 2 === 0) ring.rotation.x += 0.12
        ring.position.y = Math.sin(time * 0.7 + idx) * 0.15
      })

      // Particle rotation
      particles.rotation.x += 0.00015
      particles.rotation.y += 0.0004

      // Eye glow pulse
      const eyePulse = 0.8 + Math.sin(time * 2) * 0.2
      eyeMaterial.emissiveIntensity = eyePulse

      renderer.render(scene, camera)
    }
    animate()

    // Resize handler
    const handleResize = () => {
      if (!containerRef.current) return
      const newWidth = containerRef.current.clientWidth
      const newHeight = containerRef.current.clientHeight
      camera.aspect = newWidth / newHeight
      camera.updateProjectionMatrix()
      renderer.setSize(newWidth, newHeight)
    }

    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement)
      }
      geometriesRef.current.forEach((geo) => geo.dispose())
      materialsRef.current.forEach((mat) => mat.dispose())
      renderer.dispose()
    }
  }, [isListening])

  return <div ref={containerRef} className="w-full h-full" />
}

export default RobotHead3D
