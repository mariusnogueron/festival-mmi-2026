import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import { useTerminal } from "../terminal-context.jsx";

export default function EndingScene({ minitelScreenRef }) {
  const { craneVisible } = useTerminal();
  const { scene: craneScene } = useGLTF("/crane.glb");
  const craneRef = useRef();

  useMemo(() => {
    craneScene.traverse((obj) => {
      if (!obj.isMesh) return;
      obj.material = obj.material.clone();
      obj.material.color?.set("#0c180c");
      obj.material.emissive?.set("#2d6b2d");
      obj.material.emissiveIntensity = 0.95;
      obj.material.transparent = true;
      obj.material.opacity = 0.88;
      obj.material.depthWrite = false;
      obj.renderOrder = 12;
    });
  }, [craneScene]);

  useEffect(() => {
    if (!craneVisible || !craneRef.current || !minitelScreenRef?.current) {
      return;
    }

    const crane = craneRef.current;
    const screen = minitelScreenRef.current;

    if (crane.parent && crane.parent !== screen) {
      crane.parent.remove(crane);
    }
    screen.add(crane);

    screen.geometry?.computeBoundingBox();
    const bb = screen.geometry?.boundingBox;
    if (!bb) return;

    const width = bb.max.x - bb.min.x;
    const height = bb.max.y - bb.min.y;
    const centerX = (bb.max.x + bb.min.x) * 0.5;
    const centerY = (bb.max.y + bb.min.y) * 0.5;
    const frontZ = bb.max.z + 0.001;

    crane.position.set(centerX, centerY, frontZ);
    crane.rotation.set(0, 0, 0);

    const scale = Math.min(width, height) * 0.52;
    crane.scale.set(-scale, scale, scale);

    const mat = Array.isArray(screen.material)
      ? screen.material[0]
      : screen.material;
    if (mat?.emissive) {
      mat.emissive.set("#142814");
      mat.emissiveIntensity = 0.35;
    }
  }, [craneVisible, minitelScreenRef]);

  if (!craneVisible) return null;

  return <primitive ref={craneRef} object={craneScene} />;
}
