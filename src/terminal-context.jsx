import { createContext, useContext, useRef, useState } from "react";

const TerminalContext = createContext(null);

export function TerminalProvider({ children }) {
  const [isTerminalActive, setIsTerminalActive] = useState(false);
  const [terminalEverUsed, setTerminalEverUsed] = useState(false);
  const [screenRect, setScreenRect] = useState(null);
  const [inspectedObject, setInspectedObject] = useState(null);
  const [isDraggingObject, setIsDraggingObject] = useState(false);
  const [bookInspected, setBookInspected] = useState(false);
  const [enveloppeInspected, setEnveloppeInspected] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [craneVisible, setCraneVisible] = useState(false);
  const screenMeshRef = useRef(null);
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
        bookInspected,
        setBookInspected,
        enveloppeInspected,
        setEnveloppeInspected,
        isEnding,
        setIsEnding,
        craneVisible,
        setCraneVisible,
        screenMeshRef,
      }}
    >
      {children}
    </TerminalContext.Provider>
  );
}

export const useTerminal = () => useContext(TerminalContext);
