import { useEffect, useRef } from 'react'
import { useStore } from '../store'
import { getProject } from '../data/projects'
import { BOOKS } from '../data/books'
import { ABOUT } from '../data/about'
import { LINKS } from '../data/links'

/**
 * The canonical, accessible reader. All 3D text in the room is decorative; this
 * focus-trapped dialog is the real content. Opens from the store's `open` item,
 * traps Tab, closes on Escape / backdrop, and restores focus on close.
 */
export default function Dialog() {
  const open = useStore((s) => s.open)
  const closeDialog = useStore((s) => s.closeDialog)
  const faceWall = useStore((s) => s.faceWall)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const prevFocused = document.activeElement as HTMLElement | null
    const node = panelRef.current
    const focusables = () =>
      node
        ? Array.from(
            node.querySelectorAll<HTMLElement>(
              'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
            ),
          )
        : []
    ;(focusables()[0] ?? node)?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeDialog()
      } else if (e.key === 'Tab') {
        const f = focusables()
        if (f.length === 0) return
        const idx = f.indexOf(document.activeElement as HTMLElement)
        if (e.shiftKey && idx <= 0) {
          e.preventDefault()
          f[f.length - 1].focus()
        } else if (!e.shiftKey && idx === f.length - 1) {
          e.preventDefault()
          f[0].focus()
        }
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      prevFocused?.focus?.()
    }
  }, [open, closeDialog])

  if (!open) return null

  const goWall = (w: 'right' | 'back' | 'left') => () => {
    faceWall(w)
    closeDialog()
  }

  let title = ''
  let body: React.ReactNode = null

  if (open.kind === 'project') {
    const p = getProject(open.id)
    if (!p) {
      title = 'Not found'
      body = <p className="dialog__blurb">That project could not be found.</p>
    } else {
      title = p.title
      body = (
        <>
          <div className="dialog__meta">
            <span className="dialog__stack">{p.stack}</span>
            {p.flagship && <span className="dialog__flag">★ Flagship</span>}
          </div>
          <p className="dialog__blurb">{p.blurb}</p>
          <div className="dialog__links">
            {p.links.map((l) => (
              <a
                key={l.url}
                className="dialog__link"
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {l.label} ↗
              </a>
            ))}
          </div>
        </>
      )
    }
  } else if (open.kind === 'web') {
    title = 'adamnolle.com'
    body = (
      <>
        <div className="dialog__meta">
          <span className="dialog__stack">Terminal Eighty · the web</span>
        </div>
        <p className="dialog__blurb">
          Hi, I’m Adam Nolle. I build things for the web and the desktop — self-hosted tools, AI
          utilities, and the odd attention-defense browser extension. Look around the room, or jump
          straight in:
        </p>
        <div className="dialog__links">
          <button type="button" className="dialog__link" onClick={goWall('right')}>
            Projects →
          </button>
          <button type="button" className="dialog__link" onClick={goWall('back')}>
            About →
          </button>
          <button type="button" className="dialog__link" onClick={goWall('left')}>
            Apps →
          </button>
          <a className="dialog__link" href={LINKS.blog} target="_blank" rel="noopener noreferrer">
            Read the blog ↗
          </a>
          <a className="dialog__link" href={LINKS.github} target="_blank" rel="noopener noreferrer">
            GitHub ↗
          </a>
        </div>
      </>
    )
  } else if (open.kind === 'contact') {
    title = 'Get in touch'
    body = (
      <>
        <p className="dialog__blurb">Say hi, or follow the work.</p>
        <div className="dialog__links">
          <a className="dialog__link" href={`mailto:${LINKS.email}`}>
            {LINKS.email}
          </a>
          <a className="dialog__link" href={LINKS.github} target="_blank" rel="noopener noreferrer">
            GitHub ↗
          </a>
          <a className="dialog__link" href={LINKS.linkedin} target="_blank" rel="noopener noreferrer">
            LinkedIn ↗
          </a>
          <a className="dialog__link" href={LINKS.youtube} target="_blank" rel="noopener noreferrer">
            YouTube ↗
          </a>
        </div>
      </>
    )
  } else if (open.kind === 'book') {
    const b = BOOKS[Number(open.id)]
    if (!b) {
      title = 'Empty shelf'
      body = <p className="dialog__blurb">Nothing catalogued here yet.</p>
    } else {
      title = b.title ?? 'Untitled spine'
      body = (
        <>
          {b.author && (
            <div className="dialog__meta">
              <span className="dialog__stack">{b.author}</span>
            </div>
          )}
          <p className="dialog__blurb">
            {b.title
              ? 'A book pulled from the shelf.'
              : 'A placeholder spine — Adam’s real reading list is still being catalogued. Pull another, or check back soon.'}
          </p>
        </>
      )
    }
  } else {
    title = ABOUT.heading
    body = (
      <>
        <div className="dialog__meta">
          {ABOUT.stats.map((s) => (
            <span key={s.label} className="dialog__stack">
              {s.label} {s.value}
            </span>
          ))}
        </div>
        {ABOUT.bio.map((para, i) => (
          <p key={i} className="dialog__blurb">
            {para}
          </p>
        ))}
        <div className="dialog__links">
          <a className="dialog__link" href={LINKS.blog} target="_blank" rel="noopener noreferrer">
            Read the blog ↗
          </a>
          <a className="dialog__link" href={LINKS.github} target="_blank" rel="noopener noreferrer">
            GitHub ↗
          </a>
          <a className="dialog__link" href={LINKS.linkedin} target="_blank" rel="noopener noreferrer">
            LinkedIn ↗
          </a>
          <a className="dialog__link" href={LINKS.youtube} target="_blank" rel="noopener noreferrer">
            YouTube ↗
          </a>
        </div>
      </>
    )
  }

  return (
    <div className="dialog-backdrop" onClick={closeDialog}>
      <div
        ref={panelRef}
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="dialog__close"
          aria-label="Close"
          onClick={closeDialog}
        >
          ✕
        </button>
        <h2 id="dialog-title" className="dialog__title">
          {title}
        </h2>
        {body}
      </div>
    </div>
  )
}
