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
const { default: CanonicalDashboardFrame } = await vite.ssrLoadModule(
  "/src/components/dashboard/CanonicalDashboardFrame.jsx",
);
await vite.close();

test("Build workspace controls render between dashboard identity and canvas content", () => {
  const html = renderToStaticMarkup(React.createElement(CanonicalDashboardFrame, {
    mode: "build",
    pageType: "analytical",
    pageId: "biomedical",
    dashboardHeader: React.createElement("span", null, "Dashboard identity"),
    workspaceControls: React.createElement("section", { "aria-label": "Build commands" }, "Commands"),
    pageContent: React.createElement("span", null, "Canvas content"),
  }));

  assert.match(
    html,
    /canonical-dashboard-header[\s\S]*canonical-dashboard-workspace-controls[\s\S]*canonical-dashboard-content/,
  );
  assert.match(html, /aria-label="Build commands"/);
});
