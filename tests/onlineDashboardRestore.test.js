import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

import { createSerializedDashboardCommitController } from "../src/lib/dashboardCommitController.js";

const restoreModel = await import("../src/lib/onlineDashboardRestore.js").catch(() => null);
const vite = await createServer({
  root: process.cwd(),
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});
const dialogModule = await vite
  .ssrLoadModule("/src/components/app-shell/RestoreOnlineDashboardDialog.jsx")
  .catch(() => null);
await vite.close();

test("online restore exposes the required preparation and queued-commit interfaces", () => {
  assert.equal(typeof restoreModel?.prepareOnlineDashboardRestore, "function");
  assert.equal(typeof restoreModel?.commitOnlineDashboardRestore, "function");
});

test("Restore online confirmation warns, offers download first, and explains the distinct source", () => {
  assert.equal(typeof dialogModule?.default, "function");
  const html = renderToStaticMarkup(React.createElement(dialogModule.default, {
    open: true,
    onDownloadPackage() {},
    onConfirm() {},
    onCancel() {},
  }));

  assert.match(html, /role="dialog"/);
  assert.match(html, /aria-modal="true"/);
  assert.match(html, />Restore online dashboard\?</);
  assert.match(html, /replaces your local dashboard/i);
  assert.match(html, /served by this SimEx deployment/i);
  assert.match(html, /Download a dashboard package first if you want to preserve your local work\./);
  assert.match(html, />Download package first<\/button>/);
  assert.match(html, />Restore online dashboard<\/button>/);
  assert.doesNotMatch(html, /required|must download/i);
  assert.match(
    html,
    /<button[^>]*aria-describedby="[^"]+"[^>]*>Restore online dashboard<\/button>/,
  );
  assert.match(
    html,
    /role="tooltip"[^>]*>Fetches and validates the dashboard served by this deployed SimEx instance\. Unlike Discard Build changes, it does not use the Build-entry baseline\.<\/span>/,
  );
});

test("App prepares queued Build work and durably replaces before resetting live state", async () => {
  const [app, renderer] = await Promise.all([
    readFile(new URL("../src/App.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/DashboardRenderer.jsx", import.meta.url), "utf8"),
  ]);
  const restoreBody = app.match(
    /async function restoreOnlineDashboard\(\) \{([\s\S]*?)\n  \}/,
  )?.[1] ?? "";

  assert.match(restoreBody, /prepareOnlineDashboardRestore/);
  assert.match(restoreBody, /baseUrl:\s*import\.meta\.env\.BASE_URL/);
  assert.match(restoreBody, /prepareForOnlineDashboardRestore/);
  assert.match(restoreBody, /commitOnlineDashboardRestore/);
  assert.match(restoreBody, /preserveAuthoredRevision:\s*true/);
  assert.match(restoreBody, /requireDurableStorage:\s*true/);
  assert.match(restoreBody, /resetAfterDashboardReplacement/);
  assert.match(restoreBody, /const status = beginOperation/);
  assert.match(restoreBody, /status\.succeed\(result\.cleanupWarning/);
  assert.match(restoreBody, /status\.fail\(message\)/);
  assert.ok(
    restoreBody.indexOf("prepareOnlineDashboardRestore")
      < restoreBody.indexOf("prepareForOnlineDashboardRestore"),
  );
  assert.ok(
    restoreBody.indexOf("commitOnlineDashboardRestore")
      < restoreBody.indexOf("resetAfterDashboardReplacement"),
  );
  assert.doesNotMatch(
    restoreBody,
    /dashboardRef\.current\s*=|setDashboard\(|setOperationError\(/,
  );
  assert.match(
    renderer,
    /async prepareForOnlineDashboardRestore\(\)[\s\S]*?pendingEdits\.flush\(\)[\s\S]*?onCommitPendingConfiguration/,
  );
  assert.match(
    renderer,
    /const rebasedDrafts = createDashboardReplacementRendererState\([\s\S]*?buildLayoutDraftRef\.current\s*=\s*rebasedDrafts\.buildLayoutDraft;[\s\S]*?setBuildLayoutDraft\(rebasedDrafts\.buildLayoutDraft\)/,
  );
});

test("preparation loads BASE_URL definition, profiles, and portable sources before validation", async (t) => {
  if (!hasRestoreModel(t)) return;
  const events = [];
  const definition = {
    dashboard: onlineDashboard(),
    datasetProfiles: { cases: { profileVersion: 3, fingerprint: "f".repeat(64) } },
    portableSources: { cases: { kind: "csv", text: "cases\n7\n" } },
  };
  const definitionBefore = structuredClone(definition);

  const candidate = await restoreModel.prepareOnlineDashboardRestore({
    baseUrl: "/deployed/simex/",
    loadDefinition: async (url) => {
      events.push(["load", url]);
      return definition;
    },
    hydrate: async (dashboard, profiles, portableSources) => {
      events.push(["hydrate", structuredClone(profiles), structuredClone(portableSources)]);
      assert.deepEqual(dashboard.datasetProfiles, definition.datasetProfiles);
      return {
        ...dashboard,
        loadedData: { cases: [{ cases: 7 }] },
        dataSourceStates: { status: { status: "ready" }, cases: { status: "ready" } },
      };
    },
    validate: async (hydrated) => {
      events.push(["validate", hydrated.loadedData.cases[0].cases]);
    },
  });

  assert.deepEqual(events, [
    ["load", "/deployed/simex/config/dashboard.json"],
    ["hydrate", definition.datasetProfiles, definition.portableSources],
    ["validate", 7],
  ]);
  assert.equal(candidate.lastUpdated, "2026-08-12");
  assert.equal(candidate.loadedData.cases[0].cases, 7);
  assert.deepEqual(definition, definitionBefore);
});

test("fetch, hydration, and validation failures never mutate the live dashboard", async (t) => {
  if (!hasRestoreModel(t)) return;
  const live = localDashboard();
  const liveBytes = JSON.stringify(live);

  for (const [failure, message] of [
    ["fetch", "deployed fetch failed"],
    ["hydrate", "deployed hydration failed"],
    ["validate", "deployed validation failed"],
  ]) {
    let hydrateCalls = 0;
    let validateCalls = 0;
    await assert.rejects(restoreModel.prepareOnlineDashboardRestore({
      baseUrl: "/deployment/",
      loadDefinition: async () => {
        if (failure === "fetch") throw new Error("deployed fetch failed");
        return {
          dashboard: onlineDashboard(),
          datasetProfiles: {},
          portableSources: null,
        };
      },
      hydrate: async (candidate) => {
        hydrateCalls += 1;
        if (failure === "hydrate") throw new Error("deployed hydration failed");
        return candidate;
      },
      validate: async () => {
        validateCalls += 1;
        if (failure === "validate") throw new Error("deployed validation failed");
      },
    }), new RegExp(message));

    assert.equal(JSON.stringify(live), liveBytes);
    assert.equal(hydrateCalls, failure === "fetch" ? 0 : 1);
    assert.equal(validateCalls, failure === "validate" ? 1 : 0);
  }
});

test("queued dashboard work completes before one atomic online replacement", async (t) => {
  if (!hasRestoreModel(t)) return;
  const events = [];
  const baseline = localDashboard();
  let releaseQueuedCommit;
  let queuedCommitStarted;
  const queuedStarted = new Promise((resolve) => { queuedCommitStarted = resolve; });
  const controller = createSerializedDashboardCommitController({
    initialDashboard: baseline,
    commit: async (candidate) => {
      events.push(`queued-start:${candidate.scenarioLabel}`);
      queuedCommitStarted();
      return new Promise((resolve) => { releaseQueuedCommit = () => {
        events.push("queued-finish");
        resolve(structuredClone(candidate));
      }; });
    },
  });
  const queued = controller.mutate((current) => {
    current.scenarioLabel = "Queued local work";
  });
  await queuedStarted;
  const cleanup = [];
  const restore = restoreModel.commitOnlineDashboardRestore({
    current: baseline,
    candidate: onlineDashboard(),
    commitController: durableRestoreController(controller, async (candidate) => {
      events.push(`restore:${candidate.scenarioLabel}`);
      return structuredClone(candidate);
    }),
    cleanupAssets: async (previous, committed) => {
      events.push("cleanup");
      cleanup.push({ previous, committed });
    },
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(events, ["queued-start:Queued local work"]);

  releaseQueuedCommit();
  await queued;
  const result = await restore;

  assert.deepEqual(events, [
    "queued-start:Queued local work",
    "queued-finish",
    "restore:Online scenario",
    "cleanup",
  ]);
  assert.equal(cleanup[0].previous.scenarioLabel, "Queued local work");
  assert.equal(result.dashboard.scenarioLabel, "Online scenario");
  assert.equal(result.dashboard.lastUpdated, "2026-08-12");
  assert.equal(result.cleanupWarning, null);
});

test("queued preparation and persistence failures preserve live bytes and remain retryable", async (t) => {
  if (!hasRestoreModel(t)) return;
  const baseline = localDashboard();
  const baselineBytes = JSON.stringify(baseline);
  let replacements = 0;
  let cleanupCalls = 0;

  await assert.rejects(restoreModel.commitOnlineDashboardRestore({
    current: baseline,
    candidate: onlineDashboard(),
    commitController: {
      whenIdle: async () => { throw new Error("queued draft preparation failed"); },
      replaceWith: async () => { replacements += 1; },
    },
    cleanupAssets: async () => { cleanupCalls += 1; },
  }), /queued draft preparation failed/);
  assert.equal(replacements, 0);
  assert.equal(cleanupCalls, 0);
  assert.equal(JSON.stringify(baseline), baselineBytes);

  let attempt = 0;
  let durableBytes = baselineBytes;
  const controller = createSerializedDashboardCommitController({
    initialDashboard: baseline,
    commit: async (candidate) => structuredClone(candidate),
  });
  const boundary = durableRestoreController(controller, async (candidate) => {
    attempt += 1;
    if (attempt === 1) throw new Error("online replacement persistence failed");
    durableBytes = JSON.stringify(candidate);
    return structuredClone(candidate);
  });

  await assert.rejects(restoreModel.commitOnlineDashboardRestore({
    current: baseline,
    candidate: onlineDashboard(),
    commitController: boundary,
    cleanupAssets: async () => { cleanupCalls += 1; },
  }), /online replacement persistence failed/);
  assert.equal(JSON.stringify(controller.getCurrent()), baselineBytes);
  assert.equal(durableBytes, baselineBytes);
  assert.equal(cleanupCalls, 0);

  const retried = await restoreModel.commitOnlineDashboardRestore({
    current: baseline,
    candidate: onlineDashboard(),
    commitController: boundary,
    cleanupAssets: async () => { cleanupCalls += 1; },
  });
  assert.equal(retried.dashboard.lastUpdated, "2026-08-12");
  assert.equal(JSON.parse(durableBytes).lastUpdated, "2026-08-12");
  assert.equal(cleanupCalls, 1);
});

test("post-success asset cleanup failure is returned as a warning without rollback", async (t) => {
  if (!hasRestoreModel(t)) return;
  const baseline = localDashboard();
  const candidate = onlineDashboard();
  const controller = createSerializedDashboardCommitController({
    initialDashboard: baseline,
    commit: async (value) => structuredClone(value),
  });
  const result = await restoreModel.commitOnlineDashboardRestore({
    current: baseline,
    candidate,
    commitController: durableRestoreController(
      controller,
      async (value) => structuredClone(value),
    ),
    cleanupAssets: async () => {
      throw new Error("old browser assets could not be removed");
    },
  });

  assert.equal(result.dashboard.lastUpdated, candidate.lastUpdated);
  assert.deepEqual(controller.getCurrent(), candidate);
  assert.match(result.cleanupWarning.message, /old browser assets could not be removed/);
});

function hasRestoreModel(t) {
  if (
    typeof restoreModel?.prepareOnlineDashboardRestore === "function"
    && typeof restoreModel?.commitOnlineDashboardRestore === "function"
  ) return true;
  t.skip("Online restore transaction is not implemented yet.");
  return false;
}

function durableRestoreController(controller, persist) {
  return {
    whenIdle: () => controller.whenIdle(),
    replaceWith: (candidate) => controller.replaceWith(candidate, persist),
  };
}

function localDashboard() {
  return {
    configVersion: 6,
    id: "local-dashboard",
    scenarioLabel: "Local scenario",
    programLabel: "Local program",
    lastUpdated: "2026-08-29",
    home: { enabled: true },
    pages: [{ id: "local", label: "Local", sections: [] }],
    chronoGroups: [],
    scenes: [],
    dataSources: {},
    contentLibrary: { mediaItems: {}, sourceEntries: {} },
    assets: {},
  };
}

function onlineDashboard() {
  return {
    configVersion: 6,
    id: "online-dashboard",
    scenarioLabel: "Online scenario",
    programLabel: "Deployed program",
    lastUpdated: "2026-08-12",
    home: { enabled: true },
    pages: [{ id: "online", label: "Online", sections: [] }],
    chronoGroups: [],
    scenes: [],
    dataSources: {
      cases: { kind: "csv", path: "data/cases.csv", provenance: { label: "Online cases" } },
    },
    contentLibrary: { mediaItems: {}, sourceEntries: {} },
    assets: {},
  };
}
