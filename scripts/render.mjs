// Renders content/site.json to static HTML at build time.
//
// Everything here is a pure function of the JSON, so the shipped pages need no
// client-side templating: first paint costs zero JavaScript and the site still
// reads correctly with scripting disabled.

/** Escape text for use in element content or a double-quoted attribute. */
export const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const isExternal = (href) => /^https?:\/\//i.test(String(href ?? ''))

/** Attributes that make an external link safe and announce the new tab. */
const extAttrs = (href) =>
  isExternal(href) ? ' target="_blank" rel="noopener noreferrer"' : ''

const newTabNote = (href) =>
  isExternal(href) ? '<span class="sr-only"> (opens in a new tab)</span>' : ''

/**
 * Minimal inline markup for prose fields: `[label](https://url)` only.
 * Everything else is escaped, so JSON can never inject HTML.
 */
export function rich(text) {
  const out = []
  const src = String(text ?? '')
  const re = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g
  let last = 0
  let m
  while ((m = re.exec(src))) {
    out.push(esc(src.slice(last, m.index)))
    out.push(
      `<a class="inlink" href="${esc(m[2])}"${extAttrs(m[2])}>${esc(m[1])}${newTabNote(m[2])}</a>`
    )
    last = m.index + m[0].length
  }
  out.push(esc(src.slice(last)))
  return out.join('')
}

const ICONS = {
  github:
    '<path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>',
  linkedin:
    '<path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z"/>',
  youtube:
    '<path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.6 15.6V8.4l6.2 3.6-6.2 3.6z"/>',
}

const icon = (name) =>
  `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name] ?? ''}</svg>`

/* ------------------------------------------------------------------ header */

function renderHeader(d) {
  const h = d.header
  const nav = h.nav
    .map(
      (n) =>
        `<a class="navlink" href="${esc(n.href)}"${extAttrs(n.href)}>${esc(n.label)}${newTabNote(n.href)}</a>`
    )
    .join('\n        ')

  // title gives the hover tooltip; aria-label is the accessible name. They are
  // allowed to differ — the tooltip stays short, the label can be fuller.
  const social = h.social
    .map(
      (s) =>
        `<a class="iconlink" href="${esc(s.href)}"${extAttrs(s.href)} title="${esc(s.tooltip ?? s.label)}" aria-label="${esc(s.label)}">${icon(s.icon)}</a>`
    )
    .join('\n        ')

  // Old-computer glyph for the classic site, drawn exactly as designed.
  const crt =
    '<svg class="ico ico--crt" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<rect x="4.6" y="2.6" width="14.8" height="12.9" rx="1.6" fill="#a6a6a6" stroke="currentColor" stroke-width="1.5"/>' +
    '<rect x="6.6" y="4.6" width="10.8" height="8.9" rx="1" fill="#000"/>' +
    '<rect x="7.7" y="11.2" width="8.6" height="2" rx="1" fill="#1668f0"/>' +
    '<rect x="3.1" y="17.1" width="17.8" height="4.2" rx="1.1" fill="#a6a6a6" stroke="currentColor" stroke-width="1.5"/>' +
    '<rect x="4.9" y="18.8" width="9.6" height="0.9" rx="0.45" fill="#000"/>' +
    '<circle cx="17.7" cy="19.2" r="1.05" fill="#000"/></svg>'

  // The two groups are `display: contents` on wide screens, so the bar is one
  // flat row exactly as designed. Below 620px they become real rows, which
  // beats letting a dozen flex children wrap wherever they land.
  return `<header class="hdr">
    <nav class="hdr__bar" aria-label="Primary">
      <a class="hdr__home" href="#top" aria-label="${esc(h.homeLabel)}">
        <span class="mark" aria-hidden="true"><span class="mark__dash"></span></span>
      </a>
      <span class="hair" aria-hidden="true"></span>
      <div class="hdr__links">
        ${nav}
      </div>
      <span class="hair" aria-hidden="true"></span>
      <div class="hdr__tools">
        ${social}
        <span class="hair" aria-hidden="true"></span>
        <a class="iconlink" href="${esc(h.classicLink.href)}" title="${esc(h.classicLink.tooltip ?? h.classicLink.label)}" aria-label="${esc(h.classicLink.label)}">${crt}</a>
        <span class="hair" aria-hidden="true"></span>
        <button class="themebtn" type="button" data-theme-toggle title="${esc(h.themeToggle.toDark)}" aria-label="${esc(h.themeToggle.toDark)}">
          <svg class="ico ico--sm" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2a10 10 0 0 0 0 20z" fill="currentColor"/></svg>
        </button>
      </div>
    </nav>
  </header>`
}

/* -------------------------------------------------------------------- hero */

function renderHero(d) {
  const h = d.hero
  const ctas = h.ctas
    .map(
      (c) =>
        `<a class="cta cta--${esc(c.variant)}" href="${esc(c.href)}"${extAttrs(c.href)}>${esc(c.label)}</a>`
    )
    .join('\n            ')

  // An empty windowLabel just drops the label; the title bar keeps its rule.
  const label = h.windowLabel ? `\n          <span class="win__label">${esc(h.windowLabel)}</span>` : ''

  return `<section class="hero">
      <div class="win win--hero">
        <div class="win__bar">
          <span class="win__led" aria-hidden="true"></span>
          <span class="win__dashes" aria-hidden="true"></span>${label}
        </div>
        <div class="win__body">
          <h1 class="sr-only">${esc(h.heading)}</h1>
          <pre class="hero__ascii" data-ascii data-ascii-words="${esc(h.asciiWords.join('|'))}" aria-hidden="true"></pre>
          <div class="hero__meta">
            <span class="hero__name" data-hero-name>${esc(h.nameFallback)}</span>
            <span class="hero__lines">
              ${h.lines.map((l) => `<span>${esc(l)}</span>`).join('\n              ')}
            </span>
          </div>
          <div class="hero__ctas">
            ${ctas}
          </div>
        </div>
      </div>
    </section>`
}

/* --------------------------------------------------------- section heading */

function sectionHead(s, id) {
  return `<div class="shead" data-reveal>
      <span class="shead__num" aria-hidden="true">${esc(s.num)}</span>
      <h2 class="shead__title" id="${esc(id)}-title">${esc(s.title)}</h2>
      <span class="shead__rule" aria-hidden="true"></span>
    </div>`
}

/* ---------------------------------------------------------------- projects */

function projectLogo(p) {
  const l = p.logo ?? {}
  if (l.type === 'habitGrid') {
    const cells = (l.cells ?? []).map((v) => `<span style="opacity:${Number(v)}"></span>`).join('')
    return `<div class="card__logo card__logo--grid" aria-hidden="true"><span class="habit">${cells}</span></div>`
  }
  if (l.type === 'dot') {
    return `<div class="card__logo card__logo--dot" style="background:${esc(l.bg)}" aria-hidden="true"><span></span></div>`
  }
  return `<div class="card__logo" aria-hidden="true"><img src="${esc(l.src)}" alt="" width="108" height="108" loading="lazy" decoding="async"></div>`
}

function renderProjects(d) {
  const cards = d.projects
    .map((p) => {
      const live = p.status === 'LIVE'
      const solidBar = p.bar ? p.bar === 'solid' : live
      const vars = [`--a:${p.accent}`, `--card-shadow:${p.hoverShadow ?? p.accent}`].join(';')

      // The title links to the live build when there is one, else to the
      // source. Its ::after covers the card, which is what makes the whole
      // tile clickable without nesting one link inside another.
      const primary = p.site ?? p.source
      const primaryLabel = p.site ? 'VISIT' : 'SOURCE'

      // The card itself already goes to the primary destination, so that one
      // is plain text; only a genuinely different URL becomes a second link.
      const actions =
        p.site && p.source
          ? `<span class="card__action" aria-hidden="true">VISIT →</span>
            <a class="card__action card__action--src" href="${esc(p.source)}"${extAttrs(p.source)}
              aria-label="${esc(`${p.name} source on GitHub`)}">SOURCE →</a>`
          : `<span class="card__action" aria-hidden="true">${primaryLabel} →</span>`

      return `<article class="card${solidBar ? '' : ' card--wip'}" style="${esc(vars)}" data-reveal>
        <div class="card__bar" aria-hidden="true">
          <span class="card__led"></span>
          <span class="card__dashes"></span>
        </div>
        <div class="card__body">
          <div class="card__top">
            ${projectLogo(p)}
            <div class="card__id">
              <h3 class="card__name"><a class="card__primary" href="${esc(primary)}"${extAttrs(primary)}>${esc(p.name)}${newTabNote(primary)}</a></h3>
              <span class="card__kind">${esc(p.kind)}</span>
            </div>
          </div>
          <p class="card__desc">${esc(p.description)}</p>
          <ul class="tags">${p.tags.map((t) => `<li class="tag">${esc(t)}</li>`).join('')}</ul>
          <div class="card__foot">
            <span class="card__status"><span class="dot" aria-hidden="true"></span>${esc(p.status)}</span>
            <span class="card__actions">
            ${actions}
            </span>
          </div>
        </div>
      </article>`
    })
    .join('\n\n      ')

  return `<section id="work" class="sec" aria-labelledby="work-title">
    ${sectionHead(d.sections.work, 'work')}
    <div class="grid grid--projects">
      ${cards}
    </div>
  </section>`
}

/* ----------------------------------------------------------------- profile */

function renderProfile(d) {
  const p = d.profile

  const rows = p.sysinfo
    .map((r) => {
      const value = r.href
        ? `<a class="metalink" href="${esc(r.href)}"${extAttrs(r.href)}>${esc(r.value)}${newTabNote(r.href)}</a>`
        : esc(r.value)
      return `<div class="meta__row">
            <dt class="meta__key">${esc(r.label)}</dt>
            <dd class="meta__val">${value}</dd>
          </div>`
    })
    .join('\n          ')

  const skills = p.skills
    .map(
      (s) => `<div class="panel chips" data-reveal>
          <div class="win__bar">
            <span class="win__led" style="background:${esc(s.accent)}" aria-hidden="true"></span>
            <span class="win__dashes win__dashes--ink" aria-hidden="true"></span>
            <h3 class="win__label">${esc(s.group)}</h3>
          </div>
          <ul class="chips__list">
            ${s.items.map((i) => `<li class="chip">${esc(i)}</li>`).join('')}
          </ul>
        </div>`
    )
    .join('\n        ')

  return `<section id="about" class="sec" aria-labelledby="about-title">
    ${sectionHead(d.sections.about, 'about')}
    <div class="profile">
      <div class="panel bio" data-reveal>
        <p class="bio__lead">${rich(p.intro)}</p>
        <p class="bio__sub">${esc(p.secondary)}</p>
      </div>
      <div class="panel" data-reveal>
        <div class="win__bar">
          <span class="win__led win__led--green" aria-hidden="true"></span>
          <span class="win__dashes win__dashes--ink" aria-hidden="true"></span>
          <h3 class="win__label">${esc(p.sysinfoLabel)}</h3>
        </div>
        <dl class="meta">
          ${rows}
        </dl>
      </div>
      <div class="grid grid--skills">
        ${skills}
      </div>
    </div>
  </section>`
}

/* -------------------------------------------------------- web world wide */

function renderWww(d) {
  const w = d.www
  const links = w.links
    .map(
      (l) => `<a class="wwwlink" href="${esc(l.href)}"${extAttrs(l.href)}>
              <span class="wwwlink__label">${esc(l.label)}</span>
              <span class="wwwlink__sub">${esc(l.sub)}${newTabNote(l.href)}</span>
            </a>`
    )
    .join('\n            ')

  return `<section id="www" class="sec" aria-labelledby="www-title">
    ${sectionHead(d.sections.www, 'www')}
    <div class="win win--www" data-reveal>
      <div class="win__bar">
        <span class="win__led win__led--green" aria-hidden="true"></span>
        <span class="win__dashes win__dashes--pale" aria-hidden="true"></span>
        <span class="win__label win__label--green">${esc(w.windowLabel)}</span>
      </div>
      <div class="www">
        <div class="www__globe">
          <canvas data-globe aria-hidden="true" width="220" height="220"></canvas>
          <p class="www__caption">${esc(w.globeCaption)}</p>
        </div>
        <div class="www__body">
          <p class="www__tagline">${esc(w.tagline)}</p>
          <div class="www__links">
            ${links}
          </div>
        </div>
      </div>
    </div>
  </section>`
}

/* ----------------------------------------------------------------- history */

function renderHistory(d) {
  const groups = d.history
    .map((g) => {
      const head = `<div class="tl__group" data-reveal><span class="tl__label" style="color:${esc(g.accent)}">${esc(g.label)}</span></div>`

      const items = g.entries
        .map((e) => {
          const filled = e.current || e.marker
          const bullets = e.bullets
            .map(
              (b) =>
                `<li class="bul"><span class="bul__mark" aria-hidden="true"></span><span>${esc(b)}</span></li>`
            )
            .join('\n              ')
          const tags = e.tags?.length
            ? `<ul class="tags tags--hair">${e.tags.map((t) => `<li class="tag">${esc(t)}</li>`).join('')}</ul>`
            : ''

          return `<div class="tl__item" data-reveal>
            <span class="tl__marker${filled ? '' : ' tl__marker--hollow'}" style="--m:${esc(g.accent)}" aria-hidden="true"></span>
            <div class="tl__head">
              <h3 class="tl__org">${esc(e.org)}</h3>
              <span class="tl__period">${esc(e.period)}</span>
            </div>
            <div class="tl__sub">
              <span class="tl__role${e.current ? ' tl__role--now' : ''}">${esc(e.role)}</span>
              <span class="tl__loc">${esc(e.location)}</span>
            </div>
            <ul class="tl__bullets">
              ${bullets}
            </ul>
            ${tags}
          </div>`
        })
        .join('\n\n          ')

      return `${head}\n\n          ${items}`
    })
    .join('\n\n          ')

  return `<section id="history" class="sec" aria-labelledby="history-title">
    ${sectionHead(d.sections.history, 'history')}
    <div class="tl">
      ${groups}
    </div>
  </section>`
}

/* -------------------------------------------------------------- full pages */

export function renderHead(d, { title, description } = {}) {
  const s = d.site
  // The tab always reads plainly; the descriptive title is kept for sharing.
  const desc = description ?? s.description
  const share = title ?? s.title
  return `<title>${esc(s.tabTitle)}</title>
    <meta name="description" content="${esc(desc)}">
    <meta name="author" content="${esc(s.author)}">
    <meta name="color-scheme" content="light dark">
    <meta name="theme-color" content="${esc(s.themeColor.light)}" media="(prefers-color-scheme: light)">
    <meta name="theme-color" content="${esc(s.themeColor.dark)}" media="(prefers-color-scheme: dark)">
    <link rel="canonical" href="${esc(s.url)}">
    <link rel="icon" href="/favicon.png">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="${esc(s.tabTitle)}">
    <meta property="og:title" content="${esc(share)}">
    <meta property="og:description" content="${esc(desc)}">
    <meta property="og:url" content="${esc(s.url)}">
    <meta property="og:image" content="${esc(new URL(s.ogImage, s.url).href)}">
    <meta name="twitter:card" content="summary_large_image">`
}

export function renderIndex(d) {
  return `<a class="skip" href="#main">Skip to content</a>
${renderHeader(d)}

  <main id="main" class="wrap">
    ${renderHero(d)}

    ${renderProjects(d)}

    ${renderProfile(d)}

    ${renderWww(d)}

    ${renderHistory(d)}

    <div class="tailspace" aria-hidden="true"></div>
  </main>`
}

export function renderNotFound(d) {
  const n = d.notFound
  const links = n.links
    .map((l) => `<a class="cta cta--${esc(l.variant)}" href="${esc(l.href)}">${esc(l.label)}</a>`)
    .join('\n            ')

  return `<main id="main" class="wrap wrap--center">
    <section class="hero">
      <div class="win win--hero">
        <div class="win__bar">
          <span class="win__led" aria-hidden="true"></span>
          <span class="win__dashes" aria-hidden="true"></span>
          <span class="win__label">${esc(n.windowLabel)}</span>
        </div>
        <div class="win__body">
          <h1 class="nf__code">${esc(n.heading)}</h1>
          <p class="nf__msg">${esc(n.message)}</p>
          <div class="hero__ctas">
            ${links}
          </div>
        </div>
      </div>
    </section>
  </main>`
}

/* ------------------------------------------------------------ classic site */

function classicNav(d) {
  // The 2022 original pulled these three glyphs from Font Awesome's 1.7 MB
  // all.js. They are the same icons the new site already inlines, so the
  // classic page uses those instead and loads no icon library at all.
  const items = d.classic.nav
    .map((n) => {
      const glyph = n.icon ? `<span class="icon">${icon(n.icon)}</span>` : ''
      const text = n.iconOnly
        ? `<span class="sr-only">${esc(n.label)}</span>`
        : n.icon
          ? `<span>${esc(n.label)}</span>`
          : esc(n.label)
      const inner = n.icon ? `<span class="icon-text">${glyph}${text}</span>` : text
      return `<a href="${esc(n.href)}" class="navbar-item"${extAttrs(n.href)}>${inner}</a>`
    })
    .join('\n            ')

  return `<nav class="navbar is-black" aria-label="Primary">
      <div class="container">
        <div class="navbar-brand">
          <a class="navbar-item" href="/classic/" aria-label="Adam Nolle — classic home">
            <img src="/media/adamlogo.png" alt="" width="600" height="120">
          </a>
          <button type="button" class="navbar-burger burger" data-target="navMenu"
            aria-label="Menu" aria-expanded="false" aria-controls="navMenu">
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
          </button>
        </div>
        <div id="navMenu" class="navbar-menu">
          <div class="navbar-end">
            ${items}
          </div>
        </div>
      </div>
    </nav>`
}

function classicBack(d) {
  const c = d.classic
  return `<a class="backhome" href="${esc(c.backHref)}">
      <span class="backhome__mark" aria-hidden="true"><span></span></span>
      <span>&#8592; ${esc(c.backLabel)}</span>
    </a>`
}

export function renderClassic(d) {
  return `${classicNav(d)}
    <h1 class="sr-only">${esc(d.classic.heading)}</h1>
    <p class="sr-only">${esc(d.classic.canvasAlt)}</p>
    ${classicBack(d)}`
}

export function renderClassicAbout(d) {
  const cards = d.classic.about.cards
    .map(
      (c) => `<div class="container is-fluid mt-5 mb-5">
      <div class="notification has-background-${esc(c.tone)}-dark has-text-white">
        <h2 class="title is-5 has-text-white">${esc(c.title)}</h2>
        ${c.body.map((p) => `<p>${esc(p)}</p>`).join('\n        ')}
      </div>
    </div>`
    )
    .join('\n    ')

  return `${classicNav(d)}
    <main id="main">
      <h1 class="sr-only">${esc(d.classic.about.title)}</h1>
      ${cards}
    </main>
    ${classicBack(d)}`
}
