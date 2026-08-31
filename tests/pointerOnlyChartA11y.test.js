import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const vite = await createServer({
  root: process.cwd(),
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});
const { default: EChartsChartView, applyEChartsPresentation } = await vite
  .ssrLoadModule("/src/components/charts/EChartsChartView.jsx");
const { default: TargetCollectionChartView } = await vite
  .ssrLoadModule("/src/components/charts/TargetCollectionChartView.jsx");
await vite.close();

test("ECharts ignores legacy accessibility flags and emits no screen-reader summary", () => {
  const model = {
    option: {
      aria: { enabled: true, description: "Legacy chart summary" },
      series: [],
    },
    semanticSummary: { items: [{ label: "Clinic A", actual: 8, target: 10 }] },
  };
  const option = applyEChartsPresentation(model, {}, true).option;
  const html = renderToStaticMarkup(React.createElement(EChartsChartView, {
    model,
    chart: { title: "Supply readiness" },
    accessibilityEnabled: true,
  }));

  assert.equal(option.aria.enabled, false);
  assert.doesNotMatch(html, /role="img"|Legacy chart summary|Clinic A: actual/);
});

test("target collections ignore legacy accessibility flags and emit no hidden summary", () => {
  const html = renderToStaticMarkup(React.createElement(TargetCollectionChartView, {
    model: {
      items: [{
        entityId: "clinic-a",
        label: "Clinic A",
        actual: 8,
        target: 10,
        accessibleSummary: "Legacy target summary",
        model: { kind: "echarts", option: { aria: { enabled: true }, series: [] } },
      }],
      presentation: {},
    },
    chart: { title: "Supply readiness" },
    accessibilityEnabled: true,
  }));

  assert.doesNotMatch(html, /aria-describedby|role="group"|Legacy target summary/);
});
