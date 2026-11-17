<img src="public/media/adamlogo.png" alt="Adam Nolle" width="300">

# adamnolle.com

My corner of the web. A terminal-flavoured portfolio at the root, and the
original 2022 site — bouncing logos and all — still running at
[`/classic/`](https://adamnolle.com/classic/).

Every word, link and list comes out of one JSON file. There is no CMS, no
database, and nothing rendered in the browser: `npm run build` turns
`content/site.json` into finished HTML.

---

## Two sites, one repo

**The current site** (`/`) is a static page in a monospace, high-contrast,
1980s-terminal register: an ASCII Earth rotating behind the name, a projects
grid, a profile block, and a career timeline. Light and dark themes, no
frameworks, no web fonts.

**The classic site** (`/classic/`) is the site I built in 2022 while I was
learning: Bulma for layout, p5.js for a screensaver of tech logos drifting
around my photo. It is preserved rather than rewritten — same structure, same
sketch, same colours — with the bugs fixed and the accessibility gaps closed.

---

## Updating the site

Everything is in **[`content/site.json`](content/site.json)**. Open it, change
what you want, save. Run `npm run dev` first and the page reloads as you type.

The file opens with a `$schema-notes` block explaining the handful of fields
that are not self-evident. Nothing in it is treated as HTML — every value is
escaped — with one exception: `profile.intro` understands
`[label](https://example.com)` links and nothing else.

### Add a project

Append to the `projects` array. Cards render in the order they appear here.

```jsonc
{
  "name": "Cube Solver",
  "kind": "DESKTOP · BROWSER",          // the small caps line under the name
  "source": "https://github.com/WebWorldWide/Cube-Solver",
  "site": "https://example.com",        // optional; adds a VISIT link
  "status": "LIVE",                     // LIVE fills the marker; anything else outlines it
  "accent": "#d6203c",                  // drives the title bar, marker and hover shadow
  "logo": { "type": "image", "src": "/media/logos/cube-solver.webp" },
  "description": "Scramble it or turn faces yourself, then watch it solve.",
  "tags": ["RUST", "WEBASSEMBLY", "TAURI"]
}
```

`status` is free text — `LIVE`, `UNFINISHED`, `ARCHIVED`, whatever fits. Only
`LIVE` gets the filled marker; everything else reads as in-progress.

### Add a project logo

Drop the PNG in `public/media/logos/`, then:

```bash
npm run assets:optimize   # downscale to 108px, i.e. 2× the 54px display size
npm run assets:webp -- public/media/logos/your-file.png   # → .webp, ~70% smaller
```

Reference it as `/media/logos/your-file.webp`. Square images work best.
`assets:webp` needs `cwebp` (`brew install webp`); the PNG it replaces stays in git.

### Regenerate the baked images

A few images are generated rather than drawn. Their output is committed, so the
build never needs these tools — rerun one only when its inputs change.

| Command | Makes | Rerun when |
| --- | --- | --- |
| `npm run assets:globe` | the spinning pixel globes (header + Web World Wide), from webworldwide.online's map in `scripts/world-map.mjs` | you change `GLOBES` in `scripts/render.mjs` |
| `npm run assets:og` | `og-card.png`, the 1200×630 link preview, sized to stay legible as a phone-sized text-message preview | `hero.asciiWords`, the first of `hero.lines`, or `site.url` change (needs ImageMagick). The build versions its URL by content hash, so apps that cache previews pick up the new one |

The favicon is `public/favicon.svg`, the header mark drawn in SVG; it flips
colours with the system theme just as the mark does. `favicon.png`,
`favicon.ico` and `apple-touch-icon.png` are pixel-snapped copies for browsers
that want a bitmap.

### Add a job, a degree, a skill

`history` is a list of groups (`WORK`, `LEADERSHIP`, `EDUCATION` — rename or add
freely), each with `entries`. Inside an entry, `current: true` tints the role
green and fills the timeline marker. Give an entry a `projects` list (each with
`name`, `what`, `tags`, `bullets` and an optional `href`) and they appear as
sub-sections under the role, headed by `projectsLabel`.

`profile.skills` is the three chip cards; `profile.sysinfo` is the SYSINFO table.
Both are plain lists — add a row and it appears.

### Change the wording

- Nav labels and section titles: `header.nav` and `sections`.
- Hero tagline: `hero.lines`. Buttons: `hero.ctas`.
- The hero terminal's title bar: `hero.windowLabel` — leave it empty to hide it.
- Browser tab text: `site.tabTitle`. The longer `site.title` is what shows in
  link previews.
- The classic site's About cards: `classic.about.cards`.

---

## Running it

```bash
npm install
npm run dev        # dev server; reloads on content or CSS changes
npm run build      # typecheck, render to dist/, then check the output
npm run preview    # serve dist/ exactly as it will ship
```

Two dev dependencies: Vite and TypeScript. That is the whole toolchain.

`npm run build` finishes with `scripts/check-build.mjs`, which walks `dist/` for
the mistakes a green build still lets through — class typos, dead CSS, broken
links and anchors, missing images, bad heading order, an `<img>` without `alt`,
a CDN asset without an integrity hash. It fails the build if it finds any, so a
broken deploy never leaves your machine. Run it alone with `npm run check`.

---

## How it is put together

```
content/site.json      every string on the site
scripts/render.mjs     JSON → HTML, pure functions, no dependencies
scripts/check-build.mjs post-build linter over dist/
vite.config.ts         the build: renders pages, inlines CSS, writes the CSP
src/                   stylesheet + the two scripts that ship
public/                images, favicons, CNAME, the p5 sketch
classic/               entry pages for the 2022 site
assets/source/         GIMP files and the full-size portrait
```

The build is a small Vite plugin. For each entry HTML it renders the body from
JSON, inlines the stylesheet into `<head>`, and writes a Content-Security-Policy
that allows inline scripts by SHA-256 hash rather than by `unsafe-inline`.

**What loads on a cold visit:** about 11 kB of gzipped HTML with the CSS already
inside it — so the first paint waits on nothing — plus ~1.4 kB of JavaScript for
the theme toggle and scroll reveals. The ASCII globe and the 16 kB Earth bitmap
are fetched only once the hero nears the viewport, and its loop stops when it
scrolls away or the tab is hidden. `prefers-reduced-motion` renders one still
frame instead.

**Staying at 120fps:** the ASCII globe projects the sphere once per layout, so
a frame is one bitmap lookup per character cell — no trig, no allocation, no
garbage-collector pauses — and it repaints the text on an even 30Hz beat
(every 4th frame at 120Hz) because each repaint rasterises thousands of
glowing glyphs. Rotation runs on elapsed time, so the speed is the same on any
display. The two pixel globes are sprite strips stepped by a CSS animation of
`background-position`: no JavaScript, and each step repaints only the globe's
own small box. The scanline texture is a fixed layer rather than a fixed background,
so scrolling never repaints the viewport.

No web fonts; the whole thing is set in the system monospace face.

### Accessibility

Verified at 320, 390, 768, 1024 and 1920 px in both themes: no contrast pair
below the WCAG AA threshold, no interactive target under 24 × 24 px, no
horizontal scroll, correct heading order, and an accessible name on every
control. Project tiles are one click target each without nesting links, and the
ASCII art is hidden from screen readers behind a real heading.

### On phones

Every hover effect sits behind `@media (hover: hover)`. Touch screens fire
`:hover` on tap and then hold it until you tap somewhere else, which otherwise
leaves nav links stuck highlighted and cards frozen mid-lift. Below 620 px the
header restacks into two deliberate rows instead of wrapping wherever it lands,
and the two hero buttons become one column of identical boxes.

---

## Deploying

Push to `main`. [The Pages workflow](.github/workflows/deploy.yml) runs
`npm ci`, `npm run build`, and publishes `dist/`. The custom domain comes from
`public/CNAME`. Nothing else to do.

---

## Credits

The **original site was designed and built by me, Adam Nolle, on my own** — back
when I was figuring out HTML and CSS for the first time. It taught me most of
what I know about the front end, which is why it still lives at `/classic/`
instead of in the git history. Thanks to
[The Coding Train](https://www.youtube.com/watch?v=0j86zuqqTlQ), whose tutorial
the bouncing-logo sketch grew out of.

The **current site was built by [Claude](https://claude.com/claude-code)**
(Anthropic) from a design I put together in Claude Design: the port to a
JSON-driven static build, the ASCII and pixel globes, the accessibility and
performance work, and the restoration of the classic site.

The one thing that survived unchanged from 2022 is the screensaver. It should be.

---

*Built with [Vite](https://vite.dev). Runs on GitHub Pages. No trackers, no
analytics, no cookies.*
