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
await vite.close();

test("the chart editor footprint picker renders the approved two-by-four grid", () => {
  assert.equal(typeof pickerModule?.default, "function");
  if (typeof pickerModule?.default !== "function") return;
  const html = renderToStaticMarkup(React.createElement(pickerModule.default, {
    value: { columns: 3, rows: 2 },
    onChange() {},
  }));

  assert.match(html, /role="grid"/);
  assert.match(html, /aria-label="Chart size: 3 columns by 2 rows"/);
  assert.equal((html.match(/role="gridcell"/g) ?? []).length, 8);
  assert.equal((html.match(/aria-pressed="true"/g) ?? []).length, 1);
  assert.match(html, /Current footprint: 3 columns × 2 rows/);
});

test("footprint keyboard navigation stays within the four-column two-row boundary", () => {
  assert.equal(typeof pickerModule?.nextFootprintCell, "function");
  if (typeof pickerModule?.nextFootprintCell !== "function") return;

  assert.deepEqual(
    pickerModule.nextFootprintCell({ columns: 4, rows: 2 }, "ArrowRight"),
    { columns: 4, rows: 2 },
  );
  assert.deepEqual(
    pickerModule.nextFootprintCell({ columns: 2, rows: 1 }, "ArrowDown"),
    { columns: 2, rows: 2 },
  );
  assert.deepEqual(
    pickerModule.nextFootprintCell({ columns: 1, rows: 2 }, "ArrowUp"),
    { columns: 1, rows: 1 },
  );
});

test("the shared footprint picker can label Text/Image panel sizing without chart wording or id collisions", () => {
  const html = renderToStaticMarkup(React.createElement(pickerModule.default, {
    subject: "Panel",
    idPrefix: "static-panel",
    value: { columns: 2, rows: 1 },
    onChange() {},
  }));
  assert.match(html, /<span class="eyebrow">Panel size<\/span>/);
  assert.match(html, /id="static-panel-footprint-title"/);
  assert.match(html, /aria-label="Panel size: 2 columns by 1 rows"/);
  assert.match(html, /aria-label="Set panel size to 4 columns by 2 rows"/);
  assert.doesNotMatch(html, /Chart size|Set chart size/);
});

test("Text/Image sizing can keep the visual grid while omitting redundant footprint copy", () => {
  const html = renderToStaticMarkup(React.createElement(pickerModule.default, {
    subject: "Panel",
    idPrefix: "static-panel-compact",
    showTextLabels: false,
    value: { columns: 2, rows: 1 },
    onChange() {},
  }));

  assert.match(html, /role="grid"/);
  assert.match(html, /class="dashboard-dialog__eyebrow"[^>]*>Panel size<\/span>/);
  assert.match(html, /aria-label="Panel size: 2 columns by 1 rows"/);
  assert.equal((html.match(/role="gridcell"/g) ?? []).length, 8);
  assert.doesNotMatch(html, />Footprint<|4-column grid|Current footprint:/);
});
