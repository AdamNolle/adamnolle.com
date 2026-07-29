// Structural PNG check for the project logos: walks the chunks, verifies each
// CRC32, inflates the pixel stream and confirms its length matches the header.
// A truncated or corrupt image fails here rather than shipping as a blank box,
// which a plain `file` or dimensions check would miss.
//
//   npm run assets:verify
import { readFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'

const CRC = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return (buf) => {
    let c = -1
    for (let i = 0; i < buf.length; i++) c = t[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
    return (c ^ -1) >>> 0
  }
})()

const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }

export function verifyPng(file) {
  const b = readFileSync(file)
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  if (!b.subarray(0, 8).equals(sig)) throw new Error(`${file}: not a PNG`)

  let off = 8
  let ihdr = null
  const idat = []
  let sawEnd = false

  while (off < b.length) {
    if (off + 8 > b.length) throw new Error(`${file}: truncated chunk header`)
    const len = b.readUInt32BE(off)
    const type = b.toString('ascii', off + 4, off + 8)
    const dataEnd = off + 8 + len
    if (dataEnd + 4 > b.length) throw new Error(`${file}: truncated ${type} chunk`)
    const want = b.readUInt32BE(dataEnd)
    const got = CRC(b.subarray(off + 4, dataEnd))
    if (want !== got) throw new Error(`${file}: CRC mismatch in ${type}`)

    if (type === 'IHDR') ihdr = b.subarray(off + 8, dataEnd)
    else if (type === 'IDAT') idat.push(b.subarray(off + 8, dataEnd))
    else if (type === 'IEND') sawEnd = true

    off = dataEnd + 4
  }

  if (!ihdr) throw new Error(`${file}: no IHDR`)
  if (!sawEnd) throw new Error(`${file}: no IEND`)
  if (!idat.length) throw new Error(`${file}: no IDAT`)

  const width = ihdr.readUInt32BE(0)
  const height = ihdr.readUInt32BE(4)
  const depth = ihdr[8]
  const colorType = ihdr[9]
  if (ihdr[12] !== 0) return { file, width, height, note: 'interlaced, length check skipped' }

  const raw = inflateSync(Buffer.concat(idat))
  const bpp = (CHANNELS[colorType] * depth) / 8
  const expect = height * (1 + Math.ceil(width * bpp))
  if (raw.length !== expect)
    throw new Error(`${file}: pixel stream is ${raw.length} bytes, expected ${expect} — image is incomplete`)

  return { file, width, height, bytes: b.length }
}

// CLI mode only when run directly, so importing this stays side-effect free.
if (import.meta.filename === process.argv[1] && process.argv[2]) {
  let bad = 0
  for (const f of process.argv.slice(2)) {
    try {
      const r = verifyPng(f)
      console.log(`ok   ${r.file}  ${r.width}x${r.height}  ${r.bytes ?? '?'} bytes`)
    } catch (e) {
      bad++
      console.error(`FAIL ${e.message}`)
    }
  }
  process.exit(bad ? 1 : 0)
}
