import assert from "node:assert/strict";
import test from "node:test";

import {
  IMAGE_ASSET_LIMITS,
  discardSessionImageAsset,
  inspectImageAnimation,
  resolveSessionImageAsset,
  stageSessionImageAsset,
  validateImageAsset,
  validateImageOrigin,
} from "../src/static-content/image/imageAssetValidation.js";

const PNG = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x03,
  0x08, 0x06, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44,
  0xae, 0x42, 0x60, 0x82,
]);

const JPEG = Uint8Array.from([
  0xff, 0xd8,
  0xff, 0xc0, 0x00, 0x11, 0x08,
  0x00, 0x03, 0x00, 0x02,
  0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x00, 0x03, 0x11, 0x00,
  0xff, 0xd9,
]);

const WEBP = Uint8Array.from([
  0x52, 0x49, 0x46, 0x46, 0x16, 0x00, 0x00, 0x00,
  0x57, 0x45, 0x42, 0x50,
  0x56, 0x50, 0x38, 0x58, 0x0a, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00,
  0x01, 0x00, 0x00,
  0x02, 0x00, 0x00,
]);

test("single-frame PNG, JPEG, and WebP require matching signature, declaration, and decoded metadata", async () => {
  for (const fixture of [
    { bytes: PNG, mediaType: "image/png", width: 2, height: 3 },
    { bytes: JPEG, mediaType: "image/jpeg", width: 2, height: 3 },
    { bytes: WEBP, mediaType: "image/webp", width: 2, height: 3 },
  ]) {
    const result = await validateImageAsset({
      ...fixture,
      declaredMediaType: fixture.mediaType,
      decoded: { mediaType: fixture.mediaType, width: fixture.width, height: fixture.height, frameCount: 1 },
    });
    assert.equal(result.ok, true, JSON.stringify(result.errors));
    assert.deepEqual(result.asset, {
      mediaType: fixture.mediaType,
      byteLength: fixture.bytes.byteLength,
      width: fixture.width,
      height: fixture.height,
      frameCount: 1,
    });
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
  discardSessionImageAsset(staged.assetId);
  assert.equal(resolveSessionImageAsset(staged.assetId), null);
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
