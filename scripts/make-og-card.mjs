// Bakes the 1200x630 link-preview card: the hero's ASCII Earth beside the
// ASCII "ADAM / NOLLE" wordmark, in the hero's terminal window.
//
// The globe is the real hero renderer (src/ascii-hero.ts) run in Node against
// a stubbed DOM, so the card shows exactly what the page draws. The wordmark
// follows the hero's coverage-to-character rules, with ImageMagick standing in
// for the browser canvas, and ImageMagick sets the result in Courier New with
// the hero's green glow. Needs `magick` (brew install imagemagick) and the
// macOS system fonts; the output is committed, so the build never runs this.
//
//   npm run assets:og
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const OUT = 'public/media/og-card.png'
const W = 1200
const H = 630
const FONTS = '/System/Library/Fonts/Supplemental/'
const MONO = FONTS + 'Courier New Bold.ttf'
const BLACK = FONTS + 'Arial Black.ttf'
const GREEN = '#00ff00'

const site = JSON.parse(readFileSync('content/site.json', 'utf8'))
const [wordA, wordB] = site.hero.asciiWords

/* ------------------------------------------------------------------ globe */

// Narrow layout draws the globe alone, which is the part the card needs. A
// 520px box gives a globe about 30 rows tall: big enough characters to
// survive being shrunk to a phone-sized preview. Reduced motion keeps the loop off.
async function globeText() {
  const g = globalThis
  g.window = { matchMedia: () => ({ matches: true }), addEventListener() {}, removeEventListener() {} }
  g.document = { addEventListener() {}, removeEventListener() {}, hidden: false }
  g.getComputedStyle = () => ({ paddingLeft: '0', paddingRight: '0' })
  g.IntersectionObserver = class {
    observe() {}
    disconnect() {}
  }

  // Node needs the extension on the import that Vite resolves itself.
  const dir = mkdtempSync(join(tmpdir(), 'og-'))
  try {
    const src = readFileSync('src/ascii-hero.ts', 'utf8').replace(
      "from './earth-mask'",
      `from ${JSON.stringify(pathToFileURL(resolve('src/earth-mask.ts')).href)}`
    )
    writeFileSync(join(dir, 'ascii-hero.ts'), src)
    const { startAscii } = await import(pathToFileURL(join(dir, 'ascii-hero.ts')).href)

    const el = { parentElement: { clientWidth: 520 }, clientWidth: 520, style: {}, textContent: '', closest: () => null }
    const stop = startAscii(el, { words: [wordA, wordB] })
    for (let i = 0; i < 100 && !/[#$@]/.test(el.textContent); i++) {
      await new Promise((r) => setTimeout(r, 20)) // wait for the land mask
    }
    stop()
    return el.textContent.split('\n')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

/* --------------------------------------------------------------- wordmark */

// Same rules as textArt() in src/ascii-hero.ts: rasterise the word into 6x10
// cells, read coverage per cell, hollow out the interior.
function wordArt(txt, cols, rows) {
  const cw = 6
  const chh = 10
  const w = cols * cw
  const h = rows * chh
  const px = execFileSync('magick', [
    '-background', 'black', '-fill', 'white', '-font', BLACK, '-pointsize', '200',
    `label:${txt}`, '-trim', '+repage',
    '-shear', '11.3x0', '-trim', '+repage', // the hero's 0.2 italic lean (atan 0.2)
    '-resize', `${Math.round(w * 0.94)}x${Math.round(h * 0.96)}!`,
    '-gravity', 'center', '-extent', `${w}x${h}`,
    '-colorspace', 'gray', '-depth', '8', 'gray:-',
  ])

  const cov = new Float32Array(cols * rows)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let sum = 0
      for (let yy = 0; yy < chh; yy++) {
        for (let xx = 0; xx < cw; xx++) sum += px[(r * chh + yy) * w + c * cw + xx]
      }
      cov[r * cols + c] = sum / (cw * chh) / 255
    }
  }
  const at = (r, c) => (r < 0 || c < 0 || r >= rows || c >= cols ? 0 : cov[r * cols + c])

  const SOLID = 0.46
  const BODY = '#8WM%B@$'
  const out = []
  for (let r = 0; r < rows; r++) {
    let s = ''
    for (let c = 0; c < cols; c++) {
      const v = cov[r * cols + c]
      if (v < 0.16) s += ' '
      else if (v < SOLID) s += v < 0.3 ? '.' : ':'
      else {
        const deep = [[-1, 0], [1, 0], [0, -1], [0, -2], [0, 1], [0, 2], [-1, -1], [-1, 1], [1, -1], [1, 1]]
          .every(([dr, dc]) => at(r + dr, c + dc) >= SOLID)
        // The hero hollows letters out; a card is seen at thumbnail size, where
        // an outline goes faint, so the interior gets a dim dot fill instead.
        s += deep ? '.' : BODY.charAt(Math.min(7, Math.round(((v - SOLID) / (1 - SOLID)) * 7)))
      }
    }
    out.push(s)
  }
  return out
}

/* ------------------------------------------------------------------- grid */

const globe = (await globeText()).map((l) => l.replace(/\s+$/, ''))
const gTop = globe.findIndex((l) => l.trim())
const gBot = globe.findLastIndex((l) => l.trim())
const globeRows = globe.slice(gTop, gBot + 1)
const gLeft = Math.min(...globeRows.filter((l) => l.trim()).map((l) => l.search(/\S/)))
const gRows = globeRows.map((l) => l.slice(gLeft))
const gCols = Math.max(...gRows.map((l) => l.length))

const rows = gRows.length
const eachRows = Math.floor((rows - 1) / 2)
const artCols = Math.round(gCols * 1.05)
const art = [...wordArt(wordA, Math.round(artCols * 0.8), eachRows), '', ...wordArt(wordB, artCols, eachRows)]
const artTop = Math.floor((rows - art.length) / 2)
const GAP = 4

const grid = gRows.map((g, y) => {
  const a = art[y - artTop] ?? ''
  return (a.padEnd(artCols + GAP) + g).replace(/\s+$/, '')
})
const cols = artCols + GAP + gCols

/* ----------------------------------------------------------------- render */

// Window: 4px ink border, title bar (LED, rules, domain), ASCII block, and
// one tagline set large enough to read in a phone-sized preview.
const M = 36 // outer margin
const BAR = 50
const FOOT = 78
const TAG = 34 // tagline size in px
const areaW = W - 2 * M - 80
const areaH = H - 2 * M - BAR - FOOT
const em = Math.min(areaW / (cols * 0.6), areaH / rows)
const cw = em * 0.6
const ox = Math.round((W - cols * cw) / 2)
const oy = M + BAR + Math.round((areaH - rows * em) / 2)

// ImageMagick reads % as an escape in annotate text.
const esc = (s) => s.replace(/%/g, '%%')

const text = []
grid.forEach((line, y) => {
  if (!line.trim()) return
  text.push('-annotate', `+${ox}+${(oy + (y + 0.8) * em).toFixed(1)}`, esc(line))
})

const host = new URL(site.site.url).host.toUpperCase()
const LABEL = 20
const labelW = Math.ceil(host.length * LABEL * 0.6)
const dashes = []
for (let y = M + 20; y < M + 32; y += 5) {
  dashes.push('-draw', `rectangle ${M + 46},${y} ${W - M - 40 - labelW},${y + 1}`)
}

const footY = H - M - FOOT + TAG + 6

execFileSync('magick', [
  '-size', `${W}x${H}`, 'xc:#000000',
  // title bar
  '-fill', GREEN, '-draw', `rectangle ${M + 18},${M + 20} ${M + 32},${M + 32}`,
  '-fill', '#5f5f5f', ...dashes,
  '-font', MONO, '-pointsize', String(LABEL), '-fill', GREEN,
  '-annotate', `+${W - M - 22 - labelW}+${M + 33}`, host,
  // ASCII art, glow first: a blurred copy under the crisp text
  '(', '-size', `${W}x${H}`, 'xc:none', '-font', MONO, '-pointsize', em.toFixed(2), '-fill', GREEN, ...text,
  '(', '+clone', '-blur', '0x9', '-channel', 'A', '-evaluate', 'multiply', '0.55', '+channel', ')',
  '+swap', '-composite', ')', '-composite',
  // tagline
  '-font', MONO, '-pointsize', String(TAG), '-fill', GREEN,
  '-annotate', `+${M + 30}+${footY}`, esc(site.hero.lines[0]),
  // window border
  '-fill', 'none', '-stroke', '#e6e6e6', '-strokewidth', '4',
  '-draw', `rectangle ${M - 2},${M - 2} ${W - M + 1},${H - M + 1}`,
  // The glow is the only gradient; 64 colours hold it and cut the file ~5x.
  '-dither', 'None', '-colors', '64', '-strip', '-define', 'png:compression-level=9', 'PNG8:' + OUT,
])

console.log(`${OUT}: ${W}x${H}, ${cols}x${rows} characters at ${em.toFixed(1)}px, ${readFileSync(OUT).length} bytes`)
