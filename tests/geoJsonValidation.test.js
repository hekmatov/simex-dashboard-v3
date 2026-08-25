import assert from "node:assert/strict";
import test from "node:test";
import {
  GEOJSON_CONCURRENT_MAPS,
  GEOJSON_LIMITS,
  SOURCE_GEOJSON_LIMIT_KEYS,
  geoJsonAtBoundary,
} from "./helpers/geoJsonBoundaryFixtures.js";
import {
  inspectGeoJsonAdmission,
  validateGeoJson,
  validateGeoJsonSchema,
} from "../src/lib/geoJsonValidation.js";

const ring = [
  [0, 0],
  [2, 0],
  [2, 2],
  [0, 0],
];

function feature(geometry, properties = {}) {
  return { type: "Feature", properties, geometry };
}

function collection(features) {
  return { type: "FeatureCollection", features };
}

test("the production authority freezes exactly the four calibrated admission triples", () => {
  assert.deepEqual(GEOJSON_LIMITS, {
    encodedBytes: { normalMax: 31_999_999, warningMin: 32_000_000, hardMin: 36_000_000 },
    features: { normalMax: 1_999, warningMin: 2_000, hardMin: 8_000 },
    totalPositions: { normalMax: 19_999, warningMin: 20_000, hardMin: 50_000 },
    renderableFragments: { normalMax: 1_999, warningMin: 2_000, hardMin: 4_000 },
  });
  assert.deepEqual(SOURCE_GEOJSON_LIMIT_KEYS, [
    "encodedBytes",
    "features",
    "totalPositions",
    "renderableFragments",
  ]);
  assert.deepEqual(GEOJSON_CONCURRENT_MAPS, { normalMax: 2, eagerMax: 4 });
  assert.equal(Object.isFrozen(GEOJSON_LIMITS), true);
  assert.equal(Object.isFrozen(SOURCE_GEOJSON_LIMIT_KEYS), true);

  for (const metric of [
    "maxPositionsPerFeature",
    "parts",
    "rings",
    "propertyKeyCount",
    "propertyValueBytes",
    "nestingDepth",
    "structuralNodes",
    "concurrentMaps",
  ]) {
    assert.throws(() => geoJsonAtBoundary(metric, "hardMin"), /unknown.*metric/i);
  }
});

test("renderable fragment counts follow the exact six-type and null rules", () => {
  const cases = [
    [null, 0],
    [{ type: "Point", coordinates: [1, 2] }, 0],
    [{ type: "MultiPoint", coordinates: [[1, 2], [3, 4]] }, 0],
    [{ type: "LineString", coordinates: [[0, 0], [1, 1]] }, 1],
    [{
      type: "MultiLineString",
      coordinates: [[[0, 0], [1, 1]], [[2, 2], [3, 3]]],
    }, 2],
    [{ type: "Polygon", coordinates: [ring, ring] }, 2],
    [{ type: "MultiPolygon", coordinates: [[ring], [ring, ring]] }, 3],
  ];

  for (const [geometry, expected] of cases) {
    const result = validateGeoJson(collection([feature(geometry)]));
    assert.equal(result.schema.ok, true);
    assert.equal(result.admission.status, "normal");
    assert.equal(result.summary.renderableFragments, expected);
  }

  const mixed = validateGeoJson(collection(cases.map(([geometry]) => feature(geometry))));
  assert.equal(mixed.summary.renderableFragments, 8);

  const oneRingPolygons = Array.from({ length: 5 }, () => [ring]);
  const multiPolygon = validateGeoJson(collection([feature({
    type: "MultiPolygon",
    coordinates: oneRingPolygons,
  })]));
  assert.equal(multiPolygon.summary.renderableFragments, 5);
});

test("schema failures are typed separately from four-gate admission", () => {
  const invalidCases = [
    [{ features: [] }, "feature-collection-type"],
    [{ type: "FeatureCollection", features: [{}] }, "feature-type"],
    [collection([feature({ type: "Circle", coordinates: [0, 0] })]), "geometry-type"],
    [collection([feature({ type: "GeometryCollection", geometries: [] })]), "geometry-collection-unsupported"],
    [collection([feature({ type: "Point", coordinates: [0, Infinity] })]), "position-coordinate"],
    [collection([feature({ type: "Point", coordinates: [[0, 0]] })]), "position-coordinate"],
    [collection([feature({ type: "LineString", coordinates: [[0, 0]] })]), "line-minimum"],
    [collection([feature({ type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [2, 2]]] })]), "ring-closure"],
    [collection([feature({ type: "MultiPolygon", coordinates: [ring] })]), "polygon-shape"],
  ];

  for (const [value, code] of invalidCases) {
    const schema = validateGeoJsonSchema(value);
    assert.equal(schema.ok, false);
    assert.equal(schema.errors[0].code, code);
    const combined = validateGeoJson(value);
    assert.equal(combined.schema.ok, false);
    assert.equal(combined.admission, null);
    assert.equal(combined.summary, null);
  }
});

test("selected join absence and zero coverage are compatibility outcomes", () => {
  const missing = validateGeoJson(collection([
    feature({ type: "Point", coordinates: [0, 0] }, { other: "A" }),
  ]), { selectedJoinProperty: "region" });
  assert.equal(missing.schema.ok, true);
  assert.equal(missing.admission.status, "normal");
  assert.deepEqual(missing.compatibility, {
    ok: false,
    errors: [{
      code: "selected-join-field-absent",
      path: "features[*].properties.region",
      message: 'Selected join property "region" is absent.',
    }],
  });

  const zeroCoverage = validateGeoJson(collection([
    feature({ type: "Point", coordinates: [0, 0] }, { region: null }),
  ]), { selectedJoinProperty: "region" });
  assert.equal(zeroCoverage.compatibility.ok, false);
  assert.equal(zeroCoverage.compatibility.errors[0].code, "zero-join-coverage");

  const usable = validateGeoJson(collection([
    feature({ type: "Point", coordinates: [0, 0] }, { region: "north" }),
  ]), { selectedJoinProperty: "region" });
  assert.deepEqual(usable.compatibility, { ok: true, errors: [] });
});

test("removed historical diagnostics do not reject and the summary stays lean", () => {
  const manyProperties = Object.fromEntries(
    Array.from({ length: 1_100 }, (_, index) => [`key-${index}`, index]),
  );
  let nested = { leaf: true };
  for (let index = 0; index < 600; index += 1) nested = { next: nested };
  manyProperties.nested = nested;
  manyProperties.containers = Array.from({ length: 5_000 }, () => ({}));
  const result = validateGeoJson(collection([
    feature({ type: "LineString", coordinates: [[-2, 4], [3, -1]] }, manyProperties),
  ]), { includeDiagnostics: true });

  assert.equal(result.schema.ok, true);
  assert.equal(result.admission.status, "normal");
  assert.deepEqual(Object.keys(result.admission.facts), SOURCE_GEOJSON_LIMIT_KEYS);
  assert.deepEqual(Object.keys(result.summary), [
    "featureCount",
    "geometryTypeCounts",
    "boundingBox",
    "propertyKeys",
    "encodedBytes",
    "totalPositions",
    "renderableFragments",
    "diagnostics",
  ]);
  assert.equal(result.summary.propertyKeys[0], "containers");
  assert.equal(result.summary.propertyKeys.at(-1), "nested");
  assert.deepEqual(result.summary.boundingBox, [-2, -1, 3, 4]);
  assert.deepEqual(result.summary.diagnostics, { maxPositionsPerFeature: 2 });
  assert.equal(Object.hasOwn(result.admission.facts, "propertyKeyCount"), false);
  assert.equal(Object.hasOwn(result.admission.facts, "structuralNodes"), false);
});

test("admission warns and rejects only on the calibrated four facts", () => {
  const base = collection([feature({ type: "Point", coordinates: [0, 0] })]);
  assert.equal(inspectGeoJsonAdmission({
    encodedBytes: GEOJSON_LIMITS.encodedBytes.warningMin,
    featureCollection: base,
  }).status, "warning");
  assert.equal(inspectGeoJsonAdmission({
    encodedBytes: GEOJSON_LIMITS.encodedBytes.hardMin,
    featureCollection: base,
  }).status, "rejected");

  const oversizedInvalidText = "x".repeat(GEOJSON_LIMITS.encodedBytes.hardMin);
  const byteRejected = validateGeoJson(oversizedInvalidText);
  assert.equal(byteRejected.admission.status, "rejected");
  assert.equal(byteRejected.admission.facts.encodedBytes, GEOJSON_LIMITS.encodedBytes.hardMin);
  assert.equal(byteRejected.summary, null);
});
