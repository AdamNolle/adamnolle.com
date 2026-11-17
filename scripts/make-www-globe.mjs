// Bakes the spinning pixel globes: the Web World Wide link in the header and
// the big one in the Web World Wide section.
//
// Same globe as webworldwide.online: its Natural Earth map (scripts/world-map.mjs,
// five classes: ocean, land, desert, tundra, ice), its palette, its 3x3
// majority-vote sampling, and its rule that a small island always keeps at
// least one pixel.
//
// Each globe is rendered once per pixel of equatorial travel (2πr frames),
// plus a copy of the first frame on the end, laid out as one horizontal
// strip. The page steps background-position across the strip with CSS, so a
// globe costs one small image, no JavaScript, and a repaint of its own box a
// few times a second. The trailing copy is what lets a 0%→100% animation show
// every real frame exactly once (see .globe in src/styles.css).
//
//   npm run assets:globe
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { deflateSync } from 'node:zlib'

import { GLOBES } from './render.mjs'
import { ISLANDS, MAP_H, MAP_RLE, MAP_W } from './world-map.mjs'

const TILT = 5 // degrees; the camera sits slightly north of the equator
const START = -80 // first frame centres on the Americas
// Frames step the centre west, so land drifts left to right, as Earth turns.
const SS = 3 // supersamples per axis; the majority class wins the pixel

// webworldwide.online palette: ocean, land, desert, tundra, ice.
const PALETTE = [
  [0x1e, 0x68, 0xf0],
  [0x39, 0xbe, 0x00],
  [0xc6, 0xd7, 0x6f],
  [0xd7, 0xd7, 0xd7],
  [0xff, 0xff, 0xff],
]

/* --------------------------------------------------------------- the map */

const CODE = { '.': 0, g: 1, d: 2, t: 3, i: 4 }
const map = new Uint8Array(MAP_W * MAP_H)
{
  let i = 0
  for (const m of MAP_RLE.matchAll(/([.gdti])(\d*)/g)) {
    const n = m[2] ? Number(m[2]) : 1
    map.fill(CODE[m[1]], i, i + n)
    i += n
  }
}
const perDeg = MAP_W / 360
const cellAt = (lat, lon) => {
  const r = Math.min(MAP_H - 1, Math.max(0, Math.floor((90 - lat) * perDeg)))
  const c = ((Math.floor((lon + 180) * perDeg) % MAP_W) + MAP_W) % MAP_W
  return map[r * MAP_W + c]
}

/* ----------------------------------------------------------------- frames */

const deg = 180 / Math.PI
const cosT = Math.cos(TILT / deg)
const sinT = Math.sin(TILT / deg)

// One N×N frame centred on longitude `centre`, as palette indices.
function frame(N, centre) {
  const out = new Uint8Array(N * N)
  const votes = new Uint8Array(PALETTE.length)
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      votes.fill(0)
      let best = 0
      for (let s = 0; s < SS * SS; s++) {
        let x = ((i + ((s % SS) + 0.5) / SS) / N) * 2 - 1
        let y = 1 - ((j + (Math.floor(s / SS) + 0.5) / SS) / N) * 2
        // Samples outside the disc are pulled onto the limb; the page clips
        // the square to a circle.
        const r2 = x * x + y * y
        if (r2 > 0.998) {
          const k = Math.sqrt(r2 / 0.998)
          x /= k
          y /= k
        }
        const z = Math.sqrt(Math.max(0, 1 - x * x - y * y))
        const lat = Math.asin(y * cosT + z * sinT) * deg
        const lon = centre + Math.atan2(x, z * cosT - y * sinT) * deg
        const c = cellAt(lat, lon)
        if (++votes[c] > votes[best]) best = c
      }
      out[j * N + i] = best
    }
  }

  // Islands smaller than a pixel lose every vote; give each one on the near
  // side the pixel its centre falls in.
  for (let q = 0; q < ISLANDS.length; q += 2) {
    const la = ISLANDS[q] / deg
    const dl = (ISLANDS[q + 1] - centre) / deg
    if (sinT * Math.sin(la) + cosT * Math.cos(la) * Math.cos(dl) <= 0.05) continue
    const x = Math.cos(la) * Math.sin(dl)
    const y = cosT * Math.sin(la) - sinT * Math.cos(la) * Math.cos(dl)
    const i = Math.min(N - 1, Math.floor(((x + 1) / 2) * N))
    const j = Math.min(N - 1, Math.floor(((1 - y) / 2) * N))
    if (out[j * N + i] === 0) {
      const c = cellAt(ISLANDS[q], ISLANDS[q + 1])
      out[j * N + i] = c === 0 ? 1 : c
    }
  }
  return out
}

/* ------------------------------------------------------------- PNG encode */

const CRC = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, data) {
  const head = Buffer.alloc(8)
  head.writeUInt32BE(data.length, 0)
  head.write(type, 4, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0)
  return Buffer.concat([head, data, crc])
}

// Indexed colour, 4 bits per pixel: five palette entries fit in sixteen.
function encode(indices, width, height) {
  const rowBytes = Math.ceil(width / 2)
  const raw = Buffer.alloc((rowBytes + 1) * height) // each row: filter 0 + packed indices
  for (let y = 0; y < height; y++) {
    const row = y * (rowBytes + 1) + 1
    for (let x = 0; x < width; x++) {
      raw[row + (x >> 1)] |= indices[y * width + x] << (x & 1 ? 0 : 4)
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 4 // bit depth
  ihdr[9] = 3 // colour type: indexed
  // compression, filter and interlace stay 0

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('PLTE', Buffer.from(PALETTE.flat())),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/* -------------------------------------------------------------------- bake */

for (const { src: path, size: N, frames: F } of Object.values(GLOBES)) {
  // Each frame moves the centre west, so the surface drifts east, as Earth
  // does. Frame F repeats frame 0 so the loop closes (see the header note).
  const stripW = N * (F + 1)
  const indices = new Uint8Array(stripW * N)
  for (let f = 0; f <= F; f++) {
    const px = frame(N, START - ((f % F) / F) * 360)
    for (let y = 0; y < N; y++) indices.set(px.subarray(y * N, y * N + N), y * stripW + f * N)
  }

  // Encode as an indexed PNG, then repack it as lossless WebP, which comes
  // out about 17% smaller with every pixel identical. Needs cwebp
  // (brew install webp).
  const out = 'public' + path
  const dir = mkdtempSync(join(tmpdir(), 'globe-'))
  try {
    const png = join(dir, 'globe.png')
    writeFileSync(png, encode(indices, stripW, N))
    execFileSync('cwebp', ['-quiet', '-lossless', '-z', '9', '-metadata', 'none', png, '-o', out])
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
  console.log(`${out}: ${F} frames of ${N}x${N}, ${stripW}x${N}, ${statSync(out).size} bytes`)
}
