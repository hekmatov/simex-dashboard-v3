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
