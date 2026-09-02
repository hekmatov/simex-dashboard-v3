import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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
  assert.match(html, /--dashboard-mode-context-block-size:var\(--simex-command-crown-row\)/);
  assert.match(html, /data-mode-context-size="shared"/);
});

test("an empty mode context is omitted until a real projection needs it", async () => {
  const props = {
    dashboardIdentity: Object.freeze({ title: "Biomedical situational awareness" }),
    activePage: Object.freeze({ id: "biomedical", label: "Biomedical" }),
    pages: Object.freeze([Object.freeze({ id: "biomedical", label: "Biomedical" })]),
    onModeRequest: () => {},
    onPageRequest: () => {},
    onScenarioRequest: () => {},
  };
  const view = renderToStaticMarkup(React.createElement(DashboardCommandCrown, {
    ...props,
    mode: "view",
  }));
  const build = renderToStaticMarkup(React.createElement(DashboardCommandCrown, {
    ...props,
    mode: "build",
  }));
  const crownStyles = await readFile(
    new URL("../src/styles/modes.css", import.meta.url),
    "utf8",
  );
  const modeRowRule = crownStyles.match(/\.command-crown-mode-row\s*\{([^}]*)\}/)?.[1] ?? "";
  const locationRowRule = crownStyles.match(/\.dashboard-identity-row\s*\{([^}]*)\}/)?.[1] ?? "";
  const identitySummaryRule = crownStyles.match(/^\.dashboard-identity-summary\s*\{([^}]*)\}/m)?.[1] ?? "";
  const scenarioRule = [...crownStyles.matchAll(/\.dashboard-scenario-trigger\s*\{([^}]*)\}/g)].at(-1)?.[1] ?? "";
  const pageButtonRule = crownStyles.match(/\.dashboard-command-page-scroller button\s*\{([^}]*)\}/)?.[1] ?? "";

  assert.doesNotMatch(view, /data-command-crown-layer="context"/);
  assert.doesNotMatch(build, /data-command-crown-layer="context"/);
  assert.match(view, /--dashboard-mode-context-block-size:var\(--simex-command-crown-row\)/);
  assert.match(build, /--dashboard-mode-context-block-size:var\(--simex-command-crown-row\)/);
  assert.match(modeRowRule, /block-size:\s*var\(--simex-command-crown-row\);/);
  assert.match(modeRowRule, /box-sizing:\s*border-box;/);
  assert.match(locationRowRule, /block-size:\s*var\(--simex-command-crown-row\);/);
  assert.match(locationRowRule, /box-sizing:\s*border-box;/);
  assert.match(identitySummaryRule, /align-items:\s*center;/);
  assert.match(identitySummaryRule, /display:\s*flex;/);
  assert.match(scenarioRule, /min-height:\s*var\(--simex-control-standard\);/);
  assert.match(pageButtonRule, /min-height:\s*var\(--simex-control-standard\);/);
  assert.match(pageButtonRule, /min-width:\s*var\(--simex-control-standard\);/);
});
