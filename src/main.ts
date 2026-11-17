/**
 * Page bootstrap: theme, scroll reveal, and the ASCII hero.
 * The Web World Wide globes are CSS-only (see scripts/make-www-globe.mjs).
 * Everything below is progressive enhancement — the page is fully
 * rendered and readable before any of this runs.
 *
 * The stylesheet is not imported here on purpose: the build inlines it into
 * <head> (see vite.config.ts) so styling never waits on JavaScript.
 */

import { startAscii } from './ascii-hero'

const THEME_KEY = 'adamnolle-theme'

type Theme = 'light' | 'dark'

/* -------------------------------------------------------------------- theme */

const systemTheme = (): Theme =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

function storedTheme(): Theme | null {
  try {
    const v = localStorage.getItem(THEME_KEY)
    return v === 'light' || v === 'dark' ? v : null
  } catch {
    return null
  }
}

function activeTheme(): Theme {
  const attr = document.documentElement.getAttribute('data-theme')
  if (attr === 'light' || attr === 'dark') return attr
  return systemTheme()
}

function setTheme(mode: Theme) {
  document.documentElement.setAttribute('data-theme', mode)
  try {
    localStorage.setItem(THEME_KEY, mode)
  } catch {
    /* private mode, or storage disabled — the theme just will not persist */
  }
  syncToggle()
}

function syncToggle() {
  const btn = document.querySelector<HTMLButtonElement>('[data-theme-toggle]')
  if (!btn) return
  const next = activeTheme() === 'dark' ? 'light' : 'dark'
  const label = `Switch to ${next} mode`
  btn.setAttribute('aria-label', label)
  btn.title = label
}

function initTheme() {
  const btn = document.querySelector<HTMLButtonElement>('[data-theme-toggle]')
  syncToggle()
  btn?.addEventListener('click', () => setTheme(activeTheme() === 'dark' ? 'light' : 'dark'))

  // Follow the OS while the visitor has not made an explicit choice.
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (!storedTheme()) syncToggle()
  })
}

/* ------------------------------------------------------------------- reveal */

function initReveal() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduce || !('IntersectionObserver' in window)) return

  const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'))
  if (!nodes.length) return

  // Only hide what is still below the fold, so above-the-fold content never
  // flashes and the page is never left blank if the observer misfires.
  const pending = nodes.filter((n) => n.getBoundingClientRect().top > window.innerHeight * 0.92)
  pending.forEach((n) => n.classList.add('reveal-init'))

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue
        e.target.classList.add('reveal-in')
        io.unobserve(e.target)
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
  )
  pending.forEach((n) => io.observe(n))

  // Failsafe: whatever has not been revealed after a few seconds, show anyway.
  window.setTimeout(() => pending.forEach((n) => n.classList.add('reveal-in')), 2600)
}

/* --------------------------------------------------------------- animations */

// The hero is the first thing on the page, so it ships inside this script and
// starts at once. Loading it lazily used to cost two extra round trips in a
// row (this file, then ascii-hero, then the Earth mask) before the globe could
// draw. startAscii pauses its own loop whenever the hero is off screen.
function initAnimations() {
  const ascii = document.querySelector<HTMLElement>('[data-ascii]')
  if (ascii) {
    // Words come from content/site.json via a data attribute.
    const words = (ascii.dataset.asciiWords ?? 'ADAM|NOLLE').split('|') as [string, string]
    const nameEl = document.querySelector<HTMLElement>('[data-hero-name]')
    startAscii(ascii, { words, nameEl })
  }
}

/* ---------------------------------------------------------------------- go */

initTheme()
initReveal()
initAnimations()
