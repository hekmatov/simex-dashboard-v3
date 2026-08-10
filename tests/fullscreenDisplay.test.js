import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const vite = await createServer({
  root: process.cwd(),
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});
const displayModule = await vite
  .ssrLoadModule("/src/components/FullscreenDisplay.jsx")
  .catch(() => null);
const viewModule = await vite
  .ssrLoadModule("/src/components/view/ViewShell.jsx")
  .catch(() => null);
const playbackModule = await vite
  .ssrLoadModule("/src/components/playback/PlaybackProvider.jsx")
  .catch(() => null);
const gridModule = await vite
  .ssrLoadModule("/src/components/display/DisplayedChartGrid.jsx")
  .catch(() => null);
await vite.close();

const dashboard = {
  dataSources: {
    status: { kind: "inline", rows: [{ entity: "A", value: 1 }, { entity: "B", value: 2 }] },
  },
  datasetProfiles: {
    status: {
      columns: [
        { name: "entity", type: "category" },
        { name: "value", type: "numeric" },
      ],
    },
  },
  loadedData: {
    status: [{ entity: "A", value: 1 }, { entity: "B", value: 2 }],
  },
  pages: [
    {
      id: "page",
      sections: [
        {
          id: "section",
          panels: [
            {
              configVersion: 3,
              id: "chart-a",
              typeId: "kpi",
              title: "Chart A",
              description: "Chart A status.",
              sourceId: "status",
              roles: { value: { field: "value" }, entity: { field: "entity" } },
              transformations: { filters: [], grouping: null, aggregation: null, duplicates: null, missingValues: "gap" },
              presentation: { title: { align: "left" }, collection: null },
              interaction: { zoom: { enabled: false }, timeSync: null },
              layout: { size: "standard" },
            },
            {
              configVersion: 3,
              id: "chart-b",
              typeId: "kpi",
              title: "Chart B",
              description: "Chart B status.",
              sourceId: "status",
              roles: { value: { field: "value" }, entity: { field: "entity" } },
              transformations: { filters: [], grouping: null, aggregation: null, duplicates: null, missingValues: "gap" },
              presentation: { title: { align: "left" }, collection: null },
              interaction: { zoom: { enabled: false }, timeSync: null },
              layout: { size: "standard" },
            },
          ],
        },
      ],
    },
  ],
};

test("fullscreen display component is available", () => {
  assert.equal(
    typeof displayModule?.default,
    "function",
    "FullscreenDisplay must be implemented",
  );
});

test("fullscreen display preserves ordered charts in a labeled focus-scoped dialog", () => {
  assert.ok(displayModule, "fullscreen display must be implemented");
  const html = renderToStaticMarkup(
    React.createElement(displayModule.default, {
      dashboard,
      displayState: {
        display_revision: 1,
        displayed_chart_ids: ["chart-b", "chart-a"],
        layout: "sideBySide",
      },
      globalPanelColors: {},
      onDisplayAction: () => {},
    }),
  );

  assert.equal((html.match(/multi-fullscreen-cell/g) ?? []).length, 2);
  assert.equal((html.match(/chart-view-frame/g) ?? []).length, 2);
  assert.equal((html.match(/chart-card-view/g) ?? []).length, 2);
  assert.ok(html.indexOf('data-displayed-chart-id="chart-b"') < html.indexOf('data-displayed-chart-id="chart-a"'));
  assert.match(html, /aria-label="Close chart-b"/);
  assert.match(html, /aria-label="Close chart-a"/);
  assert.match(html, /aria-label="Displayed charts"/);
  assert.match(html, /tabindex="-1"/);
  assert.match(html, />Close all<\/button>/);
  assert.match(html, /layout-sideBySide/);
});

test("the shared displayed-chart grid is available to the fullscreen surface", () => {
  assert.equal(
    typeof gridModule?.default,
    "function",
    "DisplayedChartGrid must be implemented",
  );
});

test("View provides a visible Compare charts entry to the existing multi-select flow", () => {
  assert.equal(typeof viewModule?.default, "function", "ViewShell must be implemented");
  assert.equal(typeof playbackModule?.PlaybackProvider, "function", "PlaybackProvider must be implemented");
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
  let html;
  try {
    html = renderToStaticMarkup(
      React.createElement(
        playbackModule.PlaybackProvider,
        { groups: [], charts: [], loadedData: dashboard.loadedData, profiles: dashboard.datasetProfiles },
        React.createElement(viewModule.default, {
          activePage: dashboard.pages[0],
          dashboard,
          displayState: { displayed_chart_ids: [], layout: "solo" },
          companionStatusLabel: "Companion unavailable",
          iconLanguageStyles: {},
          geoDataSources: {},
          multiSelectMode: false,
          multiPanelIds: [],
          onActivePageChange: () => {},
          onCompareCharts: () => {},
          onDisplayAction: () => {},
          onToggleMultiPanel: () => {},
          onStartMultiFullscreenSelection: () => {},
          onOpenMultiFullscreen: () => {},
          onCancelMultiSelection: () => {},
        }),
      ),
    );
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
    else delete globalThis.window;
    if (previousNavigator) Object.defineProperty(globalThis, "navigator", previousNavigator);
    else delete globalThis.navigator;
  }

  assert.match(html, />Compare charts<\/button>/);
});

test("fullscreen display renders nothing for an empty visible set", () => {
  assert.ok(displayModule, "fullscreen display must be implemented");
  const html = renderToStaticMarkup(
    React.createElement(displayModule.default, {
      dashboard,
      displayState: {
        display_revision: 0,
        displayed_chart_ids: [],
        layout: "solo",
      },
      globalPanelColors: {},
      onDisplayAction: () => {},
    }),
  );

  assert.equal(html, "");
});
