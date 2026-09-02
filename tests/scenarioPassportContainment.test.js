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
const scenarioModule = await vite.ssrLoadModule("/src/components/build/ScenarioAuthoring.jsx")
  .catch(() => null);
const workspaceModule = await vite.ssrLoadModule("/src/components/build/BuildWorkspace.jsx");
const rendererModule = await vite.ssrLoadModule("/src/components/DashboardRenderer.jsx");
const playbackModule = await vite.ssrLoadModule("/src/components/playback/PlaybackProvider.jsx");
const operationStatusModule = await vite.ssrLoadModule(
  "/src/components/app-shell/OperationStatusProvider.jsx",
);
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
    onDiscardBuildChanges() {},
    onRestoreOnlineDashboard() {},
    onClearDashboard() {},
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
  assert.match(html, />Upload Dashboard Package</);
  assert.match(html, />Download Dashboard Package</);
  assert.match(html, />Discard Build changes</);
  assert.match(html, />Restore online dashboard…</);
  assert.match(html, />Clear dashboard…</);
  assert.doesNotMatch(html, /Source provenance|No source provenance|unknown/i);
  assert.match(
    html,
    /<button[^>]*aria-describedby="[^"]+"[^>]*>Discard Build changes<\/button>/,
  );
  assert.match(
    html,
    /role="tooltip"[^>]*>Restores the dashboard to the baseline captured when you entered Build\. It does not contact the deployed online dashboard\.<\/span>/,
  );
  assert.match(
    html,
    /role="tooltip"[^>]*>Fetches and validates the dashboard served by this deployed SimEx instance\. Unlike Discard Build changes, it does not use the Build-entry baseline\.<\/span>/,
  );
  assert.doesNotMatch(html, /Save All|Export package/);
});

test("Scenario Passport keeps the Home checkbox, label, and helper on the dense choice grid", async () => {
  const css = await readFile(new URL("../src/styles/modes.css", import.meta.url), "utf8");

  assert.match(
    css,
    /\.scenario-passport-home\s*>\s*label\s*\{[^}]*align-items:\s*center;[^}]*display:\s*grid;[^}]*gap:\s*var\(--simex-gap-choice-label\);[^}]*grid-template-columns:\s*var\(--simex-choice-glyph\)\s+minmax\(0,\s*1fr\);[^}]*min-height:\s*var\(--simex-control-compact\);/s,
  );
  assert.match(
    css,
    /\.scenario-passport-home\s*>\s*p\s*\{[^}]*margin:\s*0\s+0\s+0\s+calc\(var\(--simex-choice-glyph\)\s*\+\s*var\(--simex-gap-choice-label\)\);/s,
  );
});

test("Scenario drafts omit dashboard-level provenance without changing per-source provenance", () => {
  assert.equal(typeof scenarioModule?.createScenarioDraft, "function");
  const dashboard = {
    ...fixtureDashboard(),
    source: { kind: "package", label: "dashboard-package.json" },
    dataSources: {
      cases: {
        kind: "csv",
        path: "data/cases.csv",
        provenance: { label: "Epidemiology team" },
      },
    },
    contentLibrary: {
      mediaItems: {},
      sourceEntries: {
        cases: {
          sourceId: "cases",
          provenance: { label: "Epidemiology team" },
        },
      },
    },
  };

  const draft = scenarioModule.createScenarioDraft(dashboard);

  assert.equal(Object.hasOwn(draft.value, "source"), false);
  assert.equal(Object.hasOwn(draft.baseline, "source"), false);
  assert.deepEqual(dashboard.dataSources.cases.provenance, { label: "Epidemiology team" });
  assert.deepEqual(
    dashboard.contentLibrary.sourceEntries.cases.provenance,
    { label: "Epidemiology team" },
  );
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
  assert.doesNotMatch(
    workspaceHtml,
    /Upload Dashboard Package|Download Dashboard Package|Clear dashboard|Delete dashboard content|Scenario details|Program<input|Updated date/,
  );
});

test("the live DashboardRenderer Build surface leaves package controls exclusively in Passport", () => {
  const html = renderLiveDashboardBuild();

  assert.doesNotMatch(html, /<button[^>]*aria-label="(?:Import|Export)"/);
  assert.match(
    html,
    /<input[^>]*class="visually-hidden"[^>]*type="file"[^>]*accept="application\/json,\.json"/,
  );
});

test("the live App wires the Crown Scenario Passport to renderer package operations", async () => {
  const app = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
  assert.match(app, /ScenarioPassportPopover/);
  assert.match(app, /onScenarioRequest=/);
  assert.match(app, /requestDashboardPackageImport/);
  assert.match(app, /onDownloadPackage=.*exportConfig/s);
  assert.match(app, /requestDiscardBuildChanges/);
  assert.match(app, /onRestoreOnlineDashboard/);
  assert.match(app, /requestDeleteDashboardContent/);
});

test("Passport package entry points retain the serialized moderator-operation guard", async () => {
  const renderer = await readFile(
    new URL("../src/components/DashboardRenderer.jsx", import.meta.url),
    "utf8",
  );
  const uploadEntry = renderer.match(
    /function requestDashboardPackageImport\(\) \{([\s\S]*?)\n  \}/,
  )?.[1] ?? "";
  const downloadEntry = renderer.match(
    /async function exportDashboardPackage\(\) \{([\s\S]*?)\n  \}/,
  )?.[1] ?? "";

  assert.match(uploadEntry, /moderatorOperationGateRef\.current\.isActive\(\)/);
  assert.match(downloadEntry, /moderatorOperationGateRef\.current\.isActive\(\)/);
  assert.doesNotMatch(renderer, /interactionId="shell\.(?:import|export)"/);
  assert.equal(
    renderer.match(/importInputRef\.current\?\.click\(\)/g)?.length,
    2,
    "only the guarded request and its authored-dirty confirmation may open the package chooser",
  );
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

test("Clear durably replaces authored content before resetting Scenario and selecting Home", async () => {
  assert.equal(typeof appModule?.clearDashboardContentDurably, "function");
  const baseline = {
    ...fixtureDashboard(),
    home: { enabled: false },
    globalStyles: { dashboardStyle: "evidence-ledger" },
    dataSources: { cases: { type: "uploadedCsv" } },
  };
  const controller = createSerializedDashboardCommitController({
    initialDashboard: baseline,
    commit: async () => {
      throw new Error("The session-aware committer must not run.");
    },
  });
  const events = [];
  const persistCalls = [];
  let resolvePersist;
  const persisted = new Promise((resolve) => {
    resolvePersist = resolve;
  });
  const transaction = appModule.clearDashboardContentDurably({
    controller,
    persist: (candidate, options) => {
      persistCalls.push({ candidate: structuredClone(candidate), options });
      return persisted;
    },
    cleanup: async (previous, replacement) => {
      assert.deepEqual(previous, baseline);
      assert.deepEqual(replacement.pages, []);
      events.push("cleanup");
    },
    onResetScenario: () => events.push("scenario"),
    onModeChange: (mode) => events.push(`mode:${mode}`),
    onPersistMode: (mode) => events.push(`persist:${mode}`),
    onFocusMode: (mode) => events.push(`focus:${mode}`),
  });

  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(persistCalls.length, 1);
  assert.deepEqual(persistCalls[0].options, { requireDurableStorage: true });
  assert.deepEqual(persistCalls[0].candidate.pages, []);
  assert.deepEqual(persistCalls[0].candidate.home, { enabled: true });
  assert.deepEqual(controller.getCurrent(), baseline);
  assert.deepEqual(events, []);

  resolvePersist(structuredClone(persistCalls[0].candidate));
  const committed = await transaction;
  assert.deepEqual(committed.home, { enabled: true });
  assert.deepEqual(committed.globalStyles, baseline.globalStyles);
  assert.deepEqual(events, [
    "cleanup",
    "scenario",
    "mode:home",
    "persist:home",
    "focus:home",
  ]);
  assert.deepEqual(baseline.home, { enabled: false });
});

test("Clear rebases on the queued-current dashboard after a preceding deferred commit", async () => {
  const baseline = {
    ...fixtureDashboard(),
    scenarioLabel: "Baseline scenario",
    lastUpdated: "2026-08-01",
    source: { kind: "package", label: "baseline.json" },
    globalStyles: { dashboardStyle: "baseline-style" },
    assets: { "asset-baseline": { assetId: "asset-baseline" } },
  };
  let precedingCandidate;
  let releasePrecedingCommit;
  let markPrecedingCommitStarted;
  const precedingCommitStarted = new Promise((resolve) => {
    markPrecedingCommitStarted = resolve;
  });
  const controller = createSerializedDashboardCommitController({
    initialDashboard: baseline,
    commit: async (candidate) => {
      precedingCandidate = structuredClone(candidate);
      markPrecedingCommitStarted();
      return new Promise((resolve) => {
        releasePrecedingCommit = resolve;
      });
    },
  });
  const preceding = controller.mutate((next) => {
    next.scenarioLabel = "Queued scenario";
    next.lastUpdated = "2026-08-28";
    next.source = { kind: "package", label: "queued.json" };
    next.globalStyles = { dashboardStyle: "queued-style" };
    next.pages.push({ id: "queued-page", label: "Queued page", sections: [] });
    next.dataSources.queued = { type: "uploadedCsv" };
    next.assets["asset-queued"] = { assetId: "asset-queued" };
  });
  await precedingCommitStarted;

  const cleanupCalls = [];
  const clear = appModule.clearDashboardContentDurably({
    controller,
    persist: async (candidate, options) => {
      assert.deepEqual(options, { requireDurableStorage: true });
      return structuredClone(candidate);
    },
    cleanup: async (previous, replacement) => {
      cleanupCalls.push({
        previous: structuredClone(previous),
        replacement: structuredClone(replacement),
      });
    },
  });

  releasePrecedingCommit(structuredClone(precedingCandidate));
  await preceding;
  const committed = await clear;

  assert.equal(committed.scenarioLabel, "Queued scenario");
  assert.equal(committed.lastUpdated, "2026-08-28");
  assert.deepEqual(committed.source, { kind: "package", label: "queued.json" });
  assert.deepEqual(committed.globalStyles, { dashboardStyle: "queued-style" });
  assert.deepEqual(committed.pages, []);
  assert.deepEqual(committed.dataSources, {});
  assert.deepEqual(committed.assets, {});
  assert.equal(cleanupCalls.length, 1);
  assert.equal(cleanupCalls[0].previous.scenarioLabel, "Queued scenario");
  assert.deepEqual(cleanupCalls[0].previous.pages.map(({ id }) => id), ["overview", "queued-page"]);
  assert.deepEqual(Object.keys(cleanupCalls[0].previous.dataSources), ["queued"]);
  assert.deepEqual(Object.keys(cleanupCalls[0].previous.assets), ["asset-baseline", "asset-queued"]);
  assert.deepEqual(cleanupCalls[0].replacement.pages, []);
  assert.deepEqual(baseline.globalStyles, { dashboardStyle: "baseline-style" });
});

test("storage-rejected Clear preserves dashboard Scenario mode preference and focus", async () => {
  assert.equal(typeof appModule?.clearDashboardContentDurably, "function");
  const baseline = fixtureDashboard();
  const controller = createSerializedDashboardCommitController({
    initialDashboard: baseline,
    commit: async (candidate) => structuredClone(candidate),
  });
  const events = [];
  const options = [];

  await assert.rejects(appModule.clearDashboardContentDurably({
    controller,
    persist: async (_candidate, commitOptions) => {
      options.push(commitOptions);
      throw new Error("Browser dashboard storage is unavailable.");
    },
    cleanup: async () => events.push("cleanup"),
    onResetScenario: () => events.push("scenario"),
    onModeChange: (mode) => events.push(`mode:${mode}`),
    onPersistMode: (mode) => events.push(`persist:${mode}`),
    onFocusMode: (mode) => events.push(`focus:${mode}`),
  }), /storage is unavailable/i);

  assert.deepEqual(options, [{ requireDurableStorage: true }]);
  assert.deepEqual(controller.getCurrent(), baseline);
  assert.deepEqual(events, []);
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

function renderLiveDashboardBuild() {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const previousNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      clearTimeout: globalThis.clearTimeout,
      matchMedia: () => ({ matches: false }),
      navigator: { standalone: false },
      requestAnimationFrame: (callback) => callback(),
      setTimeout: globalThis.setTimeout,
    },
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { userAgent: "" },
  });
  try {
    return renderToStaticMarkup(React.createElement(
      operationStatusModule.default,
      null,
      React.createElement(
        playbackModule.PlaybackProvider,
        { groups: [], charts: [], loadedData: {}, profiles: {} },
        React.createElement(rendererModule.default, {
          dashboard: fixtureDashboard(),
          mode: "build",
          activePageId: "overview",
          accessibilityEnabled: false,
          deviceLayout: "desktop",
          displayState: { display_revision: 0, displayed_chart_ids: [], layout: "single" },
        }),
      ),
    ));
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
    else delete globalThis.window;
    if (previousNavigator) Object.defineProperty(globalThis, "navigator", previousNavigator);
    else delete globalThis.navigator;
  }
}
