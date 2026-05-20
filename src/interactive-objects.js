export const MINITEL_OBJECT_NAME = "minitel";
export const BOOK_OBJECT_NAME = "livre";
export const ENVELOPE_OBJECT_NAME = "lettre";
export const LAMP_CORD_OBJECT_NAME = "lampe-voile";

/** @param {string} name @returns {(object3d: import('three').Object3D | null) => boolean} */
function createHitChecker(name) {
  return (object3d) => {
    let current = object3d;
    while (current) {
      if (current.name === name) return true;
      current = current.parent;
    }
    return false;
  };
}

export const isMinitelHit = createHitChecker(MINITEL_OBJECT_NAME);
export const isBookHit = createHitChecker(BOOK_OBJECT_NAME);
export const isEnvelopeHit = createHitChecker(ENVELOPE_OBJECT_NAME);
export const isLampCordHit = createHitChecker(LAMP_CORD_OBJECT_NAME);
