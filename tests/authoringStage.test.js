import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { profileDataset } from "../src/charting/data/profileDataset.js";

const vite = await createServer({ root: process.cwd(), appType: "custom", logLevel: "silent", server: { middlewareMode: true } });
const { default: AuthoringStage, authoringStageScale } = await vite.ssrLoadModule("/src/components/chart-authoring/AuthoringStage.jsx");
await vite.close();
const rows = [{ value: 42 }];
const chart = { id: "stage-kpi", typeId: "kpi", title: "Capacity", roles: { value: { field: "value" } }, layout: { width: 2, height: 1 } };
const props = { chart, rows, datasetProfile: profileDataset(rows) };
const render = extra => renderToStaticMarkup(React.createElement(AuthoringStage, { ...props, ...extra }));

test("stage renders one real destination panel at literal pixels with reserved scaled space", () => {
  const html = render({ availableWidth: 335, maxHeight: 600 });
  assert.match(html, /data-stage-width="670"/);
  assert.match(html, /data-stage-height="418"/);
  assert.match(html, /data-stage-scale="0.5"/);
  assert.match(html, /width:335px;height:209px/);
  assert.match(html, /width:670px;height:418px;transform:scale\(0.5\)/);
  assert.match(html, /--layout-grid-columns:2/);
  assert.equal((html.match(/data-panel-id="stage-kpi"/g) ?? []).length, 1);
  assert.match(html, /Shown at 50% of dashboard size/);
  assert.match(html, />42</);
  assert.doesNotMatch(html, /panel-actions-trigger/);
});

test("Actual retains scale one and constrained/tablet footprints use effective grid width", () => {
  assert.match(render({ fit: "actual", availableWidth: 100 }), /data-stage-scale="1"/);
  assert.match(render({ fit: "actual" }), /Actual dashboard size/);
  const constrained = render({ canvasWidth: 810, deviceLayout: "tablet", chart: { ...chart, layout: { width: 3, height: 0.5 } } });
  assert.match(constrained, /data-stage-width="576.5"/);
  assert.match(constrained, /data-stage-height="212"/);
  assert.match(render({ deviceLayout: "phone" }), /Phone layout stacks charts at automatic height/);
});

test("empty, invalid and preparing states retain the same destination frame", () => {
  for (const [extra, status, message] of [
    [{ rows: [] }, "empty", "No chart data to preview"],
    [{ prepared: { status: "invalid", marks: [], diagnostics: [{ message: "Choose a value" }] } }, "invalid", "Choose a value"],
    [{ readiness: { status: "pending" } }, "pending", "Preparing chart preview"],
  ]) {
    const html = render(extra);
    assert.match(html, /data-stage-width="670"/);
    assert.match(html, /data-stage-height="418"/);
    assert.ok(html.includes(`chart-authoring-preview-${status}`));
    assert.ok(html.includes(message));
  }
});

test("Fit never enlarges or distorts and Actual permits scrolling without shrinking", () => {
  assert.equal(authoringStageScale({ width: 670, height: 418 }, { availableWidth: 2000, maxHeight: 1000 }), 1);
  assert.equal(authoringStageScale({ width: 670, height: 418 }, { availableWidth: 335, maxHeight: 600 }), 0.5);
  assert.equal(authoringStageScale({ width: 670, height: 418 }, { fit: "actual", availableWidth: 335, maxHeight: 100 }), 1);
});
