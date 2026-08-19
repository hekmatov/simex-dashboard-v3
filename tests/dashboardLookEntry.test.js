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
const [{ default: ViewShell }, { default: BuildWorkspace }, { PlaybackProvider }] = await Promise.all([
  vite.ssrLoadModule("/src/components/view/ViewShell.jsx"),
  vite.ssrLoadModule("/src/components/build/BuildWorkspace.jsx"),
  vite.ssrLoadModule("/src/components/playback/PlaybackProvider.jsx"),
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

test("View places Dashboard look before the rightmost Compare charts action", () => {
  const html = withBrowserGlobals(() => renderToStaticMarkup(
    React.createElement(
      PlaybackProvider,
      { groups: [], charts: [], loadedData: {}, profiles: {} },
      React.createElement(ViewShell, {
        activePage: page,
        dashboard,
        displayState: { displayed_chart_ids: [], layout: "solo" },
        companionStatusLabel: "Companion unavailable",
        iconLanguageStyles: {},
        geoDataSources: {},
        onActivePageChange: () => {},
        onCompareCharts: () => {},
        onDisplayAction: () => {},
        onOpenDashboardLook: () => {},
      }),
    ),
  ));

  assert.match(
    html,
    /aria-label="View page actions"[\s\S]*>Dashboard look<\/button>[\s\S]*>Compare charts<\/button>/,
  );
});

test("Build keeps Dashboard look beside the page tabs", () => {
  const html = withBrowserGlobals(() => renderToStaticMarkup(React.createElement(BuildWorkspace, {
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

  assert.match(
    html,
    /class="build-page-tabs build-page-navigation"[\s\S]*>Biomedical<\/button>[\s\S]*>Add page<\/span>[\s\S]*>Dashboard look<\/button>[\s\S]*<\/nav>/,
  );
});

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
