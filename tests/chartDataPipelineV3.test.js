import assert from "node:assert/strict";
import test from "node:test";

import { prepareChartData } from "../src/charting/data/prepareChartData.js";
import { profileDataset } from "../src/charting/data/profileDataset.js";

function profiled(rows, metadata = {}) {
  return profileDataset(rows, metadata);
}

function chart(typeId, roles, transformations = []) {
  return { typeId, roles, transformations };
}

test("ready means the adapter receives at least one renderable mark", () => {
  const rows = [{ date: "02/05/2027", age: "total_deaths", deaths: "2590" }];
  const result = prepareChartData({
    chart: chart("bar", {
      measurements: [{ field: "deaths", label: "Deaths" }],
      observation: { field: "date" },
      cluster: { field: "age" },
    }),
    rows,
    datasetProfile: profiled(rows, {
      date: { interpretation: "temporal", format: "DD/MM/YYYY", timezone: "date-only" },
    }),
  });

  assert.equal(result.status, "ready");
  assert.equal(result.marks[0].x, "2027-05-02");
  assert.equal(result.meta.markCount, 1);
});

test("missing required roles and incompatible field types block readiness", () => {
  const rows = [{ category: "North", value: "not-a-number" }];
  const result = prepareChartData({
    chart: chart("bar", {
      measurements: { field: "value" },
      observation: [{ field: "category" }, { field: "category" }],
    }),
    rows,
    datasetProfile: profiled(rows),
  });

  assert.equal(result.status, "blocked");
  assert.deepEqual(
    result.diagnostics.filter(({ severity }) => severity === "error").map(({ code }) => code).sort(),
    ["invalid-role-cardinality", "role-field-type"],
  );
  assert.equal(result.meta.markCount, 0);
});

test("filters run before grouping and cluster keys cannot collide", () => {
  const rows = [
    { month: "May", region: "North", scenario: "A", value: 2 },
    { month: "May", region: "North", scenario: "B", value: 3 },
    { month: "May", region: "South", scenario: "A", value: 9 },
  ];
  const result = prepareChartData({
    chart: chart("groupedBar", {
      measurements: { field: "value" },
      observation: { field: "month" },
      cluster: { field: "scenario" },
    }, [
      { type: "filter", field: "region", operator: "in", values: ["North"] },
    ]),
    rows,
    datasetProfile: profiled(rows, { month: { interpretation: "category" } }),
  });

  assert.equal(result.status, "ready");
  assert.deepEqual(result.marks.map(({ value }) => value), [2, 3]);
  assert.equal(new Set(result.marks.map(({ clusterKey }) => clusterKey)).size, 2);
  assert.equal(result.meta.rowsAfterFilters, 2);
});

test("duplicate resolution appears only when complete role keys collide", () => {
  const duplicateRows = [
    { month: "May", region: "North", value: 2 },
    { month: "May", region: "North", value: 3 },
    { month: "May", region: "South", value: 4 },
  ];
  const result = prepareChartData({
    chart: chart("groupedBar", {
      measurements: { field: "value" },
      observation: { field: "month" },
      cluster: { field: "region" },
    }, [
      { type: "duplicates", strategy: "aggregate" },
      { type: "aggregate", method: "sum" },
    ]),
    rows: duplicateRows,
    datasetProfile: profiled(duplicateRows),
  });

  assert.equal(result.meta.duplicateGroupCount, 1);
  assert.deepEqual(result.marks.map(({ value }) => value), [5, 4]);
  assert.ok(result.diagnostics.some(({ code }) => code === "duplicate-observations"));

  const unique = prepareChartData({
    chart: chart("groupedBar", {
      measurements: { field: "value" },
      observation: { field: "month" },
      cluster: { field: "region" },
    }, [{ type: "duplicates", strategy: "aggregate" }]),
    rows: duplicateRows.slice(1),
    datasetProfile: profiled(duplicateRows),
  });
  assert.equal(unique.meta.duplicateGroupCount, 0);
  assert.ok(!unique.diagnostics.some(({ code }) => code === "duplicate-observations"));
});

test("duplicate aggregation is explicit and unresolved collisions block rendering", () => {
  const rows = [{ category: "A", value: 2 }, { category: "A", value: 3 }];
  const result = prepareChartData({
    chart: chart("bar", {
      measurements: { field: "value" },
      observation: { field: "category" },
    }),
    rows,
    datasetProfile: profiled(rows),
  });

  assert.equal(result.status, "blocked");
  assert.ok(result.diagnostics.some(({ code }) => code === "duplicate-resolution-required"));
  assert.equal(result.meta.markCount, 0);
});

test("axis marks retain measurement, cluster, label, and primary or secondary axis metadata", () => {
  const rows = [{ period: "May", region: "North", cases: 20, rate: 4.5, note: "Observed" }];
  const result = prepareChartData({
    chart: chart("mixed", {
      measurements: [
        { field: "cases", label: "Cases" },
        { field: "rate", label: "Rate", axis: "secondary" },
      ],
      observation: { field: "period" },
      cluster: { field: "region" },
      label: { field: "note" },
    }),
    rows,
    datasetProfile: profiled(rows),
  });

  assert.deepEqual(result.meta.axes, {
    primary: ["cases"],
    secondary: ["rate"],
  });
  assert.deepEqual(result.marks.map(({ measure, axis, label }) => [measure, axis, label]), [
    ["cases", "primary", "Observed"],
    ["rate", "secondary", "Observed"],
  ]);
});

test("missing-value strategies distinguish gaps, zeroes, and dropped observations", () => {
  const rows = [{ period: "May", value: "" }, { period: "June", value: 4 }];
  const input = {
    chart: chart("bar", {
      measurements: { field: "value" },
      observation: { field: "period" },
    }),
    rows,
    datasetProfile: profiled(rows, { value: { interpretation: "numeric" } }),
  };

  const gap = prepareChartData({ ...input, chart: { ...input.chart, transformations: [{ type: "missing", strategy: "gap" }] } });
  const zero = prepareChartData({ ...input, chart: { ...input.chart, transformations: [{ type: "missing", strategy: "zero" }] } });
  const drop = prepareChartData({ ...input, chart: { ...input.chart, transformations: [{ type: "missing", strategy: "drop" }] } });

  assert.deepEqual(gap.marks.map(({ value }) => value), [null, 4]);
  assert.deepEqual(zero.marks.map(({ value }) => value), [0, 4]);
  assert.deepEqual(drop.marks.map(({ value }) => value), [4]);
  assert.equal(gap.status, "ready");
});

test("composition and relationship families emit canonical renderer marks", () => {
  const pieRows = [{ kind: "Cases", count: 3 }, { kind: "Deaths", count: 1 }];
  const pie = prepareChartData({
    chart: chart("donut", { category: { field: "kind" }, value: { field: "count" } }),
    rows: pieRows,
    datasetProfile: profiled(pieRows),
  });
  assert.deepEqual(pie.marks, [
    { category: "Cases", value: 3, share: 0.75 },
    { category: "Deaths", value: 1, share: 0.25 },
  ]);

  const scatterRows = [{ incidence: 2, mortality: 1, population: 50, place: "North", group: "Urban" }];
  const scatter = prepareChartData({
    chart: chart("bubble", {
      x: { field: "incidence" },
      y: { field: "mortality" },
      size: { field: "population" },
      label: { field: "place" },
      cluster: { field: "group" },
    }),
    rows: scatterRows,
    datasetProfile: profiled(scatterRows),
  });
  assert.deepEqual(scatter.marks[0], {
    x: 2, y: 1, size: 50, label: "North", cluster: "Urban", clusterKey: "string:Urban",
  });
});

test("relationship duplicate metadata appears only for identical point-role keys", () => {
  const rows = [
    { x: 1, y: 2, size: 3, label: "A" },
    { x: 1, y: 2, size: 4, label: "A" },
    { x: 1, y: 2, size: 5, label: "B" },
  ];
  const result = prepareChartData({
    chart: chart("bubble", {
      x: { field: "x" },
      y: { field: "y" },
      size: { field: "size" },
      label: { field: "label" },
    }, [
      { type: "duplicates", strategy: "aggregate" },
      { type: "aggregate", method: "sum" },
    ]),
    rows,
    datasetProfile: profiled(rows),
  });

  assert.equal(result.meta.duplicateGroupCount, 1);
  assert.deepEqual(result.marks.map(({ label, size }) => [label, size]), [["A", 7], ["B", 5]]);
});

test("matrix and timeline families normalize temporal fields in their canonical marks", () => {
  const matrixRows = [{ facility: "Clinic", indicator: "PPE", score: 3, at: "02/05/2027" }];
  const metadata = { at: { interpretation: "temporal", format: "DD/MM/YYYY" } };
  const matrix = prepareChartData({
    chart: chart("readinessMatrix", {
      row: { field: "facility" },
      column: { field: "indicator" },
      value: { field: "score" },
      time: { field: "at" },
    }),
    rows: matrixRows,
    datasetProfile: profiled(matrixRows, metadata),
  });
  assert.deepEqual(matrix.marks[0], {
    row: "Clinic", column: "PPE", value: 3, time: "2027-05-02",
  });

  const timelineRows = [{ event: "Deploy", start: "02/05/2027", end: "03/05/2027", lane: "Ops", status: "Done" }];
  const timeline = prepareChartData({
    chart: chart("swimlane", {
      event: { field: "event" },
      start: { field: "start" },
      end: { field: "end" },
      lane: { field: "lane" },
      status: { field: "status" },
    }),
    rows: timelineRows,
    datasetProfile: profiled(timelineRows, {
      start: { interpretation: "temporal", format: "DD/MM/YYYY" },
      end: { interpretation: "temporal", format: "DD/MM/YYYY" },
    }),
  });
  assert.deepEqual(timeline.marks[0], {
    event: "Deploy", start: "2027-05-02", end: "2027-05-03", lane: "Ops", status: "Done",
  });
});

test("KPI, gauge, and bullet targets emit their complete renderer values", () => {
  const statusRows = [{ at: "2027-05-02", actual: 8, target: 10 }];
  const profile = profiled(statusRows);
  const kpi = prepareChartData({
    chart: chart("kpi", { value: { field: "actual" }, target: { field: "target" }, time: { field: "at" } }),
    rows: statusRows,
    datasetProfile: profile,
  });
  const gauge = prepareChartData({
    chart: chart("gauge", { value: { field: "actual" }, target: { field: "target" }, time: { field: "at" } }),
    rows: statusRows,
    datasetProfile: profile,
  });
  const bullet = prepareChartData({
    chart: chart("bullet", { actual: { field: "actual" }, target: { field: "target" } }),
    rows: statusRows,
    datasetProfile: profile,
  });

  assert.deepEqual(kpi.marks[0], { value: 8, target: 10, time: "2027-05-02" });
  assert.deepEqual(gauge.marks[0], { value: 8, target: 10, time: "2027-05-02" });
  assert.deepEqual(bullet.marks[0], { actual: 8, target: 10, label: null, time: null });
});

test("delta card reports displayed, comparison, absolute, and percentage values", () => {
  const rows = [{ at: "2027-05-01", value: 8 }, { at: "2027-05-02", value: 10 }];
  const result = prepareChartData({
    chart: chart("deltaCard", {
      measurement: { field: "value" },
      time: { field: "at" },
    }),
    rows,
    datasetProfile: profiled(rows),
  });

  assert.equal(result.marks[0].displayed, 10);
  assert.equal(result.marks[0].comparison, 8);
  assert.deepEqual(result.marks[0].delta, { absolute: 2, percentage: 25 });
});

test("target marks apply shared missing-value behavior before readiness", () => {
  const rows = [{ value: "" }];
  const profile = profiled(rows, { value: { interpretation: "numeric" } });
  const zero = prepareChartData({
    chart: chart("kpi", { value: { field: "value" } }, [{ type: "missing", strategy: "zero" }]),
    rows,
    datasetProfile: profile,
  });
  const drop = prepareChartData({
    chart: chart("kpi", { value: { field: "value" } }, [{ type: "missing", strategy: "drop" }]),
    rows,
    datasetProfile: profile,
  });

  assert.equal(zero.status, "ready");
  assert.equal(zero.marks[0].value, 0);
  assert.equal(drop.status, "empty");
  assert.deepEqual(drop.marks, []);
});

test("target readiness requires every schema-required canonical value", () => {
  const deltaRows = [{ at: "invalid", value: 8 }, { at: "also invalid", value: 10 }];
  const delta = prepareChartData({
    chart: chart("deltaCard", {
      measurement: { field: "value" },
      time: { field: "at" },
    }),
    rows: deltaRows,
    datasetProfile: profiled(deltaRows, { at: { interpretation: "temporal" } }),
  });
  assert.equal(delta.status, "empty");

  const bulletRows = [{ actual: 8, target: "" }];
  const bullet = prepareChartData({
    chart: chart("bullet", {
      actual: { field: "actual" },
      target: { field: "target" },
    }),
    rows: bulletRows,
    datasetProfile: profiled(bulletRows, { target: { interpretation: "numeric" } }),
  });
  assert.equal(bullet.status, "empty");
});

test("a delta needs both displayed and comparison measurements to be renderer-ready", () => {
  const rows = [{ at: "2027-05-01", value: "" }, { at: "2027-05-02", value: 10 }];
  const result = prepareChartData({
    chart: chart("deltaCard", {
      measurement: { field: "value" },
      time: { field: "at" },
    }),
    rows,
    datasetProfile: profiled(rows, { value: { interpretation: "numeric" } }),
  });

  assert.equal(result.status, "empty");
  assert.equal(result.meta.renderableMarkCount, 0);
});

test("delta lists compare the latest two observations independently per entity", () => {
  const rows = [
    { at: "2027-05-01", entity: "A", value: 5 },
    { at: "2027-05-02", entity: "A", value: 10 },
    { at: "2027-05-01", entity: "B", value: 8 },
    { at: "2027-05-02", entity: "B", value: 4 },
  ];
  const result = prepareChartData({
    chart: chart("deltaList", {
      measurement: { field: "value" },
      entity: { field: "entity" },
      time: { field: "at" },
    }),
    rows,
    datasetProfile: profiled(rows),
  });

  assert.deepEqual(result.marks.map(({ entity, displayed, comparison, delta }) => ({ entity, displayed, comparison, delta })), [
    { entity: "A", displayed: 10, comparison: 5, delta: { absolute: 5, percentage: 100 } },
    { entity: "B", displayed: 4, comparison: 8, delta: { absolute: -4, percentage: -50 } },
  ]);
});

test("geography marks preserve canonical identifiers, time, and supplied feature metadata", () => {
  const rows = [{ district: "GE-TB", value: 7, at: "2027-05-02" }];
  const result = prepareChartData({
    chart: chart("chronoChoroplethMap", {
      geography: { field: "district" },
      value: { field: "value" },
      time: { field: "at" },
    }),
    rows,
    datasetProfile: profiled(rows, { district: { interpretation: "geographic" } }),
    geography: { featuresById: { "GE-TB": { name: "Tbilisi" } } },
  });

  assert.deepEqual(result.marks[0], {
    geography: "GE-TB", value: 7, time: "2027-05-02", feature: { name: "Tbilisi" },
  });
});

test("table and image operational charts produce canonical rows and image marks", () => {
  const rows = [{ facility: "Clinic", score: 3, hidden: "x" }];
  const table = prepareChartData({
    chart: chart("table", { columns: [{ field: "facility" }, { field: "score" }] }),
    rows,
    datasetProfile: profiled(rows),
  });
  assert.deepEqual(table.marks[0], {
    values: { facility: "Clinic", score: 3 },
    columns: ["facility", "score"],
    time: null,
  });

  const imageRows = [{ src: "/map.png", alt: "Response map", fit: "contain" }];
  const image = prepareChartData({
    chart: chart("image", {}),
    rows: imageRows,
    datasetProfile: profiled(imageRows),
  });
  assert.deepEqual(image.marks[0], { src: "/map.png", alt: "Response map", fit: "contain" });
});

test("readiness never reports ready when every candidate mark is non-renderable", () => {
  const rows = [{ category: "A", value: "" }];
  const result = prepareChartData({
    chart: chart("bar", {
      measurements: { field: "value" },
      observation: { field: "category" },
    }, [{ type: "missing", strategy: "drop" }]),
    rows,
    datasetProfile: profiled(rows, { value: { interpretation: "numeric" } }),
  });

  assert.equal(result.status, "empty");
  assert.equal(result.meta.markCount, 0);
  assert.deepEqual(result.marks, []);
  assert.ok(result.diagnostics.some(({ code }) => code === "no-renderable-marks"));
});

test("a mark with an unparseable required coordinate is not renderer-ready", () => {
  const rows = [{ date: "May someday", value: 4 }];
  const result = prepareChartData({
    chart: chart("line", {
      measurements: { field: "value" },
      observation: { field: "date" },
    }),
    rows,
    datasetProfile: profiled(rows, { date: { interpretation: "temporal" } }),
  });

  assert.equal(result.status, "empty");
  assert.equal(result.meta.renderableMarkCount, 0);
});

test("optional time context scopes rows using profile-confirmed canonical dates", () => {
  const rows = [
    { at: "01/05/2027", category: "A", value: 1 },
    { at: "02/05/2027", category: "A", value: 2 },
  ];
  const result = prepareChartData({
    chart: chart("bar", {
      measurements: { field: "value" },
      observation: { field: "category" },
    }),
    rows,
    datasetProfile: profiled(rows, { at: { interpretation: "temporal", format: "DD/MM/YYYY" } }),
    timeContext: { field: "at", start: "2027-05-02", end: "2027-05-02" },
  });

  assert.equal(result.status, "ready");
  assert.deepEqual(result.marks.map(({ value }) => value), [2]);
  assert.equal(result.meta.rowsAfterTimeContext, 1);
});
