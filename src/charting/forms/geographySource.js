import { getChartSchema } from "../schemas/chartSchemaRegistry.js";
import {
  analyzeGeographyJoin,
  geographyPropertyFields,
} from "../data/geographyJoin.js";

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
  const current = chart.presentation?.map ?? {};
  const mapWithoutJoin = {
    geoSource: sourceId,
    scale: typeof current.scale === "string" && current.scale.trim()
      ? current.scale
      : "sequential",
  };
  const candidate = chartWithMap(chart, mapWithoutJoin);
  const analysis = analyzeGeographyJoin({
    chart: candidate,
    rows,
    geoData,
  });
  const map = analysis.status === "ready" && analysis.joinField
    ? { ...mapWithoutJoin, joinField: analysis.joinField }
    : mapWithoutJoin;
  return chartWithMap(chart, map);
}

export function applyGeographyRoleSelection(chart, {
  geoData,
  rows = [],
} = {}) {
  const schema = getChartSchema(chart?.typeId);
  if (schema.dataFamily !== "geography") return structuredClone(chart);
  const current = chart?.presentation?.map;
  if (
    typeof current?.geoSource !== "string"
    || current.geoSource.trim() === ""
  ) {
    return structuredClone(chart);
  }
  const analysis = analyzeGeographyJoin({ chart, rows, geoData });
  if (analysis.status === "ready") {
    return chartWithMap(chart, {
      ...current,
      ...(analysis.joinField ? { joinField: analysis.joinField } : {}),
    });
  }
  const mapWithoutJoin = { ...current };
  delete mapWithoutJoin.joinField;
  const fallback = analyzeGeographyJoin({
    chart: chartWithMap(chart, mapWithoutJoin),
    rows,
    geoData,
  });
  return chartWithMap(chart, {
    ...mapWithoutJoin,
    ...(fallback.status === "ready" && fallback.joinField
      ? { joinField: fallback.joinField }
      : {}),
  });
}

export function geoJoinFieldOptions(geoData) {
  return geographyPropertyFields(geoData).map((field) => ({
    value: field,
    label: field,
  }));
}

function chartWithMap(chart, map) {
  return {
    ...structuredClone(chart),
    presentation: {
      ...structuredClone(chart.presentation ?? {}),
      map,
    },
  };
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
