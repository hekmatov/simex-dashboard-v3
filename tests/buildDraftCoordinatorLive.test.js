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

test("live Build projects dirty layout and chart slots into the pending-work row", () => {
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
  assert.match(html, /aria-label="Pending Build work"/);
  assert.match(html, /data-pending-work-id="layout"[^>]*data-pending-work-state="dirty"/);
  assert.match(html, /data-pending-work-id="chart-editor"[^>]*data-pending-work-state="dirty"/);
  assert.match(html, />Save Layout Changes</);
  assert.match(html, />Discard Layout Changes</);
  assert.match(html, /Layout changes/);
  assert.match(html, /Chart changes/);
  assert.doesNotMatch(html, /build-draft-slots/);
});

test("empty Build state omits the pending-work row from DOM and accessibility trees", () => {
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
  }));

  assert.doesNotMatch(html, /aria-label="Pending Build work"/);
  assert.doesNotMatch(html, /data-pending-work-id=/);
  assert.doesNotMatch(html, /build-pending-work/);
});
