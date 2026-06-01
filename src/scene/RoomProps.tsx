import { useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { woodMaps, disposeMaps } from '../gfx/textures'
import { FLOOR_Y, HS } from './constants'
import Bookshelf from './props/Bookshelf'
import Guitar from './props/Guitar'
import MediaConsole, { TOP as CONSOLE_TOP } from './props/MediaConsole'
import Turntable from './props/Turntable'
import CDPlayer from './props/CDPlayer'
import Plant from './props/Plant'

/**
 * Floor-standing hobby props, placed around the room below the wall "pages":
 * a bookshelf and guitar flanking the ABOUT wall, a media credenza with a
 * turntable + CD changer under the DISCS shelf, and a plant in a corner. Wood
 * maps are built once here and shared by the wooden pieces.
 */
export default function RoomProps() {
  const wood = useMemo(() => woodMaps([2, 2]), [])
  const woodMat = useMemo(
    () =>
      // Black lacquer: the wood normal/roughness maps survive for subtle grain
      // relief + satin variation, but a near-black tint + low roughness + a touch
      // of metalness and stronger env reflections read as premium, not flat.
      new THREE.MeshStandardMaterial({
        map: wood.map,
        normalMap: wood.normalMap,
        roughnessMap: wood.roughnessMap,
        color: '#16181c',
        roughness: 0.35,
        metalness: 0.22,
        envMapIntensity: 1.2,
      }),
    [wood],
  )
  useEffect(
    () => () => {
      disposeMaps(wood)
      woodMat.dispose()
    },
    [wood, woodMat],
  )

  return (
    <group>
      {/* ABOUT wall (back): bookshelf left, guitar right */}
      <group position={[-3.2, FLOOR_Y + 0.95, HS - 0.28]} rotation-y={Math.PI}>
        <Bookshelf woodMat={woodMat} />
      </group>
      <group position={[3.2, FLOOR_Y, 3.9]} rotation-y={Math.PI + 0.62}>
        <group rotation-x={-0.1} scale={1.08}>
          <Guitar />
        </group>
      </group>

      {/* DISCS wall (left): media credenza + players */}
      <group position={[-HS + 0.34, FLOOR_Y, 0]} rotation-y={Math.PI / 2}>
        <MediaConsole woodMat={woodMat} />
        <group position={[-0.62, CONSOLE_TOP, 0]}>
          <Turntable />
        </group>
        <group position={[0.62, CONSOLE_TOP, 0]}>
          <CDPlayer />
        </group>
      </group>

      {/* corner greenery */}
      <group position={[4.2, FLOOR_Y, -4.0]}>
        <Plant />
      </group>
    </group>
  )
}
