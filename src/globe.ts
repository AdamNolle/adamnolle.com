/**
 * Wireframe globe for the Web World Wide panel: parallels, meridians and a
 * limb circle drawn on a 2D canvas.
 *
 * Ported from the Claude Design source. Added here: the loop stops when the
 * canvas leaves the viewport or the tab is hidden.
 */

type Stop = () => void

export function startGlobe(cv: HTMLCanvasElement): Stop {
  const ctx = cv.getContext('2d')
  if (!ctx) return () => {}

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  let rot = 0.6
  let dpr = 1
  let size = 0
  let raf = 0
  let running = false
  let visible = false
  let stopped = false

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = cv.clientWidth || 260
    size = w
    cv.width = Math.round(w * dpr)
    cv.height = Math.round(w * dpr)
  }

  // Reading a custom property forces a style resolve, so it is cached rather
  // than fetched on every frame. The cache is dropped whenever the theme could
  // have changed.
  let accentCache: string | null = null
  const accent = () => {
    if (accentCache === null) {
      accentCache =
        getComputedStyle(document.documentElement).getPropertyValue('--green').trim() || '#00ff00'
    }
    return accentCache
  }
  const dropAccent = () => {
    accentCache = null
  }

  const themeWatcher = new MutationObserver(dropAccent)
  themeWatcher.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  })
  const schemeQuery = window.matchMedia('(prefers-color-scheme: dark)')
  schemeQuery.addEventListener('change', dropAccent)

  const project = (lat: number, lon: number): [number, number, number] => {
    const cl = Math.cos(lat)
    const sl = Math.sin(lat)
    return [cl * Math.sin(lon + rot), sl, cl * Math.cos(lon + rot)]
  }

  const draw = () => {
    const s = size
    const r = s * 0.42
    const cx = s / 2
    const cy = s / 2
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, s, s)
    const col = accent()

    // Parallels. Each is drawn twice: the far half faint, the near half solid.
    for (let i = -2; i <= 2; i++) {
      const lat = ((i * 30) * Math.PI) / 180
      for (const front of [false, true]) {
        ctx.beginPath()
        let started = false
        for (let d = 0; d <= 360; d += 4) {
          const [x, y, z] = project(lat, (d * Math.PI) / 180)
          const isFront = z >= 0
          if (isFront !== front) {
            started = false
            continue
          }
          const px = cx + x * r
          const py = cy - y * r
          if (!started) {
            ctx.moveTo(px, py)
            started = true
          } else {
            ctx.lineTo(px, py)
          }
        }
        ctx.strokeStyle = col
        ctx.globalAlpha = front ? (i === 0 ? 1 : 0.75) : 0.22
        ctx.lineWidth = front && i === 0 ? 2 : 1.4
        ctx.stroke()
      }
    }

    // Meridians.
    for (let m = 0; m < 12; m++) {
      const lon = ((m * 30) * Math.PI) / 180
      for (const front of [false, true]) {
        ctx.beginPath()
        let started = false
        for (let d = -90; d <= 90; d += 3) {
          const [x, y, z] = project((d * Math.PI) / 180, lon)
          const isFront = z >= 0
          if (isFront !== front) {
            started = false
            continue
          }
          const px = cx + x * r
          const py = cy - y * r
          if (!started) {
            ctx.moveTo(px, py)
            started = true
          } else {
            ctx.lineTo(px, py)
          }
        }
        ctx.strokeStyle = col
        ctx.globalAlpha = front ? 0.75 : 0.2
        ctx.lineWidth = 1.4
        ctx.stroke()
      }
    }

    // Limb.
    ctx.globalAlpha = 1
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.strokeStyle = col
    ctx.lineWidth = 2.5
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  const frame = () => {
    if (!running) return
    rot += 0.0055
    draw()
    raf = requestAnimationFrame(frame)
  }

  const play = () => {
    if (running || reduce || stopped) return
    running = true
    raf = requestAnimationFrame(frame)
  }

  const pause = () => {
    running = false
    if (raf) cancelAnimationFrame(raf)
    raf = 0
  }

  const sync = () => {
    if (visible && !document.hidden) play()
    else pause()
  }

  const onResize = () => {
    resize()
    draw()
  }

  resize()
  draw()

  const io = new IntersectionObserver(
    (entries) => {
      visible = entries.some((e) => e.isIntersecting)
      sync()
    },
    { rootMargin: '120px' }
  )
  io.observe(cv)

  window.addEventListener('resize', onResize)
  document.addEventListener('visibilitychange', sync)

  return () => {
    stopped = true
    pause()
    io.disconnect()
    themeWatcher.disconnect()
    schemeQuery.removeEventListener('change', dropAccent)
    window.removeEventListener('resize', onResize)
    document.removeEventListener('visibilitychange', sync)
  }
}
