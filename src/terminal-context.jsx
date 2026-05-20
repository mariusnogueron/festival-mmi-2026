import { createContext, useContext, useMemo, useState } from "react";

const TerminalContext = createContext(null);

export function TerminalProvider({ children }) {
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const value = useMemo(
    () => ({ isTerminalOpen, setIsTerminalOpen }),
    [isTerminalOpen],
  );
  return (
    <TerminalContext.Provider value={value}>{children}</TerminalContext.Provider>
  );
}

export function useTerminal() {
  const ctx = useContext(TerminalContext);
  if (!ctx)
    throw new Error("useTerminal doit être utilisé dans TerminalProvider");
  return ctx;
}
