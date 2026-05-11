import { useRef, useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useControls } from "leva";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";

RectAreaLightUniformsLib.init();

export default function Model(props) {
  const { scene } = useGLTF("/chambre_opt.glb");
  const { set, size, gl } = useThree();

  const cameras = useRef({});
  const pointLightRef = useRef(null);

  const { normalScale } = useControls("Matériaux", {
    normalScale: {
      label: "Normal map intensité",
      value: 0.95,
      min: 0,
      max: 2,
      step: 0.05,
    },
  });

  const { activeCamera, pointIntensity, pointColor, shadowNormalBias } =
    useControls("Point Light", {
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
    });

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

  useEffect(() => {
    scene.traverse((obj) => {
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
    });
    const terminalCam = cameras.current["cam-terminal"];
    if (terminalCam) terminalCam.position.set(3.82, 1.004, -0.884);

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
  }, [scene]);

  useEffect(() => {
    const cam = cameras.current[activeCamera];
    if (!cam) return;
    cam.aspect = size.width / size.height;
    cam.updateProjectionMatrix();
    set({ camera: cam });
    setCamPos({ x: cam.position.x, y: cam.position.y, z: cam.position.z });
  }, [activeCamera, set, size, setCamPos]);

  useEffect(() => {
    const cam = cameras.current[activeCamera];
    if (cam) cam.position.set(camPos.x, camPos.y, camPos.z);
  }, [camPos.x, camPos.y, camPos.z, activeCamera]);

  useEffect(() => {
    if (pointLightRef.current) pointLightRef.current.intensity = pointIntensity;
  }, [pointIntensity]);

  useEffect(() => {
    if (pointLightRef.current) pointLightRef.current.color.set(pointColor);
  }, [pointColor]);

  useEffect(() => {
    if (pointLightRef.current)
      pointLightRef.current.shadow.normalBias = shadowNormalBias;
  }, [shadowNormalBias]);

  useEffect(() => {
    scene.traverse((obj) => {
      if (!obj.isMesh) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((mat) => {
        if (mat.normalMap) mat.normalScale.set(normalScale, normalScale);
      });
    });
  }, [normalScale, scene]);

  return (
    <group {...props} dispose={null}>
      <primitive object={scene} />
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
  "https://www.gstatic.com/draco/versioned/decoders/1.5.6/",
);
useGLTF.preload("/chambre_opt.glb");
