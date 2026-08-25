import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeImageTransform,
  nudgeImageCrop,
  resetImageTransform,
  rotateImageCrop,
} from "../src/static-content/image/imageTransform.js";

const FULL = { x: 0, y: 0, width: 1000, height: 1000 };

test("normalization rounds and clamps crop metadata into the permille frame", () => {
  assert.deepEqual(normalizeImageTransform({
    crop: { x: -8.8, y: 950.4, width: 1200.2, height: 200.6 },
    rotation: 450,
    fit: "cover",
  }), {
    crop: { x: 0, y: 950, width: 1000, height: 50 },
    rotation: 90,
    fit: "cover",
  });
  assert.deepEqual(normalizeImageTransform({ crop: {}, rotation: 45, fit: "fill" }), {
    crop: FULL,
    rotation: 0,
    fit: "contain",
  });
});

test("quarter-turn crop rotation preserves the selected rectangle through four turns", () => {
  const crop = { x: 100, y: 200, width: 300, height: 400 };
  assert.deepEqual(rotateImageCrop(crop, 90), { x: 400, y: 100, width: 400, height: 300 });
  assert.deepEqual(rotateImageCrop(crop, -90), { x: 200, y: 600, width: 400, height: 300 });
  let rotated = crop;
  for (let index = 0; index < 4; index += 1) rotated = rotateImageCrop(rotated, 90);
  assert.deepEqual(rotated, crop);
});

test("nudge and resize alternatives clamp at frame edges and minimum size", () => {
  assert.deepEqual(nudgeImageCrop(
    { x: 900, y: 900, width: 100, height: 100 },
    { dx: 50, dy: 50 },
  ), { x: 900, y: 900, width: 100, height: 100 });
  assert.deepEqual(nudgeImageCrop(
    { x: 100, y: 100, width: 300, height: 300 },
    { dx: -150, dy: 80, dWidth: -400, dHeight: 900 },
  ), { x: 0, y: 180, width: 1, height: 820 });
});

test("Reset image restores transform metadata without accepting or returning asset fields", () => {
  const source = {
    assetId: "asset-original",
    alt: "Response map",
    crop: { x: 100, y: 100, width: 600, height: 600 },
    rotation: 270,
    fit: "cover",
  };
  assert.deepEqual(resetImageTransform(source), {
    crop: FULL,
    rotation: 0,
    fit: "contain",
  });
});
