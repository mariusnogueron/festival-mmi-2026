/** Gestion centralisée du son (hub + scène 3D). */

const HUB_AMBIENT_SRC = "/sfx/vieux_pc_qui_tourne_3.mp3";

/** @type {Map<string, { audios: HTMLAudioElement[]; index: number }>} */
const audioPools = new Map();

/** @type {HTMLAudioElement | null} */
let hubAmbient = null;

let soundEnabled = false;

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

export function stopAllSounds() {
  pausePoolAudios();
  if (hubAmbient) {
    hubAmbient.pause();
    hubAmbient.currentTime = 0;
  }
}

/**
 * @param {string} src
 * @param {{ vary?: boolean, volume?: number }} [options]
 */
export function playSound(src, { vary = true, volume = 0.5 } = {}) {
  if (!soundEnabled) return;

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
  audio.volume = volume;
  audio.play().catch(() => {});
}

/** @param {boolean} active */
export function setHubAmbientActive(active) {
  if (!active || !soundEnabled) {
    if (hubAmbient) {
      hubAmbient.pause();
      hubAmbient.currentTime = 0;
    }
    return;
  }

  if (!hubAmbient) {
    hubAmbient = new Audio(HUB_AMBIENT_SRC);
    hubAmbient.loop = true;
    hubAmbient.preload = "auto";
    hubAmbient.volume = 0.22;
  }

  hubAmbient.currentTime = 0;
  hubAmbient.play().catch(() => {});
}
