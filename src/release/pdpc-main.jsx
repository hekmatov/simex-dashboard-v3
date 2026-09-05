import React from "react";
import { createRoot } from "react-dom/client";

import App from "../App.jsx";
import OperationStatusProvider from "../components/app-shell/OperationStatusProvider.jsx";
import { registerServiceWorker } from "../serviceWorkerRegistration.js";
import { createPdpcReleaseProfile } from "./pdpcReleaseProfile.js";
import "../styles/fonts.css";
import "../styles/tokens.css";
import "../styles.css";
import "../styles/modes.css";
import "./pdpc-release.css";
import "../styles/presentation.css";
import "../styles/dashboard-style-grammar.css";
import "../styles/dashboard-dialogs.css";
import "../styles/chart-data-state.css";
import "../styles/static-content.css";
import "../styles/source-content.css";
import "../styles/source-viewer.css";
import "../styles/immersive-display.css";
import "../styles/operation-status.css";
import "../styles/right-side-drawer.css";
import "../styles/desktop-mode-gate.css";

if ("serviceWorker" in navigator && !import.meta.env.DEV) {
  window.addEventListener("load", () => {
    void registerServiceWorker({ serviceWorkerUrl: `${import.meta.env.BASE_URL}service-worker.js` });
  });
}

const variant = typeof __SIMEX_PDPC_VARIANT__ === "string"
  ? __SIMEX_PDPC_VARIANT__
  : "biomedical";
const releaseProfile = createPdpcReleaseProfile(variant);

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <OperationStatusProvider>
      <App releaseProfile={releaseProfile} />
    </OperationStatusProvider>
  </React.StrictMode>,
);
