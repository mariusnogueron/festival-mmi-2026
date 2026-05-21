/** Réglages scène figés (anciennement panneaux Leva). */
export const SCENE_CONFIG = {
  normalScale: 0.95,
  keyPressDepth: 0.012,
  pointIntensity: 25,
  pointColor: "#e49f08",
  shadowNormalBias: 0.05,
  areaLight: {
    intensity: 50,
    x: 0,
    y: 3,
    z: 0,
    width: 2,
    height: 2,
  },
  tvLightIntensityMult: 58,
  tvGlowOpacityMult: 0.92,
};

export const POST_PROCESSING = {
  aoIntensity: 6,
  aoRadius: 0.9,
  bloomIntensity: 0.25,
};
