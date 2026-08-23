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
let Drawer;
let drawerModule = {};
let lookModel = {};
try {
  [drawerModule, lookModel] = await Promise.all([
    vite.ssrLoadModule("/src/components/dashboard-look/DashboardLookDrawer.jsx"),
    vite.ssrLoadModule("/src/theme/dashboardLookDraft.js"),
  ]);
  Drawer = drawerModule.default;
} catch (error) {
  if (error?.code !== "ERR_LOAD_URL" && error?.code !== "ENOENT") throw error;
}
await vite.close();

const saved = {
  dashboardStyle: "evidence-ledger",
  dashboardColorProfile: "evidence-ledger/brighter-vellum",
  chartColorMode: "profile",
  appearancePreference: "system",
};
const preview = {
  ...saved,
  dashboardStyle: "humanist-standard",
  dashboardColorProfile: "utility/prismatic-index",
  appearancePreference: "dark",
};

test("approved look drawer exposes all values with immediate persistence and no visual scrim", () => {
  assert.equal(typeof Drawer, "function");
  if (typeof Drawer !== "function") return;

  const html = renderToStaticMarkup(React.createElement(Drawer, {
    open: true,
    saved,
    preview,
    onCancel: () => {},
    onPreviewChange: () => {},
  }));

  assert.match(html, /role="dialog"/);
  assert.match(html, /aria-modal="true"/);
  assert.match(html, /class="look-drawer-click-catcher"/);
  assert.doesNotMatch(html, /scrim|backdrop-filter|opacity:/i);
  assert.equal((html.match(/data-profile-option=/g) ?? []).length, 15);
  assert.doesNotMatch(html, />Set (?:dashboard look|chart colors|appearance)<\/button>/);
  assert.doesNotMatch(html, /Saved[\s\S]*Preview/);
  assert.doesNotMatch(html, /Use [^<]+ Signature/);
  assert.doesNotMatch(html, /Changing style preserves|approved profiles remain|profile<\/small>/i);
  assert.match(html, /Selections are saved automatically/);

  const appearancePosition = html.indexOf("<legend>Appearance</legend>");
  const stylePosition = html.indexOf("<legend>Visual style</legend>");
  assert.ok(appearancePosition >= 0 && appearancePosition < stylePosition);
  assert.match(html, /name="appearance"[^>]*value="system"/);
  assert.match(html, /name="appearance"[^>]*value="light"/);
  assert.match(html, /name="appearance"[^>]*value="dark"/);
  assert.match(html, /data-icon-id="auto"/);
  assert.match(html, /data-icon-id="appearanceLight"/);
  assert.match(html, /data-icon-id="appearanceDark"/);
});

test("look ownership helpers keep the three commit scopes independent", () => {
  assert.equal(typeof lookModel.dashboardLookUpdates, "function");
  assert.equal(typeof lookModel.chartColorUpdates, "function");
  if (typeof lookModel.dashboardLookUpdates !== "function") return;

  assert.deepEqual(lookModel.dashboardLookUpdates(preview), {
    dashboardStyle: "humanist-standard",
    dashboardColorProfile: "utility/prismatic-index",
  });
  assert.deepEqual(lookModel.chartColorUpdates(preview), {
    chartColorMode: "profile",
  });
});

test("look drawer preview carries resolved shared-surface attributes without mutating saved values", () => {
  assert.equal(typeof lookModel.resolveDashboardLookSurfaceAttributes, "function");
  if (typeof lookModel.resolveDashboardLookSurfaceAttributes !== "function") return;

  const surface = lookModel.resolveDashboardLookSurfaceAttributes(preview);
  assert.deepEqual(surface, {
    style: "humanist-standard",
    colorProfile: "utility/prismatic-index",
    resolvedAppearance: "dark",
  });

  const html = renderToStaticMarkup(React.createElement(Drawer, {
    open: true,
    saved,
    preview,
    onCancel: () => {},
    onPreviewChange: () => {},
    onSetDashboardLook: () => {},
    onSetChartColors: () => {},
    onSetAppearance: () => {},
  }));

  assert.match(html, /data-dashboard-style="humanist-standard"/);
  assert.ok(html.includes('data-dashboard-color-profile="utility/prismatic-index"'));
  assert.match(html, /data-resolved-appearance="dark"/);
  assert.deepEqual(saved, {
    dashboardStyle: "evidence-ledger",
    dashboardColorProfile: "evidence-ledger/brighter-vellum",
    chartColorMode: "profile",
    appearancePreference: "system",
  });
});

test("system appearance keeps the already-resolved dashboard appearance", () => {
  assert.equal(typeof lookModel.createDashboardLookPreview, "function");
  assert.equal(typeof lookModel.resolveDashboardLookSurfaceAttributes, "function");
  if (typeof lookModel.createDashboardLookPreview !== "function") return;

  const systemPreview = lookModel.createDashboardLookPreview({
    ...saved,
    resolvedAppearance: "dark",
  });
  assert.equal(systemPreview.resolvedAppearance, "dark");
  assert.deepEqual(lookModel.resolveDashboardLookSurfaceAttributes(systemPreview), {
    style: "evidence-ledger",
    colorProfile: "evidence-ledger/brighter-vellum",
    resolvedAppearance: "dark",
  });
});

test("rapid dashboard look previews coalesce into one latest-value commit", async () => {
  assert.equal(typeof lookModel.createDashboardLookCommitScheduler, "function");
  if (typeof lookModel.createDashboardLookCommitScheduler !== "function") return;
  let nextTimerId = 0;
  const timers = new Map();
  const timerTarget = {
    setTimeout(callback, delay) {
      nextTimerId += 1;
      timers.set(nextTimerId, { callback, delay });
      return nextTimerId;
    },
    clearTimeout(timerId) {
      timers.delete(timerId);
    },
  };
  const committed = [];
  const scheduler = lookModel.createDashboardLookCommitScheduler({
    delay: 150,
    timerTarget,
    onCommit: async (value) => committed.push(value),
  });

  scheduler.schedule({ ...saved, dashboardStyle: "signal-instrument" });
  scheduler.schedule(preview);

  assert.equal(committed.length, 0);
  assert.equal(timers.size, 1);
  const [{ callback, delay }] = timers.values();
  assert.equal(delay, 150);
  await callback();
  assert.deepEqual(committed, [preview]);
});

test("closing Dashboard Look dismisses immediately while the latest selection flushes in background", async () => {
  assert.equal(typeof lookModel.closeDashboardLookInBackground, "function");
  if (typeof lookModel.closeDashboardLookInBackground !== "function") return;
  let releaseCommit;
  const committed = [];
  const scheduler = lookModel.createDashboardLookCommitScheduler({
    delay: 150,
    onCommit: (value) => new Promise((resolve) => {
      committed.push(value);
      releaseCommit = resolve;
    }),
  });
  const latest = {
    ...preview,
    dashboardStyle: "humanist-standard",
    dashboardColorProfile: "humanist-standard/common-ground",
  };
  let closed = false;
  let applied = false;
  let canonicalLook = null;
  scheduler.schedule(latest);

  const closeResult = lookModel.closeDashboardLookInBackground({
    scheduler,
    onApply: () => {
      applied = true;
      return latest;
    },
    onCanonicalize: (value) => {
      assert.equal(closed, false);
      canonicalLook = value;
    },
    onClose: () => {
      assert.equal(applied, true);
      assert.strictEqual(canonicalLook, latest);
      closed = true;
    },
  });

  assert.equal(closeResult, undefined);
  assert.equal(applied, true);
  assert.strictEqual(canonicalLook, latest);
  assert.equal(closed, true);
  await Promise.resolve();
  assert.deepEqual(committed, [latest]);
  releaseCommit();
  await scheduler.flush();
});

test("a failed background appearance save renders a non-blocking session-only flash", () => {
  assert.equal(typeof drawerModule.DashboardLookPersistenceFlash, "function");
  if (typeof drawerModule.DashboardLookPersistenceFlash !== "function") return;
  const html = renderToStaticMarkup(React.createElement(
    drawerModule.DashboardLookPersistenceFlash,
    { message: "Couldn’t save dashboard appearance. Your selection remains active for this session." },
  ));

  assert.match(html, /role="status"/);
  assert.match(html, /dashboard-look-persistence-flash/);
  assert.match(html, /selection remains active for this session/i);
  assert.doesNotMatch(html, /<button/);
});

test("look-only commits retain the loaded dashboard runtime and canonical content identities", () => {
  assert.equal(typeof lookModel.applyDashboardLookConfiguration, "function");
  if (typeof lookModel.applyDashboardLookConfiguration !== "function") return;
  const pages = [{ id: "overview", sections: [] }];
  const datasetProfiles = { cases: { fields: { date: { type: "date" } } } };
  const loadedData = { cases: [{ date: "2026-08-22", value: 4 }] };
  const dataSourceStates = { cases: { status: "ready" } };
  const chartDataStates = { trend: { status: "ready" } };
  const liveDashboard = {
    configVersion: 3,
    pages,
    datasetProfiles,
    loadedData,
    dataSourceStates,
    chartDataStates,
    globalStyles: { dashboardStyle: "evidence-ledger" },
  };
  const committedConfiguration = {
    ...structuredClone(liveDashboard),
    globalStyles: {
      dashboardStyle: "humanist-standard",
      dashboardColorProfile: "humanist-standard/common-ground",
    },
  };
  delete committedConfiguration.loadedData;
  delete committedConfiguration.dataSourceStates;
  delete committedConfiguration.chartDataStates;

  const next = lookModel.applyDashboardLookConfiguration(
    committedConfiguration,
    liveDashboard,
  );

  assert.strictEqual(next.pages, pages);
  assert.strictEqual(next.datasetProfiles, datasetProfiles);
  assert.strictEqual(next.loadedData, loadedData);
  assert.strictEqual(next.dataSourceStates, dataSourceStates);
  assert.strictEqual(next.chartDataStates, chartDataStates);
  assert.deepEqual(next.globalStyles, committedConfiguration.globalStyles);
  assert.deepEqual(liveDashboard.globalStyles, { dashboardStyle: "evidence-ledger" });
});

test("background look persistence reports busy state without locking profile and style choices", () => {
  const html = renderToStaticMarkup(React.createElement(Drawer, {
    open: true,
    saved,
    preview,
    savingScope: "auto",
    onCancel: () => {},
    onPreviewChange: () => {},
  }));

  assert.match(html, /aria-busy="true"/);
  assert.doesNotMatch(html, /<fieldset[^>]*disabled/);
});

test("colour-profile swatch projections are reused while appearance is unchanged", () => {
  assert.equal(typeof drawerModule.dashboardLookProfileSamples, "function");
  if (typeof drawerModule.dashboardLookProfileSamples !== "function") return;

  const first = drawerModule.dashboardLookProfileSamples("light");
  const second = drawerModule.dashboardLookProfileSamples("light");
  const dark = drawerModule.dashboardLookProfileSamples("dark");

  assert.strictEqual(second, first);
  assert.notStrictEqual(dark, first);
  assert.equal(first.length, 15);
});
