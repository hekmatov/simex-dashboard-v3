import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

import { profileDataset } from "../src/charting/data/profileDataset.js";
import { buildRenderModel } from "../src/charting/rendering/buildRenderModel.js";

const vite = await createServer({
  root: process.cwd(),
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});
const { default: ChartView } = await vite.ssrLoadModule("/src/components/charts/ChartView.jsx");
const { default: CardChartView } = await vite.ssrLoadModule("/src/components/charts/CardChartView.jsx");
const { default: EChartsChartView, createEChartsLifecycle } = await vite.ssrLoadModule("/src/components/charts/EChartsChartView.jsx");
const { default: ImageChartView } = await vite.ssrLoadModule("/src/components/charts/ImageChartView.jsx");
const { default: TableChartView } = await vite.ssrLoadModule("/src/components/charts/TableChartView.jsx");
await vite.close();

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

test("table render models retain headers, values, and observation time while citation stays hidden", () => {
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
  assert.doesNotMatch(html, /Source: Readiness register|Captured: 2027-05-02/);
});

test("chart sourceId provenance fallback is not rendered inline by default", () => {
  const rows = [{ value: 0 }];
  const html = renderToStaticMarkup(React.createElement(ChartView, {
    chart: { typeId: "kpi", title: "Zero capacity", sourceId: "capacity-feed", roles: { value: { field: "value" } } },
    rows,
    datasetProfile: profileDataset(rows),
  }));

  assert.doesNotMatch(html, /Source: capacity-feed/);
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

test("temporal KPI collections show one latest observation per entity outside playback", () => {
  const rows = [
    { observed: "2027-05-01", entity: "Clinic A", value: 10 },
    { observed: "2027-05-01", entity: "Clinic B", value: 20 },
    { observed: "2027-05-02", entity: "Clinic A", value: 30 },
    { observed: "2027-05-02", entity: "Clinic B", value: 5 },
  ];
  const html = renderToStaticMarkup(React.createElement(ChartView, {
    chart: {
      typeId: "kpi",
      title: "Current clinic pressure",
      roles: {
        value: { field: "value" },
        entity: { field: "entity" },
        time: { field: "observed", interpretation: "temporal" },
      },
      presentation: {
        collection: {
          layout: "fixed",
          rows: 1,
          columns: 2,
          ranking: { mode: "priority", method: "highestCurrent" },
        },
      },
    },
    rows,
    datasetProfile: profileDataset(rows, {
      observed: { interpretation: "temporal", format: "YYYY-MM-DD" },
    }),
  }));

  assert.equal((html.match(/<h4>Clinic A<\/h4>/g) ?? []).length, 1);
  assert.equal((html.match(/<h4>Clinic B<\/h4>/g) ?? []).length, 1);
  assert.match(html, /<h4>Clinic A<\/h4><dl><div[^>]*><dt>Value<\/dt><dd>30<\/dd>/);
  assert.match(html, /<h4>Clinic B<\/h4><dl><div[^>]*><dt>Value<\/dt><dd>5<\/dd>/);
  assert.doesNotMatch(html, /Duplicate collection entityId|This chart cannot be displayed/);
});

test("time-series playback summaries place resolved overlays at the shared clock and disclose source policy", () => {
  const rows = [
    { observed: "2027-02-20", value: 1 },
    { observed: "2027-02-23", value: 7 },
  ];
  const datasetProfile = profileDataset(rows, {
    observed: { interpretation: "temporal", format: "YYYY-MM-DD" },
  });
  const render = (matching) => renderToStaticMarkup(React.createElement(ChartView, {
    chart: {
      typeId: "line",
      title: "Transmission",
      roles: {
        measurements: [{
          field: "value",
          axis: "primary",
          ...(matching.policy === "interpolate"
            ? { interpolationAllowed: true }
            : {}),
        }],
        observation: {
          field: "observed",
          interpretation: "temporal",
        },
      },
      transformations: {
        filters: [],
        grouping: [],
        aggregation: null,
        duplicates: null,
        missingValues: "gap",
      },
      presentation: {
        axes: { primary: {}, secondary: {} },
        title: { align: "left" },
        legend: { visible: true },
      },
      interaction: {
        zoom: { enabled: false },
        timeSync: null,
      },
    },
    rows,
    datasetProfile,
    timeContext: {
      groupId: "exercise",
      activeEpochMs: Date.UTC(2027, 1, 22),
      matching,
    },
    accessibilityEnabled: true,
    renderContext: { accessibilityEnabled: true },
  }));

  const lastKnown = render({ policy: "lastKnown" });
  const nearest = render({
    policy: "nearest",
    toleranceMs: 2 * 24 * 60 * 60 * 1_000,
  });
  const interpolated = render({ policy: "interpolate" });

  assert.match(lastKnown, /value at 2027-02-22: 1 \(last known from 2027-02-20\)/i);
  assert.match(nearest, /value at 2027-02-22: 7 \(nearest measurement from 2027-02-23\)/i);
  assert.match(interpolated, /value at 2027-02-22: 5 \(interpolated between 2027-02-20 and 2027-02-23\)/i);
});

test("ECharts semantic summaries render non-finite target values as unavailable", () => {
  const html = renderToStaticMarkup(React.createElement(EChartsChartView, {
    chart: { title: "Supply readiness" },
    model: { semanticSummary: { items: [{ label: "Clinic A", actual: Number.NaN, target: Number.POSITIVE_INFINITY, time: null }] } },
    accessibilityEnabled: true,
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

test("table charts expose regular and fill-height row distribution classes", () => {
  const model = { columns: [{ key: "score", label: "Score" }], rows: [{ score: 4 }] };
  const regular = renderToStaticMarkup(React.createElement(TableChartView, {
    chart: { title: "Scores" },
    model,
  }));
  const fill = renderToStaticMarkup(React.createElement(TableChartView, {
    chart: { title: "Scores", presentation: { table: { rowDistribution: "fill" } } },
    model,
  }));

  assert.match(regular, /chart-table-view--regular/);
  assert.match(fill, /chart-table-view--fill/);
});

test("legacy image render models discover intrinsic geometry before applying saved fit", () => {
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
  assert.match(image, /class="chart-image-intrinsic-probe"/);
  assert.doesNotMatch(image, /preserveAspectRatio|data-image-transform-order/);
  assert.doesNotMatch(image, /Reset view|data-image-zoom-scale|chart-image-actions/);
  assert.doesNotMatch(image, /chart-zoom-guard|Hold Ctrl while scrolling to zoom/);
  assert.match(unsafe, /chart-status-error/);
});

test("image zoom affordances consume ChartView's authoritative schema and interaction gate", () => {
  const rows = [{ src: "/maps/readiness.png", alt: "Readiness map" }];
  const enabled = renderToStaticMarkup(React.createElement(ChartView, {
    chart: {
      typeId: "image",
      title: "Zoomable readiness map",
      roles: {},
      interaction: { zoom: { enabled: true } },
    },
    rows,
    datasetProfile: profileDataset(rows),
    accessibilityEnabled: true,
    renderContext: { accessibilityEnabled: true },
  }));
  const authoritativeDisabled = renderToStaticMarkup(React.createElement(ImageChartView, {
    chart: {
      typeId: "image",
      title: "Locally requested zoom",
      interaction: { zoom: { enabled: true } },
    },
    model: rows[0],
    zoomEnabled: false,
  }));

  assert.match(enabled, /class="chart-zoom-guard"/);
  assert.match(enabled, /chart-image-view--active/);
  assert.match(enabled, /data-image-zoom-scale="1"/);
  assert.match(enabled, />100%<|100%<\/output>/);
  assert.match(enabled, /Reset view/);
  assert.doesNotMatch(authoritativeDisabled, /chart-image-view--active|data-image-zoom-scale|chart-image-actions/);
  assert.doesNotMatch(authoritativeDisabled, /Reset view/);
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
    accessibilityEnabled: true,
    renderContext: { accessibilityEnabled: true },
  }));

  assert.match(html, /role="img"/);
  assert.match(html, /value at May: 4/);
  assert.match(html, /data-zoom-modifier="Control"/);
  assert.match(html, /class="chart-zoom-guard"/);
  assert.match(html, /Hold Ctrl while scrolling to zoom/);
});

test("visually hidden chart titles remain structural headings across renderers", () => {
  const chart = {
    title: "Structural capacity title",
    presentation: { title: { align: "left", visible: false } },
  };
  const card = renderToStaticMarkup(React.createElement(CardChartView, {
    chart,
    model: { items: [] },
  }));
  const table = renderToStaticMarkup(React.createElement(TableChartView, {
    chart,
    model: { columns: [], rows: [], rowMetadata: [] },
  }));
  const echarts = renderToStaticMarkup(React.createElement(EChartsChartView, {
    chart,
    model: {
      kind: "echarts",
      option: { title: { text: chart.title }, series: [] },
    },
    accessibilityEnabled: false,
  }));

  for (const html of [card, table, echarts]) {
    assert.match(
      html,
      /<h3[^>]*class="chart-view-title chart-view-title--visually-hidden"[^>]*>Structural capacity title<\/h3>/,
    );
  }
  assert.match(
    table,
    /<caption class="chart-view-title--visually-hidden">Structural capacity title data table<\/caption>/,
  );
});

test("non-zoom schema capabilities cannot be bypassed by chart-local input", () => {
  const rows = [{ category: "Hospitals", value: 4 }];
  const html = renderToStaticMarkup(React.createElement(ChartView, {
    chart: {
      typeId: "pie",
      title: "Capacity share",
      roles: {
        category: { field: "category" },
        value: { field: "value" },
      },
      interaction: { zoom: { enabled: true } },
    },
    rows,
    datasetProfile: profileDataset(rows),
    accessibilityEnabled: true,
    renderContext: { accessibilityEnabled: true },
  }));

  assert.doesNotMatch(html, /chart-zoom-guard|Hold Ctrl while scrolling to zoom/);
  assert.doesNotMatch(html, /data-zoom-modifier/);
});

test("custom DOM chart families apply aligned titles and normalized backgrounds", () => {
  const opaqueCard = renderToStaticMarkup(React.createElement(ChartView, {
    chart: {
      ...deltaCard,
      presentation: {
        ...deltaCard.presentation,
        title: { align: "right" },
        background: { color: "#a1b2c3", transparent: false },
      },
    },
    rows: deltaRows,
    datasetProfile: profileDataset(deltaRows, {
      observed: { interpretation: "temporal" },
    }),
  }));
  const transparentTable = renderToStaticMarkup(React.createElement(ChartView, {
    chart: {
      typeId: "table",
      title: "Facility readiness",
      roles: {
        columns: [{ field: "facility" }, { field: "score" }],
      },
      presentation: {
        title: { align: "center" },
        background: { color: "#112233", transparent: true },
      },
    },
    rows: [{ facility: "Clinic A", score: 7 }],
    datasetProfile: profileDataset([{ facility: "Clinic A", score: 7 }]),
  }));
  const image = renderToStaticMarkup(React.createElement(ChartView, {
    chart: {
      typeId: "image",
      title: "Readiness map",
      roles: {},
      presentation: {
        title: { align: "left" },
        background: { color: "#DDEEFF", transparent: false },
      },
    },
    rows: [{ src: "/maps/readiness.png", alt: "Readiness map" }],
    datasetProfile: profileDataset([{ src: "/maps/readiness.png", alt: "Readiness map" }]),
  }));

  assert.match(opaqueCard, /class="chart-view-frame"[^>]*data-title-align="right"[^>]*style="text-align:right;background-color:#A1B2C3"/);
  assert.match(opaqueCard, /class="chart-card-view"[^>]*data-title-align="right"[^>]*style="text-align:right"/);
  assert.match(transparentTable, /class="chart-view-frame"[^>]*data-title-align="center"[^>]*style="text-align:center;background-color:transparent"/);
  assert.match(transparentTable, /class="chart-table-view chart-table-view--regular"[^>]*data-title-align="center"[^>]*style="text-align:center"/);
  assert.match(image, /class="chart-view-frame"[^>]*data-title-align="left"[^>]*style="text-align:left;background-color:#DDEEFF"/);
  assert.match(image, /class="chart-image-view"[^>]*data-title-align="left"[^>]*style="text-align:left"/);
});

test("hostile DOM presentation values fall back to left alignment without invalid CSS", () => {
  const html = renderToStaticMarkup(React.createElement(ChartView, {
    chart: {
      typeId: "kpi",
      title: "Capacity",
      roles: { value: { field: "value" } },
      presentation: {
        title: { align: "url(javascript:alert(1))" },
        background: {
          color: "url(javascript:alert(1))",
          transparent: false,
        },
      },
    },
    rows: [{ value: 4 }],
    datasetProfile: profileDataset([{ value: 4 }]),
  }));

  assert.match(html, /class="chart-view-frame"[^>]*data-title-align="left"[^>]*style="text-align:left"/);
  assert.doesNotMatch(html, /javascript|background-color/);
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
    accessibilityEnabled: true,
    renderContext: { accessibilityEnabled: true },
  }));

  assert.match(html, /Supply readiness: actual 8; target 10/);
});

test("a single bullet summary exposes its exact label, actual, target, and time", () => {
  const rows = [
    { facility: "Clinic A", actual: 8, target: 10, observed: "2027-05-01" },
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
    accessibilityEnabled: true,
    renderContext: { accessibilityEnabled: true },
  }));

  assert.match(html, /Clinic A: actual 8; target 10; observed 2027-05-01/);
});

test("repeated Gauge and Bullet charts keep shared title visibility independent of row count", () => {
  for (const [typeId, roles, rows] of [
    [
      "gauge",
      {
        value: { field: "actual" },
        target: { field: "target" },
        entity: { field: "facility" },
        time: { field: "observed" },
      },
      [
        { facility: "Clinic A", actual: 8, target: 10, observed: "2027-05-01" },
        { facility: "Clinic B", actual: 6, target: 9, observed: "2027-05-01" },
      ],
    ],
    [
      "bullet",
      {
        actual: { field: "actual" },
        target: { field: "target" },
        entity: { field: "facility" },
        time: { field: "observed" },
      },
      [
        { facility: "Clinic A", actual: 8, target: 10, observed: "2027-05-01" },
        { facility: "Clinic B", actual: 6, target: 9, observed: "2027-05-01" },
      ],
    ],
  ]) {
    const title = `${typeId} facility targets`;
    const source = `${typeId}-register`;
    const html = renderToStaticMarkup(React.createElement(ChartView, {
      chart: {
        id: `${typeId}-collection`,
        typeId,
        title,
        description: "Current status by facility.",
        sourceId: source,
        roles,
        presentation: {
          title: { align: "left", visible: false },
          collection: {
            layout: "fixed",
            rows: 1,
            columns: 2,
            gap: 12,
            overflow: "manualPages",
            ranking: { mode: "fixed" },
            carousel: {
              intervalMs: 10000,
              loop: true,
              pauseOnHover: true,
              transition: "none",
            },
            playback: { rerank: true, pauseCarousel: true },
          },
          targets: { ranges: [50, 80, 100] },
        },
        interaction: { zoom: { enabled: false } },
      },
      rows,
      datasetProfile: profileDataset(rows, {
        observed: { interpretation: "temporal" },
      }),
      accessibilityEnabled: true,
      renderContext: { accessibilityEnabled: true },
    }));

    assert.match(html, /class="chart-target-collection-view"/);
    assert.match(
      html,
      new RegExp(`<h3[^>]*class="chart-view-title chart-view-title--visually-hidden"[^>]*>${title}</h3>`),
    );
    assert.match(html, /data-collection-layout="fixed"/);
    assert.equal((html.match(new RegExp(`>${title}<`, "g")) ?? []).length, 1);
    assert.equal((html.match(new RegExp(`Source: ${source}`, "g")) ?? []).length, 0);
    assert.equal((html.match(/class="chart-target-collection-item"/g) ?? []).length, 2);
    assert.equal((html.match(/role="group"/g) ?? []).length, 2);
    assert.doesNotMatch(html, /role="img"/);
    assert.match(html, /aria-labelledby="[^"]+"/);
    assert.match(html, /aria-describedby="[^"]+"/);
    assert.match(html, /Clinic A: actual 8; target 10; observed 2027-05-01/);
    assert.match(html, /Clinic B: actual 6; target 9; observed 2027-05-01/);
    assert.doesNotMatch(html, /class="chart-echarts-view"/);
  }
});

test("ECharts lifecycle initializes once, updates in place, registers maps before options, resizes, and cleans up", () => {
  const calls = [];
  let finishedListener;
  const instance = {
    setOption(option) { calls.push(`option:${option.id}`); },
    resize() { calls.push("resize"); },
    on(event, listener) { if (event === "finished") finishedListener = listener; },
    off(event, listener) {
      if (event === "finished" && listener === finishedListener) calls.push("remove-finished");
    },
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
    onRender() { calls.push("finished"); },
  });

  lifecycle.mount({});
  lifecycle.update({ mapRegistration: { name: "regions", geoJson: { features: [{}] } }, option: { id: "first" } });
  lifecycle.update({ mapRegistration: { name: "empty-regions", geoJson: { type: "FeatureCollection", features: [] } }, option: { id: "second" } });
  finishedListener();
  resizeListener();
  observer.callback();
  lifecycle.dispose();

  assert.deepEqual(calls, ["init", "observe", "map:regions", "option:first", "map:empty-regions", "option:second", "finished", "resize", "resize", "disconnect", "remove-resize", "remove-finished", "dispose"]);
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

test("the mounted ECharts lifecycle receives a scale-capable geography option", () => {
  const options = [];
  const model = buildRenderModel({
    chart: {
      id: "regional-readiness",
      typeId: "choroplethMap",
      title: "Regional readiness",
      roles: {},
      presentation: {
        title: { align: "left" },
        map: { geoSource: "regions" },
      },
      interaction: { zoom: { enabled: true } },
    },
    prepared: {
      status: "ready",
      diagnostics: [],
      meta: {},
      marks: [{
        geography: "GE-TB",
        value: 7,
        time: null,
        feature: { name: "Tbilisi" },
        group: null,
        groupKey: "",
      }],
    },
  });
  const lifecycle = createEChartsLifecycle({
    echartsApi: {
      getInstanceByDom() {
        return null;
      },
      init() {
        return {
          setOption(option) {
            options.push(option);
          },
          dispose() {},
        };
      },
      registerMap() {},
    },
    windowTarget: {
      addEventListener() {},
      removeEventListener() {},
    },
    ResizeObserverCtor: null,
  });

  lifecycle.mount({});
  lifecycle.update(model);
  lifecycle.dispose();

  assert.equal(model.interaction.zoom.target, "geo");
  assert.equal(options.length, 1);
  assert.equal(options[0].geo.roam, true);
});
