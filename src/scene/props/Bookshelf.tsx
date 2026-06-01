import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { BOOKS } from '../../data/books'

/**
 * A wood bookcase whose spines are one InstancedMesh (one draw call for the
 * whole library). Built centered at the origin, front opening facing +z; the
 * parent positions/rotates it against a wall. Spine colours/sizes come from
 * the shared BOOKS record so the real reading list drives the look.
 */
const W = 1.4
const H = 1.9
const D = 0.34
const T = 0.05 // panel thickness

interface Placement {
  x: number
  y: number
  z: number
  w: number
  h: number
  d: number
  tilt: number
  color: THREE.Color
}

export default function Bookshelf({ woodMat }: { woodMat: THREE.Material }) {
  const ref = useRef<THREE.InstancedMesh>(null!)

  // Shelf floor heights (book bases) inside the case.
  const floors = useMemo(() => {
    const innerB = -H / 2 + T
    const innerT = H / 2 - T
    const span = innerT - innerB
    const pitch = span / 3
    return [innerB + 0.01, innerB + pitch, innerB + 2 * pitch]
  }, [])

  const placements = useMemo<Placement[]>(() => {
    const out: Placement[] = []
    const xMax = W / 2 - T - 0.02
    let shelf = 0
    let x = -xMax
    for (const b of BOOKS) {
      const w = 0.04 + 0.022 * (b.thick ?? 1)
      const h = 0.46 * (b.tall ?? 1)
      if (x + w > xMax && shelf < floors.length - 1) {
        shelf++
        x = -xMax
      }
      if (shelf >= floors.length) break
      const tilt = Math.random() < 0.12 ? (Math.random() - 0.5) * 0.16 : 0
      out.push({
        x: x + w / 2,
        y: floors[shelf] + h / 2,
        z: D / 2 - 0.12,
        w,
        h,
        d: 0.21,
        tilt,
        color: new THREE.Color(b.color),
      })
      x += w + 0.006
    }
    return out
  }, [floors])

  useLayoutEffect(() => {
    const mesh = ref.current
    const dummy = new THREE.Object3D()
    placements.forEach((p, i) => {
      dummy.position.set(p.x, p.y, p.z)
      dummy.scale.set(p.w, p.h, p.d)
      dummy.rotation.set(0, 0, p.tilt)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      mesh.setColorAt(i, p.color)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [placements])

  const innerShelfYs = [floors[1] - T / 2 - 0.005, floors[2] - T / 2 - 0.005]

  return (
    <group>
      {/* carcass */}
      <mesh position={[0, 0, -D / 2 + T / 2]} material={woodMat} castShadow receiveShadow>
        <boxGeometry args={[W, H, T]} />
      </mesh>
      <mesh position={[-W / 2 + T / 2, 0, 0]} material={woodMat} castShadow receiveShadow>
        <boxGeometry args={[T, H, D]} />
      </mesh>
      <mesh position={[W / 2 - T / 2, 0, 0]} material={woodMat} castShadow receiveShadow>
        <boxGeometry args={[T, H, D]} />
      </mesh>
      <mesh position={[0, H / 2 - T / 2, 0]} material={woodMat} castShadow receiveShadow>
        <boxGeometry args={[W, T, D]} />
      </mesh>
      <mesh position={[0, -H / 2 + T / 2, 0]} material={woodMat} castShadow receiveShadow>
        <boxGeometry args={[W, T, D]} />
      </mesh>
      {innerShelfYs.map((y, i) => (
        <mesh key={i} position={[0, y, 0]} material={woodMat} castShadow receiveShadow>
          <boxGeometry args={[W - 2 * T, T, D - 0.02]} />
        </mesh>
      ))}

      {/* books — one instanced draw call */}
      <instancedMesh ref={ref} args={[undefined, undefined, placements.length]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.72} metalness={0.02} envMapIntensity={0.6} />
      </instancedMesh>
    </group>
  )
}
