import assert from "node:assert/strict";
import test from "node:test";

import * as echarts from "echarts";

import { buildRenderModel } from "../src/charting/rendering/buildRenderModel.js";
import { getRenderAdapter } from "../src/charting/rendering/renderAdapterRegistry.js";

function chart(typeId, overrides = {}) {
  return {
    id: `chart-${typeId}`,
    typeId,
    title: `${typeId} title`,
    description: `${typeId} description`,
    roles: {},
    presentation: {
      title: { align: "left" },
      collection: null,
      ...(overrides.presentation ?? {}),
    },
    interaction: {
      zoom: { enabled: false },
      ...(overrides.interaction ?? {}),
    },
    ...overrides,
  };
}

function ready(marks, meta = {}) {
  return {
    status: "ready",
    marks,
    diagnostics: [],
    meta,
  };
}

function renderSvg(option, width = 640, height = 400) {
  const instance = echarts.init(null, null, { renderer: "svg", ssr: true, width, height });
  try {
    instance.setOption(option);
    return instance.renderToSVGString();
  } finally {
    instance.dispose();
  }
}

const axisMarks = ready([
  { x: "May", value: 4, measure: "cases", measureLabel: "Cases", cluster: "North", clusterKey: "North", group: "Base", groupKey: "Base", axis: "primary", label: null },
  { x: "June", value: 6, measure: "cases", measureLabel: "Cases", cluster: "North", clusterKey: "North", group: "Base", groupKey: "Base", axis: "primary", label: null },
  { x: "May", value: 2, measure: "rate", measureLabel: "Rate", cluster: "North", clusterKey: "North", group: "Base", groupKey: "Base", axis: "secondary", label: null },
  { x: "June", value: 3, measure: "rate", measureLabel: "Rate", cluster: "North", clusterKey: "North", group: "Base", groupKey: "Base", axis: "secondary", label: null },
], { axes: { primary: ["cases"], secondary: ["rate"] } });

test("the registry exposes every schema renderer and rejects unknown adapters", () => {
  for (const renderer of ["axis", "composition", "relationship", "matrix", "timeline", "target", "geography", "operational"]) {
    assert.equal(typeof getRenderAdapter(renderer), "function");
  }
  assert.throws(() => getRenderAdapter("missing"), /Unknown render adapter "missing"/);
});

test("bar variants preserve canonical series, groups, stacking, and orientation", () => {
  const bar = buildRenderModel({ chart: chart("bar"), prepared: axisMarks });
  const grouped = buildRenderModel({ chart: chart("groupedBar"), prepared: axisMarks });
  const stacked = buildRenderModel({ chart: chart("stackedBar"), prepared: axisMarks });
  const horizontal = buildRenderModel({ chart: chart("horizontalBar"), prepared: axisMarks });
  const horizontalStacked = buildRenderModel({ chart: chart("horizontalStackedBar"), prepared: axisMarks });

  assert.equal(bar.kind, "echarts");
  assert.equal(bar.option.series[0].type, "bar");
  assert.match(bar.option.series[0].name, /Cases.*North.*Base/);
  assert.deepEqual(grouped.option.xAxis.data, ["May", "June"]);
  assert.equal(grouped.option.series.length, 2);
  assert.equal(stacked.option.series[0].stack, "total");
  assert.equal(horizontal.option.xAxis.type, "value");
  assert.equal(horizontal.option.yAxis.type, "category");
  assert.equal(horizontalStacked.option.series[0].stack, "total");
});

test("line, area, and mixed options preserve axis types and primary or secondary axes", () => {
  const line = buildRenderModel({
    chart: chart("line", {
      roles: { observation: { field: "period", interpretation: "temporal" } },
    }),
    prepared: ready([
      { x: "2027-05-01", value: 4, measure: "cases", measureLabel: "Cases", cluster: null, clusterKey: "", group: null, groupKey: "", axis: "primary" },
      { x: "2027-05-02", value: 6, measure: "cases", measureLabel: "Cases", cluster: null, clusterKey: "", group: null, groupKey: "", axis: "primary" },
    ]),
  });
  const area = buildRenderModel({ chart: chart("area"), prepared: axisMarks });
  const mixed = buildRenderModel({ chart: chart("mixed"), prepared: axisMarks });

  assert.equal(line.option.xAxis.type, "time");
  assert.deepEqual(line.option.series[0].data[0], ["2027-05-01", 4]);
  assert.equal(area.option.series[0].type, "line");
  assert.deepEqual(area.option.series[0].areaStyle, { opacity: 0.24 });
  assert.equal(mixed.option.yAxis.length, 2);
  assert.equal(mixed.option.series.find(({ name }) => name.startsWith("Cases")).type, "bar");
  assert.equal(mixed.option.series.find(({ name }) => name.startsWith("Rate")).type, "line");
  assert.equal(mixed.option.series.find(({ name }) => name.startsWith("Rate")).yAxisIndex, 1);
});

test("title alignment and ctrl-wheel-compatible zoom are normalized into ECharts options", () => {
  const model = buildRenderModel({
    chart: chart("line", {
      presentation: { title: { align: "center" }, collection: null },
      interaction: { zoom: { enabled: true } },
    }),
    prepared: axisMarks,
  });

  assert.equal(model.option.title.left, "center");
  assert.deepEqual(model.option.dataZoom.map(({ type }) => type), ["inside", "slider"]);
  assert.equal(model.option.dataZoom[0].zoomOnMouseWheel, "ctrl");
});

test("axis series honor validated label visibility, position, and formatting", () => {
  const enabled = buildRenderModel({
    chart: chart("bar", {
      presentation: {
        title: { align: "left" },
        collection: null,
        labels: { visible: true, position: "insideTop", format: "{c} units" },
      },
    }),
    prepared: axisMarks,
  });
  const disabled = buildRenderModel({
    chart: chart("line", {
      presentation: {
        title: { align: "left" },
        collection: null,
        labels: { visible: false },
      },
    }),
    prepared: axisMarks,
  });

  assert.deepEqual(enabled.option.series[0].label, {
    show: true,
    position: "insideTop",
    formatter: "{c} units",
  });
  assert.deepEqual(disabled.option.series[0].label, {
    show: false,
    position: "top",
    formatter: undefined,
  });
});

test("forced category dates never become an ECharts time axis", () => {
  const model = buildRenderModel({
    chart: chart("line", {
      roles: { observation: { field: "date", interpretation: "category" } },
    }),
    prepared: ready([
      { x: "2027-05-01", value: 4, measure: "value", measureLabel: "Value", clusterKey: "", groupKey: "", axis: "primary" },
    ]),
  });

  assert.equal(model.option.xAxis.type, "category");
  assert.deepEqual(model.option.xAxis.data, ["2027-05-01"]);
});

test("field-only observations use the canonical dataset profile interpretation", () => {
  const model = buildRenderModel({
    chart: chart("line", {
      roles: { observation: { field: "recorded_at" } },
    }),
    prepared: ready([
      { x: "2027-05-01", value: 4, measure: "value", measureLabel: "Value", clusterKey: "", groupKey: "", axis: "primary" },
    ]),
    datasetProfile: {
      columns: [{ name: "recorded_at", type: "temporal" }],
    },
  });

  assert.equal(model.option.xAxis.type, "time");
});

test("pie and donut produce actual ECharts pie series from canonical marks", () => {
  const prepared = ready([
    { category: "Cases", value: 3, share: 0.75, group: null, groupKey: "" },
    { category: "Deaths", value: 1, share: 0.25, group: null, groupKey: "" },
  ]);
  const pie = buildRenderModel({ chart: chart("pie"), prepared });
  const donut = buildRenderModel({ chart: chart("donut"), prepared });

  assert.equal(pie.option.series[0].type, "pie");
  assert.equal(pie.option.series[0].radius[0], "0%");
  assert.notEqual(donut.option.series[0].radius[0], "0%");
  assert.deepEqual(pie.option.series[0].data[0], { name: "Cases", value: 3, share: 0.75 });
});

test("grouped composition lays out non-overlapping pie series", () => {
  const model = buildRenderModel({
    chart: chart("pie"),
    prepared: ready([
      { category: "Alpha", value: 3, share: 0.6, group: "North", groupKey: "North" },
      { category: "Other North", value: 2, share: 0.4, group: "North", groupKey: "North" },
      { category: "Beta", value: 4, share: 0.8, group: "South", groupKey: "South" },
      { category: "Other South", value: 1, share: 0.2, group: "South", groupKey: "South" },
    ]),
  });

  assert.deepEqual(model.option.series.map(({ center }) => center), [
    ["25%", "50%"],
    ["75%", "50%"],
  ]);
  const svg = renderSvg(model.option, 800, 400);
  assert.match(svg, /Alpha/);
  assert.match(svg, /Beta/);
});

test("scatter and bubble encode canonical relationship marks and clusters", () => {
  const prepared = ready([
    { x: 2, y: 5, size: 12, label: "Clinic A", cluster: "North", clusterKey: "North", group: null, groupKey: "" },
    { x: 4, y: 7, size: 30, label: "Clinic B", cluster: "South", clusterKey: "South", group: null, groupKey: "" },
  ]);
  const scatter = buildRenderModel({ chart: chart("scatter"), prepared });
  const bubble = buildRenderModel({ chart: chart("bubble"), prepared });

  assert.equal(scatter.option.series[0].type, "scatter");
  assert.deepEqual(scatter.option.series[0].data[0].value, [2, 5]);
  assert.equal(scatter.option.series.length, 2);
  assert.equal(typeof bubble.option.series[0].symbolSize, "function");
  assert.deepEqual(bubble.option.series[0].data[0].value, [2, 5, 12]);
});

test("heatmap and readiness matrix create category grids with continuous or discrete scales", () => {
  const prepared = ready([
    { row: "Clinic A", column: "Power", value: 2, time: null, group: null, groupKey: "" },
    { row: "Clinic B", column: "Power", value: 1, time: null, group: null, groupKey: "" },
    { row: "Clinic A", column: "Water", value: 3, time: null, group: null, groupKey: "" },
  ]);
  const heatmap = buildRenderModel({ chart: chart("heatmap"), prepared });
  const readiness = buildRenderModel({ chart: chart("readinessMatrix"), prepared });

  assert.equal(heatmap.option.series[0].type, "heatmap");
  assert.deepEqual(heatmap.option.xAxis.data, ["Power", "Water"]);
  assert.deepEqual(heatmap.option.yAxis.data, ["Clinic A", "Clinic B"]);
  assert.deepEqual(heatmap.option.series[0].data[0].slice(0, 3), [0, 0, 2]);
  assert.equal(heatmap.option.visualMap.type, "continuous");
  assert.equal(readiness.option.visualMap.type, "piecewise");
  assert.deepEqual(readiness.option.visualMap.pieces.map(({ value }) => value), [1, 2, 3]);
});

test("timeline and swimlane encode canonical intervals on time axes and lanes", () => {
  const prepared = ready([
    { event: "Mobilize", start: "2027-05-01", end: "2027-05-03", lane: "Operations", status: "Active", group: null, groupKey: "" },
    { event: "Report", start: "2027-05-02", end: null, lane: "Planning", status: "Planned", group: null, groupKey: "" },
  ]);
  const timeline = buildRenderModel({ chart: chart("timeline"), prepared });
  const swimlane = buildRenderModel({ chart: chart("swimlane"), prepared });

  assert.equal(timeline.option.xAxis.type, "time");
  assert.deepEqual(timeline.option.yAxis.data, ["Events"]);
  assert.equal(timeline.option.series[0].type, "custom");
  assert.deepEqual(timeline.option.series[0].data[0].value.slice(0, 3), ["2027-05-01", "2027-05-03", "Events"]);
  assert.deepEqual(swimlane.option.yAxis.data, ["Operations", "Planning"]);
  assert.equal(swimlane.option.series[0].data[1].name, "Report");
});

test("timeline custom rendering reads and visibly renders the encoded event label", () => {
  const model = buildRenderModel({
    chart: chart("timeline"),
    prepared: ready([
      {
        event: "Mobilize Alpha",
        start: "2027-05-01",
        end: "2027-05-03",
        lane: null,
        status: "Active",
        group: null,
        groupKey: "",
      },
    ]),
  });

  assert.equal(model.option.series[0].data[0].value[4], "Mobilize Alpha");
  const svg = renderSvg(model.option);
  assert.match(svg, /Mobilize Alpha/);
});

test("gauge and bullet encode actual, target, and configured ranges", () => {
  const gauge = buildRenderModel({
    chart: chart("gauge", {
      presentation: { title: { align: "right" }, collection: null, targets: { ranges: [50, 80, 100] } },
    }),
    prepared: ready([{ value: 72, target: 80, time: "2027-05-02" }]),
  });
  const bullet = buildRenderModel({
    chart: chart("bullet"),
    prepared: ready([
      { actual: 8, target: 10, label: "Clinic A", time: null },
      { actual: 6, target: 9, label: "Clinic B", time: null },
    ]),
  });

  assert.equal(gauge.option.series[0].type, "gauge");
  assert.deepEqual(gauge.option.series[0].data[0], { value: 72, name: "gauge title", target: 80, time: "2027-05-02" });
  assert.equal(gauge.option.series[0].max, 100);
  assert.equal(gauge.option.title.left, "right");
  assert.equal(bullet.option.series[0].type, "bar");
  assert.deepEqual(bullet.option.series[0].data, [8, 6]);
  assert.equal(bullet.option.series[1].name, "Target");
  assert.deepEqual(bullet.option.series[1].data.map(({ value }) => value), [[10, "Clinic A"], [9, "Clinic B"]]);
});

test("multi-item gauges preserve every prepared mark in a deterministic collection layout", () => {
  const collection = { layout: "fixedGrid", rows: 1, columns: 2 };
  const model = buildRenderModel({
    chart: chart("gauge", {
      presentation: { title: { align: "left" }, collection },
    }),
    prepared: ready([
      { value: 72, target: 80, label: "Clinic A", time: "2027-05-02" },
      { value: 55, target: 70, entity: "Clinic B", time: "2027-05-03" },
    ]),
  });

  assert.equal(model.option.series.length, 2);
  assert.deepEqual(model.option.series.map(({ data }) => data[0]), [
    { value: 72, name: "Clinic A", target: 80, time: "2027-05-02" },
    { value: 55, name: "Clinic B", target: 70, time: "2027-05-03" },
  ]);
  assert.notDeepEqual(model.option.series[0].center, model.option.series[1].center);
  assert.deepEqual(model.presentation.collection, collection);

  const svg = renderSvg(model.option, 800, 400);
  assert.match(svg, />72</);
  assert.match(svg, />55</);
});

test("KPI, delta card, and delta list produce semantic card models", () => {
  const kpi = buildRenderModel({
    chart: chart("kpi"),
    prepared: ready([{ value: 72, target: 80, time: "2027-05-02" }]),
  });
  const deltaPrepared = ready([
    { entity: "Clinic A", displayed: 10, comparison: 8, target: 12, time: "2027-05-02", delta: { absolute: 2, percentage: 25 } },
    { entity: "Clinic B", displayed: 4, comparison: 8, target: 7, time: "2027-05-02", delta: { absolute: -4, percentage: -50 } },
  ]);
  const deltaCard = buildRenderModel({ chart: chart("deltaCard"), prepared: ready([deltaPrepared.marks[0]]) });
  const deltaList = buildRenderModel({
    chart: chart("deltaList", {
      presentation: { title: { align: "left" }, collection: { layout: "fixedGrid", rows: 1, columns: 2 } },
    }),
    prepared: deltaPrepared,
  });

  assert.equal(kpi.kind, "cards");
  assert.deepEqual(kpi.items[0], {
    key: "kpi-0",
    label: "kpi title",
    value: 72,
    target: 80,
    time: "2027-05-02",
    comparison: null,
    delta: null,
    direction: null,
  });
  assert.equal(deltaCard.items[0].direction, "increase");
  assert.deepEqual(deltaCard.items[0].delta, { absolute: 2, percentage: 25 });
  assert.deepEqual(deltaList.items.map(({ label, direction }) => [label, direction]), [
    ["Clinic A", "increase"],
    ["Clinic B", "decrease"],
  ]);
  assert.deepEqual(deltaList.presentation.collection, { layout: "fixedGrid", rows: 1, columns: 2 });
});

test("choropleth and chronological choropleth retain map feature metadata and time frames", () => {
  const prepared = ready([
    { geography: "GE-TB", value: 7, time: "2027-05-01", feature: { name: "Tbilisi", properties: { code: "GE-TB" } }, group: null, groupKey: "" },
    { geography: "GE-TB", value: 9, time: "2027-05-02", feature: { name: "Tbilisi", properties: { code: "GE-TB" } }, group: null, groupKey: "" },
    { geography: "GE-AJ", value: 4, time: "2027-05-02", feature: { name: "Adjara", properties: { code: "GE-AJ" } }, group: null, groupKey: "" },
  ]);
  const map = buildRenderModel({ chart: chart("choroplethMap"), prepared });
  const chronological = buildRenderModel({ chart: chart("chronoChoroplethMap"), prepared });

  assert.equal(map.option.series[0].type, "map");
  assert.equal(map.option.series[0].data[0].name, "GE-TB");
  assert.deepEqual(map.option.series[0].data[0].feature.properties, { code: "GE-TB" });
  assert.deepEqual(chronological.option.timeline.data, ["2027-05-01", "2027-05-02"]);
  assert.equal(chronological.option.options.length, 2);
  assert.deepEqual(chronological.option.options[1].series[0].data.map(({ name }) => name), ["GE-TB", "GE-AJ"]);
});

test("geography zoom remains pan-only until the host receives a Ctrl-wheel gesture", () => {
  const model = buildRenderModel({
    chart: chart("choroplethMap", {
      interaction: { zoom: { enabled: true } },
    }),
    prepared: ready([
      { geography: "GE-TB", value: 7, time: null, feature: { name: "Tbilisi" }, group: null, groupKey: "" },
    ]),
  });

  assert.equal(model.option.geo.roam, "move");
  assert.deepEqual(model.interaction, {
    zoom: { enabled: true, modifierKey: "Control", target: "geo" },
  });
});

test("choropleth joins series data through the configured feature property", () => {
  const feature = {
    type: "Feature",
    properties: { district_name: "Tbilisi", code: "GE-TB" },
    geometry: {
      type: "Polygon",
      coordinates: [[[44, 41], [45, 41], [45, 42], [44, 42], [44, 41]]],
    },
  };
  const model = buildRenderModel({
    chart: chart("choroplethMap", {
      presentation: {
        title: { align: "left" },
        collection: null,
        map: { geoSource: "georgia-districts", joinField: "district_name" },
      },
      interaction: { zoom: { enabled: true } },
    }),
    prepared: ready([
      { geography: "GE-TB", value: 7, time: null, feature, group: null, groupKey: "" },
    ]),
  });

  assert.equal(model.option.geo.nameProperty, "district_name");
  assert.equal(model.option.series[0].data[0].name, "Tbilisi");
  assert.deepEqual(model.mapRegistration, {
    name: "georgia-districts",
    source: "georgia-districts",
    joinField: "district_name",
    geoJson: { type: "FeatureCollection", features: [feature] },
  });

  echarts.registerMap(model.mapRegistration.name, model.mapRegistration.geoJson);
  const svg = renderSvg(model.option);
  assert.match(svg, /<svg/);
  assert.match(svg, /<path/);
});

test("map scatter uses only canonical feature coordinates and value metadata", () => {
  const prepared = ready([
    {
      geography: "GE-TB",
      value: 7,
      time: null,
      feature: { name: "Tbilisi", geometry: { type: "Point", coordinates: [44.79, 41.72] } },
      group: null,
      groupKey: "",
    },
  ]);
  const model = buildRenderModel({ chart: chart("mapScatter"), prepared });

  assert.equal(model.option.series[0].type, "scatter");
  assert.equal(model.option.series[0].coordinateSystem, "geo");
  assert.deepEqual(model.option.series[0].data[0].value, [44.79, 41.72, 7]);
  assert.equal(model.option.series[0].data[0].geography, "GE-TB");
});

test("map scatter derives polygon centroids and skips marks without coordinates", () => {
  const polygon = {
    type: "Feature",
    properties: { name: "Square" },
    geometry: {
      type: "Polygon",
      coordinates: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]],
    },
  };
  const multiPolygon = {
    type: "Feature",
    properties: { name: "Twin squares" },
    geometry: {
      type: "MultiPolygon",
      coordinates: [
        [[[10, 10], [12, 10], [12, 12], [10, 12], [10, 10]]],
        [[[14, 14], [16, 14], [16, 16], [14, 16], [14, 14]]],
      ],
    },
  };
  const model = buildRenderModel({
    chart: chart("mapScatter"),
    prepared: ready([
      { geography: "square", value: 5, time: null, feature: polygon, group: null, groupKey: "" },
      { geography: "twins", value: 9, time: null, feature: multiPolygon, group: null, groupKey: "" },
      { geography: "missing", value: 3, time: null, feature: { name: "No geometry" }, group: null, groupKey: "" },
    ]),
  });

  assert.deepEqual(model.option.series[0].data.map(({ value }) => value), [
    [1, 1, 5],
    [13, 13, 9],
  ]);
  assert.deepEqual(model.diagnostics, [{
    code: "map-scatter-coordinate-missing",
    severity: "warning",
    message: "Map point “missing” has no usable coordinate and was skipped.",
    geography: "missing",
  }]);
});

test("map scatter returns a bounded error when no mark has a coordinate", () => {
  const model = buildRenderModel({
    chart: chart("mapScatter"),
    prepared: ready([
      { geography: "missing", value: 3, time: null, feature: { name: "No geometry" }, group: null, groupKey: "" },
    ]),
  });

  assert.deepEqual(model, {
    kind: "error",
    message: "No map scatter marks have valid geographic coordinates.",
    diagnostics: [{
      code: "map-scatter-coordinate-missing",
      severity: "warning",
      message: "Map point “missing” has no usable coordinate and was skipped.",
      geography: "missing",
    }],
  });
  assert.ok(model.message.length <= 240);
});

test("table and image return semantic renderer-neutral models", () => {
  const table = buildRenderModel({
    chart: chart("table"),
    prepared: ready([
      { columns: ["facility", "score"], values: { facility: "Clinic", score: 3 }, time: "2027-05-02" },
      { columns: ["facility", "score"], values: { facility: "Hospital", score: 5 }, time: null },
    ]),
  });
  const image = buildRenderModel({
    chart: chart("image"),
    prepared: ready([{ src: "/map.png", alt: "Response map", fit: "contain" }]),
  });

  assert.equal(table.kind, "table");
  assert.deepEqual(table.columns, [
    { key: "facility", label: "facility" },
    { key: "score", label: "score" },
  ]);
  assert.deepEqual(table.rows[0], { facility: "Clinic", score: 3 });
  assert.deepEqual(table.rowMetadata, [
    { time: "2027-05-02" },
    { time: null },
  ]);
  assert.deepEqual(image, { kind: "image", src: "/map.png", alt: "Response map", fit: "contain" });
});

test("non-ready input produces a bounded error model with the first diagnostic", () => {
  const longMessage = `Invalid binding ${"x".repeat(500)}`;
  const blocked = buildRenderModel({
    chart: chart("bar"),
    prepared: { status: "blocked", marks: [], diagnostics: [{ severity: "error", message: longMessage }], meta: {} },
  });
  const empty = buildRenderModel({
    chart: chart("bar"),
    prepared: { status: "empty", marks: [], diagnostics: [], meta: {} },
  });

  assert.equal(blocked.kind, "error");
  assert.match(blocked.message, /^Invalid binding/);
  assert.ok(blocked.message.length <= 240);
  assert.deepEqual(empty, { kind: "error", message: "No renderer-ready chart data is available." });
});

test("adapters neither consume raw rows nor mutate chart or prepared inputs", () => {
  const sourceChart = chart("bar");
  const sourcePrepared = ready([
    { x: "A", value: 2, measure: "value", measureLabel: "Value", clusterKey: "", groupKey: "", axis: "primary" },
  ]);
  const chartBefore = structuredClone(sourceChart);
  const preparedBefore = structuredClone(sourcePrepared);
  const poisonedRows = new Proxy([], {
    get() {
      throw new Error("raw rows must not be read by render adapters");
    },
  });

  const model = buildRenderModel({ chart: sourceChart, prepared: sourcePrepared, rows: poisonedRows });

  assert.equal(model.kind, "echarts");
  assert.deepEqual(sourceChart, chartBefore);
  assert.deepEqual(sourcePrepared, preparedBefore);
});
