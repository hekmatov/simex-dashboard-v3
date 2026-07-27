import assert from "node:assert/strict";
import test from "node:test";
import { register } from "node:module";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { profileDataset } from "../src/charting/data/profileDataset.js";

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
const { default: TableChartView } = await import("../src/components/charts/TableChartView.jsx");

const deltaRows = [
  { capacity: 8, observed: "2027-05-01" },
  { capacity: 10, observed: "2027-05-02" },
];

const deltaCard = {
  id: "capacity-change",
  typeId: "deltaCard",
  title: "Current capacity",
  description: "Latest capacity compared with the previous observation.",
  roles: {
    measurement: { field: "capacity" },
    time: { field: "observed" },
  },
  transformations: {
    filters: [],
    grouping: [],
    aggregation: null,
    duplicates: null,
    missingValues: "gap",
    comparison: { mode: "previousObservation" },
  },
  presentation: { collection: null, labels: null, accessibility: null },
  interaction: { zoom: { enabled: false } },
};

test("card render models expose labels, values, deltas, and provenance", () => {
  const html = renderToStaticMarkup(
    React.createElement(ChartView, {
      chart: deltaCard,
      rows: deltaRows,
      datasetProfile: profileDataset(deltaRows, { observed: { interpretation: "temporal" } }),
    }),
  );

  assert.match(html, /Current capacity/);
  assert.match(html, /\+2/);
  assert.match(html, /Comparison source/);
  assert.match(html, /Observed 2027-05-01/);
});

test("delta cards render the exact resolved comparison time rather than a raw-row guess", () => {
  const rows = [
    { at: "2027-05-03", value: 10 },
    { at: "2027-05-02", value: "" },
    { at: "2027-05-01", value: 2 },
    { at: "2027-05-01", value: 3 },
  ];
  const html = renderToStaticMarkup(React.createElement(ChartView, {
    chart: {
      ...deltaCard,
      roles: { measurement: { field: "value" }, time: { field: "at" } },
      transformations: {
        filters: [],
        grouping: null,
        aggregation: "sum",
        duplicates: "aggregate",
        missingValues: "drop",
        comparison: { mode: "previousObservation" },
      },
    },
    rows,
    datasetProfile: profileDataset(rows, { at: { interpretation: "temporal" } }),
  }));

  assert.match(html, /Comparison source/);
  assert.match(html, /Observed 2027-05-01/);
  assert.doesNotMatch(html, /Comparison source Observed 2027-05-02/);
});

test("invalid prepared data renders a bounded chart error", () => {
  const html = renderToStaticMarkup(
    React.createElement(ChartView, { chart: { typeId: "kpi", title: "Capacity", roles: {} }, rows: [] }),
  );

  assert.match(html, /chart-status-error/);
  assert.match(html, /role/i);
  assert.match(html, /role="status"/);
  assert.match(html, /aria-live="polite"/);
  assert.ok(html.length < 240);

  const fallback = renderToStaticMarkup(
    React.createElement(ChartView, { chart: { typeId: "unknown-chart-type", title: "Ignored", roles: {} }, rows: [] }),
  );
  assert.equal(fallback, '<div class="chart-status-error" role="status" aria-live="polite">This chart cannot be displayed.</div>');
  assert.ok(fallback.length <= 240);
});

test("table render models retain headers, values, observation time, and provenance", () => {
  const rows = [{ facility: "Clinic A", score: 7, observed: "2027-05-02" }];
  const html = renderToStaticMarkup(React.createElement(ChartView, {
    chart: {
      typeId: "table",
      title: "Facility readiness",
      sourceId: "readiness-register",
      roles: { columns: [{ field: "facility" }, { field: "score" }], time: { field: "observed" } },
    },
    rows,
    datasetProfile: profileDataset(rows, { observed: { interpretation: "temporal" } }),
    renderContext: {
      sources: { "readiness-register": { provenance: { label: "Readiness register", capturedAt: "2027-05-02" } } },
    },
  }));

  assert.match(html, /scope="col">facility/);
  assert.match(html, /Clinic A/);
  assert.match(html, /aria-label="Observed 2027-05-02"/);
  assert.match(html, /Source: Readiness register/);
  assert.match(html, /Captured: 2027-05-02/);
});

test("chart sourceId is rendered as the exact provenance fallback when source metadata is unavailable", () => {
  const rows = [{ value: 0 }];
  const html = renderToStaticMarkup(React.createElement(ChartView, {
    chart: { typeId: "kpi", title: "Zero capacity", sourceId: "capacity-feed", roles: { value: { field: "value" } } },
    rows,
    datasetProfile: profileDataset(rows),
  }));

  assert.match(html, /Source: capacity-feed/);
  assert.doesNotMatch(html, /Configured data|\[object Object\]/);
});

test("card values render non-finite values as unavailable while retaining zero and negative delta signs", () => {
  const html = renderToStaticMarkup(React.createElement(CardChartView, {
    chart: { title: "Operational change" },
    model: {
      items: [{
        key: "finite-check",
        label: "Clinic A",
        value: 0,
        target: Number.POSITIVE_INFINITY,
        comparison: Number.NaN,
        delta: { absolute: -2, percentage: Number.NEGATIVE_INFINITY },
        direction: "decrease",
      }],
    },
  }));

  assert.match(html, /<dd>0<\/dd>/);
  assert.match(html, /<dd>-2<\/dd>/);
  assert.doesNotMatch(html, /NaN|Infinity/);
  assert.match(html, /Not available/);
});

test("ECharts semantic summaries render non-finite target values as unavailable", () => {
  const html = renderToStaticMarkup(React.createElement(EChartsChartView, {
    chart: { title: "Supply readiness" },
    model: { semanticSummary: { items: [{ label: "Clinic A", actual: Number.NaN, target: Number.POSITIVE_INFINITY, time: null }] } },
  }));

  assert.match(html, /Clinic A: actual Unavailable; target Unavailable/);
  assert.doesNotMatch(html, /NaN|Infinity/);
});

test("table values render non-finite values as unavailable", () => {
  const html = renderToStaticMarkup(React.createElement(TableChartView, {
    chart: { title: "Scores" },
    model: { columns: [{ key: "score", label: "Score" }], rows: [{ score: Number.NEGATIVE_INFINITY }], rowMetadata: [{ key: "score-row", time: null }] },
  }));

  assert.match(html, /Not available/);
  assert.doesNotMatch(html, /Infinity/);
});

test("image render models use safe sources, alternative text, and fit", () => {
  const imageRows = [{ src: "/maps/readiness.png", alt: "Readiness map", fit: "cover" }];
  const image = renderToStaticMarkup(React.createElement(ChartView, {
    chart: { typeId: "image", title: "Readiness map", roles: {} },
    rows: imageRows,
    datasetProfile: profileDataset(imageRows),
  }));
  const unsafeRows = [{ src: "javascript:alert(1)", alt: "Unsafe" }];
  const unsafe = renderToStaticMarkup(React.createElement(ChartView, {
    chart: { typeId: "image", title: "Unsafe", roles: {} },
    rows: unsafeRows,
    datasetProfile: profileDataset(unsafeRows),
  }));

  assert.match(image, /src="\/maps\/readiness.png"/);
  assert.match(image, /alt="Readiness map"/);
  assert.match(image, /object-fit:cover/);
  assert.match(unsafe, /chart-status-error/);
});

test("ECharts render models remain SSR-safe and describe their content", () => {
  const rows = [{ period: "May", value: 4 }];
  const html = renderToStaticMarkup(React.createElement(ChartView, {
    chart: {
      typeId: "bar",
      title: "Monthly capacity",
      description: "Capacity by month.",
      roles: { measurements: { field: "value" }, observation: { field: "period" } },
      interaction: { zoom: { enabled: true } },
    },
    rows,
    datasetProfile: profileDataset(rows),
  }));

  assert.match(html, /role="img"/);
  assert.match(html, /value at May: 4/);
  assert.match(html, /data-zoom-modifier="Control"/);
});

test("gauge render models expose their value and target in the accessible summary", () => {
  const rows = [{ actual: 8, target: 10 }];
  const html = renderToStaticMarkup(React.createElement(ChartView, {
    chart: {
      typeId: "gauge",
      title: "Supply readiness",
      roles: { value: { field: "actual" }, target: { field: "target" } },
    },
    rows,
    datasetProfile: profileDataset(rows),
  }));

  assert.match(html, /Supply readiness: actual 8; target 10/);
});

test("bullet summaries expose every exact label, actual, target, and time from the render model", () => {
  const rows = [
    { facility: "Clinic A", actual: 8, target: 10, observed: "2027-05-01" },
    { facility: "Clinic B", actual: 6, target: 9, observed: "2027-05-02" },
  ];
  const html = renderToStaticMarkup(React.createElement(ChartView, {
    chart: {
      typeId: "bullet",
      title: "Facility targets",
      roles: {
        actual: { field: "actual" },
        target: { field: "target" },
        label: { field: "facility" },
        time: { field: "observed" },
      },
    },
    rows,
    datasetProfile: profileDataset(rows, { observed: { interpretation: "temporal" } }),
  }));

  assert.match(html, /Clinic A: actual 8; target 10; observed 2027-05-01/);
  assert.match(html, /Clinic B: actual 6; target 9; observed 2027-05-02/);
});

test("ECharts lifecycle initializes once, updates in place, registers maps before options, resizes, and cleans up", () => {
  const calls = [];
  const instance = {
    setOption(option) { calls.push(`option:${option.id}`); },
    resize() { calls.push("resize"); },
    dispose() { calls.push("dispose"); },
  };
  let resizeListener;
  let observer;
  const lifecycle = createEChartsLifecycle({
    echartsApi: {
      getInstanceByDom() { return null; },
      init() { calls.push("init"); return instance; },
      registerMap(name) { calls.push(`map:${name}`); },
    },
    windowTarget: {
      addEventListener(type, listener) { if (type === "resize") resizeListener = listener; },
      removeEventListener(type, listener) { if (type === "resize" && listener === resizeListener) calls.push("remove-resize"); },
    },
    ResizeObserverCtor: class {
      constructor(callback) { this.callback = callback; observer = this; }
      observe() { calls.push("observe"); }
      disconnect() { calls.push("disconnect"); }
    },
  });

  lifecycle.mount({});
  lifecycle.update({ mapRegistration: { name: "regions", geoJson: { features: [{}] } }, option: { id: "first" } });
  lifecycle.update({ mapRegistration: { name: "empty-regions", geoJson: { type: "FeatureCollection", features: [] } }, option: { id: "second" } });
  resizeListener();
  observer.callback();
  lifecycle.dispose();

  assert.deepEqual(calls, ["init", "observe", "map:regions", "option:first", "map:empty-regions", "option:second", "resize", "resize", "disconnect", "remove-resize", "dispose"]);
});

test("ECharts lifecycle disposes a partially initialized instance when setup fails", () => {
  const calls = [];
  const lifecycle = createEChartsLifecycle({
    echartsApi: {
      getInstanceByDom() { return null; },
      init() { return { dispose() { calls.push("dispose"); } }; },
      registerMap() {},
    },
    windowTarget: { addEventListener() { throw new Error("listener failure"); }, removeEventListener() {} },
    ResizeObserverCtor: null,
  });

  assert.doesNotThrow(() => lifecycle.mount({}));
  assert.doesNotThrow(() => lifecycle.update({ option: { id: "ignored" } }));
  assert.deepEqual(calls, ["dispose"]);
});
