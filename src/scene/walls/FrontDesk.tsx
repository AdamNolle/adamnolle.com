import { useMemo, useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { woodMaps, metalMaps, disposeMaps } from '../../gfx/textures'
import { mulberry32 } from '../../gfx/canvas'
import { useStore } from '../../store'
import { HS, TV_POS, TV_SCREEN, WIN_Y, WIN_W, WIN_H } from '../constants'
import Monitor from '../Monitor'
import WindowDiorama from '../props/WindowDiorama'

/**
 * FRONT wall: the big rear-projection TV console. A floor-standing cabinet with a
 * large self-lit screen (→ bloom) that doubles as the site's "console" — idle
 * logo channel by default, project channels when an app flies in. Flanked by
 * floor-standing speakers and a warm floor lamp, beneath a rainy overcast window
 * that looks out (through a real punched opening) on a 3D treeline diorama with
 * falling rain. The lamp bulb, screen, and power LED are the room's emissives, so
 * this is where Bloom catches.
 */
function makeRain(): THREE.CanvasTexture {
  const s = 512
  const cnv = document.createElement('canvas')
  cnv.width = s
  cnv.height = s
  const c = cnv.getContext('2d')!
  const rng = mulberry32(31313)
  c.clearRect(0, 0, s, s)
  c.lineCap = 'round'
  // Soft drizzle: fewer, fainter, shorter streaks than a downpour.
  for (let i = 0; i < 150; i++) {
    const x = rng() * s
    const y = rng() * s
    const len = 7 + rng() * 18
    const slant = 1 + rng() * 2
    c.strokeStyle = `rgba(214,226,238,${0.03 + rng() * 0.09})`
    c.lineWidth = 0.5 + rng() * 0.8
    c.beginPath()
    c.moveTo(x, y)
    c.lineTo(x + slant, y + len)
    c.stroke()
  }
  const tex = new THREE.CanvasTexture(cnv)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(1.3, 1.0)
  return tex
}

export default function FrontDesk() {
  const motion = useStore((s) => s.motion)
  const lite = useStore((s) => s.lite)

  const wood = useMemo(() => woodMaps([2, 1]), [])
  const metal = useMemo(() => metalMaps([1, 1]), [])
  const rain = useMemo(makeRain, [])

  // Floor lamp: a downward spot needs an explicit target object on the floor.
  const lampLight = useRef<THREE.SpotLight>(null)
  const lampTarget = useRef<THREE.Object3D>(null)
  useEffect(() => {
    if (lampLight.current && lampTarget.current) lampLight.current.target = lampTarget.current
  }, [])

  const woodMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: wood.map,
        normalMap: wood.normalMap,
        roughnessMap: wood.roughnessMap,
        metalness: 0,
        envMapIntensity: 0.7,
      }),
    [wood],
  )
  const metalMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: metal.map,
        normalMap: metal.normalMap,
        roughnessMap: metal.roughnessMap,
        metalness: 0.9,
        roughness: 0.4,
        envMapIntensity: 1.3,
      }),
    [metal],
  )
  const graphite = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#23262c', roughness: 0.5, metalness: 0.15, envMapIntensity: 0.9 }),
    [],
  )
  // Big-screen cabinet: dark moulded plastic body, near-black screen bezel.
  const cabinetMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#2b2e35', roughness: 0.62, metalness: 0.1, envMapIntensity: 0.7 }),
    [],
  )
  const bezelMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#141519', roughness: 0.4, metalness: 0.2, envMapIntensity: 0.8 }),
    [],
  )
  const cone = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#dcdfe3', roughness: 0.5, metalness: 0.2, side: THREE.DoubleSide }),
    [],
  )
  const woofer = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#0d0e10', roughness: 0.7, metalness: 0.1 }),
    [],
  )
  const glassMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#aebfce',
        roughness: 0.05,
        metalness: 0,
        transparent: true,
        opacity: 0.14,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
        envMapIntensity: 1.6,
      }),
    [],
  )
  const rainMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: rain, transparent: true, opacity: 0.4, depthWrite: false }),
    [rain],
  )
  const ledMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ff9a1f', toneMapped: false }), [])
  const bulbMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffe2b0', toneMapped: false }), [])

  useEffect(
    () => () => {
      disposeMaps(wood)
      disposeMaps(metal)
      rain.dispose()
      woodMat.dispose()
      metalMat.dispose()
      graphite.dispose()
      cabinetMat.dispose()
      bezelMat.dispose()
      cone.dispose()
      woofer.dispose()
      glassMat.dispose()
      rainMat.dispose()
      ledMat.dispose()
      bulbMat.dispose()
    },
    [wood, metal, rain, woodMat, metalMat, graphite, cabinetMat, bezelMat, cone, woofer, glassMat, rainMat, ledMat, bulbMat],
  )

  useFrame((_, dt) => {
    if (!motion || lite) return
    // Soft, slow drizzle drift over the glass (base haze).
    rain.offset.y = (rain.offset.y - dt * 0.5) % 1
  })

  const z = (out: number) => -HS + out

  return (
    <group>
      {/* ── Window: a real opening (punched in Room.tsx) dressed with casing,
          mullions, glass + a drizzle haze overlay, looking onto the outdoor
          diorama (sky, 3D trees, falling rain, runny drips) in the slab behind. ── */}
      {/* Casing trim around the opening (warm wood, left un-blackened per scope) */}
      <mesh position={[0, WIN_Y + WIN_H / 2, z(0.07)]} material={woodMat} castShadow>
        <boxGeometry args={[WIN_W + 0.18, 0.09, 0.12]} />
      </mesh>
      <mesh position={[0, WIN_Y - WIN_H / 2, z(0.08)]} material={woodMat} castShadow>
        <boxGeometry args={[WIN_W + 0.24, 0.12, 0.16]} />
      </mesh>
      <mesh position={[-WIN_W / 2, WIN_Y, z(0.07)]} material={woodMat} castShadow>
        <boxGeometry args={[0.09, WIN_H + 0.18, 0.12]} />
      </mesh>
      <mesh position={[WIN_W / 2, WIN_Y, z(0.07)]} material={woodMat} castShadow>
        <boxGeometry args={[0.09, WIN_H + 0.18, 0.12]} />
      </mesh>
      {/* Mullion cross */}
      <mesh position={[0, WIN_Y, z(0.04)]} material={woodMat}>
        <boxGeometry args={[0.05, WIN_H, 0.04]} />
      </mesh>
      <mesh position={[0, WIN_Y, z(0.04)]} material={woodMat}>
        <boxGeometry args={[WIN_W, 0.05, 0.04]} />
      </mesh>
      {/* Glass pane seated in the opening */}
      <mesh position={[0, WIN_Y, z(0.0)]} material={glassMat}>
        <planeGeometry args={[WIN_W, WIN_H]} />
      </mesh>
      {/* Drizzle haze drifting over the glass */}
      <mesh position={[0, WIN_Y, z(0.055)]} material={rainMat}>
        <planeGeometry args={[WIN_W, WIN_H]} />
      </mesh>
      {/* Outdoor scene in the negative-z slab behind the opening */}
      <WindowDiorama />

      {/* ── Big rear-projection TV cabinet (floor-standing) ── */}
      {/* Cabinet body: bottom on the floor (-0.78), back against the wall. */}
      <mesh position={[0, 0.22, z(0.34)]} material={cabinetMat} castShadow receiveShadow>
        <boxGeometry args={[2.2, 2.0, 0.64]} />
      </mesh>
      {/* Recessed top trim */}
      <mesh position={[0, 1.235, z(0.36)]} material={bezelMat}>
        <boxGeometry args={[2.24, 0.06, 0.6]} />
      </mesh>
      {/* Screen bezel */}
      <mesh position={[0, 0.42, z(0.68)]} material={bezelMat} castShadow>
        <boxGeometry args={[TV_SCREEN[0] + 0.18, TV_SCREEN[1] + 0.18, 0.06]} />
      </mesh>
      {/* Self-lit screen (idle logo / project channel) */}
      <Monitor position={TV_POS} />
      {/* Speaker grille below the screen */}
      <mesh position={[0, -0.5, z(0.685)]} material={woofer}>
        <boxGeometry args={[1.96, 0.34, 0.04]} />
      </mesh>
      {[-0.62, 0.62].map((gx) => (
        <mesh key={gx} position={[gx, -0.5, z(0.71)]} rotation-x={Math.PI / 2} material={cabinetMat}>
          <cylinderGeometry args={[0.12, 0.12, 0.012, 24]} />
        </mesh>
      ))}
      {/* Power LED */}
      <mesh position={[0.82, -0.66, z(0.71)]} material={ledMat}>
        <boxGeometry args={[0.03, 0.03, 0.01]} />
      </mesh>

      {/* ── Floor-standing tower speakers, flanking the cabinet ── */}
      {[-1.55, 1.55].map((sx) => (
        <group key={sx} position={[sx, -0.28, z(0.45)]}>
          <mesh material={graphite} castShadow receiveShadow>
            <boxGeometry args={[0.36, 1.0, 0.34]} />
          </mesh>
          {/* woofer + tweeter on the front face */}
          <mesh position={[0, -0.18, 0.171]} rotation-x={Math.PI / 2} material={woofer}>
            <cylinderGeometry args={[0.13, 0.13, 0.01, 28]} />
          </mesh>
          <mesh position={[0, 0.18, 0.171]} rotation-x={Math.PI / 2} material={woofer}>
            <cylinderGeometry args={[0.05, 0.05, 0.01, 20]} />
          </mesh>
        </group>
      ))}

      {/* ── Floor lamp in the front-left corner (warm key for Bloom) ── */}
      <group position={[-3.2, 0, z(0.55)]}>
        <mesh position={[0, -0.755, 0]} material={metalMat} castShadow>
          <cylinderGeometry args={[0.18, 0.22, 0.05, 28]} />
        </mesh>
        <mesh position={[0, 0.22, 0]} material={metalMat} castShadow>
          <cylinderGeometry args={[0.022, 0.022, 2.0, 16]} />
        </mesh>
        <mesh position={[0, 1.3, 0]} material={cone}>
          <cylinderGeometry args={[0.12, 0.22, 0.26, 28, 1, true]} />
        </mesh>
        <mesh position={[0, 1.26, 0]} material={bulbMat}>
          <sphereGeometry args={[0.05, 16, 16]} />
        </mesh>
        {/* Downward spot → a soft warm pool on the carpet, not a wall blast. */}
        <spotLight
          ref={lampLight}
          position={[0, 1.24, 0]}
          angle={0.62}
          penumbra={0.5}
          intensity={5}
          distance={5.5}
          decay={2}
          color="#ffc488"
        />
        <object3D ref={lampTarget} position={[0, -0.78, 0]} />
        {/* Faint bulb point so the shade itself glows (tight, won't reach the wall). */}
        <pointLight position={[0, 1.3, 0]} color="#ffe2b0" intensity={0.6} distance={1.1} decay={2} />
      </group>
    </group>
  )
}
