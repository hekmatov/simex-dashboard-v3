import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

import { profileDataset } from "../src/charting/data/profileDataset.js";
import { prepareChartData } from "../src/charting/data/prepareChartData.js";
import { buildRenderModel } from "../src/charting/rendering/buildRenderModel.js";

const vite = await createServer({
  root: process.cwd(),
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});
const {
  default: ChartView,
  renderChartContent,
} = await vite.ssrLoadModule("/src/components/charts/ChartView.jsx");
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

function buildModel(chart, rows, datasetProfile, timeContext) {
  return buildRenderModel({
    chart,
    prepared: prepareChartData({ chart, rows, datasetProfile, timeContext }),
  });
}

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

test("precision gauges render the approved arc instead of an ECharts canvas", () => {
  const html = renderToStaticMarkup(React.createElement(EChartsChartView, {
    chart: { id: "occupancy", title: "ICU occupancy", description: "Current occupancy." },
    model: {
      kind: "echarts",
      precisionGauge: {
        actual: 76,
        target: 72,
        maximum: 100,
        segments: [[0.5, "#d73027"], [0.8, "#fdae61"], [1, "#1a9850"]],
      },
      option: { series: [] },
    },
  }));

  assert.match(html, /precision-arc-gauge/);
  assert.match(html, /76/);
  assert.match(html, /data-precision-target/);
  assert.match(html, /precision-arc-gauge-tick/);
  assert.match(html, /precision-arc-gauge-status/);
  assert.match(html, /ON TRACK/);
  assert.match(html, /stroke="#dc2626"/);
  assert.match(html, /stroke="#f59e0b"/);
  assert.match(html, /stroke="#16a34a"/);
  assert.doesNotMatch(html, /chart-echarts-host/);
});

test("precision gauges keep target labels inside both ends of the dial", () => {
  const renderGauge = (target) => renderToStaticMarkup(React.createElement(EChartsChartView, {
    chart: { title: "ICU occupancy" },
    model: {
      kind: "echarts",
      precisionGauge: {
        actual: 76,
        target,
        maximum: 100,
        segments: [[1, "#1a9850"]],
      },
      option: { series: [] },
    },
  }));

  assert.match(renderGauge(0), /data-precision-target-label-anchor="start"/);
  assert.match(renderGauge(100), /data-precision-target-label-anchor="end"/);
});

test("precision gauges honor their configured readout and centre a combined value and unit", () => {
  const html = renderToStaticMarkup(React.createElement(EChartsChartView, {
    chart: { title: "ICU occupancy" },
    model: {
      kind: "echarts",
      precisionGauge: {
        actual: 76,
        target: null,
        maximum: 100,
        segments: [[0.5, "#d73027"], [0.8, "#fdae61"], [1, "#1a9850"]],
        readoutLabel: "of capacity",
        showReadoutLabel: false,
        unit: "%",
      },
      option: { series: [] },
    },
  }));

  assert.match(html, /class="precision-arc-gauge-value"[^>]*style="text-anchor:middle"/);
  assert.match(html, /class="precision-arc-gauge-value-unit"[^>]*>\s*%<\/tspan>/);
  assert.doesNotMatch(html, /OF TARGET RANGE|of capacity|CURRENT STATUS/);
});

test("precision gauges shrink within shorter collection cards instead of keeping a fixed dial height", async () => {
  const styles = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");
  const gaugeRules = styles.match(/\.chart-target-collection-item--precision-gauge\s*\{[^}]*\}[\s\S]*?\.precision-arc-gauge\s*\{[^}]*\}/)?.[0] ?? "";

  assert.match(gaugeRules, /display:\s*flex/);
  assert.match(gaugeRules, /min-block-size:\s*0/);
  assert.match(styles, /\.chart-target-collection-item--precision-gauge\s+\.precision-arc-gauge\s*\{[^}]*flex:\s*1\s+1\s+0/);
  assert.doesNotMatch(gaugeRules, /clamp\(13rem/);
});

test("precision gauge endpoint labels scale with the gauge typography", async () => {
  const styles = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");
  const boundRules = [...styles.matchAll(/\.precision-arc-gauge-bound\s*\{[^}]*\}/g)]
    .map(([rule]) => rule);

  assert.ok(boundRules.some((rule) => /font-size:\s*calc\(var\(--precision-arc-text-size,\s*12px\)\s*\*\s*2\.8\)/.test(rule)));
});

test("collection chart titles use header space that has no transport controls", async () => {
  const styles = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");
  const emptyTransportRule = styles.match(/\.collection-header-transport-host:empty\s*\{[^}]*\}/)?.[0] ?? "";

  assert.match(emptyTransportRule, /display:\s*none/);
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

test("short chart panels keep data-state details reachable by keyboard", () => {
  const html = renderToStaticMarkup(
    React.createElement(ChartView, {
      chart: deltaCard,
      rows: [],
      sourceState: { status: "error" },
      panelFootprint: { columns: 2, rows: 0.25 },
    }),
  );

  assert.match(html, /data-chart-state-short="true"/);
  assert.match(html, /chart-state-surface--short/);
  assert.match(html, /tabindex="0"/);
  assert.match(html, /aria-label="Current capacity status\. Scroll to view details\."/);
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

  assert.match(html, /class="chart-card-value">0<\/strong>/);
  assert.match(html, /class="chart-card-delta-value">-2<\/span>/);
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

  assert.equal((html.match(/class="chart-card-label">Clinic A<\/span>/g) ?? []).length, 1);
  assert.equal((html.match(/class="chart-card-label">Clinic B<\/span>/g) ?? []).length, 1);
  assert.match(html, /class="chart-card-label">Clinic A<\/span><strong class="chart-card-value">30<\/strong>/);
  assert.match(html, /class="chart-card-label">Clinic B<\/span><strong class="chart-card-value">5<\/strong>/);
  assert.doesNotMatch(html, /<dl>/);
  assert.doesNotMatch(html, /Duplicate collection entityId|This chart cannot be displayed/);
});

test("time-series render models retain resolved overlays and provenance while rendered summaries stay suppressed", () => {
  const rows = [
    { observed: "2027-02-20", value: 1 },
    { observed: "2027-02-23", value: 7 },
  ];
  const datasetProfile = profileDataset(rows, {
    observed: { interpretation: "temporal", format: "YYYY-MM-DD" },
  });
  const chartFor = (matching) => ({
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
  });
  const modelFor = (matching) => buildModel(chartFor(matching), rows, datasetProfile, {
    groupId: "exercise",
    activeEpochMs: Date.UTC(2027, 1, 22),
    matching,
  });

  const lastKnown = modelFor({ policy: "lastKnown" });
  const nearest = modelFor({
    policy: "nearest",
    toleranceMs: 2 * 24 * 60 * 60 * 1_000,
  });
  const interpolated = modelFor({ policy: "interpolate" });

  assert.deepEqual(lastKnown.option.series[0].markPoint.data[0].coord, ["2027-02-22", 1]);
  assert.equal(lastKnown.option.series[0].markPoint.data[0].provenance.label, "Last measured 2027-02-20");
  assert.deepEqual(nearest.option.series[0].markPoint.data[0].coord, ["2027-02-22", 7]);
  assert.equal(nearest.option.series[0].markPoint.data[0].provenance.label, "Nearest measurement 2027-02-23");
  assert.deepEqual(interpolated.option.series[0].markPoint.data[0].coord, ["2027-02-22", 5]);
  assert.equal(interpolated.option.series[0].markPoint.data[0].provenance.label, "Interpolated between 2027-02-20 and 2027-02-23");
  assert.equal(lastKnown.option.aria.enabled, false);

  const html = renderToStaticMarkup(React.createElement(ChartView, {
    chart: chartFor({ policy: "lastKnown" }),
    rows,
    datasetProfile,
    timeContext: {
      groupId: "exercise",
      activeEpochMs: Date.UTC(2027, 1, 22),
      matching: { policy: "lastKnown" },
    },
  }));
  assert.match(html, /<h3[^>]*>Transmission<\/h3>/);
  assert.match(html, /class="chart-echarts-host" aria-hidden="true"/);
  assert.doesNotMatch(html, /role="img"|value at 2027-02-22|Last measured 2027-02-20/);
});

test("ECharts views suppress injected semantic summaries", () => {
  const html = renderToStaticMarkup(React.createElement(EChartsChartView, {
    chart: { title: "Supply readiness" },
    model: { semanticSummary: { items: [{ label: "Clinic A", actual: Number.NaN, target: Number.POSITIVE_INFINITY, time: null }] } },
    accessibilityEnabled: true,
  }));

  assert.match(html, /<h3[^>]*>Supply readiness<\/h3>/);
  assert.match(html, /class="chart-echarts-host" aria-hidden="true"/);
  assert.doesNotMatch(html, /role="img"|Clinic A: actual|NaN|Infinity/);
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

test("standalone Image ChartView owns one styled heading above its viewport", () => {
  const rows = [{ src: "/maps/readiness.png", alt: "Readiness map", fit: "contain" }];
  const html = renderToStaticMarkup(React.createElement(ChartView, {
    chart: {
      typeId: "image",
      title: "Readiness map",
      roles: {},
      presentation: {
        title: { align: "center", fontSize: 18, bold: true },
        image: { background: { mode: "white", color: "#AABBCC" } },
      },
    },
    rows,
    datasetProfile: profileDataset(rows),
  }));

  assert.equal((html.match(/>Readiness map<\/h3>/g) ?? []).length, 1);
  assert.ok(html.indexOf("chart-view-heading") < html.indexOf("chart-image-viewport"));
  assert.match(html, /font-family:var\(--simex-style-heading-font\)/);
  assert.match(html, /font-size:18px/);
  assert.match(html, /font-weight:700/);
  assert.match(html, /class="chart-image-viewport" style="background-color:#FFFFFF"/);
  assert.doesNotMatch(html, /background-color:#AABBCC|<figcaption/);
});

test("ChartView passes the same Audience scale object to ECharts, target collections, and Image rendering", () => {
  const audienceScale = Object.freeze({ tier: "distance-large", title: 28, text: 18, value: 40 });
  const renderedChild = (typeId, model) => {
    const chart = {
      id: `audience-${typeId}`,
      typeId,
      title: `${typeId} title`,
      interaction: { zoom: { enabled: false } },
    };
    const rows = [];
    const datasetProfile = {};
    const renderContext = {};
    const props = {
      chart,
      rows,
      datasetProfile,
      renderContext,
      audienceScale,
      surface: "audience",
    };
    props.resolvedRendering = {
      status: "available",
      model,
      prepared: { status: "ready", marks: [] },
      schema: { capabilities: { zoom: false } },
      inputKey: {
        chart,
        rows,
        datasetProfile,
        geoData: undefined,
        timeContext: undefined,
        renderContext,
      },
    };
    return renderChartContent(props, "passive").props.children;
  };

  for (const [typeId, model] of [
    ["line", { kind: "echarts", option: { series: [] } }],
    ["gauge", { kind: "targetCollection", items: [], presentation: {} }],
    ["image", { kind: "image", src: "/maps/audience.png" }],
  ]) {
    assert.equal(renderedChild(typeId, model).props.audienceScale, audienceScale, typeId);
  }
});

test("Audience Image title override is authoritative while non-Audience authored sizing is unchanged", () => {
  const chart = {
    title: "Response map",
    presentation: { title: { align: "left", fontSize: 12, bold: true } },
  };
  const model = { src: "/maps/response.png", alt: "Response map", fit: "contain" };
  const audience = renderToStaticMarkup(React.createElement(ImageChartView, {
    chart,
    model,
    surface: "audience",
    audienceScale: Object.freeze({ tier: "distance-large", title: 28, text: 18, value: 40 }),
  }));
  const view = renderToStaticMarkup(React.createElement(ImageChartView, {
    chart,
    model,
    surface: "view",
  }));

  assert.match(audience, /font-size:28px/);
  assert.doesNotMatch(audience, /font-size:12px/);
  assert.match(view, /font-size:12px/);
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

test("ECharts renderers remain SSR-safe while suppressing injected summaries", () => {
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

  assert.match(html, /<h3[^>]*>Monthly capacity<\/h3>/);
  assert.match(html, /class="chart-echarts-host" aria-hidden="true"/);
  assert.doesNotMatch(html, /role="img"|value at May: 4/);
  assert.match(html, /data-zoom-modifier="Control"/);
  assert.match(html, /class="chart-zoom-guard"/);
  assert.match(html, /Hold Ctrl while scrolling to zoom/);
});

test("visible chart title precedes description and canvas host", () => {
  const model = {
    kind: "echarts",
    option: { title: { text: "Capacity" }, series: [] },
  };
  const chart = {
    title: "Monthly capacity",
    description: "Capacity by month.",
    presentation: {
      title: { align: "left" },
      description: { visible: true },
    },
  };
  const html = renderToStaticMarkup(React.createElement(EChartsChartView, { model, chart }));

  assert.ok(html.indexOf("chart-view-title") < html.indexOf("chart-view-description"));
  assert.ok(html.indexOf("chart-view-description") < html.indexOf("chart-echarts-host"));
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
  assert.match(opaqueCard, /class="chart-view-frame"[^>]*data-dashboard-region="chart-view-frame"[^>]*data-dashboard-surface-role="chart-cell"/);
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

test("gauge models retain exact values while the dashboard renders the precision arc", () => {
  const rows = [{ actual: 8, target: 10 }];
  const chart = {
    typeId: "gauge",
    title: "Supply readiness",
    roles: { value: { field: "actual" }, target: { field: "target" } },
  };
  const datasetProfile = profileDataset(rows);
  const model = buildModel(chart, rows, datasetProfile);
  const html = renderToStaticMarkup(React.createElement(ChartView, { chart, rows, datasetProfile }));

  assert.deepEqual(model.semanticSummary.items, [{ label: "Supply readiness", actual: 8, target: 10, time: null }]);
  assert.equal(model.option.aria.enabled, false);
  assert.match(html, /<h3[^>]*>Supply readiness<\/h3>/);
  assert.match(html, /class="precision-arc-gauge/);
  assert.match(html, /Supply readiness: actual 8; target 10/);
  assert.doesNotMatch(html, /chart-echarts-host/);
});

test("bullet models retain exact values and time while rendered summaries stay suppressed", () => {
  const rows = [
    { facility: "Clinic A", actual: 8, target: 10, observed: "2027-05-01" },
  ];
  const chart = {
    typeId: "bullet",
    title: "Facility targets",
    roles: {
      actual: { field: "actual" },
      target: { field: "target" },
      label: { field: "facility" },
      time: { field: "observed" },
    },
  };
  const datasetProfile = profileDataset(rows, { observed: { interpretation: "temporal" } });
  const model = buildModel(chart, rows, datasetProfile);
  const html = renderToStaticMarkup(React.createElement(ChartView, { chart, rows, datasetProfile }));

  assert.deepEqual(model.semanticSummary.items, [{ label: "Clinic A", actual: 8, target: 10, time: "2027-05-01" }]);
  assert.equal(model.option.aria.enabled, false);
  assert.match(html, /<h3[^>]*>Facility targets<\/h3>/);
  assert.match(html, /class="chart-echarts-host" aria-hidden="true"/);
  assert.doesNotMatch(html, /Clinic A: actual 8; target 10; observed 2027-05-01|role="img"/);
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
    const chart = {
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
      };
    const datasetProfile = profileDataset(rows, {
      observed: { interpretation: "temporal" },
    });
    const model = buildModel(chart, rows, datasetProfile);
    const html = renderToStaticMarkup(React.createElement(ChartView, {
      chart,
      rows,
      datasetProfile,
    }));

    assert.equal(model.kind, "targetCollection");
    assert.deepEqual(
      model.items.map(({ label, actual, target, time }) => ({ label, actual, target, time })),
      [
        { label: "Clinic A", actual: 8, target: 10, time: "2027-05-01" },
        { label: "Clinic B", actual: 6, target: 9, time: "2027-05-01" },
      ],
    );
    assert.equal(model.items.every((item) => item.model.option.aria.enabled === false), true);
    assert.match(html, /class="chart-target-collection-view"/);
    assert.match(
      html,
      new RegExp(`<h3[^>]*class="chart-view-title chart-view-title--visually-hidden"[^>]*>${title}</h3>`),
    );
    assert.match(html, /data-collection-layout="fixed"/);
    assert.equal((html.match(new RegExp(`>${title}<`, "g")) ?? []).length, 1);
    assert.equal((html.match(new RegExp(`Source: ${source}`, "g")) ?? []).length, 0);
    assert.equal((html.match(/class="chart-target-collection-item(?: |")/g) ?? []).length, 2);
    assert.equal((html.match(/class="chart-target-collection-label"/g) ?? []).length, 2);
    assert.match(html, />Clinic A<\/h4>/);
    assert.match(html, />Clinic B<\/h4>/);
    if (typeId === "gauge") {
      assert.equal((html.match(/<div class="precision-arc-gauge"/g) ?? []).length, 2);
      assert.doesNotMatch(html, /chart-embedded-echarts-host/);
      assert.match(html, /Clinic A: actual 8; target 10/);
    } else {
      assert.doesNotMatch(html, /role="group"|role="img"|aria-labelledby|aria-describedby/);
      assert.doesNotMatch(html, /Clinic A: actual 8; target 10|Clinic B: actual 6; target 9/);
    }
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
