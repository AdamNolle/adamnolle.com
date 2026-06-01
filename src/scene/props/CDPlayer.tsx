import { useMemo, useEffect } from 'react'
import * as THREE from 'three'

/**
 * A 6-disc CD changer (hi-fi separate). Base at local y=0, front facing +z. The
 * VFD readout is a self-lit basic material (toneMapped off) so the bloom pass
 * catches it like the CRT and lamp.
 */
const W = 0.52
const Hh = 0.13
const D = 0.34

function makePanel(): THREE.CanvasTexture {
  const w = 1040
  const h = 260
  const cnv = document.createElement('canvas')
  cnv.width = w
  cnv.height = h
  const c = cnv.getContext('2d')!
  // brushed dark face
  const g = c.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, '#34373d')
  g.addColorStop(0.5, '#23262b')
  g.addColorStop(1, '#1a1c20')
  c.fillStyle = g
  c.fillRect(0, 0, w, h)
  for (let x = 0; x < w; x += 2) {
    c.strokeStyle = `rgba(255,255,255,${Math.random() * 0.03})`
    c.beginPath()
    c.moveTo(x, 0)
    c.lineTo(x, h)
    c.stroke()
  }
  // brand
  c.fillStyle = '#c7ccd2'
  c.font = 'bold 40px system-ui, Arial, sans-serif'
  c.textBaseline = 'middle'
  c.fillText('TE-600', 40, 56)
  c.fillStyle = '#7f868e'
  c.font = '600 26px ui-monospace, monospace'
  c.fillText('6-DISC CHANGER', 230, 58)
  // tray slot
  c.fillStyle = '#0c0d10'
  c.fillRect(40, 150, w - 360, 60)
  c.strokeStyle = '#000'
  c.lineWidth = 2
  c.strokeRect(40, 150, w - 360, 60)
  c.fillStyle = '#3a3e44'
  c.font = '500 22px ui-monospace, monospace'
  c.fillText('▲ OPEN / CLOSE', 60, 182)
  // button cluster (right)
  for (let i = 0; i < 6; i++) {
    const bx = 720 + (i % 3) * 90
    const by = 150 + Math.floor(i / 3) * 56
    c.fillStyle = '#3b3f45'
    c.fillRect(bx, by, 64, 40)
    c.fillStyle = '#cfd4da'
    c.font = '600 22px ui-monospace, monospace'
    c.fillText(String(i + 1), bx + 26, by + 22)
  }
  const t = new THREE.CanvasTexture(cnv)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

function makeDisplay(): THREE.CanvasTexture {
  const w = 420
  const h = 150
  const cnv = document.createElement('canvas')
  cnv.width = w
  cnv.height = h
  const c = cnv.getContext('2d')!
  c.fillStyle = '#02161a'
  c.fillRect(0, 0, w, h)
  c.fillStyle = '#28e0ff'
  c.font = 'bold 70px ui-monospace, "Consolas", monospace'
  c.textBaseline = 'middle'
  c.fillText('CD 1', 22, 60)
  c.font = 'bold 44px ui-monospace, monospace'
  c.fillText('03:12', 250, 56)
  // little spectrum
  for (let i = 0; i < 14; i++) {
    const bh = 8 + Math.random() * 60
    c.fillRect(24 + i * 27, h - 14 - bh, 16, bh)
  }
  const t = new THREE.CanvasTexture(cnv)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

export default function CDPlayer() {
  const panel = useMemo(makePanel, [])
  const display = useMemo(makeDisplay, [])
  useEffect(
    () => () => {
      panel.dispose()
      display.dispose()
    },
    [panel, display],
  )

  return (
    <group>
      {/* chassis */}
      <mesh position={[0, Hh / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[W, Hh, D]} />
        <meshStandardMaterial color="#202329" metalness={0.45} roughness={0.45} envMapIntensity={0.9} />
      </mesh>
      {/* front panel art */}
      <mesh position={[0, Hh / 2, D / 2 + 0.001]}>
        <planeGeometry args={[W - 0.02, Hh - 0.02]} />
        <meshStandardMaterial map={panel} roughness={0.5} metalness={0.3} envMapIntensity={0.8} />
      </mesh>
      {/* glowing VFD readout */}
      <mesh position={[-0.085, Hh / 2 + 0.018, D / 2 + 0.003]}>
        <planeGeometry args={[0.2, 0.058]} />
        <meshBasicMaterial map={display} toneMapped={false} />
      </mesh>
      {/* feet */}
      {[
        [-W / 2 + 0.04, -D / 2 + 0.04],
        [W / 2 - 0.04, -D / 2 + 0.04],
        [-W / 2 + 0.04, D / 2 - 0.04],
        [W / 2 - 0.04, D / 2 - 0.04],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.005, z]}>
          <cylinderGeometry args={[0.016, 0.016, 0.01, 10]} />
          <meshStandardMaterial color="#0c0d10" roughness={0.7} />
        </mesh>
      ))}
    </group>
  )
}
