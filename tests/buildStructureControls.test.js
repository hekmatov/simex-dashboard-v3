import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const vite = await createServer({ root: process.cwd(), appType: "custom", logLevel: "silent", server: { middlewareMode: true } });
const pageNavigationModule = await vite.ssrLoadModule("/src/components/build/BuildPageNavigation.jsx").catch(() => null);
const structureRailModule = await vite.ssrLoadModule("/src/components/build/BuildStructureRail.jsx").catch(() => null);
await vite.close();

test("Build Page navigation keeps draggable tabs and makes the active Page tab the only actions trigger", () => {
  assert.equal(typeof pageNavigationModule?.default, "function");
  const html = renderToStaticMarkup(React.createElement(pageNavigationModule.default, {
    pages: [{ id: "home", label: "Home" }, { id: "biomedical", label: "Biomedical" }],
    activePageId: "biomedical",
    onSelectPage() {},
    onPageReorder() {},
  }));
  assert.match(html, /class="build-page-tab-scroller"[\s\S]*Home[\s\S]*Biomedical/);
  assert.match(html, /draggable="true"/);
  assert.match(html, /aria-current="page"[\s\S]*>Biomedical<\//);
  assert.doesNotMatch(html, />Page actions<\//);
  assert.doesNotMatch(html, /Biomedical Page commands/);
  assert.doesNotMatch(html, /Page Orbit/);
  assert.match(html, /build-page-add-pinned/);
});

test("closing Page actions clears the command, value, and acknowledgement state", () => {
  assert.deepEqual(pageNavigationModule.clearPageActionState(), {
    pageActionMenu: null,
    command: null,
    value: "",
    acknowledged: false,
  });
});

test("Dashboard map is a Page-first accessible tree with direct drag rows", () => {
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
  assert.equal((html.match(/draggable="true"/g) ?? []).length, 3);
  assert.equal((html.match(/class="build-tree-caret"/g) ?? []).length, 2);
  assert.doesNotMatch(html, /build-tree-kind-icon|data-build-tree-icon=|build-tree-move-handle/);
});
