import assert from "node:assert/strict";
import test from "node:test";

import {
  createMediaItem,
  renameMediaItem,
  replaceMediaItemRevision,
  validateMediaItem,
} from "../src/content-library/mediaItems.js";
import { makeMediaItem } from "./helpers/contentLibraryFixtures.js";

test("media creation keeps logical identity separate from physical asset identity", () => {
  const first = createMediaItem({ ...makeMediaItem(), mediaId: "media-a" });
  const second = createMediaItem({ ...makeMediaItem(), mediaId: "media-b" });
  assert.equal(first.current.assetId, second.current.assetId);
  assert.notEqual(first.mediaId, second.mediaId);
  assert.equal(first.revision, 3);
});

test("media replacement preserves mediaId and advances exactly one revision", () => {
  const previous = makeMediaItem();
  const replaced = replaceMediaItemRevision(previous, {
    kind: "package",
    path: `data/authored/${"b".repeat(64)}.png`,
  });
  assert.equal(replaced.mediaId, previous.mediaId);
  assert.equal(replaced.revision, 4);
  assert.deepEqual(replaced.current, {
    kind: "package",
    path: `data/authored/${"b".repeat(64)}.png`,
  });
  assert.equal(previous.revision, 3);
});

test("media rename changes only display metadata and validation rejects split authority", () => {
  const item = makeMediaItem();
  const renamed = renameMediaItem(item, {
    displayName: "Updated response map",
    defaultDescription: "Default description for new placements",
  });
  assert.equal(renamed.mediaId, item.mediaId);
  assert.equal(renamed.revision, item.revision);
  assert.equal(renamed.displayName, "Updated response map");
  assert.equal(renamed.defaultDescription, "Default description for new placements");
  assert.equal(validateMediaItem(item, { assets: { "asset-map": {} } }), item);
  assert.throws(() => validateMediaItem({ ...item, alt: "placement-owned" }, {
    assets: { "asset-map": {} },
  }), /alt.*unknown/i);
});
