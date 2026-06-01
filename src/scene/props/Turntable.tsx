import { useMemo, useRef, useEffect } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../../store'
import { TAP_THRESHOLD } from '../constants'

/**
 * Belt-drive turntable. Base at local y=0, front facing +z. Click the platter to
 * start/stop it spinning (motion-gated). A record-label texture is drawn to a
 * small canvas so the disc reads as a real 45.
 */
function makeLabel(): THREE.CanvasTexture {
  const s = 256
  const cnv = document.createElement('canvas')
  cnv.width = s
  cnv.height = s
  const c = cnv.getContext('2d')!
  c.fillStyle = '#d8a13a'
  c.beginPath()
  c.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2)
  c.fill()
  c.strokeStyle = 'rgba(0,0,0,0.25)'
  c.lineWidth = 4
  c.beginPath()
  c.arc(s / 2, s / 2, s / 2 - 8, 0, Math.PI * 2)
  c.stroke()
  c.fillStyle = '#1a1208'
  c.font = 'bold 30px system-ui, Arial, sans-serif'
  c.textAlign = 'center'
  c.textBaseline = 'middle'
  c.fillText('TERMINAL', s / 2, s / 2 - 18)
  c.fillText('EIGHTY', s / 2, s / 2 + 14)
  c.font = '600 18px ui-monospace, monospace'
  c.fillText('45 RPM', s / 2, s / 2 + 52)
  const t = new THREE.CanvasTexture(cnv)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

export default function Turntable() {
  const motion = useStore((s) => s.motion)
  const spinning = useRef(false)
  const spin = useRef<THREE.Group>(null!)
  const vel = useRef(0)

  const label = useMemo(makeLabel, [])
  useEffect(() => () => label.dispose(), [label])

  useFrame((_, dt) => {
    const target = spinning.current && motion ? 3.2 : 0
    vel.current += (target - vel.current) * Math.min(1, dt * 3)
    if (spin.current) spin.current.rotation.y += vel.current * dt
  })

  const toggle = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > TAP_THRESHOLD) return
    e.stopPropagation()
    spinning.current = !spinning.current
  }
  const hover = (on: boolean) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    document.body.style.cursor = on ? 'pointer' : 'auto'
  }

  return (
    <group>
      {/* plinth */}
      <mesh position={[0, 0.04, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.46, 0.08, 0.4]} />
        <meshStandardMaterial color="#1b1d22" roughness={0.5} metalness={0.2} envMapIntensity={0.8} />
      </mesh>
      {/* feet */}
      {[
        [-0.2, -0.17],
        [0.2, -0.17],
        [-0.2, 0.17],
        [0.2, 0.17],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.0, z]}>
          <cylinderGeometry args={[0.02, 0.02, 0.02, 10]} />
          <meshStandardMaterial color="#0c0d10" roughness={0.7} />
        </mesh>
      ))}

      {/* spinning platter + record */}
      <group ref={spin} position={[-0.03, 0.08, 0.02]} onClick={toggle} onPointerOver={hover(true)} onPointerOut={hover(false)}>
        <mesh castShadow>
          <cylinderGeometry args={[0.165, 0.165, 0.018, 48]} />
          <meshStandardMaterial color="#2a2d33" metalness={0.6} roughness={0.35} envMapIntensity={1} />
        </mesh>
        {/* vinyl record */}
        <mesh position={[0, 0.012, 0]}>
          <cylinderGeometry args={[0.155, 0.155, 0.004, 64]} />
          <meshStandardMaterial color="#0a0a0c" roughness={0.45} metalness={0.1} envMapIntensity={0.7} />
        </mesh>
        {/* label */}
        <mesh position={[0, 0.0145, 0]} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[0.055, 32]} />
          <meshStandardMaterial map={label} roughness={0.6} />
        </mesh>
        {/* spindle */}
        <mesh position={[0, 0.025, 0]}>
          <cylinderGeometry args={[0.004, 0.004, 0.03, 8]} />
          <meshStandardMaterial color="#cfd3d8" metalness={1} roughness={0.3} />
        </mesh>
      </group>

      {/* tonearm pivot (back-right) */}
      <mesh position={[0.18, 0.085, -0.15]} castShadow>
        <cylinderGeometry args={[0.022, 0.022, 0.05, 16]} />
        <meshStandardMaterial color="#3a3d42" metalness={0.8} roughness={0.3} envMapIntensity={1} />
      </mesh>
      {/* tonearm tube reaching over the record */}
      <mesh position={[0.04, 0.1, -0.04]} rotation={[0, -0.7, 0]} castShadow>
        <cylinderGeometry args={[0.006, 0.006, 0.34, 12]} />
        <meshStandardMaterial color="#c0c4c9" metalness={0.9} roughness={0.25} envMapIntensity={1.2} />
      </mesh>
      {/* headshell */}
      <mesh position={[-0.085, 0.097, 0.06]} castShadow>
        <boxGeometry args={[0.03, 0.018, 0.04]} />
        <meshStandardMaterial color="#15161a" roughness={0.5} />
      </mesh>

      {/* control knobs (front-left) */}
      {[-0.16, -0.1].map((x, i) => (
        <mesh key={i} position={[x, 0.085, 0.16]} castShadow>
          <cylinderGeometry args={[0.018, 0.018, 0.014, 16]} />
          <meshStandardMaterial color="#42454b" metalness={0.7} roughness={0.35} envMapIntensity={1} />
        </mesh>
      ))}
    </group>
  )
}
