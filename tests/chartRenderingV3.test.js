import assert from "node:assert/strict";
import test from "node:test";
import { register } from "node:module";

import * as echarts from "echarts";

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
  sameChartTextTheme,
} = await import("../src/components/charts/EChartsChartView.jsx");

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

test("ECharts title visibility defaults on and hides without dropping structural text", () => {
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
    { show: true, text: "Capacity" },
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
  assert.equal(model.option.yAxis[0].name, "Cases");
  assert.equal(model.option.yAxis[0].nameLocation, "end");
  assert.equal(model.option.yAxis[0].nameRotate, 0);
  assert.equal(model.option.yAxis[0].interval, 5);
  assert.equal(model.option.yAxis[1].name, "Rate");
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

test("horizontal bars keep the configured X-axis title horizontal", () => {
  const model = buildRenderModel({
    chart: chart("horizontalBar", {
      presentation: {
        title: { align: "left" },
        collection: null,
        axes: { x: { title: "Confirmed cases", min: 0, max: 100 } },
      },
    }),
    prepared: axisMarks,
  });

  assert.equal(model.option.xAxis[0].name, "Confirmed cases");
  assert.equal(model.option.xAxis[0].nameRotate, 0);
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
  assert.equal(fallback.option.xAxis[0].name, "Fallback value title");
  assert.equal(fallback.option.xAxis[0].nameRotate, 0);
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
    prepared: ready([{ actual: 8, target: 10, label: "Clinic A", time: null }]),
  });

  assert.equal(gauge.option.series[0].type, "gauge");
  assert.deepEqual(gauge.option.series[0].data[0], { value: 72, name: "gauge title", target: 80, time: "2027-05-02" });
  assert.equal(gauge.option.series[0].max, 100);
  assert.deepEqual(gauge.option.series[0].center, ["50%", "54%"]);
  assert.equal(gauge.option.series[0].radius, "52%");
  assert.equal(gauge.option.title.left, "right");
  assert.deepEqual(gauge.semanticSummary.items, [{ label: "gauge title", actual: 72, target: 80, time: "2027-05-02" }]);
  assert.equal(bullet.option.series[0].type, "bar");
  assert.deepEqual(bullet.option.series[0].data, [8]);
  assert.equal(bullet.option.series[1].name, "Target");
  assert.deepEqual(bullet.option.series[1].data.map(({ value }) => value), [[10, "Clinic A"]]);
  assert.deepEqual(bullet.semanticSummary.items, [
    { label: "Clinic A", actual: 8, target: 10, time: null },
  ]);
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
  assert.equal(model.items.every(({ model: itemModel }) => itemModel.option.series.length === 1), true);
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

    assert.equal(model.option.series[0].data.length, 2);
    assert.equal(model.option.series[0].data[0].active, false);
    assert.equal(model.option.series[0].data[1].active, true);
    assert.equal(model.option.series[0].data[1].temporalStatus, status);
    assert.equal(model.option.series[0].data[1].provenance.label, expectedLabel);
    assert.equal(model.option.series[0].data[1].itemStyle.borderType, status === "observed" ? "solid" : "dashed");
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
