import assert from "node:assert/strict";
import test from "node:test";

import { commitStaticPanelTransaction, prepareStaticPanelTransaction, removeDashboardPanel } from "../src/static-content/staticPanelTransaction.js";
import { makeDashboardV5, makeMediaItem } from "./helpers/contentLibraryFixtures.js";

test("prepared Image transaction owns one complete panel, placement, library, assets candidate", () => {
  const dashboard = emptyDashboard();
  const payload = imagePayload();
  const prepared = prepareStaticPanelTransaction({ dashboard, operation: "create", ...payload });
  assert.equal(prepared.kind, "static-panel-transaction");
  assert.equal(prepared.mediaId, "media-map");
  assert.equal(prepared.expectedMediaRevision, 1);
  assert.deepEqual(prepared.stagedAssetIds, ["asset-map"]);
  assert.equal(prepared.candidateDashboard.pages[0].sections[0].panels.length, 1);
  assert.equal(prepared.candidateDashboard.dataSources["image-source"].mediaId, "media-map");
  assert.equal(prepared.candidateDashboard.contentLibrary.mediaItems["media-map"].revision, 1);
  assert.equal(prepared.candidateDashboard.assets["asset-map"].storageState, "staged");
  assert.deepEqual(dashboard, emptyDashboard());
});

test("existing edit preserves media identity and expected current revision", () => {
  const dashboard = makeDashboardV5();
  const placement = { ...dashboard.dataSources["image-source"], fit: "cover", rotation: 90 };
  const mediaItem = dashboard.contentLibrary.mediaItems["media-image-source"];
  const prepared = prepareStaticPanelTransaction({
    dashboard, operation: "update", panelId: "image-panel",
    destination: { pageId: "overview", sectionId: "response" },
    panel: dashboard.pages[0].sections[0].panels[0].chart,
    placement, mediaItem, assets: dashboard.assets, stagedAssetIds: [],
  });
  assert.equal(prepared.mediaId, "media-image-source");
  assert.equal(prepared.expectedMediaRevision, 3);
  assert.equal(prepared.candidateDashboard.dataSources["image-source"].fit, "cover");
  assert.equal(prepared.candidateDashboard.dataSources["image-source"].rotation, 90);
  assert.equal(prepared.candidateDashboard.contentLibrary.mediaItems["media-image-source"].revision, 3);
});

test("validation failure leaves the previous V5 dashboard and staged input exact", () => {
  const dashboard = emptyDashboard();
  const prior = structuredClone(dashboard);
  const payload = imagePayload();
  const staged = structuredClone(payload.assets);
  assert.throws(() => prepareStaticPanelTransaction({
    dashboard, operation: "create", ...payload,
    placement: { ...payload.placement, alt: "" },
  }), /alternative text/i);
  assert.deepEqual(dashboard, prior);
  assert.deepEqual(payload.assets, staged);
});

test("persistence failure returns the previous dashboard through rollback", async () => {
  const dashboard = emptyDashboard();
  const prepared = prepareStaticPanelTransaction({ dashboard, operation: "create", ...imagePayload() });
  let rolledBack;
  await assert.rejects(() => commitStaticPanelTransaction(prepared, {
    commit: async () => { throw new Error("persist failed"); },
    rollback: async (value) => { rolledBack = value.previousDashboard; },
  }), /persist failed/);
  assert.deepEqual(rolledBack, dashboard);
  assert.deepEqual(dashboard, emptyDashboard());
});

test("panel deletion removes only placement/source ownership and retains reusable media", () => {
  const dashboard = makeDashboardV5();
  removeDashboardPanel(dashboard, "image-panel");
  assert.equal(Object.hasOwn(dashboard.dataSources, "image-source"), false);
  assert.equal(Object.hasOwn(dashboard.contentLibrary.mediaItems, "media-image-source"), true);
  assert.equal(Object.hasOwn(dashboard.assets, "asset-map"), true);
});

test("prepared transaction snapshots reject post-validation mutation", () => {
  const prepared = prepareStaticPanelTransaction({ dashboard: emptyDashboard(), operation: "create", ...imagePayload() });
  assert.throws(() => { prepared.candidateDashboard.dataSources["image-source"].alt = "mutated"; }, /read only|extensible|object is not extensible/i);
});

function emptyDashboard() {
  const dashboard = makeDashboardV5();
  dashboard.pages[0].sections[0].panels = [];
  dashboard.dataSources = {};
  dashboard.assets = {};
  dashboard.contentLibrary = { mediaItems: {}, sourceEntries: {} };
  return dashboard;
}

function imagePayload() {
  const asset = { mediaType: "image/png", byteLength: 20, width: 4, height: 5, sha256: "a".repeat(64), storageState: "staged" };
  return {
    destination: { pageId: "overview", sectionId: "response" },
    panel: { ...makeDashboardV5().pages[0].sections[0].panels[0].chart, sourceId: "image-source" },
    placement: { ...makeDashboardV5().dataSources["image-source"], mediaId: "media-map" },
    mediaItem: makeMediaItem({ mediaId: "media-map", revision: 1, current: { kind: "asset", assetId: "asset-map" }, dimensions: { width: 4, height: 5 }, byteLength: 20 }),
    assets: { "asset-map": asset },
    stagedAssetIds: ["asset-map"],
  };
}
