import { useMemo, useEffect } from 'react'
import * as THREE from 'three'

/**
 * A potted snake plant — terracotta pot with upright blades. Base at local y=0.
 * Pure greenery to warm a corner.
 */
export default function Plant() {
  const pot = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#a9572f', roughness: 0.85, metalness: 0, envMapIntensity: 0.5 }),
    [],
  )
  const soil = useMemo(() => new THREE.MeshStandardMaterial({ color: '#241a12', roughness: 1 }), [])
  const leafA = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#2f6b34', roughness: 0.7, envMapIntensity: 0.4 }),
    [],
  )
  const leafB = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#3f8a43', roughness: 0.7, envMapIntensity: 0.4 }),
    [],
  )
  useEffect(
    () => () => {
      pot.dispose()
      soil.dispose()
      leafA.dispose()
      leafB.dispose()
    },
    [pot, soil, leafA, leafB],
  )

  const blades = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => {
        const ang = (i / 9) * Math.PI * 2 + Math.random() * 0.3
        const rad = 0.03 + Math.random() * 0.06
        const h = 0.5 + Math.random() * 0.34
        const lean = 0.06 + Math.random() * 0.16
        return {
          x: Math.cos(ang) * rad,
          z: Math.sin(ang) * rad,
          h,
          rotY: ang,
          lean,
          mat: i % 2 ? leafA : leafB,
        }
      }),
    [leafA, leafB],
  )

  return (
    <group>
      {/* pot */}
      <mesh position={[0, 0.12, 0]} material={pot} castShadow receiveShadow>
        <cylinderGeometry args={[0.15, 0.11, 0.24, 24]} />
      </mesh>
      <mesh position={[0, 0.235, 0]} material={pot} castShadow>
        <cylinderGeometry args={[0.16, 0.15, 0.03, 24]} />
      </mesh>
      <mesh position={[0, 0.235, 0]} material={soil}>
        <cylinderGeometry args={[0.14, 0.14, 0.02, 20]} />
      </mesh>

      {/* blades */}
      {blades.map((b, i) => (
        <mesh
          key={i}
          position={[b.x, 0.25 + b.h / 2, b.z]}
          rotation={[b.lean * Math.cos(b.rotY), b.rotY, b.lean * Math.sin(b.rotY)]}
          material={b.mat}
          castShadow
        >
          <coneGeometry args={[0.03, b.h, 4]} />
        </mesh>
      ))}
    </group>
  )
}
