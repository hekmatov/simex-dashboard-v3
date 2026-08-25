import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeStaticSource,
  validateAuthoredAssetManifest,
  validateStaticImageSource,
  validateStaticSource,
  validateStaticTextSource,
} from "../src/static-content/staticSourceSchema.js";
import {
  resolveStaticImageSource,
  resolveStaticSource,
  resolveStaticTextSource,
} from "../src/static-content/staticSourceResolver.js";

test("text normalization applies the versioned portable policy and initial revision", () => {
  const source = normalizeStaticSource({ kind: "staticText", qmd: "# Situation" });
  assert.deepEqual(source, {
    kind: "staticText",
    sourceVersion: 1,
    revision: 1,
    renderingPolicy: "portable-qmd-v1",
    qmd: "# Situation",
  });
  assert.equal(validateStaticTextSource(source), source);
  assert.equal(validateStaticSource(source), source);
});

test("image normalization owns durable transform defaults without inventing alt text", () => {
  const source = normalizeStaticSource({
    kind: "staticImage",
    origin: { kind: "asset", assetId: "asset-map" },
    alt: "Response map",
  });
  assert.deepEqual(source, {
    kind: "staticImage",
    sourceVersion: 1,
    revision: 1,
    origin: { kind: "asset", assetId: "asset-map" },
    alt: "Response map",
    decorative: false,
    fit: "contain",
    crop: { x: 0, y: 0, width: 1000, height: 1000 },
    rotation: 0,
  });
});

test("image validation rejects invalid cross-field accessibility, transform, and origin combinations", () => {
  const base = normalizeStaticSource({
    kind: "staticImage",
    origin: { kind: "url", url: "https://example.test/map.png" },
    alt: "Response map",
  });
  const invalid = [
    [{ ...base, alt: "   " }, /alternative text/i],
    [{ ...base, decorative: true, alt: "still announced" }, /decorative.*alt/i],
    [{ ...base, fit: "fill" }, /fit/i],
    [{ ...base, rotation: 45 }, /rotation/i],
    [{ ...base, crop: { x: 900, y: 0, width: 200, height: 1000 } }, /crop/i],
    [{ ...base, origin: { kind: "url", url: "http://example.test/map.png" } }, /https/i],
    [{ ...base, origin: { kind: "package", path: "../outside.png" } }, /package path/i],
    [{ ...base, revision: 0 }, /revision/i],
    [{ ...base, sourceVersion: 2 }, /source version/i],
  ];
  for (const [source, message] of invalid) {
    assert.throws(() => validateStaticImageSource(source), message);
  }
});

test("typed static schemas reject unknown keys at every source, origin, and crop boundary", () => {
  const text = normalizeStaticSource({ kind: "staticText", qmd: "<script>literal and inert</script>" });
  const image = normalizeStaticSource({
    kind: "staticImage",
    origin: { kind: "url", url: "https://example.test/map.png" },
    alt: "Response map",
  });
  assert.equal(validateStaticTextSource(text).qmd, "<script>literal and inert</script>");
  const cases = [
    [() => validateStaticTextSource({ ...text, surprise: true }), /Static text source.*surprise.*unknown/i],
    [() => validateStaticImageSource({ ...image, surprise: true }), /Static image source.*surprise.*unknown/i],
    [() => validateStaticImageSource({ ...image, origin: { ...image.origin, surprise: true } }), /Image URL origin.*surprise.*unknown/i],
    [() => validateStaticImageSource({ ...image, origin: { kind: "asset", assetId: "asset-map", surprise: true } }), /Image asset origin.*surprise.*unknown/i],
    [() => validateStaticImageSource({ ...image, origin: { kind: "package", path: "assets/map.png", surprise: true } }), /Image package origin.*surprise.*unknown/i],
    [() => validateStaticImageSource({ ...image, origin: { kind: "replacementRequired", reason: "replace", surprise: true } }), /Image replacement origin.*surprise.*unknown/i],
    [() => validateStaticImageSource({ ...image, crop: { ...image.crop, surprise: true } }), /Static image crop.*surprise.*unknown/i],
  ];
  for (const [validate, message] of cases) assert.throws(validate, message);

  assert.equal(validateStaticImageSource({
    ...image,
    migrationWarnings: ["missing-alt"],
  }).migrationWarnings[0], "missing-alt");
});

test("asset manifest validation proves source-to-durable-asset integrity", () => {
  const assets = {
    "asset-map": {
      mediaType: "image/png",
      byteLength: 2048,
      width: 800,
      height: 600,
      sha256: "a".repeat(64),
      storageState: "durable",
    },
  };
  assert.equal(validateAuthoredAssetManifest(assets), assets);
  assert.equal(validateStaticImageSource(normalizeStaticSource({
    kind: "staticImage",
    origin: { kind: "asset", assetId: "asset-map" },
    alt: "Response map",
  }), { assets }).origin.assetId, "asset-map");
  assert.throws(
    () => validateStaticImageSource(normalizeStaticSource({
      kind: "staticImage",
      origin: { kind: "asset", assetId: "missing" },
      alt: "Missing",
    }), { assets }),
    /unknown asset/i,
  );
  assert.throws(
    () => validateAuthoredAssetManifest({
      bad: { ...assets["asset-map"], sha256: "not-a-hash" },
    }),
    /SHA-256/i,
  );
});

test("typed resolvers return render models and bounded failure states before row preparation", async () => {
  const text = normalizeStaticSource({ kind: "staticText", qmd: "# Situation" });
  assert.deepEqual(resolveStaticTextSource(text, { sourceId: "text-source" }), {
    status: "ready",
    kind: "staticText",
    sourceId: "text-source",
    revision: 1,
    renderingPolicy: "portable-qmd-v1",
    qmd: "# Situation",
  });
  assert.deepEqual(resolveStaticSource(text, { sourceId: "text-source" }), resolveStaticTextSource(text, { sourceId: "text-source" }));

  const image = normalizeStaticSource({
    kind: "staticImage",
    origin: { kind: "asset", assetId: "asset-map" },
    alt: "Response map",
  });
  const ready = await resolveStaticImageSource(image, {
    sourceId: "image-source",
    assets: { "asset-map": { mediaType: "image/png", byteLength: 20, width: 4, height: 5, sha256: "b".repeat(64), storageState: "durable" } },
    resolveAsset: async () => ({ url: "blob:asset-map", release: () => true }),
  });
  assert.equal(ready.status, "ready");
  assert.equal(ready.url, "blob:asset-map");
  assert.equal(ready.release(), true);
  assert.deepEqual(ready.crop, { x: 0, y: 0, width: 1000, height: 1000 });

  const failure = await resolveStaticImageSource(image, {
    sourceId: "image-source",
    assets: {},
  });
  assert.deepEqual(failure, {
    status: "error",
    kind: "staticImage",
    sourceId: "image-source",
    revision: 1,
    failure: {
      code: "missing-asset",
      message: "The saved image asset is unavailable.",
      retryable: true,
    },
  });
});
