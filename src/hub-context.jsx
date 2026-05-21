import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { setSoundEnabled as syncSoundEnabled } from "./audio.js";

const HubContext = createContext(null);

export function HubProvider({ children }) {
  const [started, setStarted] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [soundEnabled, setSoundEnabledState] = useState(false);

  const setSoundEnabled = useCallback((updater) => {
    setSoundEnabledState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      syncSoundEnabled(next);
      return next;
    });
  }, []);

  const beginExit = useCallback(() => {
    setExiting(true);
  }, []);

  const start = useCallback(() => {
    setStarted(true);
    setExiting(false);
  }, []);

  const value = useMemo(
    () => ({
      started,
      exiting,
      soundEnabled,
      setSoundEnabled,
      beginExit,
      start,
    }),
    [started, exiting, soundEnabled, setSoundEnabled, beginExit, start],
  );

  return <HubContext.Provider value={value}>{children}</HubContext.Provider>;
}

export function useHub() {
  const ctx = useContext(HubContext);
  if (!ctx) {
    throw new Error("useHub doit être utilisé dans HubProvider");
  }
  return ctx;
}
