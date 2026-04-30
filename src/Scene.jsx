import React, { useRef } from "react";
import {
  useGLTF,
  PerspectiveCamera,
  TransformControls,
} from "@react-three/drei";

export default function Model(props) {
  const { scene } = useGLTF("/scene.gltf");

  return (
    <group {...props} dispose={null}>
      <PerspectiveCamera
        makeDefault={true}
        far={1000}
        near={0.1}
        fov={22.895}
        position={[2.251, 1.004, 12.623]}
        rotation={[-1.96, -1.548, -1.961]}
      />
      <PerspectiveCamera
        makeDefault={false}
        far={1000}
        near={0.1}
        fov={22.895}
        position={[-4.037, 1.369, 19.96]}
        rotation={[-0.163, -0.634, -0.097]}
      />
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload("/scene.gltf");
