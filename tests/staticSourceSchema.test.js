import assert from "node:assert/strict";
import test from "node:test";

import { normalizeStaticSource, validateAuthoredAssetManifest, validateStaticImageSource, validateStaticSource, validateStaticTextSource } from "../src/static-content/staticSourceSchema.js";

test("text normalization retains portable QMD V1 and its source-owned revision", () => {
  const source = normalizeStaticSource({ kind: "staticText", qmd: "# Situation" });
  assert.deepEqual(source, { kind: "staticText", sourceVersion: 1, revision: 1, renderingPolicy: "portable-qmd-v1", qmd: "# Situation" });
  assert.equal(validateStaticTextSource(source), source);
  assert.equal(validateStaticSource(source), source);
});

test("Static Image normalization emits the exact V5 placement contract", () => {
  const source = normalizeStaticSource({ kind: "staticImage", mediaId: "media-briefing", alt: "Briefing map", fit: "cover", crop: { x: 100, y: 0, width: 900, height: 1000 }, rotation: 90 });
  assert.deepEqual(source, { kind: "staticImage", sourceVersion: 2, mediaId: "media-briefing", alt: "Briefing map", decorative: false, fit: "cover", crop: { x: 100, y: 0, width: 900, height: 1000 }, rotation: 90 });
  assert.equal(validateStaticImageSource(source), source);
  for (const forbidden of [{ origin: { kind: "url", url: "https://example.test/old.png" } }, { revision: 2 }, { migrationWarnings: ["replacement-required"] }]) {
    assert.throws(() => validateStaticImageSource({ ...source, ...forbidden }), /unknown/i);
  }
});

test("Image placement validation owns accessibility and transform settings only", () => {
  const base = normalizeStaticSource({ kind: "staticImage", mediaId: "media-map", alt: "Response map" });
  assert.throws(() => validateStaticImageSource({ ...base, alt: "" }), /alternative text/i);
  assert.throws(() => validateStaticImageSource({ ...base, decorative: true }), /empty alt/i);
  assert.throws(() => validateStaticImageSource({ ...base, fit: "fill" }), /contain or cover/i);
  assert.throws(() => validateStaticImageSource({ ...base, rotation: 45 }), /0, 90, 180, or 270/i);
  assert.throws(() => validateStaticImageSource({ ...base, crop: { x: 900, y: 0, width: 200, height: 1000 } }), /0–1000 frame/i);
});

test("authored asset manifest remains the separate byte authority", () => {
  const assets = { "asset-map": { mediaType: "image/png", byteLength: 20, width: 4, height: 5, sha256: "c".repeat(64), storageState: "durable" } };
  assert.equal(validateAuthoredAssetManifest(assets), assets);
  assert.throws(() => validateAuthoredAssetManifest({ "asset-map": { ...assets["asset-map"], alt: "wrong layer" } }), /unknown/i);
});
