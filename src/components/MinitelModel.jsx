import { useRef } from 'react'
import { RoundedBox } from '@react-three/drei'
import MinitelTerminal from './MinitelTerminal'

const BEIGE     = '#cec5aa'
const BEIGE_MID = '#bbb29c'
const BEIGE_DRK = '#a09080'
const KEY_COLOR = '#c4bc9e'
const SCREEN_BG = '#020f04'

// Simple key row strip
function KeyRow({ z, wide = false }) {
  return (
    <mesh position={[0, 0.02, z]}>
      <boxGeometry args={[wide ? 2.28 : 1.9, 0.025, 0.095]} />
      <meshStandardMaterial color={KEY_COLOR} roughness={0.85} />
    </mesh>
  )
}

// Individual key cluster (left function keys)
function FnKey({ x, z }) {
  return (
    <mesh position={[x, 0.022, z]}>
      <boxGeometry args={[0.18, 0.028, 0.14]} />
      <meshStandardMaterial color={BEIGE_MID} roughness={0.9} />
    </mesh>
  )
}

export default function MinitelModel({ setOrbitEnabled }) {
  const groupRef = useRef()

  return (
    <group ref={groupRef}>
      {/* ── LOWER BODY (keyboard section) ── */}
      <RoundedBox
        args={[2.65, 0.62, 2.05]}
        radius={0.055}
        smoothness={4}
        position={[0, -0.31, 0.12]}
      >
        <meshStandardMaterial color={BEIGE} roughness={0.75} metalness={0.05} />
      </RoundedBox>

      {/* Keyboard surface recess */}
      <mesh position={[0, 0.005, 0.15]}>
        <boxGeometry args={[2.38, 0.01, 1.7]} />
        <meshStandardMaterial color={BEIGE_MID} roughness={0.9} />
      </mesh>

      {/* Key rows (4 rows front→back) */}
      <KeyRow z={0.72} wide />
      <KeyRow z={0.44} wide />
      <KeyRow z={0.16} />
      <KeyRow z={-0.12} />

      {/* Left function keys (2 columns) */}
      {[-1.06, -0.86].map((x, xi) =>
        [0.72, 0.50, 0.28, 0.06, -0.16].map((z, zi) => (
          <FnKey key={`${xi}-${zi}`} x={x} z={z} />
        ))
      )}

      {/* Right numeric pad */}
      {[1.0, 1.2].map((x, xi) =>
        [0.60, 0.40, 0.20, 0.0].map((z, zi) => (
          <mesh key={`n${xi}-${zi}`} position={[x, 0.022, z]}>
            <boxGeometry args={[0.14, 0.028, 0.13]} />
            <meshStandardMaterial color={BEIGE_MID} roughness={0.9} />
          </mesh>
        ))
      )}

      {/* Spacebar */}
      <mesh position={[0.1, 0.022, -0.38]}>
        <boxGeometry args={[0.82, 0.028, 0.11]} />
        <meshStandardMaterial color={BEIGE_MID} roughness={0.88} />
      </mesh>

      {/* ── UPPER BODY (screen housing) ── */}
      <group position={[0, 0.73, -0.92]} rotation={[-0.11, 0, 0]}>
        <RoundedBox
          args={[2.65, 1.78, 0.60]}
          radius={0.05}
          smoothness={4}
        >
          <meshStandardMaterial color={BEIGE} roughness={0.72} metalness={0.04} />
        </RoundedBox>

        {/* Screen bezel (darker frame, fits 1.6×1.2 screen with 0.28 border) */}
        <RoundedBox
          args={[2.18, 1.78, 0.07]}
          radius={0.03}
          smoothness={3}
          position={[0, 0.02, 0.3]}
        >
          <meshStandardMaterial color={BEIGE_DRK} roughness={0.88} />
        </RoundedBox>

        {/* ── CANVAS TERMINAL (fills 1.6 × 1.2 units, perfectly matches the bezel) ── */}
        <group position={[0, 0.02, 0.345]}>
          <MinitelTerminal />
        </group>

        {/* Green power LED */}
        <mesh position={[-0.95, -0.78, 0.31]}>
          <sphereGeometry args={[0.025, 8, 8]} />
          <meshStandardMaterial
            color="#00ff44"
            emissive="#00ff44"
            emissiveIntensity={3}
            roughness={0.1}
          />
        </mesh>

        {/* Brightness knob */}
        <mesh position={[0.93, -0.72, 0.31]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.038, 0.038, 0.07, 10]} />
          <meshStandardMaterial color={BEIGE_DRK} roughness={0.85} />
        </mesh>
      </group>

      {/* ── CONNECTION RIDGE (between lower and upper) ── */}
      <mesh position={[0, 0.01, -0.72]}>
        <boxGeometry args={[2.65, 0.06, 0.42]} />
        <meshStandardMaterial color={BEIGE_MID} roughness={0.8} />
      </mesh>

      {/* ── REAR PHONE SOCKET BUMP ── */}
      <mesh position={[0.75, -0.28, -1.08]}>
        <boxGeometry args={[0.22, 0.12, 0.06]} />
        <meshStandardMaterial color={BEIGE_DRK} roughness={0.9} />
      </mesh>

      {/* ── FEET (4 small boxes) ── */}
      {[[-1.1, 0.92], [-1.1, -0.72], [1.1, 0.92], [1.1, -0.72]].map(([x, z], i) => (
        <mesh key={i} position={[x, -0.63, z]}>
          <boxGeometry args={[0.14, 0.04, 0.14]} />
          <meshStandardMaterial color="#222018" roughness={0.95} />
        </mesh>
      ))}
    </group>
  )
}
