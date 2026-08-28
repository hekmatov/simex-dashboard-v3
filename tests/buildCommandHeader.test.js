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
    onDeleteDashboardContent: () => {},
  }));
}

test("Build commands are grouped by task above an independently inert Dashboard map", () => {
  const html = renderWorkspace(false);
  const contentGroup = html.match(/<section[^>]*data-build-command-group="content"[\s\S]*?<\/section>/)?.[0] ?? "";

  assert.match(html, /aria-label="Build commands"/);
  assert.deepEqual([...contentGroup.matchAll(/<(?:button|input|select|textarea)\b/g)].length, 3);
  assert.match(contentGroup, /Add chart[\s\S]*Add static content[\s\S]*Source content/);
  assert.doesNotMatch(contentGroup, /Chart accessibility/);
  const accessibilitySettings = html.match(
    /<section[^>]*aria-label="Chart accessibility settings"[\s\S]*?<\/section>/,
  )?.[0] ?? "";
  assert.match(accessibilitySettings, /type="checkbox"/);
  assert.match(accessibilitySettings, /Chart accessibility/);
  assert.doesNotMatch(contentGroup, /Pages &amp; sections/);
  assert.match(html, /data-build-command-group="structure"[\s\S]*Pages &amp; sections/);
  assert.match(html, /data-build-command-group="time"[\s\S]*Chrono Studio[\s\S]*Scene Studio/);
  assert.match(html, /data-build-command-group="layout"[\s\S]*Layout changes[\s\S]*Save Layout Changes[\s\S]*Discard Layout Changes/);
  assert.match(html, /data-build-command-group="session"[\s\S]*Discard Build changes[\s\S]*Finish Build/);
  assert.doesNotMatch(html, /data-build-command-group="package"/);
  assert.doesNotMatch(html, /Upload Dashboard Package|Download Dashboard Package|Clear dashboard|Delete dashboard content/);
  assert.match(
    html,
    /<button[^>]*aria-describedby="[^"]+"[^>]*>Discard Build changes<\/button>/,
  );
  assert.match(
    html,
    /role="tooltip"[^>]*>Restores the dashboard to the baseline captured when you entered Build\. It does not contact the deployed online dashboard\.<\/span>/,
  );
  assert.match(html, /id="dashboard-map-panel"[^>]*aria-label="Dashboard map"[^>]*inert/);
  assert.doesNotMatch(html, /aria-label="Build commands"[^>]*inert/);
  assert.match(html, /<h2>Dashboard map<\/h2>/);
  assert.match(html, /aria-label="Dashboard map regions"[\s\S]*aria-pressed="true"[^>]*>Structure<[\s\S]*aria-pressed="false"[^>]*>Inspector</);
  assert.match(html, /data-dashboard-map-region="structure"/);
  assert.doesNotMatch(html, /data-dashboard-map-region="inspector"/);
});
