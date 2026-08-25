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

test("import stages every verified authored payload before one replacement and commits afterward", async () => {
  const events = [];
  const candidate = importCandidate();
  const committed = await commitDashboardPackageImport({
    candidate,
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
    "replace",
    "commit:asset-local",
    "rebase",
  ]);
});

test("asset staging or replacement failure rolls back staged bytes and never partially rebases", async () => {
  const candidate = importCandidate();
  const events = [];
  await assert.rejects(commitDashboardPackageImport({
    candidate,
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

  events.length = 0;
  await assert.rejects(commitDashboardPackageImport({
    candidate,
    prepare: async () => { events.push("prepare"); },
    stageAsset: async (input) => {
      events.push(`stage:${input.assetId}`);
      return { assetId: input.assetId };
    },
    rollbackAsset: async (assetId) => { events.push(`rollback:${assetId}`); },
    commitAsset: async () => { events.push("commit"); },
    replace: async () => {
      events.push("replace");
      throw new Error("replacement persistence failed");
    },
    rebase: () => { events.push("rebase"); },
    transactionId: "import-replace",
  }), /replacement persistence failed/);
  assert.deepEqual(events, [
    "prepare",
    "stage:asset-local",
    "replace",
    "rollback:asset-local",
  ]);
});

test("invalid imported raster bytes abort before asset staging or dashboard replacement", async () => {
  const events = [];
  await assert.rejects(commitDashboardPackageImport({
    candidate: importCandidate(),
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
