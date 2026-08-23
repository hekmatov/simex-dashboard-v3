import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { readFile } from "node:fs/promises";

const vite = await createServer({ root: process.cwd(), appType: "custom", logLevel: "silent", server: { middlewareMode: true } });
const pageNav = await vite.ssrLoadModule("/src/components/build/BuildPageNavigation.jsx");
const canvas = await vite.ssrLoadModule("/src/components/dashboard/DashboardCanvas.jsx");
await vite.close();

test("active Page owns a vertical command rail, bounded Orbit, and pinned Add Page", () => {
  const dashboard = fixture();
  const html = renderToStaticMarkup(React.createElement(pageNav.default, {
    dashboard,
    pages: dashboard.pages,
    activePageId: "biomedical",
    initialOrbitPageId: "biomedical",
  }));
  assert.ok(html.indexOf("build-page-add-pinned") > html.indexOf("build-page-tab-scroller"), "Add Page must sit after the scrolling tab collection");
  assert.match(html, /aria-label="Biomedical Page commands"[\s\S]*Edit Page Biomedical[\s\S]*Move Biomedical earlier[\s\S]*Move Biomedical later/);
  assert.match(html, /aria-label="Page Orbit for Biomedical"/);
  assert.match(html, />Rename Page</);
  assert.match(html, />Merge Page</);
  assert.match(html, />Remove Page</);
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
  assert.match(html, /Move Hospital pressure earlier/);
  assert.match(html, /Move Hospital pressure later/);
  assert.match(html, /Move Hospital pressure to Page/);
  assert.match(html, /Merge Hospital pressure/);
  assert.match(html, /Remove Hospital pressure/);
  assert.doesNotMatch(html, />Rename Section</);
});

test("App and renderer connect Crown Page commands and canonical Section commands to the live layout draft", async () => {
  const [app, renderer] = await Promise.all([
    readFile(new URL("../src/App.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/DashboardRenderer.jsx", import.meta.url), "utf8"),
  ]);
  assert.match(app, /BuildPageNavigation/);
  assert.match(app, /pageNavigationNode=/);
  assert.match(renderer, /onBuildStructureProjectionChange/);
  assert.match(renderer, /onStructureCommand:/);
  assert.match(renderer, /applyBuildStructureCommand/);
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
