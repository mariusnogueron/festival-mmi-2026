import { createContext, useContext, useState } from "react";

const TerminalContext = createContext(null);

export function TerminalProvider({ children }) {
  const [isTerminalActive, setIsTerminalActive] = useState(false);
  const [screenRect, setScreenRect] = useState(null);
  return (
    <TerminalContext.Provider
      value={{
        isTerminalActive,
        setIsTerminalActive,
        screenRect,
        setScreenRect,
      }}
    >
      {children}
    </TerminalContext.Provider>
  );
}

export const useTerminal = () => useContext(TerminalContext);
