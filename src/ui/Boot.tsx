import { useEffect, useState } from 'react'
import { useStore } from '../store'

/**
 * Full-screen intro veil shown while the GL scene + heavy procedural textures
 * build, then fades out. `booted` flips from App's Canvas onCreated; a hard
 * fallback timer guarantees the veil never gets stuck if that never fires.
 */
export default function Boot() {
  const booted = useStore((s) => s.booted)
  const [fading, setFading] = useState(false)
  const [gone, setGone] = useState(false)

  useEffect(() => {
    const hard = setTimeout(() => setFading(true), 2600)
    return () => clearTimeout(hard)
  }, [])

  useEffect(() => {
    if (booted) setFading(true)
  }, [booted])

  useEffect(() => {
    if (!fading) return
    const t = setTimeout(() => setGone(true), 650)
    return () => clearTimeout(t)
  }, [fading])

  if (gone) return null
  return (
    <div className={`boot${fading ? ' boot--out' : ''}`} aria-hidden="true">
      <div className="boot__inner">
        <img className="boot__logo" src="/media/adamlogo.png" alt="" />
        <div className="boot__bar">
          <span />
        </div>
        <p className="boot__label">Loading the room…</p>
      </div>
    </div>
  )
}
