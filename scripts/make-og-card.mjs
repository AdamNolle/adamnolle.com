// Bakes the 1200x630 link-preview card: ADAM / NOLLE beside the hero's ASCII
// Earth, in green on black like the hero.
//
// Built for how the card is actually seen: as a phone-sized thumbnail in a
// text message or chat app, often cropped at the edges. So the name is set
// in solid, slanted heavy letters (the hero's ASCII lettering turns to noise
// once each character is two pixels tall), everything sits well inside a
// safe margin, and nothing important touches an edge.
//
// The globe is the real hero renderer (src/ascii-hero.ts) run in Node against
// a stubbed DOM, so the card shows exactly what the page draws. Needs
// `magick` (brew install imagemagick) and the macOS system fonts; the output
// is committed, so the build never runs this.
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

/* ----------------------------------------------------------------- layout */

// Preview apps crop up to ~5% off each side; keep everything inside this.
const MX = 84
const MY = 70

// ImageMagick reads % as an escape in annotate text.
const esc = (s) => s.replace(/%/g, '%%')
const dir = mkdtempSync(join(tmpdir(), 'og-card-'))
const tmp = (name) => join(dir, name)
const size = (file) => execFileSync('magick', ['identify', '-format', '%w %h', file]).toString().split(' ').map(Number)

try {
  /* ---- globe: right side, as tall as the safe area allows */
  const lines = (await globeText()).map((l) => l.replace(/\s+$/, ''))
  const top = lines.findIndex((l) => l.trim())
  const bot = lines.findLastIndex((l) => l.trim())
  const rows = lines.slice(top, bot + 1)
  const left = Math.min(...rows.filter((l) => l.trim()).map((l) => l.search(/\S/)))
  const globe = rows.map((l) => l.slice(left))
  const gCols = Math.max(...globe.map((l) => l.length))
  const em = (H - 2 * MY + 20) / globe.length
  const gW = gCols * em * 0.6
  const gX = Math.round(W - MX + 10 - gW)
  const gY = Math.round((H - globe.length * em) / 2)
  const globeText_ = globe.flatMap((line, y) =>
    line.trim() ? ['-annotate', `+${gX}+${(gY + (y + 0.8) * em).toFixed(1)}`, esc(line)] : []
  )

  /* ---- name: two solid slanted lines, filling the space left of the globe */
  const nameW = gX - MX - 36
  const word = (txt, file) => {
    execFileSync('magick', [
      '-background', 'none', '-fill', GREEN, '-font', BLACK, '-pointsize', '300',
      `label:${txt}`, '-trim', '+repage',
      '-background', 'none', '-shear', '11.3x0', '-trim', '+repage', // the hero's forward lean
      file,
    ])
    return size(file)
  }
  const [aw0, ah0] = word(wordA, tmp('a.png'))
  const [bw0, bh0] = word(wordB, tmp('b.png'))
  // One scale for both words, so the letters match; the wider word sets it.
  const k = Math.min(nameW / Math.max(aw0, bw0), 128 / ah0)
  const [aw, ah, bw, bh] = [aw0, ah0, bw0, bh0].map((v) => Math.round(v * k))
  const GAPN = 22

  /* ---- caption under the name */
  const CAP = 31
  const cap = [site.hero.lines[0].replace(/^>\s*/, '').split(' · ')].flat()
  const capLead = 16
  const nameH = ah + GAPN + bh
  const blockH = nameH + 44 + cap.length * (CAP + capLead) - capLead + 30 + 26
  const y0 = Math.round((H - blockH) / 2)
  const capY = y0 + nameH + 44 + CAP
  const capText = cap.flatMap((c, i) => ['-annotate', `+${MX + 4}+${capY + i * (CAP + capLead)}`, esc(c)])
  const urlY = capY + (cap.length - 1) * (CAP + capLead) + 30 + 26
  const host = new URL(site.site.url).host

  // Compose the name onto its own full-size layer first. (-geometry is a
  // sticky setting in ImageMagick; doing this in its own command keeps the
  // offsets from leaking into the composites below.)
  execFileSync('magick', [
    '-size', `${W}x${H}`, 'xc:none',
    '(', tmp('a.png'), '-resize', `${aw}x${ah}!`, ')', '-geometry', `+${MX}+${y0}`, '-composite',
    '(', tmp('b.png'), '-resize', `${bw}x${bh}!`, ')', '-geometry', `+${MX}+${y0 + ah + GAPN}`, '-composite',
    tmp('name.png'),
  ])

  execFileSync('magick', [
    '-size', `${W}x${H}`, 'xc:#000000',

    // Globe, glow first: a blurred copy under the crisp characters.
    '(', '-size', `${W}x${H}`, 'xc:none', '-font', MONO, '-pointsize', em.toFixed(2), '-fill', GREEN, ...globeText_,
    '(', '+clone', '-blur', '0x8', '-channel', 'A', '-evaluate', 'multiply', '0.5', '+channel', ')',
    '+swap', '-composite', ')', '-composite',

    // Name, with the same glow.
    '(', tmp('name.png'),
    '(', '+clone', '-blur', '0x14', '-channel', 'A', '-evaluate', 'multiply', '0.55', '+channel', ')',
    '+swap', '-composite', ')', '-composite',

    // Role in light grey, domain in green after a prompt.
    '-font', MONO, '-pointsize', String(CAP), '-fill', '#e8e8e8', ...capText,
    '-pointsize', '26', '-fill', GREEN, '-annotate', `+${MX + 4}+${urlY}`, `> ${host}`,

    // Faint scanlines, as on the site; light enough to vanish at thumbnail size.
    '(', '-size', `1x4`, 'xc:none', '-fill', 'rgba(0,0,0,0.28)', '-draw', 'point 0,3', '-write', 'mpr:scan', '+delete', ')',
    '(', '-size', `${W}x${H}`, 'tile:mpr:scan', ')', '-composite',

    // The glow is the only gradient; 64 colours hold it and keep the file small.
    '-dither', 'None', '-colors', '64', '-strip', '-define', 'png:compression-level=9', 'PNG8:' + OUT,
  ])
} finally {
  rmSync(dir, { recursive: true, force: true })
}

console.log(`${OUT}: ${W}x${H}, ${readFileSync(OUT).length} bytes`)
