import assert from "node:assert/strict";
import test from "node:test";

import { integrateCreatedChart } from "../src/charting/config/dashboardBundleV3.js";

function dashboard() {
  return {
    configVersion: 3,
    id: "placement-dashboard",
    title: "Placement dashboard",
    timezone: "UTC",
    dataSources: {
      "source-a": { kind: "inline", rows: [{ value: 1 }] },
    },
    chronoGroups: [],
    pages: [{
      id: "page-a",
      title: "Page A",
      sections: [{
        id: "section-a",
        title: "Section A",
        panels: [
          chart("chart-a"),
          { id: "placement-b", chart: chart("chart-b") },
        ],
      }],
    }],
  };
}

function chart(id) {
  return {
    configVersion: 3,
    id,
    title: id,
    description: `${id} description`,
    typeId: "kpi",
    sourceId: "source-a",
    roles: { value: { field: "value" } },
    transformations: {
      filters: [],
      grouping: null,
      aggregation: null,
      duplicates: null,
      missingValues: "gap",
    },
    presentation: {
      background: { color: "#FFFFFF", transparent: false },
      title: { align: "left" },
      collection: null,
    },
    interaction: { zoom: { enabled: false }, timeSync: null },
    layout: { size: "standard" },
  };
}

test("created chart commits before and after a stable chart identity", () => {
  const original = dashboard();
  const before = integrateCreatedChart(original, { chart: chart("chart-before") }, {
    pageId: "page-a",
    sectionId: "section-a",
    anchorId: "chart-b",
    placement: { relation: "before", footprint: "standard" },
  });
  assert.deepEqual(ids(before), ["chart-a", "chart-before", "chart-b"]);

  const after = integrateCreatedChart(original, { chart: chart("chart-after") }, {
    pageId: "page-a",
    sectionId: "section-a",
    anchorId: "chart-a",
    placement: { relation: "after", footprint: "standard" },
  });
  assert.deepEqual(ids(after), ["chart-a", "chart-after", "chart-b"]);
  assert.deepEqual(ids(original), ["chart-a", "chart-b"]);
});

test("created chart append is default and a missing reviewed anchor fails closed", () => {
  const appended = integrateCreatedChart(dashboard(), { chart: chart("chart-c") }, {
    pageId: "page-a",
    sectionId: "section-a",
  });
  assert.deepEqual(ids(appended), ["chart-a", "chart-b", "chart-c"]);

  assert.throws(() => integrateCreatedChart(dashboard(), { chart: chart("chart-c") }, {
    pageId: "page-a",
    sectionId: "section-a",
    anchorId: "deleted-chart",
    placement: { relation: "before", footprint: "standard" },
  }), /anchor no longer exists/i);
});

function ids(value) {
  return value.pages[0].sections[0].panels.map((panel) => (panel.chart ?? panel).id);
}
