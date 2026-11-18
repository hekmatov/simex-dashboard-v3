import assert from "node:assert/strict";
import test from "node:test";
import * as echarts from "echarts";
import LinesSeries from "echarts/lib/chart/lines/LinesSeries.js";
import { buildTooltipMarkup, TooltipMarkupStyleCreator } from "echarts/lib/component/tooltip/tooltipMarkup.js";

for (const [entry, Model] of [
  ["ES module", LinesSeries],
  ["package main", echarts.SeriesModel.getClass("series", "lines")],
]) {
  test(`ECharts ${entry} Lines names use escaped tooltip markup`, () => {
    const payload = '<img src=x onerror="window.untrustedTooltip=true">';
    for (const values of [{ name: payload }, { fromName: payload, toName: "Destination" }]) {
      const series = {
        getData: () => ({ getItemModel: () => ({ get: key => values[key] }) }),
        getRawValue: () => 7,
      };
      const markup = Model.prototype.formatTooltip.call(series, 0, false);
      assert.equal(typeof markup, "object", "the built-in formatter must not return raw HTML names");
      const html = buildTooltipMarkup(markup, new TooltipMarkupStyleCreator(), "html", null, false, {});
      assert.ok(html.includes("&lt;img"));
      assert.ok(!html.includes("<img"));
      assert.ok(html.includes("7"));
    }
  });
}
