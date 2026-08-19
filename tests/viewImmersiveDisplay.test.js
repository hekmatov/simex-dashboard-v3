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
const displayModule = await vite.ssrLoadModule(
  "/src/components/FullscreenDisplay.jsx",
);
const viewModule = await vite.ssrLoadModule(
  "/src/components/view/ViewShell.jsx",
);
const playbackModule = await vite.ssrLoadModule(
  "/src/components/playback/PlaybackProvider.jsx",
);
await vite.close();

const dashboard = {
  programLabel: "Pandemic & Disaster Preparedness Center",
  scenarioLabel: "HeV-A26 Day 2 Simulation",
  lastUpdated: "2026-07-27",
  dataSources: {
    status: {
      kind: "inline",
      rows: [{ entity: "A", value: 1 }, { entity: "B", value: 2 }],
    },
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
  pages: [{
    id: "page",
    label: "Biomedical",
    title: "Biomedical",
    sections: [{
      id: "section",
      title: "Status",
      panels: [chart("chart-a", "Chart A"), chart("chart-b", "Chart B")],
    }],
  }],
};

test("one displayed chart is an immersive chart-only Focus surface", () => {
  const html = renderToStaticMarkup(React.createElement(
    displayModule.default,
    {
      dashboard,
      displayState: {
        display_revision: 1,
        displayed_chart_ids: ["chart-a"],
        layout: "solo",
      },
      onDisplayAction: () => {},
    },
  ));

  assert.match(html, /role="dialog"[^>]*aria-label="Focused chart"/);
  assert.match(html, /data-display-mode="focus"/);
  assert.match(html, />Exit focus<\/button>/);
  assert.equal((html.match(/multi-fullscreen-cell/g) ?? []).length, 1);
  assert.doesNotMatch(html, /fullscreen-layout-button/);
  assert.doesNotMatch(html, /multi-cell-controls/);
  assert.doesNotMatch(html, /chart-panel-action-rail/);
});

test("two displayed charts are a chart-only Comparison with minimal top controls", () => {
  const html = renderToStaticMarkup(React.createElement(
    displayModule.default,
    {
      dashboard,
      displayState: {
        display_revision: 1,
        displayed_chart_ids: ["chart-b", "chart-a"],
        layout: "sideBySide",
      },
      onDisplayAction: () => {},
    },
  ));

  assert.match(html, /role="dialog"[^>]*aria-label="Chart comparison"/);
  assert.match(html, /data-display-mode="comparison"/);
  assert.match(html, />Exit comparison<\/button>/);
  assert.match(html, /aria-label="Comparison layout and exit"/);
  assert.match(html, /draggable="true"/);
  assert.match(html, /aria-keyshortcuts="Alt\+ArrowLeft Alt\+ArrowRight Alt\+ArrowUp Alt\+ArrowDown"/);
  assert.ok(
    html.indexOf('data-displayed-chart-id="chart-b"')
      < html.indexOf('data-displayed-chart-id="chart-a"'),
  );
  assert.doesNotMatch(html, /chart-panel-action-rail/);
  assert.doesNotMatch(html, /Close chart-/);
});

test("pointer and keyboard reordering share one exact permutation helper", () => {
  assert.deepEqual(
    displayModule.reorderDisplayedCharts(["a", "b", "c"], 0, 2),
    ["b", "c", "a"],
  );
  assert.deepEqual(
    displayModule.reorderDisplayedCharts(["a", "b", "c"], 2, 0),
    ["c", "a", "b"],
  );
  const unchanged = ["a", "b"];
  assert.equal(displayModule.reorderDisplayedCharts(unchanged, 1, 1), unchanged);
});

test("comparison selection uses the compact bottom-center count, Compare, and Cancel dock", () => {
  const html = renderView({ multiSelectMode: true, multiPanelIds: ["chart-a"] });

  assert.match(html, /aria-label="Chart comparison selection"/);
  assert.match(html, />Compare<\/button>/);
  assert.match(html, />Cancel<\/button>/);
  assert.match(html, /1[^<]*of 4 selected/);
  assert.doesNotMatch(html, /Enter multi-fullscreen/);
});

function renderView({ multiSelectMode, multiPanelIds }) {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const previousNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      matchMedia: () => ({ matches: false }),
      navigator: { standalone: false },
    },
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { userAgent: "" },
  });
  try {
    return renderToStaticMarkup(React.createElement(
      playbackModule.PlaybackProvider,
      {
        groups: [],
        charts: [],
        loadedData: dashboard.loadedData,
        profiles: dashboard.datasetProfiles,
      },
      React.createElement(viewModule.default, {
        activePage: dashboard.pages[0],
        dashboard,
        displayState: { displayed_chart_ids: [], layout: "solo" },
        companionStatusLabel: "Companion unavailable",
        iconLanguageStyles: {},
        geoDataSources: {},
        multiSelectMode,
        multiPanelIds,
        onActivePageChange: () => {},
        onCompareCharts: () => {},
        onOpenDashboardLook: () => {},
        onDisplayAction: () => {},
        onToggleMultiPanel: () => {},
        onStartMultiFullscreenSelection: () => {},
        onOpenMultiFullscreen: () => {},
        onCancelMultiSelection: () => {},
      }),
    ));
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
    else delete globalThis.window;
    if (previousNavigator) Object.defineProperty(globalThis, "navigator", previousNavigator);
    else delete globalThis.navigator;
  }
}

function chart(id, title) {
  return {
    configVersion: 3,
    id,
    typeId: "kpi",
    title,
    description: `${title} status.`,
    sourceId: "status",
    roles: {
      value: { field: "value" },
      entity: { field: "entity" },
    },
    transformations: {
      filters: [],
      grouping: null,
      aggregation: null,
      duplicates: null,
      missingValues: "gap",
    },
    presentation: { title: { align: "left" }, collection: null },
    interaction: { zoom: { enabled: false }, timeSync: null },
    layout: { size: "standard" },
  };
}
