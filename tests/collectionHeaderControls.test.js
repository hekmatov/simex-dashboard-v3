import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { readFile } from "node:fs/promises";

const vite = await createServer({ root: process.cwd(), appType: "custom", logLevel: "silent", server: { middlewareMode: true } });
const carousel = await vite.ssrLoadModule("/src/components/collection/CollectionCarousel.jsx");
await vite.close();

test("embedded Collection transport uses noninteractive dots and icon-only paging controls", () => {
  const html = renderToStaticMarkup(React.createElement(carousel.CollectionHeaderTransport, {
    page: 1,
    pageCount: 4,
    paused: false,
    previousDisabled: false,
    nextDisabled: false,
    onPrevious() {},
    onTogglePaused() {},
    onNext() {},
  }));
  assert.match(html, /collection-header-page-dots/);
  assert.equal((html.match(/data-collection-page-dot/g) ?? []).length, 4);
  assert.match(html, /aria-current="step"/);
  assert.match(html, /Previous collection page[\s\S]*Pause collection rotation[\s\S]*Next collection page/);
  assert.doesNotMatch(html, />Page 2 of 4</);
  assert.doesNotMatch(html, />Items</);
});

test("production collection renderers target the chart-header host and Build orders Edit last", async () => {
  const [target, card, carouselSource, display, panel] = await Promise.all([
    readFile(new URL("../src/components/charts/TargetCollectionChartView.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/charts/CardChartView.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/collection/CollectionCarousel.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/collection/CollectionDisplay.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/ChartPanel.jsx", import.meta.url), "utf8"),
  ]);
  assert.match(target, /collection-display-header/);
  assert.match(target, /controlsPortalId/);
  assert.match(card, /collection-display-header/);
  assert.match(card, /controlsPortalId/);
  assert.match(carouselSource, /createPortal/);
  assert.match(display, /embedded:/);
  const actions = panel.slice(panel.indexOf('className="panel-actions"'), panel.indexOf("{shouldRenderChart"));
  assert.ok(actions.lastIndexOf('interactionId="panel.edit-chart"') > actions.indexOf('interactionId="chart.remove"'));
});

test("the accepted multi-page fixture retains the 2 by 1 header-capable footprint", async () => {
  const dashboard = JSON.parse(await readFile(new URL("../public/config/dashboard.json", import.meta.url), "utf8"));
  const chart = dashboard.pages.flatMap(({ sections }) => sections).flatMap(({ panels }) => panels).map((panel) => panel.chart ?? panel).find(({ id }) => id === "bio_current_cases_kpi");
  assert.equal(chart.layout.size, "standard");
});
