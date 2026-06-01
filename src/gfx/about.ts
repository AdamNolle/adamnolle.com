import * as THREE from 'three'
import { tex } from './cards'
import type { About } from '../data/about'

/**
 * Canvas factories for the BACK wall's "about" cork board: a banner, a paper
 * bio note, a stats panel, and a contact card. All are drawn from the same
 * `About` record the dialog reads, so the wall and the reader never drift.
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
): number {
  const words = text.split(' ')
  let line = ''
  for (let i = 0; i < words.length; i++) {
    const test = line ? line + ' ' + words[i] : words[i]
    if (c.measureText(test).width > maxW && line) {
      c.fillText(line, x, y)
      y += lineH
      line = words[i]
    } else {
      line = test
    }
  }
  if (line) c.fillText(line, x, y)
  return y + lineH
}

function paper(c: CanvasRenderingContext2D, W: number, H: number) {
  const g = c.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#f6f1e6')
  g.addColorStop(1, '#e8dfcd')
  c.fillStyle = g
  c.fillRect(0, 0, W, H)
  // faint paper speckle
  c.fillStyle = 'rgba(0,0,0,0.04)'
  for (let i = 0; i < 220; i++) {
    c.fillRect(Math.random() * W, Math.random() * H, 2, 2)
  }
}

/** Wide banner that names the wall. */
export function aboutBannerTexture(): THREE.CanvasTexture {
  const W = 900
  const H = 200
  const cnv = document.createElement('canvas')
  cnv.width = W
  cnv.height = H
  const c = cnv.getContext('2d')!

  const g = c.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#101820')
  g.addColorStop(1, '#0a0f15')
  c.fillStyle = g
  c.fillRect(0, 0, W, H)
  c.strokeStyle = '#00e1ff'
  c.lineWidth = 6
  c.strokeRect(14, 14, W - 28, H - 28)

  c.textAlign = 'center'
  c.textBaseline = 'middle'
  c.fillStyle = '#eafaff'
  c.font = 'bold 92px system-ui, Arial, sans-serif'
  c.fillText('ABOUT', W / 2, H / 2 + 6)
  return tex(cnv)
}

/** Paper bio note (clickable → opens the reader). */
export function bioCardTexture(a: About): THREE.CanvasTexture {
  const W = 620
  const H = 580
  const cnv = document.createElement('canvas')
  cnv.width = W
  cnv.height = H
  const c = cnv.getContext('2d')!
  paper(c, W, H)

  c.fillStyle = '#2bb673'
  c.fillRect(0, 0, W, 12)

  c.textBaseline = 'alphabetic'
  c.textAlign = 'left'
  c.fillStyle = '#15110a'
  c.font = 'bold 50px system-ui, Arial, sans-serif'
  c.fillText(a.heading, 38, 78)

  c.fillStyle = '#2a6b46'
  c.font = '600 27px ui-monospace, "Consolas", monospace'
  let y = wrap(c, a.lead, 38, 122, W - 76, 36)

  c.fillStyle = '#3a3528'
  c.font = '28px system-ui, Arial, sans-serif'
  y += 6
  y = wrap(c, a.bio[0], 38, y, W - 76, 38)
  y += 4
  y = wrap(c, a.bio[1], 38, y, W - 76, 38)

  c.fillStyle = '#2bb673'
  c.font = '600 26px ui-monospace, "Consolas", monospace'
  c.fillText('▸ read more', 38, H - 30)
  return tex(cnv)
}

/** Stats panel. */
export function statsCardTexture(a: About): THREE.CanvasTexture {
  const W = 480
  const H = 430
  const cnv = document.createElement('canvas')
  cnv.width = W
  cnv.height = H
  const c = cnv.getContext('2d')!

  const g = c.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#eef3fb')
  g.addColorStop(1, '#dde6f4')
  c.fillStyle = g
  c.fillRect(0, 0, W, H)
  c.fillStyle = '#2e7dff'
  c.fillRect(0, 0, W, 12)

  c.fillStyle = '#15110a'
  c.font = 'bold 40px system-ui, Arial, sans-serif'
  c.textAlign = 'left'
  c.fillText('The Stats', 34, 70)

  c.font = '30px system-ui, Arial, sans-serif'
  a.stats.forEach((s, i) => {
    const ry = 128 + i * 56
    c.fillStyle = '#46505e'
    c.textAlign = 'left'
    c.fillText(s.label, 34, ry)
    c.fillStyle = '#2e7dff'
    c.font = 'bold 34px ui-monospace, "Consolas", monospace'
    c.textAlign = 'right'
    c.fillText(s.value, W - 34, ry)
    c.font = '30px system-ui, Arial, sans-serif'
    // hairline rule
    c.strokeStyle = 'rgba(46,125,255,0.18)'
    c.lineWidth = 2
    c.beginPath()
    c.moveTo(34, ry + 14)
    c.lineTo(W - 34, ry + 14)
    c.stroke()
  })
  return tex(cnv)
}

/** Contact card (clickable → opens the reader's links). */
export function contactCardTexture(): THREE.CanvasTexture {
  const W = 480
  const H = 250
  const cnv = document.createElement('canvas')
  cnv.width = W
  cnv.height = H
  const c = cnv.getContext('2d')!

  const g = c.createLinearGradient(0, 0, W, H)
  g.addColorStop(0, '#0d1a20')
  g.addColorStop(1, '#0a1318')
  c.fillStyle = g
  c.fillRect(0, 0, W, H)
  c.strokeStyle = 'rgba(0,225,255,0.5)'
  c.lineWidth = 3
  rr(c, 10, 10, W - 20, H - 20, 14)
  c.stroke()

  c.textAlign = 'left'
  c.fillStyle = '#00e1ff'
  c.font = 'bold 38px system-ui, Arial, sans-serif'
  c.fillText('Find me', 34, 74)

  c.fillStyle = '#bcd3da'
  c.font = '26px system-ui, Arial, sans-serif'
  c.fillText('Say hi, or follow the work.', 34, 118)

  c.fillStyle = '#7fe6ff'
  c.font = '600 24px ui-monospace, "Consolas", monospace'
  c.fillText('GitHub · LinkedIn · YouTube', 34, 166)
  c.fillStyle = '#00e1ff'
  c.fillText('▸ hello@adamnolle.com', 34, 206)
  return tex(cnv)
}

/** Decorative instant-photo for craft/warmth. */
export function polaroidTexture(hue: number, caption: string): THREE.CanvasTexture {
  const W = 320
  const H = 380
  const cnv = document.createElement('canvas')
  cnv.width = W
  cnv.height = H
  const c = cnv.getContext('2d')!
  c.fillStyle = '#f7f4ec'
  c.fillRect(0, 0, W, H)
  const g = c.createLinearGradient(0, 0, W, H)
  g.addColorStop(0, `hsl(${hue},52%,52%)`)
  g.addColorStop(1, `hsl(${(hue + 50) % 360},42%,32%)`)
  c.fillStyle = g
  c.fillRect(22, 22, W - 44, 250)
  c.globalAlpha = 0.25
  c.fillStyle = '#fff'
  for (let i = 0; i < 36; i++) {
    c.fillRect(22 + Math.random() * (W - 44), 22 + Math.random() * 250, 2, 2)
  }
  c.globalAlpha = 1
  c.fillStyle = '#2a2a2a'
  c.font = '30px system-ui, Arial, sans-serif'
  c.textAlign = 'center'
  c.fillText(caption, W / 2, 330)
  return tex(cnv)
}
