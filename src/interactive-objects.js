export const MINITEL_OBJECT_NAME = "minitel";
export const MINITEL_SCREEN_OBJECT_NAME = "minitel-screen";
export const BOOK_OBJECT_NAME = "livre";
export const ENVELOPE_OBJECT_NAME = "lettre";
export const LAMP_ROOT_OBJECT_NAME = "lampe";
export const LAMP_CORD_OBJECT_NAME = "lampe-voile";
export const TV_OBJECT_NAME = "tele";
export const KEY_LETTER_OBJECT_NAME = "key";
export const KEY_SUPPORT_OBJECT_NAME = "support";

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
export const isMinitelScreenHit = createHitChecker(MINITEL_SCREEN_OBJECT_NAME);
export const isBookHit = createHitChecker(BOOK_OBJECT_NAME);
export const isEnvelopeHit = createHitChecker(ENVELOPE_OBJECT_NAME);
export const isLampCordHit = createHitChecker(LAMP_CORD_OBJECT_NAME);
export const isTvHit = createHitChecker(TV_OBJECT_NAME);

export function getHitKeyName(object3d) {
  const prefixes = [
    `${KEY_LETTER_OBJECT_NAME}-`,
    `${KEY_SUPPORT_OBJECT_NAME}-`,
  ];

  let current = object3d;
  while (current) {
    for (const prefix of prefixes) {
      if (current.name.startsWith(prefix)) {
        return current.name.slice(prefix.length);
      }
    }
    current = current.parent;
  }
  return null;
}

export const isKeyboardHit = (object3d) => getHitKeyName(object3d) !== null;