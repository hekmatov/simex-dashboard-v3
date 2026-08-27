import React from "react";
import { createRoot } from "react-dom/client";

import App from "./App.jsx";
import { registerServiceWorker } from "./serviceWorkerRegistration.js";
import "./styles/tokens.css";
import "./styles.css";
import "./styles/modes.css";
import "./styles/presentation.css";
import "./styles/dashboard-style-grammar.css";
import "./styles/chart-data-state.css";
import "./styles/static-content.css";
import "./styles/source-content.css";
import "./styles/source-viewer.css";
import "./styles/immersive-display.css";

if ("serviceWorker" in navigator && !import.meta.env.DEV) {
  window.addEventListener("load", () => {
    void registerServiceWorker({ serviceWorkerUrl: `${import.meta.env.BASE_URL}service-worker.js` });
  });
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
