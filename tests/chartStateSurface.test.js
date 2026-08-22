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
const stateModule = await vite.ssrLoadModule("/src/components/ChartStateSurface.jsx");
await vite.close();

const {
  CHART_STATE_KINDS,
  default: ChartStateSurface,
  deriveChartStateModel,
} = stateModule;

test("all seven recovery states have distinct accessible non-colour status text", () => {
  assert.deepEqual(CHART_STATE_KINDS, [
    "loading",
    "empty",
    "unavailable",
    "stale",
    "error",
    "needs-attention",
    "last-valid",
  ]);
  const expected = {
    loading: ["Loading", "Loading Cases…", "status"],
    empty: ["Empty", "No data is available for Cases.", "status"],
    unavailable: ["Unavailable", "Cases is unavailable. Source access expired.", "alert"],
    stale: ["Stale", "Cases may be out of date. The last valid chart remains visible.", "status"],
    error: ["Error", "Couldn’t load Cases. The previous valid dashboard state is unchanged.", "alert"],
    "needs-attention": ["Needs attention", "Cases needs attention. Repair its missing chart membership.", "alert"],
    "last-valid": ["Last valid", "Showing the last valid Cases while current data is unavailable.", "status"],
  };

  for (const [kind, [statusText, message, role]] of Object.entries(expected)) {
    const model = deriveChartStateModel({
      kind,
      chartName: "Cases",
      reason: kind === "unavailable"
        ? "Source access expired."
        : kind === "needs-attention"
          ? "Repair its missing chart membership."
          : null,
    });
    assert.equal(model.statusText, statusText);
    assert.equal(model.message, message);
    assert.equal(model.role, role);
  }
});

test("loading, empty, unavailable, stale, error, Needs-attention, and last-valid render named states", () => {
  for (const kind of CHART_STATE_KINDS) {
    const html = renderToStaticMarkup(React.createElement(ChartStateSurface, {
      state: { kind, reason: kind === "needs-attention" ? "A selected frame is missing." : null },
      chartName: "Cases",
    }));
    assert.match(html, new RegExp(`data-chart-state="${kind}"`));
    assert.match(html, /data-retains-plot-bounds="true"/);
    assert.match(html, /class="chart-state-surface__status-text"/);
    assert.match(html, /aria-hidden="true"/);
    assert.doesNotMatch(html, /style="[^"]*color:/);
  }
});

test("the surface retains the canonical plot dimensions instead of replacing page grid geometry", () => {
  const html = renderToStaticMarkup(React.createElement(ChartStateSurface, {
    state: "loading",
    chartName: "Capacity",
    dimensions: { width: 640, height: 320 },
  }));

  assert.match(html, /data-plot-width="640"/);
  assert.match(html, /data-plot-height="320"/);
  assert.match(html, /min-height:320px/);
  assert.match(html, /aspect-ratio:640 \/ 320/);
  assert.doesNotMatch(html, /position:fixed/);
});

test("stale, error, and last-valid states keep the last valid chart fully represented", () => {
  for (const kind of ["stale", "error", "last-valid"]) {
    const html = renderToStaticMarkup(React.createElement(ChartStateSurface, {
      state: kind,
      chartName: "Cases",
      lastValid: React.createElement("svg", { "aria-label": "Last valid Cases plot", viewBox: "0 0 10 10" }),
    }));
    assert.match(html, /data-last-valid-retained="true"/);
    assert.match(html, /aria-label="Last valid Cases plot"/);
    assert.match(html, /data-chart-state-overlay="true"/);
  }
});

test("retry and repair actions have deterministic labels, owners, and destinations", () => {
  const retry = deriveChartStateModel({
    kind: "error",
    chartName: "Cases",
    retryDestination: "source:cases-feed",
  });
  assert.deepEqual(retry.actions, [{
    id: "retry",
    label: "Retry Loading Cases",
    owner: "source",
    destination: "source:cases-feed",
  }]);

  const repair = deriveChartStateModel({
    kind: "needs-attention",
    chartName: "Cases",
    repairDestination: "chrono-group:charts",
    repairOwner: "saved-chrono-group",
    reason: "No observations remain in the period.",
  });
  assert.deepEqual(repair.actions, [{
    id: "repair",
    label: "Repair Cases",
    owner: "saved-chrono-group",
    destination: "chrono-group:charts",
  }]);

  const empty = deriveChartStateModel({
    kind: "empty",
    chartName: "Cases",
    retryDestination: "source:cases-feed",
    repairDestination: "chart:cases:data-settings",
  });
  assert.deepEqual(empty.actions.map(({ label }) => label), [
    "Retry Loading Cases",
    "Review Cases Data Settings",
  ]);
});

test("only operative recovery actions render and expose their deterministic destinations", () => {
  const inertHtml = renderToStaticMarkup(React.createElement(ChartStateSurface, {
    state: "error",
    chartName: "Cases",
    retryDestination: "source:cases-feed",
  }));
  assert.doesNotMatch(inertHtml, /<button/);
  assert.match(inertHtml, /Recovery is unavailable in this context\./);

  const operativeHtml = renderToStaticMarkup(React.createElement(ChartStateSurface, {
    state: "empty",
    chartName: "Cases",
    retryDestination: "source:cases-feed",
    repairDestination: "chart:cases:data-settings",
    onRetry() {},
    onRepair() {},
  }));
  assert.match(operativeHtml, /data-recovery-action="retry"/);
  assert.match(operativeHtml, /data-recovery-owner="source"/);
  assert.match(operativeHtml, /data-recovery-destination="source:cases-feed"/);
  assert.match(operativeHtml, />Retry Loading Cases</);
  assert.match(operativeHtml, /data-recovery-action="repair"/);
  assert.match(operativeHtml, /data-recovery-destination="chart:cases:data-settings"/);
  assert.match(operativeHtml, />Review Cases Data Settings</);
});

test("unknown chart states fail closed instead of rendering an ambiguous overlay", () => {
  assert.throws(
    () => deriveChartStateModel({ kind: "partial-ish", chartName: "Cases" }),
    /Unknown chart state/,
  );
});
