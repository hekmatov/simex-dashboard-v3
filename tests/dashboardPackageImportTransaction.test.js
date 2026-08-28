import assert from "node:assert/strict";
import test from "node:test";

import {
  applyDashboardEdits,
  createDebouncedDashboardEdits,
} from "../src/lib/dashboardCommitController.js";
import {
  commitDashboardPackageImport,
  createImportedRendererDraftState,
} from "../src/lib/dashboardPackageImportTransaction.js";

function dashboard({
  programLabel,
  pageTitle,
  sectionTitle,
} = {}) {
  return {
    configVersion: 3,
    programLabel,
    scenarioLabel: "Shared scenario",
    lastUpdated: "2026-08-21T10:00:00.000Z",
    pages: [{
      id: "shared_page",
      title: pageTitle,
      sections: [{ id: "shared_section", title: sectionTitle, panels: [] }],
    }],
  };
}

test("package replacement drains delayed authored edits before commit and rebases matching IDs", async () => {
  const clock = fakeClock();
  const events = [];
  let current = dashboard({
    programLabel: "Current program",
    pageTitle: "Current page",
    sectionTitle: "Current section",
  });
  let rendererDrafts = {
    dashboardDraft: { programLabel: "Delayed old metadata" },
    pageDrafts: { shared_page: { title: "Stale matching Page" } },
    sectionDrafts: { shared_section: { title: "Stale matching Section" } },
  };
  const pendingEdits = createDebouncedDashboardEdits({
    delay: 650,
    scheduler: clock,
    onCommit: async (edits) => {
      events.push("pending-edit");
      current = applyDashboardEdits(current, edits);
    },
  });
  pendingEdits.schedule("dashboard", {
    type: "dashboard",
    updates: { programLabel: "Delayed old metadata" },
  });
  const imported = dashboard({
    programLabel: "Imported program",
    pageTitle: "Imported matching Page",
    sectionTitle: "Imported matching Section",
  });

  await commitDashboardPackageImport({
    candidate: { config: imported },
    ...compensationBoundary(),
    prepare: async () => {
      events.push("prepare");
      await pendingEdits.flush();
    },
    replace: async (config) => {
      events.push("replace");
      assert.equal(pendingEdits.hasPending(), false);
      current = structuredClone(config);
      return current;
    },
    rebase: (committed) => {
      events.push("rebase");
      rendererDrafts = createImportedRendererDraftState(committed);
    },
  });
  await clock.advance(650);

  assert.deepEqual(events, ["prepare", "pending-edit", "replace", "rebase"]);
  assert.equal(current.programLabel, "Imported program");
  assert.equal(current.pages[0].title, "Imported matching Page");
  assert.equal(current.pages[0].sections[0].title, "Imported matching Section");
  assert.deepEqual(rendererDrafts, {
    dashboardDraft: {
      programLabel: "Imported program",
      scenarioLabel: "Shared scenario",
      lastUpdated: "2026-08-21T10:00:00.000Z",
    },
    pageDrafts: {},
    sectionDrafts: {},
  });
});

test("Home-off import exposes its committed dashboard only after replacement and rebase succeed", async () => {
  const events = [];
  const imported = {
    ...dashboard({ programLabel: "Imported Home-off program" }),
    home: { enabled: false },
  };

  const committed = await commitDashboardPackageImport({
    candidate: { config: imported },
    ...compensationBoundary(),
    prepare: async () => { events.push("prepare"); },
    replace: async (config) => {
      events.push("replace");
      return structuredClone(config);
    },
    rebase: () => { events.push("rebase"); },
  });
  events.push(`resolved:${committed.home.enabled}`);

  assert.deepEqual(events, ["prepare", "replace", "rebase", "resolved:false"]);
  assert.deepEqual(committed.home, { enabled: false });
});

test("asset-free V5 import restores the exact prior dashboard when renderer rebase fails", async () => {
  const prior = dashboard({
    programLabel: "Prior program",
    pageTitle: "Prior page",
    sectionTitle: "Prior section",
  });
  const imported = {
    ...dashboard({
      programLabel: "Imported program",
      pageTitle: "Imported page",
      sectionTitle: "Imported section",
    }),
    configVersion: 5,
    dataSources: {},
    assets: {},
    contentLibrary: { mediaItems: {}, sourceEntries: {} },
  };
  let current = structuredClone(prior);
  const assetMutations = [];

  await assert.rejects(commitDashboardPackageImport({
    candidate: { config: imported, assetPayloads: {} },
    prepare: async () => {},
    snapshotAssets: async () => {
      assetMutations.push("snapshot-assets");
      return new Map();
    },
    restoreAssets: async () => { assetMutations.push("restore-assets"); },
    snapshotDashboard: async () => structuredClone(current),
    restoreDashboard: async (dashboardValue) => {
      current = structuredClone(dashboardValue);
      return current;
    },
    stageAsset: async () => { assetMutations.push("stage-asset"); },
    commitAssets: async () => { assetMutations.push("commit-assets"); },
    rollbackAsset: async () => { assetMutations.push("rollback-asset"); },
    replace: async (config) => {
      current = structuredClone(config);
      return current;
    },
    rebase: (dashboardValue) => {
      if (dashboardValue.programLabel === "Imported program") {
        throw new Error("injected asset-free rebase failure");
      }
    },
  }), /asset-free rebase failure/);

  assert.deepEqual(current, prior);
  assert.deepEqual(assetMutations, []);
});

test("preparation and replacement failures preserve the candidate and current renderer drafts", async () => {
  const candidate = { config: dashboard({ programLabel: "Imported" }) };
  const rendererDrafts = {
    dashboardDraft: { programLabel: "Uncommitted current metadata" },
    pageDrafts: { shared_page: { title: "Uncommitted current Page" } },
    sectionDrafts: { shared_section: { title: "Uncommitted current Section" } },
  };
  let replacements = 0;
  let rebases = 0;

  await assert.rejects(commitDashboardPackageImport({
    candidate,
    prepare: async () => { throw new Error("pending edit persistence failed"); },
    replace: async () => { replacements += 1; },
    rebase: () => { rebases += 1; },
  }), /pending edit persistence failed/);
  assert.equal(replacements, 0);
  assert.equal(rebases, 0);
  assert.equal(candidate.config.programLabel, "Imported");
  assert.equal(rendererDrafts.pageDrafts.shared_page.title, "Uncommitted current Page");

  await assert.rejects(commitDashboardPackageImport({
    candidate,
    ...compensationBoundary(),
    prepare: async () => {},
    replace: async () => {
      replacements += 1;
      throw new Error("replacement persistence failed");
    },
    rebase: () => { rebases += 1; },
  }), /replacement persistence failed/);
  assert.equal(replacements, 1);
  assert.equal(rebases, 0);
  assert.equal(candidate.config.programLabel, "Imported");
  assert.equal(rendererDrafts.sectionDrafts.shared_section.title, "Uncommitted current Section");
});

test("import stages and atomically commits every verified authored payload before one dashboard replacement", async () => {
  const events = [];
  const candidate = importCandidate();
  const committed = await commitDashboardPackageImport({
    candidate,
    ...compensationBoundary(),
    prepare: async () => { events.push("prepare"); },
    stageAsset: async (input) => {
      events.push(`stage:${input.assetId}`);
      assert.deepEqual([...input.bytes], [1, 2, 3, 4]);
      assert.equal(input.width, 8);
      return { assetId: input.assetId };
    },
    rollbackAsset: async (assetId) => { events.push(`rollback:${assetId}`); },
    commitAsset: async (assetId) => { events.push(`commit:${assetId}`); },
    replace: async (config) => {
      events.push("replace");
      return structuredClone(config);
    },
    rebase: () => { events.push("rebase"); },
    transactionId: "import-one",
  });

  assert.equal(committed.configVersion, 4);
  assert.deepEqual(events, [
    "prepare",
    "stage:asset-local",
    "commit:asset-local",
    "replace",
    "rebase",
  ]);
});

test("asset staging failure rolls back staged bytes and never replaces or rebases", async () => {
  const candidate = importCandidate();
  const events = [];
  await assert.rejects(commitDashboardPackageImport({
    candidate,
    ...compensationBoundary(),
    prepare: async () => { events.push("prepare"); },
    stageAsset: async (input) => {
      events.push(`stage:${input.assetId}`);
      throw Object.assign(new Error("storage full"), { code: "AUTHORED_ASSET_QUOTA_EXHAUSTED" });
    },
    rollbackAsset: async (assetId) => { events.push(`rollback:${assetId}`); },
    commitAsset: async () => { events.push("commit"); },
    replace: async () => { events.push("replace"); },
    rebase: () => { events.push("rebase"); },
    transactionId: "import-quota",
  }), /storage full/);
  assert.deepEqual(events, ["prepare", "stage:asset-local"]);
});

test("dashboard replacement failure restores the exact prior dashboard and asset store", async () => {
  const candidate = importCandidate();
  const events = [];
  let current = dashboard({ programLabel: "Prior" });
  const assets = new Map();
  const priorAssets = new Map(assets);

  await assert.rejects(commitDashboardPackageImport({
    candidate,
    prepare: async () => { events.push("prepare"); },
    snapshotAssets: async () => new Map(assets),
    restoreAssets: async (snapshot) => {
      events.push("restore-assets");
      assets.clear();
      for (const [assetId, record] of snapshot) assets.set(assetId, structuredClone(record));
    },
    snapshotDashboard: async () => structuredClone(current),
    restoreDashboard: async (dashboardValue) => {
      events.push("restore-dashboard");
      current = structuredClone(dashboardValue);
      return current;
    },
    stageAsset: async (input) => {
      events.push(`stage:${input.assetId}`);
      assets.set(input.assetId, { status: "staged", transactionId: "import-replace" });
      return { assetId: input.assetId };
    },
    rollbackAsset: async (assetId) => {
      events.push(`rollback:${assetId}`);
      assets.delete(assetId);
    },
    commitAssets: async (assetIds) => {
      events.push(`commit-many:${assetIds.join(",")}`);
      for (const assetId of assetIds) assets.set(assetId, { status: "durable" });
    },
    replace: async (config) => {
      events.push("replace");
      current = structuredClone(config);
      throw new Error("replacement persistence failed");
    },
    rebase: () => { events.push("rebase"); },
    transactionId: "import-replace",
  }), /replacement persistence failed/);
  assert.equal(current.programLabel, "Prior");
  assert.deepEqual(assets, priorAssets);
  assert.deepEqual(events, [
    "prepare",
    "stage:asset-local",
    "commit-many:asset-local",
    "replace",
    "restore-dashboard",
    "rollback:asset-local",
    "restore-assets",
  ]);
});

test("invalid imported raster bytes abort before asset staging or dashboard replacement", async () => {
  const events = [];
  await assert.rejects(commitDashboardPackageImport({
    candidate: importCandidate(),
    ...compensationBoundary(),
    prepare: async () => { events.push("prepare"); },
    validateAsset: async () => {
      events.push("validate");
      throw new Error("Imported Image payload is not a valid single-frame raster.");
    },
    stageAsset: async () => { events.push("stage"); },
    replace: async () => { events.push("replace"); },
    rebase: () => { events.push("rebase"); },
  }), /valid single-frame raster/i);
  assert.deepEqual(events, ["prepare", "validate"]);
});

test("asset commit failure restores the exact prior dashboard and asset store without recovery state", async () => {
  const events = [];
  let current = dashboard({ programLabel: "Prior" });
  const candidate = importCandidate();
  const assets = new Map();
  const priorAssets = new Map(assets);

  await assert.rejects(commitDashboardPackageImport({
    candidate,
    prepare: async () => { events.push("prepare"); },
    snapshotAssets: async () => new Map(assets),
    restoreAssets: async (snapshot) => {
      events.push("restore-assets");
      assets.clear();
      for (const [assetId, record] of snapshot) assets.set(assetId, structuredClone(record));
    },
    snapshotDashboard: async () => structuredClone(current),
    restoreDashboard: async (dashboardValue) => {
      events.push("restore-dashboard");
      current = structuredClone(dashboardValue);
      return current;
    },
    stageAsset: async (input) => {
      events.push(`stage:${input.assetId}`);
      assets.set(input.assetId, { status: "staged", transactionId: "import-commit-failure" });
      return { assetId: input.assetId };
    },
    preflightAsset: async (assetId) => { events.push(`preflight:${assetId}`); },
    rollbackAsset: async (assetId) => {
      events.push(`rollback:${assetId}`);
      assets.delete(assetId);
    },
    replace: async (config) => {
      events.push("replace");
      current = structuredClone(config);
      return current;
    },
    commitAssets: async (assetIds) => {
      events.push(`commit-many:${assetIds.join(",")}`);
      for (const assetId of assetIds) assets.set(assetId, { status: "durable" });
      throw new Error("injected atomic asset commit failure");
    },
    rebase: () => { events.push("rebase"); },
    transactionId: "import-commit-failure",
  }), /atomic asset commit failure/);

  assert.equal(current.programLabel, "Prior");
  assert.deepEqual(assets, priorAssets);
  assert.deepEqual(events, [
    "prepare",
    "stage:asset-local",
    "preflight:asset-local",
    "commit-many:asset-local",
    "rollback:asset-local",
    "restore-assets",
  ]);
});

test("import preflight failure rolls back staging and preserves the prior dashboard", async () => {
  const events = [];
  let current = dashboard({ programLabel: "Prior" });
  await assert.rejects(commitDashboardPackageImport({
    candidate: importCandidate(),
    ...compensationBoundary(),
    prepare: async () => { events.push("prepare"); },
    stageAsset: async (input) => {
      events.push(`stage:${input.assetId}`);
      return { assetId: input.assetId };
    },
    preflightAsset: async (assetId) => {
      events.push(`preflight:${assetId}`);
      throw Object.assign(new Error("dedup bytes corrupt"), { code: "AUTHORED_ASSET_CORRUPT" });
    },
    rollbackAsset: async (assetId) => { events.push(`rollback:${assetId}`); },
    replace: async (config) => {
      events.push("replace");
      current = structuredClone(config);
      return current;
    },
    rebase: () => { events.push("rebase"); },
    transactionId: "import-preflight-failure",
  }), /dedup bytes corrupt/);
  assert.equal(current.programLabel, "Prior");
  assert.deepEqual(events, [
    "prepare",
    "stage:asset-local",
    "preflight:asset-local",
    "rollback:asset-local",
  ]);
});

test("a multi-asset import refuses a non-atomic commit boundary before replacement", async () => {
  const candidate = importCandidate();
  candidate.config.assets["asset-second"] = {
    ...candidate.config.assets["asset-local"],
  };
  candidate.assetPayloads["asset-second"] = {
    ...candidate.assetPayloads["asset-local"],
  };
  const events = [];

  await assert.rejects(commitDashboardPackageImport({
    candidate,
    prepare: async () => { events.push("prepare"); },
    stageAsset: async ({ assetId }) => {
      events.push(`stage:${assetId}`);
      return { assetId };
    },
    rollbackAsset: async (assetId) => { events.push(`rollback:${assetId}`); },
    commitAsset: async (assetId) => { events.push(`commit:${assetId}`); },
    replace: async () => { events.push("replace"); },
    rebase: () => { events.push("rebase"); },
  }), /atomic authored asset commit/i);

  assert.deepEqual(events, ["prepare"]);
});

test("V6 cross-layer package validation runs before import preparation or mutation", async () => {
  const events = [];
  const candidate = {
    config: {
      configVersion: 6,
      home: { enabled: true },
      contentLibrary: {
        mediaItems: {
          missing: {
            mediaId: "missing",
            revision: 1,
            current: { kind: "asset", assetId: "asset-missing" },
            displayName: "Missing",
            defaultDescription: "Missing",
            origin: "uploaded",
            health: "ready",
            dimensions: { width: 8, height: 6 },
            byteLength: 4,
            mediaType: "image/png",
          },
        },
        sourceEntries: {},
      },
      dataSources: {},
      assets: {
        "asset-missing": {
          mediaType: "image/png",
          byteLength: 4,
          width: 8,
          height: 6,
          sha256: "9f64a747e1b97f131fabb6b447296c9b6f0201e79fb3c5356e6c77e89b6a806a",
          storageState: "durable",
        },
      },
    },
    assetPayloads: {},
  };

  await assert.rejects(commitDashboardPackageImport({
    candidate,
    prepare: async () => { events.push("prepare"); },
    replace: async () => { events.push("replace"); },
    rebase: () => { events.push("rebase"); },
  }), /missing authored asset payload/i);
  assert.deepEqual(events, []);
});

function importCandidate() {
  return {
    config: {
      ...dashboard({ programLabel: "Imported" }),
      configVersion: 4,
      assets: {
        "asset-local": {
          mediaType: "image/png",
          byteLength: 4,
          width: 8,
          height: 6,
          sha256: "9f64a747e1b97f131fabb6b447296c9b6f0201e79fb3c5356e6c77e89b6a806a",
          storageState: "durable",
        },
      },
    },
    assetPayloads: {
      "asset-local": {
        base64: "AQIDBA==",
        byteLength: 4,
        mediaType: "image/png",
        sha256: "9f64a747e1b97f131fabb6b447296c9b6f0201e79fb3c5356e6c77e89b6a806a",
      },
    },
  };
}

function compensationBoundary() {
  let current = dashboard({ programLabel: "Prior" });
  const assets = new Map();
  return {
    snapshotAssets: async (assetIds) => new Map(assetIds.map((assetId) => [
      assetId,
      assets.has(assetId) ? structuredClone(assets.get(assetId)) : null,
    ])),
    restoreAssets: async (snapshot) => {
      for (const [assetId, record] of snapshot) {
        if (record === null) assets.delete(assetId);
        else assets.set(assetId, structuredClone(record));
      }
    },
    snapshotDashboard: async () => structuredClone(current),
    restoreDashboard: async (dashboardValue) => {
      current = structuredClone(dashboardValue);
      return current;
    },
  };
}

function fakeClock() {
  let now = 0;
  let nextId = 1;
  const timers = new Map();
  return {
    setTimeout(callback, delay) {
      const id = nextId;
      nextId += 1;
      timers.set(id, { at: now + delay, callback });
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
    async advance(milliseconds) {
      now += milliseconds;
      const due = [...timers.entries()]
        .filter(([, timer]) => timer.at <= now)
        .sort((left, right) => left[1].at - right[1].at);
      for (const [id, timer] of due) {
        timers.delete(id);
        await timer.callback();
      }
    },
  };
}
