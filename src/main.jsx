import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { HoverUiProvider } from "./hover-ui-context.jsx";
import { LoadingProvider } from "./loading-context.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <LoadingProvider>
      <HoverUiProvider>
        <App />
      </HoverUiProvider>
    </LoadingProvider>
  </StrictMode>,
);
