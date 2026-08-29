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
const [
  { default: BuildWorkspace },
  { default: BuildMoreDrawer },
] = await Promise.all([
  vite.ssrLoadModule("/src/components/build/BuildWorkspace.jsx"),
  vite.ssrLoadModule("/src/components/build/BuildMoreDrawer.jsx"),
]);
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

function renderWorkspace(overrides = {}) {
  return renderToStaticMarkup(React.createElement(BuildWorkspace, {
    dashboard,
    activePage,
    pageType: "analytical",
    buildPanelOpen: false,
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
    ...overrides,
  }));
}

test("Build main row has the exact compact command order and ownership", () => {
  const html = renderWorkspace();
  const actionOrder = [...html.matchAll(/data-build-command-action="([^"]+)"/g)]
    .map((match) => match[1]);
  assert.match(html, /aria-label="Build commands"/);
  assert.deepEqual(actionOrder, [
    "add-chart",
    "add-text-image",
    "source-content",
    "chrono-studio",
    "discard-build-changes",
    "finish-build",
    "more",
  ]);
  assert.match(html, /data-build-command-action="add-chart"[^>]*>Add chart<\/button>/);
  assert.match(html, /data-build-command-action="add-text-image"[^>]*>Add Text\/Image<\/button>/);
  assert.match(html, /data-build-command-action="source-content"[\s\S]*?>Source content<\/button>/);
  assert.match(html, /data-build-command-action="chrono-studio"[\s\S]*?>Chrono Studio<\/button>/);
  assert.match(html, /data-build-command-action="more"[^>]*>More<\/button>/);
  assert.doesNotMatch(html, /Pages &amp; sections/);
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
  assert.doesNotMatch(html, /aria-label="Pending Build work"/);
  assert.match(
    html,
    /<aside(?=[^>]*\bid="dashboard-map-panel")(?=[^>]*\baria-label="Dashboard map")(?=[^>]*\binert="")[^>]*>/,
  );
  assert.doesNotMatch(html, /aria-label="Build commands"[^>]*inert/);
  assert.match(html, /<h2[^>]*>Dashboard map<\/h2>/);
  assert.match(html, /aria-label="Dashboard map regions"[\s\S]*aria-pressed="true"[^>]*>Structure<[\s\S]*aria-pressed="false"[^>]*>Inspector</);
  assert.match(html, /data-dashboard-map-region="structure"/);
  assert.doesNotMatch(html, /data-dashboard-map-region="inspector"/);
});

test("More is a dialog drawer containing exactly Scene Studio and Chart accessibility", () => {
  const html = renderToStaticMarkup(React.createElement(BuildMoreDrawer, {
    open: true,
    onClose() {},
    onOpenSceneStudio() {},
    accessibilityEnabled: false,
    onAccessibilityChange() {},
  }));
  const commands = [...html.matchAll(/data-build-more-command="([^"]+)"/g)]
    .map((match) => match[1]);

  assert.match(html, /data-right-side-drawer="build-more-drawer"/);
  assert.match(html, /role="dialog"/);
  assert.match(html, /aria-modal="true"/);
  assert.deepEqual(commands, ["scene-studio", "chart-accessibility"]);
  assert.match(html, />Scene Studio<\/button>/);
  assert.match(html, /type="checkbox"[\s\S]*Chart accessibility/);
  assert.doesNotMatch(html, /Add chart|Add Text\/Image|Source content|Chrono Studio|Discard Build changes|Finish Build|Pages/);
});
