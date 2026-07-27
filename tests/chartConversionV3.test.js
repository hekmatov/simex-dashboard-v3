import assert from "node:assert/strict";
import test from "node:test";

import {
  applyChartConversion,
  planChartConversion,
} from "../src/charting/forms/chartConversion.js";
import {
  createChartDraft,
  validateChartInstance,
} from "../src/charting/config/chartConfigV3.js";
import { normalizeCollectionSettings } from "../src/charting/collection/collectionModel.js";

function lineChart(overrides = {}) {
  return createChartDraft("line", {
    id: "exercise-trend",
    title: "Exercise trend",
    description: "Cases reported during the exercise.",
    sourceId: "exercise-data",
    roles: {
      measurements: [{ field: "value", axis: "primary" }],
      observation: {
        field: "reportedAt",
        interpretation: "temporal",
        format: "YYYY-MM-DD",
      },
      cluster: { field: "region" },
    },
    transformations: {
      filters: [{ field: "region", operator: "equals", value: "North" }],
      grouping: ["region"],
      aggregation: "sum",
      duplicates: "aggregate",
      missingValues: "zero",
    },
    presentation: {
      title: { align: "center" },
      axes: {
        primary: {
          xTitle: "Date",
          yTitle: "Cases",
          grid: true,
        },
      },
      labels: { visible: true },
      background: { color: "#f7f8fa", transparent: false },
      legend: { visible: true, position: "bottom" },
      accessibility: { summary: "Exercise trend." },
      advanced: {},
    },
    interaction: {
      zoom: { enabled: true },
      timeSync: { groupId: "exercise-clock" },
    },
    layout: { size: "wide", x: 1, y: 2, width: 8, height: 5 },
    ...overrides,
  });
}

function kpiChart() {
  return createChartDraft("kpi", {
    id: "exercise-status",
    title: "Exercise status",
    sourceId: "exercise-data",
    roles: {
      value: { field: "value" },
      entity: { field: "region" },
      time: {
        field: "reportedAt",
        interpretation: "temporal",
        format: "YYYY-MM-DD",
      },
    },
    presentation: {
      title: { align: "right" },
      collection: {
        layout: "carousel",
        rows: 1,
        columns: 3,
        overflow: "autoRotate",
        ranking: {
          mode: "priority",
          method: "highestCurrent",
          stabilize: true,
        },
      },
      targets: { direction: "increase-is-good" },
    },
  });
}

test("line to area preserves compatible roles and title alignment", () => {
  const chart = lineChart();
  const plan = planChartConversion(chart, "area");

  assert.equal(plan.kind, "compatible");
  assert.deepEqual(plan.requiredRoles, []);

  const converted = applyChartConversion(chart, "area", {});
  assert.notEqual(converted, chart);
  assert.equal(converted.typeId, "area");
  assert.deepEqual(converted.roles, chart.roles);
  assert.equal(converted.presentation.title.align, "center");
  assert.deepEqual(converted.presentation.axes, chart.presentation.axes);
  assert.deepEqual(converted.layout, chart.layout);
  validateChartInstance(converted);
});

test("line to pie requires category and value remapping and reports removed settings", () => {
  const chart = lineChart();
  const plan = planChartConversion(chart, "pie");

  assert.equal(plan.kind, "remap");
  assert.deepEqual(plan.requiredRoles.map(({ id }) => id), [
    "category",
    "value",
  ]);
  assert.ok(plan.removedSettings.some(
    ({ path }) => path === "presentation.axes",
  ));
  assert.ok(plan.removedSettings.some(
    ({ path }) => path === "interaction.zoom",
  ));
});

test("guided remapping produces a valid normalized target without mutating the source", () => {
  const chart = lineChart();
  const before = structuredClone(chart);
  const converted = applyChartConversion(chart, "pie", {
    roles: {
      category: {
        field: "reportedAt",
        interpretation: "category",
      },
      value: { field: "value" },
    },
  });

  assert.notEqual(converted, chart);
  assert.deepEqual(chart, before);
  assert.equal(converted.configVersion, 3);
  assert.equal(converted.typeId, "pie");
  assert.deepEqual(converted.roles, {
    category: {
      field: "reportedAt",
      interpretation: "category",
    },
    value: { field: "value" },
  });
  assert.equal("axes" in converted.presentation, false);
  assert.equal(converted.presentation.title.align, "center");
  assert.equal(converted.interaction.zoom.enabled, false);
  assert.equal(converted.interaction.timeSync, null);
  validateChartInstance(converted);
});

test("a schema-declared compatible conversion strips target-inapplicable collection state", () => {
  const chart = kpiChart();
  const plan = planChartConversion(chart, "deltaCard");

  assert.equal(plan.kind, "compatible");
  assert.ok(plan.removedSettings.some(
    ({ path }) => path === "presentation.collection",
  ));

  const converted = applyChartConversion(chart, "deltaCard", {
    roles: {
      measurement: { field: "value" },
      entity: { field: "region" },
      time: {
        field: "reportedAt",
        interpretation: "temporal",
        format: "YYYY-MM-DD",
      },
    },
  });

  assert.notEqual(converted, chart);
  assert.equal(converted.presentation.collection, null);
  assert.equal(converted.presentation.title.align, "right");
  assert.deepEqual(converted.transformations.comparison, {
    mode: "previousObservation",
  });
  validateChartInstance(converted);
});

test("schema-compatible collection state is retained in normalized form", () => {
  const chart = kpiChart();
  const converted = applyChartConversion(chart, "gauge", {});

  assert.notEqual(converted, chart);
  assert.deepEqual(
    converted.presentation.collection,
    normalizeCollectionSettings(chart.presentation.collection),
  );
  validateChartInstance(converted);
});

test("incomplete and invalid target roles fail closed with original identity", () => {
  const chart = lineChart();
  const before = structuredClone(chart);

  const incomplete = applyChartConversion(chart, "pie", {
    roles: {
      category: { field: "reportedAt", interpretation: "category" },
    },
  });
  const invalid = applyChartConversion(chart, "pie", {
    roles: {
      category: { field: "reportedAt", interpretation: "category" },
      value: { field: "value", interpretation: "category" },
    },
  });

  assert.equal(incomplete, chart);
  assert.equal(invalid, chart);
  assert.deepEqual(chart, before);
});

test("canceling a conversion returns the exact unchanged chart", () => {
  const chart = lineChart();
  const before = structuredClone(chart);

  const result = applyChartConversion(chart, "pie", {
    cancelled: true,
    roles: {
      category: { field: "reportedAt", interpretation: "category" },
      value: { field: "value" },
    },
  });

  assert.equal(result, chart);
  assert.deepEqual(chart, before);
});

test("target role assignments reject undeclared roles without partial application", () => {
  const chart = lineChart();

  const result = applyChartConversion(chart, "pie", {
    roles: {
      category: { field: "reportedAt", interpretation: "category" },
      value: { field: "value" },
      cluster: { field: "region" },
    },
  });

  assert.equal(result, chart);
  assert.equal(chart.typeId, "line");
});

test("conversion planning derives transform removals from target schema capabilities", () => {
  const chart = lineChart();
  const plan = planChartConversion(chart, "kpi");
  const removedPaths = plan.removedSettings.map(({ path }) => path);

  assert.ok(removedPaths.includes("transformations.grouping"));
  assert.ok(removedPaths.includes("presentation.axes"));
  assert.ok(removedPaths.includes("interaction.zoom"));
});

test("conversion boundaries reject accessors without evaluating them", () => {
  const chart = lineChart();
  let chartReads = 0;
  const hostileChart = { ...chart };
  Object.defineProperty(hostileChart, "typeId", {
    enumerable: true,
    get() {
      chartReads += 1;
      return "line";
    },
  });

  assert.throws(
    () => planChartConversion(hostileChart, "area"),
    /typeId.*data property/i,
  );
  assert.equal(chartReads, 0);

  let optionReads = 0;
  const hostileOptions = {};
  Object.defineProperty(hostileOptions, "roles", {
    enumerable: true,
    get() {
      optionReads += 1;
      return {};
    },
  });
  assert.throws(
    () => applyChartConversion(chart, "area", hostileOptions),
    /roles.*data property/i,
  );
  assert.equal(optionReads, 0);
});

test("conversion boundaries reject prototype-polluting data keys", () => {
  const chart = lineChart();
  const roles = { ...chart.roles };
  Object.defineProperty(roles, "__proto__", {
    enumerable: true,
    value: { polluted: true },
  });

  assert.throws(
    () => planChartConversion({ ...chart, roles }, "area"),
    /dangerous property "__proto__"/i,
  );
  assert.equal({}.polluted, undefined);
});

test("invalid conversion arguments fail explicitly before reading nested input", () => {
  const chart = lineChart();

  assert.throws(
    () => planChartConversion(null, "area"),
    /chart must be a plain object/i,
  );
  assert.throws(
    () => planChartConversion(chart, ""),
    /target chart type is required/i,
  );
  assert.throws(
    () => applyChartConversion(chart, "area", []),
    /conversion options must be a plain object/i,
  );
});
