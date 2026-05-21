import { useRef, useEffect, useLayoutEffect, useState } from "react";
import { useGLTF, useCursor } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { SCENE_CONFIG } from "./scene-config.js";

import {
  Color,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Quaternion,
  Raycaster,
  RectAreaLight,
  Vector2,
  Vector3,
} from "three";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import {
  isMinitelHit,
  isMinitelScreenHit,
  isBookHit,
  isEnvelopeHit,
  isLampCordHit,
  LAMP_ROOT_OBJECT_NAME,
  isTvHit,
  isKeyboardHit,
  getHitKeyName,
  KEY_LETTER_OBJECT_NAME,
  KEY_SUPPORT_OBJECT_NAME,
  BOOK_OBJECT_NAME,
  ENVELOPE_OBJECT_NAME,
} from "./interactive-objects.js";
import { playSound, setLoopingSound } from "./audio.js";
import { useCameraParallax } from "./hooks/useCameraParallax.js";
import { useHoverUi } from "./hover-ui-context.jsx";
import TerminalTexture from "./TerminalTexture.jsx";
import { useTerminal } from "./terminal-context.jsx";

RectAreaLightUniformsLib.init();

const CAMERA_BLEND_MS = 2200;

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

const KEY_SOUND_SRC = "/sfx/clavier_1.mp3";
const LIGHTBULB_SOUND_SRC = "/sfx/ampoule_2.mp3";
const TV_SOUND_SRC = "/sfx/tv_sound.mp3";
const KEY_PRESS_DURATION_MS = 110;
const LAMP_LIGHT_NAME = "lampe-light";
const LAMP_GLOW_COLOR_ON = "#ffffff";
const LAMP_GLOW_INTENSITY_ON = 1.25;

const KEY_MAP = {
  Enter: "envoi",
  Backspace: "correction",
  Escape: "annulation",
  ArrowUp: "retour",
  ArrowDown: "suite",
  " ": "espace",
  0: "0",
  1: "1",
  2: "2",
  3: "3",
  4: "4",
  5: "5",
  6: "6",
  7: "7",
  8: "8",
  9: "9",
};

const IDENTITY_QUAT = new Quaternion();

function setNodeEmissive(node, on) {
  node.traverse((obj) => {
    if (!obj.isMesh) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    mats.forEach((mat) => {
      if (mat.emissive !== undefined) {
        mat.emissive.set(on ? "#fce29a" : "#000000");
        mat.emissiveIntensity = on ? 0.5 : 0;
      }
    });
  });
}

function setMeshEmissive(mesh, color, intensity) {
  if (!mesh) return;
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  mats.forEach((mat) => {
    if (mat.emissive !== undefined) {
      mat.emissive.set(color);
      mat.emissiveIntensity = intensity;
    }
  });
}

/**
 * @param {import("three").Object3D} teleMesh
 */
function setupTeleScreenLight(teleMesh) {
  teleMesh.geometry?.computeBoundingBox();
  const bb = teleMesh.geometry?.boundingBox;
  if (!bb) return null;

  const width = (bb.max.x - bb.min.x) * 0.62;
  const height = (bb.max.y - bb.min.y) * 0.58;
  const centerX = (bb.max.x + bb.min.x) * 0.5;
  const centerY = (bb.max.y + bb.min.y) * 0.5 + height * 0.04;
  const frontZ = bb.max.z + 0.004;

  const glowMat = new MeshBasicMaterial({
    color: 0xe8f2ff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    toneMapped: false,
  });
  const glowPlane = new Mesh(new PlaneGeometry(width, height), glowMat);
  glowPlane.position.set(centerX, centerY, frontZ);
  teleMesh.add(glowPlane);

  const rectLight = new RectAreaLight(0xe8f4ff, 0, width * 0.95, height * 0.95);
  rectLight.position.set(centerX, centerY, frontZ + 0.015);
  rectLight.lookAt(centerX, centerY, frontZ + 0.4);
  teleMesh.add(rectLight);

  return { rectLight, glowPlane, currentIntensity: 0 };
}

const BLACK = new Color(0, 0, 0);

export default function Model(props) {
  const { scene: gltfScene } = useGLTF("/chambre.glb");
  const { set, size, gl, camera } = useThree();
  const { hoverHint, setHoverHint } = useHoverUi();
  useCursor(!!hoverHint);

  const cameras = useRef({});
  const lampLightRef = useRef(null);
  const lampGlowMeshesRef = useRef(/** @type {import("three").Mesh[]} */ ([]));
  const blendCamRef = useRef(new PerspectiveCamera(50, 1, 0.05, 5000));
  const cameraBlendRef = useRef({
    active: false,
    t0: 0,
    p0: new Vector3(),
    q0: new Quaternion(),
    p1: new Vector3(),
    q1: new Quaternion(),
    f0: 50,
    f1: 50,
    near0: 0.05,
    near1: 0.05,
    far0: 5000,
    far1: 5000,
    target: null,
    targetName: null,
  });
  const tmpPos = useRef(new Vector3()).current;
  const tmpQuat = useRef(new Quaternion()).current;

  const floatingNodesRef = useRef(new Set());
  const floatingObjectsMapRef = useRef(new Map());
  const keyboardKeysRef = useRef(new Map());
  const activeKeysRef = useRef(new Map());
  const lampOnRef = useRef(true);
  const pointIntensityRef = useRef(25);
  const isTerminalActiveRef = useRef(false);
  const inspectedObjectRef = useRef(null);
  const isDraggingRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const tvMeshRef = useRef(null);
  const tvOnRef = useRef(false);
  const tvScreenLightRef = useRef(
    /** @type {{ rectLight: RectAreaLight; glowPlane: Mesh; currentIntensity: number } | null} */ (
      null
    ),
  );
  const tvLightActiveRef = useRef(false);
  const minitelScreenMaterialRef = useRef(null);
  const endingFadeRef = useRef(false);
  const endingFrameCountRef = useRef(0);
  const {
    isTerminalActive,
    setIsTerminalActive,
    setScreenRect,
    terminalEverUsed,
    setInspectedObject,
    setIsDraggingObject,
    setBookInspected,
    setEnveloppeInspected,
    isEnding,
    setCraneVisible,
    craneVisible,
    screenMeshRef,
  } = useTerminal();

  const {
    normalScale,
    keyPressDepth,
    pointIntensity,
    pointColor,
    shadowNormalBias,
    areaLight,
    tvLightIntensityMult,
    tvGlowOpacityMult,
  } = SCENE_CONFIG;

  const [activeCamera, setActiveCamera] = useState("cam-main");
  const activeCameraRef = useRef(activeCamera);
  const cameraBeforeTerminalRef = useRef("cam-main");
  const camPosRef = useRef({ x: -0.989, y: 3.552, z: 2.656 });

  const { setPointerFromClient, resetParallaxState } = useCameraParallax({
    activeCameraRef,
    cameraBlendRef,
    camerasRef: cameras,
    camPosRef,
    inspectedObjectRef,
    isDraggingRef,
  });

  useEffect(() => {
    const prev = activeCameraRef.current;
    if (activeCamera === "cam-terminal" && prev !== "cam-terminal") {
      cameraBeforeTerminalRef.current = prev;
    }
    if (activeCamera !== "cam-terminal") {
      isTerminalActiveRef.current = false;
      setIsTerminalActive(false);
    }
    activeCameraRef.current = activeCamera;
    if (activeCamera !== "cam-main") {
      resetParallaxState();
    }
    if (activeCamera === "cam-terminal") {
      const inspected = inspectedObjectRef.current;
      if (inspected?.phase === "inspect") {
        inspected.phase = "flyOut";
        inspected.t0 = performance.now();
      }
    }
  }, [activeCamera, resetParallaxState]);

  useEffect(() => {
    if (isEnding) endingFadeRef.current = true;
  }, [isEnding]);

  const applyLampState = (on) => {
    lampOnRef.current = on;
    if (lampLightRef.current) {
      lampLightRef.current.intensity = on ? pointIntensityRef.current : 0;
    }
    lampGlowMeshesRef.current.forEach((mesh) => {
      setMeshEmissive(
        mesh,
        on ? LAMP_GLOW_COLOR_ON : "#000000",
        on ? LAMP_GLOW_INTENSITY_ON : 0,
      );
    });
  };

  const applyTvState = (on) => {
    tvOnRef.current = on;
    tvLightActiveRef.current = on;
    setLoopingSound(TV_SOUND_SRC, on);
  };

  const lastAspectRef = useRef({ w: 0, h: 0 });

  useFrame((state) => {
    const b = cameraBlendRef.current;
    const { width, height } = state.size;

    if (!b.active && state.camera?.isPerspectiveCamera) {
      const { w, h } = lastAspectRef.current;
      if (w !== width || h !== height) {
        lastAspectRef.current = { w: width, h: height };
        state.camera.aspect = width / height;
        state.camera.updateProjectionMatrix();
      }
    }

    if (floatingNodesRef.current.size > 0) {
      const t = state.clock.getElapsedTime();
      floatingNodesRef.current.forEach((name) => {
        const node = floatingObjectsMapRef.current.get(name);
        if (node)
          node.position.y =
            node.userData.baseY + ((1 - Math.cos(t * 2.0)) / 2) * 0.06;
      });
    }

    if (activeKeysRef.current.size > 0) {
      const now = performance.now();
      activeKeysRef.current.forEach((anim, keyName) => {
        const entry = keyboardKeysRef.current.get(keyName);
        if (!entry) {
          activeKeysRef.current.delete(keyName);
          return;
        }
        const progress = (now - anim.t0) / KEY_PRESS_DURATION_MS;
        if (progress >= 1) {
          entry.nodes.forEach((node) => {
            node.position.y = node.userData.keyBaseY;
          });
          activeKeysRef.current.delete(keyName);
          return;
        }
        const offset = Math.sin(progress * Math.PI) * keyPressDepth;
        entry.nodes.forEach((node) => {
          node.position.y = node.userData.keyBaseY - offset;
        });
      });
    }

    const inspected = inspectedObjectRef.current;
    if (inspected) {
      const { mesh, phase } = inspected;
      if (phase === "flyIn") {
        mesh.position.lerp(inspected.targetPos, 0.08);
        mesh.quaternion.slerp(IDENTITY_QUAT, 0.05);
        if (mesh.position.distanceTo(inspected.targetPos) < 0.005) {
          inspected.phase = "inspect";
        }
      } else if (phase === "flyOut") {
        mesh.position.lerp(inspected.originPos, 0.08);
        mesh.quaternion.slerp(inspected.originQuat, 0.05);
        if (mesh.position.distanceTo(inspected.originPos) < 0.005) {
          mesh.position.copy(inspected.originPos);
          mesh.quaternion.copy(inspected.originQuat);
          setNodeEmissive(mesh, false);
          if (inspected.wasFloating) {
            floatingNodesRef.current.add(inspected.name);
          }
          if (inspected.name === BOOK_OBJECT_NAME) {
            setBookInspected(true);
          } else if (inspected.name === ENVELOPE_OBJECT_NAME) {
            setEnveloppeInspected(true);
          }
          inspectedObjectRef.current = null;
          setInspectedObject(null);
        }
      }
    }

    if (tvScreenLightRef.current) {
      const target = tvLightActiveRef.current ? 1 : 0;
      const tv = tvScreenLightRef.current;
      tv.currentIntensity = MathUtils.lerp(tv.currentIntensity, target, 0.06);
      tv.rectLight.intensity = tv.currentIntensity * tvLightIntensityMult;
      if (tv.glowPlane.material instanceof MeshBasicMaterial) {
        tv.glowPlane.material.opacity = tv.currentIntensity * tvGlowOpacityMult;
      }
    }

    if (endingFadeRef.current && !craneVisible) {
      const mat = minitelScreenMaterialRef.current;
      if (mat) {
        mat.color.lerp(BLACK, 0.008);
        if (mat.emissive) mat.emissive.lerp(BLACK, 0.008);
        mat.emissiveIntensity = Math.max(
          0,
          (mat.emissiveIntensity ?? 0) - 0.008,
        );
      }
      endingFrameCountRef.current += 1;
      if (endingFrameCountRef.current === 180) {
        setCraneVisible(true);
      }
    }

    if (!b.active || !b.target) return;

    const blendCam = blendCamRef.current;
    const sz = state.size;
    const now = performance.now();
    let t = (now - b.t0) / CAMERA_BLEND_MS;
    if (t >= 1) t = 1;
    const e = easeInOutCubic(t);

    tmpPos.copy(b.p0).lerp(b.p1, e);
    tmpQuat.copy(b.q0).slerp(b.q1, e);
    blendCam.position.copy(tmpPos);
    blendCam.quaternion.copy(tmpQuat);
    blendCam.fov = MathUtils.lerp(b.f0, b.f1, e);
    blendCam.near = MathUtils.lerp(b.near0, b.near1, e);
    blendCam.far = MathUtils.lerp(b.far0, b.far1, e);
    blendCam.aspect = sz.width / sz.height;
    blendCam.updateProjectionMatrix();

    if (t >= 1) {
      b.active = false;
      const target = b.target;
      const targetName = b.targetName;
      b.target = null;
      b.targetName = null;
      target.aspect = sz.width / sz.height;
      target.updateProjectionMatrix();
      state.set({ camera: target });
      camPosRef.current = {
        x: target.position.x,
        y: target.position.y,
        z: target.position.z,
      };

      if (targetName === "cam-terminal") {
        isTerminalActiveRef.current = true;
        setIsTerminalActive(true);
      }
    }
  });

  useLayoutEffect(() => {
    const target = cameras.current[activeCamera];
    if (!target?.isPerspectiveCamera) return;

    const current = camera;
    const sz = size;
    if (current === target) return;

    current.updateWorldMatrix(true, true);
    target.updateWorldMatrix(true, true);
    current.getWorldPosition(cameraBlendRef.current.p0);
    current.getWorldQuaternion(cameraBlendRef.current.q0);
    target.getWorldPosition(cameraBlendRef.current.p1);
    target.getWorldQuaternion(cameraBlendRef.current.q1);

    const b = cameraBlendRef.current;
    b.f0 = current.fov;
    b.f1 = target.fov;
    b.near0 = current.near;
    b.near1 = target.near;
    b.far0 = current.far;
    b.far1 = target.far;
    b.target = target;
    b.targetName = activeCamera;
    b.t0 = performance.now();
    b.active = true;

    const blendCam = blendCamRef.current;
    blendCam.position.copy(b.p0);
    blendCam.quaternion.copy(b.q0);
    blendCam.fov = b.f0;
    blendCam.near = b.near0;
    blendCam.far = b.far0;
    blendCam.aspect = sz.width / sz.height;
    blendCam.updateProjectionMatrix();
    set({ camera: blendCam });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCamera]);

  useEffect(() => {
    const el = gl.domElement;
    const raycaster = new Raycaster();
    const ndc = new Vector2();

    const clearHover = () => setHoverHint(null);

    const raycast = (event) => {
      const rect = el.getBoundingClientRect();
      ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObject(gltfScene, true);
      return hits.find((h) => h.object?.isMesh)?.object ?? null;
    };

    const startInspect = (node, name) => {
      const originPos = node.getWorldPosition(new Vector3());
      const originQuat = node.getWorldQuaternion(new Quaternion());

      const forward = camera.getWorldDirection(new Vector3());
      const targetPos = camera
        .getWorldPosition(new Vector3())
        .addScaledVector(forward, 1.8);
      targetPos.y -= 0.1;

      const wasFloating = floatingNodesRef.current.has(name);
      floatingNodesRef.current.delete(name);
      setNodeEmissive(node, false);

      inspectedObjectRef.current = {
        mesh: node,
        name,
        originPos,
        originQuat,
        targetPos,
        t0: performance.now(),
        phase: "flyIn",
        wasFloating,
      };
      setInspectedObject(name);
    };

    const startFlyOut = (inspected) => {
      inspected.phase = "flyOut";
      inspected.t0 = performance.now();
    };

    const onPointerMove = (event) => {
      const rect = el.getBoundingClientRect();

      if (isDraggingRef.current) {
        const inspected = inspectedObjectRef.current;
        if (
          inspected &&
          inspected.phase === "inspect" &&
          activeCameraRef.current !== "cam-terminal"
        ) {
          const last = lastPointerRef.current;
          const dx = event.clientX - last.x;
          const dy = event.clientY - last.y;
          inspected.mesh.rotateY(dx * 0.01);
          inspected.mesh.rotateX(dy * 0.01);
          last.x = event.clientX;
          last.y = event.clientY;
        }
        return;
      }

      if (
        activeCameraRef.current === "cam-main" &&
        !cameraBlendRef.current.active &&
        !inspectedObjectRef.current
      ) {
        setPointerFromClient(event.clientX, event.clientY, rect);
      }

      const hit = raycast(event);
      const hitsBookOrEnvelope =
        !!hit && (isBookHit(hit) || isEnvelopeHit(hit));
      const canInteractBookOrEnvelope =
        terminalEverUsed && activeCameraRef.current !== "cam-terminal";
      if (
        hit &&
        (isKeyboardHit(hit) ||
          isMinitelHit(hit) ||
          isMinitelScreenHit(hit) ||
          isLampCordHit(hit) ||
          isTvHit(hit) ||
          (hitsBookOrEnvelope && canInteractBookOrEnvelope))
      ) {
        setHoverHint({ x: event.clientX, y: event.clientY });
      } else {
        setHoverHint(null);
      }
    };

    const onPointerDown = (event) => {
      if (event.button !== 0) return;

      const inspected = inspectedObjectRef.current;
      if (inspected) {
        if (activeCameraRef.current === "cam-terminal") return;
        if (inspected.phase === "inspect") {
          const hit = raycast(event);
          const hitName =
            hit && (isBookHit(hit) || isEnvelopeHit(hit))
              ? isBookHit(hit)
                ? BOOK_OBJECT_NAME
                : ENVELOPE_OBJECT_NAME
              : null;
          if (hitName === inspected.name) {
            startFlyOut(inspected);
          } else {
            isDraggingRef.current = true;
            lastPointerRef.current = { x: event.clientX, y: event.clientY };
            setIsDraggingObject(true);
          }
        }
        return;
      }

      const hit = raycast(event);
      if (!hit) return;

      if (isKeyboardHit(hit)) {
        const keyName = getHitKeyName(hit);
        const entry = keyName && keyboardKeysRef.current.get(keyName);
        if (entry) {
          activeKeysRef.current.set(keyName, { t0: performance.now() });
          playSound(KEY_SOUND_SRC);
        }
        return;
      }

      if (isMinitelScreenHit(hit)) {
        setActiveCamera("cam-terminal");
        return;
      }

      if (isMinitelHit(hit)) {
        setActiveCamera("cam-terminal");
        return;
      }

      if (isBookHit(hit) || isEnvelopeHit(hit)) {
        if (!terminalEverUsed) return;
        if (activeCameraRef.current === "cam-terminal") return;
        const name = isBookHit(hit) ? BOOK_OBJECT_NAME : ENVELOPE_OBJECT_NAME;
        const node = floatingObjectsMapRef.current.get(name);
        if (node) startInspect(node, name);
        return;
      }

      if (isLampCordHit(hit)) {
        applyLampState(!lampOnRef.current);
        playSound(LIGHTBULB_SOUND_SRC, { vary: false });
        return;
      }

      if (isTvHit(hit)) {
        applyTvState(!tvOnRef.current);
        return;
      }

      if (activeCameraRef.current === "cam-terminal") {
        isTerminalActiveRef.current = false;
        setIsTerminalActive(false);
        setActiveCamera(cameraBeforeTerminalRef.current);
      }
    };

    const onPointerUp = () => {
      isDraggingRef.current = false;
      setIsDraggingObject(false);
    };

    const triggerKeyAnimation = (keyName) => {
      const entry = keyboardKeysRef.current.get(keyName);
      if (entry) {
        activeKeysRef.current.set(keyName, { t0: performance.now() });
        playSound(KEY_SOUND_SRC);
      }
    };

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        const inspected = inspectedObjectRef.current;
        if (inspected && inspected.phase === "inspect") {
          startFlyOut(inspected);
          return;
        }
        if (activeCameraRef.current === "cam-terminal") {
          isTerminalActiveRef.current = false;
          setIsTerminalActive(false);
          setActiveCamera(cameraBeforeTerminalRef.current);
        }
      }

      if (isTerminalActiveRef.current) {
        const keyName =
          KEY_MAP[event.key] ??
          (event.key.length === 1 ? event.key.toLowerCase() : null);
        if (keyName) triggerKeyAnimation(keyName);
      }
    };

    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerleave", clearHover);
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointerup", onPointerUp);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerleave", clearHover);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [
    gltfScene,
    camera,
    gl,
    setHoverHint,
    terminalEverUsed,
    setPointerFromClient,
  ]);

  useEffect(() => {
    keyboardKeysRef.current.clear();
    activeKeysRef.current.clear();
    lampGlowMeshesRef.current = [];

    gltfScene.traverse((obj) => {
      if (obj.isCamera) cameras.current[obj.name] = obj;
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
        const maxAnisotropy = gl.capabilities.getMaxAnisotropy();
        const mats = Array.isArray(obj.material)
          ? obj.material
          : [obj.material];
        mats.forEach((mat) => {
          [
            "map",
            "normalMap",
            "roughnessMap",
            "metalnessMap",
            "specularMap",
            "specularColorMap",
          ].forEach((key) => {
            if (mat[key]) {
              mat[key].anisotropy = maxAnisotropy;
              mat[key].needsUpdate = true;
            }
          });
        });
      }
      if (obj.name === "minitel-screen") {
        screenMeshRef.current = obj;
        minitelScreenMaterialRef.current = Array.isArray(obj.material)
          ? obj.material[0]
          : obj.material;
      }
      if (obj.name === LAMP_LIGHT_NAME && obj.isPointLight) {
        lampLightRef.current = obj;
        obj.castShadow = true;
        obj.shadow.mapSize.setScalar(1024);
        obj.shadow.bias = -0.0005;
        obj.shadow.normalBias = shadowNormalBias;
      }
      if (obj.name === LAMP_ROOT_OBJECT_NAME) {
        obj.traverse((child) => {
          if (child.isMesh) lampGlowMeshesRef.current.push(child);
        });
      }
      if (obj.name === BOOK_OBJECT_NAME || obj.name === ENVELOPE_OBJECT_NAME) {
        floatingObjectsMapRef.current.set(obj.name, obj);
        obj.userData.baseY = obj.position.y;
      }

      if (obj.name === "tele") {
        tvMeshRef.current = obj;
      }

      const isKeyLetter = obj.name.startsWith(`${KEY_LETTER_OBJECT_NAME}-`);
      const isKeySupport = obj.name.startsWith(`${KEY_SUPPORT_OBJECT_NAME}-`);
      if (isKeyLetter || isKeySupport) {
        const prefix = isKeySupport
          ? KEY_SUPPORT_OBJECT_NAME
          : KEY_LETTER_OBJECT_NAME;
        const keyName = obj.name.slice(prefix.length + 1);
        let entry = keyboardKeysRef.current.get(keyName);
        if (!entry) {
          entry = { nodes: [] };
          keyboardKeysRef.current.set(keyName, entry);
        }
        obj.userData.keyBaseY = obj.position.y;
        entry.nodes.push(obj);
      }
    });

    if (tvMeshRef.current?.isMesh && !tvScreenLightRef.current) {
      tvScreenLightRef.current = setupTeleScreenLight(tvMeshRef.current);
    }

    applyLampState(lampOnRef.current);

    const terminalCam = cameras.current["cam-terminal"];
    if (terminalCam) terminalCam.position.set(3.82, 1.004, -0.884);

    const defaultCam = cameras.current["cam-main"];
    if (defaultCam) {
      defaultCam.aspect = size.width / size.height;
      defaultCam.updateProjectionMatrix();
      set({ camera: defaultCam });
      camPosRef.current = {
        x: defaultCam.position.x,
        y: defaultCam.position.y,
        z: defaultCam.position.z,
      };
    }

    const computeScreenRect = () => {
      const mesh = screenMeshRef.current;
      const cam = cameras.current["cam-terminal"];
      if (!mesh?.geometry || !cam) return;

      cam.aspect = window.innerWidth / window.innerHeight;
      cam.updateProjectionMatrix();
      cam.updateWorldMatrix(true, false);

      mesh.geometry.computeBoundingBox();
      const bb = mesh.geometry.boundingBox;
      mesh.updateWorldMatrix(true, false);

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      const corner = new Vector3();

      for (let i = 0; i < 8; i++) {
        corner.set(
          i & 1 ? bb.max.x : bb.min.x,
          i & 2 ? bb.max.y : bb.min.y,
          i & 4 ? bb.max.z : bb.min.z,
        );
        corner.applyMatrix4(mesh.matrixWorld);
        corner.project(cam);
        const xPx = (corner.x * 0.5 + 0.5) * window.innerWidth;
        const yPx = (-corner.y * 0.5 + 0.5) * window.innerHeight;
        if (xPx < minX) minX = xPx;
        if (xPx > maxX) maxX = xPx;
        if (yPx < minY) minY = yPx;
        if (yPx > maxY) maxY = yPx;
      }

      setScreenRect({
        x: (minX + maxX) / 2,
        y: (minY + maxY) / 2,
        width: maxX - minX,
        height: maxY - minY,
      });
    };

    computeScreenRect();
    window.addEventListener("resize", computeScreenRect);
    return () => window.removeEventListener("resize", computeScreenRect);
  }, [gltfScene]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    pointIntensityRef.current = pointIntensity;
    if (lampLightRef.current) {
      lampLightRef.current.intensity = lampOnRef.current ? pointIntensity : 0;
    }
  }, [pointIntensity]);

  useEffect(() => {
    if (lampLightRef.current) lampLightRef.current.color.set(pointColor);
  }, [pointColor]);

  useEffect(() => {
    if (lampLightRef.current)
      lampLightRef.current.shadow.normalBias = shadowNormalBias;
  }, [shadowNormalBias]);

  useEffect(() => {
    gltfScene.traverse((obj) => {
      if (!obj.isMesh) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((mat) => {
        if (mat.normalMap) mat.normalScale.set(normalScale, normalScale);
      });
    });
  }, [normalScale, gltfScene]);

  return (
    <group {...props} dispose={null}>
      <primitive object={gltfScene} />
      <TerminalTexture
        gltfScene={gltfScene}
        isTerminalActive={isTerminalActive}
      />
      <rectAreaLight
        position={[areaLight.x, areaLight.y, areaLight.z]}
        intensity={areaLight.intensity}
        width={areaLight.width}
        height={areaLight.height}
        rotation={[-Math.PI / 2, 0, 0]}
      />
    </group>
  );
}

useGLTF.setDecoderPath(
  "https://www.gstatic.com/draco/versioned/decoders/1.5.6/",
);

//////
