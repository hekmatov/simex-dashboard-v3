import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
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
  { default: ViewShell },
  { PlaybackProvider },
  { default: OperationStatusProvider },
] = await Promise.all([
  vite.ssrLoadModule("/src/components/app-shell/AppFrame.jsx"),
  vite.ssrLoadModule("/src/components/view/ViewShell.jsx"),
  vite.ssrLoadModule("/src/components/playback/PlaybackProvider.jsx"),
  vite.ssrLoadModule("/src/components/app-shell/OperationStatusProvider.jsx"),
]);
await vite.close();

const dashboard = {
  title: "Biomedical situational awareness",
  description: "Regional preparedness evidence",
  programLabel: "Pandemic & Disaster Preparedness Center",
  scenarioLabel: "HeV-A26 Day 2 Simulation",
  lastUpdated: "2026-07-27",
  globalStyles: { accessibility: { enabled: false } },
  dataSources: {},
  datasetProfiles: {},
  loadedData: {},
  pages: [{
    id: "biomedical",
    label: "Biomedical",
    title: "Biomedical situational awareness",
    description: "Regional preparedness evidence",
    sections: [],
  }],
};

test("AppFrame crown owns page location without a duplicate View-local row", () => {
  const html = withBrowserGlobals(() => renderAppFrame({
      mode: "view",
      dashboardIdentity: dashboard,
      activePage: dashboard.pages[0],
      pages: dashboard.pages,
      onModeRequest: () => {},
      onPageRequest: () => {},
      pageActions: React.createElement("button", { type: "button" }, "Compare charts"),
      children: React.createElement(
        PlaybackProvider,
        { groups: [], charts: [], loadedData: {}, profiles: {} },
        React.createElement(ViewShell, {
          activePage: dashboard.pages[0],
          dashboard,
          displayState: { displayed_chart_ids: [], layout: "solo" },
          companionStatusLabel: "Companion unavailable",
          iconLanguageStyles: {},
          geoDataSources: {},
          onActivePageChange: () => {},
          onCompareCharts: () => {},
          onDisplayAction: () => {},
        }),
      ),
    }));

  assert.equal((html.match(/data-command-crown-layer="location"/g) ?? []).length, 1);
  assert.doesNotMatch(html, /class="dashboard-location-row"/);
  assert.equal((html.match(/>Compare charts<\/button>/g) ?? []).length, 1);
});

test("desktop workspaces expose a compact width recommendation without an action", () => {
  const build = renderAppFrame({
    mode: "build",
    density: "compact",
    onModeRequest: () => {},
    dashboardIdentity: { title: "Biomedical situational awareness", scenarioLabel: "HeV-A26 Day 2 Simulation" },
    activePage: { id: "biomedical", label: "Biomedical" },
    pages: [{ id: "biomedical", label: "Biomedical" }],
    onPageRequest: () => {},
    children: React.createElement("div", null, "Build workspace"),
  });
  const view = renderAppFrame({
    mode: "view",
    density: "comfortable",
    onModeRequest: () => {},
    children: React.createElement("div", null, "View workspace"),
  });

  assert.match(build, /class="desktop-width-notice"/);
  assert.match(build, /A minimum width of 1024px is recommended for Build\./);
  assert.doesNotMatch(build, />Switch to View<\/button>/);
  assert.match(build, /data-command-crown-layer="mode"[\s\S]*data-command-crown-layer="location"/);
  assert.doesNotMatch(build, /data-command-crown-layer="context"/);
  assert.doesNotMatch(view, /class="desktop-width-notice"/);
});

test("desktop workspace recommendations preserve mounted Build and Present workspaces", () => {
  for (const [mode, label] of [["build", "Build"], ["present", "Present"]]) {
    const html = renderAppFrame({
      mode,
      density: "compact",
      onModeRequest: () => {},
      dashboardIdentity: { title: "Biomedical situational awareness", scenarioLabel: "HeV-A26 Day 2 Simulation" },
      activePage: { id: "biomedical", label: "Biomedical" },
      pages: [{ id: "biomedical", label: "Biomedical" }],
      onPageRequest: () => {},
      children: React.createElement("main", { className: `${mode}-workspace` }, `${label} workspace`),
    });
    const notice = html.match(new RegExp(`<p[^>]*data-desktop-width-notice="${mode}"[\\s\\S]*?<\\/p>`))?.[0];

    assert.ok(notice, `${label} renders its desktop width recommendation`);
    assert.match(notice, new RegExp(`A minimum width of 1024px is recommended for ${label}\\.`));
    assert.doesNotMatch(notice, /<button\b/);
    assert.match(
      html,
      new RegExp(`data-desktop-width-notice="${mode}"[\\s\\S]*data-command-crown-layer="mode"[\\s\\S]*class="${mode}-workspace"`),
    );
  }

  const view = renderAppFrame({
    mode: "view",
    onModeRequest: () => {},
    children: React.createElement("div", null, "View workspace"),
  });
  assert.doesNotMatch(view, /data-desktop-width-notice=/);
});

test("the below-1024 recommendation never hides the workspace", async () => {
  const css = await readFile(new URL("../src/styles/desktop-mode-gate.css", import.meta.url), "utf8");

  assert.match(css, /@media \(max-width:\s*1023px\)[\s\S]*?\.desktop-width-notice\s*\{[\s\S]*?display:\s*block/);
  assert.doesNotMatch(css, />\s*:not\([^)]*desktop-width-notice/);
  assert.doesNotMatch(css, /display:\s*none\s*!important/);
});

test("ordinary View preserves an empty Section and routes its exact recovery action to Build", () => {
  const emptyDashboard = {
    ...dashboard,
    pages: [{
      ...dashboard.pages[0],
      sections: [{
        id: "empty-evidence",
        title: "Evidence awaiting panels",
        description: "This Section is valid but empty.",
        panels: [],
      }],
    }],
  };
  const html = withBrowserGlobals(() => renderToStaticMarkup(
    React.createElement(
      PlaybackProvider,
      { groups: [], charts: [], loadedData: {}, profiles: {} },
      React.createElement(ViewShell, {
        activePage: emptyDashboard.pages[0],
        dashboard: emptyDashboard,
        displayState: { displayed_chart_ids: [], layout: "solo" },
        companionStatusLabel: "Companion unavailable",
        iconLanguageStyles: {},
        geoDataSources: {},
        onActivePageChange: () => {},
        onAddPanelToSection: () => {},
        onDisplayAction: () => {},
      }),
    ),
  ));

  assert.match(html, />Evidence awaiting panels</);
  assert.match(html, /This section has no panels\./);
  assert.match(html, />Add Panel to Section<\/button>/);
});

function renderAppFrame(props) {
  const queue = createOperationStatusQueue({ scheduler: staticScheduler });
  return renderToStaticMarkup(React.createElement(
    OperationStatusProvider,
    { queue },
    React.createElement(AppFrame, props),
  ));
}

const staticScheduler = {
  setTimeout: () => 1,
  clearTimeout: () => {},
};

function withBrowserGlobals(run) {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const previousNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { matchMedia: () => ({ matches: false }), navigator: { standalone: false } },
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { userAgent: "" },
  });
  try {
    return run();
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
    else delete globalThis.window;
    if (previousNavigator) Object.defineProperty(globalThis, "navigator", previousNavigator);
    else delete globalThis.navigator;
  }
}
