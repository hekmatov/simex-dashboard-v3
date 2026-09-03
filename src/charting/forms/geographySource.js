import { getChartSchema } from "../schemas/chartSchemaRegistry.js";
import {
  analyzeGeographyJoin,
  geographyPropertyFields,
} from "../data/geographyJoin.js";
import {
  GEOGRAPHY_BINDING_CONTRACT,
} from "../data/geographyBindingContract.js";
import { listManageableSourceEntries } from "../../content-library/sourceEntrySchema.js";

const GEO_SOURCE_FIELD =
  GEOGRAPHY_BINDING_CONTRACT.data_source.presentation_field;
const JOIN_FIELD =
  GEOGRAPHY_BINDING_CONTRACT.join.presentation_field;

export function validatedGeoSourceOptions(dataSources, geoDataSources, sourceEntries) {
  const sources = collectionEntries(dataSources);
  const managedSourceIds = sourceEntries === undefined
    ? null
    : new Set(listManageableSourceEntries(
      { sourceEntries: collectionObject(sourceEntries) },
      collectionObject(dataSources),
    ).filter(({ kind }) => kind === "geojson").map(({ sourceId }) => sourceId));
  return sources.flatMap(([sourceId, source]) => {
    const geoData = readEntry(geoDataSources, sourceId);
    if (
      (managedSourceIds !== null && !managedSourceIds.has(sourceId))
      ||
      !isEligibleGeoJsonDescriptor(source)
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

function isEligibleGeoJsonDescriptor(source) {
  return source?.kind === GEOGRAPHY_BINDING_CONTRACT.data_source.descriptor_kind
    || (source?.kind === "dataset" && source?.type === "uploadedGeoJson");
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
  const mapWithoutJoin = {
    [GEO_SOURCE_FIELD]: sourceId,
  };
  const candidate = chartWithMap(chart, mapWithoutJoin);
  const analysis = analyzeGeographyJoin({
    chart: candidate,
    rows,
    geoData,
  });
  const map = analysis.status === "ready" && analysis.joinField
    ? { ...mapWithoutJoin, [JOIN_FIELD]: analysis.joinField }
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
    typeof current?.[GEO_SOURCE_FIELD] !== "string"
    || current[GEO_SOURCE_FIELD].trim() === ""
  ) {
    return structuredClone(chart);
  }
  const analysis = analyzeGeographyJoin({ chart, rows, geoData });
  if (analysis.status === "ready") {
    return chartWithMap(chart, {
      ...current,
      ...(analysis.joinField ? { [JOIN_FIELD]: analysis.joinField } : {}),
    });
  }
  const mapWithoutJoin = { ...current };
  delete mapWithoutJoin[JOIN_FIELD];
  const fallback = analyzeGeographyJoin({
    chart: chartWithMap(chart, mapWithoutJoin),
    rows,
    geoData,
  });
  return chartWithMap(chart, {
    ...mapWithoutJoin,
    ...(fallback.status === "ready" && fallback.joinField
      ? { [JOIN_FIELD]: fallback.joinField }
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

function collectionObject(value) {
  if (value instanceof Map) return Object.fromEntries(value);
  return isRecord(value) ? value : {};
}

function readEntry(collection, key) {
  if (collection instanceof Map) return collection.get(key);
  return isRecord(collection) ? collection[key] : undefined;
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
