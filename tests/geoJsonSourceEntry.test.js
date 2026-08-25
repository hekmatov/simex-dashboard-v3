import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeManagedGeoJsonSource,
  summarizeGeoJsonSource,
} from "../src/content-library/geoJsonSourceEntry.js";
import { validateGeoJson } from "../src/lib/geoJsonValidation.js";

const geoJson = {
  type: "FeatureCollection",
  features: [{
    type: "Feature",
    properties: { zeta: 1, alpha: 2 },
    geometry: { type: "Point", coordinates: [4.9, 52.3] },
  }],
};

test("uploaded, tracked, and packaged GeoJSON normalize without datasetProfiles", () => {
  const validation = validateGeoJson(geoJson);
  const cases = [
    [{
      kind: "dataset",
      type: "uploadedGeoJson",
      fileName: "uploaded.geojson",
      browserAssetId: "session-asset",
      geoJson,
      provenance: { label: "Uploaded boundaries" },
    }, "uploaded", "Uploaded boundaries"],
    [{
      kind: "geojson",
      path: "data/tracked.geojson",
      provenance: { label: "Tracked boundaries" },
    }, "linked-project", "Tracked boundaries"],
    [{
      kind: "dataset",
      type: "uploadedGeoJson",
      fileName: "packaged.geojson",
      geoJson,
      provenance: { label: "Packaged boundaries" },
    }, "packaged", "Packaged boundaries"],
  ];

  for (const [descriptor, origin, displayName] of cases) {
    const normalized = normalizeManagedGeoJsonSource("boundaries", descriptor, validation);
    assert.equal(normalized.sourceEntry.origin, origin);
    assert.equal(normalized.sourceEntry.displayName, displayName);
    assert.equal(normalized.sourceEntry.sourceId, "boundaries");
    assert.equal(normalized.sourceEntry.ownership, "builder");
    assert.deepEqual(normalized.dataSource, descriptor);
    assert.deepEqual(normalized.summary, validation.summary);
    assert.equal(Object.hasOwn(normalized, "datasetProfiles"), false);
  }
});

test("the source summary is a defensive lean projection of successful validation", () => {
  const validation = validateGeoJson(geoJson, { includeDiagnostics: true });
  const summary = summarizeGeoJsonSource(validation);
  assert.deepEqual(summary.propertyKeys, ["alpha", "zeta"]);
  assert.notEqual(summary, validation.summary);
  assert.notEqual(summary.propertyKeys, validation.summary.propertyKeys);

  assert.throws(
    () => summarizeGeoJsonSource(validateGeoJson({ type: "FeatureCollection", features: [] })),
    /successful GeoJSON validation/i,
  );
});

test("normalization rejects non-GeoJSON descriptors and unsuccessful validation", () => {
  assert.throws(
    () => normalizeManagedGeoJsonSource("cases", { kind: "csv", path: "cases.csv" }, validateGeoJson(geoJson)),
    /managed GeoJSON descriptor/i,
  );
  assert.throws(
    () => normalizeManagedGeoJsonSource(
      "boundaries",
      { kind: "geojson", path: "data/boundaries.geojson", provenance: { label: "Boundaries" } },
      validateGeoJson({ type: "FeatureCollection", features: [] }),
    ),
    /successful GeoJSON validation/i,
  );
});
