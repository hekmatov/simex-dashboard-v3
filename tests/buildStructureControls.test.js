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
const pageNavigationModule = await vite
  .ssrLoadModule("/src/components/build/BuildPageNavigation.jsx")
  .catch(() => null);
const canvasModule = await vite
  .ssrLoadModule("/src/components/dashboard/DashboardCanvas.jsx")
  .catch(() => null);
await vite.close();

test("Build Page navigation keeps Add Page pinned and orders the active vertical rail", () => {
  assert.equal(typeof pageNavigationModule?.default, "function");
  const BuildPageNavigation = pageNavigationModule.default;
  const html = renderToStaticMarkup(React.createElement(BuildPageNavigation, {
    pages: [
      { id: "home", label: "Home" },
      { id: "biomedical", label: "Biomedical" },
    ],
    activePageId: "biomedical",
    pageDrafts: {},
    onSelectPage() {},
    onAddPage() {},
    onPageChange() {},
    onPageReorder() {},
    onOpenDashboardLook() {},
  }));

  assert.match(html, /class="build-page-tab-scroller"[\s\S]*Home[\s\S]*Biomedical[\s\S]*<\/div>[\s\S]*Add page/);
  assert.match(html, /aria-label="Edit Biomedical"[\s\S]*aria-label="Move Biomedical earlier"[\s\S]*aria-label="Move Biomedical later"/);
  assert.doesNotMatch(html, /page-orbit/);
  assert.doesNotMatch(html, />Merge Page<|>Remove Page</);
});

test("Build canvas owns Section rename, safe reorder, add, and empty-panel recovery", () => {
  assert.equal(typeof canvasModule?.default, "function");
  const DashboardCanvas = canvasModule.default;
  const emptyPage = {
    id: "operations",
    title: "Operations",
    sections: [{
      id: "briefing",
      title: "Briefing highlights",
      description: "Operational summary",
      panels: [],
    }],
  };
  const dashboard = {
    pages: [emptyPage],
    loadedData: {},
    dataSources: {},
    datasetProfiles: {},
    globalStyles: {},
  };
  const html = renderToStaticMarkup(React.createElement(DashboardCanvas, {
    activePage: emptyPage,
    dashboard,
    surface: "build",
    buildState: {
      selection: { kind: "page", pageId: "operations" },
      disabled: false,
      sectionDrafts: {},
      onRenameSection() {},
      onReorderSection() {},
      onAddSection() {},
      onAddChart() {},
    },
  }));

  assert.match(html, /aria-label="Rename Briefing highlights"/);
  assert.match(html, /aria-label="Move Briefing highlights earlier"/);
  assert.match(html, /aria-label="Move Briefing highlights later"/);
  assert.match(html, /This section has no panels\./);
  assert.match(html, />Add Panel to Section</);
  assert.match(html, />Add section</);
  assert.doesNotMatch(html, /Move to Page|Merge|Remove Section/);
});
