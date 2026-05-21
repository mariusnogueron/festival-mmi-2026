import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Vector3 } from "three";
import { useTerminal } from "../terminal-context.jsx";

export default function EndingScene({ minitelScreenRef }) {
  const { craneVisible } = useTerminal();
  const { scene: craneScene } = useGLTF("/crane.glb");
  const craneRef = useRef();
  const placedRef = useRef(false);

  // Apply the dark "reflection" material once when the model loads.
  useMemo(() => {
    craneScene.traverse((obj) => {
      if (!obj.isMesh) return;
      obj.material = obj.material.clone();
      obj.material.color?.set("#0a1a0a");
      obj.material.emissive?.set("#1a3a1a");
      obj.material.emissiveIntensity = 1.2;
    });
  }, [craneScene]);

  useFrame(() => {
    const crane = craneRef.current;
    if (!crane) return;

    // Place the crane on the minitel screen once, then spin it slowly.
    if (!placedRef.current) {
      const screen = minitelScreenRef?.current;
      if (screen) {
        const pos = new Vector3();
        screen.getWorldPosition(pos);
        pos.z += 0.08;
        crane.position.copy(pos);
        placedRef.current = true;
      }
    }
    crane.rotation.y += 0.004;
  });

  if (!craneVisible) return null;

  return <primitive ref={craneRef} object={craneScene} scale={0.12} />;
}
