import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import { Vector3 } from "three";
import { useTerminal } from "../terminal-context.jsx";

export default function EndingScene({ minitelScreenRef }) {
  const { craneVisible } = useTerminal();
  const { scene: craneScene } = useGLTF("/crane.glb");
  const craneRef = useRef();

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

  // Place the crane once, as a static reflection facing cam-terminal.
  useEffect(() => {
    if (!craneVisible || !craneRef.current || !minitelScreenRef?.current) {
      return;
    }
    const crane = craneRef.current;
    const screen = minitelScreenRef.current;

    const screenPos = new Vector3();
    screen.getWorldPosition(screenPos);

    // cam-terminal is fixed at this position.
    const camPos = new Vector3(3.82, 1.004, -0.884);
    const dir = camPos.clone().sub(screenPos).normalize();
    const cranePos = screenPos.clone().add(dir.multiplyScalar(0.05));
    crane.position.copy(cranePos);

    crane.lookAt(camPos);

    screen.geometry.computeBoundingBox();
    const box = screen.geometry.boundingBox;
    const screenHeight =
      (box.max.y - box.min.y) * screen.getWorldScale(new Vector3()).y;
    const scale = screenHeight * 0.6;
    crane.scale.set(scale, scale, scale);
  }, [craneVisible, minitelScreenRef]);

  if (!craneVisible) return null;

  return <primitive ref={craneRef} object={craneScene} />;
}
