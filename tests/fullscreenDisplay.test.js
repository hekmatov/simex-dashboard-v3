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

test("fullscreen CSS fits the panel inside its padded backdrop without backdrop scrolling", async () => {
  const css = await import("node:fs/promises").then(({ readFile }) => readFile(
    new URL("../src/styles/immersive-display.css", import.meta.url),
    "utf8",
  ));
  assert.match(css, /\.fullscreen-backdrop--immersive\s*\{[^}]*padding:\s*12px;[^}]*overflow:\s*hidden;/s);
  assert.match(css, /\.multi-fullscreen-panel\.dashboard-dialog\s*\{[^}]*inline-size:\s*100%;[^}]*block-size:\s*100%;[^}]*max-block-size:\s*none;/s);
  assert.match(css, /\.fullscreen-backdrop--immersive \.multi-fullscreen-grid\s*\{[^}]*height:\s*100%;/s);
});

test("fullscreen comparison preserves ordered charts in a labeled focus-scoped dialog", () => {
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
  assert.match(html, /aria-label="Move Chart B next"/);
  assert.match(html, /aria-label="Move Chart A previous"/);
  assert.match(html, /aria-label="Chart comparison"/);
  assert.match(html, /tabindex="-1"/);
  assert.match(html, />Exit comparison<\/button>/);
  assert.match(html, /layout-sideBySide/);
  assert.match(html, /data-display-mode="comparison"/);
});

test("the shared displayed-chart grid is available to the fullscreen surface", () => {
  assert.equal(
    typeof gridModule?.default,
    "function",
    "DisplayedChartGrid must be implemented",
  );
});

test("findChart is the public canonical lookup for placement-wrapped and direct saved panels", () => {
  assert.equal(typeof gridModule?.findChart, "function");
  const wrapped = {
    id: "placement-static",
    chart: { id: "static-image", typeId: "image", title: "Static image" },
  };
  const direct = { id: "direct-static", typeId: "freeText", title: "Static text" };
  const savedDashboard = {
    pages: [{ sections: [{ panels: [wrapped, direct] }] }],
  };

  assert.equal(gridModule.findChart(savedDashboard, "static-image"), wrapped.chart);
  assert.equal(gridModule.findChart(savedDashboard, "direct-static"), direct);
  assert.equal(gridModule.findChart(savedDashboard, "missing"), null);
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
