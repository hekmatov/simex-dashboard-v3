import { canonicalGeography, featureCoordinates, indexGeoFeatures } from "./geoData.js";
import {
  aggregateNumbers,
  applyMissingStrategy,
  consolidateCandidates,
  firstRoleBinding,
  groupMetadata,
  readRoleValue,
  stableKey,
  warning,
} from "./transforms.js";

export function prepareGeographyData({
  chart,
  rows,
  datasetProfile,
  geoData,
  transformed,
}) {
  const geographyRole = firstRoleBinding(chart, "geography");
  const value = firstRoleBinding(chart, "value");
  const time = firstRoleBinding(chart, "time");
  const joinField = chart.presentation?.map?.joinField ?? null;
  const { byId } = indexGeoFeatures(geoData, joinField);
  const candidates = [];
  const joinDiagnostics = [];

  for (const row of rows) {
    const missing = applyMissingStrategy(
      readRoleValue(row, value, datasetProfile),
      transformed.config.missingStrategy,
    );
    if (!missing.keep) continue;
    const geography = readRoleValue(row, geographyRole, datasetProfile);
    const feature = byId.get(canonicalGeography(geography)) ?? null;
    const coordinates = featureCoordinates(feature);
    if (!feature) {
      joinDiagnostics.push(warning(
        "geography-unmatched",
        `Geographic identifier "${geography}" did not match a GeoJSON feature.`,
        { geography },
      ));
    }
    candidates.push({
      geography,
      value: missing.value,
      time: readRoleValue(row, time, datasetProfile),
      feature,
      coordinates,
      ...groupMetadata(row, transformed, datasetProfile),
    });
  }

  const consolidated = consolidateCandidates(
    candidates,
    (mark) => stableKey(mark.geography, mark.time, mark.groupKey),
    transformed,
    (group, method) => ({
      ...group[0],
      value: aggregateNumbers(group.map(({ value: item }) => item), method),
    }),
  );
  return {
    ...consolidated,
    diagnostics: [...joinDiagnostics, ...consolidated.diagnostics],
  };
}

export function inspectGeographyJoinCoverage({ chart, rows = [], datasetProfile, geoData } = {}) {
  const geographyRole = firstRoleBinding(chart, "geography");
  const joinField = chart?.presentation?.map?.joinField ?? null;
  if (!geographyRole?.field) {
    return coverageFailure(joinField, "missing-geography-binding", "The directly dependent map has no geography field binding.");
  }
  const byId = coverageFeatureIndex(geoData, joinField);
  const identifiers = rows
    .map((row) => readRoleValue(row, geographyRole, datasetProfile))
    .map(canonicalGeography)
    .filter((value) => value !== null);
  const eligibleCount = identifiers.length;
  const matchedCount = identifiers.filter((identifier) => byId.has(identifier)).length;
  if (eligibleCount === 0) {
    return coverageFailure(joinField, "no-usable-geography-values", "The directly dependent map has no usable geography values.", eligibleCount, matchedCount);
  }
  if (matchedCount === 0) {
    return coverageFailure(joinField, "zero-usable-join-coverage", `No directly used geography values match the replacement GeoJSON${joinField ? ` through "${joinField}"` : ""}.`, eligibleCount, matchedCount);
  }
  return {
    ok: true,
    joinField,
    eligibleCount,
    matchedCount,
    coverage: matchedCount / eligibleCount,
    errors: [],
  };
}

function coverageFeatureIndex(geoData, joinField) {
  const byId = new Map();
  const features = geoData?.type === "FeatureCollection" && Array.isArray(geoData.features)
    ? geoData.features
    : geoData?.type === "Feature"
    ? [geoData]
    : Array.isArray(geoData)
    ? geoData
    : [];
  for (const feature of features) {
    for (const value of [joinField ? feature?.properties?.[joinField] : null, joinField ? feature?.[joinField] : null, feature?.id]) {
      const identifier = canonicalGeography(value);
      if (identifier !== null && !byId.has(identifier)) byId.set(identifier, feature);
    }
  }
  return byId;
}

function coverageFailure(joinField, code, message, eligibleCount = 0, matchedCount = 0) {
  return {
    ok: false,
    joinField,
    eligibleCount,
    matchedCount,
    coverage: eligibleCount > 0 ? matchedCount / eligibleCount : 0,
    errors: [{ code, message }],
  };
}
