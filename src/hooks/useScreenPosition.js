import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import { Vector3 } from "three";

export function useScreenPosition(object3dRef, posRef) {
  const { size } = useThree();
  const worldPos = useRef(new Vector3());

  useFrame(({ camera }) => {
    const obj = object3dRef.current;
    if (!obj) return;
    obj.getWorldPosition(worldPos.current);
    const projected = worldPos.current.clone().project(camera);
    posRef.current = {
      x: (projected.x * 0.5 + 0.5) * size.width,
      y: (-projected.y * 0.5 + 0.5) * size.height,
    };
  });
}