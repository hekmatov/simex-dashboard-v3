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
const pickerModule = await vite
  .ssrLoadModule("/src/components/chart-authoring/ChartFootprintPicker.jsx")
  .catch(() => null);
const authoringFrameModule = await vite
  .ssrLoadModule("/src/components/common/AuthoringFootprintFrame.jsx")
  .catch(() => null);
await vite.close();

test("the authoring footprint frame projects a selected panel width across the dashboard grid", () => {
  assert.equal(typeof authoringFrameModule?.default, "function");
  if (typeof authoringFrameModule?.default !== "function") return;
  const html = renderToStaticMarkup(React.createElement(authoringFrameModule.default, {
    layout: { width: 3, height: 1 },
    kind: "writer",
  }, React.createElement("p", null, "Writer")));

  assert.match(html, /class="authoring-footprint-grid"/);
  assert.match(html, /--chart-footprint-columns:3/);
  assert.match(html, /--chart-footprint-row-span:8/);
  assert.match(html, /data-authoring-footprint="writer"/);
});

test("the chart editor footprint picker presents 12.5-percent row increments as numbered steps", () => {
  assert.equal(typeof pickerModule?.default, "function");
  if (typeof pickerModule?.default !== "function") return;
  const html = renderToStaticMarkup(React.createElement(pickerModule.default, {
    value: { columns: 3, rows: 0.75 },
    onChange() {},
  }));

  assert.match(html, /id="chart-footprint-width"/);
  assert.match(html, /id="chart-footprint-row-height"/);
  assert.match(html, /<span>Height step \(12\.5% of a row\)<\/span>/);
  assert.match(html, /<option value="0.125"[^>]*>1<\/option>/);
  assert.match(html, /<option value="0.75"[^>]*>6<\/option>/);
  assert.match(html, /<option value="1.875"[^>]*>15<\/option>/);
  assert.match(html, /<option value="2"[^>]*>16<\/option>/);
  assert.match(html, /data-footprint-preview="true"/);
  assert.match(html, /aria-label="Chart size: 3 columns by 6 steps"/);
  assert.match(html, /--footprint-preview-columns:3/);
  assert.match(html, /--footprint-preview-height:75%/);
  assert.doesNotMatch(html, /75% of a row/);
  assert.doesNotMatch(html, /25% of a row/);
});

test("the shared footprint picker can label Text/Image panel sizing without chart wording or id collisions", () => {
  const html = renderToStaticMarkup(React.createElement(pickerModule.default, {
    subject: "Panel",
    idPrefix: "static-panel",
    rowHeights: [0.125, 0.25, 0.5, 1, 2, 3, 4],
    maxRows: 4,
    value: { columns: 2, rows: 0.25 },
    onChange() {},
  }));
  assert.match(html, /<span class="eyebrow">Panel size<\/span>/);
  assert.match(html, /id="static-panel-footprint-title"/);
  assert.match(html, /id="static-panel-footprint-width"/);
  assert.match(html, /id="static-panel-footprint-row-height"/);
  assert.match(html, /<option value="0.125"[^>]*>1<\/option>/);
  assert.match(html, /<option value="0.25"[^>]*>2<\/option>/);
  assert.match(html, /<option value="4"[^>]*>32<\/option>/);
  assert.match(html, /aria-label="Panel size: 2 columns by 2 steps"/);
  assert.doesNotMatch(html, /Chart size/);
});

test("Text/Image sizing can keep the visual grid while omitting redundant footprint copy", () => {
  const html = renderToStaticMarkup(React.createElement(pickerModule.default, {
    subject: "Panel",
    idPrefix: "static-panel-compact",
    showTextLabels: false,
    value: { columns: 2, rows: 1.5 },
    onChange() {},
  }));

  assert.match(html, /class="dashboard-dialog__eyebrow"[^>]*>Panel size<\/span>/);
  assert.match(html, /data-footprint-preview="true"/);
  assert.match(html, /aria-label="Panel size: 2 columns by 12 steps"/);
  assert.doesNotMatch(html, />Footprint<|4-column grid|Current footprint:/);
});
