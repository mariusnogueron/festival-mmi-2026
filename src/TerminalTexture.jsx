import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CanvasTexture } from "three";

const SCENES = {
  scene_0: {
    lines: ["Êtes-vous là ?"],
    choices: ["Oui.", "Qui parle ?", "(silence)"],
    next: "scene_0b",
  },
  scene_0b: {
    lines: ["Bien.", "Nous avons peu de temps.", "Commençons."],
    choices: null,
    next: "scene_1",
  },
  scene_1: {
    lines: ["Vous êtes né à Budapest.", "Vous souvenez-vous de votre frère ?"],
    choices: ["Je m'en souviens.", "Pourquoi me parlez-vous de ça ?"],
    next: "scene_1b",
  },
  scene_1b: {
    lines: [
      "Peu importe.",
      "Vous étiez curieux. C'est ce qui compte.",
      "La curiosité ne demande jamais où elle nous mène.",
    ],
    choices: null,
    next: "scene_2",
  },
  scene_2: {
    lines: [
      "L'uniforme ne vous allait pas.",
      "Vous êtes tombé malade avant le front.",
      "Une chance, n'est-ce pas ?",
      "Vous êtes parti. Berlin, Londres.",
      "Vous avez traversé la rue, et l'idée vous est venue.",
    ],
    choices: ["Continuer."],
    next: "scene_2b",
  },
  scene_2b: {
    lines: [
      "La réaction en chaîne.",
      "Vous l'avez vue avant les autres.",
      "Vous avez écrit à Einstein. Il a signé.",
      "Vous saviez ce que vous faisiez ?",
    ],
    choices: ["Je voulais les empêcher, eux.", "Je ne savais pas.", "Oui."],
    next: "scene_3",
  },
  scene_3: {
    lines: [
      "Chicago. Le réacteur. Décembre 1942.",
      "Vous avez serré la main de Fermi.",
      "Vous n'avez pas souri.",
      "Tu savais déjà.",
    ],
    choices: ["J'ai essayé de les arrêter.", "Je n'avais plus la main."],
    next: "scene_3b",
  },
  scene_3b: {
    lines: [
      "Tu as fait circuler une pétition.",
      "Soixante-dix signatures.",
      "Elle n'est jamais arrivée à Truman.",
      "Hiroshima.",
      "Nagasaki.",
    ],
    choices: null,
    freeze: 5000,
    next: "scene_3c",
  },
  scene_3c: {
    lines: ["Combien ?"],
    choices: ["Je ne veux pas répondre.", "Trop.", "Je ne sais pas."],
    next: "scene_3d",
  },
  scene_3d: {
    lines: ["Personne ne sait vraiment.", "C'est peut-être ça, le pire."],
    choices: null,
    next: "scene_4",
  },
  scene_4: {
    lines: [
      "Tu as tout arrêté.",
      "Tu es passé à la biologie.",
      "Comme si guérir pouvait équilibrer.",
      "Trude était là. Elle est restée.",
    ],
    choices: null,
    next: "scene_4b",
  },
  scene_4b: { lines: ["Tu m'écris encore ?"], choices: null, next: "scene_5" },
  scene_5: {
    lines: [
      "Une dernière question.",
      "Si tu pouvais recommencer, ferais-tu autrement ?",
    ],
    choices: ["Oui.", "Non.", "Je ne sais pas."],
    next: "scene_end",
  },
};

const W = 512;
const H = 256;
const PADDING = 20;
const LINE_HEIGHT = 22;
const FONT = "16px monospace";
const COLOR_BG = "#020802";
const COLOR_TEXT = "#c8ffb0";
const COLOR_CHOICE = "#7dcc7d";
const COLOR_DIM = "rgba(200,255,176,0.45)";
const TYPEWRITER_SPEED = 30;

function drawTerminal(ctx, state) {
  const {
    history,
    currentLine,
    displayed,
    choices,
    showChoices,
    cursorVisible,
    header,
  } = state;

  ctx.fillStyle = COLOR_BG;
  ctx.fillRect(0, 0, W, H);

  for (let y = 0; y < H; y += 4) {
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.fillRect(0, y, W, 2);
  }

  ctx.fillStyle = "#1c3a1c";
  ctx.fillRect(0, 0, W, 24);
  ctx.fillStyle = "#3d6e3d";
  ctx.font = "12px monospace";
  ctx.fillText(header, PADDING, 16);

  let y = 24 + PADDING;

  ctx.font = FONT;
  for (const entry of history) {
    if (y > H - 60) break;
    ctx.fillStyle =
      entry.type === "response" ? COLOR_DIM : "rgba(200,255,176,0.7)";
    const text = entry.type === "response" ? `  > ${entry.text}` : entry.text;
    ctx.fillText(text, PADDING, y);
    y += LINE_HEIGHT;
  }

  if (currentLine) {
    ctx.fillStyle = COLOR_TEXT;
    ctx.fillText(displayed, PADDING, y);
    if (cursorVisible) {
      const w = ctx.measureText(displayed).width;
      ctx.fillRect(PADDING + w + 2, y - 14, 8, 16);
    }
    y += LINE_HEIGHT;
  }

  if (showChoices && choices) {
    y += 4;
    choices.forEach((choice, i) => {
      ctx.fillStyle = COLOR_CHOICE;
      ctx.font = FONT;
      ctx.fillText(`[${i + 1}] ${choice}`, PADDING, y);
      y += LINE_HEIGHT;
    });
  }
}

export default function TerminalTexture({ gltfScene, isTerminalActive }) {
  const canvasRef = useRef(null);
  const textureRef = useRef(null);
  const meshRef = useRef(null);
  const originalMapRef = useRef(null);
  const stateRef = useRef({
    sceneId: "scene_0",
    lineIndex: 0,
    charIndex: 0,
    history: [],
    showChoices: false,
    frozen: false,
    cursorVisible: true,
    lastTypewriter: 0,
    lastCursor: 0,
    freezeUntil: null,
    dirty: true,
    header: "TELEMATIQUE",
  });

  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    canvasRef.current = canvas;

    const texture = new CanvasTexture(canvas);
    textureRef.current = texture;
  }, []);

  useEffect(() => {
    if (!gltfScene || !textureRef.current) return;

    gltfScene.traverse((obj) => {
      if (obj.isMesh && obj.name === "minitel-screen") {
        meshRef.current = obj;
        originalMapRef.current = obj.material.map;
      }
    });
  }, [gltfScene]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    if (isTerminalActive) {
      const s = stateRef.current;
      s.sceneId = "scene_0";
      s.lineIndex = 0;
      s.charIndex = 0;
      s.history = [];
      s.showChoices = false;
      s.frozen = false;
      s.freezeUntil = null;
      s.dirty = true;
      s.header = "TELEMATIQUE";

      mesh.material.map = textureRef.current;
      mesh.material.needsUpdate = true;
    } else {
      mesh.material.map = originalMapRef.current;
      mesh.material.needsUpdate = true;
    }
  }, [isTerminalActive]);

  useEffect(() => {
    if (!isTerminalActive) return;

    const onKeyDown = (e) => {
      const s = stateRef.current;
      if (!s.showChoices) return;
      const scene = SCENES[s.sceneId];
      if (!scene?.choices) return;
      const idx = parseInt(e.key) - 1;
      if (idx < 0 || idx >= scene.choices.length) return;

      s.history.push({
        type: "prompt",
        text: scene.lines[scene.lines.length - 1],
      });
      s.history.push({ type: "response", text: scene.choices[idx] });
      s.showChoices = false;
      s.charIndex = 0;

      if (scene.next && scene.next !== "scene_end") {
        s.sceneId = scene.next;
        s.lineIndex = 0;
        if (SCENES[s.sceneId]?.special === "minitel") s.header = "3615 TRUDE";
      }
      s.dirty = true;
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isTerminalActive]);

  useFrame(({ clock }) => {
    if (!isTerminalActive || !canvasRef.current || !textureRef.current) return;

    const s = stateRef.current;
    const now = clock.getElapsedTime() * 1000;
    const scene = SCENES[s.sceneId];
    if (!scene) return;

    const currentLine = scene.lines[s.lineIndex] ?? "";
    const isLastLine = s.lineIndex === scene.lines.length - 1;

    if (now - s.lastCursor > 500) {
      s.cursorVisible = !s.cursorVisible;
      s.lastCursor = now;
      s.dirty = true;
    }

    if (s.frozen) {
      if (now >= s.freezeUntil) {
        s.frozen = false;
        s.showChoices = true;
        s.dirty = true;
      } else {
        if (s.dirty) {
          const ctx = canvasRef.current.getContext("2d");
          drawTerminal(ctx, {
            ...s,
            currentLine,
            displayed: currentLine,
            choices: scene.choices,
          });
          textureRef.current.needsUpdate = true;
          s.dirty = false;
        }
        return;
      }
    }

    if (!s.showChoices && s.charIndex < currentLine.length) {
      if (now - s.lastTypewriter > TYPEWRITER_SPEED) {
        s.charIndex++;
        s.lastTypewriter = now;
        s.dirty = true;
      }
    }

    const displayed = currentLine.slice(0, s.charIndex);
    const typingDone = s.charIndex >= currentLine.length;

    if (typingDone && !s.showChoices) {
      if (isLastLine) {
        if (scene.freeze && !s.frozen && !s.freezeUntil) {
          s.frozen = true;
          s.freezeUntil = now + scene.freeze;
        } else if (!scene.freeze && scene.choices) {
          s.showChoices = true;
          s.dirty = true;
        } else if (
          !scene.freeze &&
          !scene.choices &&
          scene.next &&
          scene.next !== "scene_end"
        ) {
          if (!s.autoAdvanceAt) s.autoAdvanceAt = now + 900;
          if (now >= s.autoAdvanceAt) {
            s.history.push({ type: "prompt", text: currentLine });
            s.sceneId = scene.next;
            s.lineIndex = 0;
            s.charIndex = 0;
            s.autoAdvanceAt = null;
            if (SCENES[s.sceneId]?.special === "minitel")
              s.header = "3615 TRUDE";
            s.dirty = true;
          }
        }
      } else {
        if (!s.nextLineAt) s.nextLineAt = now + 600;
        if (now >= s.nextLineAt) {
          s.history.push({ type: "prompt", text: currentLine });
          s.lineIndex++;
          s.charIndex = 0;
          s.nextLineAt = null;
          s.dirty = true;
        }
      }
    }

    if (s.dirty) {
      const ctx = canvasRef.current.getContext("2d");
      drawTerminal(ctx, {
        history: s.history,
        currentLine,
        displayed,
        choices: scene.choices,
        showChoices: s.showChoices,
        cursorVisible: s.cursorVisible && !s.showChoices,
        header: s.header,
      });
      textureRef.current.needsUpdate = true;
      s.dirty = false;
    }
  });

  return null;
}
