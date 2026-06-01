import * as THREE from 'three'
import { makeCanvas, finishTexture, clamp01, type Canvas2D } from './canvas'

/**
 * Tangent-space normal map from a grayscale height canvas via a 3x3 Sobel
 * filter. This is what makes procedural surfaces actually catch the light
 * instead of reading as painted-on detail.
 */
export function sobelNormal(
  height: Canvas2D,
  strength = 2,
  repeat?: [number, number],
): THREE.CanvasTexture {
  const { ctx, size } = height
  const src = ctx.getImageData(0, 0, size, size).data
  const out = makeCanvas(size)
  const img = out.ctx.createImageData(size, size)
  const d = img.data

  const H = (x: number, y: number) => {
    x = (x + size) % size
    y = (y + size) % size
    return src[(y * size + x) * 4] / 255
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tl = H(x - 1, y - 1),
        t = H(x, y - 1),
        tr = H(x + 1, y - 1)
      const l = H(x - 1, y),
        r = H(x + 1, y)
      const bl = H(x - 1, y + 1),
        b = H(x, y + 1),
        br = H(x + 1, y + 1)
      const gx = tr + 2 * r + br - (tl + 2 * l + bl)
      const gy = bl + 2 * b + br - (tl + 2 * t + tr)
      let nx = -gx * strength
      let ny = -gy * strength
      let nz = 1
      const len = Math.hypot(nx, ny, nz) || 1
      nx /= len
      ny /= len
      nz /= len
      const i = (y * size + x) * 4
      d[i] = (nx * 0.5 + 0.5) * 255
      d[i + 1] = (ny * 0.5 + 0.5) * 255
      d[i + 2] = (nz * 0.5 + 0.5) * 255
      d[i + 3] = 255
    }
  }
  out.ctx.putImageData(img, 0, 0)
  return finishTexture(out.cnv, { colorSpace: THREE.NoColorSpace, repeat })
}

/**
 * Grayscale roughness map from height: crevices (low height) read rougher.
 * `invert` flips that relationship (e.g. lacquered grooves stay glossy).
 */
export function roughnessFromHeight(
  height: Canvas2D,
  base = 0.7,
  variation = 0.3,
  invert = false,
  repeat?: [number, number],
): THREE.CanvasTexture {
  const { ctx, size } = height
  const src = ctx.getImageData(0, 0, size, size).data
  const out = makeCanvas(size)
  const img = out.ctx.createImageData(size, size)
  const d = img.data
  for (let i = 0; i < src.length; i += 4) {
    let h = src[i] / 255
    if (invert) h = 1 - h
    const rough = clamp01(base + (h - 0.5) * variation)
    const v = rough * 255
    d[i] = v
    d[i + 1] = v
    d[i + 2] = v
    d[i + 3] = 255
  }
  out.ctx.putImageData(img, 0, 0)
  return finishTexture(out.cnv, { colorSpace: THREE.NoColorSpace, repeat })
}

/**
 * Returns a per-pixel AO multiplier [0..1] sampled from a height canvas,
 * used to bake soft occlusion into the albedo (avoids needing a 2nd UV set).
 */
export function aoSampler(height: Canvas2D, strength = 0.5) {
  const { ctx, size } = height
  const src = ctx.getImageData(0, 0, size, size).data
  return (x: number, y: number) => {
    const h = src[(y * size + x) * 4] / 255
    return clamp01(1 - (1 - h) * strength)
  }
}
