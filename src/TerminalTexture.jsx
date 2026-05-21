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
const FONT = "bold 15px monospace";
const COLOR_BG = "#020802";
const COLOR_TEXT = "#c8ffb0";
const COLOR_CHOICE = "#7dcc7d";
const COLOR_HISTORY = "rgba(200,255,176,0.5)";
const COLOR_RESPONSE = "rgba(200,255,176,0.3)";
const TYPEWRITER_SPEED = 30;

function wrapText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return [text];
  const words = text.split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [text];
}

function drawGlowText(ctx, text, x, y, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.shadowColor = "rgba(150,255,120,0.8)";
  ctx.shadowBlur = 8;
  ctx.fillText(text, x, y);
  ctx.shadowBlur = 0;
  ctx.fillText(text, x, y);
  ctx.restore();
}

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

  for (let sy = 0; sy < H; sy += 4) {
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.fillRect(0, sy, W, 1);
  }

  ctx.fillStyle = "#0a1a0a";
  ctx.fillRect(0, 0, W, 24);
  ctx.font = "bold 12px monospace";
  drawGlowText(ctx, header, PADDING, 16, "#3d6e3d");

  let y = 24 + PADDING;
  ctx.font = FONT;

  for (const entry of history) {
    if (y > H - 60) break;
    const color = entry.type === "response" ? COLOR_RESPONSE : COLOR_HISTORY;
    const text = entry.type === "response" ? `> ${entry.text}` : entry.text;
    const wrapped = wrapText(ctx, text, 470);
    for (const line of wrapped) {
      if (y > H - 60) break;
      drawGlowText(ctx, line, PADDING, y, color);
      y += LINE_HEIGHT;
    }
  }

  if (currentLine) {
    drawGlowText(ctx, displayed, PADDING, y, COLOR_TEXT);
    if (cursorVisible) {
      const w = ctx.measureText(displayed).width;
      ctx.fillStyle = COLOR_TEXT;
      ctx.fillText("█", PADDING + w + 2, y);
    }
    y += LINE_HEIGHT;
  }

  if (showChoices && choices) {
    y += 4;
    choices.forEach((choice, i) => {
      const isSelected = i === (state.selectedChoice ?? 0);
      const choiceText = `${isSelected ? "▶ " : "  "}[${i + 1}] ${choice}`;
      const wrapped = wrapText(ctx, choiceText, 470);
      for (const line of wrapped) {
        drawGlowText(
          ctx,
          line,
          PADDING,
          y,
          isSelected ? COLOR_TEXT : COLOR_CHOICE
        );
        y += LINE_HEIGHT;
      }
    });
  }
}

export default function TerminalTexture({ gltfScene, isTerminalActive }) {
  const canvasRef = useRef(null);
  const textureRef = useRef(null);
  const meshRef = useRef(null);
  const originalMapRef = useRef(null);
  const originalEmissiveMapRef = useRef(null);
  const originalEmissiveRef = useRef(null);
  const originalEmissiveIntensityRef = useRef(null);
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
    texture.flipY = false;
    textureRef.current = texture;

    if (!gltfScene) return;

    gltfScene.traverse((obj) => {
      if (obj.isMesh && obj.name === "minitel-screen") {
        meshRef.current = obj;
        const m = Array.isArray(obj.material) ? obj.material[0] : obj.material;
        originalMapRef.current = m.map;
        originalEmissiveRef.current = m.emissive.clone();
        originalEmissiveIntensityRef.current = m.emissiveIntensity;
      }
    });
  }, [gltfScene]);

  useEffect(() => {
    const mesh = meshRef.current;
    const texture = textureRef.current;
    const canvas = canvasRef.current;
    if (!mesh || !texture || !canvas) return;

    if (isTerminalActive) {
      const s = stateRef.current;
      s.sceneId = "scene_0";
      s.lineIndex = 0;
      s.charIndex = 0;
      s.history = [];
      s.showChoices = false;
      s.frozen = false;
      s.freezeUntil = null;
      s.autoAdvanceAt = null;
      s.nextLineAt = null;
      s.header = "TELEMATIQUE";
      s.lastTypewriter = -Infinity;
      s.lastCursor = -Infinity;
      s.selectedChoice = 0;
      s.dirty = true;

      const ctx = canvas.getContext("2d");
      drawTerminal(ctx, {
        history: [],
        currentLine: "",
        displayed: "",
        choices: null,
        showChoices: false,
        cursorVisible: true,
        header: "TELEMATIQUE",
        selectedChoice: 0,
      });
      texture.needsUpdate = true;

      const m = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      m.map = texture;
      m.emissiveMap = texture;
      m.emissive.set("#c8ffb0");
      m.emissiveIntensity = 0.6;
      m.needsUpdate = true;
    } else {
      const m = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      m.map = originalMapRef.current;
      m.emissiveMap = null;
      if (originalEmissiveRef.current)
        m.emissive.copy(originalEmissiveRef.current);
      m.emissiveIntensity = originalEmissiveIntensityRef.current ?? 0;
      m.needsUpdate = true;
    }
  }, [isTerminalActive]);

  useEffect(() => {
    if (!isTerminalActive) return;

    const onKeyDown = (e) => {
      const s = stateRef.current;
      const scene = SCENES[s.sceneId];

      if (s.showChoices && scene?.choices) {
        if (e.key === "ArrowUp") {
          s.selectedChoice =
            (s.selectedChoice - 1 + scene.choices.length) %
            scene.choices.length;
          s.dirty = true;
          return;
        }
        if (e.key === "ArrowDown") {
          s.selectedChoice = (s.selectedChoice + 1) % scene.choices.length;
          s.dirty = true;
          return;
        }
        if (e.key === "Enter") {
          const idx = s.selectedChoice;
          s.history.push({
            type: "prompt",
            text: scene.lines[scene.lines.length - 1],
          });
          s.history.push({ type: "response", text: scene.choices[idx] });
          s.showChoices = false;
          s.charIndex = 0;
          s.selectedChoice = 0;
          if (scene.next && scene.next !== "scene_end") {
            s.sceneId = scene.next;
            s.lineIndex = 0;
            if (SCENES[s.sceneId]?.special === "minitel")
              s.header = "3615 TRUDE";
          }
          s.dirty = true;
        }
        const idx = parseInt(e.key) - 1;
        if (idx >= 0 && idx < scene.choices.length) {
          s.history.push({
            type: "prompt",
            text: scene.lines[scene.lines.length - 1],
          });
          s.history.push({ type: "response", text: scene.choices[idx] });
          s.showChoices = false;
          s.charIndex = 0;
          s.selectedChoice = 0;
          if (scene.next && scene.next !== "scene_end") {
            s.sceneId = scene.next;
            s.lineIndex = 0;
            if (SCENES[s.sceneId]?.special === "minitel")
              s.header = "3615 TRUDE";
          }
          s.dirty = true;
        }
      }
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
