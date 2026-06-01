import * as THREE from 'three'

/**
 * Equirectangular overcast sky: uniformly bright grey dome, brightest at the
 * horizon, warm floor bounce below. A soft brighter patch stands in for the
 * window so reflective surfaces pick up a believable highlight.
 */
function overcastEquirect(): THREE.CanvasTexture {
  const w = 1024
  const h = 512
  const cnv = document.createElement('canvas')
  cnv.width = w
  cnv.height = h
  const ctx = cnv.getContext('2d')!

  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0.0, '#aeb9c6') // zenith
  g.addColorStop(0.42, '#d4dbe4') // upper sky
  g.addColorStop(0.5, '#eef2f6') // bright horizon band
  g.addColorStop(0.56, '#8f9296') // just under horizon
  g.addColorStop(1.0, '#4d463d') // warm ground bounce
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)

  // Soft window glow toward the front wall (centre of the equirect ≈ −z view).
  const glow = ctx.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.42, h * 0.4)
  glow.addColorStop(0, 'rgba(255,255,255,0.45)')
  glow.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, w, h)

  const tex = new THREE.CanvasTexture(cnv)
  tex.mapping = THREE.EquirectangularReflectionMapping
  tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  return tex
}

/**
 * Prefiltered (PMREM) overcast environment for image-based lighting. Returns
 * the env texture; caller assigns it to scene.environment and disposes it.
 */
export function buildOvercastEnv(renderer: THREE.WebGLRenderer): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(renderer)
  const equirect = overcastEquirect()
  const rt = pmrem.fromEquirectangular(equirect)
  equirect.dispose()
  pmrem.dispose()
  return rt.texture
}
