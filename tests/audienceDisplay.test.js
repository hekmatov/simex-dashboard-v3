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
const audienceModule = await vite
  .ssrLoadModule("/src/components/presentation/AudienceDisplay.jsx")
  .catch(() => null);
const gridModule = await vite
  .ssrLoadModule("/src/components/display/DisplayedChartGrid.jsx")
  .catch(() => null);
await vite.close();

const dashboard = {
  dataSources: {
    status: { kind: "inline", rows: [{ entity: "A", value: 1 }] },
  },
  datasetProfiles: {
    status: {
      columns: [
        { name: "entity", type: "category" },
        { name: "value", type: "numeric" },
      ],
    },
  },
  loadedData: { status: [{ entity: "A", value: 1 }] },
  pages: [{
    id: "biomedical",
    title: "Biomedical response",
    sections: [{
      id: "overview",
      panels: ["chart-a", "chart-b", "chart-c", "chart-d"].map((id) => ({
        configVersion: 3,
        id,
        typeId: "kpi",
        title: `Chart ${id.slice(-1).toUpperCase()}`,
        description: "Current status.",
        sourceId: "status",
        roles: { value: { field: "value" }, entity: { field: "entity" } },
        transformations: {
          filters: [], grouping: null, aggregation: null, duplicates: null, missingValues: "gap",
        },
        presentation: { title: { align: "left" }, collection: null },
        interaction: { zoom: { enabled: true }, timeSync: null },
        layout: { size: "standard" },
      })),
    }],
  }],
  timeSyncGroups: [],
};

const twoChartScene = {
  active_page_id: "biomedical",
  displayed_chart_ids: ["chart-b", "chart-a"],
  layout: "sideBySide",
  time: null,
  show_scene_title: true,
  blackout: false,
};

test("audience display shows the neutral waiting state before a scene arrives", () => {
  assert.equal(typeof audienceModule?.default, "function", "AudienceDisplay must be implemented");
  const html = renderToStaticMarkup(React.createElement(audienceModule.default, {
    dashboard,
    connectionStatus: "waiting",
    presentationState: null,
  }));

  assert.match(html, /Audience display ready/);
  assert.match(html, /Waiting for the moderator\./);
  assert.doesNotMatch(html, /<button/);
  assert.doesNotMatch(html, /<nav/);
});

test("displayed chart grid preserves one-to-four chart order and selected layout", () => {
  assert.equal(typeof gridModule?.default, "function", "DisplayedChartGrid must be implemented");
  const html = renderToStaticMarkup(React.createElement(gridModule.default, {
    dashboard,
    chartIds: ["chart-d", "chart-b", "chart-a", "chart-c"],
    layout: "grid2x2",
    surface: "audience",
    timeContextForChart: () => null,
  }));

  assert.match(html, /displayed-chart-grid/);
  assert.match(html, /displayed-count-4/);
  assert.match(html, /layout-grid2x2/);
  assert.ok(html.indexOf('data-displayed-chart-id="chart-d"') < html.indexOf('data-displayed-chart-id="chart-b"'));
  assert.ok(html.indexOf('data-displayed-chart-id="chart-b"') < html.indexOf('data-displayed-chart-id="chart-a"'));
  assert.ok(html.indexOf('data-displayed-chart-id="chart-a"') < html.indexOf('data-displayed-chart-id="chart-c"'));
  assert.doesNotMatch(html, /chart-zoom-guard/);
});

test("audience retains a disconnected scene and blackouts it without unmounting charts or exposing chrome", () => {
  assert.equal(typeof audienceModule?.default, "function", "AudienceDisplay must be implemented");
  const disconnected = renderToStaticMarkup(React.createElement(audienceModule.default, {
    dashboard,
    connectionStatus: "disconnected",
    presentationState: twoChartScene,
  }));
  const blackedOut = renderToStaticMarkup(React.createElement(audienceModule.default, {
    dashboard,
    connectionStatus: "connected",
    presentationState: { ...twoChartScene, blackout: true },
  }));

  assert.match(disconnected, /data-displayed-chart-id="chart-b"/);
  assert.match(disconnected, /data-displayed-chart-id="chart-a"/);
  assert.match(blackedOut, /audience-blackout/);
  assert.match(blackedOut, /data-displayed-chart-id="chart-b"/);
  assert.match(blackedOut, /data-displayed-chart-id="chart-a"/);
  for (const html of [disconnected, blackedOut]) {
    assert.doesNotMatch(html, /<button/);
    assert.doesNotMatch(html, /<nav/);
    assert.doesNotMatch(html, /Source information/);
    assert.doesNotMatch(html, /chart-panel-action-rail/);
    assert.doesNotMatch(html, /chart-zoom-guard/);
  }
});
