import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const vite = await createServer({
  root: process.cwd(),
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});
const identityModule = await vite.ssrLoadModule("/src/components/app-shell/DashboardIdentityRow.jsx");
const passportModule = await vite.ssrLoadModule("/src/components/app-shell/ScenarioPassportPopover.jsx")
  .catch(() => null);
const workspaceModule = await vite.ssrLoadModule("/src/components/build/BuildWorkspace.jsx");
await vite.close();

test("Build anchors Scenario Passport and package actions to the Crown identity", () => {
  assert.equal(typeof passportModule?.default, "function");
  const passport = React.createElement(passportModule.default, {
    open: true,
    dashboard: fixtureDashboard(),
    onClose() {},
    onSave() {},
    onImportPackage() {},
    onDownloadPackage() {},
    onResetToSource() {},
  });
  const html = renderToStaticMarkup(React.createElement(identityModule.default, {
    dashboardIdentity: fixtureDashboard(),
    activePage: fixtureDashboard().pages[0],
    pages: fixtureDashboard().pages,
    onScenarioRequest() {},
    scenarioExpanded: true,
    scenarioNode: passport,
  }));

  assert.match(html, /class="dashboard-scenario-trigger"/);
  assert.match(html, /aria-expanded="true"/);
  assert.match(html, /aria-label="Scenario Passport"/);
  assert.match(html, /Edit Scenario name: HeV-A26 Day 2 Simulation/);
  assert.match(html, /Edit Program: Pandemic &amp; Disaster Preparedness Center/);
  assert.match(html, /Edit Updated: 2026-07-27/);
  assert.match(html, />Import Dashboard Package</);
  assert.match(html, />Download Dashboard Package</);
  assert.match(html, />Reset Dashboard to Source</);
  assert.doesNotMatch(html, /Save All|Export package/);
});

test("package mutation is absent from View orientation and the generic Build panel", () => {
  const dashboard = fixtureDashboard();
  const viewHtml = renderToStaticMarkup(React.createElement(identityModule.default, {
    dashboardIdentity: dashboard,
    activePage: dashboard.pages[0],
    pages: dashboard.pages,
  }));
  const workspaceHtml = renderToStaticMarkup(React.createElement(workspaceModule.default, {
    dashboard,
    activePage: dashboard.pages[0],
    pageType: "analytical",
    buildPanelOpen: true,
    selection: null,
    dashboardDraft: {},
    pageDrafts: {},
    sectionDrafts: {},
    deviceLayout: "desktop",
  }));

  assert.doesNotMatch(viewHtml, /Scenario Passport|Dashboard Package/);
  assert.doesNotMatch(workspaceHtml, /Import package|Export package|Scenario details|Program<input|Updated date/);
});

test("the live App wires the Crown Scenario Passport to renderer package operations", async () => {
  const app = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
  assert.match(app, /ScenarioPassportPopover/);
  assert.match(app, /onScenarioRequest=/);
  assert.match(app, /requestDashboardPackageImport/);
  assert.match(app, /onDownloadPackage=.*exportConfig/s);
  assert.match(app, /requestResetDashboardToSource/);
});

function fixtureDashboard() {
  return {
    id: "dashboard",
    title: "SimEx Dashboard V3",
    scenarioLabel: "HeV-A26 Day 2 Simulation",
    programLabel: "Pandemic & Disaster Preparedness Center",
    lastUpdated: "2026-07-27",
    source: { kind: "package", label: "hev-a26-dashboard.v3.json" },
    pages: [{ id: "home", label: "Home", sections: [{ id: "overview", panels: [] }] }],
    chronoGroups: [],
    dataSources: {},
  };
}
