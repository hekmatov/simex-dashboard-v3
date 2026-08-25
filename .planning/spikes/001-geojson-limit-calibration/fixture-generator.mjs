const ORIGIN = [5.1, 52.1];

export const LADDER_DEFINITIONS = Object.freeze({
  encodedBytes: [250_000, 1_000_000, 2_000_000, 4_000_000, 8_000_000, 12_000_000],
  features: [355, 1_000, 2_000, 4_000, 8_000, 12_000],
  totalPositions: [6_630, 20_000, 50_000, 100_000, 200_000, 400_000],
  oneFeaturePositions: [196, 5_000, 20_000, 50_000, 100_000, 200_000],
  partsRings: [20, 100, 250, 500, 1_000, 2_000],
  propertyKeys: [16, 64, 128, 256, 512, 1_000],
  propertyValueBytes: [16_000, 128_000, 512_000, 1_000_000, 2_000_000, 4_000_000],
  collectionDepth: [1, 4, 8, 16, 32, 64],
  concurrentMaps: [1, 2, 4, 6, 8, 12],
  encodedBytesExtension: [16_000_000, 24_000_000, 32_000_000, 48_000_000, 64_000_000],
  propertyValueBytesExtension: [8_000_000, 12_000_000, 16_000_000, 24_000_000, 32_000_000, 48_000_000, 64_000_000],
  distributedPartsRings: [4_000, 8_000, 12_000, 16_000, 24_000, 32_000],
  structuralNodes: [50_000, 100_000, 200_000, 300_000, 500_000],
});

export const ACCEPTED_GEOMETRY_TYPES = Object.freeze([
  "Point",
  "MultiPoint",
  "LineString",
  "MultiLineString",
  "Polygon",
  "MultiPolygon",
  "GeometryCollection",
]);

export function fixtureFor(dimension, value) {
  switch (dimension) {
    case "encodedBytes":
      return collection([pointFeature(0, { padding: "x".repeat(Math.max(0, value - 180)) })]);
    case "encodedBytesExtension":
      return collection([pointFeature(0, { padding: "x".repeat(Math.max(0, value - 180)) })]);
    case "features":
      return collection(Array.from({ length: value }, (_, index) => pointFeature(index)));
    case "totalPositions":
      return collection(lineFeatures(value, 250));
    case "oneFeaturePositions":
      return collection([lineFeature(0, value)]);
    case "partsRings":
      return collection([multiPolygonFeature(value)]);
    case "propertyKeys":
      return collection([pointFeature(0, Object.fromEntries(
        Array.from({ length: Math.max(0, value - 1) }, (_, index) => [`property_${index}`, index]),
      ))]);
    case "propertyValueBytes":
      return collection([pointFeature(0, { payload: "v".repeat(Math.max(0, value - 13)) })]);
    case "propertyValueBytesExtension":
      return collection([pointFeature(0, { payload: "v".repeat(Math.max(0, value - 13)) })]);
    case "distributedPartsRings":
      return collection(distributedMultiPolygonFeatures(value, 500));
    case "structuralNodes":
      return structuralNodeFixture(value);
    case "collectionDepth":
      return collection([geometryCollectionFeature(value)]);
    case "acceptedGeometryTypes":
      return value === "all" ? acceptedGeometryTypesFixture() : geometryTypeFixture(value);
    case "concurrentMaps":
      return collection(lineFeatures(20_000, 250));
    default:
      throw new Error(`Unknown fixture dimension: ${dimension}`);
  }
}

export function fixtureMetadata(dimension, requestedValue, geoJson) {
  const encoded = JSON.stringify(geoJson);
  const summary = summarizeGeoJson(geoJson);
  return {
    id: `${dimension}-${requestedValue}`,
    dimension,
    requestedValue,
    encodedBytes: new TextEncoder().encode(encoded).byteLength,
    ...summary,
  };
}

export function summarizeGeoJson(geoJson, {
  maxNodes = 2_000_000,
  maxDepth = 128,
} = {}) {
  const geometryTypes = {};
  let maxPropertyKeysPerFeature = 0;
  let positions = 0;
  let maxFeaturePositions = 0;
  let parts = 0;
  let rings = 0;
  let visitedNodes = 0;
  let observedDepth = 0;
  let totalEncodedPropertyValueBytes = 0;
  const structuralNodeCount = countStructuralNodes(geoJson, { maxNodes, maxDepth });
  const bounds = [Infinity, Infinity, -Infinity, -Infinity];

  function countGeometry(root, featureIndex) {
    const stack = [{ value: root, depth: 1 }];
    let featurePositions = 0;
    while (stack.length) {
      const { value, depth } = stack.pop();
      visitedNodes += 1;
      if (visitedNodes > maxNodes) throw new Error("summary-node-budget-exceeded");
      if (depth > maxDepth) throw new Error("summary-depth-budget-exceeded");
      observedDepth = Math.max(observedDepth, depth);
      if (!value || typeof value !== "object") continue;
      if (value.type === "GeometryCollection") {
        geometryTypes.GeometryCollection = (geometryTypes.GeometryCollection ?? 0) + 1;
        for (const geometry of value.geometries ?? []) stack.push({ value: geometry, depth: depth + 1 });
        continue;
      }
      if (typeof value.type === "string") {
        geometryTypes[value.type] = (geometryTypes[value.type] ?? 0) + 1;
      }
      const coordinateStack = [{ value: value.coordinates, depth: 1 }];
      while (coordinateStack.length) {
        const next = coordinateStack.pop();
        visitedNodes += 1;
        if (visitedNodes > maxNodes) throw new Error("summary-node-budget-exceeded");
        if (next.depth > maxDepth) throw new Error("summary-depth-budget-exceeded");
        observedDepth = Math.max(observedDepth, depth + next.depth);
        if (!Array.isArray(next.value)) continue;
        if (
          next.value.length >= 2
          && typeof next.value[0] === "number"
          && typeof next.value[1] === "number"
        ) {
          positions += 1;
          featurePositions += 1;
          bounds[0] = Math.min(bounds[0], next.value[0]);
          bounds[1] = Math.min(bounds[1], next.value[1]);
          bounds[2] = Math.max(bounds[2], next.value[0]);
          bounds[3] = Math.max(bounds[3], next.value[1]);
        } else {
          for (const entry of next.value) coordinateStack.push({ value: entry, depth: next.depth + 1 });
        }
      }
      if (["Point", "LineString", "Polygon"].includes(value.type)) parts += 1;
      if (["MultiPoint", "MultiLineString", "MultiPolygon"].includes(value.type)) parts += value.coordinates?.length ?? 0;
      if (value.type === "Polygon") rings += value.coordinates?.length ?? 0;
      if (value.type === "MultiPolygon") {
        rings += (value.coordinates ?? []).reduce((total, polygon) => total + polygon.length, 0);
      }
    }
    maxFeaturePositions = Math.max(maxFeaturePositions, featurePositions);
    return featureIndex;
  }

  for (const [index, feature] of (geoJson.features ?? []).entries()) {
    for (const value of Object.values(feature.properties ?? {})) {
      totalEncodedPropertyValueBytes += new TextEncoder().encode(JSON.stringify(value)).byteLength;
    }
    maxPropertyKeysPerFeature = Math.max(
      maxPropertyKeysPerFeature,
      Object.keys(feature.properties ?? {}).length,
    );
    countGeometry(feature.geometry, index);
  }
  return {
    features: geoJson.features?.length ?? 0,
    totalPositions: positions,
    maxFeaturePositions,
    parts,
    rings,
    maxPropertyKeysPerFeature,
    totalEncodedPropertyValueBytes,
    geometryTypes,
    bbox: Number.isFinite(bounds[0]) ? bounds : null,
    observedDepth,
    visitedNodes,
    structuralNodeCount,
  };
}

export function countStructuralNodes(value, {
  maxNodes = 2_000_000,
  maxDepth = 128,
} = {}) {
  const stack = [{ value, depth: 1 }];
  let count = 0;
  while (stack.length) {
    const current = stack.pop();
    if (!current.value || typeof current.value !== "object") continue;
    count += 1;
    if (count > maxNodes) throw new Error("structural-node-budget-exceeded");
    if (current.depth > maxDepth) throw new Error("structural-depth-budget-exceeded");
    if (Array.isArray(current.value)) {
      for (const entry of current.value) {
        if (entry && typeof entry === "object") stack.push({ value: entry, depth: current.depth + 1 });
      }
      continue;
    }
    for (const entry of Object.values(current.value)) {
      if (entry && typeof entry === "object") stack.push({ value: entry, depth: current.depth + 1 });
    }
  }
  return count;
}

function collection(features) {
  return { type: "FeatureCollection", features };
}

function pointFeature(index, extraProperties = {}) {
  return {
    type: "Feature",
    id: `feature-${index}`,
    properties: { name: `Feature ${index}`, ...extraProperties },
    geometry: {
      type: "Point",
      coordinates: coordinate(index),
    },
  };
}

function lineFeature(index, count) {
  return {
    type: "Feature",
    id: `line-${index}`,
    properties: { name: `Line ${index}` },
    geometry: {
      type: "LineString",
      coordinates: Array.from({ length: count }, (_, offset) => coordinate(index * count + offset)),
    },
  };
}

function lineFeatures(totalPositions, positionsPerFeature) {
  const featureCount = Math.ceil(totalPositions / positionsPerFeature);
  return Array.from({ length: featureCount }, (_, index) => (
    lineFeature(index, Math.min(positionsPerFeature, totalPositions - index * positionsPerFeature))
  ));
}

function multiPolygonFeature(ringCount) {
  return {
    type: "Feature",
    id: "many-rings",
    properties: { name: "Many rings" },
    geometry: {
      type: "MultiPolygon",
      coordinates: Array.from({ length: ringCount }, (_, index) => [closedRing(index)]),
    },
  };
}

function distributedMultiPolygonFeatures(totalParts, featureCount) {
  const actualFeatures = Math.min(totalParts, featureCount);
  const baseParts = Math.floor(totalParts / actualFeatures);
  const remainder = totalParts % actualFeatures;
  let partIndex = 0;
  return Array.from({ length: actualFeatures }, (_, featureIndex) => {
    const count = baseParts + (featureIndex < remainder ? 1 : 0);
    const coordinates = Array.from({ length: count }, () => [closedRing(partIndex++)]);
    return {
      type: "Feature",
      id: `distributed-${featureIndex}`,
      properties: { name: `Distributed polygon ${featureIndex}`, district: featureIndex % 20 },
      geometry: { type: "MultiPolygon", coordinates },
    };
  });
}

function structuralNodeFixture(targetNodes) {
  const base = collection([pointFeature(0)]);
  const baseNodes = countStructuralNodes(base);
  base.features[0].properties.payload = Array.from(
    { length: Math.max(0, targetNodes - baseNodes - 1) },
    () => [],
  );
  return base;
}

function geometryCollectionFeature(depth) {
  let geometry = { type: "Point", coordinates: ORIGIN };
  for (let index = 0; index < depth; index += 1) {
    geometry = { type: "GeometryCollection", geometries: [geometry] };
  }
  return {
    type: "Feature",
    id: "nested-collection",
    properties: { name: "Nested collection" },
    geometry,
  };
}

function acceptedGeometryTypesFixture() {
  const point = coordinate(1);
  const line = [coordinate(1), coordinate(2), coordinate(3)];
  const polygon = [closedRing(0)];
  return collection([
    geometryFeature("Point", point),
    geometryFeature("MultiPoint", [point, coordinate(2)]),
    geometryFeature("LineString", line),
    geometryFeature("MultiLineString", [line, line.map(([x, y]) => [x + 0.01, y])]),
    geometryFeature("Polygon", polygon),
    geometryFeature("MultiPolygon", [polygon, [closedRing(2)]]),
    {
      type: "Feature",
      id: "GeometryCollection",
      properties: { name: "GeometryCollection" },
      geometry: {
        type: "GeometryCollection",
        geometries: [
          { type: "Point", coordinates: point },
          { type: "LineString", coordinates: line },
        ],
      },
    },
  ]);
}

function geometryTypeFixture(type) {
  const fixture = acceptedGeometryTypesFixture();
  const feature = fixture.features.find((entry) => entry.geometry?.type === type);
  if (!feature) throw new Error(`Unknown accepted geometry type: ${type}`);
  return collection([feature]);
}

function geometryFeature(type, coordinates) {
  return {
    type: "Feature",
    id: type,
    properties: { name: type },
    geometry: { type, coordinates },
  };
}

function closedRing(index) {
  const [x, y] = coordinate(index * 5);
  return [[x, y], [x + 0.002, y], [x + 0.002, y + 0.002], [x, y + 0.002], [x, y]];
}

function coordinate(index) {
  const column = index % 1_000;
  const row = Math.floor(index / 1_000) % 1_000;
  return [ORIGIN[0] + column * 0.0001, ORIGIN[1] + row * 0.0001];
}
