import assert from "node:assert/strict";
import test, { after } from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import reactPlugin from "@vitejs/plugin-react";

import { profileDataset } from "../src/charting/data/profileDataset.js";

const vite = await createServer({
  root: process.cwd(),
  configFile: false,
  plugins: [reactPlugin()],
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "silent",
});
after(() => vite.close());

const sceneViewModule = await vite.ssrLoadModule(
  "/src/components/time/SceneViewCompositionGrid.jsx",
);
const { default: DashboardCanvas } = await vite.ssrLoadModule(
  "/src/components/dashboard/DashboardCanvas.jsx",
);

test("Scene View composition renders actual chart roots in authored order and width", () => {
  assert.ok(sceneViewModule, "SceneViewCompositionGrid must exist");
  const dashboard = dashboardFixture();
  const html = renderToStaticMarkup(React.createElement(
    sceneViewModule.default,
    {
      dashboard,
      scene: {
        members: [
          { chartId: "chart-c", width: 4 },
          { chartId: "chart-a", width: 1 },
          { chartId: "chart-b", width: 3 },
        ],
      },
      timeContextForChart: () => null,
      surface: "view-scene",
    },
  ));

  assert.deepEqual(
    [...html.matchAll(/data-scene-chart-id="([^"]+)"/g)].map((match) => match[1]),
    ["chart-c", "chart-a", "chart-b"],
  );
  assert.deepEqual(
    [...html.matchAll(/data-scene-width="([^"]+)"/g)].map((match) => Number(match[1])),
    [4, 1, 3],
  );
  assert.deepEqual(
    [...html.matchAll(/data-scene-row-height="([^"]+)"/g)].map((match) => Number(match[1])),
    [1, 1, 0.75],
  );
  assert.match(html, /data-scene-footprint-mode="live"/);
  assert.match(html, /data-scene-chart-id="chart-b"[^>]*data-scene-short="true"/);
  assert.doesNotMatch(html, /data-scene-chart-id="chart-a"[^>]*data-scene-short="true"/);
  assert.match(html, /--scene-chart-row-span:3/);
  assert.equal((html.match(/class="chart-view-frame"/g) ?? []).length, 3);
  assert.doesNotMatch(html, /Chart loads when it enters the viewport/);
});

test("Scene editor preview keeps fractional panels readable while live Scene View uses their saved footprint", () => {
  const html = renderToStaticMarkup(React.createElement(
    sceneViewModule.default,
    {
      dashboard: dashboardFixture(),
      scene: { members: [{ chartId: "chart-b", width: 3 }] },
      surface: "scene-preview",
    },
  ));

  assert.match(html, /data-scene-footprint-mode="editor-preview"/);
  assert.match(html, /data-scene-chart-id="chart-b"[^>]*data-scene-row-height="1"/);
  assert.match(html, /--scene-chart-row-span:4/);
  assert.doesNotMatch(html, /data-scene-short="true"/);
});

test("Scene View composition keeps a missing authored chart identifiable", () => {
  assert.ok(sceneViewModule, "SceneViewCompositionGrid must exist");
  const html = renderToStaticMarkup(React.createElement(
    sceneViewModule.default,
    {
      dashboard: dashboardFixture(),
      scene: { members: [{ chartId: "removed-chart", width: 2 }] },
      surface: "scene-preview",
    },
  ));

  assert.match(html, /data-scene-chart-id="removed-chart"/);
  assert.match(html, /data-scene-chart-missing="true"/);
  assert.match(html, /no longer exists/i);
});

test("active-Scene View uses the shared authored composition while group View stays canonical", () => {
  const dashboard = dashboardFixture();
  const activePage = dashboard.pages[0];
  const scene = {
    id: "scene-a",
    name: "Authored Scene",
    members: [
      { chartId: "chart-c", width: 4 },
      { chartId: "chart-a", width: 1 },
      { chartId: "chart-b", width: 3 },
    ],
  };
  const sceneHtml = renderToStaticMarkup(React.createElement(DashboardCanvas, {
    activePage,
    dashboard,
    surface: "view",
    chronoSection: {
      id: scene.id,
      title: scene.name,
      chartIds: scene.members.map(({ chartId }) => chartId),
      scene,
      timeContextForChart: () => null,
    },
  }));

  assert.match(sceneHtml, /data-scene-composition-surface="view-scene"/);
  assert.deepEqual(
    [...sceneHtml.matchAll(/data-scene-chart-id="([^"]+)"/g)].map((match) => match[1]),
    ["chart-c", "chart-a", "chart-b"],
  );

  const groupHtml = renderToStaticMarkup(React.createElement(DashboardCanvas, {
    activePage,
    dashboard,
    surface: "view",
    chronoSection: {
      id: "group-a",
      title: "Canonical group",
      chartIds: ["chart-c", "chart-a"],
    },
  }));

  assert.match(groupHtml, /data-chrono-section="group-a"/);
  assert.match(groupHtml, /class="layout-grid layout-two-column"/);
  assert.doesNotMatch(groupHtml, /data-scene-composition-surface/);
});

function dashboardFixture() {
  const charts = [
    kpiChart("chart-a", "source-a", 1),
    kpiChart("chart-b", "source-b", 0.75),
    kpiChart("chart-c", "source-c", 1),
  ];
  const loadedData = {
    "source-a": [{ value: 10 }],
    "source-b": [{ value: 20 }],
    "source-c": [{ value: 30 }],
  };
  return {
    dataSources: {},
    globalStyles: { accessibility: { enabled: false } },
    loadedData,
    datasetProfiles: Object.fromEntries(
      Object.entries(loadedData).map(([sourceId, rows]) => [
        sourceId,
        profileDataset(rows),
      ]),
    ),
    pages: [{
      id: "page-a",
      sections: [{
        id: "section-a",
        panels: charts.map((chart) => ({ id: `placement-${chart.id}`, chart })),
      }],
    }],
  };
}

function kpiChart(id, sourceId, height) {
  return {
    id,
    typeId: "kpi",
    title: id,
    sourceId,
    roles: { value: { field: "value" } },
    layout: { width: 2, height },
    transformations: {
      filters: [],
      grouping: null,
      aggregation: null,
      duplicates: null,
      missingValues: "gap",
    },
    presentation: { collection: null, labels: null, accessibility: null },
    interaction: { zoom: { enabled: false }, timeSync: null },
  };
}
