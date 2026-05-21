import { createContext, useContext, useState } from "react";

const TerminalContext = createContext(null);

export function TerminalProvider({ children }) {
  const [isTerminalActive, setIsTerminalActive] = useState(false);
  const [terminalEverUsed, setTerminalEverUsed] = useState(false);
  const [screenRect, setScreenRect] = useState(null);
  const [inspectedObject, setInspectedObject] = useState(null);
  const [isDraggingObject, setIsDraggingObject] = useState(false);
  return (
    <TerminalContext.Provider
      value={{
        isTerminalActive,
        setIsTerminalActive,
        terminalEverUsed,
        setTerminalEverUsed,
        screenRect,
        setScreenRect,
        inspectedObject,
        setInspectedObject,
        isDraggingObject,
        setIsDraggingObject,
      }}
    >
      {children}
    </TerminalContext.Provider>
  );
}

export const useTerminal = () => useContext(TerminalContext);
