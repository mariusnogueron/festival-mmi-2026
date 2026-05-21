import { useTerminal } from "../terminal-context.jsx";

export default function InspectHint() {
  const { inspectedObject, isDraggingObject } = useTerminal();

  if (!inspectedObject) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "18%",
        left: "50%",
        transform: "translateX(-50%)",
        pointerEvents: "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
        transition: "opacity 0.4s ease",
        opacity: isDraggingObject ? 0 : 1,
      }}
    >
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <path
          d="M8 20 A12 12 0 1 1 20 32"
          stroke="#c8b89a"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <polyline
          points="6,16 8,20 12,18"
          stroke="#c8b89a"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span
        style={{
          color: "#c8b89a",
          fontFamily: "monospace",
          fontSize: "12px",
          letterSpacing: "0.05em",
          backgroundColor: "rgba(10,8,5,0.75)",
          padding: "6px 14px",
          borderRadius: "2px",
          border: "1px solid rgba(200,184,154,0.2)",
          whiteSpace: "nowrap",
        }}
      >
        Maintenir · glisser pour tourner
      </span>
    </div>
  );
}
