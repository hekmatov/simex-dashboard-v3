import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAssetReferenceGraph,
  findAuthoredAssetOrphans,
} from "../src/static-content/assets/assetReferenceGraph.js";
import { reconcileAuthoredAssets } from "../src/static-content/assets/reconcileAuthoredAssets.js";

const DAY = 24 * 60 * 60 * 1_000;

test("the reference graph protects saved assets and exact active coordinator retainers", () => {
  const graph = buildAssetReferenceGraph({
    dashboard: {
      assets: { saved: manifest(), manifestOnly: manifest() },
      contentLibrary: {
        mediaItems: {
          "media-saved": { current: { kind: "asset", assetId: "saved" } },
        },
      },
    },
    activeRetainers: {
      assetIds: ["draft", "replacement", "staging"],
      mediaIds: [], sourceIds: [], records: [],
    },
  });

  assert.deepEqual(graph.referencedAssetIds, [
    "draft",
    "manifestOnly",
    "replacement",
    "saved",
    "staging",
  ]);
  assert.deepEqual(graph.references.saved.map(({ kind }) => kind), [
    "saved-manifest",
    "saved-media",
  ]);
  assert.deepEqual(graph.references.replacement.map(({ kind }) => kind), ["active-retainer"]);
});

test("orphan decisions retain every reference and a staged asset for exactly 24 hours", () => {
  const now = 2 * DAY;
  const graph = buildAssetReferenceGraph({ dashboard: { assets: { saved: manifest() } } });
  const decisions = findAuthoredAssetOrphans([
    record("saved", "durable", 0),
    record("durable-orphan", "durable", 0),
    record("fresh-stage", "staged", now - DAY + 1),
    record("boundary-stage", "staged", now - DAY),
  ], graph, { now });

  assert.deepEqual(decisions.deleteAssetIds, ["boundary-stage", "durable-orphan"]);
  assert.deepEqual(decisions.retainedReferencedAssetIds, ["saved"]);
  assert.deepEqual(decisions.retainedGraceAssetIds, ["fresh-stage"]);
});

test("reconciliation removes only decided orphans and never a referenced asset", async () => {
  const records = new Map([
    ["saved", record("saved", "durable", 0)],
    ["orphan", record("orphan", "durable", 0)],
  ]);
  const removed = [];
  const store = {
    async list() { return [...records.values()].map((value) => structuredClone(value)); },
    async remove(id) { removed.push(id); records.delete(id); },
  };

  const result = await reconcileAuthoredAssets({
    store,
    dashboard: { assets: { saved: manifest() } },
    now: DAY,
  });

  assert.deepEqual(removed, ["orphan"]);
  assert.deepEqual(result.removedAssetIds, ["orphan"]);
  assert.equal(records.has("saved"), true);
});

test("startup reconciliation finalizes a referenced staged recovery journal", async () => {
  const records = new Map([
    ["saved-stage", record("saved-stage", "staged", 0)],
  ]);
  records.get("saved-stage").transactionIds = ["interrupted-import"];
  const committed = [];
  const store = {
    async list() { return [...records.values()].map((value) => structuredClone(value)); },
    async commitMany(assetIds) {
      committed.push(...assetIds);
      for (const assetId of assetIds) {
        records.set(assetId, {
          ...records.get(assetId),
          status: "durable",
          transactionIds: [],
        });
      }
    },
    async remove(id) { records.delete(id); },
  };

  const result = await reconcileAuthoredAssets({
    store,
    dashboard: { assets: { "saved-stage": manifest() } },
    now: 4 * DAY,
  });

  assert.deepEqual(committed, ["saved-stage"]);
  assert.deepEqual(result.recoveredAssetIds, ["saved-stage"]);
  assert.equal(records.get("saved-stage").status, "durable");
});

test("an active-only retainer protects staged bytes without promoting them", async () => {
  const records = new Map([["active-stage", record("active-stage", "staged", 0)]]);
  const committed = [];
  const result = await reconcileAuthoredAssets({
    store: {
      async list() { return [...records.values()]; },
      async commitMany(ids) { committed.push(...ids); },
      async remove(id) { records.delete(id); },
    },
    dashboard: { assets: {} },
    activeRetainers: { assetIds: ["active-stage"], mediaIds: [], sourceIds: [], records: [] },
    now: 4 * DAY,
  });
  assert.deepEqual(committed, []);
  assert.deepEqual(result.recoveredAssetIds, []);
  assert.equal(records.get("active-stage").status, "staged");
  assert.deepEqual(result.decisions.retainedReferencedAssetIds, ["active-stage"]);
});

test("a zero-asset imported dashboard reclaims the previous durable authored record", async () => {
  const records = new Map([["previous", record("previous", "durable", 0)]]);
  const removed = [];
  const result = await reconcileAuthoredAssets({
    store: {
      async list() { return [...records.values()]; },
      async remove(id) { removed.push(id); records.delete(id); },
    },
    dashboard: { configVersion: 4, assets: {}, dataSources: {} },
    now: DAY,
  });

  assert.deepEqual(removed, ["previous"]);
  assert.deepEqual(result.removedAssetIds, ["previous"]);
});

function manifest() {
  return {
    mediaType: "image/png",
    byteLength: 8,
    width: 2,
    height: 3,
    sha256: "a".repeat(64),
    storageState: "durable",
  };
}

function record(id, status, stagedAt) {
  return { id, status, stagedAt, transactionIds: [] };
}
