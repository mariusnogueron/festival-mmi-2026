import { useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import MinitelModel from './components/MinitelModel'

export default function App() {
  const orbitRef = useRef()
  const [orbitEnabled, setOrbitEnabled] = useState(true)

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0a080c' }}>
      <Canvas
        camera={{ position: [0, 0.6, 4.2], fov: 44 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#0a080c']} />

        <ambientLight intensity={0.18} />
        <directionalLight position={[3, 6, 4]} intensity={1.6} color="#fff8f0" />
        <directionalLight position={[-5, 2, 1]} intensity={0.4} color="#b0c8ff" />
        <directionalLight position={[0, -2, -4]} intensity={0.15} color="#ffffff" />

        {/* green glow from the screen */}
        <pointLight position={[0, 0.7, 0.2]} intensity={1.4} color="#00ff55" distance={3.5} decay={2} />

        <MinitelModel setOrbitEnabled={setOrbitEnabled} />

        <OrbitControls
          ref={orbitRef}
          enabled={orbitEnabled}
          enablePan={false}
          minPolarAngle={0.18}
          maxPolarAngle={1.45}
          minAzimuthAngle={-0.75}
          maxAzimuthAngle={0.75}
          minDistance={2.2}
          maxDistance={9}
          target={[0, 0.55, 0]}
          enableDamping
          dampingFactor={0.07}
        />
      </Canvas>

      <div style={{
        position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
        color: '#ffffff30', fontSize: 11, fontFamily: 'monospace', letterSpacing: 2,
        pointerEvents: 'none', userSelect: 'none',
      }}>
        CLIC TERMINAL POUR INTERAGIR · GLISSER POUR PIVOTER
      </div>
    </div>
  )
}
