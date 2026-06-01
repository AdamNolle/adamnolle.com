import { useMemo, useEffect } from 'react'
import * as THREE from 'three'

/**
 * A single-cutaway electric guitar, built standing with its body base at local
 * y=0 and the face toward +z; the parent leans it into a corner. Gloss-black
 * lacquered body (clearcoat, env-reflective) with chrome hardware, cream
 * humbucker covers, and six strings.
 */
export default function Guitar() {
  const bodyMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#15161a',
        roughness: 0.16,
        metalness: 0.0,
        clearcoat: 1,
        clearcoatRoughness: 0.1,
        envMapIntensity: 1.35,
      }),
    [],
  )
  const chrome = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#cdd2d8', metalness: 1, roughness: 0.25, envMapIntensity: 1.4 }),
    [],
  )
  const dark = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#15100c', roughness: 0.5, metalness: 0.2 }),
    [],
  )
  // Cream humbucker covers — pop against the black body so it reads "electric".
  const cream = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#dcd2b8', roughness: 0.46, metalness: 0.12, envMapIntensity: 0.8 }),
    [],
  )
  // Calmer steel for strings/frets so the thin geometry doesn't sparkle into the bloom.
  const steel = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#9298a0', metalness: 0.55, roughness: 0.55, envMapIntensity: 0.6 }),
    [],
  )
  useEffect(
    () => () => {
      bodyMat.dispose()
      chrome.dispose()
      dark.dispose()
      cream.dispose()
      steel.dispose()
    },
    [bodyMat, chrome, dark, cream, steel],
  )

  const stringMat = steel

  return (
    <group>
      {/* body — squashed disc gives a rounded single-cut silhouette */}
      <group position={[0, 0.24, 0]} scale={[0.92, 1.12, 1]}>
        <mesh rotation-x={Math.PI / 2} material={bodyMat} castShadow receiveShadow>
          <cylinderGeometry args={[0.22, 0.22, 0.055, 48]} />
        </mesh>
      </group>

      {/* humbucker pickups (cream covers) */}
      {[0.20, 0.30].map((y, i) => (
        <mesh key={i} position={[0, y, 0.033]} material={cream} castShadow>
          <boxGeometry args={[0.13, 0.045, 0.022]} />
        </mesh>
      ))}
      {/* bridge + tailpiece */}
      <mesh position={[0, 0.11, 0.034]} material={chrome} castShadow>
        <boxGeometry args={[0.11, 0.02, 0.02]} />
      </mesh>
      {/* knobs */}
      {[
        [0.08, 0.1],
        [0.12, 0.06],
      ].map(([x, y], i) => (
        <mesh key={i} position={[x, y, 0.04]} material={chrome} castShadow>
          <cylinderGeometry args={[0.015, 0.015, 0.012, 16]} />
        </mesh>
      ))}

      {/* neck */}
      <mesh position={[0, 0.62, 0.01]} material={bodyMat} castShadow>
        <boxGeometry args={[0.058, 0.62, 0.03]} />
      </mesh>
      {/* fretboard */}
      <mesh position={[0, 0.62, 0.027]} material={dark} castShadow>
        <boxGeometry args={[0.052, 0.62, 0.008]} />
      </mesh>
      {/* frets */}
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} position={[0, 0.42 + i * 0.06, 0.032]} material={steel}>
          <boxGeometry args={[0.052, 0.003, 0.004]} />
        </mesh>
      ))}

      {/* headstock (slightly back-angled) */}
      <mesh position={[0, 0.97, 0.0]} rotation-x={0.18} material={bodyMat} castShadow>
        <boxGeometry args={[0.075, 0.16, 0.022]} />
      </mesh>
      {/* tuning pegs */}
      {[-0.03, 0.03].flatMap((x, xi) =>
        [0.93, 0.99, 1.05].map((y, yi) => (
          <mesh key={`${xi}-${yi}`} position={[x, y, 0.03]} rotation-z={Math.PI / 2} material={chrome} castShadow>
            <cylinderGeometry args={[0.008, 0.008, 0.03, 10]} />
          </mesh>
        )),
      )}

      {/* strings */}
      {Array.from({ length: 6 }, (_, i) => {
        const x = -0.022 + i * 0.0088
        return (
          <mesh key={i} position={[x, 0.55, 0.036]} material={stringMat}>
            <cylinderGeometry args={[0.0017, 0.0017, 0.92, 6]} />
          </mesh>
        )
      })}
    </group>
  )
}
