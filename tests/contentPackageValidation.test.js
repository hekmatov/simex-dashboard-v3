import assert from "node:assert/strict";
import test from "node:test";

import { validateContentPackage } from "../src/content-library/contentPackageValidation.js";
import {
  encodeAssetBase64,
  sha256HexSync,
} from "../src/static-content/assets/assetPayloadEnvelope.js";
import { imageFixtureBytes } from "./fixtures/imageFixtureBytes.js";
import { makeDashboardV5, makeMediaItem, makeSourceEntry } from "./helpers/contentLibraryFixtures.js";

test("a complete V5 package retains used and unused logical content over deduped physical bytes", () => {
  const input = completePackage();
  const before = structuredClone(input);

  assert.equal(validateContentPackage(input), input);
  assert.deepEqual(input, before);
});

test("package validation rejects incomplete or corrupt retained local media", () => {
  const missingPayload = completePackage();
  delete missingPayload.assetPayloads[ASSET_ID];
  assert.throws(
    () => validateContentPackage(missingPayload),
    /missing authored asset payload/i,
  );

  const corruptPayload = completePackage();
  corruptPayload.assetPayloads[ASSET_ID].base64 = "AQIDBA==";
  assert.throws(
    () => validateContentPackage(corruptPayload),
    /hash|byte length/i,
  );

  const unhealthy = completePackage();
  unhealthy.config.contentLibrary.mediaItems["media-unused"].health = "corrupt";
  assert.throws(
    () => validateContentPackage(unhealthy),
    /media-unused.*corrupt|corrupt.*media-unused/i,
  );
});

test("package validation rejects animated authored media before import mutation", () => {
  const input = completePackage(animatedPng());
  assert.throws(
    () => validateContentPackage(input),
    /animated|single-frame/i,
  );
});

test("package validation rejects arbitrary bytes self-declared as JPEG", () => {
  const input = completePackage();
  input.config.assets[ASSET_ID].mediaType = "image/jpeg";
  input.assetPayloads[ASSET_ID].mediaType = "image/jpeg";
  for (const item of Object.values(input.config.contentLibrary.mediaItems)) {
    item.mediaType = "image/jpeg";
  }

  assert.throws(
    () => validateContentPackage(input),
    /signature|intrinsic|media type|declared raster/i,
  );
});

test("package validation rejects forged manifest and media-item dimensions", () => {
  const input = completePackage();
  input.config.assets[ASSET_ID].width = 8;
  input.config.assets[ASSET_ID].height = 6;
  for (const item of Object.values(input.config.contentLibrary.mediaItems)) {
    item.dimensions = { width: 8, height: 6 };
  }

  assert.throws(
    () => validateContentPackage(input),
    /dimension|intrinsic/i,
  );
});

test("package validation requires logical records for builder-managed sources and CSV-only profiles", () => {
  const missingEntry = completePackage();
  delete missingEntry.config.contentLibrary.sourceEntries.boundaries;
  assert.throws(
    () => validateContentPackage(missingEntry),
    /boundaries.*source.?entry|source.?entry.*boundaries/i,
  );

  const geoJsonProfile = completePackage();
  geoJsonProfile.config.datasetProfiles = { boundaries: { kind: "csv" } };
  assert.throws(
    () => validateContentPackage(geoJsonProfile),
    /profile.*boundaries|boundaries.*profile/i,
  );
});

test("package validation derives only the canonical lean GeoJSON facts and keeps unknown QMD media inert", () => {
  const input = completePackage();
  input.config.dataSources.notes.qmd += "\n\n![Unknown](simex-media:not-in-library)";
  input.config.dataSources.boundaries.geoJson.features[0].properties = {
    municipality: "A",
    deeplyNested: { arbitrary: [{ value: true }] },
  };

  assert.doesNotThrow(() => validateContentPackage(input));
});

const PNG = imageFixtureBytes("image/png");
const ASSET_ID = `asset-${sha256HexSync(PNG)}`;

function completePackage(bytes = PNG) {
  const sha256 = sha256HexSync(bytes);
  const assetId = `asset-${sha256}`;
  const dashboard = makeDashboardV5();
  dashboard.assets = {
    [assetId]: {
      mediaType: "image/png",
      byteLength: bytes.byteLength,
      width: 2,
      height: 3,
      sha256,
      storageState: "durable",
    },
  };
  dashboard.contentLibrary.mediaItems = {
    "media-image-source": makeMediaItem({
      mediaId: "media-image-source",
      current: { kind: "asset", assetId },
      dimensions: { width: 2, height: 3 },
      byteLength: bytes.byteLength,
      mediaType: "image/png",
    }),
    "media-unused": makeMediaItem({
      mediaId: "media-unused",
      current: { kind: "asset", assetId },
      displayName: "Unused retained map",
      dimensions: { width: 2, height: 3 },
      byteLength: bytes.byteLength,
      mediaType: "image/png",
    }),
  };
  dashboard.dataSources["image-source"].mediaId = "media-image-source";
  dashboard.dataSources.notes = {
    kind: "staticText",
    sourceVersion: 1,
    revision: 1,
    renderingPolicy: "portable-qmd-v1",
    qmd: "![Used map](simex-media:media-image-source)",
  };
  dashboard.dataSources.cases = {
    kind: "dataset",
    type: "uploadedCsv",
    fileName: "cases.csv",
    csvText: "municipality,cases\nA,4\n",
    provenance: { label: "Cases" },
  };
  dashboard.dataSources.boundaries = {
    kind: "dataset",
    type: "uploadedGeoJson",
    fileName: "boundaries.geojson",
    geoJson: {
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        properties: { municipality: "A" },
        geometry: { type: "Point", coordinates: [4.9, 52.3] },
      }],
    },
    provenance: { label: "Boundaries" },
  };
  dashboard.contentLibrary.sourceEntries = {
    cases: makeSourceEntry("csv", { sourceId: "cases", origin: "uploaded" }),
    boundaries: makeSourceEntry("geojson", { sourceId: "boundaries", origin: "uploaded" }),
  };
  delete dashboard.datasetProfiles;

  return {
    config: dashboard,
    assetPayloads: {
      [assetId]: {
        base64: encodeAssetBase64(bytes),
        byteLength: bytes.byteLength,
        mediaType: "image/png",
        sha256,
      },
    },
  };
}

function animatedPng() {
  const data = Uint8Array.from([0, 0, 0, 2, 0, 0, 0, 0]);
  const chunk = new Uint8Array(12 + data.length);
  new DataView(chunk.buffer).setUint32(0, data.length);
  chunk.set([..."acTL"].map((character) => character.charCodeAt(0)), 4);
  chunk.set(data, 8);
  const insertAt = PNG.length - 12;
  const result = new Uint8Array(PNG.length + chunk.length);
  result.set(PNG.subarray(0, insertAt));
  result.set(chunk, insertAt);
  result.set(PNG.subarray(insertAt), insertAt + chunk.length);
  return result;
}
