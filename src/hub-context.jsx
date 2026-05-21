import { createContext, useCallback, useContext, useMemo, useState } from "react";

const HubContext = createContext(null);

export function HubProvider({ children }) {
  const [started, setStarted] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);

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
    [started, exiting, soundEnabled, beginExit, start],
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
