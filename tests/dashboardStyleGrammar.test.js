import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { createOperationStatusQueue } from "../src/lib/operationStatusQueue.js";

const vite = await createServer({
  root: process.cwd(),
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});
const [
  { default: AppFrame },
  { resolveDashboardTheme },
  { default: OperationStatusProvider },
] = await Promise.all([
  vite.ssrLoadModule("/src/components/app-shell/AppFrame.jsx"),
  vite.ssrLoadModule("/src/theme/dashboardTheme.js"),
  vite.ssrLoadModule("/src/components/app-shell/OperationStatusProvider.jsx"),
]);
await vite.close();

const staticScheduler = {
  setTimeout: () => 1,
  clearTimeout: () => {},
};

function renderStyle(dashboardStyle, appearancePreference = "light") {
  const theme = resolveDashboardTheme({
    globalStyles: {
      dashboardStyle,
      dashboardColorProfile: "evidence-ledger/brighter-vellum",
      chartColorMode: "profile",
    },
    appearancePreference,
  });
  const queue = createOperationStatusQueue({ scheduler: staticScheduler });
  return renderToStaticMarkup(React.createElement(
    OperationStatusProvider,
    { queue },
    React.createElement(AppFrame, {
      mode: "view",
      density: "comfortable",
      theme,
      children: React.createElement("main", null, "Dashboard"),
    }),
  ));
}

test("approved dashboard styles expose distinct paint grammar without changing palette tokens", () => {
  const evidence = renderStyle("evidence-ledger");
  const humanist = renderStyle("humanist-standard");
  const signal = renderStyle("signal-instrument");

  assert.match(evidence, /--simex-style-heading-font:Georgia/);
  assert.match(evidence, /--simex-style-panel-radius:2px/);
  assert.match(evidence, /--simex-style-panel-shadow:none/);

  assert.match(humanist, /--simex-style-heading-font:Segoe UI Variable Display/);
  assert.match(humanist, /--simex-style-panel-radius:14px/);
  assert.match(humanist, /--simex-style-panel-shadow:0 8px 20px/);

  assert.match(signal, /--simex-style-data-font:Cascadia Mono/);
  assert.match(signal, /--simex-style-panel-radius:4px/);
  assert.match(signal, /--simex-style-transition-duration:95ms/);

  for (const html of [evidence, humanist, signal]) {
    assert.match(html, /--simex-surface-panel:#fffdf8/);
  }
});

test("style elevation resolves independently for dark appearance", () => {
  const humanist = renderStyle("humanist-standard", "dark");
  const signal = renderStyle("signal-instrument", "dark");

  assert.match(humanist, /--simex-style-panel-shadow:0 10px 24px/);
  assert.match(humanist, /--simex-style-shell-shadow:0 16px 38px rgb\(25 55 48 \/ 12%\)/);
  assert.match(signal, /--simex-style-panel-shadow:0 1px 2px rgb\(0 0 0 \/ 38%\)/);
});
