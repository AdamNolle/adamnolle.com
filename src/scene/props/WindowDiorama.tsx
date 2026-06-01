import { useMemo, useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { mulberry32 } from '../../gfx/canvas'
import { useStore } from '../../store'
import { FLOOR_Y, WIN_Y, WIN_W, WIN_H } from '../constants'

/**
 * The overcast woods seen THROUGH the front window. Lives in the negative-z slab
 * behind the wall opening: a far painted sky/treeline backdrop, a dark wet ground
 * strip, a cluster of real low-poly 3D trees (instanced pines + a few deciduous),
 * a sheet of falling rain, and runny drips on the glass. Everything beyond the
 * wall is cropped by the opening, so the window frames it like a real view.
 *
 * All continuous motion (tree sway, rain, drips) is gated on `motion && !lite`;
 * under reduced motion the instances render once, static.
 */

// Painted far backdrop: pale overcast wash + a hazy distant treeline so the 3D
// silhouettes melt into the distance.
function makeSky(): THREE.CanvasTexture {
  const w = 1024
  const h = 640
  const cnv = document.createElement('canvas')
  cnv.width = w
  cnv.height = h
  const c = cnv.getContext('2d')!
  const rng = mulberry32(80808)

  const g = c.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, '#9fadbd')
  g.addColorStop(0.55, '#bcc6d2')
  g.addColorStop(1, '#d2d8de')
  c.fillStyle = g
  c.fillRect(0, 0, w, h)

  // Soft cloud banding.
  for (let i = 0; i < 16; i++) {
    const cy = rng() * h * 0.7
    const cw = 200 + rng() * 500
    const grd = c.createRadialGradient(rng() * w, cy, 10, rng() * w, cy, cw)
    const light = rng() > 0.5
    grd.addColorStop(0, light ? 'rgba(226,232,238,0.18)' : 'rgba(120,132,148,0.12)')
    grd.addColorStop(1, 'rgba(0,0,0,0)')
    c.fillStyle = grd
    c.fillRect(0, 0, w, h)
  }

  // Distant tree-line silhouette, two muted depth layers for parallax.
  const horizon = h * 0.7
  const treeLine = (baseY: number, scale: number, alpha: number, tint: number) => {
    c.fillStyle = `rgba(${64 + tint},${80 + tint},${66 + tint},${alpha})`
    c.beginPath()
    c.moveTo(0, h)
    c.lineTo(0, baseY)
    let x = 0
    while (x < w) {
      const tw = (40 + rng() * 70) * scale
      const th = (50 + rng() * 130) * scale
      const cx = x + tw / 2
      c.quadraticCurveTo(cx, baseY - th, x + tw, baseY)
      x += tw
    }
    c.lineTo(w, h)
    c.closePath()
    c.fill()
  }
  treeLine(horizon - 18, 1.25, 0.5, 40) // far layer (lighter, hazier)
  treeLine(horizon + 24, 1.0, 0.85, 0) // near layer (darker)

  // Atmospheric haze over the tree-line base.
  const haze = c.createLinearGradient(0, horizon - 130, 0, h)
  haze.addColorStop(0, 'rgba(210,216,222,0)')
  haze.addColorStop(1, 'rgba(210,216,222,0.6)')
  c.fillStyle = haze
  c.fillRect(0, horizon - 130, w, h - (horizon - 130))

  const tex = new THREE.CanvasTexture(cnv)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

// A runny rain-drip sprite: faint tapered tail up top, a brighter rounded head at
// the bottom (its leading edge as it slides down the glass).
function makeDrip(): THREE.CanvasTexture {
  const w = 16
  const h = 64
  const cnv = document.createElement('canvas')
  cnv.width = w
  cnv.height = h
  const c = cnv.getContext('2d')!
  c.clearRect(0, 0, w, h)

  const g = c.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, 'rgba(198,216,238,0)')
  g.addColorStop(0.55, 'rgba(198,216,238,0.20)')
  g.addColorStop(1, 'rgba(216,230,246,0.5)')
  c.fillStyle = g
  c.beginPath()
  c.moveTo(w * 0.5, 0)
  c.lineTo(w * 0.66, h * 0.72)
  c.quadraticCurveTo(w * 0.5, h, w * 0.34, h * 0.72)
  c.closePath()
  c.fill()

  const hg = c.createRadialGradient(w * 0.5, h * 0.86, 1, w * 0.5, h * 0.86, w * 0.5)
  hg.addColorStop(0, 'rgba(234,244,254,0.85)')
  hg.addColorStop(1, 'rgba(216,230,246,0)')
  c.fillStyle = hg
  c.beginPath()
  c.arc(w * 0.5, h * 0.86, w * 0.42, 0, Math.PI * 2)
  c.fill()

  const tex = new THREE.CanvasTexture(cnv)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// Pine placements (x, depth z, height scale). Clustered within the window's view
// cone so the wall crops them into a believable stand of trees.
const PINES = [
  { x: -1.7, z: -5.7, s: 1.0 },
  { x: -0.45, z: -6.6, s: 1.28 },
  { x: 0.8, z: -5.9, s: 0.95 },
  { x: 1.85, z: -6.7, s: 1.12 },
  { x: -2.5, z: -7.0, s: 1.06 },
]
// Stacked-cone tiers for one unit pine (base radius, center height, cone height).
const PINE_TIERS = [
  { cy: 1.05, r: 0.62, h: 1.1 },
  { cy: 1.6, r: 0.52, h: 1.0 },
  { cy: 2.1, r: 0.42, h: 0.9 },
  { cy: 2.55, r: 0.32, h: 0.78 },
  { cy: 2.92, r: 0.22, h: 0.64 },
]

// Deciduous placements.
const LEAFY = [
  { x: -1.05, z: -5.4, s: 1.0 },
  { x: 0.35, z: -5.8, s: 1.12 },
  { x: 1.25, z: -6.3, s: 0.88 },
]

const RAIN_N = 96
const DRIP_N = 14
const DRIP_Z = -4.84 // just room-side of the glass + mullions, so drips read crisp
const RAIN_TOP = 3.6
const RAIN_BOT = FLOOR_Y - 0.25

export default function WindowDiorama() {
  const motion = useStore((s) => s.motion)
  const lite = useStore((s) => s.lite)
  const invalidate = useThree((s) => s.invalidate)

  const sky = useMemo(makeSky, [])
  const drip = useMemo(makeDrip, [])
  const dummy = useMemo(() => new THREE.Object3D(), [])

  // Geometries (instanced consumers + disposal).
  const coneGeo = useMemo(() => new THREE.ConeGeometry(1, 1, 7), [])
  const trunkGeo = useMemo(() => new THREE.CylinderGeometry(1, 1, 1, 6), [])
  const rainGeo = useMemo(() => new THREE.PlaneGeometry(0.014, 0.21), [])
  const dripGeo = useMemo(() => new THREE.PlaneGeometry(1, 1), [])

  // Materials.
  const skyMat = useMemo(() => new THREE.MeshBasicMaterial({ map: sky, toneMapped: false }), [sky])
  const groundMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#262b25', roughness: 0.95, metalness: 0 }),
    [],
  )
  const trunkMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#3a2f26', roughness: 0.9, metalness: 0 }),
    [],
  )
  const pineMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#2f4a3a', roughness: 0.86, metalness: 0 }),
    [],
  )
  const leafMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#46583c', roughness: 0.86, metalness: 0 }),
    [],
  )
  const rainMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#c6d8ee',
        transparent: true,
        opacity: 0.46,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  )
  const dripMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: drip,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        toneMapped: false,
      }),
    [drip],
  )

  // Precompute deciduous foliage blobs + branches once.
  const leafy = useMemo(() => {
    const rng = mulberry32(24601)
    return LEAFY.map((t) => {
      const blobs = Array.from({ length: 5 }, () => ({
        x: (rng() - 0.5) * 0.95 * t.s,
        y: (1.55 + rng() * 0.95) * t.s,
        z: (rng() - 0.5) * 0.95 * t.s,
        r: (0.34 + rng() * 0.24) * t.s,
      }))
      const branches = Array.from({ length: 3 }, (_, i) => ({
        ang: (i / 3) * Math.PI * 2 + rng(),
        len: (0.5 + rng() * 0.32) * t.s,
        tilt: 0.5 + rng() * 0.35,
        y: (0.95 + i * 0.13) * t.s,
      }))
      return { ...t, blobs, branches }
    })
  }, [])

  // Per-instance rain + drip state (mutated each frame; layout is deterministic).
  const rain = useMemo(() => {
    const rng = mulberry32(4242)
    return {
      x: Array.from({ length: RAIN_N }, () => (rng() - 0.5) * 4.4),
      y: Array.from({ length: RAIN_N }, () => RAIN_BOT + rng() * (RAIN_TOP - RAIN_BOT)),
      z: Array.from({ length: RAIN_N }, () => -5.3 - rng() * 1.6),
      spd: Array.from({ length: RAIN_N }, () => 3.6 + rng() * 2.6),
      slant: Array.from({ length: RAIN_N }, () => (rng() - 0.5) * 0.18),
    }
  }, [])
  const drips = useMemo(() => {
    const rng = mulberry32(909)
    const xr = () => (rng() - 0.5) * (WIN_W - 0.18)
    return {
      x: Array.from({ length: DRIP_N }, xr),
      y: Array.from({ length: DRIP_N }, () => WIN_Y + (rng() - 0.5) * WIN_H),
      v: Array.from({ length: DRIP_N }, () => 0.01 + rng() * 0.03),
      xr,
      rng,
    }
  }, [])

  const swayRef = useRef<THREE.Group>(null)
  const pineTrunkRef = useRef<THREE.InstancedMesh>(null)
  const pineConeRef = useRef<THREE.InstancedMesh>(null)
  const rainRef = useRef<THREE.InstancedMesh>(null)
  const dripRef = useRef<THREE.InstancedMesh>(null)

  // Set static pine instance matrices once.
  useEffect(() => {
    const tr = pineTrunkRef.current
    const cn = pineConeRef.current
    if (!tr || !cn) return
    let ci = 0
    PINES.forEach((p, ti) => {
      dummy.position.set(p.x, 0.55 * p.s, p.z)
      dummy.rotation.set(0, 0, 0)
      dummy.scale.set(0.085 * p.s, 1.1 * p.s, 0.085 * p.s)
      dummy.updateMatrix()
      tr.setMatrixAt(ti, dummy.matrix)
      PINE_TIERS.forEach((tier) => {
        dummy.position.set(p.x, tier.cy * p.s, p.z)
        dummy.scale.set(tier.r * p.s, tier.h * p.s, tier.r * p.s)
        dummy.updateMatrix()
        cn.setMatrixAt(ci++, dummy.matrix)
      })
    })
    tr.instanceMatrix.needsUpdate = true
    cn.instanceMatrix.needsUpdate = true
    invalidate()
  }, [dummy, invalidate])

  // Seed rain + drip matrices so they show even under reduced motion.
  useEffect(() => {
    const r = rainRef.current
    if (r) {
      for (let i = 0; i < RAIN_N; i++) {
        dummy.position.set(rain.x[i], rain.y[i], rain.z[i])
        dummy.rotation.set(0, 0, rain.slant[i])
        dummy.scale.set(1, 1, 1)
        dummy.updateMatrix()
        r.setMatrixAt(i, dummy.matrix)
      }
      r.instanceMatrix.needsUpdate = true
    }
    const d = dripRef.current
    if (d) {
      for (let i = 0; i < DRIP_N; i++) {
        dummy.position.set(drips.x[i], drips.y[i], DRIP_Z)
        dummy.rotation.set(0, 0, 0)
        dummy.scale.set(0.026, 0.1 + drips.v[i] * 0.18, 1)
        dummy.updateMatrix()
        d.setMatrixAt(i, dummy.matrix)
      }
      d.instanceMatrix.needsUpdate = true
    }
    invalidate()
  }, [dummy, rain, drips, invalidate])

  useEffect(
    () => () => {
      sky.dispose()
      drip.dispose()
      coneGeo.dispose()
      trunkGeo.dispose()
      rainGeo.dispose()
      dripGeo.dispose()
      skyMat.dispose()
      groundMat.dispose()
      trunkMat.dispose()
      pineMat.dispose()
      leafMat.dispose()
      rainMat.dispose()
      dripMat.dispose()
    },
    [sky, drip, coneGeo, trunkGeo, rainGeo, dripGeo, skyMat, groundMat, trunkMat, pineMat, leafMat, rainMat, dripMat],
  )

  useFrame((state, dt) => {
    if (!motion || lite) return
    const t = state.clock.elapsedTime

    // Gentle wind sway from the ground pivot.
    if (swayRef.current) swayRef.current.rotation.z = Math.sin(t * 0.5) * 0.012

    // Falling rain — advance downward, wrap to the top.
    const r = rainRef.current
    if (r) {
      for (let i = 0; i < RAIN_N; i++) {
        rain.y[i] -= rain.spd[i] * dt
        if (rain.y[i] < RAIN_BOT) rain.y[i] = RAIN_TOP + Math.random() * 0.4
        dummy.position.set(rain.x[i], rain.y[i], rain.z[i])
        dummy.rotation.set(0, 0, rain.slant[i])
        dummy.scale.set(1, 1, 1)
        dummy.updateMatrix()
        r.setMatrixAt(i, dummy.matrix)
      }
      r.instanceMatrix.needsUpdate = true
    }

    // Glass drips — accelerate down, stretch the tail, reset above with a new x.
    const d = dripRef.current
    if (d) {
      for (let i = 0; i < DRIP_N; i++) {
        drips.v[i] = Math.min(drips.v[i] + dt * 0.16, 0.55)
        drips.y[i] -= drips.v[i] * dt
        if (drips.y[i] < WIN_Y - WIN_H / 2 - 0.06) {
          drips.y[i] = WIN_Y + WIN_H / 2 + 0.04 + drips.rng() * 0.08
          drips.x[i] = drips.xr()
          drips.v[i] = 0.01 + drips.rng() * 0.02
        }
        dummy.position.set(drips.x[i], drips.y[i], DRIP_Z)
        dummy.rotation.set(0, 0, 0)
        dummy.scale.set(0.026, 0.1 + drips.v[i] * 0.2, 1)
        dummy.updateMatrix()
        d.setMatrixAt(i, dummy.matrix)
      }
      d.instanceMatrix.needsUpdate = true
    }

    invalidate()
  })

  return (
    <group>
      {/* Far painted backdrop — sized + placed so its hazy treeline grazes the
          bottom of the view and the wash fills the rest. */}
      <mesh position={[0, 2.0, -8.5]} material={skyMat}>
        <planeGeometry args={[9, 2.8]} />
      </mesh>

      {/* Dark wet ground the trees root into. */}
      <mesh rotation-x={-Math.PI / 2} position={[0, FLOOR_Y, -7]} material={groundMat}>
        <planeGeometry args={[11, 5]} />
      </mesh>

      {/* Trees — pivot the whole stand at ground level so the sway tilts the tops. */}
      <group ref={swayRef} position={[0, FLOOR_Y, 0]}>
        <instancedMesh
          ref={pineTrunkRef}
          args={[trunkGeo, trunkMat, PINES.length]}
          frustumCulled={false}
        />
        <instancedMesh
          ref={pineConeRef}
          args={[coneGeo, pineMat, PINES.length * PINE_TIERS.length]}
          frustumCulled={false}
        />
        {leafy.map((t, i) => (
          <group key={i} position={[t.x, 0, t.z]}>
            <mesh position={[0, 0.7 * t.s, 0]} material={trunkMat}>
              <cylinderGeometry args={[0.06 * t.s, 0.09 * t.s, 1.4 * t.s, 6]} />
            </mesh>
            {t.branches.map((b, j) => (
              <group key={j} position={[0, b.y, 0]} rotation={[0, b.ang, b.tilt]}>
                <mesh position={[0, b.len / 2, 0]} material={trunkMat}>
                  <cylinderGeometry args={[0.02 * t.s, 0.03 * t.s, b.len, 5]} />
                </mesh>
              </group>
            ))}
            {t.blobs.map((bl, j) => (
              <mesh
                key={j}
                position={[bl.x, bl.y, bl.z]}
                scale={[bl.r, bl.r * 0.82, bl.r]}
                material={leafMat}
              >
                <icosahedronGeometry args={[1, 1]} />
              </mesh>
            ))}
          </group>
        ))}
      </group>

      {/* Rain falling outside, among the trees. */}
      <instancedMesh ref={rainRef} args={[rainGeo, rainMat, RAIN_N]} frustumCulled={false} />

      {/* Runny drips on the window glass. */}
      <instancedMesh ref={dripRef} args={[dripGeo, dripMat, DRIP_N]} frustumCulled={false} />
    </group>
  )
}
