import { useCallback, useEffect, useRef, useState } from "react";
import { useHub } from "./hub-context.jsx";
import "./welcome-hub.css";

const CREDITS = [
  { role: "3D & narration", name: "Marius Nogueron" },
  { role: "Développement", name: "Jules Crevoisier & Audric Fullhardt" },
  { role: "Musique & son", name: "Gabriel Maillard" },
];

const BOOT_LINES = [
  "SYNCHRONISATION DU SIGNAL…",
  "SOURCE : CHAMBRE 7 — VERROUILLÉE",
  "QUELQU'UN ATTEND DE L'AUTRE CÔTÉ.",
];

/** @param {string} text @param {number} msPerChar */
function useTypewriter(text, msPerChar, active) {
  const [out, setOut] = useState("");
  useEffect(() => {
    if (!active) {
      setOut("");
      return undefined;
    }
    let i = 0;
    setOut("");
    const id = window.setInterval(() => {
      i += 1;
      setOut(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, msPerChar);
    return () => window.clearInterval(id);
  }, [text, msPerChar, active]);
  return out;
}

function CreditsTeletext({ onClose }) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[31000] flex items-center justify-center bg-black/80 p-4 backdrop-blur-[3px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="credits-title"
      onClick={onClose}
    >
      <div
        className="hub-teletext relative w-full max-w-2xl border border-[#c8ffb0]/20 bg-[#020802] p-6 text-[#c8ffb0] shadow-[0_0_60px_rgba(0,0,0,0.8),inset_0_0_40px_rgba(150,255,120,0.04)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between border-b border-[#c8ffb0]/15 pb-3 text-lg text-[#7dcc7d]">
          <span id="credits-title">CRÉDITS</span>
          <span className="text-sm opacity-60">TELETEXTE</span>
        </div>
        <ul className="space-y-3 text-xl leading-snug">
          {CREDITS.map(({ role, name }) => (
            <li key={role} className="grid grid-cols-[1fr_auto] gap-4">
              <span className="text-[#7dcc7d]">{role}</span>
              <span>{name}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-base text-[#7dcc7d]/80">
          [ Échap ] ou clic extérieur pour fermer
        </p>
      </div>
    </div>
  );
}

function TvScreenContent({
  phase,
  soundEnabled,
  soundWarn,
  onToggleSound,
  onStart,
  onCredits,
}) {
  const bootIndex =
    phase === "boot" ? 0 : phase === "boot2" ? 1 : phase === "boot3" ? 2 : 0;
  const bootLine = BOOT_LINES[bootIndex] ?? "";
  const typed = useTypewriter(
    bootLine,
    28,
    phase === "boot" || phase === "boot2" || phase === "boot3",
  );
  const menuReady = phase === "menu";

  return (
    <>
      {(phase === "static" || phase === "boot") && (
        <div className="hub-static-noise absolute inset-0 z-20 mix-blend-screen opacity-70" aria-hidden />
      )}

      <div
        className="pointer-events-none absolute inset-0 z-10 opacity-[0.1]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg,#000 0px,#000 1px,transparent 1px,transparent 3px)",
        }}
        aria-hidden
      />
      <div className="hub-tube-tint pointer-events-none absolute inset-0 z-10" aria-hidden />
      <div className="hub-scan-beam pointer-events-none absolute inset-x-0 top-0 z-10 h-[14%] bg-linear-to-b from-transparent via-[#e8c878]/10 to-transparent" aria-hidden />

      <div className="absolute inset-0 z-30 flex flex-col justify-between p-[clamp(14px,2.5vw,32px)] pb-[clamp(18px,3vw,40px)]">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[48%] bg-linear-to-t from-[#120e08]/95 via-[#120e08]/50 to-transparent" aria-hidden />

        <div className="relative z-10 flex items-start justify-end gap-4">
          <div className="hub-teletext text-right text-[clamp(14px,1.4vw,20px)] text-[#b8a070]/80">
            <p>{new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
            <p className="mt-1 opacity-70">VEILLE</p>
          </div>
        </div>

        <div className="relative z-10 flex flex-1 flex-col items-center justify-center text-center">
          {!menuReady && (
            <p className="hub-teletext hub-cursor min-h-[1.2em] text-[clamp(20px,2.5vw,32px)] text-[#d4c090]">
              {phase === "static" ? "RECHERCHE DU SIGNAL…" : typed}
            </p>
          )}

          {menuReady && (
            <h1 className="hub-teletext hub-title-glow text-[clamp(2.6rem,8vw,5.5rem)] leading-none font-normal tracking-[0.1em] text-[#e8d8a8] uppercase">
              La voix des dauphins
            </h1>
          )}
        </div>

        {menuReady && (
          <div className="relative z-10 hub-teletext space-y-2 text-[clamp(17px,1.9vw,24px)] text-[#d4c090]">
            <button
              type="button"
              onClick={onToggleSound}
              className="group flex w-full items-center gap-3 border-t border-[#c8b070]/15 pt-3 text-left transition hover:text-[#f0e4c0]"
            >
              <span className="text-[#9a8458]">{soundEnabled ? "►" : "▷"}</span>
              <span className="flex-1">AUDIO</span>
              <span className={soundEnabled ? "text-[#e8d8a8]" : soundWarn ? "text-[#e8c060]" : "text-[#9a8458]"}>
                {soundEnabled ? "ON" : "OFF"}
              </span>
            </button>

            {soundWarn && !soundEnabled && (
              <p className="text-[clamp(12px,1.2vw,16px)] text-[#e8c060]/90">
                Le signal comporte une piste audio. Activez-la pour une immersion complète.
              </p>
            )}

            <button
              type="button"
              onClick={onStart}
              className="group flex w-full items-center gap-3 border-t border-[#c8b070]/15 pt-3 text-left transition hover:text-[#f0e4c0]"
            >
              <span className="text-[#9a8458]">►</span>
              <span className="flex-1">FRANCHIR L&apos;ÉCRAN</span>
              <span className="text-[#9a8458]/60 transition group-hover:text-[#e8d8a8]">↵</span>
            </button>

            <button
              type="button"
              onClick={onCredits}
              className="flex w-full items-center gap-3 border-t border-[#c8b070]/15 pt-3 text-left text-[#9a8458] transition hover:text-[#e8d8a8]"
            >
              <span>►</span>
              <span className="flex-1">CRÉDITS</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function TvShell(props) {
  return (
    <div className="hub-tv-shell pointer-events-auto flex h-full min-h-0 w-full flex-col">
      <div
        className="hub-tv-cabinet relative flex min-h-0 flex-1 flex-col p-[var(--bezel-wood)]"
        style={{ paddingBottom: "calc(var(--bezel-wood) * 0.7)" }}
      >
        <div className="hub-tv-rim relative flex min-h-0 flex-1 rounded-[clamp(6px,1vw,14px)] p-[var(--bezel-rim)]">
          <div className="hub-tv-tube relative min-h-0 w-full flex-1 overflow-hidden">
            <TvScreenContent {...props} />
          </div>
        </div>

        <div className="relative mt-[clamp(8px,1.2vw,14px)] flex shrink-0 items-center justify-between px-[clamp(8px,1.5vw,20px)]">
          <div className="flex items-center gap-[clamp(8px,1.2vw,14px)]">
            <div className="hub-tv-knob size-[clamp(14px,2vw,22px)] rounded-full" aria-hidden />
            <div className="hub-tv-knob size-[clamp(18px,2.6vw,28px)] rounded-full" aria-hidden />
            <div className="hub-tv-knob size-[clamp(14px,2vw,22px)] rounded-full" aria-hidden />
          </div>
          <div className="flex items-center gap-2 opacity-50" aria-hidden>
            <div className="h-[clamp(6px,0.8vw,10px)] w-[clamp(20px,3vw,36px)] rounded-sm bg-[#1a1410] shadow-inner" />
            <div className="size-[clamp(8px,1vw,12px)] rounded-full bg-[#3a2a18]" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WelcomeHub() {
  const { started, exiting, soundEnabled, setSoundEnabled, beginExit, start } = useHub();
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [phase, setPhase] = useState(/** @type {'static'|'boot'|'boot2'|'boot3'|'menu'} */ ("static"));
  const [soundWarn, setSoundWarn] = useState(false);
  const [soundSkipped, setSoundSkipped] = useState(false);
  const [powerFlash, setPowerFlash] = useState(false);
  const timersRef = useRef([]);

  useEffect(() => {
    const t = (fn, ms) => {
      const id = window.setTimeout(fn, ms);
      timersRef.current.push(id);
    };
    t(() => setPhase("boot"), 700);
    t(() => setPhase("boot2"), 2400);
    t(() => setPhase("boot3"), 4200);
    t(() => setPhase("menu"), 5800);
    return () => {
      timersRef.current.forEach(window.clearTimeout);
      timersRef.current = [];
    };
  }, []);

  const handleStart = useCallback(() => {
    if (phase !== "menu") return;
    if (!soundEnabled && !soundSkipped) {
      setSoundWarn(true);
      setSoundSkipped(true);
      return;
    }
    setPowerFlash(true);
    beginExit();
    window.setTimeout(() => start(), 950);
  }, [phase, soundEnabled, soundSkipped, beginExit, start]);

  useEffect(() => {
    if (soundEnabled) setSoundWarn(false);
  }, [soundEnabled]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (phase !== "menu" || started) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleStart();
      }
      if (event.key.toLowerCase() === "m") setSoundEnabled((v) => !v);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase, started, handleStart, setSoundEnabled]);

  if (started && !exiting) return null;

  return (
    <>
      <div
        className={`hub-root fixed inset-0 z-[30000] flex flex-col bg-[#080604] ${exiting ? "hub-root--exiting pointer-events-none" : ""}`}
        aria-hidden={exiting}
      >
        <div className="relative min-h-0 flex-1">
          <TvShell
            phase={phase}
            soundEnabled={soundEnabled}
            soundWarn={soundWarn}
            onToggleSound={() => setSoundEnabled((v) => !v)}
            onStart={handleStart}
            onCredits={() => setCreditsOpen(true)}
          />

          {powerFlash && (
            <div className="hub-power-flash pointer-events-none absolute inset-0 z-40 origin-center bg-[#f5eed8]/90 mix-blend-screen" aria-hidden />
          )}
        </div>
      </div>

      {creditsOpen && <CreditsTeletext onClose={() => setCreditsOpen(false)} />}
    </>
  );
}
