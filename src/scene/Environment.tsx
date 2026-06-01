import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { buildOvercastEnv } from '../gfx/pmrem'

interface Props {
  intensity?: number
  background?: boolean
}

/** Builds the procedural overcast PMREM once and drives scene IBL. */
export default function Environment({ intensity = 1, background = false }: Props) {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)

  useEffect(() => {
    const env = buildOvercastEnv(gl)
    const prevBg = scene.background
    scene.environment = env
    scene.environmentIntensity = intensity
    if (background) scene.background = env
    return () => {
      scene.environment = null
      if (background) scene.background = prevBg
      env.dispose()
    }
  }, [gl, scene, intensity, background])

  return null
}
