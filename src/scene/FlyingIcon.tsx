import { useMemo, useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { appIconTexture } from '../gfx/cards'
import { getProject } from '../data/projects'
import { useStore } from '../store'
import { TV_POS } from './constants'

/**
 * The Mario-64 "star-get": when an app tile is clicked, it detaches and arcs
 * across the room into the TV — spinning and shrinking into the screen — then
 * tunes the TV to that project's channel. Mounted once; renders only while
 * `flying` is set. Skipped entirely in lite/reduced-motion (the store tunes in
 * instantly instead), so no demand-frame nudging.
 */
const ICON = 0.46
const DURATION = 1100 // ms
const ARC = 0.6 // peak height of the flight arc
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export default function FlyingIcon() {
  const flying = useStore((s) => s.flying)
  const setChannel = useStore((s) => s.setChannel)
  const endFly = useStore((s) => s.endFly)

  const grp = useRef<THREE.Group>(null!)
  const done = useRef(false)

  const project = flying ? getProject(flying.id) : undefined
  const icon = useMemo(() => (project ? appIconTexture(project) : null), [project])
  useEffect(() => () => icon?.dispose(), [icon])

  // Reset the completion latch whenever a new flight begins.
  useEffect(() => {
    done.current = false
  }, [flying?.id, flying?.t0])

  useFrame(() => {
    const g = grp.current
    if (!flying || !g) return
    const p = Math.min(1, Math.max(0, (performance.now() - flying.t0) / DURATION))
    const e = p * p * (3 - 2 * p) // smoothstep ease
    const f = flying.from
    g.position.set(
      lerp(f[0], TV_POS[0], e),
      lerp(f[1], TV_POS[1], e) + Math.sin(p * Math.PI) * ARC,
      lerp(f[2], TV_POS[2], e),
    )
    g.rotation.set(p * Math.PI * 2, p * Math.PI * 6, 0)
    g.scale.setScalar(lerp(1, 0.06, e))

    if (p >= 1 && !done.current) {
      done.current = true
      setChannel(flying.id)
      endFly()
    }
  })

  if (!flying || !icon) return null

  return (
    <group ref={grp} position={flying.from}>
      <RoundedBox args={[ICON, ICON, 0.08]} radius={0.05} smoothness={4}>
        <meshStandardMaterial color="#0d0f14" roughness={0.5} metalness={0.15} envMapIntensity={1} />
      </RoundedBox>
      <mesh position={[0, 0, 0.042]}>
        <planeGeometry args={[ICON - 0.04, ICON - 0.04]} />
        <meshBasicMaterial map={icon} transparent toneMapped={false} />
      </mesh>
    </group>
  )
}
