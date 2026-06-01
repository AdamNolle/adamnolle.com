import { useMemo, useEffect, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { corkMaps, woodMaps, disposeMaps } from '../../gfx/textures'
import {
  aboutBannerTexture,
  bioCardTexture,
  statsCardTexture,
  contactCardTexture,
  polaroidTexture,
} from '../../gfx/about'
import { ABOUT } from '../../data/about'
import { useStore } from '../../store'
import { WALL, wp, TAP_THRESHOLD } from '../constants'

/**
 * BACK wall — the ABOUT cork board: a wood-framed cork panel pinned with a
 * banner, a paper bio note, a stats panel, a contact card, and a couple of
 * instant-photos. The bio and contact cards open the canonical reader dialog;
 * everything is drawn from the shared `ABOUT` record.
 */
function Pinned({
  texture,
  w,
  h,
  position,
  ry,
  pin,
  tiltZ = 0,
  onActivate,
}: {
  texture: THREE.Texture
  w: number
  h: number
  position: [number, number, number]
  ry: number
  pin?: string
  tiltZ?: number
  onActivate?: () => void
}) {
  const grp = useRef<THREE.Group>(null!)
  const hovered = useRef(false)

  useFrame(() => {
    const g = grp.current
    if (!g) return
    const t = onActivate && hovered.current ? 1.05 : 1
    g.scale.x += (t - g.scale.x) * 0.2
    g.scale.y += (t - g.scale.y) * 0.2
  })

  return (
    <group
      ref={grp}
      position={position}
      rotation-y={ry}
      rotation-z={tiltZ}
      onClick={
        onActivate
          ? (e: ThreeEvent<MouseEvent>) => {
              if (e.delta > TAP_THRESHOLD) return
              e.stopPropagation()
              onActivate()
            }
          : undefined
      }
      onPointerOver={
        onActivate
          ? (e) => {
              e.stopPropagation()
              hovered.current = true
              document.body.style.cursor = 'pointer'
            }
          : undefined
      }
      onPointerOut={
        onActivate
          ? () => {
              hovered.current = false
              document.body.style.cursor = 'auto'
            }
          : undefined
      }
    >
      <mesh castShadow>
        <boxGeometry args={[w, h, 0.02]} />
        <meshStandardMaterial color="#fbf7ec" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0, 0.012]}>
        <planeGeometry args={[w - 0.02, h - 0.02]} />
        <meshStandardMaterial map={texture} roughness={0.85} />
      </mesh>
      {pin && (
        <mesh position={[0, h / 2 - 0.05, 0.05]} castShadow>
          <sphereGeometry args={[0.022, 16, 16]} />
          <meshStandardMaterial
            color={pin}
            metalness={0.3}
            roughness={0.35}
            emissive={pin}
            emissiveIntensity={0.18}
          />
        </mesh>
      )}
    </group>
  )
}

export default function AboutBoard() {
  const openDialog = useStore((s) => s.openDialog)
  const cork = useMemo(() => corkMaps([1, 1]), [])
  const wood = useMemo(() => woodMaps([1, 1]), [])
  useEffect(
    () => () => {
      disposeMaps(cork)
      disposeMaps(wood)
    },
    [cork, wood],
  )

  const banner = useMemo(() => aboutBannerTexture(), [])
  const bio = useMemo(() => bioCardTexture(ABOUT), [])
  const stats = useMemo(() => statsCardTexture(ABOUT), [])
  const contact = useMemo(() => contactCardTexture(), [])
  const poladisc = useMemo(() => polaroidTexture(28, 'vinyl night'), [])
  const polabuild = useMemo(() => polaroidTexture(205, 'the homelab'), [])
  useEffect(
    () => () => {
      ;[banner, bio, stats, contact, poladisc, polabuild].forEach((t) => t.dispose())
    },
    [banner, bio, stats, contact, poladisc, polabuild],
  )

  const ry = WALL.back.ry

  return (
    <group>
      {/* wood frame + cork panel */}
      <mesh position={wp('back', 0, 1.3, 0.1)} rotation-y={ry} castShadow receiveShadow>
        <boxGeometry args={[3.7, 2.7, 0.06]} />
        <meshStandardMaterial map={wood.map} normalMap={wood.normalMap} roughnessMap={wood.roughnessMap} />
      </mesh>
      <mesh position={wp('back', 0, 1.3, 0.13)} rotation-y={ry} receiveShadow>
        <boxGeometry args={[3.4, 2.4, 0.04]} />
        <meshStandardMaterial map={cork.map} normalMap={cork.normalMap} roughnessMap={cork.roughnessMap} />
      </mesh>

      <Pinned texture={banner} w={1.7} h={0.36} position={wp('back', 0, 2.08, 0.16)} ry={ry} />
      <Pinned
        texture={bio}
        w={1.46}
        h={1.4}
        position={wp('back', -0.82, 1.12, 0.17)}
        ry={ry}
        pin="#2bb673"
        onActivate={() => openDialog({ kind: 'about', id: 'about' })}
      />
      <Pinned texture={stats} w={1.04} h={0.9} position={wp('back', 0.86, 1.46, 0.17)} ry={ry} pin="#2e7dff" />
      <Pinned
        texture={contact}
        w={1.04}
        h={0.5}
        position={wp('back', 0.86, 0.66, 0.17)}
        ry={ry}
        pin="#00e1ff"
        onActivate={() => openDialog({ kind: 'contact', id: 'contact' })}
      />
      <Pinned
        texture={poladisc}
        w={0.44}
        h={0.52}
        position={wp('back', 0.12, 1.42, 0.185)}
        ry={ry}
        tiltZ={0.14}
        pin="#d8d2c4"
      />
      <Pinned
        texture={polabuild}
        w={0.44}
        h={0.52}
        position={wp('back', 0.12, 0.74, 0.185)}
        ry={ry}
        tiltZ={-0.11}
        pin="#d8d2c4"
      />
    </group>
  )
}
