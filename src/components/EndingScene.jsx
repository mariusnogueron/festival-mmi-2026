import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import { Box3, DoubleSide, Vector3 } from "three";
import { useTerminal } from "../terminal-context.jsx";

const CRANE_FILL = 0.82;
const tmpBox = new Box3();
const tmpSize = new Vector3();
const tmpCenter = new Vector3();

/**
 * Ajuste le crâne pour remplir l'écran minitel (bbox réelle du modèle).
 *
 * @param {import("three").Object3D} crane
 * @param {import("three").Box3} screenBb
 */
function fitCraneOnScreen(crane, screenBb) {
  crane.position.set(0, 0, 0);
  crane.rotation.set(0, 0, 0);
  crane.scale.set(1, 1, 1);
  crane.updateMatrixWorld(true);

  tmpBox.setFromObject(crane);
  tmpBox.getSize(tmpSize);
  if (tmpSize.x < 1e-6 || tmpSize.y < 1e-6) return;

  const screenW = screenBb.max.x - screenBb.min.x;
  const screenH = screenBb.max.y - screenBb.min.y;
  const centerX = (screenBb.max.x + screenBb.min.x) * 0.5;
  const centerY = (screenBb.max.y + screenBb.min.y) * 0.5;
  const frontZ = screenBb.max.z + 0.003;

  const scale = Math.min(
    (screenW * CRANE_FILL) / tmpSize.x,
    (screenH * CRANE_FILL) / tmpSize.y,
  );
  crane.scale.setScalar(scale);
  crane.updateMatrixWorld(true);

  tmpBox.setFromObject(crane);
  tmpBox.getCenter(tmpCenter);

  crane.position.set(
    centerX - tmpCenter.x,
    centerY - tmpCenter.y,
    frontZ - tmpBox.min.z,
  );
}

export default function EndingScene({ minitelScreenRef }) {
  const { craneVisible } = useTerminal();
  const { scene: craneScene } = useGLTF("/crane.glb");
  const craneRef = useRef();

  useMemo(() => {
    craneScene.traverse((obj) => {
      if (!obj.isMesh) return;
      const mat = obj.material.clone();
      mat.color?.set("#061206");
      mat.emissive?.set("#6dff6d");
      mat.emissiveIntensity = 1.65;
      mat.transparent = false;
      mat.opacity = 1;
      mat.depthWrite = true;
      mat.side = DoubleSide;
      mat.toneMapped = false;
      obj.material = mat;
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

    fitCraneOnScreen(crane, bb);

    const mat = Array.isArray(screen.material)
      ? screen.material[0]
      : screen.material;
    if (mat?.emissive) {
      mat.emissive.set("#1a3a1a");
      mat.emissiveIntensity = 0.45;
    }
  }, [craneVisible, minitelScreenRef]);

  if (!craneVisible) return null;

  return <primitive ref={craneRef} object={craneScene} />;
}
