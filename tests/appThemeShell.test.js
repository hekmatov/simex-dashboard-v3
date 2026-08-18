import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const vite = await createServer({
  root: process.cwd(),
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});
const [{ default: AppFrame }, { resolveDashboardTheme }] = await Promise.all([
  vite.ssrLoadModule("/src/components/app-shell/AppFrame.jsx"),
  vite.ssrLoadModule("/src/theme/dashboardTheme.js"),
]);
await vite.close();

test("AppFrame exposes the resolved dashboard theme at the shell boundary", () => {
  const theme = resolveDashboardTheme({
    globalStyles: {
      dashboardStyle: "humanist-standard",
      dashboardColorProfile: "utility/prismatic-index",
      chartColorMode: "standard",
    },
    appearancePreference: "dark",
  });
  const html = renderToStaticMarkup(React.createElement(AppFrame, {
    mode: "view",
    density: "comfortable",
    theme,
    children: React.createElement("main", null, "Dashboard"),
  }));

  assert.match(html, /data-dashboard-style="humanist-standard"/);
  assert.match(html, /data-dashboard-color-profile="utility\/prismatic-index"/);
  assert.match(html, /data-chart-color-mode="standard"/);
  assert.match(html, /data-appearance-preference="dark"/);
  assert.match(html, /data-resolved-appearance="dark"/);
  assert.match(html, /--simex-surface-panel:#202029/);
  assert.match(html, /--simex-data-1:#86b3dd/);
});
