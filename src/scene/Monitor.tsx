import { useMemo, useEffect, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store'
import { getProject } from '../data/projects'
import { channelTexture, haloTexture, CHANNEL_CANVAS, CHANNEL_HIT } from '../gfx/cards'
import { TAP_THRESHOLD, TV_SCREEN } from './constants'

/**
 * The big rear-projection TV screen — the site's "console". Two states drawn to
 * self-lit (toneMapped=false) 4:3 canvases so they glow and feed Bloom:
 *  • idle: the home channel (browser chrome + identity + WWW hero + nav tiles)
 *    with a floating, rotating 3D logo in front of the glass.
 *  • channel: a per-project CRT detail screen with ▸ OPEN / ⏏ EJECT.
 * Clicks are UV-region tested against the same numbers used to draw, so the hit
 * map can never drift from the art.
 */

// Idle-screen layout (canvas pixels) shared by the painter and the hit-test.
const SCREEN = { W: 2048, H: 1536 }
const HERO = { x: 70, y: 330, w: SCREEN.W - 140, h: 420 }
const TILE_Y = HERO.y + HERO.h + 50
const TILE_H = 300
const TILE_W = (HERO.w - 80) / 3
const tileX = (i: number) => HERO.x + i * (TILE_W + 40)

type Rect = { x: number; y: number; w: number; h: number }
const inRect = (x: number, y: number, r: Rect) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h

function rr(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath()
  c.moveTo(x + r, y)
  c.arcTo(x + w, y, x + w, y + h, r)
  c.arcTo(x + w, y + h, x, y + h, r)
  c.arcTo(x, y + h, x, y, r)
  c.arcTo(x, y, x + w, y, r)
  c.closePath()
}

function makeScreen(): THREE.CanvasTexture {
  const { W, H } = SCREEN
  const cnv = document.createElement('canvas')
  cnv.width = W
  cnv.height = H
  const c = cnv.getContext('2d')!

  // Background.
  const g = c.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#0c2150')
  g.addColorStop(0.5, '#05091e')
  g.addColorStop(1, '#020512')
  c.fillStyle = g
  c.fillRect(0, 0, W, H)
  c.textBaseline = 'middle'

  // Browser chrome.
  c.fillStyle = '#0a1428'
  c.fillRect(0, 0, W, 132)
  const dots = ['#ff5f57', '#febc2e', '#28c840']
  dots.forEach((col, i) => {
    c.fillStyle = col
    c.beginPath()
    c.arc(60 + i * 56, 66, 18, 0, 7)
    c.fill()
  })
  c.fillStyle = '#02060f'
  rr(c, 280, 34, 1500, 64, 12)
  c.fill()
  c.fillStyle = '#39d98a'
  c.font = '40px "Consolas", "Courier New", monospace'
  c.textAlign = 'left'
  c.fillText('▸ https://adamnolle.com', 312, 68)

  // Identity row.
  c.fillStyle = '#001a0c'
  rr(c, 70, 176, 96, 96, 12)
  c.fill()
  c.strokeStyle = '#00ff66'
  c.lineWidth = 5
  c.stroke()
  c.fillStyle = '#00ff66'
  rr(c, 86, 236, 64, 22, 5)
  c.fill()
  c.fillStyle = '#eaf5ff'
  c.font = 'bold 64px system-ui, Arial, sans-serif'
  c.fillText('ADAM NOLLE', 196, 212)
  c.fillStyle = '#8fa6b6'
  c.font = '38px "Consolas", "Courier New", monospace'
  c.fillText('terminal eighty // the web', 198, 262)

  // Flagship hero: Web World Wide.
  const hg = c.createLinearGradient(HERO.x, HERO.y, HERO.x, HERO.y + HERO.h)
  hg.addColorStop(0, 'rgba(0,80,110,0.40)')
  hg.addColorStop(1, 'rgba(0,30,60,0.22)')
  c.fillStyle = hg
  rr(c, HERO.x, HERO.y, HERO.w, HERO.h, 20)
  c.fill()
  c.strokeStyle = '#00e1ff'
  c.lineWidth = 5
  c.stroke()
  c.fillStyle = '#7fe9ff'
  c.font = 'bold 34px "Consolas", "Courier New", monospace'
  c.fillText('★ FLAGSHIP', HERO.x + 56, HERO.y + 70)
  c.fillStyle = '#ffffff'
  c.font = 'bold 130px system-ui, Arial, sans-serif'
  c.fillText('WEB WORLD WIDE', HERO.x + 52, HERO.y + 178)
  c.fillStyle = '#cfeefc'
  c.font = '46px system-ui, Arial, sans-serif'
  c.fillText('Your own corner of the web — a $0/mo self-hosted blog stack.', HERO.x + 56, HERO.y + 268)
  c.fillStyle = '#6fb7cf'
  c.font = '36px "Consolas", "Courier New", monospace'
  c.fillText('ASTRO  ·  NODE / EXPRESS  ·  RASPBERRY PI', HERO.x + 56, HERO.y + 340)

  // Tiles: Projects / About / Blog.
  const tiles: [string, string, string][] = [
    ['PROJECTS', 'cork board', '#00ff66'],
    ['ABOUT', 'who i am', '#b46bff'],
    ['BLOG', 'near-daily posts', '#ffb347'],
  ]
  tiles.forEach((t, i) => {
    const tx = tileX(i)
    c.fillStyle = 'rgba(8,20,18,0.55)'
    rr(c, tx, TILE_Y, TILE_W, TILE_H, 16)
    c.fill()
    c.strokeStyle = t[2]
    c.lineWidth = 4
    c.stroke()
    c.fillStyle = t[2]
    c.font = 'bold 56px system-ui, Arial, sans-serif'
    c.fillText(t[0], tx + 36, TILE_Y + 96)
    c.fillStyle = '#dfeef0'
    c.font = '38px "Consolas", "Courier New", monospace'
    c.fillText(t[1], tx + 36, TILE_Y + 170)
  })

  // Footer hint.
  c.fillStyle = '#001a0c'
  c.fillRect(0, H - 70, W, 70)
  c.fillStyle = '#00e1ff'
  c.font = '36px "Consolas", "Courier New", monospace'
  c.fillText('▸ click a tile to navigate  ·  send an app to the TV  ·  drag to look around', 40, H - 35)

  const tex = new THREE.CanvasTexture(cnv)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 16
  return tex
}

interface Props {
  position: [number, number, number]
}

export default function Monitor({ position }: Props) {
  const channel = useStore((s) => s.channel)
  const openDialog = useStore((s) => s.openDialog)
  const ejectChannel = useStore((s) => s.ejectChannel)
  const faceWall = useStore((s) => s.faceWall)
  const motion = useStore((s) => s.motion)
  const lite = useStore((s) => s.lite)

  const idleTex = useMemo(makeScreen, [])
  const haloTex = useMemo(() => haloTexture('#00ff66', 0.6), [])
  // One shared emissive material for the extruded mark's three bars.
  const markMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#08311b',
        emissive: '#00ff66',
        emissiveIntensity: 0.95,
        metalness: 0.2,
        roughness: 0.35,
        toneMapped: false,
      }),
    [],
  )

  // Build channel textures lazily and cache them; dispose all on unmount.
  const cacheRef = useRef<Map<string, THREE.CanvasTexture>>(new Map())
  const channelTex = useMemo(() => {
    if (!channel) return null
    const p = getProject(channel)
    if (!p) return null
    let t = cacheRef.current.get(channel)
    if (!t) {
      t = channelTexture(p)
      cacheRef.current.set(channel, t)
    }
    return t
  }, [channel])

  useEffect(() => {
    const cache = cacheRef.current
    return () => {
      idleTex.dispose()
      haloTex.dispose()
      markMat.dispose()
      cache.forEach((t) => t.dispose())
      cache.clear()
    }
  }, [idleTex, haloTex, markMat])

  // Floating mark: outer group bobs + wobbles, inner group spins, halo pulses.
  const logoBaseY = position[1] + 0.13
  const logoRef = useRef<THREE.Group>(null)
  const markRef = useRef<THREE.Group>(null)
  const haloRef = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    if (!motion || lite) return
    const t = state.clock.elapsedTime
    const g = logoRef.current
    if (g) {
      g.position.y = logoBaseY + Math.sin(t * 1.2) * 0.05
      g.rotation.z = Math.sin(t * 0.8) * 0.05
    }
    if (markRef.current) markRef.current.rotation.y = t * 0.9
    const h = haloRef.current
    if (h) {
      const pulse = 1 + Math.sin(t * 1.14) * 0.06
      h.scale.set(pulse, pulse, 1)
      ;(h.material as THREE.MeshBasicMaterial).opacity = 0.8 + Math.sin(t * 1.14) * 0.18
    }
  })

  const isChannel = !!channelTex
  const tex = channelTex ?? idleTex

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > TAP_THRESHOLD) return
    e.stopPropagation()
    const uv = e.uv
    if (!uv) return
    if (isChannel) {
      const x = uv.x * CHANNEL_CANVAS.W
      const y = (1 - uv.y) * CHANNEL_CANVAS.H
      if (inRect(x, y, CHANNEL_HIT.open)) openDialog({ kind: 'project', id: channel! })
      else if (inRect(x, y, CHANNEL_HIT.eject)) ejectChannel()
    } else {
      const x = uv.x * SCREEN.W
      const y = (1 - uv.y) * SCREEN.H
      if (inRect(x, y, HERO)) {
        openDialog({ kind: 'project', id: 'web-world-wide' })
      } else {
        for (let i = 0; i < 3; i++) {
          if (inRect(x, y, { x: tileX(i), y: TILE_Y, w: TILE_W, h: TILE_H })) {
            if (i === 0) faceWall('right')
            else if (i === 1) faceWall('back')
            else openDialog({ kind: 'web', id: 'home' })
            break
          }
        }
      }
    }
  }

  return (
    <group>
      <mesh
        position={position}
        onClick={onClick}
        onPointerOver={(e) => {
          e.stopPropagation()
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto'
        }}
      >
        <planeGeometry args={[TV_SCREEN[0], TV_SCREEN[1]]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>

      {!isChannel && (
        <group ref={logoRef} position={[position[0], logoBaseY, position[2] + 0.42]}>
          {/* Pulsing halo (additive glow), facing the room. */}
          <mesh ref={haloRef} position={[0, 0, -0.08]}>
            <planeGeometry args={[1.25, 1.25]} />
            <meshBasicMaterial
              map={haloTex}
              transparent
              opacity={0.85}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </mesh>

          {/* Extruded green terminal mark: ">" chevron + cursor block. */}
          <group ref={markRef} scale={0.7}>
            <mesh position={[-0.03, 0.13, 0]} rotation-z={-0.6} material={markMat}>
              <boxGeometry args={[0.46, 0.12, 0.14]} />
            </mesh>
            <mesh position={[-0.03, -0.13, 0]} rotation-z={0.6} material={markMat}>
              <boxGeometry args={[0.46, 0.12, 0.14]} />
            </mesh>
            <mesh position={[0.34, -0.04, 0]} material={markMat}>
              <boxGeometry args={[0.14, 0.3, 0.14]} />
            </mesh>
          </group>
        </group>
      )}
    </group>
  )
}
