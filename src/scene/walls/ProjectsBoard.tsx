import { useMemo, useEffect, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { corkMaps, woodMaps, disposeMaps } from '../../gfx/textures'
import { projectCardTexture } from '../../gfx/cards'
import { PROJECTS, type Project } from '../../data/projects'
import { useStore } from '../../store'
import { WALL, wp, TAP_THRESHOLD } from '../constants'

/**
 * RIGHT wall — the PROJECTS cork board: a wood-framed cork panel with the nine
 * projects pinned as index cards. Each card raycasts to open its dialog; the
 * cork/wood are shared PBR maps built once.
 */
function Card({
  project,
  position,
  ry,
}: {
  project: Project
  position: [number, number, number]
  ry: number
}) {
  const openDialog = useStore((s) => s.openDialog)
  const grp = useRef<THREE.Group>(null!)
  const hovered = useRef(false)
  const face = useMemo(() => projectCardTexture(project), [project])
  useEffect(() => () => face.dispose(), [face])

  useFrame(() => {
    const g = grp.current
    if (!g) return
    const t = hovered.current ? 1.06 : 1
    g.scale.x += (t - g.scale.x) * 0.2
    g.scale.y += (t - g.scale.y) * 0.2
  })

  return (
    <group
      ref={grp}
      position={position}
      rotation-y={ry}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        if (e.delta > TAP_THRESHOLD) return
        e.stopPropagation()
        openDialog({ kind: 'project', id: project.id })
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        hovered.current = true
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        hovered.current = false
        document.body.style.cursor = 'auto'
      }}
    >
      <mesh castShadow>
        <boxGeometry args={[0.8, 0.6, 0.02]} />
        <meshStandardMaterial color="#fbf7ec" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0, 0.012]}>
        <planeGeometry args={[0.78, 0.585]} />
        <meshStandardMaterial map={face} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.245, 0.045]} castShadow>
        <sphereGeometry args={[0.022, 16, 16]} />
        <meshStandardMaterial
          color={project.color}
          metalness={0.3}
          roughness={0.35}
          emissive={project.color}
          emissiveIntensity={0.18}
        />
      </mesh>
    </group>
  )
}

export default function ProjectsBoard() {
  const cork = useMemo(() => corkMaps([1, 1]), [])
  const wood = useMemo(() => woodMaps([1, 1]), [])
  useEffect(
    () => () => {
      disposeMaps(cork)
      disposeMaps(wood)
    },
    [cork, wood],
  )

  const ry = WALL.right.ry
  const cols = [1.15, 0, -1.15] // world +z … −z along the wall
  const rows = [2.0, 1.3, 0.6]

  return (
    <group>
      <mesh position={wp('right', 0, 1.3, 0.1)} rotation-y={ry} castShadow receiveShadow>
        <boxGeometry args={[3.7, 2.7, 0.06]} />
        <meshStandardMaterial map={wood.map} normalMap={wood.normalMap} roughnessMap={wood.roughnessMap} />
      </mesh>
      <mesh position={wp('right', 0, 1.3, 0.13)} rotation-y={ry} receiveShadow>
        <boxGeometry args={[3.4, 2.4, 0.04]} />
        <meshStandardMaterial map={cork.map} normalMap={cork.normalMap} roughnessMap={cork.roughnessMap} />
      </mesh>

      {PROJECTS.map((p, i) => (
        <Card
          key={p.id}
          project={p}
          position={wp('right', cols[i % 3], rows[Math.floor(i / 3)], 0.17)}
          ry={ry}
        />
      ))}
    </group>
  )
}
