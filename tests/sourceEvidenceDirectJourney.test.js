import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { readFile } from "node:fs/promises";

const vite = await createServer({ root: process.cwd(), appType: "custom", logLevel: "silent", server: { middlewareMode: true } });
const actionsModule = await vite.ssrLoadModule("/src/components/charts/ChartPanelActions.jsx");
const protocol = await vite.ssrLoadModule("/src/components/source-data/sourceViewerProtocol.js");
await vite.close();

const source = Object.freeze({
  kind: "csv",
  path: "data/biomedical/cases.csv",
  provenance: { label: "Simulation exercise biomedical dataset" },
});
const context = Object.freeze({
  chartId: "bio_confirmed_cases",
  chartTitle: "Confirmed cases",
  variableId: "national_total_cases",
});

test("ordinary chart rail exposes the dedicated CSV viewer directly beside Details", () => {
  const html = renderToStaticMarkup(React.createElement(actionsModule.default, {
    chartId: context.chartId,
    chartTitle: context.chartTitle,
    variableId: context.variableId,
    sourceId: "bio_cases",
    source,
    citation: "Simulation exercise biomedical dataset",
  }));
  assert.match(html, /aria-label="View source CSV"/);
  assert.match(html, /aria-label="Show chart details"/);
  assert.ok(html.indexOf('aria-label="View source CSV"') < html.indexOf('aria-label="Show chart details"'));
  assert.doesNotMatch(html, />View source</);
});

test("viewer descriptor distinguishes chart, variable, dataset, and CSV path", () => {
  const descriptor = protocol.buildSourceViewerDescriptor("bio_cases", source, context);
  assert.deepEqual(descriptor.invocation, {
    chartId: "bio_confirmed_cases",
    chartTitle: "Confirmed cases",
    variableId: "national_total_cases",
    datasetId: "bio_cases",
    csvPath: "data/biomedical/cases.csv",
  });
});

test("dedicated viewer return signal restores the invoking control exactly once", () => {
  let messageHandler;
  let restored = 0;
  const viewer = { focus() {}, postMessage() {} };
  const windowTarget = {
    document: { querySelector: () => null },
    location: { origin: "https://simex.test" },
    open: () => viewer,
    addEventListener(type, handler) { if (type === "message") messageHandler = handler; },
    removeEventListener() {},
  };
  protocol.openSourceViewer({
    sourceId: "bio_cases",
    source,
    context,
    windowTarget,
    onReturn: () => { restored += 1; },
  });
  const returned = {
    origin: windowTarget.location.origin,
    source: viewer,
    data: { type: protocol.SOURCE_VIEWER_RETURN, version: protocol.SOURCE_VIEWER_VERSION },
  };
  messageHandler(returned);
  messageHandler(returned);
  assert.equal(restored, 1);
});

test("production chart panel no longer mounts the intermediary source modal", async () => {
  const panel = await readFile(new URL("../src/components/ChartPanel.jsx", import.meta.url), "utf8");
  const viewer = await readFile(new URL("../src/source-viewer/SourceCsvViewer.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(panel, /<SourceViewer|from "\.\/SourceViewer\.jsx"/);
  for (const label of ["Invoking chart", "Variable", "Dataset", "CSV path", "Return to dashboard"]) {
    assert.match(viewer, new RegExp(label));
  }
});
