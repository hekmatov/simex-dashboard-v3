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

test("media validation enforces current origin and external-health coherence", () => {
  assert.throws(() => validateMediaItem(makeMediaItem({
    current: { kind: "url", url: "https://example.test/map.png" },
    origin: "uploaded",
    health: "external",
  })), /URL.*origin|origin.*URL/i);
  assert.throws(() => validateMediaItem(makeMediaItem({
    current: { kind: "url", url: "https://example.test/map.png" },
    origin: "external",
    health: "ready",
  })), /URL.*external health|external health.*URL/i);
  assert.throws(() => validateMediaItem(makeMediaItem({
    health: "external",
  }), { assets: { "asset-map": {
    mediaType: "image/png", byteLength: 20, width: 4, height: 5,
  } } }), /external health.*URL|URL.*external health/i);
});

test("media validation rejects supplied asset metadata that differs from its manifest", () => {
  const assets = {
    "asset-map": { mediaType: "image/png", byteLength: 20, width: 4, height: 5 },
  };
  assert.throws(() => validateMediaItem(makeMediaItem({
    dimensions: { width: 8, height: 5 },
  }), { assets }), /dimensions.*manifest|manifest.*dimensions/i);
  assert.throws(() => validateMediaItem(makeMediaItem({
    byteLength: 21,
  }), { assets }), /byte length.*manifest|manifest.*byte length/i);
  assert.throws(() => validateMediaItem(makeMediaItem({
    mediaType: "image/jpeg",
  }), { assets }), /media type.*manifest|manifest.*media type/i);
});
