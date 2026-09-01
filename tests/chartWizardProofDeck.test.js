import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { CHART_CREATION_STAGES } from "../src/charting/forms/wizardDraft.js";

const vite = await createServer({
  root: process.cwd(),
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});
const wizardModule = await vite.ssrLoadModule("/src/components/chart-authoring/ChartWizardV3.jsx")
  .catch(() => null);
await vite.close();

const STAGES = [
  "destination",
  "data-source",
  "chart-type",
  "map-and-prepare-data",
  "configure-chart",
  "review-and-create",
];

test("the persistent proof deck remains validation inside the six chart stages", () => {
  assert.deepEqual(CHART_CREATION_STAGES, STAGES);
  assert.equal(STAGES.includes("content"), false);
  assert.equal(STAGES.includes("preview-and-add"), false);
});

test("every chart-creation stage retains both independent proof surfaces", () => {
  assert.equal(typeof wizardModule?.default, "function");
  const base = wizardModule.createChartWizardState({
    loadedData: {},
    profiles: {},
    chronoGroups: [],
    existingCharts: [],
    dashboardRevision: "dashboard-r1",
    destination: { pageId: "page-a", sectionId: "section-a", relation: "append" },
  });

  for (const stage of STAGES) {
    const html = renderToStaticMarkup(React.createElement(wizardModule.default, {
      open: true,
      dashboard: fixtureDashboard(),
      dataSources: {},
      loadedData: {},
      chronoGroups: [],
      initialDraftState: { ...base, stage },
      onClose() {},
      onCreate() {},
    }));

    assert.match(html, /data-chart-proof-deck="persistent"/, stage);
    assert.match(html, /aria-label="Canonical render proof"/, stage);
    assert.match(html, /aria-label="Placement proof"/, stage);
    assert.match(html, /data-proof-revision=/, stage);
  }
});

test("proof deck presents placement order separately from canonical rendering", () => {
  assert.equal(typeof wizardModule?.ChartCreationProofDeck, "function");
  const dashboard = fixtureDashboard();
  const html = renderToStaticMarkup(React.createElement(wizardModule.ChartCreationProofDeck, {
    dashboard,
    chart: { id: "draft-chart", title: "Respiratory pressure", typeId: "line" },
    rows: [],
    renderProof: {
      status: "invalid",
      revision: "render:r2",
      rendererReadyCount: 0,
      errors: [{ message: "Map a measurement to render the chart." }],
    },
    placementProof: {
      status: "valid",
      revision: "placement:p7",
      orderedText: "After Confirmed cases; 3 columns by 1 row.",
      projection: [
        { chartId: "confirmed-cases", draft: false },
        { chartId: "draft-chart", draft: true },
      ],
      errors: [],
    },
  }));

  assert.match(html, /render:r2/);
  assert.match(html, /placement:p7/);
  assert.match(html, /Map a measurement to render the chart/);
  assert.match(html, /Confirmed cases/);
  assert.match(html, /Respiratory pressure/);
  assert.match(html, /Draft chart/);
  assert.equal((html.match(/class="chart-proof-eyebrow"/g) ?? []).length, 2);
  assert.doesNotMatch(html, /class="eyebrow"/);
});

function fixtureDashboard() {
  return {
    pages: [{
      id: "page-a",
      label: "Executive surveillance",
      sections: [{
        id: "section-a",
        title: "Transmission and demand",
        panels: [{
          id: "confirmed-placement",
          chart: { id: "confirmed-cases", title: "Confirmed cases", layout: { size: "medium" } },
        }],
      }],
    }],
  };
}
