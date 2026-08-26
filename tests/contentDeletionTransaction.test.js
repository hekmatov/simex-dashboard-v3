import assert from "node:assert/strict";
import test from "node:test";

import { buildContentDependencyGraph } from "../src/content-library/contentDependencyGraph.js";
import { prepareContentDeletion, commitContentDeletion, createContentDeletionAdapters } from "../src/content-library/contentDeletionTransaction.js";
import { makeMediaItem, makeSourceEntry } from "./helpers/contentLibraryFixtures.js";
import { createBrowserAuthoredAssetStore } from "../src/static-content/assets/browserAuthoredAssetStore.js";

function dashboardFixture() {
  return {
    configVersion: 5,
    contentLibrary: {
      mediaItems: {
        kept: makeMediaItem({ mediaId: "kept", current: { kind: "asset", assetId: "shared" } }),
        removable: makeMediaItem({ mediaId: "removable", revision: 8, current: { kind: "asset", assetId: "removable-asset" } }),
      },
      sourceEntries: { unused: makeSourceEntry("csv", { sourceId: "unused" }) },
    },
    assets: {
      shared: { sha256: "a".repeat(64) },
      "removable-asset": { sha256: "b".repeat(64) },
    },
    dataSources: { unused: { kind: "csv", rows: [{ value: 1 }] } },
    datasetProfiles: { unused: { rowCount: 1 } },
    pages: [],
  };
}

test("prepare blocks referenced or retained items without mutating the dashboard", async () => {
  const dashboard = dashboardFixture();
  const before = JSON.stringify(dashboard);
  const graph = buildContentDependencyGraph({
    dashboard,
    activeRetainers: { assetIds: [], mediaIds: ["removable"], sourceIds: [], records: [{ ownerId: "draft-a", kind: "qmd-draft", status: "staged", assetIds: [], mediaIds: ["removable"], sourceIds: [] }] },
  });
  const plan = prepareContentDeletion({ dashboard, graph, item: { kind: "media", id: "removable" } });
  assert.equal(plan.status, "blocked");
  assert.deepEqual(plan.directUses, []);
  assert.deepEqual(plan.retainers.map(({ ownerId }) => ownerId), ["draft-a"]);
  assert.equal(JSON.stringify(dashboard), before);
  await assert.rejects(() => commitContentDeletion(plan, {}), /ready deletion plan/i);
});

test("ready deletion checks revision and removes only the eligible logical and physical authority", async () => {
  let current = dashboardFixture();
  const commits = [];
  const plan = prepareContentDeletion({ dashboard: current, graph: buildContentDependencyGraph({ dashboard: current }), item: { kind: "media", id: "removable" } });
  assert.equal(plan.status, "ready");
  assert.equal(plan.expectedRevision, 8);
  const result = await commitContentDeletion(plan, {
    getDashboard: () => current,
    commitDashboard: async (candidate) => { current = structuredClone(candidate); commits.push(JSON.stringify(candidate)); },
  });
  assert.equal(result.status, "committed");
  assert.equal(current.contentLibrary.mediaItems.removable, undefined);
  assert.equal(current.assets["removable-asset"], undefined);
  assert.ok(current.contentLibrary.mediaItems.kept);
  assert.equal(commits.length, 1);
});

test("source plans reject entry descriptor and profile drift without inventing a SourceEntry revision", async () => {
  const changes = [
    ["display name", (dashboard) => { dashboard.contentLibrary.sourceEntries.unused.displayName = "Renamed"; }],
    ["provenance", (dashboard) => { dashboard.contentLibrary.sourceEntries.unused.provenance = { path: "changed.csv" }; }],
    ["descriptor", (dashboard) => { dashboard.dataSources.unused.rows = [{ value: 2 }]; }],
    ["profile", (dashboard) => { dashboard.datasetProfiles.unused.rowCount = 2; }],
  ];
  for (const [label, change] of changes) {
    const current = dashboardFixture();
    const ready = prepareContentDeletion({ dashboard: current, graph: buildContentDependencyGraph({ dashboard: current }), item: { kind: "csv", id: "unused" } });
    assert.equal(Object.hasOwn(ready, "expectedRevision"), false);
    change(current);
    await assert.rejects(
      () => commitContentDeletion(ready, { getDashboard: () => current, commitDashboard: async () => {} }),
      /stale/i,
      label,
    );
  }
});

test("unrelated dashboard drift is allowed while cancel and injected failure preserve prior state", async () => {
  let current = dashboardFixture();
  const ready = prepareContentDeletion({ dashboard: current, graph: buildContentDependencyGraph({ dashboard: current }), item: { kind: "csv", id: "unused" } });
  current.title = "Unrelated title change";
  const unrelatedResult = await commitContentDeletion(ready, {
    getDashboard: () => current,
    commitDashboard: async (candidate) => { current = structuredClone(candidate); },
  });
  assert.equal(unrelatedResult.dashboard.title, "Unrelated title change");
  assert.equal(current.contentLibrary.sourceEntries.unused, undefined);

  current = dashboardFixture();
  const failedPlan = prepareContentDeletion({ dashboard: current, graph: buildContentDependencyGraph({ dashboard: current }), item: { kind: "csv", id: "unused" } });
  const before = JSON.stringify(current);
  let physical = "csv-bytes";
  await assert.rejects(() => commitContentDeletion(failedPlan, {
    getDashboard: () => current,
    commitDashboard: async (candidate, context) => {
      current = structuredClone(candidate);
      if (!context?.rollback) throw new Error("commit failed after write");
    },
    snapshotAuthority: async () => physical,
    deleteAuthority: async () => { physical = ""; },
    restoreAuthority: async (snapshot) => { physical = snapshot; },
  }), /commit failed/);
  assert.equal(JSON.stringify(current), before);
  assert.equal(physical, "csv-bytes");
  assert.equal(JSON.stringify(failedPlan), JSON.stringify(failedPlan), "cancel is represented by not committing the immutable plan");
});

test("authored asset adapters delete unique bytes and retain shared physical dedupe", async () => {
  for (const shared of [false, true]) {
    let current = dashboardFixture();
    const assetId = shared ? "shared" : "removable-asset";
    if (shared) {
      current.contentLibrary.mediaItems.removable.current.assetId = assetId;
      delete current.assets["removable-asset"];
    }
    const memory = memoryAssetStore([assetId]);
    const plan = prepareContentDeletion({ dashboard: current, graph: buildContentDependencyGraph({ dashboard: current }), item: { kind: "media", id: "removable" } });
    await commitContentDeletion(plan, createContentDeletionAdapters({
      getDashboard: () => current,
      commitDashboard: async (candidate) => { current = structuredClone(candidate); },
      assetStore: memory.store,
    }));
    assert.equal(memory.records.has(assetId), shared, shared ? "shared bytes stay" : "unique bytes delete");
    assert.equal(current.contentLibrary.mediaItems.removable, undefined);
    assert.equal(Boolean(current.assets[assetId]), shared);
  }
});

test("authored asset adapters compensate dashboard and bytes after dashboard or byte deletion failure", async () => {
  for (const failure of ["dashboard", "bytes"]) {
    let current = dashboardFixture();
    const before = JSON.stringify(current);
    const memory = memoryAssetStore(["removable-asset"]);
    const assetStore = failure === "bytes" ? {
      snapshot: (ids) => memory.store.snapshot(ids),
      restore: (snapshot) => memory.store.restore(snapshot),
      async remove(id) { await memory.store.remove(id); throw new Error("byte delete failed"); },
    } : memory.store;
    const plan = prepareContentDeletion({ dashboard: current, graph: buildContentDependencyGraph({ dashboard: current }), item: { kind: "media", id: "removable" } });
    await assert.rejects(() => commitContentDeletion(plan, createContentDeletionAdapters({
      getDashboard: () => current,
      commitDashboard: async (candidate, context) => {
        current = structuredClone(candidate);
        if (failure === "dashboard" && !context?.rollback) throw new Error("dashboard commit failed");
      },
      assetStore,
    })), new RegExp(`${failure === "dashboard" ? "dashboard commit" : "byte delete"} failed`));
    assert.equal(JSON.stringify(current), before, `${failure} failure restores dashboard`);
    assert.equal(memory.records.has("removable-asset"), true, `${failure} failure restores bytes`);
  }
});

function memoryAssetStore(assetIds) {
  const records = new Map(assetIds.map((id) => [id, { id, status: "durable", bytes: new Uint8Array([1, 2, 3]) }]));
  const adapter = {
    get: async (id) => records.has(id) ? structuredClone(records.get(id)) : null,
    put: async (record) => { records.set(record.id, structuredClone(record)); },
    remove: async (id) => { records.delete(id); },
    restore: async (snapshot) => {
      for (const [id, record] of snapshot) {
        if (record === null) records.delete(id);
        else records.set(id, structuredClone(record));
      }
    },
    list: async () => [...records.values()].map(structuredClone),
  };
  return { records, store: createBrowserAuthoredAssetStore({ adapter }) };
}
