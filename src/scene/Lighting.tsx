import { HS } from './constants'

/**
 * Overcast daytime lighting. The PMREM environment now carries most of the
 * soft fill, so the lights here just add gentle directional form and the one
 * shadow caster. Real tuning happens against the env map, not in isolation.
 */
export default function Lighting() {
  return (
    <>
      <ambientLight color="#7e8aa0" intensity={0.25} />
      <hemisphereLight color="#cdd9e8" groundColor="#5a4c3c" intensity={0.4} />

      {/* Key light from the window side — the only shadow caster. */}
      <directionalLight
        color="#dce6f0"
        intensity={1.5}
        position={[-2, 4.2, -5]}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.5}
        shadow-camera-far={22}
        shadow-camera-left={-HS}
        shadow-camera-right={HS}
        shadow-camera-top={HS}
        shadow-camera-bottom={-HS}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />

      {/* Warm low fill from the opposite corner. */}
      <directionalLight color="#c8d6e8" intensity={0.35} position={[4, 2.6, 4]} />
    </>
  )
}
