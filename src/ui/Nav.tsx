import { useEffect } from 'react'
import { useStore, type Wall } from '../store'
import { WALL_ORDER } from '../scene/constants'

const LABELS: Record<Wall, string> = {
  front: 'Home',
  right: 'Projects',
  back: 'About',
  left: 'Apps',
}

/** Bottom HUD: click a wall, or use number keys 1-4 / arrow keys to rotate. */
export default function Nav() {
  const wall = useStore((s) => s.wall)
  const faceWall = useStore((s) => s.faceWall)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (
        t &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.isContentEditable)
      ) {
        return
      }

      const idx = WALL_ORDER.indexOf(wall)
      if (e.key >= '1' && e.key <= '4') {
        faceWall(WALL_ORDER[Number(e.key) - 1])
      } else if (e.key === 'ArrowRight') {
        faceWall(WALL_ORDER[(idx + 1) % WALL_ORDER.length])
      } else if (e.key === 'ArrowLeft') {
        faceWall(WALL_ORDER[(idx + WALL_ORDER.length - 1) % WALL_ORDER.length])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [wall, faceWall])

  return (
    <nav className="hud-nav" aria-label="Room navigation">
      {WALL_ORDER.map((w) => (
        <button
          key={w}
          type="button"
          className="hud-nav__btn"
          aria-current={wall === w ? 'page' : undefined}
          onClick={() => faceWall(w)}
        >
          {LABELS[w]}
        </button>
      ))}
    </nav>
  )
}
