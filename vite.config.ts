import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'

import { minifyCss } from './scripts/minify-css.mjs'
import {
  renderHead,
  renderIndex,
  renderClassic,
  renderClassicAbout,
  renderNotFound,
} from './scripts/render.mjs'

const root = process.cwd()
const CONTENT = resolve(root, 'content/site.json')

const read = (p: string) => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n')
const content = () => JSON.parse(read('content/site.json'))
const attr = (s: string) => String(s).replace(/"/g, '&quot;')

/** Which page an entry HTML file is, derived from its path. */
function pageOf(path: string) {
  const p = path.replace(/\\/g, '/')
  if (p.includes('classic/about')) return 'classicAbout'
  if (p.includes('classic/')) return 'classic'
  if (p.includes('404')) return 'notFound'
  return 'index'
}

const STYLES: Record<string, string[]> = {
  index: ['src/styles.css'],
  notFound: ['src/styles.css'],
  classic: ['src/classic/classic.css'],
  classicAbout: ['src/classic/classic.css'],
}

/** Third-party origins the classic page still loads Bulma and p5 from. */
const CLASSIC_CDN = ['https://cdn.jsdelivr.net', 'https://cdnjs.cloudflare.com']

/**
 * Builds a Content-Security-Policy for a finished page.
 *
 * Every inline <script> is allowed by its own SHA-256 hash rather than by
 * 'unsafe-inline', so an injected script would be refused. Inline *style
 * attributes* (the per-card accent variables) cannot be hashed, so style-src
 * keeps 'unsafe-inline'; that is a styling vector only, not a scripting one.
 *
 * GitHub Pages cannot set response headers, so this ships as a meta tag.
 * frame-ancestors and X-Content-Type-Options are header-only and therefore
 * cannot be expressed here.
 */
function contentSecurityPolicy(html: string, page: string) {
  const hashes: string[] = []
  const inlineScript = /<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g
  let m: RegExpExecArray | null
  while ((m = inlineScript.exec(html))) {
    hashes.push(`'sha256-${createHash('sha256').update(m[1], 'utf8').digest('base64')}'`)
  }

  const cdn = page === 'classic' || page === 'classicAbout' ? CLASSIC_CDN.join(' ') : ''

  return [
    `default-src 'self'`,
    `script-src 'self' ${cdn} ${hashes.join(' ')}`.replace(/\s+/g, ' ').trim(),
    `style-src 'self' 'unsafe-inline' ${cdn}`.replace(/\s+/g, ' ').trim(),
    `img-src 'self' data:`,
    `font-src 'self'`,
    `connect-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'none'`,
    `upgrade-insecure-requests`,
  ].join('; ')
}

/**
 * Renders content/site.json into each entry HTML and inlines the stylesheet.
 *
 * The CSS is injected as a <style> tag rather than linked so a cold visit
 * paints without a second round-trip; it is small enough that inlining beats
 * caching it separately. Rendering happens here, at build time, so the shipped
 * pages need no client-side templating.
 */
function siteSSG(): Plugin {
  let isBuild = false

  return {
    name: 'site-ssg',

    configResolved(cfg) {
      isBuild = cfg.command === 'build'
    },

    configureServer(server) {
      // Editing content or CSS should reload the page in dev.
      server.watcher.add(CONTENT)
      server.watcher.on('change', (file) => {
        const f = file.replace(/\\/g, '/')
        if (f.endsWith('content/site.json') || f.endsWith('.css')) {
          server.ws.send({ type: 'full-reload', path: '*' })
        }
      })
    },

    async transformIndexHtml(rawHtml, ctx) {
      // Normalise line endings before anything hashes or emits the markup, so
      // a Windows checkout and a Linux runner produce byte-identical output.
      const html = rawHtml.replace(/\r\n/g, '\n')
      const d = content()
      const page = pageOf(ctx.path)

      const body =
        page === 'classic'
          ? renderClassic(d)
          : page === 'classicAbout'
            ? renderClassicAbout(d)
            : page === 'notFound'
              ? renderNotFound(d)
              : renderIndex(d)

      const title =
        page === 'classic'
          ? d.classic.title
          : page === 'classicAbout'
            ? d.classic.about.title
            : page === 'notFound'
              ? d.notFound.title
              : d.site.title

      let css = STYLES[page].map(read).join('\n')
      if (isBuild) css = minifyCss(css)

      // Config the classic p5 sketch reads, so its assets stay JSON-driven.
      const classicCfg =
        page === 'classic'
          ? `\n    <script>window.__CLASSIC__=${JSON.stringify(d.classic.bouncing)}</script>`
          : ''

      const out = html
        .replace('<!--@lang-->', attr(d.site.lang))
        .replace(
          '<!--@head-->',
          `${renderHead(d, { title })}\n    <style>${css}</style>${classicCfg}`
        )
        .replace('<!--@body-->', body)

      // Hashes are taken from the finished markup, so the policy always
      // matches the inline scripts actually present.
      const csp = contentSecurityPolicy(out, page)
      return out.replace(
        '<meta charset="utf-8" />',
        `<meta charset="utf-8" />\n    <meta http-equiv="Content-Security-Policy" content="${attr(csp)}" />\n    <meta name="referrer" content="strict-origin-when-cross-origin" />`
      )
    },
  }
}

// Apex custom domain (adamnolle.com) is served from the site root.
export default defineConfig({
  base: '/',
  appType: 'mpa',
  plugins: [siteSSG()],
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: false,
    cssCodeSplit: false,
    // The es2022 target already supports modulepreload, and dropping the
    // polyfill keeps the page free of Vite-injected inline script.
    modulePreload: { polyfill: false },
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        classic: resolve(root, 'classic/index.html'),
        classicAbout: resolve(root, 'classic/about.html'),
        notFound: resolve(root, '404.html'),
      },
    },
  },
})
