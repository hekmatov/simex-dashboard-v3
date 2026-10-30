import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { readFile } from "node:fs/promises";
import * as layout from "../src/components/build/buildLayoutDraft.js";

test("V3 #26 start-section splits at canonical placements", () => {
  for (const typeId of ["line", "gauge", "freeText"]) {
    const source = fixture();
    const panels = ["before", "anchor", "after"].map(id => ({ id: `placement-${id}`, chart: { id: `chart-${id}`, typeId } }));
    source.pages[1].sections[0].panels = panels;
    const original = structuredClone(source);
    const draft = layout.createBuildLayoutDraft(source);
    const split = layout.splitBuildLayoutSection(draft, "biomedical", "pressure", "placement-anchor", { id: "new-section", title: "New section" });
    assert.equal(split.status, "dirty");
    assert.deepEqual(split.value.pages[1].sections.map(s => [s.id, s.panels.map(p => p.id)]), [
      ["pressure", ["placement-before"]], ["new-section", ["placement-anchor", "placement-after"]], ["surveillance", []],
    ]);
    assert.deepEqual(source, original);
    assert.deepEqual(draft.value.pages, original.pages);
    const missing = layout.splitBuildLayoutSection(draft, "biomedical", "pressure", "missing", { id: "new-section", title: "New section" });
    assert.equal(missing.status, "error");
    assert.match(missing.error.message, /placement.*no longer exists/i);
    assert.deepEqual(missing.value, draft.value);
  }
});

const vite = await createServer({ root: process.cwd(), appType: "custom", logLevel: "silent", server: { middlewareMode: true, watch: null } });
const pageNav = await vite.ssrLoadModule("/src/components/build/BuildPageNavigation.jsx");
const canvas = await vite.ssrLoadModule("/src/components/dashboard/DashboardCanvas.jsx");
await vite.close();

test("active Page owns its only trigger and pinned Add Page without rendering obsolete action surfaces", () => {
  const dashboard = fixture();
  const html = renderToStaticMarkup(React.createElement(pageNav.default, {
    dashboard,
    pages: dashboard.pages,
    activePageId: "biomedical",
  }));
  assert.ok(html.indexOf("build-page-add-pinned") > html.indexOf("build-page-tab-scroller"), "Add Page must sit after the scrolling tab collection");
  assert.match(html, /aria-current="page"[\s\S]*>Biomedical<\//);
  assert.doesNotMatch(html, />Page actions<\//);
  assert.doesNotMatch(html, /Biomedical Page commands/);
  assert.doesNotMatch(html, /Page Orbit/);
  assert.doesNotMatch(html, /Edit Page/);
  assert.match(html, />Add page</);
});

test("real Section headers own inline rename and the complete command set", () => {
  const dashboard = fixture();
  const html = renderToStaticMarkup(React.createElement(canvas.default, {
    activePage: dashboard.pages[1],
    dashboard,
    surface: "build",
    buildState: { sectionDrafts: {}, onStructureCommand() {} },
  }));
  assert.match(html, /Edit Section title: Hospital pressure/);
  assert.match(html, /<button(?=[^>]*aria-haspopup="menu")(?=[^>]*aria-label="Section actions for Hospital pressure")(?=[^>]*data-section-menu="pressure")[^>]*>/);
  assert.doesNotMatch(html, /Move Hospital pressure earlier/);
  assert.doesNotMatch(html, />Move to Page</);
  assert.doesNotMatch(html, />Rename Section</);
});

test("renderer, Canvas, and Section keep direct ownership of live layout commands", async () => {
  const [renderer, canvasSource, sectionSource] = await Promise.all([
    readFile(new URL("../src/components/DashboardRenderer.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/dashboard/DashboardCanvas.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/dashboard/DashboardSection.jsx", import.meta.url), "utf8"),
  ]);
  assert.match(renderer, /onBuildStructureProjectionChange/);
  assert.match(renderer, /structureCommand: applyBuildStructureCommand/);
  assert.match(canvasSource, /actions={buildActions}/);
  assert.match(
    sectionSource,
    /onReorder={\(targetIndex\) => actions\.reorderSection\(section\.id, targetIndex\)}/,
  );
  assert.match(sectionSource, /onCommand={actions\.structureCommand}/);
});

function fixture() {
  return {
    id: "dashboard",
    pages: [
      { id: "landing", label: "Dashboard overview", landing: {}, sections: [{ id: "hero", title: "Hero", panels: [] }] },
      { id: "biomedical", label: "Biomedical", sections: [
        { id: "pressure", title: "Hospital pressure", panels: [] },
        { id: "surveillance", title: "Surveillance", panels: [] },
      ] },
      { id: "operations", label: "Operations", sections: [{ id: "briefing", title: "Briefing", panels: [] }] },
    ],
    chronoGroups: [], scenes: [], loadedData: {}, globalStyles: {}, dataSources: {}, datasetProfiles: {},
  };
}
