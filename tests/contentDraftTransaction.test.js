import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCsvContentDraft,
  buildStaticPanelContentDraftCandidate,
  createContentDraftCoordinator,
  discardContentDraft,
  finalizeContentDraft,
  stageContentDraft,
} from "../src/content-library/contentDraftTransaction.js";
import * as contentDraftTransaction from "../src/content-library/contentDraftTransaction.js";
import { createChartDraft } from "../src/charting/config/chartConfigV3.js";
import { createWizardState, finalizeWizardDraft } from "../src/charting/forms/wizardDraft.js";
import {
  createStaticContentDraft,
  finalizeStaticContentDraft,
  reduceStaticContentDraft,
} from "../src/static-content/forms/staticContentDraft.js";
import { makeDashboardV5, makeMediaItem } from "./helpers/contentLibraryFixtures.js";
import { profileDataset } from "../src/charting/data/profileDataset.js";

test("StrictMode effect replay keeps the reused content draft coordinator active until the final release", async () => {
  assert.equal(typeof contentDraftTransaction.createDeferredCoordinatorDisposal, "function");
  const scheduled = [];
  let disposeCalls = 0;
  const lifecycle = contentDraftTransaction.createDeferredCoordinatorDisposal({
    schedule: (callback) => scheduled.push(callback),
  });
  const coordinator = { async dispose() { disposeCalls += 1; } };

  const releaseReplay = lifecycle.retain(coordinator);
  releaseReplay();
  const releaseMounted = lifecycle.retain(coordinator);
  await scheduled.shift()();
  assert.equal(disposeCalls, 0);

  releaseMounted();
  await scheduled.shift()();
  assert.equal(disposeCalls, 1);
});

test("manager CSV Add publishes descriptor profile and unused source entry in one candidate", async () => {
  const harness = coordinatorHarness();
  const rows = [{ region: "North", value: 12 }, { region: "South", value: 14 }];
  const profile = profileDataset(rows);
  const input = buildCsvContentDraft({
    owner: "manager",
    sourceId: "upload-exercise-status",
    source: {
      kind: "dataset",
      type: "uploadedCsv",
      fileName: "exercise-status.csv",
      csvText: "region,value\nNorth,12\nSouth,14\n",
    },
    profile,
    displayName: "Exercise status",
  });
  const { buildCandidate, ...draft } = input;
  harness.coordinator.stageDraft(draft);
  const result = await harness.coordinator.commitDraft(input.draftId, { buildCandidate });

  assert.deepEqual(result.itemIds, ["upload-exercise-status"]);
  assert.deepEqual(harness.dashboard.dataSources["upload-exercise-status"], input.source);
  assert.deepEqual(harness.dashboard.datasetProfiles["upload-exercise-status"], profile);
  assert.deepEqual(harness.dashboard.contentLibrary.sourceEntries["upload-exercise-status"], input.entry);
  assert.equal(JSON.stringify(harness.dashboard.pages).includes("upload-exercise-status"), false);
  assert.deepEqual(harness.coordinator.getActiveRetainers().records, []);
});

test("chart CSV draft publishes source registration and completed chart atomically", async () => {
  const harness = coordinatorHarness();
  const rows = [{ date: "2026-01-01", value: 6 }];
  const profile = profileDataset(rows, { date: { interpretation: "temporal" } });
  const wizard = createWizardState({
    draft: createChartDraft("line", {
      id: "chart-upload-ready", title: "Ready status", sourceId: "upload-ready",
      roles: {
        measurements: [{ field: "value", axis: "primary" }],
        observation: { field: "date", interpretation: "temporal", format: "YYYY-MM-DD" },
      },
    }),
    loadedData: { "upload-ready": rows },
    profiles: { "upload-ready": profile },
    chronoGroups: [],
  });
  const finalized = finalizeWizardDraft(wizard);
  const input = buildCsvContentDraft({
    owner: "chart",
    sourceId: "upload-ready",
    source: { kind: "dataset", type: "uploadedCsv", fileName: "ready.csv", csvText: "date,value\n2026-01-01,6\n" },
    profile,
    displayName: "Ready status",
    finalized,
    destination: { pageId: "overview", sectionId: "response", relation: "append" },
  });
  const { buildCandidate, ...draft } = input;
  harness.coordinator.stageDraft(draft);
  await harness.coordinator.commitDraft(input.draftId, { buildCandidate });

  assert.equal(harness.dashboard.pages[0].sections[0].panels.at(-1).id, finalized.chart.id);
  assert.equal(harness.dashboard.pages[0].sections[0].panels.at(-1).sourceId, "upload-ready");
  assert.equal(harness.dashboard.contentLibrary.sourceEntries["upload-ready"].ownership, "builder");
  assert.equal(harness.dashboard.datasetProfiles["upload-ready"].fingerprint, profile.fingerprint);
});

test("pure content draft transitions are immutable and retain exact owner context", () => {
  const input = {
    draftId: "image-edit",
    owner: "image",
    kind: "image-replacement",
    payload: { previousAssetId: "asset-old" },
    assetIds: ["asset-new", "asset-old", "asset-new"],
    mediaIds: ["media-map"],
    sourceIds: [],
  };
  const staged = stageContentDraft(input);
  assert.deepEqual(staged, {
    draftId: "image-edit",
    owner: "image",
    kind: "image-replacement",
    status: "staged",
    payload: { previousAssetId: "asset-old" },
    assetIds: ["asset-new", "asset-old"],
    mediaIds: ["media-map"],
    sourceIds: [],
  });
  assert.equal(Object.isFrozen(staged), true);
  assert.equal(Object.isFrozen(staged.assetIds), true);
  assert.equal(Object.isFrozen(staged.payload), true);
  assert.equal(finalizeContentDraft(staged).status, "completed");
  assert.equal(discardContentDraft(staged, { reason: "explicit-cancel" }).status, "discarded");
  assert.equal(Object.hasOwn(input, "status"), false);
});

test("coordinator exposes exact sorted retainers for drafts, contextual replacement, and transactions", async () => {
  const harness = coordinatorHarness();
  const snapshots = [];
  const unsubscribe = harness.coordinator.subscribe((snapshot) => snapshots.push(snapshot));
  harness.coordinator.stageDraft({
    draftId: "chart-draft", owner: "chart", kind: "chart", payload: {},
    assetIds: ["asset-z"], mediaIds: [], sourceIds: ["source-z", "source-a"],
  });
  harness.coordinator.stageDraft({
    draftId: "image-edit", owner: "image", kind: "image-replacement", payload: {},
    assetIds: ["asset-old", "asset-z"], mediaIds: ["media-z"], sourceIds: [],
  });
  harness.coordinator.beginTransaction({
    transactionId: "delete-a", kind: "delete", assetIds: [], mediaIds: ["media-a"], sourceIds: ["source-a"],
  });

  const snapshot = harness.coordinator.getActiveRetainers();
  assert.deepEqual(snapshot.assetIds, ["asset-old", "asset-z"]);
  assert.deepEqual(snapshot.mediaIds, ["media-a", "media-z"]);
  assert.deepEqual(snapshot.sourceIds, ["source-a", "source-z"]);
  assert.deepEqual(snapshot.records, [
    { ownerId: "chart-draft", kind: "chart", status: "staged", assetIds: ["asset-z"], mediaIds: [], sourceIds: ["source-a", "source-z"] },
    { ownerId: "delete-a", kind: "delete", status: "active", assetIds: [], mediaIds: ["media-a"], sourceIds: ["source-a"] },
    { ownerId: "image-edit", kind: "image-replacement", status: "staged", assetIds: ["asset-old", "asset-z"], mediaIds: ["media-z"], sourceIds: [] },
  ]);
  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(Object.isFrozen(snapshot.records[0]), true);
  assert.deepEqual(snapshots.at(-1), snapshot);

  await harness.coordinator.discardDraft("image-edit", { reason: "restore-previous-image" });
  harness.coordinator.completeTransaction("delete-a");
  assert.deepEqual(harness.coordinator.getActiveRetainers().assetIds, ["asset-z"]);
  unsubscribe();
});

test("manager Add publishes one immutable candidate and deliberately keeps an unused record", async () => {
  const harness = coordinatorHarness();
  const previous = structuredClone(harness.dashboard);
  harness.sessionAssets.set("asset-new", sessionAsset("asset-new"));
  harness.coordinator.stageDraft({
    draftId: "manager-add", owner: "manager", kind: "media-add",
    payload: { mediaItem: makeMediaItem({ mediaId: "media-unused", current: { kind: "asset", assetId: "asset-new" } }) },
    assetIds: ["asset-new"], mediaIds: ["media-unused"], sourceIds: [],
  });

  const result = await harness.coordinator.commitDraft("manager-add", {
    buildCandidate({ dashboard, draft }) {
      const candidate = structuredClone(dashboard);
      candidate.assets["asset-new"] = { ...manifest(), storageState: "staged" };
      candidate.contentLibrary.mediaItems["media-unused"] = draft.payload.mediaItem;
      return { dashboard: candidate, commitAssetIds: ["asset-new"], discardAssetIds: [], itemIds: ["media-unused"] };
    },
  });

  assert.deepEqual(harness.commits.map(({ options }) => options.transactionId), ["content-draft:manager-add"]);
  assert.equal(harness.dashboard.contentLibrary.mediaItems["media-unused"].mediaId, "media-unused");
  assert.equal(harness.dashboard.assets["asset-new"].storageState, "durable");
  assert.equal(result.dashboard.assets["asset-new"].storageState, "durable");
  assert.deepEqual(result.itemIds, ["media-unused"]);
  assert.deepEqual(previous, makeDashboardV5());
  assert.equal(harness.sessionAssets.has("asset-new"), false);
  assert.deepEqual(harness.coordinator.getActiveRetainers().records, []);
});

test("QMD panel draft publishes its new local media and panel in one coordinator candidate", async () => {
  const dashboard = makeDashboardV5();
  let state = createStaticContentDraft({
    stage: "content",
    destination: { pageId: "overview", sectionId: "response" },
    contentTypeId: "freeText",
    panel: { ...dashboard.pages[0].sections[0].panels[0].chart, id: "qmd-local", typeId: "freeText", title: "Local media note", sourceId: "qmd-local-source" },
    placement: { kind: "staticText", qmd: "![Local map](simex-media:media-local)" },
  });
  state = reduceStaticContentDraft(state, { type: "setStage", stage: "preview-and-add" });
  const payload = finalizeStaticContentDraft(state);
  const localItem = makeMediaItem({
    mediaId: "media-local", revision: 1, current: { kind: "asset", assetId: "asset-local" },
    origin: "uploaded", health: "ready", dimensions: { width: 1, height: 1 }, byteLength: 1,
  });
  const manifestEntry = manifest();
  const result = buildStaticPanelContentDraftCandidate({
    dashboard,
    draft: { owner: "qmd-panel", payload },
    pendingMediaItems: { "media-local": localItem },
    pendingAssets: { "asset-local": manifestEntry },
  });
  assert.equal(result.dashboard.contentLibrary.mediaItems["media-local"].mediaId, "media-local");
  assert.equal(result.dashboard.dataSources["qmd-local-source"].qmd.includes("media-local"), true);
  assert.deepEqual(result.commitAssetIds, ["asset-local"]);
  assert.deepEqual(result.itemIds, ["media-local", "qmd-local"]);
});

test("authoring owners cannot publish until their existing finalizer result is staged", async () => {
  for (const [owner, payload] of [
    ["chart", { chart: { id: "chart-complete" } }],
    ["image", { destination: {}, panel: {}, placement: {}, assets: {}, stagedAssetIds: [] }],
    ["qmd", { destination: {}, panel: {}, placement: {}, assets: {}, stagedAssetIds: [] }],
    ["image", { destination: {}, panel: {}, placement: { kind: "staticImage" }, mediaItem: null, assets: {}, stagedAssetIds: [] }],
    ["qmd", { destination: {}, panel: {}, placement: { kind: "staticText" }, mediaItem: null, assets: {}, stagedAssetIds: [] }],
  ]) {
    const harness = coordinatorHarness();
    harness.coordinator.stageDraft({ draftId: `${owner}-draft`, owner, kind: `${owner}-add`, payload, assetIds: [], mediaIds: [], sourceIds: [] });
    await assert.rejects(harness.coordinator.commitDraft(`${owner}-draft`, {
      buildCandidate: () => ({ dashboard: harness.dashboard, commitAssetIds: [], discardAssetIds: [], itemIds: [] }),
    }), /finalized before publication/);
    assert.deepEqual(harness.commits, []);
  }

  const chart = coordinatorHarness();
  const finalizedChart = finalizeWizardDraft(validChartWizardState());
  chart.coordinator.stageDraft({
    draftId: "chart-complete", owner: "chart", kind: "chart-add",
    payload: finalizedChart, assetIds: [], mediaIds: [], sourceIds: [],
  });
  await chart.coordinator.commitDraft("chart-complete", {
    buildCandidate: ({ dashboard }) => ({ dashboard, commitAssetIds: [], discardAssetIds: [], itemIds: ["chart-complete"] }),
  });
  assert.equal(chart.commits.length, 1);

  for (const owner of ["image", "qmd"]) {
    const harness = coordinatorHarness();
    const finalizedStatic = finalizeStaticContentDraft(validStaticContentState());
    harness.coordinator.stageDraft({
      draftId: `${owner}-complete`, owner, kind: `${owner}-add`,
      payload: finalizedStatic,
      assetIds: [], mediaIds: [], sourceIds: [],
    });
    await harness.coordinator.commitDraft(`${owner}-complete`, {
      buildCandidate: ({ dashboard }) => ({ dashboard, commitAssetIds: [], discardAssetIds: [], itemIds: [`${owner}-complete`] }),
    });
    assert.equal(harness.commits.length, 1);
  }
});

function validChartWizardState() {
  return createWizardState({
    draft: createChartDraft("line", {
      id: "chart-complete", title: "Complete chart", sourceId: "source",
      roles: {
        measurements: [{ field: "value", axis: "primary" }],
        observation: { field: "date", interpretation: "temporal", format: "YYYY-MM-DD" },
      },
    }),
    profiles: {
      source: {
        rowCount: 1,
        columns: [
          { name: "value", type: "numeric", values: [1] },
          { name: "date", type: "temporal", temporal: { values: ["2026-01-01"], diagnostics: [], parsingMetadata: { interpretation: "temporal", format: "YYYY-MM-DD", timezone: "date-only" } } },
        ],
      },
    },
  });
}

function validStaticContentState() {
  let state = createStaticContentDraft({
    destination: { pageId: "page", sectionId: "section" },
    contentTypeId: "freeText",
    panel: { id: "static-complete", title: "Complete static content", sourceId: "static-source" },
    placement: { kind: "staticText", qmd: "Complete" },
  });
  state = reduceStaticContentDraft(state, { type: "setStage", stage: "preview-and-add" });
  return state;
}

test("internal draft transaction collisions never overwrite or remove a public transaction", async () => {
  const harness = coordinatorHarness();
  harness.coordinator.beginTransaction({ transactionId: "content-draft:collision", kind: "public", assetIds: ["public"], mediaIds: [], sourceIds: [] });
  harness.coordinator.stageDraft({ draftId: "collision", owner: "manager", kind: "media-add", payload: {}, assetIds: [], mediaIds: [], sourceIds: [] });
  await assert.rejects(harness.coordinator.commitDraft("collision", {
    buildCandidate: ({ dashboard }) => ({ dashboard, commitAssetIds: [], discardAssetIds: [], itemIds: [] }),
  }), /already exists/);
  assert.deepEqual(harness.coordinator.getActiveRetainers().records, [
    { ownerId: "content-draft:collision", kind: "public", status: "active", assetIds: ["public"], mediaIds: [], sourceIds: [] },
  ]);
});

test("post-commit session cleanup failure retains cleanup state without reverting dashboard or bytes", async () => {
  const harness = coordinatorHarness({ rejectSessionDiscard: true });
  harness.sessionAssets.set("asset-new", sessionAsset("asset-new"));
  harness.coordinator.stageDraft({ draftId: "cleanup", owner: "manager", kind: "media-add", payload: {}, assetIds: ["asset-new"], mediaIds: [], sourceIds: [] });
  const result = await harness.coordinator.commitDraft("cleanup", {
    buildCandidate({ dashboard }) {
      dashboard.assets["asset-new"] = manifest();
      return { dashboard, commitAssetIds: ["asset-new"], discardAssetIds: [], itemIds: [] };
    },
  });
  assert.equal(harness.dashboard.assets["asset-new"].storageState, "durable");
  assert.equal(harness.assetRecords.get("asset-new").status, "durable");
  assert.equal(result.cleanup.status, "cleanup-required");
  assert.deepEqual(harness.coordinator.getActiveRetainers().assetIds, ["asset-new"]);
});

test("unrelated public transactions survive draft success and failure", async () => {
  for (const rejectCommit of [false, true]) {
    const harness = coordinatorHarness({ rejectCommit });
    harness.coordinator.beginTransaction({ transactionId: "public", kind: "delete", assetIds: ["held"], mediaIds: [], sourceIds: [] });
    harness.coordinator.stageDraft({ draftId: `draft-${rejectCommit}`, owner: "manager", kind: "media-add", payload: {}, assetIds: [], mediaIds: [], sourceIds: [] });
    const commit = harness.coordinator.commitDraft(`draft-${rejectCommit}`, {
      buildCandidate: ({ dashboard }) => ({ dashboard, commitAssetIds: [], discardAssetIds: [], itemIds: [] }),
    });
    if (rejectCommit) await assert.rejects(commit, /persistence failed/); else await commit;
    assert.deepEqual(harness.coordinator.getActiveRetainers().records.map(({ ownerId }) => ownerId), ["public"]);
  }
});

test("explicit Cancel, owner departure, and dispose remove only session drafts", async () => {
  const harness = coordinatorHarness();
  for (const [draftId, owner, assetId] of [
    ["qmd-a", "qmd", "asset-qmd"],
    ["chart-a", "chart", "asset-chart"],
    ["manager-a", "manager", "asset-manager"],
  ]) {
    harness.sessionAssets.set(assetId, sessionAsset(assetId));
    harness.coordinator.stageDraft({ draftId, owner, kind: `${owner}-add`, payload: {}, assetIds: [assetId], mediaIds: [], sourceIds: [] });
  }
  await harness.coordinator.discardDraft("qmd-a", { reason: "explicit-cancel" });
  await harness.coordinator.discardOwner("chart", { reason: "mode-departure" });
  assert.deepEqual(harness.coordinator.getActiveRetainers().records.map(({ ownerId }) => ownerId), ["manager-a"]);
  await harness.coordinator.dispose();
  assert.deepEqual(harness.coordinator.getActiveRetainers().records, []);
  assert.deepEqual([...harness.sessionAssets], []);
  assert.deepEqual(harness.dashboard, makeDashboardV5());
});

test("manager Close, Escape, mode departure, unmount, and disposal leave exact empty inventories", async () => {
  const harness = coordinatorHarness();
  const stageManager = (suffix) => {
    const assetId = `asset-manager-${suffix}`;
    harness.sessionAssets.set(assetId, sessionAsset(assetId));
    harness.coordinator.stageDraft({
      draftId: `manager-${suffix}`, owner: "manager", kind: "media-add", payload: {},
      assetIds: [assetId], mediaIds: [`media-manager-${suffix}`], sourceIds: [],
    });
    return { assetId, draftId: `manager-${suffix}` };
  };

  for (const context of ["close", "escape", "unmount"]) {
    const { draftId } = stageManager(context);
    await harness.coordinator.discardDraft(draftId, { reason: `manager-${context}` });
    assert.deepEqual(harness.coordinator.getActiveRetainers().records, []);
    assert.deepEqual([...harness.sessionAssets], []);
    assert.deepEqual(harness.dashboard, makeDashboardV5());
  }

  stageManager("mode-departure");
  await harness.coordinator.discardOwner("manager", { reason: "mode-departure" });
  assert.deepEqual(harness.coordinator.getActiveRetainers().records, []);
  assert.deepEqual([...harness.sessionAssets], []);
  assert.deepEqual(harness.dashboard, makeDashboardV5());

  stageManager("dispose");
  await harness.coordinator.dispose();
  assert.deepEqual(harness.coordinator.getActiveRetainers().records, []);
  assert.deepEqual([...harness.sessionAssets], []);
  assert.deepEqual(harness.dashboard, makeDashboardV5());
});

test("validation and persistence failures publish no durable item and restore byte state", async () => {
  for (const failure of ["validation", "persistence"]) {
    const harness = coordinatorHarness({ rejectCommit: failure === "persistence" });
    harness.sessionAssets.set("asset-failed", sessionAsset("asset-failed"));
    harness.coordinator.stageDraft({
      draftId: `failed-${failure}`, owner: "manager", kind: "chart", payload: {},
      assetIds: ["asset-failed"], mediaIds: [], sourceIds: ["source-failed"],
    });
    await assert.rejects(harness.coordinator.commitDraft(`failed-${failure}`, {
      buildCandidate() {
        if (failure === "validation") throw new Error("candidate invalid");
        const dashboard = structuredClone(harness.dashboard);
        dashboard.contentLibrary.sourceEntries["source-failed"] = { sourceId: "source-failed" };
        return { dashboard, commitAssetIds: ["asset-failed"], discardAssetIds: [], itemIds: ["source-failed"] };
      },
    }), failure === "validation" ? /candidate invalid/ : /persistence failed/);
    assert.deepEqual(harness.dashboard, makeDashboardV5());
    assert.deepEqual(harness.assetRecords, new Map());
    assert.equal(harness.sessionAssets.has("asset-failed"), false);
    assert.deepEqual(harness.coordinator.getActiveRetainers().records, []);
  }
});

test("asset-commit compensation marks the dashboard restoration as rollback context", async () => {
  let dashboard = makeDashboardV5();
  const contexts = [];
  const coordinator = createContentDraftCoordinator({
    getDashboard: () => dashboard,
    commitDashboard: async (candidate, context) => {
      contexts.push(structuredClone(context));
      dashboard = structuredClone(candidate);
      return dashboard;
    },
    assetStore: {
      snapshot: async () => new Map([["asset-rollback", null]]),
      restore: async () => {},
      stage: async () => ({ assetId: "asset-rollback" }),
      commitMany: async () => { throw new Error("asset commit failed"); },
      rollback: async () => {},
    },
    readSessionAsset: () => sessionAsset("asset-rollback"),
    discardSessionAsset: () => true,
  });
  coordinator.stageDraft({
    draftId: "rollback-context",
    owner: "manager",
    kind: "manager-add",
    payload: {},
    assetIds: ["asset-rollback"],
    mediaIds: [],
    sourceIds: ["source-rollback"],
  });

  await assert.rejects(coordinator.commitDraft("rollback-context", {
    buildCandidate: ({ dashboard: current }) => {
      current.contentLibrary.sourceEntries["source-rollback"] = { sourceId: "source-rollback" };
      return {
        dashboard: current,
        commitAssetIds: ["asset-rollback"],
        discardAssetIds: [],
        itemIds: ["source-rollback"],
      };
    },
  }), /asset commit failed/);

  assert.deepEqual(contexts, [
    { transactionId: "content-draft:rollback-context" },
    { transactionId: "content-draft:rollback-context:rollback", rollback: true },
  ]);
  assert.deepEqual(dashboard, makeDashboardV5());
});

function coordinatorHarness({ rejectCommit = false, rejectSessionDiscard = false } = {}) {
  let dashboard = makeDashboardV5();
  const commits = [];
  const sessionAssets = new Map();
  const assetRecords = new Map();
  const assetStore = {
    async snapshot(ids) {
      return new Map(ids.map((id) => [id, assetRecords.has(id) ? structuredClone(assetRecords.get(id)) : null]));
    },
    async restore(snapshot) {
      for (const [id, value] of snapshot) value === null ? assetRecords.delete(id) : assetRecords.set(id, structuredClone(value));
    },
    async stage(input) {
      assetRecords.set(input.assetId ?? input.id ?? input.expectedAssetId, { id: input.assetId ?? input.id ?? input.expectedAssetId, status: "staged" });
      return { assetId: input.assetId ?? input.id ?? input.expectedAssetId };
    },
    async commitMany(ids) {
      for (const id of ids) assetRecords.set(id, { ...assetRecords.get(id), status: "durable" });
    },
    async rollback(id) { assetRecords.delete(id); },
  };
  const coordinator = createContentDraftCoordinator({
    getDashboard: () => dashboard,
    async commitDashboard(candidate, options) {
      commits.push({ candidate: structuredClone(candidate), options: structuredClone(options) });
      if (rejectCommit) throw new Error("persistence failed");
      dashboard = structuredClone(candidate);
      return dashboard;
    },
    assetStore,
    readSessionAsset: (id) => sessionAssets.get(id) ?? null,
    discardSessionAsset: (id) => {
      if (rejectSessionDiscard) throw new Error("session cleanup failed");
      return sessionAssets.delete(id);
    },
  });
  return {
    coordinator, commits, sessionAssets, assetRecords,
    get dashboard() { return dashboard; },
  };
}

function sessionAsset(assetId) {
  return { assetId, bytes: new Uint8Array([1]), mediaType: "image/png", width: 1, height: 1 };
}

function manifest() {
  return { mediaType: "image/png", byteLength: 1, width: 1, height: 1, sha256: "a".repeat(64), storageState: "durable" };
}
