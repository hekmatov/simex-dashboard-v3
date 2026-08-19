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
const { default: DashboardCommandCrown } = await vite.ssrLoadModule(
  "/src/components/app-shell/DashboardCommandCrown.jsx",
);
await vite.close();

test("the command crown orders mode, dashboard/Page, and one equal-sized mode context layer", () => {
  const html = renderToStaticMarkup(React.createElement(DashboardCommandCrown, {
    mode: "view",
    dashboardIdentity: Object.freeze({
      programLabel: "Pandemic & Disaster Preparedness Center",
      scenarioLabel: "HeV-A26 Day 2 Simulation",
      title: "Biomedical situational awareness",
      lastUpdated: "2026-07-27",
    }),
    activePage: Object.freeze({ id: "biomedical", label: "Biomedical" }),
    pages: Object.freeze([
      Object.freeze({ id: "biomedical", label: "Biomedical" }),
      Object.freeze({ id: "operations", label: "Operations" }),
    ]),
    contextNode: React.createElement("span", null, "View context"),
    statusNode: React.createElement("span", null, "Current"),
    onModeRequest: () => {},
    onPageRequest: () => {},
    onScenarioRequest: () => {},
  }));

  assert.match(
    html,
    /data-command-crown-layer="mode"[\s\S]*data-command-crown-layer="location"[\s\S]*data-command-crown-layer="context"/,
  );
  assert.equal((html.match(/data-command-crown-layer=/g) ?? []).length, 3);
  assert.match(html, /--dashboard-mode-context-block-size:52px/);
  assert.match(html, /data-mode-context-size="shared"/);
});
