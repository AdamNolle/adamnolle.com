import { useMemo, useEffect } from 'react'
import * as THREE from 'three'
import {
  carpetMaps,
  wallMaps,
  ceilingMaps,
  fabricMaps,
  disposeMaps,
} from '../gfx/textures'
import { HS, FLOOR_Y, CEIL_Y, WALL_H, WALL_T, WIN_Y, WIN_W, WIN_H } from './constants'

/** Room shell with procedural PBR materials (albedo + normal + roughness). */
export default function Room() {
  const carpet = useMemo(() => carpetMaps([6, 6]), [])
  const wall = useMemo(() => wallMaps([3, 2]), [])
  const ceiling = useMemo(() => ceilingMaps([4, 4]), [])
  const rug = useMemo(() => fabricMaps([3, 3]), [])

  useEffect(
    () => () => {
      disposeMaps(carpet)
      disposeMaps(wall)
      disposeMaps(ceiling)
      disposeMaps(rug)
    },
    [carpet, wall, ceiling, rug],
  )

  // Front wall split into four panels framing the window opening.
  const FZ = -HS - 0.1 // front-wall plane (matches the other walls' offset)
  const wallBot = 1 - WALL_H / 2
  const wallTop = 1 + WALL_H / 2
  const winL = -WIN_W / 2
  const winB = WIN_Y - WIN_H / 2
  const winT = WIN_Y + WIN_H / 2
  const sideW = HS + winL // width of each side panel (HS - WIN_W/2)
  const frontPanels: { pos: [number, number, number]; size: [number, number, number] }[] = [
    // below the sill (full width)
    { pos: [0, (wallBot + winB) / 2, FZ], size: [HS * 2, winB - wallBot, WALL_T] },
    // above the head (full width)
    { pos: [0, (winT + wallTop) / 2, FZ], size: [HS * 2, wallTop - winT, WALL_T] },
    // left jamb
    { pos: [(-HS + winL) / 2, WIN_Y, FZ], size: [sideW, WIN_H, WALL_T] },
    // right jamb
    { pos: [(HS - winL) / 2, WIN_Y, FZ], size: [sideW, WIN_H, WALL_T] },
  ]

  return (
    <group>
      {/* Floor */}
      <mesh rotation-x={-Math.PI / 2} position-y={FLOOR_Y} receiveShadow>
        <planeGeometry args={[HS * 2, HS * 2]} />
        <meshStandardMaterial
          map={carpet.map}
          normalMap={carpet.normalMap}
          roughnessMap={carpet.roughnessMap}
        />
      </mesh>

      {/* Ceiling */}
      <mesh rotation-x={Math.PI / 2} position-y={CEIL_Y}>
        <planeGeometry args={[HS * 2, HS * 2]} />
        <meshStandardMaterial
          map={ceiling.map}
          normalMap={ceiling.normalMap}
          roughnessMap={ceiling.roughnessMap}
        />
      </mesh>

      {/* Walls (boxes; camera sits inside). The FRONT wall is split into four
          panels around the window opening so the diorama behind it shows through
          a real hole (with a reveal on the jambs), not a billboard pasted flat. */}
      {frontPanels.map((p, i) => (
        <mesh key={i} position={p.pos} receiveShadow>
          <boxGeometry args={p.size} />
          <meshStandardMaterial
            map={wall.map}
            normalMap={wall.normalMap}
            roughnessMap={wall.roughnessMap}
          />
        </mesh>
      ))}
      <mesh position={[0, 1, HS + 0.1]} receiveShadow>
        <boxGeometry args={[HS * 2, WALL_H, WALL_T]} />
        <meshStandardMaterial
          map={wall.map}
          normalMap={wall.normalMap}
          roughnessMap={wall.roughnessMap}
        />
      </mesh>
      <mesh position={[HS + 0.1, 1, 0]} receiveShadow>
        <boxGeometry args={[WALL_T, WALL_H, HS * 2]} />
        <meshStandardMaterial
          map={wall.map}
          normalMap={wall.normalMap}
          roughnessMap={wall.roughnessMap}
        />
      </mesh>
      <mesh position={[-HS - 0.1, 1, 0]} receiveShadow>
        <boxGeometry args={[WALL_T, WALL_H, HS * 2]} />
        <meshStandardMaterial
          map={wall.map}
          normalMap={wall.normalMap}
          roughnessMap={wall.roughnessMap}
        />
      </mesh>

      {/* Rug */}
      <mesh rotation-x={-Math.PI / 2} position-y={FLOOR_Y + 0.012} receiveShadow>
        <circleGeometry args={[2.4, 64]} />
        <meshStandardMaterial
          map={rug.map}
          normalMap={rug.normalMap}
          roughnessMap={rug.roughnessMap}
        />
      </mesh>

      <Baseboards />
    </group>
  )
}

/**
 * White-painted baseboard molding along the bottom of all four walls. Each is a
 * flat board plus a slim top cap that protrudes a touch further for a profile.
 * Inner wall faces sit at ±(HS - 0.025); the trim hugs them and rests on the floor.
 */
function Baseboards() {
  const paint = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#eceae3',
        roughness: 0.55,
        metalness: 0,
        envMapIntensity: 0.6,
      }),
    [],
  )
  useEffect(() => () => paint.dispose(), [paint])

  const FACE = HS - 0.025 // inner wall surface
  const H = 0.17 // board height
  const D = 0.04 // protrusion into the room
  const len = HS * 2 - 0.02
  const yMid = FLOOR_Y + H / 2
  const yCap = FLOOR_Y + H

  const boards: { pos: [number, number, number]; size: [number, number, number]; cap: [number, number, number] }[] = [
    { pos: [0, yMid, -FACE + D / 2], size: [len, H, D], cap: [0, yCap, -FACE + D] },
    { pos: [0, yMid, FACE - D / 2], size: [len, H, D], cap: [0, yCap, FACE - D] },
    { pos: [FACE - D / 2, yMid, 0], size: [D, H, len], cap: [FACE - D, yCap, 0] },
    { pos: [-FACE + D / 2, yMid, 0], size: [D, H, len], cap: [-FACE + D, yCap, 0] },
  ]
  return (
    <group>
      {boards.map((b, i) => {
        const horizontal = b.size[0] > b.size[2]
        const capSize: [number, number, number] = horizontal
          ? [len, 0.02, D + 0.015]
          : [D + 0.015, 0.02, len]
        return (
          <group key={i}>
            <mesh position={b.pos} material={paint} receiveShadow castShadow>
              <boxGeometry args={b.size} />
            </mesh>
            <mesh position={b.cap} material={paint} receiveShadow castShadow>
              <boxGeometry args={capSize} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}
