import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { readFile } from "node:fs/promises";
import { prepareChartData } from "../src/charting/data/prepareChartData.js";
import { buildRenderModel } from "../src/charting/rendering/buildRenderModel.js";
import {
  chartPanelFootprintStyle,
  resolveChartFootprint,
} from "../src/components/chartPanelLayout.js";
import { collectionConsumerFixture } from "./fixtures/collectionConsumerV3.js";

const vite = await createServer({ root: process.cwd(), configFile: false, appType: "custom", logLevel: "silent", server: { middlewareMode: true } });
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

test("production collection renderers target the chart-header host and Build orders Remove last in the panel menu", async () => {
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
  assert.match(actions, /"data-panel-menu": placementId/);
  assert.ok(actions.lastIndexOf('id: "remove"') > actions.indexOf('id: "edit"'));
});

test("the accepted multi-page fixture retains the 2 by 1 header-capable footprint", () => {
  const { dashboard, collection, rows, profile } = collectionConsumerFixture();
  const prepared = prepareChartData({ chart: collection, rows, datasetProfile: profile });
  const model = buildRenderModel({ chart: collection, prepared });
  assert.equal(dashboard.pages.length, 2);
  assert.equal(dashboard.pages[1].sections[0].panels[0].chart, collection);
  assert.ok(collection.presentation.collection);
  assert.equal(prepared.status, "ready");
  assert.equal(model.items.length, 2);
  assert.equal(Math.ceil(model.items.length / (
    collection.presentation.collection.rows * collection.presentation.collection.columns
  )), 2);
  assert.deepEqual(resolveChartFootprint(collection.layout), { columns: 2, rows: 1 });
  assert.equal(chartPanelFootprintStyle(collection.layout)["--chart-footprint-row-span"], 8);
});
