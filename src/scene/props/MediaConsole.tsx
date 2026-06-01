import * as THREE from 'three'

/**
 * Low mid-century media credenza. Built with its base at local y=0 and front
 * facing +z; the parent stands it against a wall. The turntable and CD player
 * sit on its top surface (y = TOP).
 */
const LEN = 2.2
const DEPTH = 0.5
const BODY_H = 0.42
const FOOT_H = 0.07
export const TOP = FOOT_H + BODY_H + 0.04 // top surface height

export default function MediaConsole({ woodMat }: { woodMat: THREE.Material }) {
  const bodyY = FOOT_H + BODY_H / 2
  const feet: [number, number][] = [
    [-LEN / 2 + 0.12, -DEPTH / 2 + 0.1],
    [LEN / 2 - 0.12, -DEPTH / 2 + 0.1],
    [-LEN / 2 + 0.12, DEPTH / 2 - 0.1],
    [LEN / 2 - 0.12, DEPTH / 2 - 0.1],
  ]

  return (
    <group>
      {/* body */}
      <mesh position={[0, bodyY, 0]} material={woodMat} castShadow receiveShadow>
        <boxGeometry args={[LEN, BODY_H, DEPTH]} />
      </mesh>
      {/* top with slight overhang */}
      <mesh position={[0, FOOT_H + BODY_H + 0.02, 0]} material={woodMat} castShadow receiveShadow>
        <boxGeometry args={[LEN + 0.06, 0.04, DEPTH + 0.06]} />
      </mesh>

      {/* door seams + handles */}
      {[-LEN / 4, LEN / 4].map((x, i) => (
        <group key={i}>
          <mesh position={[x, bodyY, DEPTH / 2 + 0.001]}>
            <planeGeometry args={[LEN / 2 - 0.08, BODY_H - 0.08]} />
            <meshStandardMaterial color="#3b2c1e" roughness={0.6} metalness={0.05} envMapIntensity={0.5} />
          </mesh>
          <mesh position={[x + (i === 0 ? 0.14 : -0.14), bodyY, DEPTH / 2 + 0.02]} castShadow>
            <cylinderGeometry args={[0.012, 0.012, 0.09, 12]} />
            <meshStandardMaterial color="#cdb27a" metalness={0.9} roughness={0.3} envMapIntensity={1.2} />
          </mesh>
        </group>
      ))}

      {/* tapered feet */}
      {feet.map(([x, z], i) => (
        <mesh key={i} position={[x, FOOT_H / 2, z]} castShadow>
          <cylinderGeometry args={[0.025, 0.035, FOOT_H, 10]} />
          <meshStandardMaterial color="#2a2018" metalness={0.2} roughness={0.6} />
        </mesh>
      ))}
    </group>
  )
}
