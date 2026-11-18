import assert from "node:assert/strict";
import test from "node:test";
import { resolveChartTypography, applyChartTypography } from "../src/charting/rendering/chartTypography.js";
import { chartTitleStyle } from "../src/components/charts/chartViewPresentation.js";

test("phone typography projects readable labels, bottom legends and two-line titles without changing authored settings", () => {
  const chart = { layout: { width: 4, height: 2 }, presentation: { legend: { position: "right", fontSize: 9 }, title: { fontSize: 20 } } };
  const option = { xAxis: { type: "time", minInterval: 86400000, maxInterval: 86400000, axisLabel: { fontSize: 9 } }, yAxis: { type: "value", interval: 2, axisLabel: { show: false, fontSize: 10 } }, legend: { orient: "vertical", left: "right", top: 12, textStyle: { fontSize: 9 } } };
  const original = structuredClone({ chart, option });
  const policy = resolveChartTypography(chart, { typographyProfile: "phone" });
  const phone = applyChartTypography(option, chart, policy);
  assert.equal(policy.maxTicks, 5); assert.equal(policy.maxValueTicks, 5);
  assert.equal(phone.xAxis.axisLabel.margin, 4);
  assert.equal(phone.xAxis.axisLabel.hideOverlap, true);
  assert.equal(phone.xAxis.axisLabel.fontSize, 12);
  assert.equal(phone.yAxis.axisLabel.fontSize, 12);
  assert.equal(phone.yAxis.axisLabel.show, false);
  assert.equal(phone.xAxis.minInterval, 86400000);
  assert.equal(phone.yAxis.interval, 2);
  assert.equal(phone.legend.orient, "horizontal"); assert.equal(phone.legend.bottom, 0); assert.equal(phone.legend.top, null);
  assert.equal(phone.legend.textStyle.fontSize, 12);
  assert.equal(chartTitleStyle(chart, policy).WebkitLineClamp, 2);
  assert.equal(chartTitleStyle(chart, policy).fontSize, "20px");
  assert.deepEqual({ chart, option }, original);
  const desktop = applyChartTypography(option, chart, resolveChartTypography(chart));
  assert.equal(desktop.xAxis.axisLabel.fontSize, 9); assert.equal(desktop.legend.orient, "vertical");
  assert.equal(chartTitleStyle(chart, resolveChartTypography(chart)).WebkitLineClamp, undefined);
  const audience = resolveChartTypography(chart, { typographyProfile: "phone", audienceScale: { tier: "distance", title: 28, text: 18, value: 40 } });
  assert.equal(audience.phone, undefined); assert.equal(audience.label, 18);
});

test("footprint text budgets retain readable labels while wide and full charts gain density", () => {
  const compact = resolveChartTypography({ layout: { width: 1, height: 1 } });
  const standard = resolveChartTypography({ layout: { width: 2, height: 1 } });
  const wide = resolveChartTypography({ layout: { width: 4, height: 1 } });
  const full = resolveChartTypography({ layout: { width: 4, height: 2 } });
  assert.deepEqual([compact.tier, standard.tier, wide.tier, full.tier], ["compact", "standard", "wide", "full"]);
  assert.deepEqual([compact.maxTicks, standard.maxTicks, wide.maxTicks, full.maxTicks], [4, 6, 10, 10]);
  assert.ok([compact, standard, wide, full].every(policy => policy.label >= 12 && policy.legend >= 12));
  const fractional = resolveChartTypography({ layout: { width: 4, height: 0.5 } });
  assert.equal(fractional.tier, "short");
  assert.equal(fractional.title, 14);
  assert.equal(fractional.maxTicks, 10);
  assert.equal(fractional.maxValueTicks, 3);
  assert.deepEqual(resolveChartTypography({}), standard);
});

test("Audience composition budgets remain authoritative and preserve their exact sizes", () => {
  for (const scale of [{ tier: "distance-large", title: 28, text: 18, value: 40 }, { tier: "distance-grid", title: 24, text: 16, value: 34 }]) {
    const policy = resolveChartTypography({ layout: { width: 1, height: 0.5 } }, { audienceScale: scale });
    assert.equal(policy.title, scale.title);
    assert.equal(policy.label, scale.text);
    assert.equal(policy.legend, scale.text);
    assert.equal(policy.value, scale.value);
    assert.equal(policy.tier, scale.tier);
  }
});

test("automatic label density and legend defaults use the shared budget without mutating source options", () => {
  const option = { xAxis: { type: "category", data: Array.from({ length: 20 }, (_, i) => `Long category ${i}`) }, yAxis: { type: "value" }, legend: { textStyle: { color: "token-color", fontSize: 11 } } };
  const policy = resolveChartTypography({ layout: { width: 1, height: 0.5 } });
  const result = applyChartTypography(option, {}, policy);
  assert.equal(result.xAxis.axisLabel.fontSize, 12);
  assert.equal(result.xAxis.axisLabel.interval, 6);
  assert.equal(result.yAxis.splitNumber, 2);
  assert.equal(result.legend.textStyle.fontSize, 12);
  assert.equal(result.legend.textStyle.color, "token-color");
  assert.equal(result.legend.textStyle.overflow, "break");
  assert.equal(result.legend.textStyle.width, 96);
  assert.equal(option.xAxis.axisLabel, undefined);
  assert.equal(option.legend.textStyle.fontSize, 11);
});

test("calendar cadence, array axes and authored legend no-wrap retain their contracts", () => {
  const chart = { presentation: { legend: { wrap: false } } };
  const option = { xAxis: [{ type: "time", minInterval: 31 * 86400000, maxInterval: 31 * 86400000 }], yAxis: [{ type: "value", splitNumber: 8 }], legend: [{ textStyle: { fontSize: 11 } }] };
  const result = applyChartTypography(option, chart, resolveChartTypography(chart));
  assert.equal(result.xAxis[0].splitNumber, undefined);
  assert.equal(result.xAxis[0].minInterval, option.xAxis[0].minInterval);
  assert.equal(result.yAxis[0].splitNumber, 8);
  assert.equal(result.legend[0].textStyle.overflow, undefined);
  assert.equal(result.legend[0].textStyle.width, undefined);
});

test("authored sizes, explicit cadence, hidden labels and legend wrapping survive footprint defaults", () => {
  const chart = { presentation: { axes: { x: { labelFontSize: 19 } }, legend: { fontSize: 17 } } };
  const option = { xAxis: { type: "category", data: Array(20).fill("Dense"), axisLabel: { interval: 0, fontSize: 19, show: false } }, yAxis: { type: "value", interval: 2 }, legend: { textStyle: { fontSize: 17, overflow: "break", width: 120 } } };
  const result = applyChartTypography(option, chart, resolveChartTypography(chart));
  assert.deepEqual(result.xAxis.axisLabel, option.xAxis.axisLabel);
  assert.equal(result.yAxis.interval, 2);
  assert.equal(result.yAxis.splitNumber, undefined);
  assert.deepEqual(result.legend.textStyle, option.legend.textStyle);
});
