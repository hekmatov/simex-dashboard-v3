const SUPPORTED_GEOMETRY_TYPES = new Set([
  "Point",
  "MultiPoint",
  "LineString",
  "MultiLineString",
  "Polygon",
  "MultiPolygon",
]);
const FEATURE_COLLECTION_KEYS = new Set(["bbox", "features", "type"]);
const FEATURE_KEYS = new Set(["bbox", "geometry", "id", "properties", "type"]);
const GEOMETRY_KEYS = new Set(["bbox", "coordinates", "type"]);
const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export const GEOJSON_LIMITS = Object.freeze({
  encodedBytes: Object.freeze({ normalMax: 31_999_999, warningMin: 32_000_000, hardMin: 36_000_000 }),
  features: Object.freeze({ normalMax: 1_999, warningMin: 2_000, hardMin: 8_000 }),
  totalPositions: Object.freeze({ normalMax: 19_999, warningMin: 20_000, hardMin: 50_000 }),
  renderableFragments: Object.freeze({ normalMax: 1_999, warningMin: 2_000, hardMin: 4_000 }),
});

export const SOURCE_GEOJSON_LIMIT_KEYS = Object.freeze(Object.keys(GEOJSON_LIMITS));
export const GEOJSON_CONCURRENT_MAPS = Object.freeze({ normalMax: 2, eagerMax: 4 });

export function validateGeoJsonSchema(value) {
  const analysis = analyzeFeatureCollection(value);
  return analysis.error
    ? { ok: false, errors: [analysis.error] }
    : { ok: true, errors: [] };
}

export function inspectGeoJsonAdmission({ encodedBytes, featureCollection }) {
  if (!Number.isSafeInteger(encodedBytes) || encodedBytes < 0) {
    throw new TypeError("GeoJSON encodedBytes must be a non-negative safe integer.");
  }
  const analysis = analyzeFeatureCollection(featureCollection, { stopAtAdmission: true });
  if (analysis.error) {
    throw new Error(`GeoJSON admission inspection requires schema-valid input: ${analysis.error.message}`);
  }
  return admissionForFacts(factsFromAnalysis(encodedBytes, analysis));
}

export function validateGeoJson(input, options = {}) {
  options = options && typeof options === "object" && !Array.isArray(options)
    ? options
    : {};
  const prepared = prepareInput(input);
  if (prepared.byteRejected) {
    return {
      // No schema failure has been established because the byte admission gate
      // deliberately prevents parsing this candidate.
      schema: { ok: true, errors: [] },
      admission: admissionForFacts({
        encodedBytes: prepared.encodedBytes,
        features: 0,
        totalPositions: 0,
        renderableFragments: 0,
      }),
      summary: null,
    };
  }
  if (prepared.error) {
    return {
      schema: { ok: false, errors: [prepared.error] },
      admission: null,
      summary: null,
    };
  }

  const analysis = analyzeFeatureCollection(prepared.value, { stopAtAdmission: true });
  if (analysis.error) {
    return {
      schema: { ok: false, errors: [analysis.error] },
      admission: null,
      summary: null,
    };
  }

  const encodedBytes = prepared.encodedBytes ?? encodedSize(prepared.value);
  const facts = factsFromAnalysis(encodedBytes, analysis);
  const admission = admissionForFacts(facts);
  const compatibility = selectedJoinCompatibility(
    prepared.value,
    options.selectedJoinProperty,
  );
  return {
    schema: { ok: true, errors: [] },
    admission,
    summary: admission.status === "rejected"
      ? null
      : summaryFromAnalysis(encodedBytes, analysis, options),
    ...(compatibility ? { compatibility } : {}),
  };
}

function prepareInput(input) {
  if (typeof input === "string") {
    const encodedBytes = new TextEncoder().encode(input).byteLength;
    if (encodedBytes >= GEOJSON_LIMITS.encodedBytes.hardMin) {
      return { encodedBytes, byteRejected: true };
    }
    try {
      return { encodedBytes, value: JSON.parse(input) };
    } catch {
      return {
        encodedBytes,
        error: schemaError("invalid-json", "$", "GeoJSON text must contain valid JSON."),
      };
    }
  }
  return { value: input, encodedBytes: null };
}

function analyzeFeatureCollection(value, { stopAtAdmission = false } = {}) {
  const state = {
    featureCount: 0,
    geometryTypeCounts: new Map(),
    bounds: null,
    propertyKeys: new Set(),
    totalPositions: 0,
    renderableFragments: 0,
    maxPositionsPerFeature: 0,
    stopAtAdmission,
  };
  try {
    const rootEntries = dataEntries(value, "$", "FeatureCollection");
    rejectUnknown(rootEntries, FEATURE_COLLECTION_KEYS, "$", "FeatureCollection");
    if (entryValue(rootEntries, "type") !== "FeatureCollection") {
      fail("feature-collection-type", "$.type", 'GeoJSON root type must be "FeatureCollection".');
    }
    validateBbox(entryValue(rootEntries, "bbox"), "$.bbox");
    const features = denseArray(entryValue(rootEntries, "features"), "$.features");
    if (features.length === 0) {
      fail("feature-minimum", "$.features", "GeoJSON FeatureCollection must contain at least one Feature.");
    }
    state.featureCount = features.length;
    if (stopAtAdmission && features.length >= GEOJSON_LIMITS.features.hardMin) {
      return state;
    }

    for (let index = 0; index < features.length; index += 1) {
      const path = `$.features[${index}]`;
      const entries = dataEntries(features[index], path, "Feature");
      rejectUnknown(entries, FEATURE_KEYS, path, "Feature");
      if (entryValue(entries, "type") !== "Feature") {
        fail("feature-type", `${path}.type`, 'GeoJSON feature type must be "Feature".');
      }
      validateBbox(entryValue(entries, "bbox"), `${path}.bbox`);
      const id = entryValue(entries, "id");
      if (id !== undefined && typeof id !== "string" && !(typeof id === "number" && Number.isFinite(id))) {
        fail("feature-id", `${path}.id`, "GeoJSON Feature id must be text or a finite number.");
      }
      const geometry = entryValue(entries, "geometry");
      let measured = { positions: 0, fragments: 0 };
      if (geometry === null) {
        increment(state.geometryTypeCounts, "null");
      } else {
        measured = analyzeGeometry(geometry, `${path}.geometry`, state);
      }
      state.maxPositionsPerFeature = Math.max(state.maxPositionsPerFeature, measured.positions);
      const properties = entryValue(entries, "properties");
      if (properties !== null) {
        validatePropertyData(properties, `${path}.properties`, state.propertyKeys);
      }
    }
    if (state.encodedBytes === null) state.encodedBytes = 0;
    return state;
  } catch (error) {
    if (error?.geoJsonAdmissionStop) return state;
    if (error?.geoJsonSchemaError) return { error: error.geoJsonSchemaError };
    return {
      error: schemaError(
        "invalid-data-shape",
        "$",
        error instanceof Error ? error.message : "GeoJSON data shape is invalid.",
      ),
    };
  }
}

function analyzeGeometry(geometry, path, state) {
  const entries = dataEntries(geometry, path, "geometry");
  const type = entryValue(entries, "type");
  if (type === "GeometryCollection") {
    fail(
      "geometry-collection-unsupported",
      `${path}.type`,
      "GeometryCollection is unsupported by the current GeoJSON runtime.",
    );
  }
  if (!SUPPORTED_GEOMETRY_TYPES.has(type)) {
    fail("geometry-type", `${path}.type`, "GeoJSON geometry type is unsupported.");
  }
  rejectUnknown(entries, GEOMETRY_KEYS, path, `${type} geometry`);
  validateBbox(entryValue(entries, "bbox"), `${path}.bbox`);
  const coordinates = entryValue(entries, "coordinates");
  let positions = 0;
  let fragments = 0;

  if (type === "Point") {
    positions = validatePosition(coordinates, `${path}.coordinates`, state);
  } else if (type === "MultiPoint") {
    positions = validatePositionList(coordinates, `${path}.coordinates`, 1, state, "point-minimum");
  } else if (type === "LineString") {
    positions = validatePositionList(coordinates, `${path}.coordinates`, 2, state, "line-minimum");
    fragments = 1;
    includeFragments(state, 1);
  } else if (type === "MultiLineString") {
    const lines = denseArray(coordinates, `${path}.coordinates`);
    if (lines.length === 0) fail("line-minimum", `${path}.coordinates`, "MultiLineString must contain at least one line.");
    includeFragments(state, lines.length);
    for (let index = 0; index < lines.length; index += 1) {
      positions += validatePositionList(lines[index], `${path}.coordinates[${index}]`, 2, state, "line-minimum");
    }
    fragments = lines.length;
  } else if (type === "Polygon") {
    const measured = validatePolygon(coordinates, `${path}.coordinates`, state);
    positions = measured.positions;
    fragments = measured.rings;
  } else {
    const polygons = denseArray(coordinates, `${path}.coordinates`);
    if (polygons.length === 0) fail("polygon-shape", `${path}.coordinates`, "MultiPolygon must contain at least one Polygon.");
    for (let index = 0; index < polygons.length; index += 1) {
      const measured = validatePolygon(polygons[index], `${path}.coordinates[${index}]`, state);
      positions += measured.positions;
      fragments += measured.rings;
    }
  }

  increment(state.geometryTypeCounts, type);
  return { positions, fragments };
}

function validatePolygon(value, path, state) {
  const rings = denseArray(value, path);
  if (rings.length === 0) fail("polygon-shape", path, "Polygon must contain at least one linear ring.");
  if (!Array.isArray(rings[0]) || !Array.isArray(rings[0][0])) {
    fail("polygon-shape", path, "Polygon coordinates must contain linear rings of positions.");
  }
  let positions = 0;
  for (let ringIndex = 0; ringIndex < rings.length; ringIndex += 1) {
    includeFragments(state, 1);
    const ringPath = `${path}[${ringIndex}]`;
    const ringPositions = denseArray(rings[ringIndex], ringPath);
    if (ringPositions.length < 4) fail("ring-minimum", ringPath, "Linear ring must contain at least four positions.");
    let first;
    let last;
    for (let positionIndex = 0; positionIndex < ringPositions.length; positionIndex += 1) {
      const position = validatePositionValue(
        ringPositions[positionIndex],
        `${ringPath}[${positionIndex}]`,
        state,
      );
      first ??= position;
      last = position;
      positions += 1;
    }
    if (first.length !== last.length || first.some((coordinate, index) => coordinate !== last[index])) {
      fail("ring-closure", ringPath, "Linear ring must be closed across every coordinate dimension.");
    }
  }
  return { positions, rings: rings.length };
}

function validatePositionList(value, path, minimum, state, code) {
  const positions = denseArray(value, path);
  if (positions.length < minimum) {
    fail(code, path, `Coordinate list must contain at least ${minimum} positions.`);
  }
  for (let index = 0; index < positions.length; index += 1) {
    validatePositionValue(positions[index], `${path}[${index}]`, state);
  }
  return positions.length;
}

function validatePosition(value, path, state) {
  validatePositionValue(value, path, state);
  return 1;
}

function validatePositionValue(value, path, state) {
  const position = denseArray(value, path);
  if (position.length < 2 || position.some((coordinate) => typeof coordinate !== "number" || !Number.isFinite(coordinate))) {
    fail("position-coordinate", path, "Position must contain at least two finite numbers.");
  }
  includePosition(state, position);
  return position;
}

function validatePropertyData(properties, path, propertyKeys) {
  const rootEntries = dataEntries(properties, path, "properties");
  for (const [key] of rootEntries) propertyKeys.add(key);
  const stack = rootEntries.map(([key, value]) => ({ value, path: `${path}.${key}` }));
  while (stack.length > 0) {
    const current = stack.pop();
    if (isJsonScalar(current.value)) continue;
    if (Array.isArray(current.value)) {
      const values = denseArray(current.value, current.path);
      for (let index = 0; index < values.length; index += 1) {
        stack.push({ value: values[index], path: `${current.path}[${index}]` });
      }
      continue;
    }
    const entries = dataEntries(current.value, current.path, "property value");
    for (const [key, value] of entries) stack.push({ value, path: `${current.path}.${key}` });
  }
}

function validateBbox(value, path) {
  if (value === undefined) return;
  const bbox = denseArray(value, path);
  if (bbox.length < 4 || bbox.length % 2 !== 0 || bbox.some((entry) => typeof entry !== "number" || !Number.isFinite(entry))) {
    fail("bbox-shape", path, "GeoJSON bbox must contain an even number of finite coordinate bounds.");
  }
}

function factsFromAnalysis(encodedBytes, analysis) {
  return {
    encodedBytes,
    features: analysis.featureCount,
    totalPositions: analysis.totalPositions,
    renderableFragments: analysis.renderableFragments,
  };
}

function admissionForFacts(facts) {
  const warnings = [];
  const violations = [];
  for (const key of SOURCE_GEOJSON_LIMIT_KEYS) {
    if (facts[key] >= GEOJSON_LIMITS[key].hardMin) violations.push(key);
    else if (facts[key] >= GEOJSON_LIMITS[key].warningMin) warnings.push(key);
  }
  return {
    status: violations.length > 0 ? "rejected" : warnings.length > 0 ? "warning" : "normal",
    facts,
    warnings,
    violations,
  };
}

function summaryFromAnalysis(encodedBytes, analysis, options) {
  const summary = {
    featureCount: analysis.featureCount,
    geometryTypeCounts: Object.fromEntries([...analysis.geometryTypeCounts].sort(([left], [right]) => left.localeCompare(right))),
    boundingBox: analysis.bounds,
    propertyKeys: [...analysis.propertyKeys].sort((left, right) => left.localeCompare(right)),
    encodedBytes: encodedBytes ?? 0,
    totalPositions: analysis.totalPositions,
    renderableFragments: analysis.renderableFragments,
  };
  if (options.includeDiagnostics === true) {
    summary.diagnostics = { maxPositionsPerFeature: analysis.maxPositionsPerFeature };
  }
  return summary;
}

function selectedJoinCompatibility(featureCollection, selectedJoinProperty) {
  if (selectedJoinProperty === undefined) return null;
  if (typeof selectedJoinProperty !== "string" || selectedJoinProperty.trim() === "") {
    throw new TypeError("selectedJoinProperty must be non-empty text.");
  }
  let present = 0;
  let usable = 0;
  for (const feature of featureCollection.features) {
    const properties = feature.properties;
    if (properties !== null && Object.hasOwn(properties, selectedJoinProperty)) {
      present += 1;
      if (isUsableJoinValue(properties[selectedJoinProperty])) usable += 1;
    }
  }
  if (present === 0) {
    return compatibilityError(
      "selected-join-field-absent",
      selectedJoinProperty,
      `Selected join property "${selectedJoinProperty}" is absent.`,
    );
  }
  if (usable === 0) {
    return compatibilityError(
      "zero-join-coverage",
      selectedJoinProperty,
      `Selected join property "${selectedJoinProperty}" has zero usable coverage.`,
    );
  }
  return { ok: true, errors: [] };
}

function compatibilityError(code, property, message) {
  return {
    ok: false,
    errors: [{ code, path: `features[*].properties.${property}`, message }],
  };
}

function dataEntries(value, path, description) {
  if (
    value === null
    || typeof value !== "object"
    || Array.isArray(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
    || Object.getOwnPropertySymbols(value).length > 0
  ) {
    fail("object-shape", path, `GeoJSON ${description} must be an ordinary data object.`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const entries = [];
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (DANGEROUS_KEYS.has(key)) fail("unsafe-property", `${path}.${key}`, `GeoJSON contains unsafe property "${key}".`);
    if (!Object.hasOwn(descriptor, "value") || !descriptor.enumerable) {
      fail("data-property", `${path}.${key}`, "GeoJSON properties must be enumerable data properties.");
    }
    entries.push([key, descriptor.value]);
  }
  return entries;
}

function denseArray(value, path) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || Object.getOwnPropertySymbols(value).length > 0) {
    fail("array-shape", path, "GeoJSON coordinate and collection arrays must be ordinary dense arrays.");
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const values = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = descriptors[index];
    if (!descriptor || !Object.hasOwn(descriptor, "value") || !descriptor.enumerable) {
      fail("array-shape", path, "GeoJSON coordinate and collection arrays must be ordinary dense arrays.");
    }
    values.push(descriptor.value);
  }
  const namedKeys = Object.keys(descriptors).filter((key) => key !== "length" && !/^(?:0|[1-9]\d*)$/.test(key));
  if (namedKeys.length > 0) fail("array-shape", path, "GeoJSON arrays cannot contain named properties.");
  return values;
}

function rejectUnknown(entries, allowed, path, description) {
  for (const [key] of entries) {
    if (!allowed.has(key)) fail("unknown-property", `${path}.${key}`, `Unknown ${description} property "${key}".`);
  }
}

function entryValue(entries, key) {
  return entries.find(([entryKey]) => entryKey === key)?.[1];
}

function includePosition(state, position) {
  const x = position[0];
  const y = position[1];
  if (state.bounds === null) state.bounds = [x, y, x, y];
  else {
    state.bounds[0] = Math.min(state.bounds[0], x);
    state.bounds[1] = Math.min(state.bounds[1], y);
    state.bounds[2] = Math.max(state.bounds[2], x);
    state.bounds[3] = Math.max(state.bounds[3], y);
  }
  state.totalPositions += 1;
  if (
    state.stopAtAdmission
    && state.totalPositions >= GEOJSON_LIMITS.totalPositions.hardMin
  ) {
    stopAdmission();
  }
}

function includeFragments(state, count) {
  state.renderableFragments += count;
  if (
    state.stopAtAdmission
    && state.renderableFragments >= GEOJSON_LIMITS.renderableFragments.hardMin
  ) {
    stopAdmission();
  }
}

function increment(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function isJsonScalar(value) {
  return value === null || typeof value === "string" || typeof value === "boolean"
    || (typeof value === "number" && Number.isFinite(value));
}

function isUsableJoinValue(value) {
  return (typeof value === "string" && value.trim() !== "")
    || (typeof value === "number" && Number.isFinite(value))
    || typeof value === "boolean";
}

function encodedSize(value) {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

function schemaError(code, path, message) {
  return { code, path, message };
}

function fail(code, path, message) {
  const error = new Error(message);
  error.geoJsonSchemaError = schemaError(code, path, message);
  throw error;
}

function stopAdmission() {
  const error = new Error("GeoJSON admission hard limit reached.");
  error.geoJsonAdmissionStop = true;
  throw error;
}
