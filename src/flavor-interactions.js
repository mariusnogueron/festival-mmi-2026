import {
  CANAPE_OBJECT_NAME,
  PAINTING_OBJECT_NAME,
} from "./interactive-objects.js";

/** @typedef {'sofa' | 'painting'} FlavorTarget */

/** @typedef {{ sofaIndex: number; paintingIndex: number }} FlavorState */

export function createFlavorState() {
  return { sofaIndex: 0, paintingIndex: 0 };
}

const SOFA_MESSAGES = [
  "Tu veux te reposer ? C'est pas vraiment le moment.",
  "Le canapé est confortable. L'enquête, un peu moins.",
  "Pas maintenant. Le dossier ne se résoudra pas tout seul.",
  "Assieds-toi plus tard. Là, tu as du boulot.",
];

const PAINTING_MESSAGES = [
  "Un tableau. Il est de qui déjà ?",
  "Jolie peinture. Un peu glauque, quand même.",
  "Ça pourrait être un Monet. Ou un type pressé un mardi.",
  "L'art, c'est quand le cadre coûte plus cher que le tableau.",
  "Tu admires ? Le sujet, lui, ne bouge plus beaucoup.",
  "Signature illisible. Comme ta stratégie.",
  "Beau cadre. Le reste… discutable.",
  "On dirait une œuvre de maître. Un maître très fatigué.",
];

/**
 * @param {import('three').Object3D | null} object3d
 * @returns {FlavorTarget | null}
 */
export function getFlavorFromHit(object3d) {
  let current = object3d;
  while (current) {
    if (current.name === CANAPE_OBJECT_NAME) return "sofa";
    if (current.name === PAINTING_OBJECT_NAME) return "painting";
    current = current.parent;
  }
  return null;
}

/**
 * @param {FlavorTarget} target
 * @param {FlavorState} state
 * @returns {string}
 */
export function resolveFlavorMessage(target, state) {
  if (target === "sofa") {
    const message = SOFA_MESSAGES[state.sofaIndex % SOFA_MESSAGES.length];
    state.sofaIndex += 1;
    return message;
  }

  const message = PAINTING_MESSAGES[state.paintingIndex % PAINTING_MESSAGES.length];
  state.paintingIndex += 1;
  return message;
}
