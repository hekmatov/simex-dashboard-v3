import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const vite = await createServer({ root: process.cwd(), appType: "custom", logLevel: "silent", server: { middlewareMode: true } });
const [{ default: DashboardCanvas }, { drillHighlightTarget }] = await Promise.all([
  vite.ssrLoadModule("/src/components/dashboard/DashboardCanvas.jsx"),
  vite.ssrLoadModule("/src/components/dashboard/drillNavigation.js"),
]);
await vite.close();

const kpi = (id, title) => ({ id, typeId: "kpi", title, sourceId: "s", roles: { value: { field: "v" } }, presentation: {} });
const page = {
  id: "ops",
  title: "Operations",
  sections: [
    { id: "body", title: "Hospital pressure", panels: [{ id: "p-b1", chart: { ...kpi("b1", "Beds"), typeId: "bar" } }] },
    { id: "top", title: "At a glance", role: "attention", panels: [
      { id: "p-k1", chart: kpi("k1", "Cases"), drill: { kind: "section", sectionId: "body" } },
      { id: "p-k2", chart: kpi("k2", "Deaths") },
    ] },
  ],
};
const dashboard = { id: "d", pages: [page], dataSources: {}, loadedData: {}, datasetProfiles: {}, chartDataStates: {}, dataSourceStates: {}, assets: {} };

test("attention strip renders first with drill links and its own layout", () => {
  const html = renderToStaticMarkup(React.createElement(DashboardCanvas, { activePage: page, dashboard, surface: "view", buildState: null }));
  const stripIndex = html.indexOf('data-section-role="attention"');
  const bodyIndex = html.indexOf('data-canonical-section-id="body"');
  assert.ok(stripIndex > -1 && stripIndex < bodyIndex);
  assert.match(html, /class="dashboard-section dashboard-attention-strip"[^>]*data-canonical-section-id="top"/);
  assert.match(html, /class="attention-strip-items"/);
  assert.match(html, /<button[^>]*class="attention-drill"[^>]*data-drill-kind="section"[^>]*data-drill-target="body"[^>]*>Open Hospital pressure<\/button>/);
  assert.equal((html.match(/data-attention-item/g) ?? []).length, 2);
  assert.doesNotMatch(html, /layout-grid[^"]*"[^>]*data-canonical-section-id="top"/);
});

test("attention strip hides excluded charts and disappears when empty", () => {
  const html = renderToStaticMarkup(React.createElement(DashboardCanvas, { activePage: page, dashboard, surface: "view", buildState: null, excludedChartIds: ["k1", "k2"] }));
  assert.doesNotMatch(html, /data-section-role="attention"/);
});

test("Build canvas keeps the strip on top with the section header and role tag", () => {
  const html = renderToStaticMarkup(React.createElement(DashboardCanvas, { activePage: page, dashboard, surface: "build", buildState: { sectionDrafts: {}, onStructureCommand() {} } }));
  assert.match(html, /Edit Section title: At a glance/);
  assert.match(html, /class="section-role-tag"[^>]*>Attention strip</);
});

test("drill highlight resolves the DOM selector for both target kinds", () => {
  assert.equal(drillHighlightTarget({ kind: "section", id: "body" }), '[data-canonical-section-id="body"]');
  assert.equal(drillHighlightTarget({ kind: "chart", id: "b1" }), '[data-canonical-panel-id="b1"]');
});
