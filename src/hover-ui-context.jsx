import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const HOVER_ICON_SRC = "/icon_souris_click_blanc.png";
const MESSAGE_DURATION_MS = 5500;

const HoverUiContext = createContext(null);

export function HoverUiProvider({ children }) {
  const [hoverHint, setHoverHint] = useState(null);
  const [sceneMessage, setSceneMessageState] = useState(null);
  const messageTimerRef = useRef(null);

  const setSceneMessage = useCallback((text) => {
    if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    setSceneMessageState(text ? { text } : null);
    if (!text) return;
    messageTimerRef.current = setTimeout(() => {
      setSceneMessageState(null);
      messageTimerRef.current = null;
    }, MESSAGE_DURATION_MS);
  }, []);

  useEffect(
    () => () => {
      if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    },
    [],
  );

  const value = useMemo(
    () => ({ hoverHint, setHoverHint, sceneMessage, setSceneMessage }),
    [hoverHint, sceneMessage, setSceneMessage],
  );

  return (
    <HoverUiContext.Provider value={value}>{children}</HoverUiContext.Provider>
  );
}

export function useHoverUi() {
  const ctx = useContext(HoverUiContext);
  if (!ctx) {
    throw new Error("useHoverUi doit être utilisé dans HoverUiProvider");
  }
  return ctx;
}

export function HoverTooltipOverlay() {
  const { hoverHint } = useHoverUi();
  if (!hoverHint) return null;
  return (
    <div
      role="status"
      aria-label="Élément interactif : cliquer"
      className="pointer-events-none fixed z-10000 select-none"
      style={{ left: hoverHint.x + 12, top: hoverHint.y + 12 }}
    >
      <img
        src={HOVER_ICON_SRC}
        alt=""
        width={22}
        height={22}
        draggable={false}
        className="drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
        style={{ mixBlendMode: "screen" }}
      />
    </div>
  );
}

export function SceneMessageOverlay() {
  const { sceneMessage } = useHoverUi();
  if (!sceneMessage) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-10 z-10000 flex justify-center px-6"
    >
      <div className="max-w-md rounded-sm border border-[#c8ffb0]/25 bg-[#020802]/88 px-5 py-3 text-center font-mono text-sm leading-relaxed text-[#c8ffb0] shadow-[0_0_24px_rgba(150,255,120,0.12)] backdrop-blur-sm">
        {sceneMessage.text.split("\n").map((line, index) => (
          <p key={index} className={index > 0 ? "mt-2 text-[#7dcc7d]" : undefined}>
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}
