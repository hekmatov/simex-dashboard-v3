import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const vite = await createServer({ root: process.cwd(), appType: "custom", logLevel: "silent", server: { middlewareMode: true } });
const pageNavigationModule = await vite.ssrLoadModule("/src/components/build/BuildPageNavigation.jsx").catch(() => null);
const structureRailModule = await vite.ssrLoadModule("/src/components/build/BuildStructureRail.jsx").catch(() => null);
await vite.close();

test("Build Page navigation keeps draggable tabs and exposes the accepted active-Page command rail", () => {
  assert.equal(typeof pageNavigationModule?.default, "function");
  const html = renderToStaticMarkup(React.createElement(pageNavigationModule.default, {
    pages: [{ id: "home", label: "Home" }, { id: "biomedical", label: "Biomedical" }],
    activePageId: "biomedical",
    onSelectPage() {},
    onPageReorder() {},
  }));
  assert.match(html, /class="build-page-tab-scroller"[\s\S]*Home[\s\S]*Biomedical/);
  assert.match(html, /draggable="true"/);
  assert.match(html, /Biomedical Page commands[\s\S]*Edit Page Biomedical[\s\S]*Move Biomedical earlier[\s\S]*Move Biomedical later/);
  assert.match(html, /build-page-add-pinned/);
});

test("Build Structure is a Page-first accessible tree with aligned type icons", () => {
  assert.equal(typeof structureRailModule?.default, "function");
  const html = renderToStaticMarkup(React.createElement(structureRailModule.default, {
    dashboard: { pages: [{ id: "biomedical", label: "Biomedical", sections: [{ id: "overview", title: "Overview", panels: [{ id: "confirmed_cases_panel", chart: { id: "confirmed_cases", title: "Confirmed cases" } }] }] }] },
    selection: { kind: "page", pageId: "biomedical" },
    onActivate: async () => true,
    onRename: async () => true,
  }));
  assert.match(html, /role="tree"/);
  assert.match(html, /role="treeitem"/);
  assert.match(html, /aria-expanded="true"/);
  assert.match(html, /data-build-node-kind="page"/);
  assert.match(html, /data-build-node-kind="section"/);
  assert.match(html, /data-build-node-kind="chart"/);
  assert.doesNotMatch(html, />Scenario<\/button>/);
  assert.match(html, /data-build-node-kind="page"[\s\S]*build-tree-caret[\s\S]*data-build-tree-icon="page"/);
  assert.match(html, /data-build-node-kind="section"[\s\S]*build-tree-caret[\s\S]*data-build-tree-icon="section"/);
  assert.match(html, /data-build-node-kind="chart"[\s\S]*build-tree-caret-spacer[\s\S]*data-build-tree-icon="chart"/);
});
