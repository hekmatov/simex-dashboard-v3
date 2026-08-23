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
const [{ default: ChartDataStateBoundary }, stateSurface] = await Promise.all([
  vite.ssrLoadModule("/src/components/charts/ChartDataStateBoundary.jsx"),
  vite.ssrLoadModule("/src/components/ChartStateSurface.jsx"),
]);
await vite.close();

test("the live chart boundary preserves Partial and its non-mutating continue action", () => {
  const html = renderToStaticMarkup(React.createElement(
    ChartDataStateBoundary,
    {
      state: {
        kind: "partial",
        message: "Vaccination rate is showing partial data. Booster coverage is unavailable.",
        hasValidContent: true,
      },
      chartName: "Vaccination rate",
    },
    React.createElement("svg", { "aria-label": "Available vaccination series" }),
  ));

  assert.match(html, /data-chart-state="partial"/);
  assert.match(html, /chart-state-surface--partial/);
  assert.match(html, /Available vaccination series/);
  assert.match(html, /Booster coverage is unavailable/);
  assert.match(html, /data-recovery-action="continue"/);
  assert.match(html, />Continue with Available Data</);
  assert.doesNotMatch(html, /chart-state-surface--unavailable/);
});

test("Partial is a normative state with chart-local non-mutating ownership", () => {
  const model = stateSurface.deriveChartStateModel({
    kind: "partial",
    chartName: "Vaccination rate",
    reason: "Booster coverage is unavailable.",
  });

  assert.equal(model.kind, "partial");
  assert.equal(model.statusText, "Partial");
  assert.deepEqual(model.actions, [{
    id: "continue",
    label: "Continue with Available Data",
    owner: "chart-session",
    destination: "chart:available-data",
  }]);
});
