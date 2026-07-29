# adamnolle.com

```
 ###   ####    ##   #    #
#   #  #   #  #  #  ##  ##
#####  #   #  ####  # ## #
#   #  ####  #    # #    #    Application Developer
```

My corner of the web. A terminal-flavoured portfolio at the root, and the
original 2022 site — bouncing logos and all — still running at
[`/classic/`](https://adamnolle.com/classic/).

Every word, link and list on the site comes out of a single JSON file. There is
no CMS, no database, and nothing to render at runtime: `npm run build` turns
`content/site.json` into finished HTML.

---

## Two sites, one repo

**The current site** (`/`) is a static page in a monospace, high-contrast,
1980s-terminal register: an ASCII Earth that rotates behind the name, a projects
grid, a profile block, and a career timeline. Light and dark themes, no
frameworks, no web fonts.

**The classic site** (`/classic/`) is the site I built in 2022 while I was
learning: Bulma for layout, p5.js for a screensaver of tech logos drifting around
my photo. It is preserved rather than rewritten — same structure, same sketch,
same colours — with the bugs fixed and the accessibility gaps closed.

---

## Editing the site

Everything lives in **[`content/site.json`](content/site.json)**. Add a project:

```jsonc
{
  "name": "Cube Solver",
  "kind": "DESKTOP · BROWSER",
  "source": "https://github.com/AdamNolle/Cube-Solver",
  "site": "https://example.com",        // optional — adds a VISIT link
  "status": "LIVE",                     // LIVE fills the marker, anything else outlines it
  "accent": "#d6203c",
  "logo": { "type": "image", "src": "/media/logos/cube-solver.png" },
  "description": "Scramble it or turn faces yourself, then watch it solve.",
  "tags": ["RUST", "WEBASSEMBLY", "TAURI"]
}
```

Then `npm run dev` and the page reloads as you type. The file opens with a
`$schema-notes` block explaining the handful of fields that are not obvious.

Nothing in the JSON is treated as HTML — every value is escaped. One exception:
`profile.intro` understands `[label](https://example.com)` and nothing else.

---

## Running it

```bash
npm install
npm run dev        # dev server, reloads on content or CSS changes
npm run build      # typecheck, then render to dist/
npm run preview    # serve dist/ exactly as it will ship
```

Two dev dependencies: Vite and TypeScript. That is the whole toolchain.

---

## How it is put together

```
content/site.json      every string on the site
scripts/render.mjs     JSON → HTML, pure functions, no dependencies
vite.config.ts         the build: renders pages, inlines CSS, writes the CSP
src/                   stylesheet + the three scripts that ship
public/                images, favicon, CNAME, the p5 sketch
classic/               entry pages for the 2022 site
```

The build is a small Vite plugin. For each entry HTML it renders the body from
JSON, inlines the stylesheet into `<head>`, and writes a Content-Security-Policy
that allows inline scripts by SHA-256 hash rather than by `unsafe-inline`.

**What actually loads on a cold visit:** about 11 kB of gzipped HTML with the CSS
already inside it — so the first paint waits on nothing — plus ~1.4 kB of
JavaScript for the theme toggle and scroll reveals. The ASCII globe, the
wireframe globe and the 16 kB Earth bitmap are fetched only once their section
approaches the viewport, and their animation loops stop when they scroll away or
the tab is hidden. `prefers-reduced-motion` renders one still frame instead.

There are no web fonts; the whole thing is set in the system monospace face.

### Accessibility

Verified at 320, 390, 768, 1024 and 1920 px, in both themes: no contrast pair
below the WCAG AA threshold, no interactive target under 24 × 24 px, no
horizontal scroll, correct heading order, and an accessible name on every
control. The project tiles are one click target each without nesting links, and
the ASCII art is hidden from screen readers behind a real heading.

---

## Deploying

Pushing to `main` runs [the Pages workflow](.github/workflows/deploy.yml):
`npm ci`, `npm run build`, publish `dist/`. The custom domain comes from
`public/CNAME`.

---

## Credits

The **original site was designed and built by me, Adam Nolle, on my own** — back
when I was figuring out HTML and CSS for the first time. It taught me most of
what I know about the front end, which is why it is still here at `/classic/`
instead of in the git history. Thanks to
[The Coding Train](https://www.youtube.com/watch?v=0j86zuqqTlQ), whose tutorial
the bouncing-logo sketch grew out of.

The **current site was built by [Claude](https://claude.com/claude-code)**
(Anthropic) from a design I put together in Claude Design: the port to a
JSON-driven static build, the ASCII and wireframe globes, the accessibility and
performance work, and the restoration of the classic site.

The one thing that survived unchanged from 2022 is the screensaver. It should be.

---

*Built with [Vite](https://vite.dev). Runs on GitHub Pages. No trackers, no
analytics, no cookies.*
