import {
  EffectComposer,
  N8AO,
  Bloom,
  DepthOfField,
  HueSaturation,
  Vignette,
  SMAA,
} from '@react-three/postprocessing'
import { useStore } from '../store'

/**
 * Post stack. Subtle and cinematic.
 *  - lite     → SMAA only (cheap)
 *  - default  → N8AO → Bloom → DoF → grade → vignette → SMAA
 *
 * Bloom is threshold-based (luminanceThreshold ~0.8): only self-lit emissive
 * props (the WWW globe, lamp glow) cross the threshold, so it blooms those
 * naturally without washing out the overcast room.
 */
export default function Post() {
  const lite = useStore((s) => s.lite)

  if (lite) {
    return (
      <EffectComposer enableNormalPass={false}>
        <SMAA />
      </EffectComposer>
    )
  }

  return (
    <EffectComposer enableNormalPass={false} multisampling={0}>
      <N8AO aoRadius={0.7} distanceFalloff={1} intensity={2.2} halfRes />
      <Bloom
        mipmapBlur
        luminanceThreshold={0.8}
        luminanceSmoothing={0.2}
        intensity={0.55}
      />
      <DepthOfField worldFocusDistance={4.4} worldFocusRange={7} bokehScale={2} />
      <HueSaturation saturation={-0.08} />
      <Vignette offset={0.32} darkness={0.5} />
      <SMAA />
    </EffectComposer>
  )
}
