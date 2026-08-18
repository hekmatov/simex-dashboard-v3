import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

import { profileDataset } from "../src/charting/data/profileDataset.js";

const vite = await createServer({
  root: process.cwd(),
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});
const [{ default: ChartView }, { default: DashboardCanvas }, { default: DisplayedChartGrid }] = await Promise.all([
  vite.ssrLoadModule("/src/components/charts/ChartView.jsx"),
  vite.ssrLoadModule("/src/components/dashboard/DashboardCanvas.jsx"),
  vite.ssrLoadModule("/src/components/display/DisplayedChartGrid.jsx"),
]);
await vite.close();

const chart = {
  id: "capacity",
  typeId: "kpi",
  title: "Capacity",
  sourceId: "capacity-feed",
  roles: { value: { field: "value" } },
  presentation: { collection: null, title: { align: "left" } },
  interaction: { zoom: { enabled: false } },
};
const rows = [{ value: 7 }];
const datasetProfile = profileDataset(rows);

test("ChartView renders exact plot-native Loading, empty, Partial, and Error states", () => {
  const render = (sourceState, stateRows = rows) => renderToStaticMarkup(
    React.createElement(ChartView, {
      chart,
      rows: stateRows,
      datasetProfile,
      sourceState,
    }),
  );

  const loading = render({ status: "loading" }, undefined);
  const empty = render({ status: "ready" }, []);
  const partial = render({ status: "partial", unavailableSeries: "Booster coverage" });
  const error = render({ status: "error" });

  assert.match(loading, /class="chart-data-state-boundary chart-data-state-boundary--loading"[^>]*aria-busy="true"/);
  assert.match(loading, /Loading Capacity…/);
  assert.doesNotMatch(loading, /Retry/);

  assert.match(empty, /No data is available for Capacity\./);
  assert.match(empty, /data-chart-state="empty"/);

  assert.match(partial, /Capacity is showing partial data\. Booster coverage is unavailable\./);
  assert.match(partial, />7</);

  assert.match(error, /Couldn’t load Capacity\. The previous valid dashboard state is unchanged\./);
  assert.match(error, />7</);
});

test("ordinary View and displayed comparison consume the same source state", () => {
  const page = {
    id: "operations",
    title: "Operations",
    sections: [{
      id: "capacity-section",
      title: "Capacity",
      panels: [{ id: "capacity-placement", chart }],
    }],
  };
  const dashboard = {
    pages: [page],
    dataSources: { "capacity-feed": { kind: "csv" } },
    loadedData: { "capacity-feed": rows },
    datasetProfiles: { "capacity-feed": datasetProfile },
    chartDataStates: {
      capacity: { status: "partial", unavailableSeries: "Booster coverage" },
    },
    globalStyles: {},
  };

  const ordinary = renderToStaticMarkup(React.createElement(DashboardCanvas, {
    activePage: page,
    dashboard,
    surface: "view",
  }));
  const comparison = renderToStaticMarkup(React.createElement(DisplayedChartGrid, {
    dashboard,
    chartIds: [chart.id],
  }));

  for (const html of [ordinary, comparison]) {
    assert.match(html, /Capacity is showing partial data\. Booster coverage is unavailable\./);
    assert.match(html, /data-chart-state="partial"/);
  }
});
