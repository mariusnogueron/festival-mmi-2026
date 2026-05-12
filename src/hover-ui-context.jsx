/* eslint-disable react-refresh/only-export-components -- context + hook + overlay */
/**
 * Indication visuelle au survol du minitel (hors <Canvas> pour R3F).
 * Icône blanche : lisible sur la scène sombre ; le noir du PNG disparaît visuellement avec mix-blend-mode screen.
 */
import { createContext, useContext, useMemo, useState } from "react";

const HOVER_ICON_SRC = "/icon_souris_click_blanc.png";

const HoverUiContext = createContext(null);

export function HoverUiProvider({ children }) {
  const [hoverHint, setHoverHint] = useState(null);
  const value = useMemo(
    () => ({ hoverHint, setHoverHint }),
    [hoverHint],
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
