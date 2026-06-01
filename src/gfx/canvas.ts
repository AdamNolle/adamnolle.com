import * as THREE from 'three'

export const TEX_SIZE = 1024

export interface Canvas2D {
  cnv: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  size: number
}

export function makeCanvas(size = TEX_SIZE): Canvas2D {
  const cnv = document.createElement('canvas')
  cnv.width = size
  cnv.height = size
  const ctx = cnv.getContext('2d', { willReadFrequently: true })!
  return { cnv, ctx, size }
}

export const clamp255 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v)
export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

/** Small fast deterministic RNG so textures look identical across reloads. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function fillGradient(
  ctx: CanvasRenderingContext2D,
  size: number,
  stops: Array<[number, string]>,
  vertical = true,
) {
  const g = vertical
    ? ctx.createLinearGradient(0, 0, 0, size)
    : ctx.createLinearGradient(0, 0, size, 0)
  for (const [o, c] of stops) g.addColorStop(o, c)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
}

export function fill(ctx: CanvasRenderingContext2D, size: number, color: string) {
  ctx.fillStyle = color
  ctx.fillRect(0, 0, size, size)
}

/** Per-pixel monochrome noise added to the existing image. */
export function grain(
  ctx: CanvasRenderingContext2D,
  size: number,
  rng: () => number,
  amount: number,
) {
  const img = ctx.getImageData(0, 0, size, size)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const n = (rng() * 2 - 1) * amount
    d[i] = clamp255(d[i] + n)
    d[i + 1] = clamp255(d[i + 1] + n)
    d[i + 2] = clamp255(d[i + 2] + n)
  }
  ctx.putImageData(img, 0, 0)
}

/**
 * Directional strokes — wood grain, brushed metal, woven fibers. When `wrap`
 * (default), each stroke is also drawn translated by ±size along its run axis so
 * a streak clipped at one edge reappears on the opposite edge (seamless tiling).
 */
export function streaks(
  ctx: CanvasRenderingContext2D,
  size: number,
  rng: () => number,
  opts: {
    count: number
    color: string
    alpha: number
    vertical?: boolean
    minLen?: number
    maxLen?: number
    minWidth?: number
    maxWidth?: number
    wrap?: boolean
  },
) {
  const {
    count,
    color,
    alpha,
    vertical = false,
    minLen = size * 0.3,
    maxLen = size,
    minWidth = 0.5,
    maxWidth = 2,
    wrap = true,
  } = opts
  const offs = wrap ? [0, -size, size] : [0]
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineCap = 'round'
  for (let i = 0; i < count; i++) {
    ctx.globalAlpha = alpha * (0.4 + rng() * 0.6)
    ctx.lineWidth = minWidth + rng() * (maxWidth - minWidth)
    const len = minLen + rng() * (maxLen - minLen)
    const a = rng() * size
    const b = rng() * size
    // Endpoints (with a touch of cross-axis wander for organic grain).
    const x1 = vertical ? a + (rng() - 0.5) * 8 : a + len
    const y1 = vertical ? b + len : b + (rng() - 0.5) * 8
    for (const o of offs) {
      const ox = vertical ? 0 : o
      const oy = vertical ? o : 0
      ctx.beginPath()
      ctx.moveTo(a + ox, b + oy)
      ctx.lineTo(x1 + ox, y1 + oy)
      ctx.stroke()
    }
  }
  ctx.restore()
}

/**
 * Scattered soft dots — cork granules, carpet flecks, popcorn ceiling. When
 * `wrap` (default), dots near an edge are also stamped on the opposite edge so
 * fleck density is continuous across tile boundaries (seamless tiling).
 */
export function speckle(
  ctx: CanvasRenderingContext2D,
  size: number,
  rng: () => number,
  opts: {
    count: number
    color: (rng: () => number) => string
    minR?: number
    maxR?: number
    alpha?: number
    wrap?: boolean
  },
) {
  const { count, color, minR = 1, maxR = 3, alpha = 1, wrap = true } = opts
  ctx.save()
  for (let i = 0; i < count; i++) {
    ctx.globalAlpha = alpha * (0.5 + rng() * 0.5)
    ctx.fillStyle = color(rng)
    const r = minR + rng() * (maxR - minR)
    const x = rng() * size
    const y = rng() * size
    const xs = [x]
    const ys = [y]
    if (wrap) {
      if (x < r) xs.push(x + size)
      else if (x > size - r) xs.push(x - size)
      if (y < r) ys.push(y + size)
      else if (y > size - r) ys.push(y - size)
    }
    for (const sx of xs)
      for (const sy of ys) {
        ctx.beginPath()
        ctx.arc(sx, sy, r, 0, Math.PI * 2)
        ctx.fill()
      }
  }
  ctx.restore()
}

/**
 * Large soft blobs for low-frequency colour/height mottling. When `wrap`
 * (default), blobs near an edge are also drawn on the opposite edge so the
 * low-frequency variation tiles without a visible seam.
 */
export function mottle(
  ctx: CanvasRenderingContext2D,
  size: number,
  rng: () => number,
  opts: {
    count: number
    color: string
    alpha: number
    minR?: number
    maxR?: number
    wrap?: boolean
  },
) {
  const { count, color, alpha, minR = size * 0.1, maxR = size * 0.35, wrap = true } = opts
  ctx.save()
  ctx.globalAlpha = alpha
  for (let i = 0; i < count; i++) {
    const x = rng() * size
    const y = rng() * size
    const r = minR + rng() * (maxR - minR)
    const xs = [x]
    const ys = [y]
    if (wrap) {
      if (x < r) xs.push(x + size)
      else if (x > size - r) xs.push(x - size)
      if (y < r) ys.push(y + size)
      else if (y > size - r) ys.push(y - size)
    }
    for (const sx of xs)
      for (const sy of ys) {
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r)
        g.addColorStop(0, color)
        g.addColorStop(1, 'transparent')
        ctx.fillStyle = g
        ctx.fillRect(sx - r, sy - r, r * 2, r * 2)
      }
  }
  ctx.restore()
}

export function finishTexture(
  cnv: HTMLCanvasElement,
  opts: {
    colorSpace?: THREE.ColorSpace
    repeat?: [number, number]
    anisotropy?: number
  } = {},
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(cnv)
  tex.colorSpace = opts.colorSpace ?? THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  if (opts.repeat) tex.repeat.set(opts.repeat[0], opts.repeat[1])
  tex.anisotropy = opts.anisotropy ?? 8
  tex.needsUpdate = true
  return tex
}
