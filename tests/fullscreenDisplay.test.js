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

test("fullscreen display renders the exact ordered visible chart set", () => {
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
  assert.ok(html.indexOf("Chart B") < html.indexOf("Chart A"));
  assert.match(html, /aria-label="Close chart-b"/);
  assert.match(html, /aria-label="Close chart-a"/);
  assert.match(html, /aria-label="Close all displayed charts"/);
  assert.match(html, /layout-sideBySide/);
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
