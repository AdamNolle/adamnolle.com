import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import type { ThreeElements } from '@react-three/fiber'

/**
 * Shared bitmap-in-3D loader. This is the first place real on-disk images
 * (app logos, posters, stickers) enter the otherwise fully-procedural scene.
 *
 * `useBitmapTexture` wraps drei's `useTexture` and tags the result for correct
 * in-room rendering — sRGB color space (so albedo isn't washed out) and
 * anisotropy 8 (so images stay crisp at grazing angles). It SUSPENDS while the
 * file downloads, so every caller must sit inside a `<Suspense>` boundary; the
 * fallback is where the procedural glyph (see `cards.ts`) stands in until the
 * bitmap is ready, e.g.
 *
 *   <Suspense fallback={<ProceduralGlyph project={p} />}>
 *     <BitmapImage url={logoUrl} width={w} height={h} />
 *   </Suspense>
 */
export function useBitmapTexture(url: string): THREE.Texture {
  const tex = useTexture(url) as THREE.Texture
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

type BitmapImageProps = {
  url: string
  width: number
  height: number
  /**
   * `lit` images use a standard material so they catch room light (posters on a
   * wall); the default is an unlit basic material for crisp decals (stickers,
   * app-icon faces) that read at full contrast regardless of lighting.
   */
  lit?: boolean
  transparent?: boolean
  opacity?: number
} & Omit<ThreeElements['mesh'], 'children'>

/**
 * A single flat textured quad from a bitmap URL. Suspends until loaded. Accepts
 * the usual mesh transform props (position/rotation/scale) so callers can place
 * it anywhere. Shared by the app tiles (WS3) and the poster/sticker spread (WS13).
 */
export function BitmapImage({
  url,
  width,
  height,
  lit = false,
  transparent = true,
  opacity = 1,
  ...mesh
}: BitmapImageProps) {
  const tex = useBitmapTexture(url)
  return (
    <mesh {...mesh}>
      <planeGeometry args={[width, height]} />
      {lit ? (
        <meshStandardMaterial
          map={tex}
          transparent={transparent}
          opacity={opacity}
          roughness={0.82}
          metalness={0}
          side={THREE.DoubleSide}
        />
      ) : (
        <meshBasicMaterial
          map={tex}
          transparent={transparent}
          opacity={opacity}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      )}
    </mesh>
  )
}
