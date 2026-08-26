import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveContentHealth,
  repairContentItem,
} from "../src/content-library/contentHealth.js";

test("health derivation preserves managed identity and names an explicit recovery", () => {
  const media = {
    mediaId: "media-map", revision: 4,
    current: { kind: "asset", assetId: "asset-map" },
    displayName: "Response map", defaultDescription: "Map alternative",
    origin: "uploaded", health: "ready",
  };
  const cases = [
    [{ asset: { id: "asset-map" } }, "ready", null],
    [{ asset: null }, "missing", "replace"],
    [{ asset: { id: "asset-map" }, failure: { code: "invalid-bytes" } }, "corrupt", "replace"],
    [{ asset: { id: "asset-map" }, requiresRelink: true }, "needs-relink", "relink"],
    [{ asset: { id: "asset-map" }, requiresReview: true }, "needs-review", "review"],
  ];

  for (const [input, health, action] of cases) {
    const result = deriveContentHealth({ item: media, ...input });
    assert.equal(result.health, health);
    assert.equal(result.item.mediaId, "media-map");
    assert.equal(result.item.revision, 4);
    assert.deepEqual(result.item.current, { kind: "asset", assetId: "asset-map" });
    assert.equal(result.repair?.action ?? null, action);
  }

  const external = deriveContentHealth({
    item: { ...media, current: { kind: "url", url: "https://example.test/map.png" }, origin: "external", health: "external" },
  });
  assert.equal(external.health, "external");
  assert.equal(external.repair, null);
});

test("repair delegates publication to the supplied validated transaction without mutating siblings", async () => {
  const dashboard = {
    contentLibrary: { mediaItems: { "media-map": { mediaId: "media-map", revision: 2, current: { kind: "asset", assetId: "old" } } } },
    sibling: { id: "unchanged" },
  };
  const calls = [];
  const result = await repairContentItem({
    dashboard,
    itemKind: "media",
    itemId: "media-map",
    prepare: async ({ dashboard: received, itemId, replacement }) => {
      calls.push(["prepare", itemId, replacement.assetId]);
      assert.notEqual(received, dashboard);
      return { itemId };
    },
    commit: async (plan) => {
      calls.push(["commit", plan.itemId]);
      return { dashboard: { ...dashboard, repaired: plan.itemId } };
    },
    replacement: { assetId: "new" },
  });

  assert.deepEqual(calls, [["prepare", "media-map", "new"], ["commit", "media-map"]]);
  assert.equal(result.itemId, "media-map");
  assert.deepEqual(result.identity, dashboard.contentLibrary.mediaItems["media-map"]);
  assert.deepEqual(dashboard.sibling, { id: "unchanged" });
  assert.equal(result.dashboard.repaired, "media-map");
});
