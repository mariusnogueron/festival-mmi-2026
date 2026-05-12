/**
 * Objet 3D cliquable : le nom doit correspondre au nœud du GLB (ex. scene.gltf).
 */
export const MINITEL_OBJECT_NAME = "minitel";

/**
 * @param {import('three').Object3D | null} object3d
 * @returns {boolean}
 */
export function isMinitelHit(object3d) {
  let current = object3d;
  while (current) {
    if (current.name === MINITEL_OBJECT_NAME) return true;
    current = current.parent;
  }
  return false;
}
