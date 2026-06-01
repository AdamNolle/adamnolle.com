import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store'
import {
  CENTER,
  FOV,
  WYAW,
  WPITCH,
  PITCH_CLAMP,
  YAW_LERP,
  ZOOM_LERP,
  DRAG_YAW,
  DRAG_PITCH,
} from './constants'

/**
 * Centered first-person rig: camera is pinned at CENTER and only rotates.
 * Drag yaws/pitches freely; nav/keyboard snaps to a wall via a shortest-angle
 * yaw tween. Ported from the prototype's applyCam/goWall math.
 */
export default function CameraRig() {
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const invalidate = useThree((s) => s.invalidate)
  const wall = useStore((s) => s.wall)
  const motion = useStore((s) => s.motion)
  const zoom = useStore((s) => s.zoom)
  const nudgeZoom = useStore((s) => s.nudgeZoom)

  const yaw = useRef(WYAW.front)
  const pitch = useRef(WPITCH.front)
  const tYaw = useRef(WYAW.front)
  const tPitch = useRef(WPITCH.front)
  const dir = useRef(new THREE.Vector3())

  // Pin position + fov once.
  useEffect(() => {
    camera.position.copy(CENTER)
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = FOV
      camera.updateProjectionMatrix()
    }
  }, [camera])

  // Snap target when the faced wall changes.
  useEffect(() => {
    tYaw.current = WYAW[wall]
    tPitch.current = WPITCH[wall]
    if (!motion) {
      yaw.current = tYaw.current
      pitch.current = tPitch.current
    }
    invalidate()
  }, [wall, motion, invalidate])

  // Drag to look.
  useEffect(() => {
    const dom = gl.domElement
    let dragging = false
    let lastX = 0
    let lastY = 0

    const onDown = (e: PointerEvent) => {
      dragging = true
      lastX = e.clientX
      lastY = e.clientY
      dom.setPointerCapture?.(e.pointerId)
    }
    const onMove = (e: PointerEvent) => {
      if (!dragging) return
      const dx = e.clientX - lastX
      const dy = e.clientY - lastY
      lastX = e.clientX
      lastY = e.clientY
      tYaw.current -= dx * DRAG_YAW
      tPitch.current = Math.max(
        -PITCH_CLAMP,
        Math.min(PITCH_CLAMP, tPitch.current - dy * DRAG_PITCH),
      )
      invalidate()
    }
    const onUp = (e: PointerEvent) => {
      if (!dragging) return
      dragging = false
      dom.releasePointerCapture?.(e.pointerId)
    }

    dom.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      dom.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [gl, invalidate])

  // Scroll wheel zooms (FOV tween in useFrame). preventDefault needs a
  // non-passive listener; invalidate so the tween advances in demand mode.
  useEffect(() => {
    const dom = gl.domElement
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      nudgeZoom(-e.deltaY * 0.0015)
      invalidate()
    }
    dom.addEventListener('wheel', onWheel, { passive: false })
    return () => dom.removeEventListener('wheel', onWheel)
  }, [gl, nudgeZoom, invalidate])

  useFrame(() => {
    const k = motion ? YAW_LERP : 1

    // Shortest-angle wrap so the tween never spins the long way around.
    let d = (tYaw.current - yaw.current + Math.PI) % (Math.PI * 2)
    if (d < 0) d += Math.PI * 2
    d -= Math.PI
    const pd = tPitch.current - pitch.current

    yaw.current += d * k
    pitch.current += pd * k

    const y = yaw.current
    const p = pitch.current
    dir.current.set(
      Math.sin(y) * Math.cos(p),
      Math.sin(p),
      -Math.cos(y) * Math.cos(p),
    )
    camera.position.copy(CENTER)
    camera.lookAt(
      CENTER.x + dir.current.x,
      CENTER.y + dir.current.y,
      CENTER.z + dir.current.z,
    )

    // FOV-tween zoom toward FOV / zoom (snaps instantly under reduced motion).
    let fovSettling = false
    if (camera instanceof THREE.PerspectiveCamera) {
      const targetFov = FOV / zoom
      const fd = targetFov - camera.fov
      if (Math.abs(fd) > 1e-3) {
        camera.fov += fd * (motion ? ZOOM_LERP : 1)
        camera.updateProjectionMatrix()
        fovSettling = true
      } else if (camera.fov !== targetFov) {
        camera.fov = targetFov
        camera.updateProjectionMatrix()
      }
    }

    // Keep requesting frames while still settling (matters in demand mode).
    if (Math.abs(d) > 1e-4 || Math.abs(pd) > 1e-4 || fovSettling) invalidate()
  })

  return null
}
