// Post-build sanity checks over dist/. Catches the mistakes that survive a
// green build: class typos, dead CSS, dangling links and anchors, missing
// assets, invalid nesting, and JS hooks that no longer match the markup.
//
//   npm run check
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, extname, dirname, resolve } from 'node:path'

const DIST = 'dist'
const problems = []
const declared = new Set()
const usedAnywhere = new Set()
const note = (kind, msg) => problems.push(`${kind}: ${msg}`)

function walk(dir) {
  const out = []
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else out.push(p)
  }
  return out
}

if (!existsSync(DIST)) {
  console.error('dist/ not found — run `npm run build` first')
  process.exit(2)
}

const files = walk(DIST)
const pages = files.filter((f) => extname(f) === '.html')
const assetPaths = new Set(files.map((f) => '/' + f.slice(DIST.length + 1).replace(/\\/g, '/')))

for (const page of pages) {
  const html = readFileSync(page, 'utf8')
  const where = page.replace(/\\/g, '/')

  /* ---------------------------------------------------- template placeholders */

  for (const m of html.matchAll(/<!--@[a-z]+-->/g)) {
    note('placeholder', `${where} still contains ${m[0]}`)
  }

  /* -------------------------------------------------------------- CSS classes */

  const styleBlocks = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n')
  const cssClasses = new Set([...styleBlocks.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]))

  const used = new Set()
  for (const m of html.matchAll(/\sclass="([^"]*)"/g)) {
    for (const c of m[1].split(/\s+/).filter(Boolean)) used.add(c)
  }

  // Bulma supplies the classic pages' classes from a CDN sheet.
  if (!where.includes('classic')) {
    for (const c of used) {
      if (!cssClasses.has(c)) note('unstyled class', `${where} uses .${c} with no rule`)
    }
    // A class is only dead if no page shipping this sheet uses it, so the
    // verdict waits until every page has been read.
    for (const c of cssClasses) declared.add(c)
    for (const c of used) usedAnywhere.add(c)
  }

  /* --------------------------------------------------------- links + anchors */

  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))
  const seenIds = new Map()
  for (const m of html.matchAll(/\sid="([^"]+)"/g)) {
    seenIds.set(m[1], (seenIds.get(m[1]) ?? 0) + 1)
  }
  for (const [id, n] of seenIds) if (n > 1) note('duplicate id', `${where} has ${n}x #${id}`)

  for (const m of html.matchAll(/\shref="([^"]+)"/g)) {
    const href = m[1]
    if (href.startsWith('#')) {
      if (href !== '#' && !ids.has(href.slice(1))) {
        note('dead anchor', `${where} links to ${href}, no such id`)
      }
    } else if (href.startsWith('/')) {
      const clean = href.split(/[?#]/)[0]
      const candidates = [clean, clean.replace(/\/$/, '/index.html')]
      if (!candidates.some((c) => assetPaths.has(c))) {
        note('dead link', `${where} links to ${href}, not in dist`)
      }
    }
  }

  for (const m of html.matchAll(/\ssrc="([^"]+)"/g)) {
    const src = m[1]
    if (!src.startsWith('/')) continue
    if (!assetPaths.has(src.split(/[?#]/)[0])) note('missing asset', `${where} references ${src}`)
  }

  /* ------------------------------------------------------- external link safety */

  for (const m of html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) {
    if (!/rel="[^"]*noopener/.test(m[0])) {
      note('unsafe target', `${where} opens a new tab without rel=noopener`)
    }
  }

  /* -------------------------------------------------------------- accessibility */

  if (!/<html[^>]+lang="[a-z]/i.test(html)) note('a11y', `${where} has no lang attribute`)
  if (!/<title>[^<]+<\/title>/.test(html)) note('a11y', `${where} has no title`)

  for (const m of html.matchAll(/<img\b[^>]*>/g)) {
    if (!/\salt=/.test(m[0])) note('a11y', `${where} has an <img> with no alt`)
    if (!/\swidth=/.test(m[0]) || !/\sheight=/.test(m[0])) {
      note('cls risk', `${where} has an <img> with no intrinsic size`)
    }
  }

  const headings = [...html.matchAll(/<h([1-6])\b/g)].map((m) => +m[1])
  if (headings.filter((h) => h === 1).length !== 1) {
    note('a11y', `${where} has ${headings.filter((h) => h === 1).length} <h1> (want exactly 1)`)
  }
  headings.reduce((prev, h) => {
    if (prev && h > prev + 1) note('a11y', `${where} jumps h${prev} -> h${h}`)
    return h
  }, 0)

  /* ------------------------------------------------------------ HTML nesting */

  if (/<a\b[^>]*>(?:(?!<\/a>)[\s\S])*<a\b/.test(html)) note('nesting', `${where} nests <a> in <a>`)
  if (/<p\b[^>]*>(?:(?!<\/p>)[\s\S])*?<(?:div|ul|ol|h[1-6])\b/.test(html)) {
    note('nesting', `${where} puts block content inside <p>`)
  }
  if (/<span\b[^>]*>(?:(?!<\/span>)[\s\S])*?<(?:div|p|h[1-6]|ul|ol)\b/.test(html)) {
    note('nesting', `${where} puts flow content inside <span>`)
  }

  /* ---------------------------------------------------------------------- CSP */

  const csp = html.match(/Content-Security-Policy" content="([^"]*)"/)
  if (!csp) {
    note('csp', `${where} has no Content-Security-Policy`)
  } else {
    const inline = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)]
    const hashes = (csp[1].match(/'sha256-[^']+'/g) ?? []).length
    if (inline.length !== hashes) {
      note('csp', `${where} has ${inline.length} inline script(s) but ${hashes} hash(es)`)
    }
    if (/unsafe-inline/.test(csp[1].split('script-src')[1]?.split(';')[0] ?? '')) {
      note('csp', `${where} allows unsafe-inline scripts`)
    }
  }

  /* --------------------------------------------- subresource integrity on CDNs */

  // Only things that execute or style the page need it — preconnect hints and
  // rel=canonical fetch nothing.
  for (const m of html.matchAll(/<script\b[^>]*\bsrc="https:\/\/[^"]+"[^>]*>/g)) {
    if (!/integrity="/.test(m[0])) note('sri', `${where} loads a remote script without integrity`)
  }
  for (const m of html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g)) {
    if (!/href="https:\/\//.test(m[0])) continue
    if (!/integrity="/.test(m[0])) note('sri', `${where} loads a remote stylesheet without integrity`)
  }
}

/* -------------------------------------------- dead CSS, judged across pages */

for (const c of declared) {
  // State classes are added at runtime, so they never appear in the markup.
  if (['reveal-init', 'reveal-in'].includes(c)) continue
  if (!usedAnywhere.has(c)) note('dead css', `.${c} is defined but never used on any page`)
}

/* ------------------------------------------------- JS hooks match the markup */

const indexHtml = readFileSync(join(DIST, 'index.html'), 'utf8')
for (const hook of ['data-ascii', 'data-globe', 'data-theme-toggle', 'data-reveal', 'data-hero-name']) {
  if (!indexHtml.includes(hook)) note('js hook', `dist/index.html has no [${hook}]`)
}

const srcMain = readFileSync('src/main.ts', 'utf8')
for (const m of srcMain.matchAll(/querySelector(?:All)?<[^>]*>\('\[([a-z-]+)\]'\)/g)) {
  if (!indexHtml.includes(m[1])) note('js hook', `main.ts queries [${m[1]}], absent from the page`)
}

/* ---------------------------------------------------- every project resolves */

const content = JSON.parse(readFileSync('content/site.json', 'utf8'))
for (const p of content.projects) {
  if (!p.source) note('content', `project "${p.name}" has no source`)
  if (p.logo?.type === 'image') {
    const local = join(DIST, p.logo.src.replace(/^\//, ''))
    if (!existsSync(local)) note('content', `project "${p.name}" logo missing: ${p.logo.src}`)
  }
  for (const url of [p.site, p.source].filter(Boolean)) {
    if (!/^https:\/\//.test(url)) note('content', `project "${p.name}" has a non-https url: ${url}`)
  }
}

/* -------------------------------------------------------------------- report */

if (problems.length) {
  for (const p of problems) console.error(p)
  console.error(`\n${problems.length} problem(s)`)
  process.exit(1)
}
console.log(`clean — ${pages.length} pages, ${files.length} files checked`)
