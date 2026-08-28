import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

import { createSerializedDashboardCommitController } from "../src/lib/dashboardCommitController.js";

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
const appModule = await vite.ssrLoadModule("/src/App.jsx").catch(() => null);
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
  assert.match(html, /type="checkbox"/);
  assert.match(html, />Show Home</);
  assert.match(html, /When off, Home is unavailable to dashboard visitors\. You can turn it back on here\./);
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

test("Scenario Save applies identity and exact Home availability without replacing unrelated state", () => {
  assert.equal(typeof appModule?.applyScenarioPassportValue, "function");
  const next = {
    scenarioLabel: "Day 2",
    programLabel: "PDPC",
    lastUpdated: "2026-07-27",
    home: { enabled: true, ignored: "remove me" },
    title: "Keep dashboard title",
    source: { kind: "package", label: "Keep source" },
  };

  const result = appModule.applyScenarioPassportValue(next, {
    scenarioLabel: "Day 3",
    programLabel: "Response program",
    lastUpdated: "2026-08-28",
    home: { enabled: false },
  });

  assert.equal(result, next);
  assert.deepEqual(next, {
    scenarioLabel: "Day 3",
    programLabel: "Response program",
    lastUpdated: "2026-08-28",
    home: { enabled: false },
    title: "Keep dashboard title",
    source: { kind: "package", label: "Keep source" },
  });
});

test("Scenario durable Save retains the committed baseline after failure and supports retry", async () => {
  assert.equal(typeof appModule?.saveScenarioPassportDurably, "function");
  const baseline = fixtureDashboard();
  const controller = createSerializedDashboardCommitController({
    initialDashboard: baseline,
    commit: async (candidate) => structuredClone(candidate),
  });
  const options = [];
  let attempt = 0;
  const persist = async (candidate, commitOptions) => {
    options.push(commitOptions);
    attempt += 1;
    if (attempt === 1) throw new Error("Browser dashboard storage is unavailable.");
    return structuredClone(candidate);
  };
  const value = {
    scenarioLabel: "Imported exercise",
    programLabel: "Response program",
    lastUpdated: "2026-08-28",
    home: { enabled: false },
  };

  await assert.rejects(appModule.saveScenarioPassportDurably({
    controller,
    persist,
    value,
  }), /storage is unavailable/i);
  assert.deepEqual(controller.getCurrent(), baseline);

  const committed = await appModule.saveScenarioPassportDurably({
    controller,
    persist,
    value,
  });
  assert.deepEqual(committed.home, { enabled: false });
  assert.equal(controller.getCurrent().scenarioLabel, "Imported exercise");
  assert.deepEqual(options, [
    { requireDurableStorage: true },
    { requireDurableStorage: true },
  ]);
});

test("successful Home-off replacement reconciliation persists and focuses View only on fallback", () => {
  assert.equal(typeof appModule?.reconcileCommittedDashboardMode, "function");
  const events = [];
  const result = appModule.reconcileCommittedDashboardMode({
    currentMode: "home",
    committedDashboard: { home: { enabled: false }, pages: [{ id: "overview" }] },
    onModeChange: (mode) => events.push(`mode:${mode}`),
    onPersistMode: (mode) => events.push(`persist:${mode}`),
    onFocusMode: (mode) => events.push(`focus:${mode}`),
  });

  assert.equal(result, "view");
  assert.deepEqual(events, ["mode:view", "persist:view", "focus:view"]);

  const unchanged = [];
  assert.equal(appModule.reconcileCommittedDashboardMode({
    currentMode: "build",
    committedDashboard: { home: { enabled: false }, pages: [{ id: "overview" }] },
    onModeChange: (mode) => unchanged.push(mode),
    onPersistMode: (mode) => unchanged.push(mode),
    onFocusMode: (mode) => unchanged.push(mode),
  }), "build");
  assert.deepEqual(unchanged, []);
});

function fixtureDashboard() {
  return {
    id: "dashboard",
    title: "SimEx Dashboard V3",
    scenarioLabel: "HeV-A26 Day 2 Simulation",
    programLabel: "Pandemic & Disaster Preparedness Center",
    lastUpdated: "2026-07-27",
    source: { kind: "package", label: "hev-a26-dashboard.v3.json" },
    home: { enabled: true },
    pages: [{ id: "overview", label: "Overview", sections: [{ id: "overview", panels: [] }] }],
    chronoGroups: [],
    dataSources: {},
  };
}
