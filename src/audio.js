/** Gestion centralisée du son (hub + scène 3D). */

const SCENE_AMBIENT_SRC = "/sfx/ambiance_piece_1.mp3";

/** Volumes normalisés par fichier (0–1). */
const SFX_VOLUMES = {
  "/sfx/clavier_1.mp3": 0.32,
  "/sfx/ampoule_2.mp3": 0.38,
  "/sfx/tv_sound.mp3": 0.22,
  "/sfx/ambiance_piece_1.mp3": 0.14,
  "/sfx/allumage_pc_ancien_1.mp3": 0.34,
};

/** @type {Map<string, { audios: HTMLAudioElement[]; index: number }>} */
const audioPools = new Map();

/** @type {Map<string, HTMLAudioElement>} */
const loopingSounds = new Map();

/** @type {HTMLAudioElement | null} */
let sceneAmbient = null;

let soundEnabled = false;

/** @param {string} src @returns {number} */
function getNormalizedVolume(src) {
  return SFX_VOLUMES[src] ?? 0.35;
}

/** @returns {boolean} */
export function isSoundEnabled() {
  return soundEnabled;
}

/** @param {boolean} enabled */
export function setSoundEnabled(enabled) {
  soundEnabled = enabled;
  if (!enabled) {
    stopAllSounds();
  }
}

function pausePoolAudios() {
  for (const pool of audioPools.values()) {
    for (const audio of pool.audios) {
      audio.pause();
      audio.currentTime = 0;
    }
  }
}

function pauseLoopingSounds() {
  for (const audio of loopingSounds.values()) {
    audio.pause();
    audio.currentTime = 0;
  }
}

export function stopAllSounds() {
  pausePoolAudios();
  pauseLoopingSounds();
  if (sceneAmbient) {
    sceneAmbient.pause();
    sceneAmbient.currentTime = 0;
  }
}

/**
 * @param {string} src
 * @param {{ vary?: boolean, volume?: number }} [options]
 */
export function playSound(src, { vary = true, volume } = {}) {
  if (!soundEnabled) return;

  const resolvedVolume = volume ?? getNormalizedVolume(src);

  let pool = audioPools.get(src);
  if (!pool) {
    pool = {
      audios: Array.from({ length: 8 }, () => {
        const audio = new Audio(src);
        audio.preload = "auto";
        return audio;
      }),
      index: 0,
    };
    audioPools.set(src, pool);
  }

  const audio = pool.audios[pool.index];
  pool.index = (pool.index + 1) % pool.audios.length;
  audio.currentTime = 0;
  audio.playbackRate = vary ? 0.92 + Math.random() * 0.16 : 1;
  audio.volume = resolvedVolume;
  audio.play().catch(() => {});
}

/**
 * @param {string} src
 * @param {boolean} active
 * @param {{ volume?: number }} [options]
 */
export function setLoopingSound(src, active, { volume } = {}) {
  if (!active || !soundEnabled) {
    const audio = loopingSounds.get(src);
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    return;
  }

  let audio = loopingSounds.get(src);
  if (!audio) {
    audio = new Audio(src);
    audio.loop = true;
    audio.preload = "auto";
    loopingSounds.set(src, audio);
  }

  audio.volume = volume ?? getNormalizedVolume(src);
  audio.play().catch(() => {});
}

/** @param {boolean} active */
export function setSceneAmbientActive(active) {
  if (!active || !soundEnabled) {
    if (sceneAmbient) {
      sceneAmbient.pause();
      sceneAmbient.currentTime = 0;
    }
    return;
  }

  if (!sceneAmbient) {
    sceneAmbient = new Audio(SCENE_AMBIENT_SRC);
    sceneAmbient.loop = true;
    sceneAmbient.preload = "auto";
  }

  sceneAmbient.volume = getNormalizedVolume(SCENE_AMBIENT_SRC);
  if (sceneAmbient.paused) {
    sceneAmbient.play().catch(() => {});
  }
}
