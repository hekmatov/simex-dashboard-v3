import test from "node:test";
import assert from "node:assert/strict";
import * as echarts from "echarts";
import { samplePhoneTicks, capPhoneAxisLabels, compactPhoneCartesianGrid, phoneFullscreenHeatmapZoom } from "../src/charting/rendering/phoneChartPresentation.js";
import { applyChartTypography, resolveChartTypography } from "../src/charting/rendering/chartTypography.js";

test("phone Cartesian charts widen the actual dual-axis plot while keeping labels inside the canvas", () => {
  const grid = { containLabel: true, left: 48, right: 56, top: 12, bottom: 35 };
  const option = {
    animation: false, grid, xAxis: { type: "category", data: ["Mar", "Apr", "May"] },
    yAxis: [{ type: "value" }, { type: "value" }],
    series: [{ type: "line", data: [12000, 13000, 20000] }, { type: "line", yAxisIndex: 1, data: [130, 170, 200] }],
  };
  const instance = echarts.init(null, null, { renderer: "svg", ssr: true, width: 374, height: 280 });
  try {
    instance.setOption(option);
    const plot = () => instance.getModel().getComponent("grid").coordinateSystem.getRect();
    const originalWidth = plot().width;
    instance.setOption({ grid: compactPhoneCartesianGrid(option) });
    assert.ok(plot().width >= originalWidth + 80);
    assert.ok(plot().x > 20);
    assert.ok(374 - plot().x - plot().width > 20);
    assert.deepEqual(option.grid, grid);
    assert.equal(compactPhoneCartesianGrid({ ...option, visualMap: {} }), grid);
  } finally { instance.dispose(); }
});

test("long phone bar categories leave the majority of the canvas for the bars", () => {
  const source = {
    animation: false,
    grid: { containLabel: true, left: 24, right: 28, top: 12, bottom: 35 },
    xAxis: { type: "value" },
    yAxis: { type: "category", data: ["Bescherming gezondheid kwetsbare burgers", "Uitvoerbaarheid en naleefbaarheid"] },
    series: [{ type: "bar", data: [54, 81] }],
  };
  const instance = echarts.init(null, null, { renderer: "svg", ssr: true, width: 344, height: 270 });
  try {
    const phone = applyChartTypography(source, {}, resolveChartTypography({}, { typographyProfile: "phone" }));
    instance.setOption({ ...phone, grid: compactPhoneCartesianGrid(phone) });
    const model = instance.getModel();
    assert.ok(model.getComponent("grid").coordinateSystem.getRect().width > 200);
    assert.deepEqual(model.getComponent("yAxis").get("data"), source.yAxis.data);
  } finally { instance.dispose(); }
});

test("phone axis label sampling retains endpoints and caps real numeric/category/calendar labels", () => {
  assert.deepEqual(samplePhoneTicks(Array.from({ length: 21 }, (_, value) => ({ value }))), [0, 4, 8, 12, 16, 20]);
  for (const type of ["value", "category", "time"]) {
    const instance = echarts.init(null, null, { renderer: "svg", ssr: true, width: 390, height: 350 });
    try {
      const values = Array.from({ length: 30 }, (_, index) => type === "time" ? Date.UTC(2026, 0, index + 1) : index);
      instance.setOption({ animation: false, xAxis: { type, ...(type === "category" ? { data: values.map(String), axisLabel: { interval: 0 } } : type === "time" ? { minInterval: 86400000, maxInterval: 86400000 } : { interval: 1 }) }, yAxis: { type: "value" }, series: [{ type: "line", data: values.map((value, index) => type === "category" ? index : [value, index]) }] });
      capPhoneAxisLabels(instance);
      const axis = instance.getModel().getComponent("xAxis");
      assert.ok(axis.get("axisLabel.customValues").length <= 6, type);
      assert.ok(new Set(axis.axis.getViewLabels().map(label => label.tickValue)).size <= 6, `${type} engine label projection`);
      if (type === "value") assert.equal(axis.get("interval"), 1);
      if (type === "time") {
        assert.equal(axis.get("minInterval"), 86400000);
        assert.equal(axis.get(["axisLabel", "formatter"])(Date.UTC(2027, 2, 20, 23)), "Mar 20");
      }
      assert.ok(instance.renderToSVGString().includes("<svg"));
    } finally { instance.dispose(); }
  }
});

test("phone fullscreen heatmap has real two-axis zoom and preserves View/Build/passive source contracts", () => {
  const chart = { typeId: "heatmap", interaction: { zoom: { enabled: false } } };
  const model = { kind: "echarts", option: { animation: false, xAxis: { type: "category", data: Array.from({ length: 20 }, (_, index) => `Column ${index}`) }, yAxis: { type: "category", data: ["A", "B"] }, series: [{ type: "heatmap", data: Array.from({ length: 40 }, (_, index) => [index % 20, Math.floor(index / 20), index]) }], visualMap: { min: 0, max: 40 } } };
  const original = structuredClone({ chart, model });
  const context = { chart, surface: "fullscreen", typographyProfile: "phone", interactionMode: "active" };
  for (const override of [{ surface: "view" }, { surface: "build" }, { surface: "export" }, { typographyProfile: "desktop" }, { interactionMode: "passive" }]) assert.equal(phoneFullscreenHeatmapZoom(model, { ...context, ...override }), model);
  const zoomed = phoneFullscreenHeatmapZoom(model, context);
  assert.deepEqual(zoomed.option.dataZoom.map(zoom => zoom.filterMode), ["none", "none"]);
  const instance = echarts.init(null, null, { renderer: "svg", ssr: true, width: 390, height: 350 });
  try {
    instance.setOption(zoomed.option);
    instance.dispatchAction({ type: "dataZoom", dataZoomIndex: 0, start: 20, end: 70 });
    assert.deepEqual(instance.getModel().getComponent("dataZoom", 0).getPercentRange(), [20, 70]);
    assert.equal(instance.getModel().getSeriesByIndex(0).getData().count(), 40);
    capPhoneAxisLabels(instance);
    assert.ok(instance.getModel().getComponent("xAxis").get("axisLabel.customValues").length <= 6);
  } finally { instance.dispose(); }
  assert.deepEqual({ chart, model }, original);
});
