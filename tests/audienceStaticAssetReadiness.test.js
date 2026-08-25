import assert from "node:assert/strict";
import test from "node:test";

import { startAudienceStaticAssetReadiness } from "../src/components/presentation/useAudienceStaticAssetReadiness.js";

const source = (assetId, revision) => ({
  kind: "staticImage",
  sourceVersion: 1,
  revision,
  origin: { kind: "asset", assetId },
  alt: assetId,
  decorative: false,
  fit: "contain",
  crop: { x: 0, y: 0, width: 1000, height: 1000 },
  rotation: 0,
});

test("Audience readiness resolves each Image independently and owns destination leases", async () => {
  const released = [];
  const settled = [];
  const dashboard = {
    dataSources: {
      "source-a": source("asset-a", 3),
      "source-b": source("asset-b", 5),
    },
    assets: {
      "asset-a": { mediaType: "image/png", sha256: "a".repeat(64), byteLength: 10, width: 16, height: 9, storageState: "durable" },
      "asset-b": { mediaType: "image/png", sha256: "b".repeat(64), byteLength: 20, width: 16, height: 9, storageState: "durable" },
    },
  };
  const items = [
    { kind: "image", panel_id: "image-a", source_id: "source-a", revision: 3 },
    { kind: "image", panel_id: "image-b", source_id: "source-b", revision: 5 },
  ];
  const dispose = startAudienceStaticAssetReadiness({
    dashboard,
    items,
    resolveAsset: async (assetId) => {
      if (assetId === "asset-b") throw new Error("forced cell failure");
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
  assert.deepEqual(released, ["asset-a"]);
});

test("a stale revision never reaches the asset resolver", () => {
  let reads = 0;
  const settled = [];
  const dispose = startAudienceStaticAssetReadiness({
    dashboard: {
      dataSources: { "source-a": source("asset-a", 4) },
      assets: {},
    },
    items: [{ kind: "image", panel_id: "image-a", source_id: "source-a", revision: 3 }],
    resolveAsset: () => { reads += 1; },
    onSettled: (_item, model) => settled.push(model),
  });

  assert.equal(reads, 0);
  assert.equal(settled[0].status, "error");
  dispose();
});
