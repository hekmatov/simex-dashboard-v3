import { getChartSchema } from "../schemas/chartSchemaRegistry.js";

export function validatedGeoSourceOptions(dataSources, geoDataSources) {
  const sources = collectionEntries(dataSources);
  return sources.flatMap(([sourceId, source]) => {
    const geoData = readEntry(geoDataSources, sourceId);
    if (
      source?.kind !== "geojson"
      || geoData?.type !== "FeatureCollection"
      || !Array.isArray(geoData.features)
      || geoData.features.length === 0
    ) {
      return [];
    }
    const label = source.provenance?.label;
    return [{
      value: sourceId,
      label: typeof label === "string" && label.trim()
        ? label.trim()
        : sourceId,
    }];
  });
}

export function applyGeographySourceSelection(chart, {
  sourceId,
  geoData,
  rows = [],
} = {}) {
  const schema = getChartSchema(chart?.typeId);
  if (schema.dataFamily !== "geography") {
    throw new Error("Only geography charts can select a GeoJSON source.");
  }
  if (typeof sourceId !== "string" || sourceId.trim() === "") {
    throw new Error("Choose a GeoJSON source.");
  }
  if (
    geoData?.type !== "FeatureCollection"
    || !Array.isArray(geoData.features)
    || geoData.features.length === 0
  ) {
    throw new Error(`GeoJSON source "${sourceId}" is unavailable or invalid.`);
  }
  const joinField = inferredJoinField(chart, rows, geoData.features);
  const current = chart.presentation?.map ?? {};
  const map = {
    geoSource: sourceId,
    scale: typeof current.scale === "string" && current.scale.trim()
      ? current.scale
      : "sequential",
    ...(joinField ? { joinField } : {}),
  };
  return {
    ...structuredClone(chart),
    presentation: {
      ...structuredClone(chart.presentation ?? {}),
      map,
    },
  };
}

function inferredJoinField(chart, rows, features) {
  const geographyField = chart.roles?.geography?.field;
  if (
    typeof geographyField !== "string"
    || !Array.isArray(rows)
  ) {
    return null;
  }
  const values = new Set(rows.flatMap((row) => {
    const value = canonical(row?.[geographyField]);
    return value === null ? [] : [value];
  }));
  if (values.size === 0) return null;

  const featureIdScore = matchScore(
    values,
    features.map(({ id }) => id),
  );
  let bestField = null;
  let bestScore = featureIdScore;
  const propertyNames = new Set(features.flatMap((feature) => (
    isRecord(feature?.properties)
      ? Object.keys(feature.properties)
      : []
  )));
  for (const propertyName of propertyNames) {
    const score = matchScore(
      values,
      features.map((feature) => feature.properties?.[propertyName]),
    );
    if (score > bestScore) {
      bestField = propertyName;
      bestScore = score;
    }
  }
  return bestScore > 0 ? bestField : null;
}

function matchScore(expected, candidates) {
  const available = new Set(candidates.flatMap((value) => {
    const normalized = canonical(value);
    return normalized === null ? [] : [normalized];
  }));
  let score = 0;
  for (const value of expected) {
    if (available.has(value)) score += 1;
  }
  return score;
}

function canonical(value) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "boolean") return String(value);
  return null;
}

function collectionEntries(value) {
  if (value instanceof Map) return [...value.entries()];
  return isRecord(value) ? Object.entries(value) : [];
}

function readEntry(collection, key) {
  if (collection instanceof Map) return collection.get(key);
  return isRecord(collection) ? collection[key] : undefined;
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
