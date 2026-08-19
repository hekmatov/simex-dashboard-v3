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
const [{ default: DashboardCommandCrown }, { default: BuildWorkspace }] = await Promise.all([
  vite.ssrLoadModule("/src/components/app-shell/DashboardCommandCrown.jsx"),
  vite.ssrLoadModule("/src/components/build/BuildWorkspace.jsx"),
]);
await vite.close();

const page = {
  id: "biomedical",
  label: "Biomedical",
  title: "Biomedical situational awareness",
  description: "Regional preparedness evidence",
  sections: [],
};
const dashboard = {
  title: page.title,
  description: page.description,
  programLabel: "Pandemic & Disaster Preparedness Center",
  scenarioLabel: "HeV-A26 Day 2 Simulation",
  lastUpdated: "2026-07-27",
  globalStyles: { accessibility: { enabled: false } },
  dataSources: {},
  datasetProfiles: {},
  loadedData: {},
  pages: [page],
};

test("View projects Dashboard look before Compare charts in the shared crown", () => {
  const html = renderCrown("view", React.createElement(
    React.Fragment,
    null,
    React.createElement("button", { type: "button" }, "Dashboard look"),
    React.createElement("button", { type: "button" }, "Chrono view"),
    React.createElement("button", { type: "button" }, "Compare charts"),
  ));

  assert.match(
    html,
    /data-command-crown-pinned-actions="true"[\s\S]*>Dashboard look<\/button>[\s\S]*>Compare charts<\/button>/,
  );
});

test("Build projects exactly one Dashboard look and Add Page in the shared crown", () => {
  const crown = renderCrown("build", React.createElement(
    React.Fragment,
    null,
    React.createElement("button", { type: "button" }, "Add Page"),
    React.createElement("button", { type: "button" }, "Dashboard look"),
  ));
  const workspace = withBrowserGlobals(() => renderToStaticMarkup(React.createElement(BuildWorkspace, {
    dashboard,
    activePage: page,
    selection: null,
    dashboardDraft: {},
    pageDrafts: {},
    sectionDrafts: {},
    deviceLayout: "desktop",
    appearanceControls: null,
    onOpenDashboardLook: () => {},
  })));

  assert.equal((crown.match(/>Dashboard look<\/button>/g) ?? []).length, 1);
  assert.equal((crown.match(/>Add Page<\/button>/g) ?? []).length, 1);
  assert.match(crown, /data-command-crown-pinned-actions="true"/);
  assert.doesNotMatch(workspace, />Dashboard look<\/button>/);
});

function renderCrown(mode, pageActions) {
  return renderToStaticMarkup(React.createElement(DashboardCommandCrown, {
    mode,
    dashboardIdentity: Object.freeze({
      programLabel: dashboard.programLabel,
      scenarioLabel: dashboard.scenarioLabel,
      title: dashboard.title,
      lastUpdated: dashboard.lastUpdated,
    }),
    activePage: Object.freeze({ id: page.id, label: page.label }),
    pages: Object.freeze([Object.freeze({ id: page.id, label: page.label })]),
    pageActions,
    onModeRequest: () => {},
    onPageRequest: () => {},
    onScenarioRequest: () => {},
  }));
}

function withBrowserGlobals(run) {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      navigator: { standalone: false },
      matchMedia: () => ({
        matches: false,
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
    },
  });
  try {
    return run();
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
    else delete globalThis.window;
  }
}
