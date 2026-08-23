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
const { default: BuildWorkspace } = await vite.ssrLoadModule("/src/components/build/BuildWorkspace.jsx");
await vite.close();

test("live Build composes independent layout and chart slots through the coordinator", () => {
  const page = { id: "page-a", label: "Page A", sections: [{ id: "section-a", title: "Section A", panels: [] }] };
  const html = renderToStaticMarkup(React.createElement(BuildWorkspace, {
    dashboard: { id: "dashboard", title: "Dashboard", pages: [page], chronoGroups: [], dataSources: {} },
    activePage: page,
    pageType: "analytical",
    buildPanelOpen: true,
    selection: { kind: "chart", placementId: "panel-a" },
    dashboardDraft: {},
    pageDrafts: {},
    sectionDrafts: {},
    deviceLayout: "desktop",
    layoutDraft: { draftId: "layout-dashboard", status: "dirty", targetId: "section-a" },
    chartSlotDraft: { draftId: "chart-panel-a", status: "dirty", targetId: "panel-a" },
    onSaveLayout() {},
    onDiscardLayout() {},
  }));

  assert.match(html, /data-build-draft-coordinator="live"/);
  assert.match(html, /data-draft-slot="layout"[^>]*data-draft-status="dirty"/);
  assert.match(html, /data-draft-slot="chart"[^>]*data-draft-status="dirty"/);
  assert.match(html, />Save Layout Changes</);
  assert.match(html, />Discard Layout Changes</);
  assert.match(html, /Layout changes/);
  assert.match(html, /Chart changes/);
});

test("dirty primary slots leave Context Shelf entry points available for coordinated suspension", () => {
  const page = { id: "page-a", label: "Page A", sections: [{ id: "section-a", title: "Section A", panels: [] }] };
  const html = renderToStaticMarkup(React.createElement(BuildWorkspace, {
    dashboard: { id: "dashboard", title: "Dashboard", pages: [page], chronoGroups: [], dataSources: {} },
    activePage: page,
    pageType: "analytical",
    buildPanelOpen: true,
    selection: { kind: "chart", placementId: "panel-a" },
    dashboardDraft: {},
    pageDrafts: {},
    sectionDrafts: {},
    deviceLayout: "desktop",
    chartDraftOpen: true,
    chartDraftDirty: true,
    chartEditorPlacementId: "panel-a",
    chartEditorOpen: true,
    layoutDraft: { draftId: "layout-dashboard", status: "dirty", targetId: "section-a" },
    chartSlotDraft: { draftId: "chart-panel-a", status: "dirty", targetId: "panel-a" },
  }));

  for (const surface of ["structure", "chrono-group", "scene"]) {
    const button = html.match(new RegExp(`<button[^>]*data-context-shelf-entry="${surface}"[^>]*>`))?.[0] ?? "";
    assert.ok(button, `${surface} needs a live Context Shelf entry point`);
    assert.doesNotMatch(button, /disabled=""/, `${surface} must not be blocked by dirty primary slots`);
    assert.match(button, /data-unit-orbit-preserve-open="true"/);
  }
  assert.doesNotMatch(html, /data-context-shelf-entry="scenario"/);
});
