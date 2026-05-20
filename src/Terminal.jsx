import { useEffect, useRef, useState, useCallback } from "react";
import { useTerminal } from "./terminal-context";

const SCENES = {
  scene_0: {
    lines: ["Êtes-vous là ?"],
    choices: ["Oui.", "Qui parle ?", null],
    choiceLabels: ["Oui.", "Qui parle ?", "(ne rien répondre)"],
    next: "scene_0b",
  },
  scene_0b: {
    lines: ["Bien.", "Nous avons peu de temps.", "Commençons."],
    choices: null,
    next: "scene_1",
  },
  scene_1: {
    lines: [
      "Vous êtes né à Budapest.",
      "Vous souvenez-vous de votre frère ?",
    ],
    choices: ["Je m'en souviens.", "Pourquoi me parlez-vous de ça ?"],
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
      "Une chance, n'est-ce pas ?",
      "Vous êtes parti. Berlin, Londres. Les nazis arrivaient.",
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
      "Vous saviez ce que vous faisiez ?",
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
    lines: ["Combien ?"],
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
    special: "minitel",
  },
  scene_4b: {
    lines: ["Tu m'écris encore ?"],
    choices: null,
    next: "scene_5",
    special: "minitel_response",
  },
  scene_5: {
    lines: [
      "Une dernière question.",
      "Si tu pouvais recommencer, ferais-tu autrement ?",
    ],
    choices: ["Oui.", "Non.", "Je ne sais pas."],
    next: "scene_end",
  },
  scene_end: {
    lines: [],
    choices: null,
    next: null,
    special: "mirror",
  },
};

function useTypewriter(text, speed = 22) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    if (!text) {
      setDone(true);
      return;
    }
    let i = 0;
    intervalRef.current = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(intervalRef.current);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(intervalRef.current);
  }, [text, speed]);

  const skip = useCallback(() => {
    if (done) return;
    clearInterval(intervalRef.current);
    setDisplayed(text);
    setDone(true);
  }, [done, text]);

  return { displayed, done, skip };
}

export default function Terminal() {
  const { isTerminalOpen, setIsTerminalOpen } = useTerminal();

  const [sceneId, setSceneId] = useState("scene_0");
  const [lineIndex, setLineIndex] = useState(0);
  const [history, setHistory] = useState([]);
  const [frozen, setFrozen] = useState(false);
  const [showChoices, setShowChoices] = useState(false);
  const [minitelMode, setMinitelMode] = useState(false);
  const [visible, setVisible] = useState(false);

  const scrollRef = useRef(null);

  const scene = SCENES[sceneId];
  const currentLine = scene?.lines?.[lineIndex] ?? "";
  const isLastLine = lineIndex === (scene?.lines?.length ?? 1) - 1;

  const { displayed, done, skip } = useTypewriter(
    isTerminalOpen && !frozen ? currentLine : "",
    22,
  );

  useEffect(() => {
    if (isTerminalOpen) {
      setSceneId("scene_0");
      setLineIndex(0);
      setHistory([]);
      setFrozen(false);
      setShowChoices(false);
      setMinitelMode(false);
      const t = setTimeout(() => setVisible(true), 50);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
    }
  }, [isTerminalOpen]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [history, displayed]);

  useEffect(() => {
    if (!done || !isLastLine) return;

    const sc = SCENES[sceneId];

    if (sc.special === "minitel" && !minitelMode) setMinitelMode(true);
    if (sc.special === "mirror") return;

    if (sc.choices && sc.choices.length > 0) {
      if (sc.freeze) {
        setFrozen(true);
        const t = setTimeout(() => {
          setFrozen(false);
          setShowChoices(true);
        }, sc.freeze);
        return () => clearTimeout(t);
      }
      setShowChoices(true);
    } else if (sc.next) {
      const t = setTimeout(() => advanceToScene(sc.next), 900);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, isLastLine, sceneId]);

  const advanceToScene = (nextId) => {
    setShowChoices(false);
    setSceneId(nextId);
    setLineIndex(0);
  };

  const handleScreenClick = () => {
    if (!done) {
      skip();
      return;
    }
    if (showChoices) return;
    if (!isLastLine) {
      setHistory((h) => [...h, { type: "prompt", text: currentLine }]);
      setLineIndex((i) => i + 1);
    }
  };

  const handleChoice = (choiceText, choiceIndex) => {
    if (!done) return;
    const sc = SCENES[sceneId];
    const label = sc.choiceLabels?.[choiceIndex] ?? choiceText;

    setHistory((h) => [
      ...h,
      { type: "prompt", text: currentLine },
      { type: "response", text: label },
    ]);
    setShowChoices(false);

    if (sc.next) advanceToScene(sc.next);
  };

  if (!isTerminalOpen) return null;

  const isMinitelHeader = minitelMode || sceneId === "scene_4b";

  return (
    <div
      onClick={handleScreenClick}
      style={{
        width: "760px",
        height: "560px",
        position: "relative",
        fontFamily: "'VT323', monospace",
        fontSize: "1.3rem",
        lineHeight: "1.55",
        color: "#c8ffb0",
        background: "#020802",
        boxShadow: "inset 0 0 90px rgba(0,0,0,0.7)",
        display: "flex",
        flexDirection: "column",
        cursor: "default",
        userSelect: "none",
        overflow: "hidden",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.5s ease",
      }}
    >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.13) 3px, rgba(0,0,0,0.13) 4px)",
            pointerEvents: "none",
            zIndex: 10,
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at 50% 40%, rgba(100,255,80,0.04) 0%, transparent 70%)",
            pointerEvents: "none",
            zIndex: 9,
          }}
        />

        <div
          style={{
            padding: "6px 16px 4px",
            borderBottom: "1px solid #1c3a1c",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: "#3d6e3d",
            fontSize: "0.85rem",
            letterSpacing: "0.15em",
            flexShrink: 0,
          }}
        >
          <span>{isMinitelHeader ? "3615 TRUDE" : "TELEMATIQUE"}</span>
          <span style={{ color: "#2a4d2a" }}>■ ■ ■</span>
          <span
            style={{ color: "#3d6e3d", cursor: "pointer" }}
            onClick={(e) => {
              e.stopPropagation();
              setIsTerminalOpen(false);
            }}
          >
            [ESC]
          </span>
        </div>

        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "12px 18px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            scrollbarWidth: "none",
          }}
        >
          {history.map((entry, i) => (
            <p
              key={i}
              style={{
                margin: 0,
                color:
                  entry.type === "response"
                    ? "rgba(200,255,176,0.45)"
                    : "rgba(200,255,176,0.7)",
                whiteSpace: "pre-wrap",
              }}
            >
              {entry.type === "response"
                ? `  > ${entry.text}`
                : entry.text}
            </p>
          ))}

          {currentLine && (
            <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>
              {displayed}
              {!done && (
                <span
                  style={{
                    display: "inline-block",
                    width: "0.6em",
                    height: "1.1em",
                    background: "#c8ffb0",
                    verticalAlign: "text-bottom",
                    animation: "blink 1s step-end infinite",
                  }}
                />
              )}
            </p>
          )}

          {frozen && (
            <p style={{ margin: 0, color: "#3d6e3d", letterSpacing: "0.4em" }}>
              <span style={{ animation: "blink 1.2s step-end infinite" }}>
                . . .
              </span>
            </p>
          )}
        </div>

        {showChoices && scene?.choices && (
          <div
            style={{
              borderTop: "1px solid #1c3a1c",
              padding: "8px 18px 12px",
              display: "flex",
              flexDirection: "column",
              gap: "2px",
              flexShrink: 0,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {scene.choices.map((choice, i) => {
              const label = scene.choiceLabels?.[i] ?? choice ?? "(silence)";
              return (
                <button
                  key={i}
                  onClick={() => handleChoice(choice, i)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#7dcc7d",
                    fontFamily: "'VT323', monospace",
                    fontSize: "1.1rem",
                    textAlign: "left",
                    cursor: "pointer",
                    padding: "1px 0",
                    transition: "color 0.1s",
                    letterSpacing: "0.02em",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "#ffffff")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "#7dcc7d")
                  }
                >
                  {`[${i + 1}] ${label}`}
                </button>
              );
            })}
          </div>
        )}

        {done && !showChoices && !frozen && (scene?.lines?.length ?? 0) > 0 && (
          <div
            style={{
              padding: "2px 18px 6px",
              color: "#2a4d2a",
              fontSize: "0.8rem",
              textAlign: "right",
              flexShrink: 0,
            }}
          >
            [cliquer pour continuer]
          </div>
        )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=VT323&display=swap');
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
