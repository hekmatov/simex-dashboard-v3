import assert from "node:assert/strict";
import test from "node:test";

import { createContentDraftCoordinator } from "../src/content-library/contentDraftTransaction.js";
import {
  commitMediaReplacement,
  prepareMediaReplacement,
} from "../src/content-library/contentReplacementTransaction.js";
import {
  discardSessionImageAsset,
  readSessionImageAssetBytes,
} from "../src/static-content/image/imageAssetValidation.js";
import { imageFixtureBytes } from "./fixtures/imageFixtureBytes.js";
import { makeDashboardV5 } from "./helpers/contentLibraryFixtures.js";

const NEXT_BYTES = imageFixtureBytes("image/png");
const NEXT_DECODED = Object.freeze({ mediaType: "image/png", width: 2, height: 3, frameCount: 1 });

test("prepare validates raster input and builds an immutable same-identity revision without mutating placements", async () => {
  const dashboard = replacementDashboard();
  const before = structuredClone(dashboard);

  const plan = await preparePlan(dashboard);

  assert.equal(plan.mediaId, "media-image-source");
  assert.equal(plan.expectedRevision, 3);
  assert.equal(plan.nextMediaItem.mediaId, "media-image-source");
  assert.equal(plan.nextMediaItem.revision, 4);
  assert.notEqual(plan.nextMediaItem.current.assetId, "asset-map");
  assert.equal(plan.nextMediaItem.current.assetId, plan.newAssetId);
  assert.deepEqual(dashboard, before);
  assert.deepEqual(plan.placementSnapshot, {
    dataSources: before.dataSources,
    viewerState: placementSnapshot(before).viewer,
  });
  assert.throws(() => { plan.nextMediaItem.revision = 99; }, /read only|extensible|object is not extensible/i);
  discardSessionImageAsset(plan.newAssetId);

  await assert.rejects(prepareMediaReplacement({
    dashboard,
    mediaId: "media-image-source",
    candidate: {
      bytes: new Uint8Array([1, 2, 3]),
      declaredMediaType: "image/png",
      decoded: NEXT_DECODED,
    },
  }), /corrupt|signature|image/i);
  assert.deepEqual(dashboard, before);
});

test("commit publishes one dashboard candidate, updates every logical use, and retains exact contextual state", async () => {
  const harness = replacementHarness();
  const before = structuredClone(harness.dashboard);
  const beforePlacements = placementSnapshot(before);
  const plan = await preparePlan(harness.dashboard);
  const snapshots = [];
  const unsubscribe = harness.coordinator.subscribe((snapshot) => snapshots.push(snapshot));

  const result = await commitMediaReplacement(plan, {
    contentDraftCoordinator: harness.coordinator,
    retireAsset: (assetId) => harness.assetStore.remove(assetId),
  });
  unsubscribe();

  const current = harness.dashboard.contentLibrary.mediaItems[plan.mediaId];
  assert.equal(result.status, "committed");
  assert.equal(current.mediaId, plan.mediaId);
  assert.equal(current.revision, 4);
  assert.equal(current.current.assetId, plan.newAssetId);
  assert.equal(harness.dashboard.assets[plan.newAssetId].storageState, "durable");
  assert.equal(Object.hasOwn(harness.dashboard.assets, "asset-map"), false);
  assert.deepEqual(placementSnapshot(harness.dashboard), beforePlacements);
  assert.equal(harness.commits.filter(({ options }) => !options.rollback).length, 1);
  assert.equal(harness.assetRecords.get(plan.newAssetId)?.status, "durable");
  assert.equal(harness.assetRecords.has("asset-map"), false);
  assert.equal(snapshots.some((snapshot) => (
    snapshot.assetIds.includes("asset-map")
    && snapshot.assetIds.includes(plan.newAssetId)
    && snapshot.mediaIds.includes(plan.mediaId)
  )), true);
  assert.deepEqual(harness.coordinator.getActiveRetainers().records, []);
  assert.equal(readSessionImageAssetBytes(plan.newAssetId), null);
});

test("replacement retains a physical old asset shared by another logical media item", async () => {
  const harness = replacementHarness({ sharedOldAsset: true });
  const plan = await preparePlan(harness.dashboard);

  const result = await commitMediaReplacement(plan, {
    contentDraftCoordinator: harness.coordinator,
    retireAsset: (assetId) => harness.assetStore.remove(assetId),
  });

  assert.equal(Object.hasOwn(result.dashboard.assets, "asset-map"), true);
  assert.equal(harness.assetRecords.has("asset-map"), true);
  assert.equal(result.retirement, null);
  assert.equal(harness.dashboard.contentLibrary.mediaItems["media-shared"].current.assetId, "asset-map");
});

test("expected-current drift rejects before durable writes and leaves the newer authority exact", async () => {
  const harness = replacementHarness();
  const plan = await preparePlan(harness.dashboard);
  harness.dashboard.contentLibrary.mediaItems[plan.mediaId].revision = 4;
  const before = structuredClone(harness.dashboard);

  await assert.rejects(commitMediaReplacement(plan, {
    contentDraftCoordinator: harness.coordinator,
    retireAsset: (assetId) => harness.assetStore.remove(assetId),
  }), /stale|authority changed/i);

  assert.deepEqual(harness.dashboard, before);
  assert.deepEqual(harness.commits, []);
  assert.deepEqual(harness.assetRecords, new Map([["asset-map", oldAssetRecord()]]));
  assert.deepEqual(harness.coordinator.getActiveRetainers().records, []);
  assert.equal(readSessionImageAssetBytes(plan.newAssetId), null);
});

test("commit rebases replacement fields onto concurrent live metadata edits", async () => {
  const harness = replacementHarness();
  const plan = await preparePlan(harness.dashboard);
  harness.dashboard.contentLibrary.mediaItems[plan.mediaId].displayName = "Renamed while replacement was open";
  harness.dashboard.contentLibrary.mediaItems[plan.mediaId].defaultDescription = "New concurrent default";

  await commitMediaReplacement(plan, {
    contentDraftCoordinator: harness.coordinator,
    retireAsset: (assetId) => harness.assetStore.remove(assetId),
  });

  const committed = harness.dashboard.contentLibrary.mediaItems[plan.mediaId];
  assert.equal(committed.displayName, "Renamed while replacement was open");
  assert.equal(committed.defaultDescription, "New concurrent default");
  assert.equal(committed.revision, 4);
  assert.equal(committed.current.assetId, plan.newAssetId);
});

test("same-revision current manifest hash drift rejects before durable writes", async () => {
  const harness = replacementHarness();
  const plan = await preparePlan(harness.dashboard);
  harness.dashboard.assets["asset-map"].sha256 = "b".repeat(64);
  const before = structuredClone(harness.dashboard);

  await assert.rejects(commitMediaReplacement(plan, {
    contentDraftCoordinator: harness.coordinator,
    retireAsset: (assetId) => harness.assetStore.remove(assetId),
  }), /stale|authority changed/i);

  assert.deepEqual(harness.dashboard, before);
  assert.deepEqual(harness.commits, []);
  assert.deepEqual(harness.coordinator.getActiveRetainers().records, []);
  assert.equal(readSessionImageAssetBytes(plan.newAssetId), null);
});

for (const failure of ["write", "dashboard", "publish"]) {
  test(`${failure} failure compensates dashboard, bytes, session state, and replacement retainers`, async () => {
    const harness = replacementHarness({ failure });
    const before = structuredClone(harness.dashboard);
    const bytesBefore = structuredClone(harness.assetRecords);
    const plan = await preparePlan(harness.dashboard);

    await assert.rejects(commitMediaReplacement(plan, {
      contentDraftCoordinator: harness.coordinator,
      retireAsset: (assetId) => harness.assetStore.remove(assetId),
    }), new RegExp(`${failure} failed`));

    assert.deepEqual(harness.dashboard, before);
    assert.deepEqual(harness.assetRecords, bytesBefore);
    assert.deepEqual(harness.coordinator.getActiveRetainers().records, []);
    assert.equal(readSessionImageAssetBytes(plan.newAssetId), null);
  });
}

async function preparePlan(dashboard) {
  return prepareMediaReplacement({
    dashboard,
    mediaId: "media-image-source",
    viewerState: placementSnapshot(dashboard).viewer,
    candidate: {
      bytes: NEXT_BYTES,
      declaredMediaType: "image/png",
      decoded: NEXT_DECODED,
    },
  });
}

function replacementDashboard({ sharedOldAsset = false } = {}) {
  const dashboard = makeDashboardV5();
  dashboard.dataSources["image-source"] = {
    ...dashboard.dataSources["image-source"],
    alt: "Image placement alt",
    decorative: false,
    fit: "cover",
    crop: { x: 125, y: 250, width: 650, height: 500 },
    rotation: 90,
  };
  dashboard.dataSources["qmd-source"] = {
    kind: "staticText",
    sourceVersion: 1,
    revision: 7,
    renderingPolicy: "portable-qmd-v1",
    qmd: "![QMD placement alt](simex-media:media-image-source){width=45% align=end flow=wrap-start frame=card caption=\"QMD caption\"}",
  };
  if (sharedOldAsset) {
    dashboard.contentLibrary.mediaItems["media-shared"] = {
      ...structuredClone(dashboard.contentLibrary.mediaItems["media-image-source"]),
      mediaId: "media-shared",
      displayName: "Shared physical asset",
    };
  }
  return dashboard;
}

function placementSnapshot(dashboard) {
  return {
    image: structuredClone(dashboard.dataSources["image-source"]),
    qmd: structuredClone(dashboard.dataSources["qmd-source"]),
    viewer: {
      build: { scale: 1.75, pan: { x: 12, y: -8 } },
      view: { scale: 2.25, pan: { x: -20, y: 16 } },
      fullscreen: { scale: 1.5, pan: { x: 6, y: 10 } },
    },
  };
}

function replacementHarness({ failure = null, sharedOldAsset = false } = {}) {
  let dashboard = replacementDashboard({ sharedOldAsset });
  let dashboardFailureInjected = false;
  const commits = [];
  const assetRecords = new Map([["asset-map", oldAssetRecord()]]);
  const assetStore = {
    async snapshot(ids) {
      return new Map(ids.map((id) => [id, assetRecords.has(id) ? structuredClone(assetRecords.get(id)) : null]));
    },
    async restore(snapshot) {
      for (const [id, record] of snapshot) record === null ? assetRecords.delete(id) : assetRecords.set(id, structuredClone(record));
    },
    async stage(input) {
      const id = input.expectedAssetId;
      assetRecords.set(id, { id, status: "staged", transactionIds: [input.transactionId] });
      if (failure === "write") throw new Error("write failed");
      return { assetId: id };
    },
    async commitMany(ids) {
      for (const id of ids) assetRecords.set(id, { ...assetRecords.get(id), status: "durable", transactionIds: [] });
      if (failure === "publish") throw new Error("publish failed");
    },
    async rollback(id, { transactionId } = {}) {
      const record = assetRecords.get(id);
      if (!record) return false;
      if (record.status !== "durable") assetRecords.delete(id);
      else record.transactionIds = (record.transactionIds ?? []).filter((value) => value !== transactionId);
      return true;
    },
    async remove(id) { assetRecords.delete(id); },
  };
  const coordinator = createContentDraftCoordinator({
    getDashboard: () => dashboard,
    async commitDashboard(candidate, options) {
      commits.push({ candidate: structuredClone(candidate), options: structuredClone(options) });
      dashboard = structuredClone(candidate);
      if (failure === "dashboard" && !options?.rollback && !dashboardFailureInjected) {
        dashboardFailureInjected = true;
        throw new Error("dashboard failed");
      }
      return dashboard;
    },
    assetStore,
    readSessionAsset: readSessionImageAssetBytes,
    discardSessionAsset: discardSessionImageAsset,
  });
  return {
    coordinator, commits, assetRecords, assetStore,
    get dashboard() { return dashboard; },
  };
}

function oldAssetRecord() {
  return { id: "asset-map", status: "durable", transactionIds: [], bytes: new Uint8Array([9]) };
}
