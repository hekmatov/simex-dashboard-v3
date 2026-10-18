import React from "react";
import { createRoot } from "react-dom/client";

import ApplicationErrorBoundary from "../../src/components/app-shell/ApplicationErrorBoundary.jsx";
import { lazySurface } from "../../src/components/app-shell/lazySurface.jsx";
import "../../src/styles/tokens.css";
import "../../src/styles/modes.css";

const MissingChunk = React.lazy(() => Promise.reject(
  new Error("Failed to fetch dynamically imported module: /missing-chunk.js"),
));
const PassiveMissingChunk = lazySurface(() => Promise.reject(
  new Error("Failed to fetch dynamically imported module: /missing-audience-chunk.js"),
), "Audience display", { passive: true });

function Screen() {
  const [surface, setSurface] = React.useState("ready");
  if (surface === "render" && window.__applicationHarnessFail) {
    throw new Error("Deliberate render failure");
  }
  return <main>
    <button type="button" onClick={() => {
      window.__applicationHarnessFail = true;
      setSurface("render");
    }}>Break render</button>
    <button type="button" onClick={() => setSurface("chunk")}>Break chunk</button>
    <button type="button" onClick={() => setSurface("audience-chunk")}>Break audience chunk</button>
    {surface === "chunk" ? <React.Suspense fallback={<p>Loading chunk</p>}><MissingChunk /></React.Suspense> : <p>Dashboard ready</p>}
    {surface === "audience-chunk" && <PassiveMissingChunk />}
  </main>;
}

createRoot(document.getElementById("root")).render(
  <ApplicationErrorBoundary><Screen /></ApplicationErrorBoundary>,
);
