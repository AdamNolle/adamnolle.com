import * as THREE from 'three'
import {
  makeCanvas,
  fill,
  fillGradient,
  grain,
  streaks,
  speckle,
  mottle,
  mulberry32,
  finishTexture,
  TEX_SIZE,
  type Canvas2D,
} from './canvas'
import { sobelNormal, roughnessFromHeight, aoSampler } from './deriveMaps'

export interface MaterialMaps {
  map: THREE.CanvasTexture
  normalMap: THREE.CanvasTexture
  roughnessMap: THREE.CanvasTexture
}

export function disposeMaps(m: MaterialMaps) {
  m.map.dispose()
  m.normalMap.dispose()
  m.roughnessMap.dispose()
}

/** Multiply soft height-derived AO into the albedo (no second UV set needed). */
function bakeAO(albedo: Canvas2D, height: Canvas2D, strength: number) {
  const ao = aoSampler(height, strength)
  const { ctx, size } = albedo
  const img = ctx.getImageData(0, 0, size, size)
  const d = img.data
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const m = ao(x, y)
      const i = (y * size + x) * 4
      d[i] *= m
      d[i + 1] *= m
      d[i + 2] *= m
    }
  }
  ctx.putImageData(img, 0, 0)
}

/** Regular woven grid for fabric. */
function weave(
  ctx: CanvasRenderingContext2D,
  size: number,
  spacing: number,
  colorH: string,
  colorV: string,
  alpha: number,
  width: number,
) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.lineWidth = width
  ctx.strokeStyle = colorH
  for (let y = spacing / 2; y < size; y += spacing) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(size, y)
    ctx.stroke()
  }
  ctx.strokeStyle = colorV
  for (let x = spacing / 2; x < size; x += spacing) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, size)
    ctx.stroke()
  }
  ctx.restore()
}

// ── Carpet (floor) ─────────────────────────────────────────────────────────
export function carpetMaps(repeat: [number, number] = [6, 6]): MaterialMaps {
  const size = TEX_SIZE
  const a = makeCanvas(size)
  const rngA = mulberry32(1011)
  // Flat cream base (no gradient) so the [6,6] tiling leaves no horizontal band.
  fill(a.ctx, size, '#ddd2bd')
  speckle(a.ctx, size, rngA, {
    count: 9000,
    color: (r) => (r() > 0.5 ? '#e9e0cf' : '#c7bca3'),
    minR: 0.6,
    maxR: 1.6,
    alpha: 0.42,
  })
  grain(a.ctx, size, rngA, 10)

  const h = makeCanvas(size)
  const rngH = mulberry32(1017)
  fill(h.ctx, size, '#808080')
  speckle(h.ctx, size, rngH, {
    count: 12000,
    color: (r) => (r() > 0.5 ? '#b8b8b8' : '#5a5a5a'),
    minR: 0.6,
    maxR: 1.6,
    alpha: 0.6,
  })
  grain(h.ctx, size, rngH, 22)

  bakeAO(a, h, 0.35)
  return {
    map: finishTexture(a.cnv, { repeat }),
    normalMap: sobelNormal(h, 1.4, repeat),
    roughnessMap: roughnessFromHeight(h, 0.94, 0.08, false, repeat),
  }
}

// ── Drywall / painted wall ───────────────────────────────────────────────────
export function wallMaps(repeat: [number, number] = [3, 2]): MaterialMaps {
  const size = TEX_SIZE
  const a = makeCanvas(size)
  const rngA = mulberry32(2027)
  // Flat warm-beige base (no gradient) so the [3,2] tiling leaves no seam.
  fill(a.ctx, size, '#d4c8ad')
  mottle(a.ctx, size, rngA, { count: 10, color: '#ddd2ba', alpha: 0.05 })
  grain(a.ctx, size, rngA, 6)

  const h = makeCanvas(size)
  const rngH = mulberry32(2099)
  fill(h.ctx, size, '#8a8a8a')
  // Fine orange-peel only — high-frequency detail hides repetition.
  speckle(h.ctx, size, rngH, {
    count: 16000,
    color: (r) => (r() > 0.5 ? '#a0a0a0' : '#707070'),
    minR: 0.7,
    maxR: 1.8,
    alpha: 0.45,
  })
  grain(h.ctx, size, rngH, 10)

  bakeAO(a, h, 0.15)
  return {
    map: finishTexture(a.cnv, { repeat }),
    normalMap: sobelNormal(h, 0.9, repeat),
    roughnessMap: roughnessFromHeight(h, 0.86, 0.12, false, repeat),
  }
}

// ── Ceiling (light plaster / popcorn) ────────────────────────────────────────
export function ceilingMaps(repeat: [number, number] = [4, 4]): MaterialMaps {
  const size = TEX_SIZE
  const a = makeCanvas(size)
  const rngA = mulberry32(3031)
  // Flat white base (no gradient) so the [4,4] tiling leaves no seam.
  fill(a.ctx, size, '#ffffff')
  speckle(a.ctx, size, rngA, {
    count: 18000,
    color: (r) => (r() > 0.5 ? '#f6f7f3' : '#dadcd6'),
    minR: 1.2,
    maxR: 3.2,
    alpha: 0.5,
  })
  grain(a.ctx, size, rngA, 5)

  const h = makeCanvas(size)
  const rngH = mulberry32(3037)
  // Chunky popcorn stipple — the bumpy normal is what reads as "popcorn".
  fill(h.ctx, size, '#6a6a6a')
  speckle(h.ctx, size, rngH, {
    count: 18000,
    color: () => '#d4d4d4',
    minR: 1.4,
    maxR: 3.8,
    alpha: 0.6,
  })
  grain(h.ctx, size, rngH, 8)

  bakeAO(a, h, 0.32)
  return {
    map: finishTexture(a.cnv, { repeat }),
    normalMap: sobelNormal(h, 2.4, repeat),
    roughnessMap: roughnessFromHeight(h, 0.96, 0.05, false, repeat),
  }
}

// ── Woven fabric (rug) ───────────────────────────────────────────────────────
export function fabricMaps(
  repeat: [number, number] = [3, 3],
  baseColor = '#3a2c4a',
): MaterialMaps {
  const size = TEX_SIZE
  const a = makeCanvas(size)
  const rngA = mulberry32(4041)
  fill(a.ctx, size, baseColor)
  weave(a.ctx, size, 16, '#4a3a5e', '#2e2238', 0.5, 4)
  weave(a.ctx, size, 16, '#54466a', '#241a2e', 0.25, 1.5)
  grain(a.ctx, size, rngA, 12)

  const h = makeCanvas(size)
  const rngH = mulberry32(4049)
  fill(h.ctx, size, '#808080')
  weave(h.ctx, size, 16, '#c0c0c0', '#505050', 0.6, 4)
  grain(h.ctx, size, rngH, 16)

  bakeAO(a, h, 0.4)
  return {
    map: finishTexture(a.cnv, { repeat }),
    normalMap: sobelNormal(h, 1.6, repeat),
    roughnessMap: roughnessFromHeight(h, 0.9, 0.1, false, repeat),
  }
}

// ── Lacquered wood (desk, shelves, disc cases) ───────────────────────────────
export function woodMaps(repeat: [number, number] = [2, 1]): MaterialMaps {
  const size = TEX_SIZE
  const a = makeCanvas(size)
  const rngA = mulberry32(5051)
  // Flat mid wood tone (no gradient); the wrapping streaks supply the grain so
  // the map tiles cleanly at [2,2] / [2,1] with no banding at the seam.
  fill(a.ctx, size, '#6e4a2c')
  streaks(a.ctx, size, rngA, {
    count: 1400,
    color: '#4a3018',
    alpha: 0.1,
    vertical: false,
    minLen: size * 0.5,
    maxLen: size,
    minWidth: 0.5,
    maxWidth: 2.5,
  })
  streaks(a.ctx, size, rngA, {
    count: 600,
    color: '#8a6440',
    alpha: 0.06,
    vertical: false,
    minLen: size * 0.5,
    maxLen: size,
    minWidth: 0.5,
    maxWidth: 1.5,
  })
  grain(a.ctx, size, rngA, 8)

  const h = makeCanvas(size)
  const rngH = mulberry32(5059)
  fill(h.ctx, size, '#888888')
  streaks(h.ctx, size, rngH, {
    count: 1400,
    color: '#5a5a5a',
    alpha: 0.25,
    vertical: false,
    minLen: size * 0.5,
    maxLen: size,
    minWidth: 0.5,
    maxWidth: 2.5,
  })
  streaks(h.ctx, size, rngH, {
    count: 600,
    color: '#b0b0b0',
    alpha: 0.15,
    vertical: false,
    minLen: size * 0.5,
    maxLen: size,
    minWidth: 0.5,
    maxWidth: 1.5,
  })
  grain(h.ctx, size, rngH, 10)

  bakeAO(a, h, 0.25)
  return {
    map: finishTexture(a.cnv, { repeat }),
    normalMap: sobelNormal(h, 1.6, repeat),
    roughnessMap: roughnessFromHeight(h, 0.45, 0.3, true, repeat),
  }
}

// ── Cork (projects board) ────────────────────────────────────────────────────
export function corkMaps(repeat: [number, number] = [1, 1]): MaterialMaps {
  const size = TEX_SIZE
  const a = makeCanvas(size)
  const rngA = mulberry32(6061)
  fillGradient(a.ctx, size, [
    [0, '#c2a35e'],
    [1, '#b08f4c'],
  ])
  speckle(a.ctx, size, rngA, {
    count: 26000,
    color: (r) => {
      const t = r()
      return t < 0.33 ? '#8f6f3a' : t < 0.66 ? '#d8b86a' : '#a78340'
    },
    minR: 1.2,
    maxR: 4.5,
    alpha: 0.7,
  })
  grain(a.ctx, size, rngA, 10)

  const h = makeCanvas(size)
  const rngH = mulberry32(6067)
  fill(h.ctx, size, '#7a7a7a')
  speckle(h.ctx, size, rngH, {
    count: 26000,
    color: (r) => (r() > 0.5 ? '#c0c0c0' : '#4a4a4a'),
    minR: 1.2,
    maxR: 4.5,
    alpha: 0.7,
  })
  grain(h.ctx, size, rngH, 14)

  bakeAO(a, h, 0.4)
  return {
    map: finishTexture(a.cnv, { repeat }),
    normalMap: sobelNormal(h, 2.4, repeat),
    roughnessMap: roughnessFromHeight(h, 0.9, 0.08, false, repeat),
  }
}

// ── Brushed metal (test sphere, Barq's can base, hardware) ───────────────────
export function metalMaps(repeat: [number, number] = [1, 1]): MaterialMaps {
  const size = TEX_SIZE
  const a = makeCanvas(size)
  const rngA = mulberry32(7071)
  fillGradient(a.ctx, size, [
    [0, '#c6cace'],
    [0.5, '#d2d6da'],
    [1, '#bfc3c8'],
  ])
  streaks(a.ctx, size, rngA, {
    count: 3000,
    color: '#aeb3b9',
    alpha: 0.05,
    vertical: false,
    minLen: size,
    maxLen: size,
    minWidth: 0.5,
    maxWidth: 1.5,
  })
  streaks(a.ctx, size, rngA, {
    count: 1500,
    color: '#e2e6ea',
    alpha: 0.05,
    vertical: false,
    minLen: size,
    maxLen: size,
    minWidth: 0.5,
    maxWidth: 1,
  })
  grain(a.ctx, size, rngA, 4)

  const h = makeCanvas(size)
  const rngH = mulberry32(7079)
  fill(h.ctx, size, '#808080')
  streaks(h.ctx, size, rngH, {
    count: 3000,
    color: '#9a9a9a',
    alpha: 0.12,
    vertical: false,
    minLen: size,
    maxLen: size,
    minWidth: 0.5,
    maxWidth: 1.5,
  })
  grain(h.ctx, size, rngH, 6)

  return {
    map: finishTexture(a.cnv, { repeat }),
    normalMap: sobelNormal(h, 0.6, repeat),
    roughnessMap: roughnessFromHeight(h, 0.32, 0.18, false, repeat),
  }
}
