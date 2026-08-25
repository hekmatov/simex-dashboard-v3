import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeContentLibrary,
  validateContentLibrary,
} from "../src/content-library/contentLibrarySchema.js";
import { makeMediaItem, makeSourceEntry } from "./helpers/contentLibraryFixtures.js";

test("content library normalizes only the two canonical V5 registries", () => {
  assert.deepEqual(normalizeContentLibrary(), { mediaItems: {}, sourceEntries: {} });
  assert.deepEqual(Object.keys(normalizeContentLibrary({
    mediaItems: { "media-image-source": makeMediaItem() },
    sourceEntries: { cases: makeSourceEntry("csv") },
  })), ["mediaItems", "sourceEntries"]);
  assert.throws(() => normalizeContentLibrary({ assets: {} }), /assets.*unknown/i);
  assert.throws(() => normalizeContentLibrary({ media: {}, sourceEntries: {} }), /media.*unknown/i);
});

test("content library validates key identity and derives source kind from dataSources", () => {
  const library = {
    mediaItems: { "media-image-source": makeMediaItem() },
    sourceEntries: {
      cases: makeSourceEntry("csv"),
      boundaries: makeSourceEntry("geojson"),
    },
  };
  assert.equal(validateContentLibrary(library, {
    assets: { "asset-map": {} },
    dataSources: { cases: { kind: "csv" }, boundaries: { kind: "geojson" } },
  }), library);
  assert.throws(() => validateContentLibrary({
    ...library,
    mediaItems: { wrong: makeMediaItem() },
  }, { assets: { "asset-map": {} }, dataSources: {} }), /mediaId.*key/i);
  assert.throws(() => validateContentLibrary({
    ...library,
    sourceEntries: { cases: { ...makeSourceEntry("csv"), sourceId: "other" } },
  }, { dataSources: { cases: { kind: "csv" } } }), /sourceId.*key/i);
  assert.throws(() => validateContentLibrary({
    mediaItems: {}, sourceEntries: { cases: makeSourceEntry("csv") },
  }, { dataSources: { cases: { kind: "staticText" } } }), /CSV or GeoJSON/i);
});

test("content library rejects a Static Image placement whose mediaId is missing", () => {
  assert.throws(() => validateContentLibrary({
    mediaItems: { "media-unused": makeMediaItem({ mediaId: "media-unused" }) },
    sourceEntries: {},
  }, {
    assets: { "asset-map": {} },
    dataSources: {
      briefing: { kind: "staticImage", sourceVersion: 2, mediaId: "media-missing" },
    },
  }), /media-missing.*MediaItem|MediaItem.*media-missing/i);
});
