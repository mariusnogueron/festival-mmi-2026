import { useCallback, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Euler, Quaternion, Vector3 } from "three";

const MAIN_CAMERA = "cam-main";
const POINTER_SMOOTH = 0.055;
const PARALLAX_SHIFT = 0.22;
const PARALLAX_YAW = 0.038;
const PARALLAX_PITCH = 0.016;
/** Remontée progressive du parallaxe après un travelling caméra. */
const PARALLAX_RAMP_SPEED = 0.035;

/**
 * Léger déplacement de cam-main (position + rotation) selon la position du curseur.
 *
 * @param {{
 *   activeCameraRef: React.MutableRefObject<string>;
 *   cameraBlendRef: React.MutableRefObject<{ active: boolean }>;
 *   camerasRef: React.MutableRefObject<Record<string, import("three").PerspectiveCamera>>;
 *   camPosRef: React.MutableRefObject<{ x: number; y: number; z: number }>;
 *   inspectedObjectRef: React.MutableRefObject<unknown>;
 *   isDraggingRef: React.MutableRefObject<boolean>;
 * }} params
 */
export function useCameraParallax({
  activeCameraRef,
  cameraBlendRef,
  camerasRef,
  camPosRef,
  inspectedObjectRef,
  isDraggingRef,
}) {
  const pointerTargetRef = useRef({ x: 0, y: 0 });
  const pointerSmoothRef = useRef({ x: 0, y: 0 });
  const baseQuatRef = useRef(new Quaternion());
  const baseQuatReadyRef = useRef(false);
  const wasBlendingRef = useRef(false);
  const parallaxRampRef = useRef(0);
  const tmpEuler = useRef(new Euler(0, 0, 0, "YXZ")).current;
  const tmpQuat = useRef(new Quaternion()).current;
  const tmpOffset = useRef(new Vector3()).current;

  const resetParallaxState = useCallback(() => {
    pointerTargetRef.current.x = 0;
    pointerTargetRef.current.y = 0;
    pointerSmoothRef.current.x = 0;
    pointerSmoothRef.current.y = 0;
    baseQuatReadyRef.current = false;
    parallaxRampRef.current = 0;
  }, []);

  const setPointerFromClient = useCallback((clientX, clientY, rect) => {
    pointerTargetRef.current.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointerTargetRef.current.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }, []);

  useFrame(() => {
    const blending = cameraBlendRef.current.active;

    if (blending) {
      wasBlendingRef.current = true;
      parallaxRampRef.current = 0;
      return;
    }

    if (
      wasBlendingRef.current &&
      activeCameraRef.current === MAIN_CAMERA
    ) {
      resetParallaxState();
    }
    wasBlendingRef.current = false;

    if (activeCameraRef.current !== MAIN_CAMERA) return;
    if (inspectedObjectRef.current || isDraggingRef.current) return;

    const cam = camerasRef.current[MAIN_CAMERA];
    if (!cam) return;

    if (!baseQuatReadyRef.current) {
      baseQuatRef.current.copy(cam.quaternion);
      baseQuatReadyRef.current = true;
    }

    if (parallaxRampRef.current < 1) {
      parallaxRampRef.current = Math.min(
        1,
        parallaxRampRef.current + PARALLAX_RAMP_SPEED,
      );
    }

    const ramp = parallaxRampRef.current;
    const smooth = pointerSmoothRef.current;
    const target = pointerTargetRef.current;
    smooth.x += (target.x - smooth.x) * POINTER_SMOOTH;
    smooth.y += (target.y - smooth.y) * POINTER_SMOOTH;

    const { x: bx, y: by, z: bz } = camPosRef.current;

    tmpOffset.set(
      -smooth.x * PARALLAX_SHIFT * ramp,
      smooth.y * PARALLAX_SHIFT * 0.45 * ramp,
      0,
    );
    tmpOffset.applyQuaternion(baseQuatRef.current);
    cam.position.set(bx + tmpOffset.x, by + tmpOffset.y, bz + tmpOffset.z);

    tmpEuler.set(
      smooth.y * PARALLAX_PITCH * ramp,
      -smooth.x * PARALLAX_YAW * ramp,
      0,
    );
    tmpQuat.setFromEuler(tmpEuler);
    cam.quaternion.copy(baseQuatRef.current).multiply(tmpQuat);
  });

  return { setPointerFromClient, resetParallaxState };
}
