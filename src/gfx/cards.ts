import * as THREE from 'three'
import type { Project, IconMotif } from '../data/projects'

/**
 * Canvas factories for the two project surfaces: a landscape index-card pinned
 * to the cork board (right wall) and a portrait jewel-case cover on the disc
 * shelf (left wall). Both are drawn from the same Project record so the two
 * walls never drift out of sync.
 */
function rr(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath()
  c.moveTo(x + r, y)
  c.arcTo(x + w, y, x + w, y + h, r)
  c.arcTo(x + w, y + h, x, y + h, r)
  c.arcTo(x, y + h, x, y, r)
  c.arcTo(x, y, x + w, y, r)
  c.closePath()
}

function wrap(
  c: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lineH: number,
  maxLines: number,
): number {
  const words = text.split(' ')
  let line = ''
  let n = 0
  for (let i = 0; i < words.length; i++) {
    const test = line ? line + ' ' + words[i] : words[i]
    if (c.measureText(test).width > maxW && line) {
      c.fillText(line, x, y)
      y += lineH
      n++
      line = words[i]
      if (n >= maxLines - 1) {
        // last allowed line — emit the remainder, ellipsized if needed
        let rest = words.slice(i).join(' ')
        while (c.measureText(rest + '…').width > maxW && rest.length) {
          rest = rest.slice(0, -1)
        }
        c.fillText(rest + (words.slice(i).join(' ') !== rest ? '…' : ''), x, y)
        return y
      }
    } else {
      line = test
    }
  }
  if (line) c.fillText(line, x, y)
  return y
}

export function tex(cnv: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(cnv)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

/** "#RRGGBB" → "rgba(r,g,b,a)" (kept in sRGB bytes for a canvas 2D context). */
function rgba(hex: string, a: number): string {
  const n = parseInt(hex.replace('#', ''), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

/**
 * Soft radial glow sprite (bright core → transparent edge) for the billboard
 * halos behind the floating logo and the Apps-wall tiles. Meant to be used on an
 * additive, depth-write-off plane so it reads as light, not a disc.
 */
export function haloTexture(color: string, inner = 0.55): THREE.CanvasTexture {
  const S = 256
  const cnv = document.createElement('canvas')
  cnv.width = S
  cnv.height = S
  const c = cnv.getContext('2d')!
  const hex = `#${new THREE.Color(color).getHexString()}`
  const g = c.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
  g.addColorStop(0, rgba(hex, inner))
  g.addColorStop(0.45, rgba(hex, inner * 0.45))
  g.addColorStop(1, rgba(hex, 0))
  c.fillStyle = g
  c.fillRect(0, 0, S, S)
  return tex(cnv)
}

/** Landscape index card for the cork board. */
export function projectCardTexture(p: Project): THREE.CanvasTexture {
  const W = 640
  const H = 480
  const cnv = document.createElement('canvas')
  cnv.width = W
  cnv.height = H
  const c = cnv.getContext('2d')!

  // Cream paper.
  const g = c.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#f6f1e6')
  g.addColorStop(1, '#e9e1d0')
  c.fillStyle = g
  c.fillRect(0, 0, W, H)

  // Accent header band.
  c.fillStyle = p.color
  c.fillRect(0, 0, W, 116)
  c.fillStyle = 'rgba(0,0,0,0.16)'
  c.fillRect(0, 112, W, 4)

  c.textBaseline = 'alphabetic'
  c.textAlign = 'left'
  c.fillStyle = '#0d1116'
  c.font = 'bold 56px system-ui, Arial, sans-serif'
  c.fillText(p.title, 36, 78)

  // Stack pill.
  c.font = '600 26px ui-monospace, "Consolas", monospace'
  const sw = c.measureText(p.stack).width + 36
  c.fillStyle = 'rgba(13,17,22,0.08)'
  rr(c, 36, 150, sw, 46, 23)
  c.fill()
  c.fillStyle = '#2a2f36'
  c.fillText(p.stack, 54, 181)

  // Blurb.
  c.fillStyle = '#3a4048'
  c.font = '30px system-ui, Arial, sans-serif'
  wrap(c, p.blurb, 36, 246, W - 72, 40, 5)

  // Footer.
  c.fillStyle = p.color
  c.font = '600 26px ui-monospace, "Consolas", monospace'
  c.fillText('▸ open', 36, H - 30)

  if (p.flagship) {
    c.fillStyle = '#0d1116'
    c.font = '28px system-ui, Arial, sans-serif'
    c.textAlign = 'right'
    c.fillText('★ FLAGSHIP', W - 30, 74)
  }

  return tex(cnv)
}

/** Hit/draw geometry (canvas pixels) for the TV "channel" screen — shared so the
 *  drawn buttons and the UV hit-test in <Monitor> can never drift apart. */
export const CHANNEL_CANVAS = { W: 2048, H: 1536 }
const CH_PAD = 80
const CH_BTN_H = 190
const CH_BTN_Y = CHANNEL_CANVAS.H - 90 - CH_BTN_H
const CH_BTN_W = (CHANNEL_CANVAS.W - CH_PAD * 2 - 48) / 2
export const CHANNEL_HIT = {
  open: { x: CH_PAD, y: CH_BTN_Y, w: CH_BTN_W, h: CH_BTN_H },
  eject: { x: CH_PAD + CH_BTN_W + 48, y: CH_BTN_Y, w: CH_BTN_W, h: CH_BTN_H },
}

/** Retro CRT "channel" — the detail view that loads onto the big TV per project. */
export function channelTexture(p: Project): THREE.CanvasTexture {
  const { W, H } = CHANNEL_CANVAS
  // FileID shows its gold-on-black brand here too; all others stay phosphor-green.
  const fid = p.id === 'fileid'
  const cnv = document.createElement('canvas')
  cnv.width = W
  cnv.height = H
  const c = cnv.getContext('2d')!

  // Dark background with a faint accent glow from the top.
  const bg = c.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, fid ? '#1a1308' : '#04150c')
  bg.addColorStop(1, fid ? '#080603' : '#020a06')
  c.fillStyle = bg
  c.fillRect(0, 0, W, H)
  if (fid) {
    // Soft lava-lamp blobs behind the content.
    const blob = (x: number, y: number, r: number, col: string, a: number) => {
      const g = c.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, rgba(col, a))
      g.addColorStop(1, rgba(col, 0))
      c.fillStyle = g
      c.fillRect(0, 0, W, H)
    }
    blob(W * 0.26, H * 0.3, W * 0.32, GOLD, 0.16)
    blob(W * 0.78, H * 0.68, W * 0.34, LAVA, 0.14)
  }
  const glow = c.createRadialGradient(W / 2, 0, 40, W / 2, 0, W * 0.7)
  glow.addColorStop(0, `${p.color}22`)
  glow.addColorStop(1, 'rgba(0,0,0,0)')
  c.fillStyle = glow
  c.fillRect(0, 0, W, H)

  // Faint scanlines (drawn before content so buttons/text stay crisp on top).
  c.fillStyle = 'rgba(0,0,0,0.10)'
  for (let y = 0; y < H; y += 6) c.fillRect(0, y, W, 3)

  c.textBaseline = 'alphabetic'
  c.textAlign = 'left'

  // Header bar.
  c.fillStyle = 'rgba(0,0,0,0.5)'
  c.fillRect(0, 0, W, 120)
  c.fillStyle = p.color
  c.font = '600 40px ui-monospace, "Consolas", monospace'
  c.fillText(`▸ CHANNEL // ${p.id.toUpperCase()}`, CH_PAD, 78)
  if (p.flagship) {
    c.textAlign = 'right'
    c.fillStyle = '#ffe27a'
    c.font = 'bold 40px system-ui, Arial, sans-serif'
    c.fillText('★ FLAGSHIP', W - CH_PAD, 76)
    c.textAlign = 'left'
  }

  // Title.
  c.fillStyle = fid ? '#fff4d6' : '#eaffe9'
  c.font = 'bold 132px system-ui, Arial, sans-serif'
  c.fillText(p.title, CH_PAD, 300)

  // Stack pill.
  c.font = '600 40px ui-monospace, "Consolas", monospace'
  const sw = c.measureText(p.stack).width + 56
  c.fillStyle = `${p.color}33`
  rr(c, CH_PAD, 352, sw, 70, 35)
  c.fill()
  c.strokeStyle = p.color
  c.lineWidth = 3
  c.stroke()
  c.fillStyle = p.color
  c.fillText(p.stack, CH_PAD + 28, 399)

  // Blurb.
  c.fillStyle = fid ? '#e8d9a8' : '#bfe9c8'
  c.font = '52px system-ui, Arial, sans-serif'
  wrap(c, p.blurb, CH_PAD, 540, W - CH_PAD * 2, 72, 6)

  // OPEN / EJECT buttons.
  const button = (r: { x: number; y: number; w: number; h: number }, label: string, fill: string, fg: string, border: string) => {
    c.fillStyle = fill
    rr(c, r.x, r.y, r.w, r.h, 18)
    c.fill()
    c.strokeStyle = border
    c.lineWidth = 5
    c.stroke()
    c.fillStyle = fg
    c.font = 'bold 70px ui-monospace, "Consolas", monospace'
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.fillText(label, r.x + r.w / 2, r.y + r.h / 2)
    c.textAlign = 'left'
    c.textBaseline = 'alphabetic'
  }
  button(CHANNEL_HIT.open, '▸ OPEN', `${p.color}cc`, '#02100a', p.color)
  button(CHANNEL_HIT.eject, '⏏ EJECT', 'rgba(255,255,255,0.05)', '#dfeee4', '#3a5446')

  return tex(cnv)
}

/** Portrait jewel-case cover for the disc shelf. */
export function discCoverTexture(p: Project): THREE.CanvasTexture {
  const W = 512
  const H = 720
  const cnv = document.createElement('canvas')
  cnv.width = W
  cnv.height = H
  const c = cnv.getContext('2d')!

  // Deep tinted gradient from the accent colour.
  const col = new THREE.Color(p.color)
  const dark = col.clone().multiplyScalar(0.16)
  const mid = col.clone().multiplyScalar(0.5)
  const g = c.createLinearGradient(0, 0, W, H)
  g.addColorStop(0, `#${mid.getHexString()}`)
  g.addColorStop(1, `#${dark.getHexString()}`)
  c.fillStyle = g
  c.fillRect(0, 0, W, H)

  // Spine band on the left.
  c.fillStyle = 'rgba(0,0,0,0.28)'
  c.fillRect(0, 0, 46, H)
  c.fillStyle = p.color
  c.fillRect(46, 0, 4, H)

  // Soft accent glow disc motif.
  const grd = c.createRadialGradient(W * 0.62, H * 0.4, 20, W * 0.62, H * 0.4, 230)
  grd.addColorStop(0, `${p.color}55`)
  grd.addColorStop(1, 'rgba(0,0,0,0)')
  c.fillStyle = grd
  c.fillRect(0, 0, W, H)
  c.strokeStyle = `${p.color}aa`
  c.lineWidth = 3
  c.beginPath()
  c.arc(W * 0.62, H * 0.4, 150, 0, Math.PI * 2)
  c.stroke()
  c.beginPath()
  c.arc(W * 0.62, H * 0.4, 46, 0, Math.PI * 2)
  c.stroke()

  // Title (wrapped, bottom-anchored).
  c.textAlign = 'left'
  c.fillStyle = '#ffffff'
  c.font = 'bold 60px system-ui, Arial, sans-serif'
  let ty = H - 150
  const words = p.title.split(' ')
  if (words.length > 1) {
    ty = H - 150 - (words.length - 1) * 58
    for (const w of words) {
      c.fillText(w, 74, ty)
      ty += 58
    }
  } else {
    c.fillText(p.title, 74, H - 110)
  }

  // Stack + accent rule.
  c.fillStyle = p.color
  c.fillRect(74, H - 86, 90, 5)
  c.fillStyle = '#dfe6ec'
  c.font = '600 26px ui-monospace, "Consolas", monospace'
  c.fillText(p.stack, 74, H - 48)

  if (p.flagship) {
    c.fillStyle = p.color
    c.font = 'bold 30px system-ui, Arial, sans-serif'
    c.fillText('★', 74, 70)
    c.fillStyle = '#cfd8e0'
    c.font = '600 22px ui-monospace, monospace'
    c.fillText('FLAGSHIP', 108, 68)
  }

  return tex(cnv)
}

/** Motif glyph for an app tile, drawn centred at the canvas origin. */
function drawGlyph(c: CanvasRenderingContext2D, motif: IconMotif, color = '#ffffff') {
  c.strokeStyle = color
  c.fillStyle = color
  c.lineJoin = 'round'
  c.lineCap = 'round'
  c.lineWidth = 12

  switch (motif) {
    case 'file': {
      c.beginPath()
      c.moveTo(-40, -56)
      c.lineTo(18, -56)
      c.lineTo(42, -32)
      c.lineTo(42, 56)
      c.lineTo(-40, 56)
      c.closePath()
      c.stroke()
      c.beginPath()
      c.moveTo(18, -56)
      c.lineTo(18, -32)
      c.lineTo(42, -32)
      c.stroke()
      c.lineWidth = 9
      c.beginPath()
      c.moveTo(-24, 6)
      c.lineTo(26, 6)
      c.moveTo(-24, 30)
      c.lineTo(12, 30)
      c.stroke()
      break
    }
    case 'house': {
      c.beginPath()
      c.moveTo(-52, -2)
      c.lineTo(0, -50)
      c.lineTo(52, -2)
      c.stroke()
      c.beginPath()
      c.moveTo(-38, -2)
      c.lineTo(-38, 52)
      c.lineTo(38, 52)
      c.lineTo(38, -2)
      c.stroke()
      c.beginPath()
      c.moveTo(-12, 14)
      c.lineTo(-12, 44)
      c.lineTo(18, 29)
      c.closePath()
      c.fill()
      break
    }
    case 'doc-lens': {
      c.beginPath()
      c.moveTo(-48, -56)
      c.lineTo(14, -56)
      c.lineTo(14, 22)
      c.lineTo(-48, 22)
      c.closePath()
      c.stroke()
      c.lineWidth = 8
      c.beginPath()
      c.moveTo(-34, -36)
      c.lineTo(2, -36)
      c.moveTo(-34, -14)
      c.lineTo(2, -14)
      c.stroke()
      c.lineWidth = 12
      c.beginPath()
      c.arc(20, 26, 24, 0, Math.PI * 2)
      c.stroke()
      c.beginPath()
      c.moveTo(38, 44)
      c.lineTo(54, 60)
      c.stroke()
      break
    }
    case 'cube': {
      const a = 46
      c.beginPath()
      c.moveTo(0, -52)
      c.lineTo(a, -26)
      c.lineTo(a, 26)
      c.lineTo(0, 52)
      c.lineTo(-a, 26)
      c.lineTo(-a, -26)
      c.closePath()
      c.stroke()
      c.beginPath()
      c.moveTo(0, -52)
      c.lineTo(0, 0)
      c.lineTo(a, -26)
      c.moveTo(0, 0)
      c.lineTo(-a, -26)
      c.stroke()
      break
    }
    case 'shield': {
      c.beginPath()
      c.moveTo(0, -54)
      c.lineTo(44, -36)
      c.lineTo(44, 8)
      c.quadraticCurveTo(44, 44, 0, 58)
      c.quadraticCurveTo(-44, 44, -44, 8)
      c.lineTo(-44, -36)
      c.closePath()
      c.stroke()
      c.fillRect(-26, -10, 52, 20)
      break
    }
    case 'grid': {
      const sz = 28
      const gap = 10
      for (let r = -1; r <= 1; r++) {
        for (let col = -1; col <= 1; col++) {
          rr(c, col * (sz + gap) - sz / 2, r * (sz + gap) - sz / 2, sz, sz, 6)
          c.fill()
        }
      }
      break
    }
    case 'crack': {
      c.beginPath()
      c.moveTo(0, -54)
      c.lineTo(44, -36)
      c.lineTo(44, 8)
      c.quadraticCurveTo(44, 44, 0, 58)
      c.quadraticCurveTo(-44, 44, -44, 8)
      c.lineTo(-44, -36)
      c.closePath()
      c.stroke()
      c.lineWidth = 9
      c.beginPath()
      c.moveTo(2, -42)
      c.lineTo(-14, -10)
      c.lineTo(10, 2)
      c.lineTo(-6, 46)
      c.stroke()
      break
    }
    case 'globe': {
      c.lineWidth = 10
      c.beginPath()
      c.arc(0, 0, 52, 0, Math.PI * 2)
      c.stroke()
      c.beginPath()
      c.ellipse(0, 0, 20, 52, 0, 0, Math.PI * 2)
      c.stroke()
      c.beginPath()
      c.ellipse(0, 0, 44, 52, 0, 0, Math.PI * 2)
      c.stroke()
      c.beginPath()
      c.moveTo(-52, 0)
      c.lineTo(52, 0)
      c.moveTo(-44, -28)
      c.lineTo(44, -28)
      c.moveTo(-44, 28)
      c.lineTo(44, 28)
      c.stroke()
      break
    }
    case 'metronome': {
      c.beginPath()
      c.moveTo(-30, 54)
      c.lineTo(30, 54)
      c.lineTo(18, -46)
      c.lineTo(-18, -46)
      c.closePath()
      c.stroke()
      c.beginPath()
      c.moveTo(0, 48)
      c.lineTo(16, -32)
      c.stroke()
      c.fillRect(4, -8, 18, 14)
      break
    }
  }
}

// FileID's brand: gold-on-black with a lava-lamp glow + hazard-stripe accent.
const GOLD = '#ffcc00'
const GOLD_DEEP = '#b88800'
const LAVA = '#ff6600'

/**
 * FileID's signature tile — a baked recreation of its landing-site hero: a dark
 * base lit by soft gold/orange "lava-lamp" blobs, a gold rim, a hazard-stripe
 * accent strip, and the file motif in gold. (Scoped to FileID per the palette
 * decision; every other tile keeps the room's neutral per-colour treatment.)
 */
function drawFileIdTile(c: CanvasRenderingContext2D, S: number) {
  c.save()
  rr(c, 16, 16, S - 32, S - 32, 48)
  c.clip()

  // Dark base + drifting lava-lamp blobs (soft, baked).
  c.fillStyle = '#141414'
  c.fillRect(0, 0, S, S)
  const blob = (x: number, y: number, r: number, col: string, a: number) => {
    const g = c.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, rgba(col, a))
    g.addColorStop(1, rgba(col, 0))
    c.fillStyle = g
    c.fillRect(0, 0, S, S)
  }
  blob(S * 0.3, S * 0.34, S * 0.55, GOLD, 0.5)
  blob(S * 0.72, S * 0.64, S * 0.5, LAVA, 0.42)
  blob(S * 0.64, S * 0.2, S * 0.3, GOLD, 0.3)
  blob(S * 0.22, S * 0.8, S * 0.34, GOLD_DEEP, 0.32)

  // Hazard-stripe accent strip along the bottom.
  const hy = S - 56
  const hh = 30
  c.save()
  rr(c, 18, hy, S - 36, hh, 8)
  c.clip()
  c.fillStyle = GOLD
  c.fillRect(0, hy, S, hh)
  c.fillStyle = '#161106'
  for (let x = -hh; x < S + hh; x += 26) {
    c.beginPath()
    c.moveTo(x, hy)
    c.lineTo(x + 13, hy)
    c.lineTo(x + 13 - hh, hy + hh)
    c.lineTo(x - hh, hy + hh)
    c.closePath()
    c.fill()
  }
  c.restore()
  c.restore() // tile clip

  // Gold rim (outer + faint inner) for a crisp beveled read.
  c.strokeStyle = GOLD
  c.lineWidth = 5
  rr(c, 16, 16, S - 32, S - 32, 48)
  c.stroke()
  c.strokeStyle = rgba(GOLD_DEEP, 0.6)
  c.lineWidth = 2
  rr(c, 23, 23, S - 46, S - 46, 42)
  c.stroke()

  // File motif in gold, lifted above the hazard strip.
  c.save()
  c.translate(S / 2, S / 2 - 10)
  c.shadowColor = 'rgba(0,0,0,0.5)'
  c.shadowBlur = 8
  c.shadowOffsetY = 3
  drawGlyph(c, 'file', GOLD)
  c.restore()
}

/** Rounded, beveled app tile (project-colour face + motif glyph) for the Apps wall. */
export function appIconTexture(p: Project): THREE.CanvasTexture {
  const S = 256
  const cnv = document.createElement('canvas')
  cnv.width = S
  cnv.height = S
  const c = cnv.getContext('2d')!
  c.clearRect(0, 0, S, S)

  // FileID wears its own gold/lava brand; everyone else uses the neutral tile.
  if (p.id === 'fileid') {
    drawFileIdTile(c, S)
    return tex(cnv)
  }

  const base = new THREE.Color(p.color)
  const light = base.clone().lerp(new THREE.Color('#ffffff'), 0.3)
  const dark = base.clone().multiplyScalar(0.66)

  // Tile body with a top-down gloss gradient.
  const g = c.createLinearGradient(0, 0, 0, S)
  g.addColorStop(0, `#${light.getHexString()}`)
  g.addColorStop(1, `#${dark.getHexString()}`)
  c.fillStyle = g
  rr(c, 16, 16, S - 32, S - 32, 48)
  c.fill()

  // Specular sheen across the top.
  c.fillStyle = 'rgba(255,255,255,0.18)'
  rr(c, 30, 28, S - 60, (S - 60) * 0.42, 34)
  c.fill()

  // Inset rim for a beveled read.
  c.strokeStyle = 'rgba(0,0,0,0.20)'
  c.lineWidth = 4
  rr(c, 16, 16, S - 32, S - 32, 48)
  c.stroke()

  c.save()
  c.translate(S / 2, S / 2 + 4)
  c.shadowColor = 'rgba(0,0,0,0.28)'
  c.shadowBlur = 6
  c.shadowOffsetY = 3
  drawGlyph(c, p.icon)
  c.restore()

  return tex(cnv)
}
