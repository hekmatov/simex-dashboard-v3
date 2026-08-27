import assert from "node:assert/strict";
import test from "node:test";

import { commitStaticPanelTransaction, prepareStaticPanelTransaction, removeDashboardPanel } from "../src/static-content/staticPanelTransaction.js";
import { makeDashboardV6, makeMediaItem } from "./helpers/contentLibraryFixtures.js";

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
  const dashboard = makeDashboardV6();
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

test("Free-text transaction increments revision only when saved content changes", () => {
  const panel = {
    ...makeDashboardV6().pages[0].sections[0].panels[0].chart,
    id: "text-panel",
    typeId: "freeText",
    title: "Brief",
    sourceId: "text-source",
  };
  const created = prepareStaticPanelTransaction({
    dashboard: emptyDashboard(),
    operation: "create",
    destination: { pageId: "overview", sectionId: "response" },
    panel,
    placement: { kind: "staticText", qmd: "Initial brief" },
  });
  assert.equal(created.candidateDashboard.dataSources["text-source"].revision, 1);

  const updated = prepareStaticPanelTransaction({
    dashboard: created.candidateDashboard,
    operation: "update",
    panelId: "text-panel",
    panel,
    placement: { kind: "staticText", qmd: "Updated brief" },
  });
  assert.equal(updated.candidateDashboard.dataSources["text-source"].revision, 2);

  const unchanged = prepareStaticPanelTransaction({
    dashboard: updated.candidateDashboard,
    operation: "update",
    panelId: "text-panel",
    panel,
    placement: { kind: "staticText", qmd: "Updated brief" },
  });
  assert.equal(unchanged.candidateDashboard.dataSources["text-source"].revision, 2);
});

test("validation failure leaves the previous V6 dashboard and staged input exact", () => {
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
  const dashboard = makeDashboardV6();
  removeDashboardPanel(dashboard, "image-panel");
  assert.equal(Object.hasOwn(dashboard.dataSources, "image-source"), false);
  assert.equal(Object.hasOwn(dashboard.contentLibrary.mediaItems, "media-image-source"), true);
  assert.equal(Object.hasOwn(dashboard.assets, "asset-map"), true);
});

test("prepared transaction snapshots reject post-validation mutation", () => {
  const prepared = prepareStaticPanelTransaction({ dashboard: emptyDashboard(), operation: "create", ...imagePayload() });
  assert.throws(() => { prepared.candidateDashboard.dataSources["image-source"].alt = "mutated"; }, /read only|extensible|object is not extensible/i);
});

test("a selected staged Image asset must be declared without mutating transaction inputs", () => {
  const dashboard = emptyDashboard();
  const payload = imagePayload();
  payload.stagedAssetIds = [];
  const dashboardBefore = structuredClone(dashboard);
  const payloadBefore = structuredClone(payload);

  assert.throws(() => prepareStaticPanelTransaction({
    dashboard, operation: "create", ...payload,
  }), /selected staged Image asset.*stagedAssetIds/i);
  assert.deepEqual(dashboard, dashboardBefore);
  assert.deepEqual(payload, payloadBefore);
});

test("a staged Image declaration rejects every non-exact asset set without mutating inputs", () => {
  const cases = [
    {
      label: "unrelated staged asset",
      prepare(payload) {
        payload.assets["asset-other"] = {
          mediaType: "image/png", byteLength: 10, width: 2, height: 2,
          sha256: "c".repeat(64), storageState: "staged",
        };
        payload.stagedAssetIds = ["asset-map", "asset-other"];
      },
    },
    {
      label: "unknown asset",
      prepare(payload) { payload.stagedAssetIds = ["asset-map", "asset-unknown"]; },
    },
    {
      label: "non-staged asset",
      prepare(payload) {
        payload.assets["asset-durable"] = {
          mediaType: "image/png", byteLength: 10, width: 2, height: 2,
          sha256: "d".repeat(64), storageState: "durable",
        };
        payload.stagedAssetIds = ["asset-map", "asset-durable"];
      },
    },
    {
      label: "duplicate asset",
      prepare(payload) { payload.stagedAssetIds = ["asset-map", "asset-map"]; },
    },
    {
      label: "malformed asset id",
      prepare(payload) { payload.stagedAssetIds = ["asset-map", " "]; },
    },
  ];

  for (const { label, prepare } of cases) {
    const dashboard = emptyDashboard();
    const payload = imagePayload();
    prepare(payload);
    const dashboardBefore = structuredClone(dashboard);
    const payloadBefore = structuredClone(payload);

    assert.throws(() => prepareStaticPanelTransaction({
      dashboard, operation: "create", ...payload,
    }), /stagedAssetIds|staged candidate|selected staged Image asset/i, label);
    assert.deepEqual(dashboard, dashboardBefore, label);
    assert.deepEqual(payload, payloadBefore, label);
  }
});

test("same-MediaItem replacement prunes the previous asset before exact budget validation", () => {
  const dashboard = makeDashboardV6();
  dashboard.assets["asset-map"].byteLength = 10 * 1024 * 1024;
  dashboard.contentLibrary.mediaItems["media-image-source"].byteLength = 10 * 1024 * 1024;
  const nextBytes = 200 * 1024 * 1024;
  const prepared = prepareStaticPanelTransaction({
    dashboard,
    operation: "update",
    panelId: "image-panel",
    destination: { pageId: "overview", sectionId: "response" },
    panel: dashboard.pages[0].sections[0].panels[0].chart,
    placement: dashboard.dataSources["image-source"],
    mediaItem: makeMediaItem({
      revision: 4,
      current: { kind: "asset", assetId: "asset-next" },
      dimensions: { width: 10, height: 10 },
      byteLength: nextBytes,
    }),
    assets: {
      "asset-next": {
        mediaType: "image/png", byteLength: nextBytes, width: 10, height: 10,
        sha256: "b".repeat(64), storageState: "staged",
      },
    },
    stagedAssetIds: ["asset-next"],
  });

  assert.equal(Object.hasOwn(prepared.candidateDashboard.assets, "asset-map"), false);
  assert.equal(prepared.candidateDashboard.assets["asset-next"].byteLength, nextBytes);
});

test("same-MediaItem asset-to-URL replacement prunes its unreferenced previous asset", () => {
  const dashboard = makeDashboardV6();

  const prepared = prepareStaticPanelTransaction({
    dashboard,
    operation: "update",
    ...urlReplacementPayload(dashboard),
  });

  assert.equal(Object.hasOwn(prepared.candidateDashboard.assets, "asset-map"), false);
  assert.deepEqual(prepared.candidateDashboard.contentLibrary.mediaItems["media-image-source"].current, {
    kind: "url",
    url: "https://example.test/response-map.png",
  });
});

test("same-MediaItem replacement preserves a previous asset shared by another logical media item", () => {
  const dashboard = makeDashboardV6();
  dashboard.contentLibrary.mediaItems["media-shared"] = makeMediaItem({ mediaId: "media-shared" });
  const payload = urlReplacementPayload(dashboard);

  const prepared = prepareStaticPanelTransaction({ dashboard, operation: "update", ...payload });

  assert.equal(Object.hasOwn(prepared.candidateDashboard.assets, "asset-map"), true);
  assert.equal(prepared.candidateDashboard.contentLibrary.mediaItems["media-shared"].current.assetId, "asset-map");
});

test("same-MediaItem replacement still rejects a genuinely over-budget next asset", () => {
  const dashboard = makeDashboardV6();
  const payload = replacementPayload(dashboard, {
    assetId: "asset-over-budget",
    byteLength: (200 * 1024 * 1024) + 1,
  });

  assert.throws(() => prepareStaticPanelTransaction({
    dashboard, operation: "update", ...payload,
  }), /200 MiB authored-asset budget/i);
});

function emptyDashboard() {
  const dashboard = makeDashboardV6();
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
    panel: { ...makeDashboardV6().pages[0].sections[0].panels[0].chart, sourceId: "image-source" },
    placement: { ...makeDashboardV6().dataSources["image-source"], mediaId: "media-map" },
    mediaItem: makeMediaItem({ mediaId: "media-map", revision: 1, current: { kind: "asset", assetId: "asset-map" }, dimensions: { width: 4, height: 5 }, byteLength: 20 }),
    assets: { "asset-map": asset },
    stagedAssetIds: ["asset-map"],
  };
}

function replacementPayload(dashboard, { assetId, byteLength }) {
  return {
    panelId: "image-panel",
    destination: { pageId: "overview", sectionId: "response" },
    panel: dashboard.pages[0].sections[0].panels[0].chart,
    placement: dashboard.dataSources["image-source"],
    mediaItem: makeMediaItem({
      revision: 4,
      current: { kind: "asset", assetId },
      dimensions: { width: 8, height: 8 },
      byteLength,
    }),
    assets: {
      [assetId]: {
        mediaType: "image/png", byteLength, width: 8, height: 8,
        sha256: "b".repeat(64), storageState: "staged",
      },
    },
    stagedAssetIds: [assetId],
  };
}

function urlReplacementPayload(dashboard) {
  return {
    panelId: "image-panel",
    destination: { pageId: "overview", sectionId: "response" },
    panel: dashboard.pages[0].sections[0].panels[0].chart,
    placement: dashboard.dataSources["image-source"],
    mediaItem: makeMediaItem({
      revision: 4,
      current: { kind: "url", url: "https://example.test/response-map.png" },
      origin: "external",
      health: "external",
    }),
    assets: {},
    stagedAssetIds: [],
  };
}
