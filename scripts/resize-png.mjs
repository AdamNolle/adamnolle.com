// Dependency-free PNG downscaler for the project logos, so a 54x54 slot does
// not download a 1024x1024 source. Decodes (inflate + unfilter), box-filters in
// premultiplied alpha so transparent edges cannot bleed, re-encodes, and keeps
// whichever file is smaller. Handles 8- and 16-bit non-interlaced PNGs.
//
//   npm run assets:optimize          # target 108px, i.e. 2x the display size
//   MAX_EDGE=256 node scripts/resize-png.mjs path/to/*.png
import { readFileSync, writeFileSync, statSync } from 'node:fs'
import { inflateSync, deflateSync } from 'node:zlib'

const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const CHANNELS = { 0: 1, 2: 3, 4: 2, 6: 4 }

const CRC_TABLE = (() => {
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
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function paeth(a, b, c) {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  if (pa <= pb && pa <= pc) return a
  return pb <= pc ? b : c
}

// Decode to straight-alpha RGBA.
function decode(file) {
  const b = readFileSync(file)
  if (!b.subarray(0, 8).equals(SIG)) throw new Error(`${file}: not a PNG`)

  let off = 8
  let ihdr = null
  let palette = null
  let trns = null
  const idat = []

  while (off + 8 <= b.length) {
    const len = b.readUInt32BE(off)
    const type = b.toString('ascii', off + 4, off + 8)
    const data = b.subarray(off + 8, off + 8 + len)
    if (type === 'IHDR') ihdr = data
    else if (type === 'PLTE') palette = data
    else if (type === 'tRNS') trns = data
    else if (type === 'IDAT') idat.push(data)
    else if (type === 'IEND') break
    off += 12 + len
  }

  if (!ihdr) throw new Error(`${file}: no IHDR`)
  const width = ihdr.readUInt32BE(0)
  const height = ihdr.readUInt32BE(4)
  const depth = ihdr[8]
  const colorType = ihdr[9]
  if (ihdr[12] !== 0) throw new Error(`${file}: interlaced PNGs are not supported`)
  if (depth !== 8 && depth !== 16)
    throw new Error(`${file}: only 8- and 16-bit depths are supported (got ${depth})`)

  const isIndexed = colorType === 3
  const samples = isIndexed ? 1 : CHANNELS[colorType]
  if (!samples) throw new Error(`${file}: unsupported color type ${colorType}`)
  if (isIndexed && !palette) throw new Error(`${file}: indexed PNG without PLTE`)

  // Filtering operates on whole bytes, so 16-bit images have two bytes per sample.
  const bytesPerSample = depth === 16 ? 2 : 1
  const channels = samples * bytesPerSample

  const raw = inflateSync(Buffer.concat(idat))
  const stride = width * channels
  if (raw.length !== height * (stride + 1))
    throw new Error(`${file}: pixel stream is ${raw.length} bytes, expected ${height * (stride + 1)}`)

  // Undo per-scanline filtering in place.
  const flat = Buffer.alloc(height * stride)
  let prev = Buffer.alloc(stride)
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]
    const line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)))
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? line[i - channels] : 0
      const up = prev[i]
      const ul = i >= channels ? prev[i - channels] : 0
      let v = line[i]
      if (filter === 1) v += a
      else if (filter === 2) v += up
      else if (filter === 3) v += (a + up) >> 1
      else if (filter === 4) v += paeth(a, up, ul)
      line[i] = v & 0xff
    }
    line.copy(flat, y * stride)
    prev = line
  }

  // Expand whatever we got into 8-bit RGBA. For 16-bit sources the high byte
  // is the 8-bit value, which is what the browser would have shown anyway.
  const rgba = Buffer.alloc(width * height * 4)
  const at = (base, i) => flat[base + i * bytesPerSample]
  for (let p = 0; p < width * height; p++) {
    const s = p * channels
    const d = p * 4
    if (isIndexed) {
      const idx = flat[s]
      rgba[d] = palette[idx * 3]
      rgba[d + 1] = palette[idx * 3 + 1]
      rgba[d + 2] = palette[idx * 3 + 2]
      rgba[d + 3] = trns && idx < trns.length ? trns[idx] : 255
    } else if (colorType === 0) {
      rgba[d] = rgba[d + 1] = rgba[d + 2] = at(s, 0)
      rgba[d + 3] = 255
    } else if (colorType === 4) {
      rgba[d] = rgba[d + 1] = rgba[d + 2] = at(s, 0)
      rgba[d + 3] = at(s, 1)
    } else if (colorType === 2) {
      rgba[d] = at(s, 0)
      rgba[d + 1] = at(s, 1)
      rgba[d + 2] = at(s, 2)
      rgba[d + 3] = 255
    } else {
      rgba[d] = at(s, 0)
      rgba[d + 1] = at(s, 1)
      rgba[d + 2] = at(s, 2)
      rgba[d + 3] = at(s, 3)
    }
  }

  return { width, height, rgba }
}

// Box filter over the source rectangle covering each destination pixel.
// Colour is averaged premultiplied so transparent pixels cannot bleed in.
function resample(src, dstW, dstH) {
  const { width: sw, height: sh, rgba } = src
  const out = Buffer.alloc(dstW * dstH * 4)
  const xRatio = sw / dstW
  const yRatio = sh / dstH

  for (let y = 0; y < dstH; y++) {
    const y0 = Math.floor(y * yRatio)
    const y1 = Math.max(y0 + 1, Math.ceil((y + 1) * yRatio))
    for (let x = 0; x < dstW; x++) {
      const x0 = Math.floor(x * xRatio)
      const x1 = Math.max(x0 + 1, Math.ceil((x + 1) * xRatio))
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      let n = 0
      for (let sy = y0; sy < Math.min(y1, sh); sy++) {
        for (let sx = x0; sx < Math.min(x1, sw); sx++) {
          const i = (sy * sw + sx) * 4
          const al = rgba[i + 3]
          r += rgba[i] * al
          g += rgba[i + 1] * al
          b += rgba[i + 2] * al
          a += al
          n++
        }
      }
      const d = (y * dstW + x) * 4
      if (a === 0) {
        out[d] = out[d + 1] = out[d + 2] = out[d + 3] = 0
      } else {
        out[d] = Math.round(r / a)
        out[d + 1] = Math.round(g / a)
        out[d + 2] = Math.round(b / a)
        out[d + 3] = Math.round(a / n)
      }
    }
  }
  return { width: dstW, height: dstH, rgba: out }
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encode({ width, height, rgba }) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const stride = width * 4

  // Try each filter per scanline, keep the one with the smallest absolute sum.
  const raw = Buffer.alloc(height * (stride + 1))
  let prev = Buffer.alloc(stride)
  for (let y = 0; y < height; y++) {
    const line = rgba.subarray(y * stride, (y + 1) * stride)
    let best = null
    for (let f = 0; f < 5; f++) {
      const cand = Buffer.alloc(stride)
      let score = 0
      for (let i = 0; i < stride; i++) {
        const a = i >= 4 ? line[i - 4] : 0
        const up = prev[i]
        const ul = i >= 4 ? prev[i - 4] : 0
        let v
        if (f === 0) v = line[i]
        else if (f === 1) v = line[i] - a
        else if (f === 2) v = line[i] - up
        else if (f === 3) v = line[i] - ((a + up) >> 1)
        else v = line[i] - paeth(a, up, ul)
        v &= 0xff
        cand[i] = v
        score += v < 128 ? v : 256 - v
      }
      if (!best || score < best.score) best = { f, cand, score }
    }
    raw[y * (stride + 1)] = best.f
    best.cand.copy(raw, y * (stride + 1) + 1)
    prev = line
  }

  return Buffer.concat([
    SIG,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const max = Number(process.env.MAX_EDGE || 108)
let changed = 0

for (const file of process.argv.slice(2)) {
  const before = statSync(file).size
  const src = decode(file)
  const scale = Math.min(1, max / Math.max(src.width, src.height))
  const dstW = Math.max(1, Math.round(src.width * scale))
  const dstH = Math.max(1, Math.round(src.height * scale))
  const out = encode(scale < 1 ? resample(src, dstW, dstH) : src)

  if (out.length < before) {
    writeFileSync(file, out)
    changed++
    console.log(
      `${file}: ${src.width}x${src.height} ${(before / 1024).toFixed(1)}kB -> ` +
        `${dstW}x${dstH} ${(out.length / 1024).toFixed(1)}kB`
    )
  } else {
    console.log(`${file}: kept original (${(before / 1024).toFixed(1)}kB)`)
  }
}

console.log(`${changed} file(s) rewritten`)
