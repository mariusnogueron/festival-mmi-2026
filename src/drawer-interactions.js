import {
  DRAWER_BOTTOM_OBJECT_NAME,
  DRAWER_TOP_OBJECT_NAME,
} from "./interactive-objects.js";

/** @typedef {'top' | 'bottom'} DrawerId */

/** @typedef {{
 *   triedTop: boolean;
 *   triedBottom: boolean;
 *   retryIndex: number;
 * }} DrawerState */

export function createDrawerState() {
  return {
    triedTop: false,
    triedBottom: false,
    retryIndex: 0,
  };
}

const HINT_TOP = "Il n'y a rien ici… Essaie celui du haut.";
const HINT_BOTTOM = "Il n'y a rien ici… Essaie celui du bas.";
const SECOND_DRAWER =
  "Il paraît vide, essaie de le rouvrir.";

const RETRY_MESSAGES = [
  "Non, toujours pas.",
  "Toujours vide. Étonnant, non ?",
  "Tu peux réessayer. Le tiroir s'en moque.",
  "Rien. Comme avant. Comme toujours.",
  "Le meuble te regarde avec indifférence.",
];

/**
 * @param {import('three').Object3D | null} object3d
 * @returns {DrawerId | null}
 */
export function getDrawerFromHit(object3d) {
  let current = object3d;
  while (current) {
    if (current.name === DRAWER_TOP_OBJECT_NAME) return "top";
    if (current.name === DRAWER_BOTTOM_OBJECT_NAME) return "bottom";
    current = current.parent;
  }
  return null;
}

/**
 * @param {DrawerId} which
 * @param {DrawerState} state
 * @returns {string}
 */
export function resolveDrawerMessage(which, state) {
  const otherTried = which === "top" ? state.triedBottom : state.triedTop;
  const selfTried = which === "top" ? state.triedTop : state.triedBottom;

  if (state.triedTop && state.triedBottom) {
    const message = RETRY_MESSAGES[state.retryIndex % RETRY_MESSAGES.length];
    state.retryIndex += 1;
    return message;
  }

  if (otherTried && !selfTried) {
    if (which === "top") state.triedTop = true;
    else state.triedBottom = true;
    return SECOND_DRAWER;
  }

  if (which === "top") {
    state.triedTop = true;
    return HINT_BOTTOM;
  }

  state.triedBottom = true;
  return HINT_TOP;
}
