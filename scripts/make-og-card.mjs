// Bakes the 1200x630 link-preview card.
//
// Design contract (from the design-ui skill):
// - Purpose: in a message thread, say who this is and what he does at a
//   glance. The app already prints the page title and domain under the
//   card, so the image does not repeat them.
// - Art direction: an editorial name card. "Adam Nolle" set large in
//   Instrument Serif, off-white, beside the site's ASCII Earth, which is the
//   one source of surprise and the link back to the hero.
// - Typography: Instrument Serif 400 for the name (one weight, never
//   fake-bolded); Archivo SemiCondensed SemiBold, uppercase and tracked, for
//   the role. A deliberate departure from the site's monospace: the card is
//   a brand artifact read as a thumbnail, and the globe keeps the terminal
//   identity.
// - Surface: black like the hero window. Green only for the globe and the
//   square marker from the site's window chrome. Land is bright and ocean
//   dim, so continents read even when the card is a few hundred pixels wide.
// - Smallest size: checked at 300px wide and edge-cropped, as iMessage shows it.
//
// The globe is the real hero renderer (src/ascii-hero.ts) run in Node against
// a stubbed DOM, so the card shows exactly what the page draws. Fonts are in
// assets/fonts (SIL OFL); they are build inputs only and never ship. Needs
// `magick` (brew install imagemagick); the output is committed, so the build
// never runs this.
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
const SERIF = 'assets/fonts/InstrumentSerif-Regular.ttf'
const LABEL = 'assets/fonts/ArchivoSemiCondensed-SemiBold.otf'
const MONO = '/System/Library/Fonts/Supplemental/Courier New Bold.ttf'

const INK = '#f3f2ec' // off-white for the name
const SOFT = '#b9bcb4' // the role, one step quieter
const GREEN = '#00ff00' // land, marker
const SEA = '#1d7a2c' // ocean dither, deliberately dim

const site = JSON.parse(readFileSync('content/site.json', 'utf8'))
const [wordA, wordB] = site.hero.asciiWords
const title = (w) => w.charAt(0) + w.slice(1).toLowerCase() // ADAM -> Adam

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

// Preview apps crop up to ~5% off each side, and wide previews (iMessage)
// trim ~30px off the top and bottom. Everything stays inside both.
const MX = 88

// ImageMagick reads % as an escape in annotate text.
const esc = (s) => s.replace(/%/g, '%%')
const width = (font, size, text, kerning = 0) =>
  Number(
    execFileSync('magick', ['-font', font, '-pointsize', String(size), '-kerning', String(kerning), `label:${text}`, '-format', '%w', 'info:']).toString()
  )

/* ---- globe: large, on the right, clear of the edges previews crop */
const lines = (await globeText()).map((l) => l.replace(/\s+$/, ''))
const top = lines.findIndex((l) => l.trim())
const bot = lines.findLastIndex((l) => l.trim())
const rows = lines.slice(top, bot + 1)
const left = Math.min(...rows.filter((l) => l.trim()).map((l) => l.search(/\S/)))
const globe = rows.map((l) => l.slice(left))
const gCols = Math.max(...globe.map((l) => l.length))
const D = 540 // diameter in px: clears the top and bottom crop
const em = D / globe.length
const gX = Math.round(870 - (gCols * em * 0.6) / 2)
const gY = Math.round((H - D) / 2)

// Two passes, so land and sea can take different greens. ImageMagick drops
// leading spaces from annotated text, so each row starts at its first
// character's column rather than at the globe's left edge.
const LANDCH = /[#8WM%B@$]/
const pass = (keep) =>
  globe.flatMap((line, y) => {
    const only = [...line].map((c) => (keep(c) ? c : ' ')).join('').replace(/\s+$/, '')
    const lead = only.search(/\S/)
    if (lead < 0) return []
    const x = gX + lead * em * 0.6
    return ['-annotate', `+${x.toFixed(1)}+${(gY + (y + 0.8) * em).toFixed(1)}`, esc(only.slice(lead))]
  })
const land = pass((c) => LANDCH.test(c))
const sea = pass((c) => c !== ' ' && !LANDCH.test(c))

/* ---- name and role, left column on one baseline grid */
const NAME = 178
const LEAD = Math.round(NAME * 0.9)
const nameText = [title(wordA), title(wordB)]
const role = site.hero.lines[0].replace(/^>\s*/, '').split(/\s*·\s*/)
const ROLE = 25
const ROLE_LEAD = 36
const TRACK = 2.4 // ~0.1em, for small uppercase

const cap = NAME * 0.72 // Instrument Serif cap height is 720/1000
const blockH = cap + LEAD + 74 + ROLE_LEAD * (role.length - 1)
const base1 = Math.round((H - blockH) / 2 + cap)
const base2 = base1 + LEAD
const roleY = base2 + 74

const nameRight = MX + Math.max(...nameText.map((t) => width(SERIF, NAME, t, -2)))
if (nameRight > gX + gCols * em * 0.6 * 0.12) throw new Error(`name runs into the globe (${nameRight}px)`)

const LED = 12
execFileSync('magick', [
  '-size', `${W}x${H}`, 'xc:#000000',

  // Globe: dim sea first, then bright land with a soft glow.
  '-font', MONO, '-pointsize', em.toFixed(2),
  '-fill', SEA, ...sea,
  '(', '-size', `${W}x${H}`, 'xc:none', '-font', MONO, '-pointsize', em.toFixed(2), '-fill', GREEN, ...land,
  '(', '+clone', '-blur', '0x6', '-channel', 'A', '-evaluate', 'multiply', '0.45', '+channel', ')',
  '+swap', '-composite', ')', '-composite',

  // Name.
  '-font', SERIF, '-pointsize', String(NAME), '-kerning', '-2', '-fill', INK,
  '-annotate', `+${MX - 4}+${base1}`, nameText[0],
  '-annotate', `+${MX - 4}+${base2}`, nameText[1],

  // Role: the window-chrome marker, then two tracked lines.
  '-fill', GREEN, '-draw', `rectangle ${MX},${roleY - ROLE * 0.72 - 1} ${MX + LED},${roleY - ROLE * 0.72 + LED - 3}`,
  '-font', LABEL, '-pointsize', String(ROLE), '-kerning', String(TRACK), '-fill', SOFT,
  ...role.flatMap((r, i) => ['-annotate', `+${MX + LED + 14}+${roleY + i * ROLE_LEAD}`, esc(r.toUpperCase())]),

  '-dither', 'None', '-colors', '96', '-strip', '-define', 'png:compression-level=9', 'PNG8:' + OUT,
])

console.log(`${OUT}: ${W}x${H}, ${readFileSync(OUT).length} bytes`)
