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

function deltaListChart() {
  return createChartDraft("deltaList", {
    id: "exercise-status-by-region",
    title: "Exercise status by region",
    sourceId: "exercise-data",
    roles: {
      measurement: { field: "value" },
      entity: { field: "region" },
      time: {
        field: "reportedAt",
        interpretation: "temporal",
        format: "YYYY-MM-DD",
      },
    },
    presentation: {
      card: { showDeltaArrow: false },
    },
  });
}

test("line to area preserves compatible roles and title alignment", () => {
  const chart = lineChart();
  const plan = planChartConversion(chart, "area");

  assert.equal(plan.kind, "compatible");
  assert.deepEqual(plan.preservedRoles, chart.roles);
  assert.equal("retainedRoles" in plan, false);
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
  assert.ok(plan.removedSettings.every((setting) => (
    typeof setting.path === "string"
    && typeof setting.label === "string"
    && !Object.hasOwn(setting, "reason")
  )));
});

test("guided remapping produces a valid normalized target without mutating the source", () => {
  const chart = lineChart();
  const before = structuredClone(chart);
  const converted = applyChartConversion(chart, "pie", {
    category: {
      field: "reportedAt",
      interpretation: "category",
    },
    value: { field: "value" },
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
    measurement: { field: "value" },
    entity: { field: "region" },
    time: {
      field: "reportedAt",
      interpretation: "temporal",
      format: "YYYY-MM-DD",
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

test("KPI card presentation accepts a configurable accent palette and is removed for non-card targets", () => {
  const chart = kpiChart();
  chart.presentation.card = {
    style: "signalStamps",
    accentColors: ["#043BCB", "#36BDEB"],
  };

  assert.doesNotThrow(() => validateChartInstance(chart));

  const plan = planChartConversion(chart, "gauge");
  assert.ok(plan.removedSettings.some(
    ({ path }) => path === "presentation.card",
  ));

  const converted = applyChartConversion(chart, "gauge", {});
  assert.notEqual(converted, chart);
  assert.equal(Object.hasOwn(converted.presentation, "card"), false);
  validateChartInstance(converted);
});

test("delta-card conversions retain an arrow preference when the default style is implicit", () => {
  const chart = deltaListChart();
  const plan = planChartConversion(chart, "deltaCard");

  assert.equal(plan.removedSettings.some(
    ({ path }) => path === "presentation.card",
  ), false);

  const converted = applyChartConversion(chart, "deltaCard", {});
  assert.notEqual(converted, chart);
  assert.deepEqual(converted.presentation.card, { showDeltaArrow: false });
  validateChartInstance(converted);
});

test("card presentation rejects inherited and accessor-backed settings without reading them", () => {
  const chart = kpiChart();
  let styleReads = 0;
  const accessorCard = {};
  Object.defineProperty(accessorCard, "style", {
    enumerable: true,
    get() {
      styleReads += 1;
      return "quietLedger";
    },
  });
  chart.presentation.card = accessorCard;

  assert.throws(
    () => validateChartInstance(chart),
    /data property/,
  );
  assert.equal(styleReads, 0);

  chart.presentation.card = Object.create({ style: "quietLedger" });
  assert.throws(
    () => validateChartInstance(chart),
    /plain object/,
  );

  let colorReads = 0;
  const accessorColors = ["#043BCB"];
  Object.defineProperty(accessorColors, "0", {
    configurable: true,
    enumerable: true,
    get() {
      colorReads += 1;
      return "#043BCB";
    },
  });
  chart.presentation.card = { accentColors: accessorColors };
  assert.throws(
    () => validateChartInstance(chart),
    /direct data entries/,
  );
  assert.equal(colorReads, 0);
});

test("incomplete and invalid target roles fail closed with original identity", () => {
  const chart = lineChart();
  const before = structuredClone(chart);

  const incomplete = applyChartConversion(chart, "pie", {
    category: { field: "reportedAt", interpretation: "category" },
  });
  const invalid = applyChartConversion(chart, "pie", {
    category: { field: "reportedAt", interpretation: "category" },
    value: { field: "value", interpretation: "category" },
  });

  assert.equal(incomplete, chart);
  assert.equal(invalid, chart);
  assert.deepEqual(chart, before);
});

test("conversion planning keeps incompatible guided bindings in required roles", () => {
  const chart = lineChart();
  const plan = planChartConversion(chart, "pie", {
    category: { field: "reportedAt", interpretation: "category" },
    value: { field: "value", interpretation: "category" },
  });

  assert.deepEqual(plan.requiredRoles.map(({ id }) => id), ["value"]);
});

test("canceling a conversion returns the exact unchanged chart", () => {
  const chart = lineChart();
  const before = structuredClone(chart);

  const result = applyChartConversion(chart, "pie", null);

  assert.equal(result, chart);
  assert.deepEqual(chart, before);
});

test("target role assignments reject undeclared roles without partial application", () => {
  const chart = lineChart();

  const result = applyChartConversion(chart, "pie", {
    category: { field: "reportedAt", interpretation: "category" },
    value: { field: "value" },
    cluster: { field: "region" },
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

test("line to KPI reports and applies time-sync removal when no temporal role remains", () => {
  const chart = lineChart();
  const plan = planChartConversion(chart, "kpi");

  assert.ok(plan.removedSettings.some(
    ({ path }) => path === "interaction.timeSync",
  ));

  const converted = applyChartConversion(chart, "kpi", {
    value: { field: "value" },
  });
  assert.notEqual(converted, chart);
  assert.equal(converted.interaction.timeSync, null);
  validateChartInstance(converted);
});

test("a guided temporal remap keeps time-sync planning and application aligned", () => {
  const chart = lineChart();
  const assignments = {
    value: { field: "value" },
    time: {
      field: "reportedAt",
      interpretation: "temporal",
      format: "YYYY-MM-DD",
    },
  };
  const plan = planChartConversion(chart, "kpi", assignments);

  assert.equal(plan.removedSettings.some(
    ({ path }) => path === "interaction.timeSync",
  ), false);
  assert.deepEqual(plan.requiredRoles, []);

  const converted = applyChartConversion(chart, "kpi", assignments);
  assert.notEqual(converted, chart);
  assert.deepEqual(converted.interaction.timeSync, {
    groupId: "exercise-clock",
  });
  validateChartInstance(converted);
});

test("conversion preserves colors and retains only target-applicable widths", () => {
  const source = lineChart();
  source.typeId = "mixed";
  source.presentation.series = {
    colors: ["#043BCB", "#36BDEB"],
    lineWidth: 2.5,
    barWidth: 18.5,
  };

  for (const {
    targetTypeId,
    removedPath,
    retainedSeries,
  } of [
    {
      targetTypeId: "line",
      removedPath: "presentation.series.barWidth",
      retainedSeries: {
        colors: ["#043BCB", "#36BDEB"],
        lineWidth: 2.5,
      },
    },
    {
      targetTypeId: "bar",
      removedPath: "presentation.series.lineWidth",
      retainedSeries: {
        colors: ["#043BCB", "#36BDEB"],
        barWidth: 18.5,
      },
    },
  ]) {
    const plan = planChartConversion(source, targetTypeId);
    const seriesRemovals = plan.removedSettings
      .map(({ path }) => path)
      .filter((path) => path.startsWith("presentation.series."));

    assert.deepEqual(seriesRemovals, [removedPath], targetTypeId);
    const converted = applyChartConversion(source, targetTypeId, {});
    assert.notEqual(converted, source, targetTypeId);
    assert.deepEqual(converted.presentation.series, retainedSeries, targetTypeId);
    validateChartInstance(converted);
  }
});

test("conversion preserves colors across composition variants without reporting a removal", () => {
  const source = createChartDraft("pie", {
    id: "exercise-composition",
    title: "Exercise composition",
    sourceId: "exercise-data",
    roles: {
      category: { field: "region" },
      value: { field: "value" },
    },
    presentation: {
      title: { align: "center" },
      series: { colors: ["#043BCB", "#36BDEB"] },
    },
  });
  const plan = planChartConversion(source, "donut");

  assert.equal(
    plan.removedSettings.some(({ path }) => path.startsWith("presentation.series.")),
    false,
  );
  const converted = applyChartConversion(source, "donut", {});
  assert.notEqual(converted, source);
  assert.deepEqual(converted.presentation.series, {
    colors: ["#043BCB", "#36BDEB"],
  });
  validateChartInstance(converted);
});

test("conversion reports and removes every series appearance leaf unsupported by the target", () => {
  const source = lineChart();
  source.typeId = "mixed";
  source.presentation.series = {
    colors: ["#043BCB", "#36BDEB"],
    lineWidth: 2.5,
    barWidth: 18.5,
  };
  const assignments = {
    value: { field: "value" },
    time: {
      field: "reportedAt",
      interpretation: "temporal",
      format: "YYYY-MM-DD",
    },
  };
  const plan = planChartConversion(source, "kpi", assignments);

  assert.deepEqual(
    plan.removedSettings
      .map(({ path }) => path)
      .filter((path) => path.startsWith("presentation.series."))
      .sort(),
    [
      "presentation.series.barWidth",
      "presentation.series.colors",
      "presentation.series.lineWidth",
    ],
  );
  const converted = applyChartConversion(source, "kpi", assignments);
  assert.notEqual(converted, source);
  assert.equal(Object.hasOwn(converted.presentation, "series"), false);
  validateChartInstance(converted);
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
  Object.defineProperty(hostileOptions, "value", {
    enumerable: true,
    get() {
      optionReads += 1;
      return {};
    },
  });
  assert.throws(
    () => applyChartConversion(chart, "area", hostileOptions),
    /value.*data property/i,
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
    /role assignments must be a plain object/i,
  );
});
