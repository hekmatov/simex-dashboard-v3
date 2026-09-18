import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const vite = await createServer({ root: process.cwd(), appType: "custom", logLevel: "silent", server: { middlewareMode: true } });
const { default: BuildWorkspace } = await vite.ssrLoadModule("/src/components/build/BuildWorkspace.jsx");
await vite.close();

const activePage = { id: "ops", label: "Operations", sections: [{ id: "signals", title: "Signals", panels: [] }] };
const dashboard = { id: "d", timezone: "UTC", pages: [activePage], chronoGroups: [], scenes: [] };

function render(overrides = {}) {
  return renderToStaticMarkup(React.createElement(BuildWorkspace, {
    dashboard, activePage, pageType: "analytical", selection: { kind: "section", pageId: "ops", sectionId: "signals" },
    dashboardDraft: dashboard, pageDrafts: {}, sectionDrafts: {}, deviceLayout: "desktop",
    onActivate() {}, onRename() {}, onDashboardChange() {}, onPageChange() {}, onSectionChange() {}, onFinish() {}, onReset() {},
    ...overrides,
  }));
}

test("Build renders a persistent structure rail and properties pane with no Dashboard map drawer", () => {
  const html = render();
  assert.match(html, /<aside(?=[^>]*class="build-rail build-rail--structure")(?=[^>]*data-build-rail="structure")(?=[^>]*aria-label="Structure")[^>]*>/);
  assert.match(html, /<aside(?=[^>]*class="build-rail build-rail--properties")(?=[^>]*data-build-rail="properties")(?=[^>]*aria-label="Properties")[^>]*>/);
  assert.match(html, /build-structure-rail/);
  assert.match(html, /class="build-inspector"[\s\S]*Section[\s\S]*Signals/);
  assert.doesNotMatch(html, /dashboard-map-panel|dashboard-map-inline-inspector|Dashboard map/);
  const order = ["build-command-header", 'data-build-rail="structure"', 'data-build-rail="properties"'].map((needle) => html.indexOf(needle));
  assert.deepEqual([...order].sort((a, b) => a - b), order);
});

test("Build frame grid places rails beside the canvas at desktop widths", async () => {
  const css = await readFile(new URL("../src/styles/modes.css", import.meta.url), "utf8");
  assert.match(css, /\.canonical-dashboard-frame\.build-workspace\s*\{[^}]*display:\s*grid;[^}]*grid-template-areas:\s*"header header header"\s*"commands commands commands"\s*"structure canvas properties"\s*"footer footer footer";/);
  assert.match(css, /\.canonical-dashboard-workspace-controls,\s*\.build-workspace-authoring-root\s*\{[^}]*display:\s*contents;/);
  assert.match(css, /@media \(min-width: 1200px\)[\s\S]*grid-template-columns:\s*minmax\(220px, 260px\) minmax\(0, 1fr\) minmax\(280px, 320px\);/);
});
