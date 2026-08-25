import assert from "node:assert/strict";
import test from "node:test";

import { startAudienceStaticAssetReadiness } from "../src/components/presentation/useAudienceStaticAssetReadiness.js";

const source = (mediaId) => ({
  kind: "staticImage",
  sourceVersion: 2,
  mediaId,
  alt: mediaId,
  decorative: false,
  fit: "contain",
  crop: { x: 0, y: 0, width: 1000, height: 1000 },
  rotation: 0,
});

const mediaItem = (mediaId, assetId, revision) => ({
  mediaId,
  revision,
  current: { kind: "asset", assetId },
  displayName: mediaId,
  defaultDescription: mediaId,
  origin: "uploaded",
  health: "ready",
  dimensions: { width: 16, height: 9 },
  byteLength: revision === 3 ? 10 : 20,
  mediaType: "image/png",
});

test("Audience readiness resolves each Image independently and owns destination leases", async () => {
  const assetA = `asset-${"a".repeat(64)}`;
  const assetB = `asset-${"b".repeat(64)}`;
  const released = [];
  const settled = [];
  const dashboard = {
    dataSources: {
      "source-a": source("media-a"),
      "source-b": source("media-b"),
    },
    contentLibrary: { mediaItems: {
      "media-a": mediaItem("media-a", assetA, 3),
      "media-b": mediaItem("media-b", assetB, 5),
    }, sourceEntries: {} },
    assets: {
      [assetA]: { mediaType: "image/png", sha256: "a".repeat(64), byteLength: 10, width: 16, height: 9, storageState: "durable" },
      [assetB]: { mediaType: "image/png", sha256: "b".repeat(64), byteLength: 20, width: 16, height: 9, storageState: "durable" },
    },
    pages: imagePages(),
  };
  const items = [
    { kind: "image", panel_id: "image-a", media_id: "media-a", revision: 3 },
    { kind: "image", panel_id: "image-b", media_id: "media-b", revision: 5 },
  ];
  const dispose = startAudienceStaticAssetReadiness({
    dashboard,
    items,
    resolveAsset: async (assetId) => {
      if (assetId === assetB) throw new Error("forced cell failure");
      return { url: `blob:audience/${assetId}`, release: () => released.push(assetId) };
    },
    onSettled: (item, model) => settled.push({ item, model }),
  });

  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(settled.length, 2);
  assert.equal(settled.find(({ item }) => item.panel_id === "image-a").model.status, "ready");
  assert.equal(settled.find(({ item }) => item.panel_id === "image-b").model.status, "error");
  assert.equal(settled.find(({ item }) => item.panel_id === "image-b").model.failure.code, "asset-read-failed");
  dispose();
  assert.deepEqual(released, [assetA]);
});

test("a stale revision never reaches the asset resolver", () => {
  let reads = 0;
  const settled = [];
  const dispose = startAudienceStaticAssetReadiness({
    dashboard: {
      dataSources: { "source-a": source("media-a") },
      contentLibrary: { mediaItems: {
        "media-a": mediaItem("media-a", "asset-a", 4),
      }, sourceEntries: {} },
      assets: {},
      pages: imagePages().map((page) => ({
        ...page,
        sections: page.sections.map((section) => ({
          ...section,
          panels: section.panels.filter(({ id }) => id === "image-a"),
        })),
      })),
    },
    items: [{ kind: "image", panel_id: "image-a", media_id: "media-a", revision: 3 }],
    resolveAsset: () => { reads += 1; },
    onSettled: (_item, model) => settled.push(model),
  });

  assert.equal(reads, 0);
  assert.equal(settled[0].status, "error");
  dispose();
});

function imagePages() {
  return [{
    id: "page-a",
    sections: [{
      id: "section-a",
      panels: [
        { id: "image-a", typeId: "image", sourceId: "source-a" },
        { id: "image-b", typeId: "image", sourceId: "source-b" },
      ],
    }],
  }];
}
