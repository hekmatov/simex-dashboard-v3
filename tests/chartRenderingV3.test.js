import assert from "node:assert/strict";
import test from "node:test";
import { register } from "node:module";

import * as echarts from "echarts";

import { prepareChartData } from "../src/charting/data/prepareChartData.js";
import { profileDataset } from "../src/charting/data/profileDataset.js";
import { buildAxisRenderModel } from "../src/charting/rendering/axisAdapter.js";
import { buildRenderModel } from "../src/charting/rendering/buildRenderModel.js";
import { buildCompositionRenderModel } from "../src/charting/rendering/compositionAdapter.js";
import { getRenderAdapter } from "../src/charting/rendering/renderAdapterRegistry.js";
import { buildRelationshipRenderModel } from "../src/charting/rendering/relationshipAdapter.js";

register(`data:text/javascript,${encodeURIComponent(`
export async function load(url, context, nextLoad) {
  if (url.endsWith(".jsx")) {
    const loaded = await nextLoad(url, { ...context, format: "module" });
    return { format: "module", source: loaded.source, shortCircuit: true };
  }
  return nextLoad(url, context);
}
`)}`, import.meta.url);

const {
  applyEChartsPresentation,
  createEChartsLifecycle,
  readChartTextTheme,
  sameChartTextTheme,
} = await import("../src/components/charts/EChartsChartView.jsx");

const {
  createValueAxisTitleProjection,
  resolveValueAxisTitleGraphics,
  valueAxisTitleGutters,
} = await import("../src/charting/rendering/axisTitleGraphics.js");

const MAY_1 = Date.UTC(2027, 4, 1);
const MAY_2 = Date.UTC(2027, 4, 2);
const MAY_3 = Date.UTC(2027, 4, 3);

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

function inspectResolvedOption(option, inspect) {
  const instance = echarts.init(null, null, { renderer: "svg", ssr: true, width: 640, height: 400 });
  try {
    instance.setOption(option);
    return inspect(instance.getModel());
  } finally {
    instance.dispose();
  }
}

function renderedTextBounds(option, width = 640, height = 400) {
  const instance = echarts.init(null, null, { renderer: "svg", ssr: true, width, height });
  try {
    instance.setOption(option);
    instance.renderToSVGString();
    return instance.getZr().storage.getDisplayList(true).flatMap((element) => {
      if (element.style?.text === undefined) return [];
      const rect = element.getBoundingRect();
      const corners = [
        [rect.x, rect.y],
        [rect.x + rect.width, rect.y],
        [rect.x, rect.y + rect.height],
        [rect.x + rect.width, rect.y + rect.height],
      ].map(([x, y]) => element.transformCoordToGlobal(x, y));
      const x = corners.map(([value]) => value);
      const y = corners.map(([, value]) => value);
      return [{
        text: String(element.style.text),
        left: Math.min(...x),
        right: Math.max(...x),
        top: Math.min(...y),
        bottom: Math.max(...y),
      }];
    });
  } finally {
    instance.dispose();
  }
}

function renderedProjectedTextBounds(model, width = 640, height = 400) {
  const textTheme = { bodyFont: "sans-serif", textMuted: "#49627A" };
  const presented = applyEChartsPresentation(
    model,
    { presentation: { title: { align: "left" } } },
    false,
    textTheme,
  );
  const instance = echarts.init(null, null, { renderer: "svg", ssr: true, width, height });
  try {
    instance.setOption(presented.option);
    instance.renderToSVGString();
    const rect = instance.getModel().getComponent("grid", 0).coordinateSystem.getRect();
    const graphics = resolveValueAxisTitleGraphics({
      projection: presented.valueAxisTitleProjection,
      gridRect: rect,
      textTheme: presented.valueAxisTitleTextTheme,
    });
    instance.setOption({ graphic: graphics });
    instance.renderToSVGString();
    return instance.getZr().storage.getDisplayList(true).flatMap((element) => {
      if (element.style?.text === undefined) return [];
      const textRect = element.getBoundingRect();
      const corners = [
        [textRect.x, textRect.y],
        [textRect.x + textRect.width, textRect.y],
        [textRect.x, textRect.y + textRect.height],
        [textRect.x + textRect.width, textRect.y + textRect.height],
      ].map(([x, y]) => element.transformCoordToGlobal(x, y));
      const x = corners.map(([value]) => value);
      const y = corners.map(([, value]) => value);
      return [{
        text: String(element.style.text),
        left: Math.min(...x),
        right: Math.max(...x),
        top: Math.min(...y),
        bottom: Math.max(...y),
      }];
    });
  } finally {
    instance.dispose();
  }
}

function renderedXAxisDates(option, width = 800, height = 400) {
  const instance = echarts.init(null, null, { renderer: "svg", ssr: true, width, height });
  try {
    instance.setOption(option);
    instance.renderToSVGString();
    const ticks = instance.getModel().getComponent("xAxis").axis.scale.getTicks();
    return [...new Set(ticks.map(({ value }) => {
      const date = new Date(value);
      return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
      ].join("-");
    }))];
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
  assert.equal(horizontal.option.xAxis.length, 2);
  assert.equal(horizontal.option.xAxis[0].type, "value");
  assert.equal(horizontal.option.xAxis[1].type, "value");
  assert.equal(horizontal.option.yAxis.type, "category");
  assert.equal(
    horizontal.option.series.find(({ name }) => name.startsWith("Cases"))
      .xAxisIndex,
    0,
  );
  assert.equal(
    horizontal.option.series.find(({ name }) => name.startsWith("Rate"))
      .xAxisIndex,
    1,
  );
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
    ], { axisInterpretation: "temporal" }),
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

test("line charts render one configured horizontal reference line without duplicating it per series", () => {
  const model = buildRenderModel({
    chart: chart("line", {
      presentation: {
        title: { align: "left" },
        collection: null,
        referenceLine: {
          visible: true,
          value: 5,
          label: "Preparedness threshold",
          color: "#DC2626",
          lineStyle: "dotted",
        },
      },
    }),
    prepared: axisMarks,
  });

  assert.deepEqual(model.option.series[0].markLine, {
    silent: true,
    symbol: "none",
    lineStyle: { color: "#DC2626", type: "dotted", width: 2 },
    label: {
      show: true,
      color: "#DC2626",
      formatter: "Preparedness threshold",
      position: "insideEndTop",
    },
    data: [{ yAxis: 5 }],
  });
  assert.equal(model.option.series.slice(1).some(({ markLine }) => markLine), false);
});

test("axis rendering follows validated schema marks instead of chart type identifiers", () => {
  const model = buildAxisRenderModel({
    chart: chart("futureStepLine", {
      presentation: {
        title: { align: "left" },
        collection: null,
        series: { lineWidth: 2.5 },
      },
    }),
    prepared: axisMarks,
  }, {
    semantics: { mark: "line" },
  });

  assert.ok(model.option.series.every(({ type }) => type === "line"));
  assert.ok(
    model.option.series.every(({ lineStyle }) => lineStyle?.width === 2.5),
  );
});

test("composition and relationship rendering follows validated schema marks instead of chart type identifiers", () => {
  const composition = buildCompositionRenderModel({
    chart: chart("futureRing"),
    prepared: ready([
      { category: "Ready", value: 3, share: 0.75, group: null, groupKey: "" },
      { category: "Delayed", value: 1, share: 0.25, group: null, groupKey: "" },
    ]),
  }, {
    semantics: { mark: "donut" },
  });
  const relationship = buildRelationshipRenderModel({
    chart: chart("futureSizedPoint"),
    prepared: ready([
      { x: 1, y: 2, size: 9, label: "A", cluster: null, clusterKey: "", group: null, groupKey: "" },
    ]),
  }, {
    semantics: { mark: "bubble" },
  });

  assert.ok(Array.isArray(composition.option.series[0].radius));
  assert.ok(composition.option.series[0].radius[0] !== "0%");
  assert.deepEqual(relationship.option.series[0].data[0].value, [1, 2, 9]);
  assert.equal(typeof relationship.option.series[0].symbolSize, "function");
});

test("axis render models apply only the series widths supported by each chart type", () => {
  for (const typeId of ["bar", "groupedBar", "stackedBar", "horizontalBar", "horizontalStackedBar"]) {
    const model = buildRenderModel({
      chart: chart(typeId, {
        presentation: {
          title: { align: "left" },
          collection: null,
          series: {
            colors: ["#043BCB", "#36BDEB"],
            barWidth: 18.5,
          },
        },
      }),
      prepared: axisMarks,
    });

    assert.deepEqual(model.option.color, ["#043BCB", "#36BDEB"], typeId);
    assert.ok(model.option.series.every(({ barWidth }) => barWidth === 18.5), typeId);
    assert.ok(model.option.series.every((series) => !Object.hasOwn(series, "lineStyle")), typeId);
  }

  for (const typeId of ["line", "area"]) {
    const model = buildRenderModel({
      chart: chart(typeId, {
        presentation: {
          title: { align: "left" },
          collection: null,
          series: {
            colors: ["#043BCB", "#36BDEB"],
            lineWidth: 2.5,
          },
        },
      }),
      prepared: axisMarks,
    });

    assert.deepEqual(model.option.color, ["#043BCB", "#36BDEB"], typeId);
    assert.ok(model.option.series.every(({ lineStyle }) => lineStyle?.width === 2.5), typeId);
    assert.ok(model.option.series.every((series) => !Object.hasOwn(series, "barWidth")), typeId);
  }

  const mixed = buildRenderModel({
    chart: chart("mixed", {
      presentation: {
        title: { align: "left" },
        collection: null,
        series: {
          colors: ["#043BCB", "#36BDEB"],
          lineWidth: 2.5,
          barWidth: 18.5,
        },
      },
    }),
    prepared: axisMarks,
  });
  const barSeries = mixed.option.series.find(({ type }) => type === "bar");
  const lineSeries = mixed.option.series.find(({ type }) => type === "line");

  assert.deepEqual(mixed.option.color, ["#043BCB", "#36BDEB"]);
  assert.equal(barSeries.barWidth, 18.5);
  assert.equal(lineSeries.lineStyle.width, 2.5);
});

test("composition and relationship render models honor configured series colors", () => {
  const colors = ["#043BCB", "#36BDEB"];
  const cases = [
    {
      typeId: "pie",
      prepared: ready([
        { category: "Ready", value: 3, share: 1, group: null, groupKey: "" },
      ]),
    },
    {
      typeId: "scatter",
      prepared: ready([
        { x: 1, y: 2, size: null, label: "A", cluster: "North", clusterKey: "North", group: null, groupKey: "" },
      ]),
    },
  ];

  for (const { typeId, prepared } of cases) {
    const model = buildRenderModel({
      chart: chart(typeId, {
        presentation: {
          title: { align: "left" },
          collection: null,
          series: { colors },
        },
      }),
      prepared,
    });

    assert.deepEqual(model.option.color, colors, typeId);
  }
});

test("title alignment and ctrl-wheel-compatible zoom are normalized into ECharts options", () => {
  const model = buildRenderModel({
    chart: chart("line", {
      presentation: { title: { align: "center" }, collection: null },
      interaction: { zoom: { enabled: true, rangeSelector: true } },
    }),
    prepared: axisMarks,
  });

  assert.equal(model.option.title.left, "center");
  assert.deepEqual(model.option.dataZoom.map(({ type }) => type), ["inside", "slider"]);
  assert.equal(model.option.dataZoom[0].zoomOnMouseWheel, "ctrl");
});

test("pointer-only chart rendering suppresses accessibility companion work even for legacy requests", () => {
  const chartConfig = chart("line");
  const disabled = buildRenderModel({
    chart: chartConfig,
    prepared: axisMarks,
  });
  const enabled = buildRenderModel({
    chart: chartConfig,
    prepared: axisMarks,
    renderContext: { accessibilityEnabled: true },
  });

  assert.equal(disabled.accessibility, undefined);
  assert.equal(enabled.accessibility, undefined);
  assert.equal(disabled.option.aria.enabled, false);
  assert.equal(enabled.option.aria.enabled, false);
});

test("the mounted ECharts option applies every valid title alignment and opaque background", () => {
  for (const align of ["left", "center", "right"]) {
    const presented = applyEChartsPresentation({
      kind: "echarts",
      option: {
        title: { text: "Capacity", left: "stale" },
        series: [],
      },
    }, {
      presentation: {
        title: { align },
        background: { color: "#a1b2c3", transparent: false },
      },
    });

    assert.equal(presented.option.title.left, align);
    assert.equal(presented.option.backgroundColor, "#A1B2C3");
  }
});

test("ECharts keeps title text for export while the DOM heading owns title visibility", () => {
  const model = {
    kind: "echarts",
    option: { title: { text: "Capacity" }, series: [] },
  };
  const visible = applyEChartsPresentation(model, {
    presentation: { title: { align: "left" } },
  });
  const hidden = applyEChartsPresentation(model, {
    presentation: { title: { align: "left", visible: false } },
  });

  assert.deepEqual(
    { show: visible.option.title.show, text: visible.option.title.text },
    { show: false, text: "Capacity" },
  );
  assert.deepEqual(
    { show: hidden.option.title.show, text: hidden.option.title.text },
    { show: false, text: "Capacity" },
  );
});

test("transparent and hostile ECharts presentation values cannot create an opaque or invalid fill", () => {
  const transparent = applyEChartsPresentation({
    kind: "echarts",
    option: { title: [{ text: "One" }, { text: "Two", left: "right" }] },
  }, {
    presentation: {
      title: { align: "center" },
      background: { color: "#112233", transparent: true },
    },
  });
  const hostile = applyEChartsPresentation({
    kind: "echarts",
    option: { title: { text: "Capacity", left: "right" } },
  }, {
    presentation: {
      title: { align: "sideways" },
      background: { color: "url(javascript:alert(1))", transparent: false },
    },
  });

  assert.equal(transparent.option.backgroundColor, "transparent");
  assert.deepEqual(transparent.option.title.map(({ left }) => left), ["center", "center"]);
  assert.equal(hostile.option.title.left, "left");
  assert.equal(Object.hasOwn(hostile.option, "backgroundColor"), false);
});

test("the packaged opaque white default yields to themed chart surfaces", () => {
  const presented = applyEChartsPresentation({
    kind: "echarts",
    option: { backgroundColor: "#ff00ff", series: [] },
  }, {
    presentation: {
      title: { align: "left" },
      background: { color: "#FFFFFF", transparent: false },
    },
  });

  assert.equal(presented.option.backgroundColor, "transparent");
});

test("ECharts title and legend defaults consume projected profile text colors", () => {
  const presented = applyEChartsPresentation({
    kind: "echarts",
    option: {
      title: { text: "Capacity" },
      legend: { data: ["Observed"] },
      series: [],
    },
  }, {
    presentation: {
      title: { align: "left" },
      background: { color: "#FFFFFF", transparent: false },
    },
  }, false, {
    textStrong: "#F8FAF9",
    textMuted: "#C1CFD4",
  });

  assert.equal(presented.option.textStyle.color, "#F8FAF9");
  assert.equal(presented.option.title.textStyle.color, "#F8FAF9");
  assert.equal(presented.option.legend.textStyle.color, "#C1CFD4");
});

test("ECharts projects dashboard heading, body, and data fonts", () => {
  const presented = applyEChartsPresentation({
    kind: "echarts",
    option: {
      title: { text: "Capacity" },
      legend: { data: ["Observed"] },
      tooltip: { trigger: "axis" },
      yAxis: { name: "Capacity", axisLabel: {} },
      series: [{ type: "bar", label: {} }],
    },
  }, { presentation: { title: { align: "left" } } }, false, {
    bodyFont: "Body Token Stack",
    headingFont: "Heading Token Stack",
    dataFont: "Data Token Stack",
    typographyKey: "fonts-v1",
  });

  assert.equal(presented.option.title.textStyle.fontFamily, "Heading Token Stack");
  assert.equal(presented.option.legend.textStyle.fontFamily, "Body Token Stack");
  assert.equal(presented.option.tooltip.textStyle.fontFamily, "Body Token Stack");
  assert.equal(presented.option.yAxis.nameTextStyle.fontFamily, "Body Token Stack");
  assert.equal(presented.option.yAxis.axisLabel.fontFamily, "Data Token Stack");
  assert.equal(presented.option.series[0].label.fontFamily, "Data Token Stack");
  assert.equal(presented.valueAxisTitleTextTheme.bodyFont, "Body Token Stack");
  assert.equal(presented.valueAxisTitleTextTheme.dataFont, "Data Token Stack");
});

test("ECharts projects gauge titles and numeric labels into body and data fonts", () => {
  const presented = applyEChartsPresentation({
    kind: "echarts",
    option: {
      series: [{
        type: "gauge",
        title: {},
        detail: {},
        axisLabel: {},
      }],
    },
  }, { presentation: { title: { align: "left" } } }, false, {
    bodyFont: "Body Token Stack",
    dataFont: "Data Token Stack",
  });

  assert.equal(presented.option.series[0].title.fontFamily, "Body Token Stack");
  assert.equal(presented.option.series[0].detail.fontFamily, "Data Token Stack");
  assert.equal(presented.option.series[0].axisLabel.fontFamily, "Data Token Stack");
});

test("bullet and pie charts inherit the active dashboard data palette unless authored", () => {
  const theme = {
    textStrong: "#F8FAF9",
    textMuted: "#C1CFD4",
    dataColors: ["#85CCD6", "#E09AA7", "#C1AFE4", "#8BC7AA", "#E2BF72", "#F1A1A9"],
  };
  const themed = applyEChartsPresentation({
    kind: "echarts",
    option: {
      series: [
        { type: "bar", data: [72] },
        { type: "scatter", data: [80] },
      ],
    },
  }, { presentation: { title: { align: "left" } } }, false, theme);
  const authored = applyEChartsPresentation({
    kind: "echarts",
    option: {
      color: ["#112233", "#445566"],
      series: [{ type: "pie", data: [{ value: 4 }, { value: 6 }] }],
    },
  }, { presentation: { title: { align: "left" } } }, false, theme);

  assert.deepEqual(themed.option.color, [
    "#85CCD6", "#E09AA7", "#C1AFE4", "#8BC7AA", "#E2BF72", "#F1A1A9",
  ]);
  assert.deepEqual(authored.option.color, ["#112233", "#445566"]);
});

test("equivalent chart text themes compare data palettes by value", () => {
  const current = {
    textStrong: "#18334E",
    textMuted: "#49627A",
    dataColors: ["#4E79A7", "#F28E2B"],
  };
  const next = {
    textStrong: "#18334E",
    textMuted: "#49627A",
    dataColors: ["#4E79A7", "#F28E2B"],
  };
  assert.equal(sameChartTextTheme(current, next), true);
  assert.equal(sameChartTextTheme(current, { ...next, dataColors: ["#4E79A7", "#E15759"] }), false);
  assert.equal(sameChartTextTheme(current, { ...next, typographyKey: "fonts-v2" }), false);
});

test("Audience ECharts normalization overrides every visible text role without mutating authored input", () => {
  const calls = [];
  const generated = {
    type: "group",
    children: [
      { type: "text", style: { text: "Custom label", fontSize: 5, fill: "#123456" } },
      { type: "rect", shape: { width: 12, height: 8 }, style: { fill: "#654321" } },
    ],
  };
  function renderItem(...args) {
    calls.push({ receiver: this, args });
    return generated;
  }
  const model = {
    kind: "echarts",
    valueAxisTitleProjection: [{
      id: "primary",
      physicalAxis: "y",
      side: "left",
      title: "Cases",
      position: "center",
      orientation: "horizontal",
      fontSize: 9,
      bold: false,
      tickValues: [0, 100],
    }],
    option: {
      textStyle: { fontSize: 7 },
      title: { text: "Capacity", subtext: "Current", textStyle: { fontSize: 8 }, subtextStyle: { fontSize: 6 } },
      legend: { itemWidth: 3, itemHeight: 2, itemGap: 1, textStyle: { fontSize: 6 } },
      xAxis: {
        name: "Period",
        axisLabel: { fontSize: 5 },
        nameTextStyle: { fontSize: 5 },
        axisPointer: { label: { fontSize: 5 } },
      },
      yAxis: {
        name: "Cases",
        axisLabel: { fontSize: 5 },
        nameTextStyle: { fontSize: 5 },
        axisPointer: { label: { fontSize: 5 } },
      },
      axisPointer: { label: { fontSize: 5 } },
      tooltip: { textStyle: { fontSize: 5 } },
      visualMap: { text: ["High", "Low"], textStyle: { fontSize: 5 } },
      geo: { label: { fontSize: 5 }, emphasis: { label: { fontSize: 5 } } },
      radar: { axisName: { fontSize: 5 } },
      calendar: { dayLabel: { fontSize: 5 }, monthLabel: { fontSize: 5 }, yearLabel: { fontSize: 5 } },
      singleAxis: { axisLabel: { fontSize: 5 }, nameTextStyle: { fontSize: 5 } },
      parallelAxis: { axisLabel: { fontSize: 5 }, nameTextStyle: { fontSize: 5 } },
      angleAxis: { axisLabel: { fontSize: 5 }, nameTextStyle: { fontSize: 5 } },
      radiusAxis: { axisLabel: { fontSize: 5 }, nameTextStyle: { fontSize: 5 } },
      dataZoom: { textStyle: { fontSize: 5 } },
      graphic: { type: "text", style: { text: "Annotation", fontSize: 5 } },
      series: [{
        type: "gauge",
        label: { fontSize: 4 },
        edgeLabel: { fontSize: 4 },
        upperLabel: { fontSize: 4 },
        detail: { fontSize: 4 },
        title: { fontSize: 4 },
        axisLabel: { fontSize: 4 },
        emphasis: { label: { fontSize: 4 } },
        markLine: { label: { fontSize: 4 }, emphasis: { label: { fontSize: 4 } } },
        markPoint: { label: { fontSize: 4 }, emphasis: { label: { fontSize: 4 } } },
        markArea: { label: { fontSize: 4 }, emphasis: { label: { fontSize: 4 } } },
      }, {
        type: "custom",
        renderItem,
      }],
    },
  };
  const cloneWithFunctions = (value) => {
    if (Array.isArray(value)) return value.map(cloneWithFunctions);
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, cloneWithFunctions(child)]));
  };
  const before = cloneWithFunctions(model);
  const chartConfig = { presentation: { title: { align: "left" } } };
  const large = applyEChartsPresentation(model, chartConfig, false, {}, Object.freeze({
    tier: "distance-large",
    title: 28,
    text: 18,
    value: 40,
  }));
  const grid = applyEChartsPresentation(model, chartConfig, false, {}, Object.freeze({
    tier: "distance-grid",
    title: 24,
    text: 16,
    value: 34,
  }));
  const ordinary = applyEChartsPresentation(model, chartConfig, false, {});

  assert.deepEqual(model, before);
  assert.notEqual(large, model);
  assert.notEqual(large.option, model.option);
  assert.notEqual(large.option.series, model.option.series);
  assert.equal(large.option.textStyle.fontSize, 18);
  assert.equal(large.option.title.textStyle.fontSize, 28);
  assert.equal(large.option.title.subtextStyle.fontSize, 18);
  assert.equal(large.option.legend.textStyle.fontSize, 18);
  assert.ok(large.option.legend.itemWidth >= 18);
  assert.ok(large.option.legend.itemHeight >= 18);
  assert.ok(large.option.legend.itemGap >= 18);
  for (const axis of [large.option.xAxis, large.option.yAxis]) {
    assert.equal(axis.axisLabel.fontSize, 18);
    assert.equal(axis.nameTextStyle.fontSize, 18);
    assert.equal(axis.axisPointer.label.fontSize, 18);
    assert.ok(axis.axisLabel.margin >= 9);
    assert.ok(axis.nameGap >= 27);
  }
  assert.equal(large.option.axisPointer.label.fontSize, 18);
  assert.equal(large.option.tooltip.textStyle.fontSize, 18);
  assert.equal(large.option.series[0].label.fontSize, 18);
  assert.equal(large.option.series[0].edgeLabel.fontSize, 18);
  assert.equal(large.option.series[0].upperLabel.fontSize, 18);
  assert.equal(large.option.series[0].detail.fontSize, 40);
  assert.equal(large.option.series[0].title.fontSize, 18);
  assert.equal(large.option.series[0].axisLabel.fontSize, 18);
  assert.equal(large.option.series[0].emphasis.label.fontSize, 18);
  for (const role of ["markLine", "markPoint", "markArea"]) {
    assert.equal(large.option.series[0][role].label.fontSize, 18);
    assert.equal(large.option.series[0][role].emphasis.label.fontSize, 18);
  }
  assert.equal(large.option.visualMap.textStyle.fontSize, 18);
  assert.equal(large.option.geo.label.fontSize, 18);
  assert.equal(large.option.geo.emphasis.label.fontSize, 18);
  assert.equal(large.option.radar.axisName.fontSize, 18);
  assert.equal(large.option.calendar.dayLabel.fontSize, 18);
  assert.equal(large.option.calendar.monthLabel.fontSize, 18);
  assert.equal(large.option.calendar.yearLabel.fontSize, 18);
  assert.equal(large.option.singleAxis.axisLabel.fontSize, 18);
  assert.equal(large.option.parallelAxis.nameTextStyle.fontSize, 18);
  assert.equal(large.option.angleAxis.axisLabel.fontSize, 18);
  assert.equal(large.option.radiusAxis.nameTextStyle.fontSize, 18);
  assert.equal(large.option.dataZoom.textStyle.fontSize, 18);
  assert.equal(large.option.graphic.style.fontSize, 18);
  assert.notEqual(large.valueAxisTitleProjection, model.valueAxisTitleProjection);
  assert.notEqual(large.valueAxisTitleProjection[0], model.valueAxisTitleProjection[0]);
  assert.equal(large.valueAxisTitleProjection[0].fontSize, 18);
  assert.equal(large.valueAxisTitleTextTheme.tickFontSize, 18);

  const receiver = { id: "custom-renderer" };
  const params = { dataIndex: 2 };
  const api = { value() { return 1; } };
  const custom = large.option.series[1].renderItem.call(receiver, params, api);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].receiver, receiver);
  assert.deepEqual(calls[0].args, [params, api]);
  assert.notEqual(custom, generated);
  assert.notEqual(custom.children[0], generated.children[0]);
  assert.notEqual(custom.children[0].style, generated.children[0].style);
  assert.equal(custom.children[0].style.fontSize, 18);
  assert.equal(generated.children[0].style.fontSize, 5);
  assert.deepEqual(generated.children[1].shape, { width: 12, height: 8 });

  assert.equal(grid.option.title.textStyle.fontSize, 24);
  assert.equal(grid.option.textStyle.fontSize, 16);
  assert.equal(grid.option.series[0].detail.fontSize, 34);
  assert.equal(grid.valueAxisTitleProjection[0].fontSize, 16);
  assert.equal(grid.valueAxisTitleTextTheme.tickFontSize, 16);
  assert.equal(ordinary.option.textStyle.fontSize, 7);
  assert.equal(ordinary.option.legend.textStyle.fontSize, 6);
  assert.equal(ordinary.option.series[0].detail.fontSize, 4);
  assert.equal(ordinary.option.visualMap.textStyle.fontSize, 5);
  assert.equal(ordinary.option.series[1].renderItem, renderItem);
  assert.equal(ordinary.valueAxisTitleProjection, model.valueAxisTitleProjection);
});

test("Audience materializes alternate-axis text tiers when authored style objects are omitted", () => {
  const model = {
    kind: "echarts",
    option: {
      singleAxis: { name: "Sequence" },
      parallel: {},
      parallelAxis: { dim: 0, name: "Capacity" },
      polar: {},
      angleAxis: { name: "Angle" },
      radiusAxis: { name: "Radius" },
      series: [],
    },
  };
  const before = structuredClone(model);
  const chartConfig = { presentation: { title: { align: "left" } } };
  const large = applyEChartsPresentation(model, chartConfig, false, {}, {
    tier: "distance-large",
    title: 28,
    text: 18,
    value: 40,
  });
  const grid = applyEChartsPresentation(model, chartConfig, false, {}, {
    tier: "distance-grid",
    title: 24,
    text: 16,
    value: 34,
  });
  const ordinary = applyEChartsPresentation(model, chartConfig, false, {});
  const axisKeys = ["singleAxis", "parallelAxis", "angleAxis", "radiusAxis"];

  assert.deepEqual(inspectResolvedOption(model.option, (resolved) => Object.fromEntries(
    axisKeys.map((key) => [key, resolved.getComponent(key, 0).getModel("axisLabel").get("fontSize")]),
  )), {
    singleAxis: 12,
    parallelAxis: 12,
    angleAxis: 12,
    radiusAxis: 12,
  });
  for (const key of axisKeys) {
    assert.deepEqual(large.option[key].axisLabel, { fontSize: 18, margin: 10 });
    assert.deepEqual(large.option[key].nameTextStyle, { fontSize: 18 });
    assert.equal(large.option[key].nameGap, 31);
    assert.deepEqual(grid.option[key].axisLabel, { fontSize: 16, margin: 9 });
    assert.deepEqual(grid.option[key].nameTextStyle, { fontSize: 16 });
    assert.equal(grid.option[key].nameGap, 27);
    assert.equal(ordinary.option[key].axisLabel, undefined);
    assert.equal(ordinary.option[key].nameTextStyle, undefined);
    assert.equal(ordinary.option[key].nameGap, undefined);
  }
  assert.deepEqual(inspectResolvedOption(large.option, (resolved) => Object.fromEntries(
    axisKeys.map((key) => [key, resolved.getComponent(key, 0).getModel("axisLabel").get("fontSize")]),
  )), {
    singleAxis: 18,
    parallelAxis: 18,
    angleAxis: 18,
    radiusAxis: 18,
  });
  assert.deepEqual(inspectResolvedOption(grid.option, (resolved) => Object.fromEntries(
    axisKeys.map((key) => [key, resolved.getComponent(key, 0).getModel("axisLabel").get("fontSize")]),
  )), {
    singleAxis: 16,
    parallelAxis: 16,
    angleAxis: 16,
    radiusAxis: 16,
  });
  assert.deepEqual(model, before);
});

test("Audience materializes omitted gauge text tiers without adding roles to non-gauge series", () => {
  const model = {
    kind: "echarts",
    option: {
      series: [
        { type: "gauge", data: [{ value: 72, name: "Capacity" }] },
        { type: "pie", data: [{ value: 28, name: "Remaining" }] },
      ],
    },
  };
  const before = structuredClone(model);
  const chartConfig = { presentation: { title: { align: "left" } } };
  const readGaugeText = (resolved) => {
    const gauge = resolved.getSeriesByIndex(0);
    return {
      detail: gauge.getModel("detail").get("fontSize"),
      title: gauge.getModel("title").get("fontSize"),
      axisLabel: gauge.getModel("axisLabel").get("fontSize"),
    };
  };
  const large = applyEChartsPresentation(model, chartConfig, false, {}, {
    tier: "distance-large",
    title: 28,
    text: 18,
    value: 40,
  });
  const grid = applyEChartsPresentation(model, chartConfig, false, {}, {
    tier: "distance-grid",
    title: 24,
    text: 16,
    value: 34,
  });
  const ordinary = applyEChartsPresentation(model, chartConfig, false, {});

  assert.deepEqual(inspectResolvedOption(model.option, readGaugeText), {
    detail: 30,
    title: 16,
    axisLabel: 12,
  });
  assert.deepEqual({
    detail: large.option.series[0].detail.fontSize,
    title: large.option.series[0].title.fontSize,
    axisLabel: large.option.series[0].axisLabel.fontSize,
  }, { detail: 40, title: 18, axisLabel: 18 });
  assert.deepEqual({
    detail: grid.option.series[0].detail.fontSize,
    title: grid.option.series[0].title.fontSize,
    axisLabel: grid.option.series[0].axisLabel.fontSize,
  }, { detail: 34, title: 16, axisLabel: 16 });
  assert.deepEqual(inspectResolvedOption(large.option, readGaugeText), {
    detail: 40,
    title: 18,
    axisLabel: 18,
  });
  assert.deepEqual(inspectResolvedOption(grid.option, readGaugeText), {
    detail: 34,
    title: 16,
    axisLabel: 16,
  });
  for (const role of ["label", "detail", "title", "axisLabel"]) {
    assert.equal(Object.hasOwn(large.option.series[1], role), false);
    assert.equal(Object.hasOwn(grid.option.series[1], role), false);
    assert.equal(Object.hasOwn(ordinary.option.series[1], role), false);
  }
  for (const role of ["detail", "title", "axisLabel"]) {
    assert.equal(Object.hasOwn(ordinary.option.series[0], role), false);
  }
  assert.deepEqual(model, before);
});

test("Audience axis-title gutters measure tier tick and title fonts while ordinary defaults remain 12 and 14", () => {
  const projection = {
    id: "primary",
    physicalAxis: "y",
    side: "left",
    title: "Cases",
    position: "center",
    orientation: "horizontal",
    fontSize: 18,
    bold: false,
    tickValues: [0, 100],
  };
  const measured = [];
  const measureText = (text, fontSize) => {
    measured.push({ text: String(text), fontSize });
    return { width: fontSize * 2, height: fontSize };
  };
  const theme = { bodyFont: "Audience Body", dataFont: "Audience Data", tickFontSize: 18 };
  const gutters = valueAxisTitleGutters(projection, theme, measureText);
  const graphic = resolveValueAxisTitleGraphics({
    projection,
    gridRect: { x: 120, y: 60, width: 320, height: 180 },
    textTheme: theme,
    measureText,
  })[0];

  assert.ok(gutters.left > 0);
  assert.equal(graphic.children[0].style.fontSize, 18);
  assert.equal(measured.filter(({ text }) => text === "Cases").every(({ fontSize }) => fontSize === 18), true);
  assert.equal(measured.filter(({ text }) => text !== "Cases").every(({ fontSize }) => fontSize === 18), true);

  const ordinaryMeasurements = [];
  valueAxisTitleGutters({ ...projection, fontSize: 14 }, {}, (text, fontSize) => {
    ordinaryMeasurements.push({ text: String(text), fontSize });
    return { width: fontSize * 2, height: fontSize };
  });
  assert.equal(ordinaryMeasurements.find(({ text }) => text === "Cases").fontSize, 14);
  assert.equal(ordinaryMeasurements.find(({ text }) => text === "100").fontSize, 12);
});

test("Audience tier and dashboard theme key changes produce fresh fake-lifecycle options and axis graphics", () => {
  assert.equal(typeof readChartTextTheme, "function", "shared computed-style theme reader must be implemented");
  const styleFor = (values) => ({
    getPropertyValue(name) { return values[name] ?? ""; },
  });
  const light = readChartTextTheme(styleFor({
    "--simex-text-strong": "#112233",
    "--simex-text-muted": "#445566",
  }), "theme-light", "distance-large");
  const dark = readChartTextTheme(styleFor({
    "--simex-text-strong": "#F1F2F3",
    "--simex-text-muted": "#C1C2C3",
  }), "theme-dark", "distance-grid");
  assert.equal(light.typographyKey, "theme-light");
  assert.equal(light.audienceTier, "distance-large");
  assert.equal(dark.typographyKey, "theme-dark");
  assert.equal(dark.audienceTier, "distance-grid");
  assert.equal(sameChartTextTheme(light, dark), false);

  const calls = [];
  const instance = {
    setOption(option) { calls.push(option); },
    getModel() {
      return {
        getComponent() {
          return { coordinateSystem: { getRect: () => ({ x: 100, y: 40, width: 300, height: 160 }) } };
        },
      };
    },
    on() {},
    off() {},
    dispose() {},
  };
  const lifecycle = createEChartsLifecycle({
    echartsApi: {
      getInstanceByDom() { return null; },
      init() { return instance; },
      registerMap() {},
    },
    windowTarget: { addEventListener() {}, removeEventListener() {} },
    ResizeObserverCtor: null,
  });
  const source = {
    kind: "echarts",
    option: { textStyle: { fontSize: 5 }, series: [] },
    valueAxisTitleProjection: [{
      id: "primary",
      physicalAxis: "y",
      side: "left",
      title: "Cases",
      position: "center",
      orientation: "horizontal",
      fontSize: 9,
      tickValues: [0, 100],
    }],
  };
  lifecycle.mount({});
  lifecycle.update(applyEChartsPresentation(source, {}, false, light, {
    tier: "distance-large", title: 28, text: 18, value: 40,
  }));
  lifecycle.update(applyEChartsPresentation(source, {}, false, dark, {
    tier: "distance-grid", title: 24, text: 16, value: 34,
  }));
  lifecycle.dispose();

  assert.equal(calls.length, 4);
  assert.equal(calls[0].textStyle.fontSize, 18);
  assert.equal(calls[0].textStyle.color, "#112233");
  assert.equal(calls[1].graphic[0].children[0].style.fontSize, 18);
  assert.equal(calls[1].graphic[0].$action, "replace");
  assert.equal(calls[2].textStyle.fontSize, 16);
  assert.equal(calls[2].textStyle.color, "#F1F2F3");
  assert.equal(calls[3].graphic[0].children[0].style.fontSize, 16);
  assert.equal(calls[3].graphic[0].$action, "replace");
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
  });
});

test("forced category dates never become an ECharts time axis", () => {
  const model = buildRenderModel({
    chart: chart("line", {
      roles: { observation: { field: "date", interpretation: "category" } },
    }),
    prepared: ready([
      { x: "2027-05-01", value: 4, measure: "value", measureLabel: "Value", clusterKey: "", groupKey: "", axis: "primary" },
    ], { axisInterpretation: "category" }),
  });

  assert.equal(model.option.xAxis.type, "category");
  assert.deepEqual(model.option.xAxis.data, ["2027-05-01"]);
});

test("axis presentation renders X and value titles, ranges, ticks, and temporal labels without coercing category dates", () => {
  const model = buildRenderModel({
    chart: chart("line", {
      presentation: {
        title: { align: "left" },
        collection: null,
        axes: {
          x: {
            title: "Reported at",
            min: "2027-01-01",
            max: "2027-12-31",
            labelPreset: "ddMmmYearBoundary",
            tickFrequency: { every: 2, unit: "month" },
          },
          primary: {
            title: "Cases",
            titlePosition: "top",
            titleOrientation: "horizontal",
            tickFrequency: { every: 5 },
          },
          secondary: { title: "Rate" },
        },
      },
    }),
    prepared: ready([
      { x: "2027-01-01", value: 4, measure: "cases", measureLabel: "Cases", clusterKey: "", groupKey: "", axis: "primary" },
      { x: "2027-03-01", value: 2, measure: "rate", measureLabel: "Rate", clusterKey: "", groupKey: "", axis: "secondary" },
    ], { axisInterpretation: "temporal" }),
  });

  assert.equal(model.option.xAxis.name, "Reported at");
  assert.equal(model.option.xAxis.type, "time");
  assert.equal(model.option.xAxis.min, "2027-01-01");
  assert.equal(model.option.xAxis.max, "2027-12-31");
  assert.equal(model.option.xAxis.interval, undefined);
  assert.equal(typeof model.option.xAxis.axisLabel.formatter, "function");
  assert.equal(model.option.yAxis[0].name, undefined);
  assert.deepEqual(
    model.valueAxisTitleProjection.map(({ title, position, orientation }) => ({ title, position, orientation })),
    [
      { title: "Cases", position: "top", orientation: "horizontal" },
      { title: "Rate", position: "center", orientation: "vertical" },
    ],
  );
  assert.equal(model.option.yAxis[0].interval, 5);
  assert.equal(model.option.yAxis[1].name, undefined);
  const label = model.option.xAxis.axisLabel.formatter;
  assert.equal(label("2027-12-31T00:00:00Z"), "31 Dec 2027");
  assert.equal(
    label("2027-12-31T00:00:00Z"),
    "31 Dec 2027",
    "re-rendering the same tick must not silently change its label",
  );
  assert.equal(label("2028-01-02T00:00:00Z"), "02 Jan 2028");
  assert.equal(label("2028-04-01T00:00:00Z", 2), "01 Apr");
  const midYear = buildRenderModel({
    chart: chart("line", {
      presentation: {
        title: { align: "left" },
        collection: null,
        axes: { x: { labelPreset: "ddMmmYearBoundary" } },
      },
    }),
    prepared: ready([
      { x: "2027-07-01", value: 4, measure: "value", measureLabel: "Value", clusterKey: "", groupKey: "", axis: "primary" },
    ], { axisInterpretation: "temporal" }),
  });
  assert.equal(midYear.option.xAxis.axisLabel.formatter("2027-07-01T00:00:00Z"), "01 Jul 2027");
  const unorderedLabel = buildRenderModel({
    chart: chart("line", {
      presentation: {
        title: { align: "left" },
        collection: null,
        axes: {
          x: {
            labelPreset: "ddMmmYearBoundary",
            tickFrequency: { every: 1, unit: "month" },
          },
        },
      },
    }),
    prepared: ready([
      { x: "2027-12-01", value: 4, measure: "value", measureLabel: "Value", clusterKey: "", groupKey: "", axis: "primary" },
      { x: "2028-02-01", value: 6, measure: "value", measureLabel: "Value", clusterKey: "", groupKey: "", axis: "primary" },
    ], { axisInterpretation: "temporal" }),
  }).option.xAxis.axisLabel.formatter;
  assert.equal(unorderedLabel("2028-02-01T00:00:00Z", 2), "01 Feb");
  assert.equal(unorderedLabel("2028-01-01T00:00:00Z", 1), "01 Jan 2028");

  const category = buildRenderModel({
    chart: chart("line", {
      presentation: {
        title: { align: "left" },
        collection: null,
        axes: { x: { title: "Recorded date", tickFrequency: { every: 2 } } },
      },
    }),
    prepared: ready([
      { x: "2027-05-01", value: 4, measure: "value", measureLabel: "Value", clusterKey: "", groupKey: "", axis: "primary" },
      { x: "2027-05-02", value: 6, measure: "value", measureLabel: "Value", clusterKey: "", groupKey: "", axis: "primary" },
    ], { axisInterpretation: "category" }),
  });
  assert.equal(category.option.xAxis.type, "category");
  assert.equal(category.option.xAxis.interval, undefined);
  assert.equal(category.option.xAxis.axisLabel.interval, 1);
  assert.equal(category.option.xAxis.axisTick.interval, 1);
  assert.deepEqual(category.option.xAxis.data, ["2027-05-01", "2027-05-02"]);
});

test("primary and secondary Y-axis titles keep visible clearance from wide tick labels", () => {
  const width = 500;
  const marks = (x, value, axis, measure) => ({
    x,
    value,
    measure,
    measureLabel: measure,
    clusterKey: "",
    groupKey: "",
    axis,
  });

  for (const titlePosition of ["top", "center", "bottom"]) {
    for (const titleOrientation of ["vertical", "horizontal"]) {
      const model = buildRenderModel({
        chart: chart("mixed", {
          presentation: {
            title: { align: "left" },
            collection: null,
            axes: {
              primary: {
                title: "Primary Y title",
                titlePosition,
                titleOrientation,
              },
              secondary: {
                title: "Secondary Y title",
                titlePosition,
                titleOrientation,
              },
            },
          },
        }),
        prepared: ready([
          marks("A", 123_456_789, "primary", "Cases"),
          marks("B", 987_654_321, "primary", "Cases"),
          marks("A", 234_567_890, "secondary", "Rate"),
          marks("B", 876_543_210, "secondary", "Rate"),
        ], { axisInterpretation: "category" }),
      });
      const bounds = renderedProjectedTextBounds(model, width, 320);
      const numericLabels = bounds.filter(({ text }) => /^-?\d[\d,]*(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(text));
      const primaryLabels = numericLabels.filter(({ right }) => right < width / 2);
      const secondaryLabels = numericLabels.filter(({ left }) => left > width / 2);
      const primaryTitle = bounds.find(({ text }) => text === "Primary Y title");
      const secondaryTitle = bounds.find(({ text }) => text === "Secondary Y title");
      const context = `${titlePosition}/${titleOrientation}`;
      const separated = (title, label) => (
        title.right + 8 <= label.left
        || title.left - 8 >= label.right
        || title.bottom + 8 <= label.top
        || title.top - 8 >= label.bottom
      );

      assert.ok(primaryTitle && secondaryTitle, `${context}: both Y-axis titles render`);
      assert.ok(primaryLabels.length > 0 && secondaryLabels.length > 0, `${context}: both value axes render tick labels`);
      assert.ok(
        primaryTitle.left >= 0 && primaryTitle.right <= width
          && primaryTitle.top >= 0 && primaryTitle.bottom <= 320,
        `${context}: primary title remains inside the chart canvas`,
      );
      assert.ok(
        secondaryTitle.left >= 0 && secondaryTitle.right <= width
          && secondaryTitle.top >= 0 && secondaryTitle.bottom <= 320,
        `${context}: secondary title remains inside the chart canvas`,
      );
      assert.ok(primaryLabels.every((label) => separated(primaryTitle, label)), `${context}: primary title keeps 8px tick-label clearance`);
      assert.ok(secondaryLabels.every((label) => separated(secondaryTitle, label)), `${context}: secondary title keeps 8px tick-label clearance`);
    }
  }
});

test("value axes suppress native names and project stable vertical and horizontal title metadata", () => {
  const vertical = buildRenderModel({
    chart: chart("mixed", {
      presentation: {
        title: { align: "left" },
        collection: null,
        axes: {
          x: { title: "Recorded date" },
          primary: { title: "Cases", titlePosition: "top", titleOrientation: "vertical" },
          secondary: { title: "Rate", titlePosition: "bottom", titleOrientation: "horizontal" },
        },
      },
    }),
    prepared: ready([
      { x: "A", value: 12, measure: "Cases", measureLabel: "Cases", clusterKey: "", groupKey: "", axis: "primary" },
      { x: "A", value: 4, measure: "Rate", measureLabel: "Rate", clusterKey: "", groupKey: "", axis: "secondary" },
    ], { axisInterpretation: "category" }),
  });

  assert.equal(vertical.option.xAxis.name, "Recorded date");
  assert.deepEqual(vertical.option.yAxis.map(({ name }) => name), [undefined, undefined]);
  assert.deepEqual(
    vertical.valueAxisTitleProjection.map(({ id, physicalAxis, side, title, position, orientation }) => ({
      id, physicalAxis, side, title, position, orientation,
    })),
    [
      { id: "primary", physicalAxis: "y", side: "left", title: "Cases", position: "top", orientation: "vertical" },
      { id: "secondary", physicalAxis: "y", side: "right", title: "Rate", position: "bottom", orientation: "horizontal" },
    ],
  );

  const horizontal = buildRenderModel({
    chart: chart("horizontalBar", {
      presentation: {
        title: { align: "left" },
        collection: null,
        axes: {
          x: { title: "Native X title" },
          primary: { title: "Primary value", titleFontSize: 10, titleBold: true },
          secondary: {
            title: "Secondary value",
            titleFontSize: 24,
            titleOffsetX: -12,
            titleOffsetY: 9,
            min: -20,
            max: 80,
            tickFrequency: { every: 5 },
          },
        },
      },
    }),
    prepared: ready([
      { x: "A", value: 12, measure: "Cases", measureLabel: "Cases", clusterKey: "", groupKey: "", axis: "primary" },
      { x: "A", value: 4, measure: "Rate", measureLabel: "Rate", clusterKey: "", groupKey: "", axis: "secondary" },
    ], { axisInterpretation: "category" }),
  });

  assert.deepEqual(horizontal.option.xAxis.map(({ name }) => name), [undefined, undefined]);
  assert.equal(horizontal.option.yAxis.name, "Native X title");
  assert.equal(horizontal.option.yAxis.nameRotate, 90);
  assert.equal(horizontal.option.xAxis[1].min, -20);
  assert.equal(horizontal.option.xAxis[1].max, 80);
  assert.equal(horizontal.option.xAxis[1].interval, 5);
  assert.deepEqual(
    horizontal.valueAxisTitleProjection.map(({ id, physicalAxis, side, fontSize, bold, offsetX, offsetY }) => ({
      id, physicalAxis, side, fontSize, bold, offsetX, offsetY,
    })),
    [
      { id: "primary", physicalAxis: "x", side: "bottom", fontSize: 10, bold: true, offsetX: 0, offsetY: 0 },
      { id: "secondary", physicalAxis: "x", side: "top", fontSize: 24, bold: false, offsetX: -12, offsetY: 9 },
    ],
  );
});

test("semantic observation and measurement axes project to the correct physical axes in both orientations", () => {
  const axes = {
    x: { title: "Observation", tickFrequency: { every: 2 } },
    primary: { title: "Primary measure", min: 0, max: 90, tickFrequency: { every: 10 } },
    secondary: { title: "Secondary measure", min: -20, max: 80, tickFrequency: { every: 5 } },
  };
  const prepared = ready([
    { x: "A", value: 12, measure: "Cases", measureLabel: "Cases", clusterKey: "", groupKey: "", axis: "primary" },
    { x: "B", value: 18, measure: "Cases", measureLabel: "Cases", clusterKey: "", groupKey: "", axis: "primary" },
    { x: "A", value: 4, measure: "Rate", measureLabel: "Rate", clusterKey: "", groupKey: "", axis: "secondary" },
    { x: "B", value: 8, measure: "Rate", measureLabel: "Rate", clusterKey: "", groupKey: "", axis: "secondary" },
  ], { axisInterpretation: "category" });

  const vertical = buildRenderModel({
    chart: chart("mixed", { presentation: { collection: null, axes } }),
    prepared,
  });
  assert.equal(vertical.option.xAxis.name, "Observation");
  assert.equal(vertical.option.xAxis.axisLabel.interval, 1);
  assert.deepEqual(
    vertical.option.yAxis.map(({ name, min, max, interval }) => ({ name, min, max, interval })),
    [
      { name: undefined, min: 0, max: 90, interval: 10 },
      { name: undefined, min: -20, max: 80, interval: 5 },
    ],
  );

  const horizontal = buildRenderModel({
    chart: chart("horizontalBar", { presentation: { collection: null, axes } }),
    prepared,
  });
  assert.equal(horizontal.option.yAxis.name, "Observation");
  assert.equal(horizontal.option.yAxis.axisLabel.interval, 1);
  assert.deepEqual(
    horizontal.option.xAxis.map(({ name, min, max, interval }) => ({ name, min, max, interval })),
    [
      { name: undefined, min: 0, max: 90, interval: 10 },
      { name: undefined, min: -20, max: 80, interval: 5 },
    ],
  );
  assert.deepEqual(
    horizontal.valueAxisTitleProjection.map(({ title, physicalAxis, side }) => ({ title, physicalAxis, side })),
    [
      { title: "Primary measure", physicalAxis: "x", side: "bottom" },
      { title: "Secondary measure", physicalAxis: "x", side: "top" },
    ],
  );
});

test("horizontal temporal observation settings project to the physical category axis", () => {
  const model = buildRenderModel({
    chart: chart("horizontalBar", {
      presentation: {
        collection: null,
        axes: {
          x: {
            title: "Reported at",
            min: "2027-01-01",
            max: "2027-01-05",
            labelPreset: "ddMmYyyy",
            tickFrequency: { every: 2, unit: "day" },
          },
          primary: { title: "Cases", min: 0, max: 20, tickFrequency: { every: 5 } },
        },
      },
    }),
    prepared: ready([
      { x: "2027-01-01", value: 4, measure: "Cases", measureLabel: "Cases", clusterKey: "", groupKey: "", axis: "primary" },
      { x: "2027-01-05", value: 12, measure: "Cases", measureLabel: "Cases", clusterKey: "", groupKey: "", axis: "primary" },
    ], { axisInterpretation: "temporal" }),
  });

  assert.equal(model.option.yAxis.type, "value");
  assert.equal(model.option.yAxis.name, "Reported at");
  assert.equal(model.option.yAxis.min, new Date(2027, 0, 1).valueOf());
  assert.equal(model.option.yAxis.max, new Date(2027, 0, 5).valueOf());
  assert.equal(model.option.yAxis.interval, 2 * 24 * 60 * 60 * 1000);
  assert.equal(typeof model.option.yAxis.axisLabel.formatter, "function");
  assert.deepEqual(
    model.option.xAxis,
    {
      type: "value",
      interval: 5,
      min: 0,
      max: 20,
      splitLine: { show: true },
    },
  );
  assert.deepEqual(model.option.series[0].data, [
    [4, new Date(2027, 0, 1).valueOf()],
    [12, new Date(2027, 0, 5).valueOf()],
  ]);
});

test("value-axis title graphics apply size, weight, offsets, clearance, and positive Y upward", () => {
  const gridRect = { x: 120, y: 80, width: 360, height: 220 };
  const textTheme = { bodyFont: "Body Token Stack", textMuted: "#49627A" };
  const projection = createValueAxisTitleProjection({
    id: "primary",
    horizontal: false,
    secondary: false,
    settings: {
      title: "Cumulative cases",
      titleFontSize: 24,
      titleBold: true,
      titlePosition: "center",
      titleOrientation: "vertical",
    },
    tickValues: [0, 1000],
  });
  const base = resolveValueAxisTitleGraphics({ projection, gridRect, textTheme });
  const moved = resolveValueAxisTitleGraphics({
    projection: { ...projection, titleOffsetX: -12, titleOffsetY: 9 },
    gridRect,
    textTheme,
  });

  assert.equal(base.length, 1);
  assert.equal(base[0].id, "simex-value-axis-title-primary");
  assert.equal(base[0].style, undefined);
  assert.equal(base[0].children.length, 1);
  assert.equal(base[0].children[0].style.fontFamily, "Body Token Stack");
  assert.equal(base[0].children[0].style.fontSize, 24);
  assert.equal(base[0].children[0].style.fontWeight, 700);
  const renderedTitle = renderedTextBounds({ graphic: base });
  assert.equal(renderedTitle.length, 1);
  assert.equal(renderedTitle[0].text, "Cumulative cases");
  assert.ok(Math.abs((renderedTitle[0].right - renderedTitle[0].left) - base[0].textBounds.width) < 1);
  assert.ok(Math.abs((renderedTitle[0].bottom - renderedTitle[0].top) - base[0].textBounds.height) < 1);
  assert.equal(moved[0].left, base[0].left - 12);
  assert.equal(moved[0].top, base[0].top - 9);
  assert.ok(base[0].left + base[0].textBounds.width <= gridRect.x - 16, "zero offset leaves the tick margin plus at least 8px title clearance");

  const horizontal = createValueAxisTitleProjection({
    id: "secondary",
    horizontal: true,
    secondary: true,
    settings: { title: "Rate", titleFontSize: 10, titleOrientation: "horizontal" },
    tickValues: [-100, 100],
  });
  const horizontalGraphic = resolveValueAxisTitleGraphics({ projection: horizontal, gridRect, textTheme })[0];
  assert.equal(horizontalGraphic.id, "simex-value-axis-title-secondary");
  assert.equal(horizontalGraphic.children[0].style.fontSize, 10);
  assert.equal(horizontalGraphic.children[0].style.fontWeight, 400);
  assert.ok(horizontalGraphic.top + horizontalGraphic.textBounds.height <= gridRect.y - 16);

  const horizontalPrimary = createValueAxisTitleProjection({
    id: "primary",
    horizontal: true,
    secondary: false,
    settings: { title: "Confirmed cases", titleOrientation: "horizontal" },
    tickValues: [0, 100],
  });
  const below = resolveValueAxisTitleGraphics({ projection: horizontalPrimary, gridRect, textTheme })[0];
  const shifted = resolveValueAxisTitleGraphics({
    projection: { ...horizontalPrimary, titleOffsetX: 12, titleOffsetY: -9 },
    gridRect,
    textTheme,
  })[0];
  assert.ok(below.top >= gridRect.y + gridRect.height + 16);
  assert.equal(shifted.left, below.left + 12);
  assert.equal(shifted.top, below.top + 9);
});

test("value-axis tick clearance uses data-font metrics while title bounds use body-font metrics", () => {
  const projection = createValueAxisTitleProjection({
    id: "primary",
    horizontal: false,
    settings: { title: "Cases", titleOrientation: "horizontal" },
    tickValues: [8888],
  });
  const measured = [];
  const measureText = (text, fontSize, fontWeight, fontFamily) => {
    measured.push({ text, fontSize, fontWeight, fontFamily });
    return fontFamily === "Data Metric Font"
      ? { width: 90, height: 12 }
      : { width: 20, height: 10 };
  };
  const textTheme = {
    bodyFont: "Body Metric Font",
    dataFont: "Data Metric Font",
    textMuted: "#49627A",
  };
  const gridRect = { x: 140, y: 60, width: 320, height: 180 };

  const gutters = valueAxisTitleGutters(projection, textTheme, measureText);
  const graphic = resolveValueAxisTitleGraphics({
    projection,
    gridRect,
    textTheme,
    measureText,
  })[0];

  assert.equal(gutters.left, 126);
  assert.deepEqual(graphic.textBounds, { width: 20, height: 10 });
  assert.equal(graphic.left, 14);
  assert.equal(graphic.children[0].style.fontFamily, "Body Metric Font");
  assert.ok(measured.some(({ text, fontFamily }) => text === "Cases" && fontFamily === "Body Metric Font"));
  assert.ok(measured.some(({ text, fontFamily }) => text.includes("8") && fontFamily === "Data Metric Font"));
});

test("positive-only domains do not reserve a negative numeric envelope", () => {
  const base = {
    id: "primary",
    horizontal: false,
    secondary: false,
    settings: { title: "Cases", min: 0, max: 1000 },
  };
  const positive = createValueAxisTitleProjection({ ...base, tickValues: [0, 1000] });
  const negative = createValueAxisTitleProjection({
    ...base,
    settings: { ...base.settings, min: -1000 },
    tickValues: [-1000, 1000],
  });
  const theme = { bodyFont: "Body Token Stack" };

  assert.equal(positive.domainCanBeNegative, false);
  assert.equal(negative.domainCanBeNegative, true);
  assert.ok(valueAxisTitleGutters(negative, theme).left > valueAxisTitleGutters(positive, theme).left);
});

test("ECharts lifecycle replaces stable value-axis graphics after updates and resize", () => {
  const options = [];
  let resizeListener;
  let rect = { x: 120, y: 80, width: 360, height: 220 };
  const instance = {
    setOption(option) { options.push(option); },
    resize() {},
    getModel() {
      return {
        getComponent() {
          return { coordinateSystem: { getRect: () => rect } };
        },
      };
    },
    on() {},
    off() {},
    dispose() {},
  };
  const lifecycle = createEChartsLifecycle({
    echartsApi: {
      getInstanceByDom() { return null; },
      init() { return instance; },
      registerMap() {},
    },
    windowTarget: {
      addEventListener(type, listener) { if (type === "resize") resizeListener = listener; },
      removeEventListener() {},
    },
    ResizeObserverCtor: null,
  });
  const projection = createValueAxisTitleProjection({
    id: "primary",
    settings: { title: "Cases" },
    tickValues: [0, 100],
  });

  lifecycle.mount({});
  lifecycle.update({
    option: { grid: {} },
    valueAxisTitleProjection: [projection],
    valueAxisTitleTextTheme: { bodyFont: "Body Token Stack", textMuted: "#49627A" },
  });
  assert.equal(options.length, 2);
  assert.equal(options[1].graphic[0].id, "simex-value-axis-title-primary");
  assert.equal(options[1].graphic[0].$action, "replace");
  const firstLeft = options[1].graphic[0].left;

  rect = { ...rect, x: 150 };
  resizeListener();
  assert.equal(options.length, 3);
  assert.equal(options[2].graphic[0].id, "simex-value-axis-title-primary");
  assert.equal(options[2].graphic[0].left, firstLeft + 30);

  lifecycle.update({ option: { grid: {} }, valueAxisTitleProjection: [] });
  assert.equal(options[4].graphic[0].id, "simex-value-axis-title-primary");
  assert.equal(options[4].graphic[0].$action, "remove");
  lifecycle.dispose();
});

test("centered Y-axis titles keep clearance for fractional ticks at zero, unit, and extreme scales", () => {
  const width = 500;
  for (const value of [0, 1, 1e-12, 1e21, 1e24]) {
    for (const titleOrientation of ["vertical", "horizontal"]) {
      const model = buildRenderModel({
        chart: chart("mixed", {
          presentation: {
            title: { align: "left" },
            collection: null,
            axes: {
              primary: {
                title: "Primary Y title",
                titlePosition: "center",
                titleOrientation,
              },
              secondary: {
                title: "Secondary Y title",
                titlePosition: "center",
                titleOrientation,
              },
            },
          },
        }),
        prepared: ready([
          {
            x: "A",
            value,
            measure: "Cases",
            measureLabel: "Cases",
            clusterKey: "",
            groupKey: "",
            axis: "primary",
          },
          {
            x: "A",
            value,
            measure: "Rate",
            measureLabel: "Rate",
            clusterKey: "",
            groupKey: "",
            axis: "secondary",
          },
        ], { axisInterpretation: "category" }),
      });
      const bounds = renderedProjectedTextBounds(model, width, 320);
      const numericLabels = bounds.filter(({ text }) => /^-?\d[\d,]*(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(text));
      assert.equal(numericLabels.length % 2, 0, `${value}: both value axes render the same tick count`);
      const axisTickCount = numericLabels.length / 2;
      const primaryLabels = numericLabels.slice(0, axisTickCount);
      const secondaryLabels = numericLabels.slice(axisTickCount);
      const primaryTitle = bounds.find(({ text }) => text === "Primary Y title");
      const secondaryTitle = bounds.find(({ text }) => text === "Secondary Y title");
      const separated = (title, label) => (
        title.right + 8 <= label.left
        || title.left - 8 >= label.right
        || title.bottom + 8 <= label.top
        || title.top - 8 >= label.bottom
      );

      const context = `${value}/${titleOrientation}`;
      assert.ok(primaryTitle && secondaryTitle, `${context}: both Y-axis titles render`);
      assert.ok(primaryLabels.length > 0 && secondaryLabels.length > 0, `${context}: both fractional value axes render`);
      assert.ok(primaryLabels.every((label) => separated(primaryTitle, label)), `${context}: primary title keeps 8px tick-label clearance`);
      assert.ok(secondaryLabels.every((label) => separated(secondaryTitle, label)), `${context}: secondary title keeps 8px tick-label clearance`);
    }
  }
});

test("monthly cadence stays aligned to calendar month boundaries", () => {
  const model = buildRenderModel({
    chart: chart("line", {
      presentation: {
        title: { align: "left" },
        collection: null,
        axes: {
          x: {
            min: "2027-01-01",
            max: "2027-07-01",
            tickFrequency: { every: 2, unit: "month" },
          },
        },
      },
    }),
    prepared: ready([
      { x: "2027-01-01", value: 4, measure: "value", measureLabel: "Value", clusterKey: "", groupKey: "", axis: "primary" },
      { x: "2027-07-01", value: 6, measure: "value", measureLabel: "Value", clusterKey: "", groupKey: "", axis: "primary" },
    ], { axisInterpretation: "temporal" }),
  });

  assert.equal(model.option.xAxis.type, "time");
  assert.deepEqual(renderedXAxisDates(model.option), [
    "2027-01-01",
    "2027-03-01",
    "2027-05-01",
    "2027-07-01",
  ]);

  const quarterly = buildRenderModel({
    chart: chart("line", {
      presentation: {
        title: { align: "left" },
        collection: null,
        axes: {
          x: {
            min: "2027-01-01",
            max: "2027-07-01",
            tickFrequency: { every: 3, unit: "month" },
          },
        },
      },
    }),
    prepared: ready([
      { x: "2027-01-01", value: 4, measure: "value", measureLabel: "Value", clusterKey: "", groupKey: "", axis: "primary" },
      { x: "2027-07-01", value: 6, measure: "value", measureLabel: "Value", clusterKey: "", groupKey: "", axis: "primary" },
    ], { axisInterpretation: "temporal" }),
  });
  assert.deepEqual(renderedXAxisDates(quarterly.option), [
    "2027-01-01",
    "2027-04-01",
    "2027-07-01",
  ]);
});

test("yearly cadence stays aligned through leap years", () => {
  const model = buildRenderModel({
    chart: chart("line", {
      presentation: {
        title: { align: "left" },
        collection: null,
        axes: {
          x: {
            min: "2027-01-01",
            max: "2031-01-01",
            tickFrequency: { every: 2, unit: "year" },
          },
        },
      },
    }),
    prepared: ready([
      { x: "2027-01-01", value: 4, measure: "value", measureLabel: "Value", clusterKey: "", groupKey: "", axis: "primary" },
      { x: "2031-01-01", value: 6, measure: "value", measureLabel: "Value", clusterKey: "", groupKey: "", axis: "primary" },
    ], { axisInterpretation: "temporal" }),
  });

  assert.equal(model.option.xAxis.type, "time");
  assert.deepEqual(renderedXAxisDates(model.option), [
    "2027-01-01",
    "2029-01-01",
    "2031-01-01",
  ]);
});

test("horizontal bars keep the observation title on the category axis", () => {
  const model = buildRenderModel({
    chart: chart("horizontalBar", {
      presentation: {
        title: { align: "left" },
        collection: null,
        axes: {
          x: { title: "Ward", tickFrequency: { every: 2 } },
          primary: { title: "Confirmed cases", min: 0, max: 100 },
        },
      },
    }),
    prepared: axisMarks,
  });

  assert.equal(model.option.yAxis.name, "Ward");
  assert.equal(model.option.yAxis.nameRotate, 90);
  assert.equal(model.option.yAxis.axisLabel.interval, 1);
  assert.equal(model.option.xAxis[0].name, undefined);
  assert.equal(model.option.xAxis[0].min, 0);
  assert.equal(model.option.xAxis[0].max, 100);

  const fallback = buildRenderModel({
    chart: chart("horizontalBar", {
      presentation: {
        title: { align: "left" },
        collection: null,
        axes: { primary: { title: "Fallback value title" } },
      },
    }),
    prepared: axisMarks,
  });
  assert.equal(fallback.option.xAxis[0].name, undefined);
  assert.deepEqual(
    fallback.valueAxisTitleProjection.map(({ title, physicalAxis, side, orientation }) => ({ title, physicalAxis, side, orientation })),
    [{ title: "Fallback value title", physicalAxis: "x", side: "bottom", orientation: "horizontal" }],
  );
});

test("configured temporal cadence controls the rendered date ticks", () => {
  const model = buildRenderModel({
    chart: chart("line", {
      presentation: {
        title: { align: "left" },
        collection: null,
        axes: {
          x: {
            min: "2027-01-01",
            max: "2027-01-31",
            labelPreset: "ddMmYyyy",
            tickFrequency: { every: 3, unit: "day" },
          },
        },
      },
    }),
    prepared: ready([
      { x: "2027-01-01", value: 4, measure: "value", measureLabel: "Value", clusterKey: "", groupKey: "", axis: "primary" },
      { x: "2027-01-31", value: 6, measure: "value", measureLabel: "Value", clusterKey: "", groupKey: "", axis: "primary" },
    ], { axisInterpretation: "temporal" }),
  });
  const svg = renderSvg(model.option, 800, 400);

  assert.equal(model.option.xAxis.type, "value");
  assert.match(svg, />01-01-2027</);
  assert.match(svg, />04-01-2027</);
  assert.match(svg, />07-01-2027</);
  assert.match(svg, />31-01-2027</);
  assert.doesNotMatch(svg, />05-01-2027</);
});

test("adaptive labels remain readable when fixed cadence requires a numeric time axis", () => {
  const model = buildRenderModel({
    chart: chart("line", {
      presentation: {
        title: { align: "left" },
        collection: null,
        axes: {
          x: {
            min: "2027-01-01",
            max: "2027-01-07",
            tickFrequency: { every: 3, unit: "day" },
          },
        },
      },
    }),
    prepared: ready([
      { x: "2027-01-01", value: 4, measure: "value", measureLabel: "Value", clusterKey: "", groupKey: "", axis: "primary" },
      { x: "2027-01-07", value: 6, measure: "value", measureLabel: "Value", clusterKey: "", groupKey: "", axis: "primary" },
    ], { axisInterpretation: "temporal" }),
  });

  const formatter = model.option.xAxis.axisLabel.formatter;
  const secondTick = new Date(2027, 0, 4).valueOf();
  assert.equal(model.option.xAxis.type, "value");
  assert.equal(typeof formatter, "function");
  assert.equal(formatter(secondTick, 1), "4");
  assert.equal(formatter(new Date(2027, 1, 1).valueOf(), 1), "Feb");
  assert.equal(formatter(new Date(2028, 0, 1).valueOf(), 1), "2028");
  assert.notEqual(formatter(secondTick, 1), String(secondTick));
});

test("temporal hover labels keep date-only values readable with and without fixed cadence", () => {
  const dateOnly = buildRenderModel({
    chart: chart("line"),
    prepared: ready([
      { x: "2027-01-01", value: 4, measure: "value", measureLabel: "Value", clusterKey: "", groupKey: "", axis: "primary" },
    ], { axisInterpretation: "temporal" }),
  });
  const fixedCadence = buildRenderModel({
    chart: chart("line", {
      presentation: {
        title: { align: "left" },
        collection: null,
        axes: { x: { tickFrequency: { every: 1, unit: "day" } } },
      },
    }),
    prepared: ready([
      { x: "2027-01-01", value: 4, measure: "value", measureLabel: "Value", clusterKey: "", groupKey: "", axis: "primary" },
    ], { axisInterpretation: "temporal" }),
  });

  const dateOnlyFormatter = dateOnly.option.xAxis.axisPointer.label.formatter;
  const fixedCadenceFormatter = fixedCadence.option.xAxis.axisPointer.label.formatter;
  const fixedCadenceValue = fixedCadence.option.series[0].data[0][0];

  assert.equal(dateOnlyFormatter({ value: "2027-01-01" }), "2027-01-01");
  assert.doesNotMatch(dateOnlyFormatter({ value: "2027-01-01" }), /00:00:00/);
  assert.equal(fixedCadenceFormatter({ value: fixedCadenceValue }), "2027-01-01");
  assert.notEqual(fixedCadenceFormatter({ value: fixedCadenceValue }), String(fixedCadenceValue));
});

test("temporal hover labels honor date-time and year display choices", () => {
  const dateTime = buildRenderModel({
    chart: chart("line", {
      presentation: {
        title: { align: "left" },
        collection: null,
        axes: { x: { hoverLabelPreset: "dateTime" } },
      },
    }),
    prepared: ready([
      { x: "2027-01-02T09:05", value: 4, measure: "value", measureLabel: "Value", clusterKey: "", groupKey: "", axis: "primary" },
    ], { axisInterpretation: "temporal" }),
  });
  const year = buildRenderModel({
    chart: chart("line", {
      roles: { observation: { field: "year", interpretation: "temporal", format: "YYYY" } },
    }),
    prepared: ready([
      { x: "2027-01-01", value: 4, measure: "value", measureLabel: "Value", clusterKey: "", groupKey: "", axis: "primary" },
    ], { axisInterpretation: "temporal" }),
  });

  assert.equal(dateTime.option.xAxis.axisPointer.label.formatter({ value: "2027-01-02T09:05" }), "2027-01-02 09:05");
  assert.equal(year.option.xAxis.axisPointer.label.formatter({ value: "2027-01-01" }), "2027");
});

test("automatic temporal hover labels retain inferred YYYY source granularity", () => {
  const rows = [{ Year: 2016, value: 12 }, { Year: 2017, value: 14 }];
  const chartConfig = chart("line", {
    roles: {
      measurements: [{ field: "value", axis: "primary" }],
      observation: { field: "Year" },
    },
  });
  const prepared = prepareChartData({
    chart: chartConfig,
    rows,
    datasetProfile: profileDataset(rows),
  });
  const model = buildRenderModel({ chart: chartConfig, prepared });

  assert.equal(prepared.meta.axisTemporalFormat, "YYYY");
  assert.equal(
    model.option.xAxis.axisPointer.label.formatter({ value: model.option.series[0].data[0][0] }),
    "2016",
  );
});

test("fixed cadence preserves datetime-local bounds and data semantics", () => {
  const minimum = "2027-03-28T09:30";
  const maximum = "2027-03-30T09:30";
  const model = buildRenderModel({
    chart: chart("line", {
      presentation: {
        title: { align: "left" },
        collection: null,
        axes: {
          x: {
            min: minimum,
            max: maximum,
            tickFrequency: { every: 1, unit: "day" },
          },
        },
      },
    }),
    prepared: ready([
      { x: minimum, value: 4, measure: "value", measureLabel: "Value", clusterKey: "", groupKey: "", axis: "primary" },
      { x: maximum, value: 6, measure: "value", measureLabel: "Value", clusterKey: "", groupKey: "", axis: "primary" },
    ], { axisInterpretation: "temporal" }),
  });

  assert.equal(model.option.xAxis.type, "value");
  assert.equal(model.option.xAxis.min, Date.parse(minimum));
  assert.equal(model.option.xAxis.max, Date.parse(maximum));
  assert.equal(model.option.series[0].data[0][0], Date.parse(minimum));
  assert.equal(model.option.series[0].data[1][0], Date.parse(maximum));
});

test("field-only observations use canonical preparation metadata without downstream inference", () => {
  const model = buildRenderModel({
    chart: chart("line", {
      roles: { observation: { field: "recorded_at" } },
    }),
    prepared: ready([
      { x: "2027-05-01", value: 4, measure: "value", measureLabel: "Value", clusterKey: "", groupKey: "", axis: "primary" },
    ], { axisInterpretation: "temporal" }),
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
    ["25%", "62.5%"],
    ["75%", "62.5%"],
  ]);
  const svg = renderSvg(model.option, 800, 400);
  assert.match(svg, /Alpha/);
  assert.match(svg, /Beta/);
});

test("scatter and bubble encode canonical relationship marks, clusters, and requested point labels", () => {
  const prepared = ready([
    { x: 2, y: 5, size: 12, label: "Clinic A", cluster: "North", clusterKey: "North", group: null, groupKey: "" },
    { x: 4, y: 7, size: 30, label: "Clinic B", cluster: "South", clusterKey: "South", group: null, groupKey: "" },
  ]);
  const scatter = buildRenderModel({
    chart: chart("scatter", {
      presentation: { title: { align: "left" }, collection: null, labels: { visible: true, position: "bottom" } },
    }),
    prepared,
  });
  const bubble = buildRenderModel({ chart: chart("bubble"), prepared });

  assert.equal(scatter.option.series[0].type, "scatter");
  assert.deepEqual(scatter.option.series[0].data[0].value, [2, 5]);
  assert.equal(scatter.option.series.length, 2);
  assert.deepEqual(scatter.option.series[0].label, { show: true, position: "bottom" });
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

test("timeline and swimlane encode canonical intervals on time axes, lanes, and status colours", () => {
  const prepared = ready([
    { event: "Mobilize", start: "2027-05-01", end: "2027-05-03", lane: "Operations", status: "Active", group: null, groupKey: "" },
    { event: "Report", start: "2027-05-02", end: null, lane: "Planning", status: "Planned", group: null, groupKey: "" },
  ]);
  const timeline = buildRenderModel({ chart: chart("timeline"), prepared });
  const swimlane = buildRenderModel({ chart: chart("swimlane"), prepared });

  assert.equal(timeline.option.xAxis.type, "time");
  assert.deepEqual(timeline.option.yAxis.data, ["Operations", "Planning"]);
  assert.equal(timeline.option.series[0].type, "custom");
  assert.deepEqual(timeline.option.series.map(({ name }) => name), ["Active", "Planned"]);
  assert.deepEqual(timeline.option.legend.data, ["Active", "Planned"]);
  assert.deepEqual(timeline.option.series[0].data[0].value.slice(0, 3), ["2027-05-01", "2027-05-03", "Operations"]);
  assert.deepEqual(swimlane.option.yAxis.data, ["Operations", "Planning"]);
  assert.equal(swimlane.option.series[1].data[0].name, "Report");
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
    prepared: ready([{ actual: 8, target: 10, label: "Clinic A", time: null }]),
  });

  assert.equal(gauge.option.series[0].type, "gauge");
  assert.deepEqual(gauge.option.series[0].data[0], { value: 72, name: "gauge title", target: 80, time: "2027-05-02" });
  assert.equal(gauge.option.series[0].max, 100);
  assert.deepEqual(gauge.option.series[0].center, ["50%", "54%"]);
  assert.equal(gauge.option.series[0].radius, "52%");
  assert.equal(gauge.option.title.left, "right");
  assert.equal(gauge.option.series[0].detail.formatter(72), "72\nTarget 80");
  assert.deepEqual(gauge.semanticSummary.items, [{ label: "gauge title", actual: 72, target: 80, time: "2027-05-02" }]);
  assert.equal(bullet.option.series[0].type, "bar");
  assert.deepEqual(bullet.option.series[0].data, [8]);
  assert.equal(bullet.option.series[1].name, "Target");
  assert.deepEqual(bullet.option.series[1].data.map(({ value }) => value), [[10, "Clinic A"]]);
  assert.deepEqual(bullet.semanticSummary.items, [
    { label: "Clinic A", actual: 8, target: 10, time: null },
  ]);
});

test("gauge uses a precision arc with a detached needle and target ring", () => {
  const gauge = buildRenderModel({
    chart: chart("gauge", {
      presentation: { title: { align: "left" }, collection: null, targets: { ranges: [50, 80, 100] } },
    }),
    prepared: ready([{ value: 76, target: 72, time: "2027-05-02" }]),
  });

  const series = gauge.option.series[0];
  assert.equal(series.startAngle, 200);
  assert.equal(series.endAngle, -20);
  assert.equal(series.axisLine.lineStyle.width, 14);
  assert.equal(series.axisLine.roundCap, true);
  assert.deepEqual(series.pointer, {
    length: "34%",
    width: 4,
    offsetCenter: [0, "-24%"],
    itemStyle: { color: "#2c383d" },
  });
  assert.equal(series.anchor.show, false);
  assert.deepEqual(gauge.option.series[1], {
    name: "Target 72",
    type: "gauge",
    min: 0,
    max: 100,
    startAngle: 200,
    endAngle: -20,
    center: ["50%", "54%"],
    radius: "52%",
    axisLine: { show: false },
    axisLabel: { show: false },
    axisTick: { show: false },
    splitLine: { show: false },
    anchor: { show: false },
    detail: { show: false },
    title: { show: false },
    pointer: {
      icon: "circle",
      width: 12,
      length: 12,
      offsetCenter: [0, "-94%"],
      itemStyle: {
        color: "#fffdf8",
        borderColor: "#2c383d",
        borderWidth: 3,
      },
    },
    data: [{ value: 72, name: "Target 72" }],
  });
  const svg = renderSvg(gauge.option);
  assert.match(svg, /fill="#fffdf8"/);
  assert.match(svg, /stroke="#2c383d"/);

  const gaugeWithoutTarget = buildRenderModel({
    chart: chart("gauge"),
    prepared: ready([{ value: 76, target: null, time: "2027-05-02" }]),
  });
  assert.equal(gaugeWithoutTarget.option.series.length, 1);
});

test("multi-item gauges preserve every prepared mark as renderer-neutral collection items", () => {
  const collection = {
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
  };
  const model = buildRenderModel({
    chart: chart("gauge", {
      presentation: { title: { align: "left" }, collection },
    }),
    prepared: ready([
      { value: 72, target: 80, label: "Clinic A", time: "2027-05-02" },
      { value: 55, target: 70, entity: "Clinic B", time: "2027-05-03" },
    ]),
  });

  assert.equal(model.kind, "targetCollection");
  assert.deepEqual(model.items.map(({ model: itemModel }) => itemModel.option.series[0].data[0]), [
    { value: 72, name: "Clinic A", target: 80, time: "2027-05-02" },
    { value: 55, name: "Clinic B", target: 70, time: "2027-05-03" },
  ]);
  assert.equal(model.items.every(({ model: itemModel }) => itemModel.option.series.length === 2), true);
  assert.deepEqual(model.items.map(({ model: itemModel }) => itemModel.option.series[1].data[0].value), [80, 70]);
  assert.equal(model.items.every(({ model: itemModel }) => (
    itemModel.option.series[0].center[1] === "58%"
  )), true);
  assert.deepEqual(model.presentation.collection, collection);
  assert.deepEqual(
    model.items.map(({ model: itemModel }) => itemModel.semanticSummary.items[0]),
    [
      { label: "Clinic A", actual: 72, target: 80, time: "2027-05-02" },
      { label: "Clinic B", actual: 55, target: 70, time: "2027-05-03" },
    ],
  );
});

test("KPI, delta card, and delta list produce semantic card models", () => {
  const kpi = buildRenderModel({
    chart: chart("kpi"),
    prepared: ready([{ value: 72, target: 80, time: "2027-05-02" }]),
  });
  const deltaPrepared = ready([
    { entity: "Clinic A", displayed: 10, displayedTime: "2027-05-02", comparison: 8, comparisonTime: "2027-05-01", target: 12, time: "2027-05-02", delta: { absolute: 2, percentage: 25 } },
    { entity: "Clinic B", displayed: 4, displayedTime: "2027-05-02", comparison: 8, comparisonTime: "2027-05-01", target: 7, time: "2027-05-02", delta: { absolute: -4, percentage: -50 } },
  ]);
  const deltaCard = buildRenderModel({ chart: chart("deltaCard"), prepared: ready([deltaPrepared.marks[0]]) });
  const deltaList = buildRenderModel({
    chart: chart("deltaList", {
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
    favorability: null,
  });
  assert.equal(deltaCard.items[0].direction, "increase");
  assert.deepEqual(deltaCard.items[0].delta, { absolute: 2, percentage: 25 });
  assert.equal(deltaCard.items[0].comparisonTime, "2027-05-01");
  assert.equal(deltaCard.items[0].time, "2027-05-02");
  assert.deepEqual(deltaList.items.map(({ label, direction }) => [label, direction]), [
    ["Clinic A", "increase"],
    ["Clinic B", "decrease"],
  ]);
  assert.deepEqual(deltaList.presentation.collection, {
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
  });
});

test("chronological choropleths retain full prepared history but build one bounded live frame", () => {
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
  assert.equal(prepared.marks.length, 3);
  assert.equal(chronological.option.timeline, undefined);
  assert.equal(chronological.option.options, undefined);
  assert.deepEqual(
    chronological.option.series[0].data.map(({ name }) => name),
    ["GE-TB", "GE-AJ"],
  );
});

test("geography zoom enables renderer scaling only when the chart interaction enables it", () => {
  const enabled = buildRenderModel({
    chart: chart("choroplethMap", {
      interaction: { zoom: { enabled: true } },
    }),
    prepared: ready([
      { geography: "GE-TB", value: 7, time: null, feature: { name: "Tbilisi" }, group: null, groupKey: "" },
    ]),
  });
  const disabled = buildRenderModel({
    chart: chart("choroplethMap", {
      interaction: { zoom: { enabled: false } },
    }),
    prepared: ready([
      { geography: "GE-TB", value: 7, time: null, feature: { name: "Tbilisi" }, group: null, groupKey: "" },
    ]),
  });

  assert.equal(enabled.option.geo.roam, true);
  assert.deepEqual(enabled.interaction, {
    zoom: { enabled: true, modifierKey: "Control", target: "geo" },
  });
  assert.equal(disabled.option.geo.roam, false);
  assert.deepEqual(disabled.interaction, {
    zoom: { enabled: false, modifierKey: "Control", target: "geo" },
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
      { rowKey: "table:clinic-a", columns: ["facility", "score"], values: { facility: "Clinic", score: 3 }, time: "2027-05-02" },
      { rowKey: "table:hospital-b", columns: ["facility", "score"], values: { facility: "Hospital", score: 5 }, time: null },
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
    { key: "table:clinic-a", time: "2027-05-02" },
    { key: "table:hospital-b", time: null },
  ]);
  assert.deepEqual(image, {
    kind: "image",
    src: "/map.png",
    alt: "Response map",
    fit: "contain",
    legacyInline: true,
  });
});

test("table row keys are canonical for equal structured values and remain unique for duplicates", () => {
  const model = buildRenderModel({
    chart: chart("table"),
    prepared: ready([
      { columns: ["details"], values: { details: { b: 2, a: 1 } }, time: null },
      { columns: ["details"], values: { details: { a: 1, b: 2 } }, time: null },
    ]),
  });

  assert.equal(model.rowMetadata[1].key, `${model.rowMetadata[0].key}#2`);
});

test("non-ready input produces a bounded error model with the first diagnostic", () => {
  const longMessage = `Invalid binding ${"x".repeat(500)}`;
  const invalid = buildRenderModel({
    chart: chart("bar"),
    prepared: { status: "invalid", marks: [], diagnostics: [{ severity: "error", message: longMessage }], meta: {} },
  });
  const empty = buildRenderModel({
    chart: chart("bar"),
    prepared: { status: "empty", marks: [], diagnostics: [], meta: {} },
  });

  assert.equal(invalid.kind, "error");
  assert.match(invalid.message, /^Invalid binding/);
  assert.ok(invalid.message.length <= 240);
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

test("line playback retains history and adds one status-aware active marker per available series", () => {
  const activeTime = {
    groupId: "exercise",
    epochMs: MAY_2,
    canonical: "2027-05-02",
    mode: "trace",
    status: "mixed",
  };
  const model = buildRenderModel({
    chart: chart("line"),
    prepared: ready([
      { x: "2027-05-01", value: 10, measure: "cases", measureLabel: "Cases", clusterKey: "", groupKey: "", axis: "primary", active: false, temporalProvenance: { status: "observed", activeEpochMs: MAY_2, activeCanonical: "2027-05-02", sourceEpochMs: MAY_2 } },
      { x: "2027-05-02", value: 15, measure: "cases", measureLabel: "Cases", clusterKey: "", groupKey: "", axis: "primary", active: true, temporalProvenance: { status: "observed", activeEpochMs: MAY_2, activeCanonical: "2027-05-02", sourceEpochMs: MAY_2 } },
      { x: "2027-05-01", value: 4, measure: "rate", measureLabel: "Rate", clusterKey: "", groupKey: "", axis: "secondary", active: false, temporalProvenance: { status: "interpolated", activeEpochMs: MAY_2, activeCanonical: "2027-05-02", lowerEpochMs: MAY_1, upperEpochMs: MAY_3 } },
      { x: "2027-05-02", value: 5, measure: "rate", measureLabel: "Rate", clusterKey: "", groupKey: "", axis: "secondary", active: true, temporalProvenance: { status: "interpolated", activeEpochMs: MAY_2, activeCanonical: "2027-05-02", lowerEpochMs: MAY_1, upperEpochMs: MAY_3 } },
      { x: "2027-05-03", value: 6, measure: "rate", measureLabel: "Rate", clusterKey: "", groupKey: "", axis: "secondary", active: false, temporalProvenance: { status: "interpolated", activeEpochMs: MAY_2, activeCanonical: "2027-05-02", lowerEpochMs: MAY_1, upperEpochMs: MAY_3 } },
      { x: "2027-05-01", value: 2, measure: "missing", measureLabel: "Missing", clusterKey: "", groupKey: "", axis: "primary", active: false, temporalProvenance: { status: "missing", activeEpochMs: MAY_2, activeCanonical: "2027-05-02" } },
    ], { axisInterpretation: "temporal", activeTime }),
  });
  const cases = model.option.series.find(({ name }) => name === "Cases");
  const rate = model.option.series.find(({ name }) => name === "Rate");
  const missing = model.option.series.find(({ name }) => name === "Missing");

  assert.equal(cases.data.length, 2);
  assert.deepEqual(cases.markPoint.data[0].coord, ["2027-05-02", 15]);
  assert.equal(cases.markPoint.symbol, "circle");
  assert.equal(cases.markPoint.data[0].provenance.label, "Observed 2027-05-02");
  assert.equal(rate.data.length, 3);
  assert.deepEqual(rate.markPoint.data[0].coord, ["2027-05-02", 5]);
  assert.equal(rate.markPoint.symbol, "emptyCircle");
  assert.equal(rate.markPoint.data[0].itemStyle.borderType, "dashed");
  assert.equal(rate.markPoint.data[0].provenance.label, "Interpolated between 2027-05-01 and 2027-05-03");
  assert.equal(missing.markPoint, undefined);
});

test("line playback overlays carried and nearest values at the shared clock without moving source history", () => {
  const activeTime = {
    groupId: "exercise",
    epochMs: MAY_2,
    canonical: "2027-05-02",
    mode: "trace",
    status: "mixed",
  };
  const model = buildRenderModel({
    chart: chart("line"),
    prepared: ready([
      {
        x: "2027-05-01",
        value: 1,
        measure: "carried",
        measureLabel: "Carried",
        clusterKey: "",
        groupKey: "",
        axis: "primary",
        active: true,
        temporalProvenance: {
          status: "carried",
          activeEpochMs: MAY_2,
          activeCanonical: "2027-05-02",
          sourceEpochMs: MAY_1,
        },
      },
      {
        x: "2027-05-03",
        value: 7,
        measure: "nearest",
        measureLabel: "Nearest",
        clusterKey: "",
        groupKey: "",
        axis: "primary",
        active: true,
        temporalProvenance: {
          status: "nearest",
          activeEpochMs: MAY_2,
          activeCanonical: "2027-05-02",
          sourceEpochMs: MAY_3,
        },
      },
    ], { axisInterpretation: "temporal", activeTime }),
  });
  const carried = model.option.series.find(({ name }) => name === "Carried");
  const nearest = model.option.series.find(({ name }) => name === "Nearest");

  assert.deepEqual(carried.data, [["2027-05-01", 1]]);
  assert.deepEqual(carried.markPoint.data[0].coord, ["2027-05-02", 1]);
  assert.equal(carried.markPoint.data[0].provenance.label, "Last measured 2027-05-01");
  assert.deepEqual(nearest.data, [["2027-05-03", 7]]);
  assert.deepEqual(nearest.markPoint.data[0].coord, ["2027-05-02", 7]);
  assert.equal(nearest.markPoint.data[0].provenance.label, "Nearest measurement 2027-05-03");
});

test("snapshot bars annotate prepared active values without duplicating series or inventing points", () => {
  const activeTime = {
    groupId: "exercise",
    epochMs: MAY_2,
    canonical: "2027-05-02",
    mode: "snapshot",
    status: "mixed",
  };
  const model = buildRenderModel({
    chart: chart("bar"),
    prepared: ready([
      { x: "2027-05-02", value: 12, measure: "cases", measureLabel: "Cases", cluster: "A", clusterKey: "A", groupKey: "", axis: "primary", active: true, temporalProvenance: { status: "observed", activeEpochMs: MAY_2, activeCanonical: "2027-05-02", sourceEpochMs: MAY_2 } },
      { x: "2027-05-02", value: 20, measure: "cases", measureLabel: "Cases", cluster: "B", clusterKey: "B", groupKey: "", axis: "primary", active: true, temporalProvenance: { status: "carried", activeEpochMs: MAY_2, activeCanonical: "2027-05-02", sourceEpochMs: MAY_1 } },
    ], { axisInterpretation: "temporal", activeTime }),
  });
  const carried = model.option.series.find(({ name }) => /Cases.*B/.test(name));

  assert.equal(model.option.series.length, 2);
  assert.equal(carried.data.length, 1);
  assert.deepEqual(carried.data[0].value, ["2027-05-02", 20]);
  assert.equal(carried.data[0].active, true);
  assert.equal(carried.data[0].temporalStatus, "carried");
  assert.equal(carried.data[0].itemStyle.borderType, "dashed");
  assert.equal(carried.data[0].provenance.label, "Last measured 2027-05-01");
  assert.equal(carried.markPoint, undefined);

  const missing = buildRenderModel({
    chart: chart("bar"),
    prepared: ready([
      { x: "2027-05-01", value: 4, measure: "cases", measureLabel: "Cases", clusterKey: "", groupKey: "", axis: "primary", active: false, temporalProvenance: { status: "missing", activeEpochMs: MAY_2, activeCanonical: "2027-05-02" } },
    ], { axisInterpretation: "temporal", activeTime: { ...activeTime, status: "missing" } }),
  });

  assert.equal(missing.option.series[0].markPoint, undefined);
  assert.deepEqual(missing.option.series[0].data, [["2027-05-01", 4]]);
});

test("heatmap playback highlights active prepared cells and retains unrelated cells", () => {
  const activeTime = {
    groupId: "exercise",
    epochMs: MAY_2,
    canonical: "2027-05-02",
    mode: "snapshot",
    status: "nearest",
  };
  const model = buildRenderModel({
    chart: chart("heatmap"),
    prepared: ready([
      { row: "Clinic A", column: "Power", value: 2, time: "2027-05-01", active: false, temporalProvenance: { status: "missing", activeEpochMs: MAY_2, activeCanonical: "2027-05-02" } },
      { row: "Clinic A", column: "Water", value: 3, time: "2027-05-02", active: true, temporalProvenance: { status: "nearest", activeEpochMs: MAY_2, activeCanonical: "2027-05-02", sourceEpochMs: MAY_3 } },
      { row: "Clinic B", column: "Power", value: 1, time: "2027-05-03", active: false, temporalProvenance: { status: "missing", activeEpochMs: MAY_2, activeCanonical: "2027-05-02" } },
    ], { activeTime }),
  });

  assert.equal(model.option.series[0].data.length, 3);
  const activeCell = model.option.series[0].data.find(({ active }) => active);
  assert.deepEqual(activeCell.value, [1, 0, 3]);
  assert.equal(activeCell.temporalStatus, "nearest");
  assert.equal(activeCell.itemStyle.borderType, "dashed");
  assert.equal(activeCell.provenance.label, "Nearest measurement 2027-05-03");
});

test("timeline and swimlane playback retain history while identifying observed and estimated events", () => {
  const activeTime = {
    groupId: "exercise",
    epochMs: MAY_2,
    canonical: "2027-05-02",
    mode: "trace",
    status: "mixed",
  };
  for (const [typeId, status, provenance, expectedLabel] of [
    ["timeline", "observed", { status: "observed", activeEpochMs: MAY_2, activeCanonical: "2027-05-02", sourceEpochMs: MAY_2 }, "Observed 2027-05-02"],
    ["swimlane", "nearest", { status: "nearest", activeEpochMs: MAY_2, activeCanonical: "2027-05-02", sourceEpochMs: MAY_3 }, "Nearest measurement 2027-05-03"],
  ]) {
    const model = buildRenderModel({
      chart: chart(typeId),
      prepared: ready([
        { event: "Mobilize", start: "2027-05-01", end: "2027-05-01", lane: "Ops", status: "Planned", active: false, temporalProvenance: provenance },
        { event: "Activate", start: "2027-05-02", end: "2027-05-02", lane: "Ops", status: "Active", active: true, temporalProvenance: { ...provenance, status } },
      ], { activeTime }),
    });

    const events = model.option.series.flatMap(({ data }) => data);
    assert.equal(events.length, 2);
    assert.equal(events.find(({ event }) => event === "Mobilize").active, false);
    const activeEvent = events.find(({ event }) => event === "Activate");
    assert.equal(activeEvent.active, true);
    assert.equal(activeEvent.temporalStatus, status);
    assert.equal(activeEvent.provenance.label, expectedLabel);
    assert.equal(activeEvent.itemStyle.borderType, status === "observed" ? "solid" : "dashed");
  }
});

test("geography playback renders only prepared active frames with time and provenance metadata", () => {
  const activeTime = {
    groupId: "exercise",
    epochMs: MAY_2,
    canonical: "2027-05-02",
    mode: "snapshot",
    status: "carried",
  };
  const active = {
    geography: "GE-TB",
    value: 7,
    time: "2027-05-02",
    coordinates: [44.79, 41.72],
    feature: { name: "Tbilisi" },
    active: true,
    temporalProvenance: { status: "carried", activeEpochMs: MAY_2, activeCanonical: "2027-05-02", sourceEpochMs: MAY_1 },
  };
  const inactiveFuture = {
    geography: "GE-AJ",
    value: 99,
    time: "2027-05-03",
    coordinates: [41.64, 41.65],
    feature: { name: "Adjara" },
    active: false,
    temporalProvenance: { status: "missing", activeEpochMs: MAY_2, activeCanonical: "2027-05-02" },
  };
  const chronological = buildRenderModel({
    chart: chart("chronoChoroplethMap"),
    prepared: ready([active, inactiveFuture], { activeTime }),
  });
  const scatter = buildRenderModel({
    chart: chart("mapScatter"),
    prepared: ready([active, inactiveFuture], { activeTime }),
  });

  assert.equal(chronological.option.timeline, undefined);
  assert.deepEqual(chronological.option.series[0].data.map(({ name }) => name), ["GE-TB"]);
  assert.equal(chronological.temporal.activeTime, "2027-05-02");
  assert.equal(chronological.option.series[0].data[0].temporalStatus, "carried");
  assert.equal(chronological.option.series[0].data[0].provenance.label, "Last measured 2027-05-01");
  assert.deepEqual(scatter.option.series[0].data.map(({ geography }) => geography), ["GE-TB"]);
  assert.equal(scatter.option.series[0].data[0].activeTime, "2027-05-02");
});

test("KPI, gauge, and bullet playback expose family-correct provenance without changing static output", () => {
  const activeTime = {
    groupId: "exercise",
    epochMs: MAY_2,
    canonical: "2027-05-02",
    mode: "snapshot",
    status: "mixed",
  };
  const carried = { status: "carried", activeEpochMs: MAY_2, activeCanonical: "2027-05-02", sourceEpochMs: MAY_1 };
  const nearest = { status: "nearest", activeEpochMs: MAY_2, activeCanonical: "2027-05-02", sourceEpochMs: MAY_3 };
  const interpolated = { status: "interpolated", activeEpochMs: MAY_2, activeCanonical: "2027-05-02", lowerEpochMs: MAY_1, upperEpochMs: MAY_3 };
  const kpi = buildRenderModel({
    chart: chart("kpi"),
    prepared: ready([{ value: 12, target: 15, time: "2027-05-02", active: true, temporalProvenance: carried }], { activeTime }),
  });
  const gauge = buildRenderModel({
    chart: chart("gauge"),
    prepared: ready([{ value: 12, target: 15, time: "2027-05-02", active: true, temporalProvenance: nearest }], { activeTime }),
  });
  const bullet = buildRenderModel({
    chart: chart("bullet"),
    prepared: ready([{ actual: 12, target: 15, label: "Clinic A", time: "2027-05-02", active: true, temporalProvenance: interpolated }], { activeTime }),
  });

  assert.equal(kpi.items[0].provenance.label, "Last measured 2027-05-01");
  assert.equal(gauge.option.series[0].data[0].provenance.label, "Nearest measurement 2027-05-03");
  assert.equal(gauge.semanticSummary.items[0].provenance.status, "nearest");
  assert.equal(bullet.option.series[0].data[0].provenance.label, "Interpolated between 2027-05-01 and 2027-05-03");
  assert.equal(bullet.option.series[0].data[0].itemStyle.borderType, "dashed");

  const missing = buildRenderModel({
    chart: chart("kpi"),
    prepared: ready([{ value: 4, time: "2027-05-01", active: false, temporalProvenance: { status: "missing", activeEpochMs: MAY_2, activeCanonical: "2027-05-02" } }], { activeTime: { ...activeTime, status: "missing" } }),
  });
  assert.equal(missing.items[0].provenance, undefined);
});

test("delta playback keeps displayed and comparison provenance distinct", () => {
  const model = buildRenderModel({
    chart: chart("deltaCard"),
    prepared: ready([{
      entity: "Clinic A",
      displayed: 20,
      displayedTime: "2027-05-02",
      comparison: 10,
      comparisonTime: "2027-05-01",
      delta: { absolute: 10, percentage: 100 },
      active: true,
      temporalProvenance: {
        status: "interpolated",
        activeEpochMs: MAY_2,
        activeCanonical: "2027-05-02",
        lowerEpochMs: MAY_1,
        upperEpochMs: MAY_3,
        comparison: {
          status: "observed",
          activeEpochMs: MAY_1,
          activeCanonical: "2027-05-01",
          sourceEpochMs: MAY_1,
        },
      },
    }], {
      activeTime: {
        groupId: "exercise",
        epochMs: MAY_2,
        canonical: "2027-05-02",
        mode: "snapshot",
        status: "interpolated",
      },
    }),
  });
  const item = model.items[0];

  assert.equal(item.provenance.label, "Interpolated between 2027-05-01 and 2027-05-03");
  assert.equal(item.comparisonProvenance.label, "Observed 2027-05-01");
  assert.deepEqual(item.delta, { absolute: 10, percentage: 100 });
  assert.equal(Object.hasOwn(item.provenance, "comparison"), false);
});
