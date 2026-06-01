import { useMemo, useEffect, useRef, Suspense } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { appIconTexture, haloTexture } from '../../gfx/cards'
import { BitmapImage } from '../../gfx/bitmap'
import { PROJECTS, type Project } from '../../data/projects'
import { useStore } from '../../store'
import { WALL, wp, TAP_THRESHOLD } from '../constants'

/**
 * LEFT wall — the APPS wall. The nine projects float as 3D app tiles in a 3×3
 * grid (no shelf): rounded, beveled faces behind a soft pulsing halo in each
 * project's colour. Tiles with a real logo bitmap (FileID, Document Finder,
 * LiveBlock, The Block Suite, DeepBreak) show it; the other four keep their
 * procedural motif glyph. Clicking one launches it on a Mario-64 "star-get"
 * flight to the TV (see <FlyingIcon>), which tunes the TV to that channel.
 */
const ICON = 0.46

/**
 * The tile face drawn from the procedural glyph generator (`cards.ts`). Used
 * directly for the four projects without a logo bitmap, and as the Suspense
 * fallback for the five that do (shown until the PNG downloads).
 */
function ProceduralFace({ project }: { project: Project }) {
  const icon = useMemo(() => appIconTexture(project), [project])
  useEffect(() => () => icon.dispose(), [icon])
  return (
    <mesh position={[0, 0, 0.042]}>
      <planeGeometry args={[ICON - 0.04, ICON - 0.04]} />
      <meshBasicMaterial map={icon} transparent toneMapped={false} />
    </mesh>
  )
}

function AppIcon({
  project,
  position,
  flagship,
  hidden,
}: {
  project: Project
  position: [number, number, number]
  flagship?: boolean
  hidden: boolean
}) {
  const launchFly = useStore((s) => s.launchFly)
  const motion = useStore((s) => s.motion)
  const lite = useStore((s) => s.lite)

  const grp = useRef<THREE.Group>(null!)
  const haloRef = useRef<THREE.Mesh>(null)
  const hovered = useRef(false)
  const halo = useMemo(
    () => haloTexture(project.color, flagship ? 0.7 : 0.45),
    [project.color, flagship],
  )
  useEffect(() => () => halo.dispose(), [halo])
  const phase = useMemo(() => Math.random() * Math.PI * 2, [])

  useFrame((state) => {
    const g = grp.current
    if (!g) return
    if (motion && !lite) {
      const t = state.clock.elapsedTime
      g.position.y = position[1] + Math.sin(t * 1.2 + phase) * 0.06
      g.position.z = position[2] + Math.sin(t * 0.9 + phase) * 0.04
      g.rotation.y = WALL.left.ry + Math.sin(t * 0.6 + phase) * 0.38
      g.rotation.z = Math.sin(t * 0.7 + phase) * 0.04
      const h = haloRef.current
      if (h) {
        const pulse = 1 + Math.sin(t * 1.1 + phase) * 0.06
        h.scale.set(pulse, pulse, 1)
        const mat = h.material as THREE.MeshBasicMaterial
        mat.opacity = (flagship ? 0.85 : 0.6) + Math.sin(t * 1.1 + phase) * 0.15
      }
    }
    const target = hovered.current ? 1.14 : 1
    g.scale.x += (target - g.scale.x) * 0.18
    g.scale.y = g.scale.z = g.scale.x
  })

  if (hidden) return null

  return (
    <group
      ref={grp}
      position={position}
      rotation-y={WALL.left.ry}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        if (e.delta > TAP_THRESHOLD) return
        e.stopPropagation()
        launchFly({ id: project.id, from: position })
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        hovered.current = true
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        hovered.current = false
        document.body.style.cursor = 'auto'
      }}
    >
      <mesh ref={haloRef} position={[0, 0, -0.06]}>
        <planeGeometry args={[ICON + (flagship ? 0.34 : 0.22), ICON + (flagship ? 0.34 : 0.22)]} />
        <meshBasicMaterial
          map={halo}
          transparent
          opacity={flagship ? 0.85 : 0.6}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <RoundedBox args={[ICON, ICON, 0.08]} radius={0.05} smoothness={4} castShadow>
        <meshStandardMaterial color="#0d0f14" roughness={0.5} metalness={0.15} envMapIntensity={1} />
      </RoundedBox>
      {project.logo ? (
        <Suspense fallback={<ProceduralFace project={project} />}>
          <BitmapImage
            url={project.logo}
            width={ICON - 0.04}
            height={ICON - 0.04}
            position={[0, 0, 0.042]}
          />
        </Suspense>
      ) : (
        <ProceduralFace project={project} />
      )}
    </group>
  )
}

export default function AppsWall() {
  const flyingId = useStore((s) => s.flying?.id ?? null)
  const channel = useStore((s) => s.channel)

  const rows = [1.92, 1.2, 0.48]
  const cols = [1.05, 0, -1.05]

  return (
    <group>
      {rows.map((v, r) =>
        cols.map((u, ci) => {
          const p = PROJECTS[r * 3 + ci]
          if (!p) return null
          return (
            <AppIcon
              key={p.id}
              project={p}
              position={wp('left', u, v, 0.42)}
              flagship={p.flagship}
              // Hide the source tile while it's mid-flight or already tuned in.
              hidden={flyingId === p.id || channel === p.id}
            />
          )
        }),
      )}
    </group>
  )
}
