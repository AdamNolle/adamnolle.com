import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ZOOM_MAX, FOCUS_TARGETS } from './scene/constants'

export type Wall = 'front' | 'right' | 'back' | 'left'
export type DialogKind = 'project' | 'about' | 'web' | 'contact' | 'book'

export interface OpenItem {
  kind: DialogKind
  /** id into the matching data table (e.g. a project slug) */
  id: string
}

/** An app icon mid-flight from the Apps wall to the TV (Mario-64 star-get). */
export interface Fly {
  id: string
  /** world position the icon launched from */
  from: [number, number, number]
  /** performance.now() at launch */
  t0: number
}

const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(1, z))

interface AppState {
  /** boot/intro finished, room is interactive */
  booted: boolean
  /** wall the camera is currently turning toward / facing */
  wall: Wall
  /** open reader dialog, or null when closed */
  open: OpenItem | null

  /** project id currently "tuned in" on the TV, or null = idle logo channel */
  channel: string | null
  /** the icon currently flying to the TV, or null */
  flying: Fly | null
  /** camera zoom (FOV-tween): 1 = base FOV, up to ZOOM_MAX */
  zoom: number
  /** named focus target (e.g. 'www-portal'), or null */
  focus: string | null

  // ---- user preferences (persisted) ----
  /** low-fidelity mode: drop post-fx, env, and animation */
  lite: boolean
  /** allow animation (false ≈ prefers-reduced-motion) */
  motion: boolean

  setBooted: (b: boolean) => void
  faceWall: (w: Wall) => void
  openDialog: (item: OpenItem) => void
  closeDialog: () => void
  setChannel: (id: string | null) => void
  ejectChannel: () => void
  launchFly: (a: { id: string; from: [number, number, number] }) => void
  endFly: () => void
  setZoom: (z: number) => void
  nudgeZoom: (delta: number) => void
  setFocus: (id: string | null) => void
  toggleLite: () => void
  setMotion: (m: boolean) => void
  toggleMotion: () => void
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      booted: false,
      wall: 'front',
      open: null,

      channel: null,
      flying: null,
      zoom: 1,
      focus: null,

      lite: false,
      motion: true,

      setBooted: (b) => set({ booted: b }),
      // Turning to a wall always returns to wide framing.
      faceWall: (w) => set({ wall: w, zoom: 1, focus: null }),
      openDialog: (item) => set({ open: item }),
      closeDialog: () => set({ open: null }),
      setChannel: (id) => set({ channel: id }),
      ejectChannel: () => set({ channel: null }),
      // One star at a time; re-selecting the current channel is a no-op.
      // Lite / reduced-motion skips the flight and tunes in instantly.
      launchFly: ({ id, from }) =>
        set((s) => {
          if (s.flying || s.channel === id) return {}
          if (s.lite || !s.motion) {
            return { channel: id, wall: 'front', zoom: 1, focus: null }
          }
          return {
            flying: { id, from, t0: performance.now() },
            wall: 'front',
            zoom: 1,
            focus: null,
          }
        }),
      endFly: () => set({ flying: null }),
      setZoom: (z) => set({ zoom: clampZoom(z) }),
      nudgeZoom: (delta) => set((s) => ({ zoom: clampZoom(s.zoom + delta) })),
      setFocus: (id) =>
        set(() => {
          if (!id) return { focus: null, zoom: 1 }
          const t = FOCUS_TARGETS[id]
          return t ? { focus: id, wall: t.wall, zoom: t.zoom } : { focus: id }
        }),
      toggleLite: () => set((s) => ({ lite: !s.lite })),
      setMotion: (m) => set({ motion: m }),
      toggleMotion: () => set((s) => ({ motion: !s.motion })),
    }),
    {
      name: 'adamnolle-prefs',
      partialize: (s) => ({
        lite: s.lite,
        motion: s.motion,
      }),
    },
  ),
)
