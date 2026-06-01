import * as THREE from 'three'
import type { Wall } from '../store'

// Room dimensions
export const HS = 4.9 // half-room size (enlarged from 4.4 for breathing room)
export const FLOOR_Y = -0.78
export const CEIL_Y = 2.7
export const WALL_H = 3.6
export const WALL_T = 0.25

// Camera
export const FOV = 70
export const CENTER = new THREE.Vector3(0, 1.12, 0)
export const PITCH_CLAMP = 0.62
export const YAW_LERP = 0.13
export const DRAG_YAW = 0.0055
export const DRAG_PITCH = 0.0045
export const TAP_THRESHOLD = 12

// Zoom (FOV-tween): zoom = 1 → base FOV; higher = tighter framing.
export const ZOOM_MAX = 2.2
export const ZOOM_LERP = 0.12

// Yaw angle the camera faces for each wall
export const WYAW: Record<Wall, number> = {
  front: 0,
  right: Math.PI / 2,
  back: Math.PI,
  left: -Math.PI / 2,
}

// Pitch the camera settles to when snapping to a wall
export const WPITCH: Record<Wall, number> = {
  front: -0.1,
  right: 0.05,
  back: 0.05,
  left: 0.05,
}

// Order used for arrow-key cycling and nav layout
export const WALL_ORDER: Wall[] = ['front', 'right', 'back', 'left']

interface WallMeta {
  base: THREE.Vector3 // center of the wall at floor level (y = 0 plane)
  ux: THREE.Vector3 // unit vector along the wall's horizontal axis
  n: THREE.Vector3 // inward-facing normal
  ry: number // y-rotation to align a prop flat against the wall
}

export const WALL: Record<Wall, WallMeta> = {
  front: {
    base: new THREE.Vector3(0, 0, -HS),
    ux: new THREE.Vector3(1, 0, 0),
    n: new THREE.Vector3(0, 0, 1),
    ry: 0,
  },
  back: {
    base: new THREE.Vector3(0, 0, HS),
    ux: new THREE.Vector3(-1, 0, 0),
    n: new THREE.Vector3(0, 0, -1),
    ry: Math.PI,
  },
  right: {
    base: new THREE.Vector3(HS, 0, 0),
    ux: new THREE.Vector3(0, 0, -1),
    n: new THREE.Vector3(-1, 0, 0),
    ry: -Math.PI / 2,
  },
  left: {
    base: new THREE.Vector3(-HS, 0, 0),
    ux: new THREE.Vector3(0, 0, 1),
    n: new THREE.Vector3(1, 0, 0),
    ry: Math.PI / 2,
  },
}

// Wall-relative placement: u = horizontal offset, v = world height,
// off = distance out from the wall surface toward room center.
export function wp(w: Wall, u: number, v: number, off = 0.18): [number, number, number] {
  const m = WALL[w]
  const p = m.base.clone().addScaledVector(m.ux, u)
  p.y += v
  p.addScaledVector(m.n, off)
  return [p.x, p.y, p.z]
}

// Big rear-projection TV: screen-center world position + screen plane size (4:3).
// Shared by FrontDesk (where the screen mounts) and FlyingIcon (where icons land).
// z is kept HS-relative (-HS + 0.74) so the screen stays seated on its cabinet
// when the room is resized.
export const TV_POS: [number, number, number] = [0, 0.42, -HS + 0.74]
export const TV_SCREEN: [number, number] = [1.78, 1.34]

// Front-wall window opening — shared by Room.tsx (which punches the hole as a
// 4-box wall frame), FrontDesk.tsx (frame trim + glass), and WindowDiorama.tsx
// (the outdoor scene seen through it). Centered high so its top clears the
// ceiling with a gap.
export const WIN_Y = 1.8 // opening center height
export const WIN_W = 2.7 // opening width
export const WIN_H = 1.0 // opening height (top = 2.3; CEIL_Y is 2.7)

// Named camera focus targets — a "lean-in" that faces a wall and tightens FOV.
export const FOCUS_TARGETS: Record<string, { wall: Wall; zoom: number }> = {
  'www-portal': { wall: 'left', zoom: 1.9 },
}
