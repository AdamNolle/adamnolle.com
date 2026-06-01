import { useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import { useStore } from './store'
import { CENTER, FOV } from './scene/constants'
import CameraRig from './scene/CameraRig'
import Lighting from './scene/Lighting'
import Environment from './scene/Environment'
import Room from './scene/Room'
import RoomProps from './scene/RoomProps'
import FrontDesk from './scene/walls/FrontDesk'
import ProjectsBoard from './scene/walls/ProjectsBoard'
import AboutBoard from './scene/walls/AboutBoard'
import AppsWall from './scene/walls/AppsWall'
import FlyingIcon from './scene/FlyingIcon'
import Post from './gfx/post'
import Nav from './ui/Nav'
import Dialog from './ui/Dialog'
import Boot from './ui/Boot'

/** Auto-drops render DPR when sustained FPS falls, restores it when headroom returns. */
function AdaptiveQuality() {
  const setDpr = useThree((s) => s.setDpr)
  const max = Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio : 2)
  return <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(max)} />
}

export default function App() {
  const lite = useStore((s) => s.lite)
  const motion = useStore((s) => s.motion)
  const setMotion = useStore((s) => s.setMotion)
  const setBooted = useStore((s) => s.setBooted)

  // Honor the OS "reduce motion" setting: force animation off when it's set,
  // on mount and whenever it changes. A manual Motion toggle still wins when
  // the OS expresses no preference.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) setMotion(false)
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setMotion(false)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [setMotion])

  return (
    <div className="canvas-wrap">
      <Canvas
        dpr={[1, 2]}
        shadows
        camera={{
          fov: FOV,
          position: [CENTER.x, CENTER.y, CENTER.z],
          near: 0.05,
          far: 100,
        }}
        gl={{ antialias: true, toneMappingExposure: 1.1 }}
        frameloop={lite || !motion ? 'demand' : 'always'}
        onCreated={() => {
          // Heavy textures/PMREM build during mount; give them a beat to settle
          // before lifting the boot veil.
          setTimeout(() => setBooted(true), 500)
        }}
      >
        <color attach="background" args={['#95a8bc']} />
        <fogExp2 attach="fog" args={['#95a8bc', 0.014]} />
        <Environment intensity={1} />
        <Lighting />
        <Room />
        <RoomProps />
        <FrontDesk />
        <ProjectsBoard />
        <AboutBoard />
        <AppsWall />
        <FlyingIcon />
        <CameraRig />
        <Post />
        <AdaptiveQuality />
      </Canvas>
      <Nav />
      <Dialog />
      <Boot />
    </div>
  )
}
