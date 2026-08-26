import assert from "node:assert/strict";
import test from "node:test";

import { buildContentDependencyGraph } from "../src/content-library/contentDependencyGraph.js";
import { prepareContentDeletion, commitContentDeletion } from "../src/content-library/contentDeletionTransaction.js";
import { makeMediaItem, makeSourceEntry } from "./helpers/contentLibraryFixtures.js";

function dashboardFixture() {
  return {
    configVersion: 5,
    contentLibrary: {
      mediaItems: {
        kept: makeMediaItem({ mediaId: "kept", current: { kind: "asset", assetId: "shared" } }),
        removable: makeMediaItem({ mediaId: "removable", revision: 8, current: { kind: "asset", assetId: "removable-asset" } }),
      },
      sourceEntries: { unused: makeSourceEntry("csv", { sourceId: "unused", revision: 5 }) },
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

test("stale revision, cancel, and injected failure leave byte-for-byte prior state", async () => {
  let current = dashboardFixture();
  const ready = prepareContentDeletion({ dashboard: current, graph: buildContentDependencyGraph({ dashboard: current }), item: { kind: "csv", id: "unused" } });
  const before = JSON.stringify(current);
  current.contentLibrary.sourceEntries.unused.revision = 6;
  assert.rejects(() => commitContentDeletion(ready, { getDashboard: () => current, commitDashboard: async () => {} }), /stale/i);

  current = JSON.parse(before);
  let physical = "csv-bytes";
  await assert.rejects(() => commitContentDeletion(ready, {
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
  assert.equal(JSON.stringify(ready), JSON.stringify(ready), "cancel is represented by not committing the immutable plan");
});
