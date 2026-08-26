import assert from "node:assert/strict";
import test from "node:test";

import {
  IMAGE_ASSET_LIMITS,
  authoredAssetManifestBytes,
  discardSessionImageAsset,
  inspectImageAnimation,
  inspectRasterMetadata,
  readSessionImageAssetBytes,
  resolveSessionImageAsset,
  stageSessionImageAsset,
  validateImageAsset,
  validateImageOrigin,
} from "../src/static-content/image/imageAssetValidation.js";
import {
  IMAGE_FIXTURE_DIMENSIONS,
  imageFixtureBytes,
} from "./fixtures/imageFixtureBytes.js";

const PNG_STUB = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x03,
  0x08, 0x06, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44,
  0xae, 0x42, 0x60, 0x82,
]);

const JPEG_STUB = Uint8Array.from([
  0xff, 0xd8,
  0xff, 0xc0, 0x00, 0x11, 0x08,
  0x00, 0x03, 0x00, 0x02,
  0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x00, 0x03, 0x11, 0x00,
  0xff, 0xd9,
]);

const WEBP_STUB = Uint8Array.from([
  0x52, 0x49, 0x46, 0x46, 0x16, 0x00, 0x00, 0x00,
  0x57, 0x45, 0x42, 0x50,
  0x56, 0x50, 0x38, 0x58, 0x0a, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00,
  0x01, 0x00, 0x00,
  0x02, 0x00, 0x00,
]);

const DECODED = (mediaType) => ({
  mediaType,
  ...IMAGE_FIXTURE_DIMENSIONS,
  frameCount: 1,
});
const PNG = imageFixtureBytes("image/png");
const WEBP = imageFixtureBytes("image/webp");

test("authored Image intake counts the complete saved manifest before staging", () => {
  assert.equal(authoredAssetManifestBytes({
    durable: { byteLength: 12 },
    staged: { byteLength: 8 },
    malformed: { byteLength: -4 },
  }), 20);
});

test("genuinely decodable single-frame PNG, JPEG, and WebP require the decoder boundary", async () => {
  const fixtures = [
    { bytes: imageFixtureBytes("image/png"), mediaType: "image/png" },
    { bytes: imageFixtureBytes("image/jpeg"), mediaType: "image/jpeg" },
    { bytes: imageFixtureBytes("image/webp"), mediaType: "image/webp" },
  ];
  for (const fixture of fixtures) {
    assert.deepEqual(inspectRasterMetadata(fixture.bytes), {
      mediaType: fixture.mediaType,
      ...IMAGE_FIXTURE_DIMENSIONS,
    });
    const result = await validateImageAsset({
      ...fixture,
      declaredMediaType: fixture.mediaType,
      decoded: DECODED(fixture.mediaType),
    });
    assert.equal(result.ok, true, JSON.stringify(result.errors));
    assert.deepEqual(result.asset, {
      mediaType: fixture.mediaType,
      byteLength: fixture.bytes.byteLength,
      ...IMAGE_FIXTURE_DIMENSIONS,
      frameCount: 1,
    });
  }
  for (const fixture of fixtures) {
    const withoutDecoder = await validateImageAsset({
      bytes: fixture.bytes,
      declaredMediaType: fixture.mediaType,
    });
    assert.equal(withoutDecoder.ok, false);
    assert.equal(withoutDecoder.errors[0].code, "decoder-required");
  }
});

test("header-only PNG, JPEG, and WebP stubs never pass as decoded raster images", async () => {
  for (const [mediaType, bytes] of [
    ["image/png", PNG_STUB],
    ["image/jpeg", JPEG_STUB],
    ["image/webp", WEBP_STUB],
  ]) {
    const result = await validateImageAsset({
      bytes,
      declaredMediaType: mediaType,
      decoded: DECODED(mediaType),
    });
    assert.equal(result.ok, false, mediaType);
    assert.equal(result.errors[0].code, "corrupt-image", mediaType);
  }
});

test("spoofing, corruption, decoded mismatch, APNG, and animated WebP have stable classifications", async () => {
  const apng = withPngChunk(PNG, "acTL", Uint8Array.from([0, 0, 0, 2, 0, 0, 0, 0]));
  const animatedWebp = WEBP.slice();
  animatedWebp[20] = 0x02;
  for (const [label, input, expectedCode] of [
    ["spoofed declaration", { bytes: PNG, declaredMediaType: "image/jpeg", decoded: { mediaType: "image/png", width: 2, height: 3, frameCount: 1 } }, "media-type-mismatch"],
    ["truncated payload", { bytes: PNG.slice(0, 20), declaredMediaType: "image/png" }, "corrupt-image"],
    ["decoded dimensions", { bytes: PNG, declaredMediaType: "image/png", decoded: { mediaType: "image/png", width: 9, height: 3, frameCount: 1 } }, "decoded-metadata-mismatch"],
    ["APNG", { bytes: apng, declaredMediaType: "image/png", decoded: { mediaType: "image/png", width: 2, height: 3, frameCount: 2 } }, "animated-image"],
    ["animated WebP", { bytes: animatedWebp, declaredMediaType: "image/webp", decoded: { mediaType: "image/webp", width: 2, height: 3, frameCount: 2 } }, "animated-image"],
  ]) {
    const result = await validateImageAsset(input);
    assert.equal(result.ok, false, label);
    assert.equal(result.errors[0].code, expectedCode, label);
  }
  assert.deepEqual(inspectImageAnimation(apng, "image/png"), { animated: true, frameCount: 2, kind: "apng" });
  assert.deepEqual(inspectImageAnimation(animatedWebp, "image/webp"), { animated: true, frameCount: null, kind: "animated-webp" });
});

test("JPEG validation requires EOI to be the terminal encoded bytes", async () => {
  const jpeg = imageFixtureBytes("image/jpeg");
  const appended = new Uint8Array(jpeg.byteLength + 4);
  appended.set(jpeg);
  appended.set([0x50, 0x41, 0x59, 0x4c], jpeg.byteLength);
  const result = await validateImageAsset({
    bytes: appended,
    declaredMediaType: "image/jpeg",
    decoded: DECODED("image/jpeg"),
  });
  assert.equal(result.ok, false);
  assert.equal(result.errors[0].code, "corrupt-image");
  assert.match(result.errors[0].message, /terminal|trailing/i);
});

test("encoded, decoded, product-budget, and browser-quota limits stay distinguishable", async () => {
  const oversized = new Uint8Array(IMAGE_ASSET_LIMITS.maxBytes + 1);
  oversized.set(PNG.subarray(0, Math.min(PNG.length, oversized.length)));
  const overDimension = pngWithDimensions(16_385, 1);
  const overMegapixels = pngWithDimensions(10_000, 5_001);
  const cases = [
    [{ bytes: oversized, declaredMediaType: "image/png" }, "file-size-limit"],
    [{ bytes: overDimension, declaredMediaType: "image/png", decoded: { mediaType: "image/png", width: 16_385, height: 1, frameCount: 1 } }, "dimension-limit"],
    [{ bytes: overMegapixels, declaredMediaType: "image/png", decoded: { mediaType: "image/png", width: 10_000, height: 5_001, frameCount: 1 } }, "megapixel-limit"],
    [{ bytes: PNG, declaredMediaType: "image/png", decoded: { mediaType: "image/png", width: 2, height: 3, frameCount: 1 }, currentAssetBytes: IMAGE_ASSET_LIMITS.dashboardBudgetBytes }, "product-budget"],
    [{ bytes: PNG, declaredMediaType: "image/png", decoded: { mediaType: "image/png", width: 2, height: 3, frameCount: 1 }, browserQuotaAvailableBytes: PNG.length - 1 }, "browser-quota"],
  ];
  for (const [input, expectedCode] of cases) {
    const result = await validateImageAsset(input);
    assert.equal(result.ok, false);
    assert.equal(result.errors[0].code, expectedCode);
  }
  const warning = await validateImageAsset({
    bytes: PNG,
    declaredMediaType: "image/png",
    decoded: { mediaType: "image/png", width: 2, height: 3, frameCount: 1 },
    currentAssetBytes: IMAGE_ASSET_LIMITS.dashboardWarningBytes,
  });
  assert.equal(warning.ok, true);
  assert.equal(warning.warnings[0].code, "product-budget-warning");
});

test("production intake keeps encoded-size preflight but resolves identity before quota accounting", async () => {
  for (const [fileSize, quota, expectedCode, expectedReads, expectedDecodes] of [
    [IMAGE_ASSET_LIMITS.maxBytes + 1, Number.POSITIVE_INFINITY, "file-size-limit", 0, 0],
    [PNG.byteLength, PNG.byteLength - 1, "browser-quota", 1, 1],
  ]) {
    let reads = 0;
    let decodes = 0;
    const result = await stageSessionImageAsset({
      file: {
        size: fileSize,
        type: "image/png",
        async arrayBuffer() {
          reads += 1;
          return PNG.slice().buffer;
        },
      },
      browserQuotaAvailableBytes: quota,
      decode: async () => {
        decodes += 1;
        return DECODED("image/png");
      },
    });
    assert.equal(result.ok, false);
    assert.equal(result.errors[0].code, expectedCode);
    assert.equal(reads, expectedReads, expectedCode);
    assert.equal(decodes, expectedDecodes, expectedCode);
  }
});

test("production intake rejects encoded dimensions before invoking the decoder", async () => {
  let decodes = 0;
  const result = await stageSessionImageAsset({
    bytes: pngWithDimensions(16_385, 1),
    declaredMediaType: "image/png",
    decode: async () => {
      decodes += 1;
      return { mediaType: "image/png", width: 16_385, height: 1, frameCount: 1 };
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.errors[0].code, "dimension-limit");
  assert.equal(decodes, 0);
});

test("production intake includes already staged images in aggregate budget classification", async () => {
  const first = await stageSessionImageAsset({
    bytes: PNG,
    declaredMediaType: "image/png",
    decoded: DECODED("image/png"),
  });
  assert.equal(first.ok, true);
  const second = await stageSessionImageAsset({
    bytes: WEBP,
    declaredMediaType: "image/webp",
    decoded: DECODED("image/webp"),
    currentAssetBytes: IMAGE_ASSET_LIMITS.dashboardBudgetBytes - WEBP.byteLength,
  });
  assert.equal(second.ok, false);
  assert.equal(second.errors[0].code, "product-budget");
  discardSessionImageAsset(first.assetId);
});

test("saved and staged duplicate identities add zero product-budget and quota bytes", async () => {
  const seeded = await stageSessionImageAsset({
    bytes: PNG,
    declaredMediaType: "image/png",
    decoded: DECODED("image/png"),
  });
  assert.equal(seeded.ok, true);

  discardSessionImageAsset(seeded.assetId);
  const savedDuplicate = await stageSessionImageAsset({
    bytes: PNG.slice(),
    declaredMediaType: "image/png",
    decoded: DECODED("image/png"),
    currentAssetBytes: IMAGE_ASSET_LIMITS.dashboardBudgetBytes,
    currentAssetIds: [seeded.assetId],
    browserQuotaAvailableBytes: 0,
  });
  assert.equal(savedDuplicate.ok, true, JSON.stringify(savedDuplicate.errors));
  assert.equal(savedDuplicate.assetId, seeded.assetId);

  const stagedDuplicate = await stageSessionImageAsset({
    bytes: PNG.slice(),
    declaredMediaType: "image/png",
    decoded: DECODED("image/png"),
    currentAssetBytes: IMAGE_ASSET_LIMITS.dashboardBudgetBytes - PNG.byteLength,
    browserQuotaAvailableBytes: 0,
  });
  assert.equal(stagedDuplicate.ok, true, JSON.stringify(stagedDuplicate.errors));
  assert.equal(stagedDuplicate.assetId, seeded.assetId);

  const genuinelyNew = await stageSessionImageAsset({
    bytes: WEBP,
    declaredMediaType: "image/webp",
    decoded: DECODED("image/webp"),
    currentAssetBytes: IMAGE_ASSET_LIMITS.dashboardBudgetBytes - PNG.byteLength,
  });
  assert.equal(genuinelyNew.ok, false);
  assert.equal(genuinelyNew.errors[0].code, "product-budget");
  discardSessionImageAsset(seeded.assetId);
});

test("origins allow HTTPS and dashboard-owned paths while rejecting local and traversal authority", () => {
  assert.deepEqual(validateImageOrigin({ kind: "url", url: "https://example.test/map.png" }), {
    kind: "url",
    url: "https://example.test/map.png",
    networkDependent: true,
  });
  assert.deepEqual(validateImageOrigin({ kind: "package", path: "assets/maps/readiness.webp" }), {
    kind: "package",
    path: "assets/maps/readiness.webp",
    networkDependent: false,
  });
  assert.deepEqual(validateImageOrigin({ kind: "asset", assetId: "asset-map" }), {
    kind: "asset",
    assetId: "asset-map",
    networkDependent: false,
  });
  for (const origin of [
    { kind: "url", url: "http://example.test/map.png" },
    { kind: "url", url: "file:///C:/private/map.png" },
    { kind: "package", path: "../private/map.png" },
    { kind: "package", path: "assets/%2e%2e/private.png" },
    { kind: "package", path: "C:\\private\\map.png" },
  ]) {
    assert.throws(() => validateImageOrigin(origin), /https|safe dashboard-owned relative path/i);
  }
});

test("session staging deduplicates immutable original bytes without creating durable storage", async () => {
  const original = PNG.slice();
  const staged = await stageSessionImageAsset({
    bytes: original,
    declaredMediaType: "image/png",
    decoded: { mediaType: "image/png", width: 2, height: 3, frameCount: 1 },
  });
  const duplicate = await stageSessionImageAsset({
    bytes: original.slice(),
    declaredMediaType: "image/png",
    decoded: { mediaType: "image/png", width: 2, height: 3, frameCount: 1 },
  });
  assert.equal(staged.ok, true);
  assert.equal(duplicate.assetId, staged.assetId);
  assert.deepEqual(original, PNG);
  assert.equal(staged.manifestEntry.storageState, "staged");
  assert.equal(Object.hasOwn(staged.manifestEntry, "bytes"), false);
  assert.equal(Object.hasOwn(staged.manifestEntry, "url"), false);
  const resolved = resolveSessionImageAsset(staged.assetId);
  assert.match(resolved.url, /^(?:blob:|data:image\/png)/);
  assert.equal(resolved.byteLength, PNG.length);
  assert.equal(Object.hasOwn(resolved, "bytes"), false);
  const durableInput = readSessionImageAssetBytes(staged.assetId);
  assert.deepEqual(durableInput.bytes, PNG);
  durableInput.bytes[0] = 0;
  assert.deepEqual(readSessionImageAssetBytes(staged.assetId).bytes, PNG);
  discardSessionImageAsset(staged.assetId);
  assert.equal(resolveSessionImageAsset(staged.assetId), null);
});

test("draft cleanup revokes only unreferenced staged assets and preserves saved siblings", async () => {
  const png = await stageSessionImageAsset({
    bytes: imageFixtureBytes("image/png"),
    declaredMediaType: "image/png",
    decoded: DECODED("image/png"),
  });
  const jpeg = await stageSessionImageAsset({
    bytes: imageFixtureBytes("image/jpeg"),
    declaredMediaType: "image/jpeg",
    decoded: DECODED("image/jpeg"),
  });
  const webp = await stageSessionImageAsset({
    bytes: imageFixtureBytes("image/webp"),
    declaredMediaType: "image/webp",
    decoded: DECODED("image/webp"),
  });
  const lifecycle = await import("../src/static-content/image/imageAssetValidation.js");
  assert.equal(typeof lifecycle.discardUnreferencedSessionImageAssets, "function");
  assert.deepEqual(lifecycle.discardUnreferencedSessionImageAssets(
    [jpeg.assetId, webp.assetId],
    [webp.assetId],
  ), {
    discarded: [jpeg.assetId],
    retained: [webp.assetId],
  });
  assert.ok(resolveSessionImageAsset(png.assetId));
  assert.equal(resolveSessionImageAsset(jpeg.assetId), null);
  assert.ok(resolveSessionImageAsset(webp.assetId));
  discardSessionImageAsset(png.assetId);
  discardSessionImageAsset(webp.assetId);
});

function withPngChunk(bytes, type, data) {
  const chunk = new Uint8Array(12 + data.length);
  new DataView(chunk.buffer).setUint32(0, data.length);
  chunk.set([...type].map((character) => character.charCodeAt(0)), 4);
  chunk.set(data, 8);
  const insertAt = bytes.length - 12;
  const result = new Uint8Array(bytes.length + chunk.length);
  result.set(bytes.subarray(0, insertAt));
  result.set(chunk, insertAt);
  result.set(bytes.subarray(insertAt), insertAt + chunk.length);
  return result;
}

function pngWithDimensions(width, height) {
  const bytes = PNG.slice();
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
}
