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
const { default: BuildWorkspace } = await vite.ssrLoadModule(
  "/src/components/build/BuildWorkspace.jsx",
);
await vite.close();

const activePage = {
  id: "biomedical",
  label: "Biomedical",
  sections: [{ id: "signals", title: "Signals", panels: [] }],
};
const dashboard = {
  id: "test-dashboard",
  timezone: "UTC",
  pages: [activePage],
  chronoGroups: [],
  scenes: [],
};

function renderWorkspace(buildPanelOpen = false) {
  return renderToStaticMarkup(React.createElement(BuildWorkspace, {
    dashboard,
    activePage,
    pageType: "analytical",
    buildPanelOpen,
    selection: { kind: "page", pageId: activePage.id },
    dashboardDraft: dashboard,
    pageDrafts: {},
    sectionDrafts: {},
    deviceLayout: "desktop",
    onActivate: () => {},
    onRename: () => {},
    onDashboardChange: () => {},
    onPageChange: () => {},
    onSectionChange: () => {},
    onFinish: () => {},
    onReset: () => {},
  }));
}

test("Build commands are grouped by task above an independently inert Dashboard map", () => {
  const html = renderWorkspace(false);

  assert.match(html, /aria-label="Build commands"/);
  assert.match(html, /data-build-command-group="content"[\s\S]*Add chart[\s\S]*Pages &amp; sections/);
  assert.match(html, /data-build-command-group="time"[\s\S]*Chrono Studio[\s\S]*Scene Studio/);
  assert.match(html, /data-build-command-group="layout"[\s\S]*Layout changes[\s\S]*Save Layout Changes[\s\S]*Discard Layout Changes/);
  assert.match(html, /data-build-command-group="session"[\s\S]*Reset[\s\S]*Finish Build/);
  assert.match(html, /id="dashboard-map-panel"[^>]*aria-label="Dashboard map"[^>]*inert/);
  assert.doesNotMatch(html, /aria-label="Build commands"[^>]*inert/);
});
