import assert from "node:assert/strict";
import test from "node:test";
import { register } from "node:module";

import Papa from "papaparse";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  validateChartInstance,
} from "../src/charting/config/chartConfigV3.js";
import {
  parseDashboardBundle,
  serializeDashboardBundle,
  validateDashboardConfig,
} from "../src/charting/config/dashboardBundleV3.js";
import { prepareChartData } from "../src/charting/data/prepareChartData.js";
import { profileDataset } from "../src/charting/data/profileDataset.js";
import { buildRenderModel } from "../src/charting/rendering/buildRenderModel.js";
import { getChartSchema } from "../src/charting/schemas/chartSchemaRegistry.js";

register(`data:text/javascript,${encodeURIComponent(`
export async function load(url, context, nextLoad) {
  if (url.endsWith(".jsx")) {
    const loaded = await nextLoad(url, { ...context, format: "module" });
    return { format: "module", source: loaded.source, shortCircuit: true };
  }
  return nextLoad(url, context);
}
`)}`, import.meta.url);

const { default: ChartView } = await import("../src/components/charts/ChartView.jsx");
const { default: CardChartView } = await import("../src/components/charts/CardChartView.jsx");
const { default: EChartsChartView, createEChartsLifecycle } = await import("../src/components/charts/EChartsChartView.jsx");
const { default: ImageChartView } = await import("../src/components/charts/ImageChartView.jsx");
const { default: TableChartView } = await import("../src/components/charts/TableChartView.jsx");

function transformations(overrides = {}) {
  return {
    filters: [],
    grouping: null,
    aggregation: null,
    duplicates: null,
    missingValues: "gap",
    ...overrides,
  };
}

function configuredChart(typeId, roles, overrides = {}) {
  const schema = getChartSchema(typeId);
  return {
    configVersion: 3,
    id: `chart-${typeId}`,
    typeId,
    title: `${schema.label} title`,
    description: `${schema.label} description`,
    sourceId: `source-${typeId}`,
    roles,
    transformations: transformations(
      schema.comparison
        ? { comparison: { mode: schema.comparison.defaultMode } }
        : {},
    ),
    presentation: {
      title: { align: "left" },
      collection: null,
    },
    interaction: {
      zoom: { enabled: false },
      timeSync: null,
    },
    layout: { size: "standard" },
    ...overrides,
  };
}

function dashboardFor(chart, source) {
  return {
    configVersion: 3,
    id: "integration-dashboard",
    title: "Integration dashboard",
    timezone: "UTC",
    dataSources: { [chart.sourceId]: source },
    pages: [{
      id: "overview",
      sections: [{ id: "core", panels: [chart] }],
    }],
  };
}

function roundTripDashboard(dashboard) {
  return parseDashboardBundle(JSON.stringify(serializeDashboardBundle(dashboard, {
    now: "2026-07-26T12:00:00.000Z",
  })));
}

function sourceRows(source) {
  if (source.kind === "inline") return source.rows;
  return Papa.parse(source.csvText, { header: true, skipEmptyLines: true }).data;
}

test("canonical object transformations and DD/MM bindings survive a bundle-to-ECharts round trip", () => {
  const chart = configuredChart("line", {
    measurements: [{ field: "cases", interpretation: "number", axis: "primary" }],
    observation: {
      field: "reportedAt",
      interpretation: "temporal",
      format: "DD/MM/YYYY",
      timezone: "date-only",
    },
  }, {
    transformations: transformations({
      filters: [{ field: "region", operator: "equals", value: "North" }],
      grouping: ["scenario"],
      aggregation: "mean",
      duplicates: "aggregate",
      missingValues: "zero",
    }),
  });
  const dashboard = dashboardFor(chart, {
    kind: "dataset",
    type: "uploadedCsv",
    fileName: "cases.csv",
    csvText: [
      "reportedAt,region,scenario,cases",
      "02/05/2027,North,Base,2",
      "02/05/2027,North,Base,4",
      "03/05/2027,North,Base,",
      "02/05/2027,South,Base,100",
    ].join("\n"),
    parsingMetadata: {
      reportedAt: {
        interpretation: "temporal",
        format: "DD/MM/YYYY",
        timezone: "date-only",
      },
      cases: { interpretation: "numeric" },
    },
  });
  dashboard.timeSyncGroups = [{
    id: "outbreak",
    name: "Outbreak playback",
    period: { start: "2027-05-02", end: "2027-05-03" },
    matching: { policy: "exact" },
    secondsPerFrame: 1,
    members: [{
      chartId: chart.id,
      timeRole: "observation",
    }],
  }];

  const parsed = roundTripDashboard(dashboard);
  const parsedChart = parsed.pages[0].sections[0].panels[0];
  const parsedSource = parsed.dataSources[parsedChart.sourceId];
  const rows = sourceRows(parsedSource);
  const datasetProfile = profileDataset(rows, parsedSource.parsingMetadata);
  const prepared = prepareChartData({ chart: parsedChart, rows, datasetProfile });
  const model = buildRenderModel({ chart: parsedChart, prepared, datasetProfile });
  const html = renderToStaticMarkup(React.createElement(ChartView, {
    chart: parsedChart,
    rows,
    datasetProfile,
  }));

  assert.equal(prepared.status, "ready");
  assert.deepEqual(
    prepared.marks.map(({ x, value, group }) => [x, value, group]),
    [["2027-05-02", 3, "Base"], ["2027-05-03", 0, "Base"]],
  );
  assert.equal(prepared.meta.rowsAfterFilters, 3);
  assert.equal(prepared.meta.duplicateGroupCount, 1);
  assert.equal(model.option.xAxis.type, "time");
  assert.deepEqual(model.option.series[0].data, [
    ["2027-05-02", 3],
    ["2027-05-03", 0],
  ]);
  assert.doesNotMatch(html, /chart-status-error/);
});

test("array-shaped transformations are invalid in the version 3 preparation contract", () => {
  const rows = [{ category: "A", value: 4 }];
  const result = prepareChartData({
    chart: {
      typeId: "bar",
      roles: {
        measurements: { field: "value" },
        observation: { field: "category" },
      },
      transformations: [{ type: "missing", strategy: "zero" }],
    },
    rows,
    datasetProfile: profileDataset(rows),
  });

  assert.equal(result.status, "invalid");
  assert.ok(result.diagnostics.some(({ code }) => code === "invalid-transformations"));
});

test("an explicit category binding wins over a date-shaped field and stays categorical downstream", () => {
  const chart = configuredChart("line", {
    measurements: [{ field: "value", interpretation: "number" }],
    observation: { field: "date", interpretation: "category" },
  });
  const dashboard = dashboardFor(chart, {
    kind: "dataset",
    type: "uploadedCsv",
    fileName: "category.csv",
    csvText: "date,value\n02/05/2027,4\n",
  });

  const parsed = roundTripDashboard(dashboard);
  const parsedChart = parsed.pages[0].sections[0].panels[0];
  const source = parsed.dataSources[parsedChart.sourceId];
  const rows = sourceRows(source);
  const datasetProfile = profileDataset(rows, source.parsingMetadata);
  const prepared = prepareChartData({ chart: parsedChart, rows, datasetProfile });
  const model = buildRenderModel({ chart: parsedChart, prepared, datasetProfile });

  assert.equal(prepared.status, "ready");
  assert.equal(prepared.marks[0].x, "02/05/2027");
  assert.equal(prepared.meta.axisInterpretation, "category");
  assert.equal(model.option.xAxis.type, "category");
  assert.deepEqual(model.option.xAxis.data, ["02/05/2027"]);
});

test("filters use the role binding's explicit category interpretation", () => {
  const rows = [
    { date: "02/05/2027", value: 4 },
    { date: "03/05/2027", value: 6 },
  ];
  const chart = {
    typeId: "line",
    roles: {
      measurements: { field: "value" },
      observation: { field: "date", interpretation: "category" },
    },
    transformations: transformations({
      filters: [{ field: "date", operator: "equals", value: "02/05/2027" }],
    }),
  };
  const prepared = prepareChartData({
    chart,
    rows,
    datasetProfile: profileDataset(rows),
  });

  assert.equal(prepared.status, "ready");
  assert.deepEqual(prepared.marks.map(({ x, value }) => [x, value]), [["02/05/2027", 4]]);
  assert.equal(prepared.meta.axisInterpretation, "category");
});

test("dashboard transformation fields and typed filter operands fail actionably", () => {
  const chart = configuredChart("bar", {
    measurements: [{ field: "value", interpretation: "number" }],
    observation: { field: "at", interpretation: "temporal", format: "DD/MM/YYYY" },
  });
  const source = {
    kind: "dataset",
    type: "uploadedCsv",
    fileName: "values.csv",
    csvText: "at,value,group\n02/05/2027,4,A\n",
    parsingMetadata: {
      at: { interpretation: "temporal", format: "DD/MM/YYYY" },
      value: { interpretation: "numeric" },
    },
  };

  for (const [mutate, message] of [
    [(candidate) => { candidate.transformations.filters = [{ field: "typo", operator: "equals", value: "A" }]; }, /filter field "typo".*source/i],
    [(candidate) => { candidate.transformations.grouping = ["typo"]; }, /grouping field "typo".*source/i],
    [(candidate) => { candidate.transformations.filters = [{ field: "value", operator: "equals", value: "not numeric" }]; }, /filter.*value.*numeric/i],
    [(candidate) => { candidate.transformations.filters = [{ field: "at", operator: "equals", value: "31\/02\/2027" }]; }, /filter.*at.*temporal/i],
  ]) {
    const candidate = structuredClone(chart);
    mutate(candidate);
    assert.throws(() => validateDashboardConfig(dashboardFor(candidate, source)), message);
  }
});

test("preparation reports invalid typed operands instead of silently returning no rows", () => {
  const rows = [{ category: "A", value: 4 }];
  const prepared = prepareChartData({
    chart: {
      typeId: "bar",
      roles: {
        measurements: { field: "value" },
        observation: { field: "category" },
      },
      transformations: transformations({
        filters: [{ field: "value", operator: "equals", value: "not numeric" }],
      }),
    },
    rows,
    datasetProfile: profileDataset(rows),
  });

  assert.equal(prepared.status, "invalid");
  assert.equal(prepared.meta.rowsAfterFilters, 1);
  assert.ok(prepared.diagnostics.some(({ code, field }) => (
    code === "filter-operand-invalid" && field === "value"
  )));
});

test("raw GeoJSON FeatureCollections join choropleths by the configured field", () => {
  const chart = configuredChart("choroplethMap", {
    geography: { field: "district", interpretation: "geographic" },
    value: { field: "value", interpretation: "number" },
  }, {
    presentation: {
      title: { align: "left" },
      collection: null,
      map: { geoSource: "district-map", joinField: "code" },
    },
  });
  const source = {
    kind: "dataset",
    type: "uploadedCsv",
    fileName: "districts.csv",
    csvText: "district,value\nGE-TB,7\n",
    parsingMetadata: {
      district: { interpretation: "geographic" },
      value: { interpretation: "numeric" },
    },
  };
  const geoData = {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      id: "tbilisi-feature",
      properties: { code: "GE-TB", name: "Tbilisi" },
      geometry: {
        type: "Polygon",
        coordinates: [[[44, 41], [45, 41], [45, 42], [44, 42], [44, 41]]],
      },
    }],
  };

  const parsed = roundTripDashboard(dashboardFor(chart, source));
  const parsedChart = parsed.pages[0].sections[0].panels[0];
  const rows = sourceRows(parsed.dataSources[parsedChart.sourceId]);
  const datasetProfile = profileDataset(rows, source.parsingMetadata);
  const prepared = prepareChartData({ chart: parsedChart, rows, datasetProfile, geoData });
  const model = buildRenderModel({ chart: parsedChart, prepared, geoData });

  assert.equal(prepared.status, "ready");
  assert.equal(prepared.marks[0].feature.properties.name, "Tbilisi");
  assert.equal(model.option.series[0].data[0].name, "GE-TB");
  assert.deepEqual(model.mapRegistration.geoJson, geoData);
});

test("unmatched geography identifies the semantic join field and blocks rendering", () => {
  const rows = [{ district: "UNKNOWN", value: 7 }];
  const chart = {
    typeId: "choroplethMap",
    roles: {
      geography: { field: "district", interpretation: "geographic" },
      value: { field: "value", interpretation: "number" },
    },
    transformations: transformations(),
    presentation: {
      map: { geoSource: "district-map", joinField: "code" },
    },
  };
  const result = prepareChartData({
    chart,
    rows,
    datasetProfile: profileDataset(rows, {
      district: { interpretation: "geographic" },
      value: { interpretation: "number" },
    }),
    geoData: {
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        properties: { code: "GE-TB" },
        geometry: { type: "Point", coordinates: [44.79, 41.72] },
      }],
    },
  });

  assert.equal(result.status, "invalid");
  assert.ok(result.diagnostics.some(({ code, fieldId }) => (
    code === "geography-join-unmatched" && fieldId === "geoJoinField"
  )));
});

test("raw GeoJSON point features make map-scatter renderer-ready", () => {
  const rows = [{ district: "GE-TB", value: 7 }];
  const chart = {
    id: "map-scatter",
    typeId: "mapScatter",
    title: "Sites",
    roles: {
      geography: { field: "district", interpretation: "geographic" },
      value: { field: "value", interpretation: "number" },
    },
    transformations: transformations(),
    presentation: {
      map: { geoSource: "district-map", joinField: "code" },
    },
    interaction: { zoom: { enabled: false } },
  };
  const geoData = {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      properties: { code: "GE-TB", name: "Tbilisi" },
      geometry: { type: "Point", coordinates: [44.79, 41.72] },
    }],
  };
  const prepared = prepareChartData({
    chart,
    rows,
    datasetProfile: profileDataset(rows, {
      district: { interpretation: "geographic" },
      value: { interpretation: "number" },
    }),
    geoData,
  });
  const model = buildRenderModel({ chart, prepared, geoData });

  assert.equal(prepared.status, "ready");
  assert.deepEqual(prepared.marks[0].coordinates, [44.79, 41.72]);
  assert.deepEqual(model.option.series[0].data[0].value, [44.79, 41.72, 7]);
  assert.equal(model.mapRegistration.geoJson.features.length, 1);
});

test("every duplicate arithmetic strategy uses its advertised method", () => {
  const rows = [{ category: "A", value: 2 }, { category: "A", value: 4 }, { category: "A", value: 9 }];
  const datasetProfile = profileDataset(rows);
  const expected = new Map([
    ["sum", 15],
    ["mean", 5],
    ["average", 5],
    ["min", 2],
    ["max", 9],
    ["count", 3],
  ]);

  for (const [duplicates, value] of expected) {
    const prepared = prepareChartData({
      chart: {
        typeId: "bar",
        roles: {
          measurements: { field: "value" },
          observation: { field: "category" },
        },
        transformations: transformations({ duplicates }),
      },
      rows,
      datasetProfile,
    });
    assert.equal(prepared.status, "ready", duplicates);
    assert.equal(prepared.marks[0].value, value, duplicates);
  }
});

for (const [duplicates, aggregation] of [
  ["first", "sum"],
  [null, "sum"],
  ["error", "count"],
]) {
  test(`duplicate strategy ${duplicates ?? "null"} rejects unused ${aggregation} aggregation`, () => {
    const base = configuredChart("bar", {
      measurements: [{ field: "value", interpretation: "number" }],
      observation: { field: "category", interpretation: "category" },
    });
    assert.throws(
      () => validateChartInstance({
        ...base,
        transformations: transformations({ duplicates, aggregation }),
      }),
      /duplicate strategy.*does not use aggregation|aggregation.*requires.*duplicate strategy/i,
    );
  });
}

test("duplicate and aggregation controls preserve supported shorthand and aggregate relationships", () => {
  const base = configuredChart("bar", {
    measurements: [{ field: "value", interpretation: "number" }],
    observation: { field: "category", interpretation: "category" },
  });
  for (const relationship of [
    { duplicates: "sum" },
    { duplicates: "mean", aggregation: "mean" },
    { duplicates: "average", aggregation: "mean" },
    { duplicates: "aggregate", aggregation: "sum" },
  ]) {
    assert.doesNotThrow(
      () => validateChartInstance({
        ...base,
        transformations: transformations(relationship),
      }),
      JSON.stringify(relationship),
    );
  }
  assert.throws(
    () => validateChartInstance({
      ...base,
      transformations: transformations({ duplicates: "aggregate" }),
    }),
    /aggregate.*explicit.*aggregation/i,
  );
  assert.throws(
    () => validateChartInstance({
      ...base,
      transformations: transformations({ duplicates: "mean", aggregation: "sum" }),
    }),
    /conflicting.*duplicate.*aggregation/i,
  );
});

const arithmeticDuplicateOutcomes = new Map([
  ["sum", 15],
  ["mean", 5],
  ["average", 5],
  ["min", 2],
  ["max", 9],
  ["count", 3],
]);

for (const duplicates of [null, "error", "first", "last", ...arithmeticDuplicateOutcomes.keys()]) {
  test(`explicit undefined aggregation is invalid for duplicate strategy ${duplicates ?? "null"}`, () => {
    const rows = [
      { category: "keep", value: 2 },
      { category: "drop", value: 3 },
    ];
    const instance = configuredChart("bar", {
      measurements: [{ field: "value", interpretation: "number" }],
      observation: { field: "category", interpretation: "category" },
    }, {
      transformations: {
        filters: [{ field: "category", operator: "equals", value: "keep" }],
        grouping: null,
        aggregation: undefined,
        duplicates,
        missingValues: "gap",
      },
    });

    assert.throws(
      () => validateChartInstance(instance),
      /unsupported aggregation "undefined"/i,
      duplicates ?? "null",
    );

    const prepared = prepareChartData({
      chart: instance,
      rows,
      datasetProfile: profileDataset(rows),
    });
    assert.equal(prepared.status, "invalid", duplicates ?? "null");
    assert.deepEqual(prepared.marks, [], duplicates ?? "null");
    assert.equal(prepared.meta.renderableMarkCount, 0, duplicates ?? "null");
    assert.equal(prepared.meta.rowsAfterFilters, rows.length, duplicates ?? "null");
    assert.ok(
      prepared.diagnostics.some(({ code, severity }) => (
        code === "invalid-aggregation" && severity === "error"
      )),
      JSON.stringify(prepared.diagnostics),
    );
  });
}

test("arithmetic duplicate shorthand may literally omit the aggregation property", () => {
  const rows = [
    { category: "A", value: 2 },
    { category: "A", value: 4 },
    { category: "A", value: 9 },
  ];

  for (const [duplicates, expected] of arithmeticDuplicateOutcomes) {
    const instance = configuredChart("bar", {
      measurements: [{ field: "value", interpretation: "number" }],
      observation: { field: "category", interpretation: "category" },
    }, {
      transformations: {
        filters: [],
        grouping: null,
        duplicates,
        missingValues: "gap",
      },
    });

    assert.doesNotThrow(
      () => validateChartInstance(instance),
      duplicates,
    );
    const prepared = prepareChartData({
      chart: instance,
      rows,
      datasetProfile: profileDataset(rows),
    });
    assert.equal(prepared.status, "ready", duplicates);
    assert.equal(prepared.marks[0].value, expected, duplicates);
  }
});

test("aggregate duplicate strategy accepts only explicit arithmetic methods", () => {
  const base = configuredChart("bar", {
    measurements: [{ field: "value", interpretation: "number" }],
    observation: { field: "category", interpretation: "category" },
  });
  for (const aggregation of ["first", "last"]) {
    assert.throws(
      () => validateChartInstance({
        ...base,
        transformations: {
          filters: [],
          grouping: null,
          aggregation,
          duplicates: "aggregate",
          missingValues: "gap",
        },
      }),
      /aggregate.*explicit.*arithmetic aggregation/i,
      aggregation,
    );
  }
  for (const aggregation of ["sum", "mean", "average", "min", "max", "count"]) {
    assert.doesNotThrow(
      () => validateChartInstance({
        ...base,
        transformations: {
          filters: [],
          grouping: null,
          aggregation,
          duplicates: "aggregate",
          missingValues: "gap",
        },
      }),
      aggregation,
    );
  }
});

test("all declared presentation subshapes reject malformed values before rendering", () => {
  const cases = [
    ["axes", { primary: "value axis" }],
    ["axes", { primary: { min: "zero" } }],
    ["targets", { ranges: "0-100" }],
    ["targets", { ranges: [{ max: "high" }] }],
    ["targets", { direction: "sideways" }],
    ["map", { scale: 4 }],
    ["map", { geoSource: [] }],
    ["map", { joinField: {} }],
    ["timeline", { lanes: "Operations" }],
    ["timeline", { marker: 7 }],
    ["background", { color: {} }],
    ["background", { transparent: "yes" }],
    ["legend", { visible: "yes" }],
    ["legend", { position: "corner" }],
    ["accessibility", { description: 4 }],
    ["accessibility", { summary: [] }],
    ["referenceLine", { visible: "yes" }, "reference line"],
    ["referenceLine", { visible: true }, "reference line.*finite value"],
    ["referenceLine", { value: "five" }, "reference line"],
    ["referenceLine", { color: "red" }, "reference line"],
    ["referenceLine", { lineStyle: "wavy" }, "reference line"],
  ];

  for (const [key, value, expected = key] of cases) {
    const chart = configuredChart("line", {
      measurements: [{ field: "value" }],
      observation: { field: "category" },
    });
    chart.presentation[key] = value;
    assert.throws(() => validateChartInstance(chart), new RegExp(expected, "i"), `${key}: ${JSON.stringify(value)}`);
  }

  const area = configuredChart("area", {
    measurements: [{ field: "value" }],
    observation: { field: "category" },
  });
  area.presentation.referenceLine = { visible: true, value: 5 };
  assert.throws(
    () => validateChartInstance(area),
    /does not support a reference line/i,
  );
});

test("former chart-local temporal matching locations are rejected", () => {
  for (const policy of ["exact", "lastKnown", "nearest"]) {
    const chart = configuredChart("line", {
      measurements: [{ field: "value" }],
      observation: { field: "at", interpretation: "temporal" },
    }, {
      transformations: transformations({ temporalMatch: { policy } }),
    });
    assert.throws(
      () => validateChartInstance(chart),
      /unknown chart transformations property "temporalMatch"/i,
      policy,
    );
  }

  const timeSync = configuredChart("line", {
    measurements: [{ field: "value" }],
    observation: { field: "at", interpretation: "temporal" },
  }, {
    interaction: {
      zoom: { enabled: false },
      timeSync: { groupId: "outbreak", policy: "nearest" },
    },
  });
  assert.throws(
    () => validateChartInstance(timeSync),
    /unknown chart time synchronization property "policy"/i,
  );
});

test("delta cards expose favorable semantics without losing exact observation times", () => {
  const rows = [{ at: "2027-05-01", value: 8 }, { at: "2027-05-02", value: 10 }];
  const chart = {
    id: "supply-delta",
    typeId: "deltaCard",
    title: "Supply delta",
    roles: {
      measurement: { field: "value" },
      time: { field: "at", interpretation: "temporal" },
    },
    transformations: transformations({
      comparison: { mode: "previousObservation" },
    }),
    presentation: {
      title: { align: "left" },
      collection: null,
      targets: { direction: "decrease-is-good" },
    },
  };
  const prepared = prepareChartData({ chart, rows, datasetProfile: profileDataset(rows) });
  const model = buildRenderModel({ chart, prepared });

  assert.equal(model.items[0].direction, "increase");
  assert.equal(model.items[0].favorability, "unfavorable");
  assert.equal(model.items[0].time, "2027-05-02");
  assert.equal(model.items[0].comparisonTime, "2027-05-01");
});

test("target collection capabilities and identity roles match each chart type", () => {
  assert.equal(getChartSchema("deltaCard").capabilities.collection, false);
  assert.equal(getChartSchema("deltaList").capabilities.collection, true);
  for (const typeId of ["kpi", "gauge", "bullet"]) {
    assert.ok(getChartSchema(typeId).roles.some(({ id }) => id === "entity" || id === "label"), typeId);
  }

  const rows = [
    { entity: "Clinic A", at: "2027-05-02", value: 8 },
    { entity: "Clinic B", at: "2027-05-02", value: 6 },
  ];
  const chart = {
    id: "kpi-collection",
    typeId: "kpi",
    title: "Clinic capacity",
    roles: {
      value: { field: "value" },
      entity: { field: "entity" },
      time: { field: "at" },
    },
    transformations: transformations(),
    presentation: {
      title: { align: "left" },
      collection: {
        layout: "fixed",
        rows: 1,
        columns: 2,
        gap: 16,
        overflow: "manualPages",
        ranking: { mode: "fixed" },
        carousel: {
          intervalMs: 10000,
          loop: true,
          pauseOnHover: true,
          transition: "none",
        },
        playback: {
          rerank: true,
          pauseCarousel: true,
        },
      },
    },
  };
  const prepared = prepareChartData({ chart, rows, datasetProfile: profileDataset(rows) });
  const model = buildRenderModel({ chart, prepared });

  assert.equal(prepared.status, "ready");
  assert.equal(prepared.meta.duplicateGroupCount, 0);
  assert.deepEqual(prepared.marks.map(({ entity }) => entity), ["Clinic A", "Clinic B"]);
  assert.deepEqual(model.items.map(({ key, label }) => [key, label]), [
    ["Clinic A", "Clinic A"],
    ["Clinic B", "Clinic B"],
  ]);
});

test("preparation uses only ready, invalid, and empty statuses", () => {
  const invalid = prepareChartData({
    chart: { typeId: "kpi", roles: {}, transformations: transformations() },
    rows: [],
    datasetProfile: profileDataset([]),
  });
  const empty = prepareChartData({
    chart: {
      typeId: "kpi",
      roles: { value: { field: "value" } },
      transformations: transformations({ missingValues: "drop" }),
    },
    rows: [{ value: "" }],
    datasetProfile: profileDataset([{ value: "" }], { value: { interpretation: "number" } }),
  });
  const ready = prepareChartData({
    chart: {
      typeId: "kpi",
      roles: { value: { field: "value" } },
      transformations: transformations(),
    },
    rows: [{ value: 4 }],
    datasetProfile: profileDataset([{ value: 4 }]),
  });

  assert.deepEqual([invalid.status, empty.status, ready.status], ["invalid", "empty", "ready"]);
});

test("image preparation rejects multiple manual rows instead of selecting the first", () => {
  const rows = [
    { src: "/one.png", alt: "One", fit: "contain" },
    { src: "/two.png", alt: "Two", fit: "contain" },
  ];
  const result = prepareChartData({
    chart: { typeId: "image", roles: {}, transformations: transformations() },
    rows,
    datasetProfile: profileDataset(rows),
  });

  assert.equal(result.status, "invalid");
  assert.ok(result.diagnostics.some(({ code }) => code === "image-row-count"));
});

test("ECharts models carry bounded family-aware accessibility rows, never raw records", () => {
  const cases = [
    {
      family: "axis",
      chart: { typeId: "bar", title: "Cases" },
      marks: [{ x: "May", value: 4, measure: "cases", measureLabel: "Cases", axis: "primary" }],
      expected: { series: "Cases", category: "May", value: 4 },
    },
    {
      family: "composition",
      chart: { typeId: "pie", title: "Share" },
      marks: [{ category: "Ready", value: 3, share: 0.75 }],
      expected: { category: "Ready", value: 3, share: 0.75 },
    },
    {
      family: "timeline",
      chart: { typeId: "timeline", title: "Events" },
      marks: [{ event: "Deploy", start: "2027-05-01", end: null, lane: null, status: "Planned" }],
      expected: { event: "Deploy", start: "2027-05-01", end: null, lane: null, state: "Planned" },
    },
    {
      family: "geography",
      chart: { id: "map", typeId: "choroplethMap", title: "Map" },
      marks: [{
        geography: "GE-TB",
        value: 7,
        time: null,
        feature: {
          type: "Feature",
          properties: { code: "GE-TB", secret: "must-not-leak" },
          geometry: { type: "Point", coordinates: [44.79, 41.72] },
        },
      }],
      expected: { geography: "GE-TB", value: 7, time: null, state: "joined" },
    },
    {
      family: "target",
      chart: { typeId: "gauge", title: "Capacity" },
      marks: [{ entity: "Clinic A", value: 8, target: 10, time: "2027-05-02" }],
      expected: { label: "Clinic A", actual: 8, target: 10, time: "2027-05-02" },
    },
  ];

  for (const { family, chart, marks, expected } of cases) {
    const model = buildRenderModel({
      chart: {
        presentation: { title: { align: "left" }, collection: null },
        interaction: { zoom: { enabled: false } },
        ...chart,
      },
      prepared: { status: "ready", marks, diagnostics: [], meta: { dataFamily: family } },
      renderContext: { accessibilityEnabled: true },
    });
    assert.equal(model.accessibility.family, family);
    assert.deepEqual(model.accessibility.rows[0], expected);
    assert.ok(model.accessibility.rows.length <= 50);
    assert.doesNotMatch(JSON.stringify(model.accessibility), /must-not-leak|geometry|properties/);
  }
});

test("ECharts runtime failures are reported once and clean up partial state", () => {
  const errors = [];
  const calls = [];
  const lifecycle = createEChartsLifecycle({
    echartsApi: {
      getInstanceByDom() { return null; },
      init() {
        return {
          setOption() { throw new Error("setOption failed"); },
          dispose() { calls.push("dispose"); },
        };
      },
      registerMap() {},
    },
    windowTarget: {
      addEventListener() {},
      removeEventListener() { calls.push("remove"); },
    },
    ResizeObserverCtor: class {
      observe() {}
      disconnect() { calls.push("disconnect"); }
    },
    onError(error) { errors.push(error.message); },
  });

  lifecycle.mount({});
  lifecycle.update({ option: { series: [] } });
  lifecycle.dispose();

  assert.deepEqual(errors, ["setOption failed"]);
  assert.deepEqual(calls, ["disconnect", "remove", "dispose"]);
});

test("map registration failures transition through the same bounded runtime error path", () => {
  const errors = [];
  let setOptionCalls = 0;
  const lifecycle = createEChartsLifecycle({
    echartsApi: {
      getInstanceByDom() { return null; },
      init() {
        return {
          setOption() { setOptionCalls += 1; },
          dispose() {},
        };
      },
      registerMap() { throw new Error("map registration failed"); },
    },
    windowTarget: { addEventListener() {}, removeEventListener() {} },
    ResizeObserverCtor: null,
    onError(error) { errors.push(error.message); },
  });

  lifecycle.mount({});
  lifecycle.update({
    mapRegistration: {
      name: "regions",
      geoJson: { type: "FeatureCollection", features: [] },
    },
    option: { series: [] },
  });

  assert.deepEqual(errors, ["map registration failed"]);
  assert.equal(setOptionCalls, 0);
});

test("a runtime ECharts error replaces misleading summaries with a bounded accessible status", () => {
  const html = renderToStaticMarkup(React.createElement(EChartsChartView, {
    chart: { title: "Runtime chart" },
    model: { option: { series: [{ data: [1] }] } },
    runtimeError: new Error(`render failed ${"x".repeat(400)}`),
  }));

  assert.match(html, /chart-status-error/);
  assert.match(html, /role="status"/);
  assert.match(html, /render failed/);
  assert.doesNotMatch(html, /data is available|plotted value/i);
  assert.ok(html.length < 420);
});

test("custom and ECharts views honor left, center, and right title alignment without visible duplication", () => {
  for (const align of ["left", "center", "right"]) {
    const chart = { title: "Aligned title", presentation: { title: { align } } };
    const card = renderToStaticMarkup(React.createElement(CardChartView, {
      chart,
      model: { items: [] },
    }));
    const table = renderToStaticMarkup(React.createElement(TableChartView, {
      chart,
      model: { columns: [], rows: [], rowMetadata: [] },
    }));
    const image = renderToStaticMarkup(React.createElement(ImageChartView, {
      chart,
      model: { src: "/map.png", alt: "Map", fit: "contain" },
    }));
    const echarts = renderToStaticMarkup(React.createElement(EChartsChartView, {
      chart,
      model: { option: { title: { text: "Aligned title", left: align }, series: [] } },
      accessibilityEnabled: true,
    }));

    for (const html of [card, table, image, echarts]) {
      assert.match(html, new RegExp(`data-title-align="${align}"`), `${align}: ${html}`);
    }
    assert.match(echarts, /chart-view-title--visually-hidden/);
    assert.equal((echarts.match(/Aligned title/g) ?? []).length, 1);
  }
});

test("all 26 validated chart types remain reachable through bundle, profile, prepare, render, and SSR", () => {
  const axis = {
    rows: [{ category: "May", value: 4 }],
    roles: {
      measurements: [{ field: "value" }],
      observation: { field: "category", interpretation: "category" },
    },
  };
  const fixtures = {
    bar: axis,
    groupedBar: axis,
    stackedBar: axis,
    horizontalBar: axis,
    horizontalStackedBar: axis,
    line: axis,
    area: axis,
    mixed: axis,
    pie: {
      rows: [{ category: "Ready", value: 4 }],
      roles: { category: { field: "category" }, value: { field: "value" } },
    },
    donut: {
      rows: [{ category: "Ready", value: 4 }],
      roles: { category: { field: "category" }, value: { field: "value" } },
    },
    kpi: {
      rows: [{ value: 4, note: "Current" }],
      roles: { value: { field: "value" } },
    },
    gauge: {
      rows: [{ value: 4, target: 5 }],
      roles: { value: { field: "value" }, target: { field: "target" } },
    },
    bullet: {
      rows: [{ label: "Clinic", actual: 4, target: 5 }],
      roles: {
        label: { field: "label" },
        actual: { field: "actual" },
        target: { field: "target" },
      },
    },
    deltaCard: {
      rows: [{ at: "2027-05-01", value: 3 }, { at: "2027-05-02", value: 4 }],
      roles: { measurement: { field: "value" }, time: { field: "at" } },
    },
    deltaList: {
      rows: [
        { entity: "Clinic", at: "2027-05-01", value: 3 },
        { entity: "Clinic", at: "2027-05-02", value: 4 },
      ],
      roles: {
        measurement: { field: "value" },
        entity: { field: "entity" },
        time: { field: "at" },
      },
    },
    scatter: {
      rows: [{ x: 1, y: 2 }],
      roles: { x: { field: "x" }, y: { field: "y" } },
    },
    bubble: {
      rows: [{ x: 1, y: 2, size: 3 }],
      roles: { x: { field: "x" }, y: { field: "y" }, size: { field: "size" } },
    },
    heatmap: {
      rows: [{ row: "Clinic", column: "Power", value: 3 }],
      roles: {
        row: { field: "row" },
        column: { field: "column" },
        value: { field: "value" },
      },
    },
    readinessMatrix: {
      rows: [{ row: "Clinic", column: "Power", value: 3 }],
      roles: {
        row: { field: "row" },
        column: { field: "column" },
        value: { field: "value" },
      },
    },
    timeline: {
      rows: [{ event: "Deploy", start: "2027-05-01" }],
      roles: { event: { field: "event" }, start: { field: "start" } },
    },
    swimlane: {
      rows: [{ event: "Deploy", start: "2027-05-01", lane: "Operations" }],
      roles: {
        event: { field: "event" },
        start: { field: "start" },
        lane: { field: "lane" },
      },
    },
    choroplethMap: {
      rows: [{ district: "GE-TB", value: 4 }],
      roles: { geography: { field: "district" }, value: { field: "value" } },
      parsingMetadata: { district: { interpretation: "geographic" } },
      map: true,
    },
    chronoChoroplethMap: {
      rows: [{ district: "GE-TB", value: 4, at: "2027-05-01" }],
      roles: {
        geography: { field: "district" },
        value: { field: "value" },
        time: { field: "at" },
      },
      parsingMetadata: { district: { interpretation: "geographic" } },
      map: true,
    },
    mapScatter: {
      rows: [{ district: "GE-TB", value: 4 }],
      roles: { geography: { field: "district" }, value: { field: "value" } },
      parsingMetadata: { district: { interpretation: "geographic" } },
      map: true,
    },
    table: {
      rows: [{ facility: "Clinic", score: 4 }],
      roles: { columns: [{ field: "facility" }, { field: "score" }] },
    },
    image: {
      rows: [{ src: "/map.png", alt: "Response map", fit: "contain" }],
      roles: {},
      inline: true,
    },
  };
  const dataSources = {};
  const panels = [];
  for (const [typeId, fixture] of Object.entries(fixtures)) {
    const sourceId = `source-${typeId}`;
    dataSources[sourceId] = fixture.inline
      ? { kind: "inline", rows: fixture.rows, parsingMetadata: fixture.parsingMetadata ?? {} }
      : {
          kind: "dataset",
          type: "uploadedCsv",
          fileName: `${typeId}.csv`,
          csvText: Papa.unparse(fixture.rows),
          parsingMetadata: fixture.parsingMetadata ?? {},
        };
    const configured = configuredChart(typeId, fixture.roles, {
      presentation: {
        title: { align: "center" },
        collection: null,
        ...(fixture.map ? { map: { geoSource: "district-map", joinField: "code" } } : {}),
      },
    });
    panels.push(configured);
  }
  const dashboard = roundTripDashboard({
    configVersion: 3,
    id: "capability-matrix",
    title: "Capability matrix",
    dataSources,
    pages: [{ id: "all", sections: [{ id: "all-types", panels }] }],
  });
  const geoData = {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      id: "GE-TB",
      properties: { code: "GE-TB", name: "Tbilisi" },
      geometry: { type: "Point", coordinates: [44.79, 41.72] },
    }],
  };
  const expectedKinds = {
    kpi: "cards",
    deltaCard: "cards",
    deltaList: "cards",
    table: "table",
    image: "image",
  };

  const reachability = [];
  for (const chart of dashboard.pages[0].sections[0].panels) {
    const source = dashboard.dataSources[chart.sourceId];
    const rows = sourceRows(source);
    const datasetProfile = profileDataset(rows, source.parsingMetadata);
    const prepared = prepareChartData({ chart, rows, datasetProfile, geoData });
    const model = buildRenderModel({ chart, prepared, datasetProfile, geoData });
    const html = renderToStaticMarkup(React.createElement(ChartView, {
      chart,
      rows,
      datasetProfile,
      geoData,
      accessibilityEnabled: true,
      renderContext: { accessibilityEnabled: true },
    }));
    reachability.push([
      chart.typeId,
      prepared.status,
      model.kind,
      !html.includes("chart-status-error"),
    ]);
    assert.equal(prepared.status, "ready", chart.typeId);
    assert.equal(model.kind, expectedKinds[chart.typeId] ?? "echarts", chart.typeId);
    assert.doesNotMatch(html, /chart-status-error/, chart.typeId);
    assert.match(html, new RegExp(chart.title), chart.typeId);
  }

  assert.equal(reachability.length, 26);
  assert.deepEqual(reachability.map(([typeId]) => typeId), Object.keys(fixtures));
});
