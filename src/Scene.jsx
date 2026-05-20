import { useRef, useEffect, useLayoutEffect, useState } from "react";
import { useGLTF, useCursor, Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useControls } from "leva";
import {
  Box3,
  Euler,
  MathUtils,
  PerspectiveCamera,
  Quaternion,
  Raycaster,
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
  BOOK_OBJECT_NAME,
  ENVELOPE_OBJECT_NAME,
} from "./interactive-objects.js";
import { useHoverUi } from "./hover-ui-context.jsx";
import { useTerminal } from "./terminal-context.jsx";
import Terminal from "./Terminal.jsx";

RectAreaLightUniformsLib.init();

const CAMERA_BLEND_MS = 2200;

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

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

export default function Model(props) {
  const { scene: gltfScene } = useGLTF("/chambre.glb");
  const { set, size, gl, camera } = useThree();
  const { hoverHint, setHoverHint } = useHoverUi();
  useCursor(!!hoverHint);

  const cameras = useRef({});
  const pointLightRef = useRef(null);
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
    /** @type {import('three').PerspectiveCamera | null} */
    target: null,
  });
  const tmpPos = useRef(new Vector3()).current;
  const tmpQuat = useRef(new Quaternion()).current;

  const floatingNodesRef = useRef(new Set());
  const floatingObjectsMapRef = useRef(new Map());
  const lampOnRef = useRef(true);
  const pointIntensityRef = useRef(25);

  const { normalScale } = useControls("Matériaux", {
    normalScale: {
      label: "Normal map intensité",
      value: 0.95,
      min: 0,
      max: 2,
      step: 0.05,
    },
  });

  const [
    { activeCamera, pointIntensity, pointColor, shadowNormalBias },
    setPointLightControls,
  ] = useControls("Point Light", () => ({
    activeCamera: {
      label: "Caméra",
      value: "cam-main",
      options: ["cam-main", "cam-terminal"],
    },
    pointIntensity: {
      label: "Intensité",
      value: 25,
      min: 0,
      max: 8000,
      step: 10,
    },
    pointColor: { label: "Couleur", value: "#e49f08" },
    shadowNormalBias: {
      label: "Shadow normal bias",
      value: 0.05,
      min: 0,
      max: 0.5,
      step: 0.005,
    },
  }));

  const activeCameraRef = useRef(activeCamera);
  /** Caméra Leva juste avant passage en cam-terminal (clic minitel ou panneau). */
  const cameraBeforeTerminalRef = useRef("cam-main");
  const { isTerminalOpen, setIsTerminalOpen } = useTerminal();
  const minitelScreenRef = useRef(null);
  const [terminalAnchor, setTerminalAnchor] = useState(null);

  const [camPos, setCamPos] = useControls("Position caméra", () => ({
    x: { value: -0.989, min: -20, max: 20, step: 0.001 },
    y: { value: 3.552, min: -20, max: 20, step: 0.001 },
    z: { value: 2.656, min: -20, max: 20, step: 0.001 },
  }));

  const al1 = useControls("Area Light 1", {
    intensity: { value: 50, min: 0, max: 2000, step: 10 },
    x: { value: 0, min: -10, max: 10, step: 0.1 },
    y: { value: 3, min: 0, max: 10, step: 0.1 },
    z: { value: 0, min: -10, max: 10, step: 0.1 },
    width: { value: 2, min: 0.1, max: 10, step: 0.1 },
    height: { value: 2, min: 0.1, max: 10, step: 0.1 },
  });

  const terminalUi = useControls("Terminal écran", {
    distanceFactor: { label: "Échelle", value: 8, min: 0.2, max: 40, step: 0.1 },
    offsetX: { label: "Décalage X", value: 0, min: -0.5, max: 0.5, step: 0.001 },
    offsetY: { label: "Décalage Y", value: 0, min: -0.5, max: 0.5, step: 0.001 },
    offsetZ: { label: "Décalage Z", value: 0, min: -0.5, max: 0.5, step: 0.001 },
  });

  useEffect(() => {
    const prev = activeCameraRef.current;
    if (activeCamera === "cam-terminal" && prev !== "cam-terminal") {
      cameraBeforeTerminalRef.current = prev;
    }
    activeCameraRef.current = activeCamera;
    if (activeCamera !== "cam-terminal") setIsTerminalOpen(false);
  }, [activeCamera]);

  // Quand le terminal se ferme depuis son propre [ESC], on revient à la caméra précédente
  useEffect(() => {
    if (!isTerminalOpen && activeCameraRef.current === "cam-terminal") {
      setPointLightControls({ activeCamera: cameraBeforeTerminalRef.current });
    }
  }, [isTerminalOpen, setPointLightControls]);

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
      b.target = null;
      target.aspect = sz.width / sz.height;
      target.updateProjectionMatrix();
      state.set({ camera: target });
      setCamPos({
        x: target.position.x,
        y: target.position.y,
        z: target.position.z,
      });
      if (target.name === "cam-terminal") setIsTerminalOpen(true);
    }
  });

  useLayoutEffect(() => {
    const target = cameras.current[activeCamera];
    if (!target?.isPerspectiveCamera) return;

    const blendCam = blendCamRef.current;
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
    b.t0 = performance.now();
    b.active = true;

    blendCam.position.copy(b.p0);
    blendCam.quaternion.copy(b.q0);
    blendCam.fov = b.f0;
    blendCam.near = b.near0;
    blendCam.far = b.far0;
    blendCam.aspect = sz.width / sz.height;
    blendCam.updateProjectionMatrix();
    set({ camera: blendCam });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- uniquement au changement Leva ; `camera` exclu pour éviter de relancer le blend quand on assigne blendCam
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

    const onPointerMove = (event) => {
      const hit = raycast(event);
      if (
        hit &&
        (isMinitelHit(hit) ||
          isMinitelScreenHit(hit) ||
          isBookHit(hit) ||
          isEnvelopeHit(hit) ||
          isLampCordHit(hit))
      ) {
        setHoverHint({ x: event.clientX, y: event.clientY });
      } else {
        setHoverHint(null);
      }
    };

    const onPointerDown = (event) => {
      if (event.button !== 0) return;
      const hit = raycast(event);

      if (hit && (isMinitelHit(hit) || isMinitelScreenHit(hit))) {
        setPointLightControls({ activeCamera: "cam-terminal" });
        return;
      }

      if (hit && (isBookHit(hit) || isEnvelopeHit(hit))) {
        const name = isBookHit(hit) ? BOOK_OBJECT_NAME : ENVELOPE_OBJECT_NAME;
        const node = floatingObjectsMapRef.current.get(name);
        if (node) {
          if (floatingNodesRef.current.has(name)) {
            floatingNodesRef.current.delete(name);
            node.position.y = node.userData.baseY;
            setNodeEmissive(node, false);
          } else {
            floatingNodesRef.current.add(name);
            setNodeEmissive(node, true);
          }
        }
        return;
      }

      if (hit && isLampCordHit(hit)) {
        lampOnRef.current = !lampOnRef.current;
        if (pointLightRef.current)
          pointLightRef.current.intensity = lampOnRef.current
            ? pointIntensityRef.current
            : 0;
        return;
      }

      if (activeCameraRef.current === "cam-terminal") {
        setPointLightControls({
          activeCamera: cameraBeforeTerminalRef.current,
        });
      }
    };

    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      if (activeCameraRef.current !== "cam-terminal") return;
      setPointLightControls({
        activeCamera: cameraBeforeTerminalRef.current,
      });
    };

    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerleave", clearHover);
    el.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerleave", clearHover);
      el.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [gltfScene, camera, gl, setHoverHint, setPointLightControls]);

  useEffect(() => {
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
      if (obj.isPointLight) {
        pointLightRef.current = obj;
        obj.castShadow = true;
        obj.shadow.mapSize.setScalar(1024);
        obj.shadow.bias = -0.0005;
        obj.shadow.normalBias = shadowNormalBias;
      }
      if (obj.name === BOOK_OBJECT_NAME || obj.name === ENVELOPE_OBJECT_NAME) {
        floatingObjectsMapRef.current.set(obj.name, obj);
        obj.userData.baseY = obj.position.y;
      }
      if (obj.isMesh && obj.name === "minitel-screen") {
        minitelScreenRef.current = obj;
      }
    });
    const terminalCam = cameras.current["cam-terminal"];
    if (terminalCam) terminalCam.position.set(3.82, 1.004, -0.884);

    const screenMesh = minitelScreenRef.current;
    if (screenMesh && terminalCam) {
      screenMesh.updateWorldMatrix(true, false);
      terminalCam.updateWorldMatrix(true, true);
      const center = new Box3()
        .setFromObject(screenMesh)
        .getCenter(new Vector3());
      const euler = new Euler().setFromQuaternion(
        terminalCam.getWorldQuaternion(new Quaternion()),
      );
      setTerminalAnchor({
        position: [center.x, center.y, center.z],
        rotation: [euler.x, euler.y, euler.z],
      });
    }

    const defaultCam = cameras.current["cam-main"];
    if (defaultCam) {
      defaultCam.aspect = size.width / size.height;
      defaultCam.updateProjectionMatrix();
      set({ camera: defaultCam });
      setCamPos({
        x: defaultCam.position.x,
        y: defaultCam.position.y,
        z: defaultCam.position.z,
      });
    }
  }, [gltfScene]); // eslint-disable-line react-hooks/exhaustive-deps -- exécution au chargement du GLB uniquement

  useEffect(() => {
    if (cameraBlendRef.current.active) return;
    const cam = cameras.current[activeCamera];
    if (cam) cam.position.set(camPos.x, camPos.y, camPos.z);
  }, [camPos.x, camPos.y, camPos.z, activeCamera]);

  useEffect(() => {
    pointIntensityRef.current = pointIntensity;
    if (pointLightRef.current)
      pointLightRef.current.intensity = lampOnRef.current ? pointIntensity : 0;
  }, [pointIntensity]);

  useEffect(() => {
    if (pointLightRef.current) pointLightRef.current.color.set(pointColor);
  }, [pointColor]);

  useEffect(() => {
    if (pointLightRef.current)
      pointLightRef.current.shadow.normalBias = shadowNormalBias;
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
      {isTerminalOpen && terminalAnchor && (
        <Html
          transform
          distanceFactor={terminalUi.distanceFactor}
          position={[
            terminalAnchor.position[0] + terminalUi.offsetX,
            terminalAnchor.position[1] + terminalUi.offsetY,
            terminalAnchor.position[2] + terminalUi.offsetZ,
          ]}
          rotation={terminalAnchor.rotation}
        >
          <Terminal />
        </Html>
      )}
      <rectAreaLight
        position={[al1.x, al1.y, al1.z]}
        intensity={al1.intensity}
        width={al1.width}
        height={al1.height}
        rotation={[-Math.PI / 2, 0, 0]}
      />
    </group>
  );
}

useGLTF.setDecoderPath(
  "https://www.gstatic.com/draco/versioned/decoders/1.5.6/"
);
