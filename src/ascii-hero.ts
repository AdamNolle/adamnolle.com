/**
 * ASCII hero: a lit, rotating Earth rendered into a <pre>, with the name set
 * beside it as ASCII wordmarks on wide viewports.
 *
 * Ported from the Claude Design source. Added here: the render loop stops when
 * the hero scrolls out of view or the tab is hidden, so a backgrounded page
 * costs nothing.
 */

type Stop = () => void

interface Options {
  words: [string, string]
  nameEl?: HTMLElement | null
}

/** Characters used for land, darkest to brightest. */
const LAND = ['#', '#', '8', '8', 'W', 'M', 'M', '%', 'B', 'B', '@', '@', '$', '$']

export function startAscii(el: HTMLElement, opts: Options): Stop {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  let W = 170
  let H = 56
  let rot = -1.71
  let mask: Uint8Array | null = null
  let dist: Uint8Array | null = null
  let MW = 0
  let MH = 0
  let lastDraw = -1
  let wide = true

  let artKey = ''
  let artA: string[] = []
  let artB: string[] = []

  let raf = 0
  let running = false
  let visible = false
  let stopped = false

  /* ------------------------------------------------------------ land mask */

  const at = (x: number, y: number) => {
    const i = y * MW + x
    return (mask![i >> 3] & (128 >> (i & 7))) !== 0
  }

  /**
   * Two-pass chamfer distance transform from the coastline, used to fake
   * relief: interior land reads brighter than the shore.
   */
  const buildDistance = () => {
    const N = MW * MH
    const INF = 9999
    const d = new Int16Array(N)

    for (let y = 0; y < MH; y++) {
      for (let x = 0; x < MW; x++) {
        const c = at(x, y)
        let edge = false
        if (x > 0 && at(x - 1, y) !== c) edge = true
        else if (x < MW - 1 && at(x + 1, y) !== c) edge = true
        else if (y > 0 && at(x, y - 1) !== c) edge = true
        else if (y < MH - 1 && at(x, y + 1) !== c) edge = true
        d[y * MW + x] = edge ? 0 : INF
      }
    }

    for (let y = 0; y < MH; y++) {
      for (let x = 0; x < MW; x++) {
        const i = y * MW + x
        let v = d[i]
        if (y > 0) {
          const u = d[i - MW] + 5
          if (u < v) v = u
        }
        if (x > 0) {
          const u = d[i - 1] + 5
          if (u < v) v = u
        }
        if (y > 0 && x > 0) {
          const u = d[i - MW - 1] + 7
          if (u < v) v = u
        }
        if (y > 0 && x < MW - 1) {
          const u = d[i - MW + 1] + 7
          if (u < v) v = u
        }
        d[i] = v
      }
    }

    for (let y = MH - 1; y >= 0; y--) {
      for (let x = MW - 1; x >= 0; x--) {
        const i = y * MW + x
        let v = d[i]
        if (y < MH - 1) {
          const u = d[i + MW] + 5
          if (u < v) v = u
        }
        if (x < MW - 1) {
          const u = d[i + 1] + 5
          if (u < v) v = u
        }
        if (y < MH - 1 && x < MW - 1) {
          const u = d[i + MW + 1] + 7
          if (u < v) v = u
        }
        if (y < MH - 1 && x > 0) {
          const u = d[i + MW - 1] + 7
          if (u < v) v = u
        }
        d[i] = v
      }
    }

    const out = new Uint8Array(N)
    for (let i = 0; i < N; i++) out[i] = Math.min(255, (d[i] / 5) | 0)
    dist = out
  }

  const sample = (lat: number, lon: number) => {
    if (!mask) return null
    let u = (lon + Math.PI) / (2 * Math.PI)
    u -= Math.floor(u)
    let v = 0.5 - lat / Math.PI
    if (v < 0) v = 0
    else if (v > 0.999999) v = 0.999999
    const px = (u * MW) | 0
    const py = (v * MH) | 0
    const i = py * MW + px
    return { land: (mask[i >> 3] & (128 >> (i & 7))) !== 0, d: dist ? dist[i] : 0 }
  }

  /* ------------------------------------------------------------- word art */

  /**
   * Rasterises a word to a canvas, then reads coverage per character cell and
   * hollows out the interior so the letters read as outlines.
   */
  const textArt = (txt: string, cols: number, rows: number): string[] => {
    const cw = 6
    const chh = 10
    const cv = document.createElement('canvas')
    cv.width = cols * cw
    cv.height = rows * chh
    const g = cv.getContext('2d')!
    g.fillStyle = '#000'
    g.fillRect(0, 0, cv.width, cv.height)
    g.fillStyle = '#fff'
    g.textBaseline = 'alphabetic'
    g.textAlign = 'left'

    const FAM = '"Arial Black","Helvetica Neue",Impact,sans-serif'
    g.font = '900 100px ' + FAM
    const m0 = g.measureText(txt)
    const fs = Math.max(10, (100 * (cv.width * 0.9)) / Math.max(1, m0.width))
    g.font = '900 ' + fs + 'px ' + FAM
    const m = g.measureText(txt)
    const cap = Math.max(1, m.actualBoundingBoxAscent + m.actualBoundingBoxDescent)
    const sy = Math.max(1, Math.min(1.45, (cv.height * 0.99) / cap))
    const SH = 0.2

    g.save()
    g.transform(1, 0, -SH, 1, (SH * cv.height) / 2, 0)
    g.scale(1, sy)
    g.fillText(txt, (cv.width - m.width) / 2, m.actualBoundingBoxAscent + (cv.height / sy - cap) / 2)
    g.restore()

    const px = g.getImageData(0, 0, cv.width, cv.height).data
    const cov = new Float32Array(cols * rows)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let sum = 0
        for (let yy = 0; yy < chh; yy++) {
          const base = ((r * chh + yy) * cv.width + c * cw) * 4
          for (let xx = 0; xx < cw; xx++) sum += px[base + xx * 4]
        }
        cov[r * cols + c] = sum / (cw * chh) / 255
      }
    }

    const cAt = (r: number, c: number) =>
      r < 0 || c < 0 || r >= rows || c >= cols ? 0 : cov[r * cols + c]

    const SOLID = 0.46
    const BODY = '#8WM%B@$'
    const out: string[] = []

    for (let r = 0; r < rows; r++) {
      let s = ''
      for (let c = 0; c < cols; c++) {
        const v = cov[r * cols + c]
        if (v < 0.16) {
          s += ' '
          continue
        }
        if (v < SOLID) {
          s += v < 0.3 ? '.' : ':'
          continue
        }
        const deep =
          cAt(r - 1, c) >= SOLID &&
          cAt(r + 1, c) >= SOLID &&
          cAt(r, c - 1) >= SOLID &&
          cAt(r, c - 2) >= SOLID &&
          cAt(r, c + 1) >= SOLID &&
          cAt(r, c + 2) >= SOLID &&
          cAt(r - 1, c - 1) >= SOLID &&
          cAt(r - 1, c + 1) >= SOLID &&
          cAt(r + 1, c - 1) >= SOLID &&
          cAt(r + 1, c + 1) >= SOLID
        if (deep) {
          s += ' '
          continue
        }
        s += BODY.charAt(Math.min(7, Math.round(((v - SOLID) / (1 - SOLID)) * 7)))
      }
      out.push(s)
    }

    let a = 0
    let b = out.length - 1
    while (a < b && out[a].trim() === '') a++
    while (b > a && out[b].trim() === '') b--
    return out.slice(a, b + 1)
  }

  /* --------------------------------------------------------------- layout */

  const layout = () => {
    let box = 0
    if (el.parentElement) {
      const p = getComputedStyle(el.parentElement)
      box = el.parentElement.clientWidth - parseFloat(p.paddingLeft) - parseFloat(p.paddingRight)
    }
    if (!box) box = el.clientWidth
    if (!box || box < 1) box = 800

    const target = box < 430 ? 66 : box < 700 ? 100 : box < 900 ? 140 : 172
    wide = box >= 760

    const dw = wide ? box : Math.min(box, Math.max(150, Math.round(box * 0.52)))
    W = wide ? target : Math.max(24, Math.min(target, Math.floor(dw / (0.6 * 9))))
    H = wide ? Math.round(W * 0.31) : 2 * Math.round((W / 2 - 1) * 0.6) + 2

    const fs = dw / (W * 0.6)
    el.style.fontSize = fs.toFixed(2) + 'px'
    el.style.width = wide ? '' : dw + 'px'
    el.style.marginLeft = wide ? '' : 'auto'
    el.style.marginRight = wide ? '' : 'auto'
    el.style.minHeight = Math.round(H * fs) + 'px'

    // Narrow layout drops the ASCII wordmark, so show the plain name instead.
    if (opts.nameEl) opts.nameEl.style.display = wide ? 'none' : 'block'
    artKey = ''
  }

  const write = (buf: string[], x: number, y: number, str: string) => {
    if (y < 0 || y >= H) return
    for (let i = 0; i < str.length; i++) {
      const cx = x + i
      if (cx >= 0 && cx < W) buf[cx + y * W] = str.charAt(i)
    }
  }

  /* --------------------------------------------------------------- render */

  const render = () => {
    const buf: string[] = new Array(W * H).fill(' ')
    const rowsR = wide ? Math.round(H * 0.47) : Math.round((W / 2 - 1) * 0.6)
    const colsR = rowsR / 0.6
    const gcx = wide ? W - colsR - 1 : W / 2
    const gcy = H / 2

    if (wide) {
      const limbAt = (y: number) => {
        const dy = (y + 0.5 - gcy) / rowsR
        return dy > -1 && dy < 1 ? gcx - colsR * Math.sqrt(1 - dy * dy) : W - 1
      }
      const rowsEach = Math.max(9, Math.floor((H - 3) / 2))
      const top = Math.max(0, Math.round(gcy - (rowsEach * 2 + 2) / 2))
      const bTop = top + rowsEach + 2
      const colsA = Math.max(22, Math.floor(Math.min(limbAt(top), limbAt(top + rowsEach - 1))) - 3)
      const colsB = Math.max(22, Math.floor(Math.min(limbAt(bTop), limbAt(bTop + rowsEach - 1))) - 3)
      const key = colsA + '/' + colsB + 'x' + rowsEach

      if (key !== artKey) {
        artA = textArt(opts.words[0], colsA, rowsEach)
        artB = textArt(opts.words[1], colsB, rowsEach)
        artKey = key
      }

      const totalH = artA.length + 1 + artB.length
      const yA = Math.max(0, Math.round(gcy - totalH / 2))
      const yB = yA + artA.length + 1
      for (let r = 0; r < artA.length; r++) write(buf, 1, yA + r, artA[r])
      for (let r = 0; r < artB.length; r++) write(buf, 1, yB + r, artB[r])
    }

    const tilt = 0.4
    const ct = Math.cos(tilt)
    const st = Math.sin(tilt)
    const lx = -0.19
    const ly = 0.22
    const lz = 0.957
    const G15 = Math.PI / 6

    for (let y = 0; y < H; y++) {
      const ny = (y + 0.5 - gcy) / rowsR
      if (ny < -1 || ny > 1) continue
      for (let x = 0; x < W; x++) {
        const nx = (x + 0.5 - gcx) / colsR
        const q = nx * nx + ny * ny
        if (q > 1) continue

        const nz = Math.sqrt(1 - q)
        const vy = -ny
        const ry = vy * ct + nz * st
        const rz = nz * ct - vy * st
        const lat = Math.asin(ry < -1 ? -1 : ry > 1 ? 1 : ry)
        const lon = Math.atan2(nx, rz) + rot

        let lum = nx * lx + vy * ly + nz * lz
        if (lum < 0) lum = 0
        else if (lum > 1) lum = 1

        const s = sample(lat, lon)
        let ch: string

        if (q > 0.965) {
          ch = ':'
        } else if (s && s.land) {
          const relief = Math.min(1, s.d / 22)
          const t = 0.22 + 0.46 * relief + 0.32 * lum * (0.7 + 0.3 * nz)
          ch = LAND[Math.min(LAND.length - 1, Math.round(Math.min(1, t) * (LAND.length - 1)))]
        } else {
          const lit = lum * (0.55 + 0.45 * nz)
          const latg = Math.abs(((lat + Math.PI * 2) % G15) - G15 / 2) < 0.028
          const long = Math.abs((((lon % G15) + G15) % G15) - G15 / 2) < 0.024
          const dep = s ? s.d : 40
          if ((latg || long) && lit > 0.2) ch = '.'
          else if (dep < 4 && lit > 0.22) ch = (x + y) % 2 === 0 ? ':' : '.'
          else if (dep < 11 && lit > 0.28 && (x + y) % 3 === 0) ch = '.'
          else if (lit > 0.6 && (x * 2 + y) % 5 === 0) ch = '.'
          else if (lit > 0.3 && (x + y * 3) % 9 === 0) ch = '.'
          else ch = ' '
        }
        buf[x + y * W] = ch
      }
    }

    const rows: string[] = []
    for (let r = 0; r < H; r++) rows.push(buf.slice(r * W, r * W + W).join(''))
    el.textContent = rows.join('\n')
    if (!reduce) rot += 0.0028
  }

  /* ----------------------------------------------------------- run control */

  const frame = (ts: number) => {
    if (!running) return
    raf = requestAnimationFrame(frame)
    // ~24fps is plenty for character cells and leaves the main thread free.
    if (lastDraw >= 0 && ts - lastDraw < 42) return
    lastDraw = ts
    render()
  }

  const play = () => {
    if (running || reduce || stopped) return
    running = true
    lastDraw = -1
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
    layout()
    render()
  }

  const io = new IntersectionObserver(
    (entries) => {
      visible = entries.some((e) => e.isIntersecting)
      sync()
    },
    { rootMargin: '120px' }
  )
  io.observe(el)

  window.addEventListener('resize', onResize)
  document.addEventListener('visibilitychange', sync)

  layout()
  render()

  void import('./earth-mask').then((m) => {
    if (stopped) return
    const raw = atob(m.EARTH.bits)
    const b = new Uint8Array(raw.length)
    for (let i = 0; i < raw.length; i++) b[i] = raw.charCodeAt(i)
    mask = b
    MW = m.EARTH.w
    MH = m.EARTH.h
    buildDistance()
    render()
  })

  return () => {
    stopped = true
    pause()
    io.disconnect()
    window.removeEventListener('resize', onResize)
    document.removeEventListener('visibilitychange', sync)
  }
}
