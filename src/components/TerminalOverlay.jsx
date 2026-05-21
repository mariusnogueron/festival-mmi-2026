import { useEffect, useRef, useState } from "react";

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

const TYPEWRITER_SPEED = 40;

export default function TerminalOverlay({ isTerminalActive, screenPos, screenSize }) {
  const [renderState, setRenderState] = useState(null);
  const stateRef = useRef({
    sceneId: "scene_0",
    lineIndex: 0,
    charIndex: 0,
    history: [],
    showChoices: false,
    selectedChoice: 0,
    header: "TELEMATIQUE",
  });
  const rafRef = useRef(null);
  const lastTypewriterRef = useRef(0);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!isTerminalActive) {
      cancelAnimationFrame(rafRef.current);
      return;
    }
    const s = stateRef.current;
    s.sceneId = "scene_0";
    s.lineIndex = 0;
    s.charIndex = 0;
    s.history = [];
    s.showChoices = false;
    s.selectedChoice = 0;
    s.header = "TELEMATIQUE";
    s.freezeUntil = null;
    s.autoAdvanceAt = null;
    s.nextLineAt = null;
    lastTypewriterRef.current = 0;

    const tick = (now) => {
      const s = stateRef.current;
      const scene = SCENES[s.sceneId];
      if (!scene) return;

      const currentLine = scene.lines[s.lineIndex] ?? "";
      const isLastLine = s.lineIndex === scene.lines.length - 1;

      if (s.freezeUntil) {
        if (now >= s.freezeUntil) {
          s.freezeUntil = null;
          s.showChoices = true;
        }
      }

      if (!s.showChoices && !s.freezeUntil && s.charIndex < currentLine.length) {
        if (now - lastTypewriterRef.current > TYPEWRITER_SPEED) {
          s.charIndex++;
          lastTypewriterRef.current = now;
        }
      }

      const typingDone = s.charIndex >= currentLine.length;

      if (typingDone && !s.showChoices && !s.freezeUntil) {
        if (isLastLine) {
          if (scene.freeze && !s.freezeUntil) {
            s.freezeUntil = now + scene.freeze;
          } else if (!scene.freeze && scene.choices) {
            s.showChoices = true;
          } else if (!scene.freeze && !scene.choices && scene.next && scene.next !== "scene_end") {
            if (!s.autoAdvanceAt) s.autoAdvanceAt = now + 900;
            if (now >= s.autoAdvanceAt) {
              s.history.push({ type: "prompt", text: currentLine });
              s.sceneId = scene.next;
              s.lineIndex = 0;
              s.charIndex = 0;
              s.autoAdvanceAt = null;
            }
          }
        } else {
          if (!s.nextLineAt) s.nextLineAt = now + 600;
          if (now >= s.nextLineAt) {
            s.history.push({ type: "prompt", text: currentLine });
            s.lineIndex++;
            s.charIndex = 0;
            s.nextLineAt = null;
          }
        }
      }

      setRenderState({
        header: s.header,
        history: [...s.history],
        currentLine,
        displayed: currentLine.slice(0, s.charIndex),
        choices: scene.choices,
        showChoices: s.showChoices,
        selectedChoice: s.selectedChoice,
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isTerminalActive]);

  useEffect(() => {
    if (!isTerminalActive) return;
    const onKeyDown = (e) => {
      const s = stateRef.current;
      const scene = SCENES[s.sceneId];
      if (!s.showChoices || !scene?.choices) return;

      if (e.key === "ArrowUp") {
        s.selectedChoice = (s.selectedChoice - 1 + scene.choices.length) % scene.choices.length;
      } else if (e.key === "ArrowDown") {
        s.selectedChoice = (s.selectedChoice + 1) % scene.choices.length;
      } else if (e.key === "Enter") {
        confirmChoice(s, scene);
      } else {
        const idx = parseInt(e.key) - 1;
        if (idx >= 0 && idx < scene.choices.length) {
          s.selectedChoice = idx;
          confirmChoice(s, scene);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isTerminalActive]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [renderState]);

  function confirmChoice(s, scene) {
    s.history.push({ type: "prompt", text: scene.lines[scene.lines.length - 1] });
    s.history.push({ type: "response", text: scene.choices[s.selectedChoice] });
    s.showChoices = false;
    s.charIndex = 0;
    s.selectedChoice = 0;
    if (scene.next && scene.next !== "scene_end") {
      s.sceneId = scene.next;
      s.lineIndex = 0;
    }
  }

  if (!isTerminalActive || !renderState || !screenPos) return null;

  const { header, history, displayed, choices, showChoices, selectedChoice } = renderState;

  const w = screenSize?.width ?? 340;
  const h = screenSize?.height ?? 170;

  return (
    <div
      style={{
        position: "fixed",
        left: screenPos.x - w / 2,
        top: screenPos.y - h / 2,
        width: w,
        height: h,
        backgroundColor: "#020802",
        color: "#c8ffb0",
        fontFamily: "monospace",
        fontSize: "13px",
        padding: "8px 12px",
        boxSizing: "border-box",
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 10,
        border: "1px solid #1a3a1a",
        borderRadius: "2px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          color: "#3d6e3d",
          fontWeight: "bold",
          fontSize: "11px",
          marginBottom: 6,
          flexShrink: 0,
        }}
      >
        {header}
      </div>

      <div
        ref={scrollRef}
        className="terminal-scroll"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {history.map((entry, i) => (
          <div
            key={i}
            style={{
              color:
                entry.type === "response"
                  ? "rgba(200,255,176,0.35)"
                  : "rgba(200,255,176,0.5)",
              marginBottom: 2,
            }}
          >
            {entry.type === "response" ? `> ${entry.text}` : entry.text}
          </div>
        ))}

        <div style={{ color: "#c8ffb0", marginBottom: 4 }}>
          {displayed}
          <span style={{ animation: "blink 1s step-end infinite" }}>█</span>
        </div>

        {showChoices && choices && (
          <div style={{ marginTop: 4 }}>
            {choices.map((choice, i) => (
              <div
                key={i}
                style={{
                  color: i === selectedChoice ? "#c8ffb0" : "#7dcc7d",
                  marginBottom: 2,
                }}
              >
                {i === selectedChoice ? "▶ " : "  "}[{i + 1}] {choice}
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes blink { 50% { opacity: 0; } }
        .terminal-scroll::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}