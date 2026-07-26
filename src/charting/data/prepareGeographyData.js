import {
  aggregateNumbers,
  applyMissingStrategy,
  consolidateCandidates,
  firstRoleBinding,
  readRoleValue,
  stableKey,
} from "./transforms.js";

export function prepareGeographyData({ chart, rows, datasetProfile, geography, transformed }) {
  const geographyRole = firstRoleBinding(chart, "geography");
  const value = firstRoleBinding(chart, "value");
  const time = firstRoleBinding(chart, "time");
  const candidates = [];
  for (const row of rows) {
    const missing = applyMissingStrategy(readRoleValue(row, value, datasetProfile), transformed.config.missingStrategy);
    if (!missing.keep) continue;
    const geographyValue = readRoleValue(row, geographyRole, datasetProfile);
    candidates.push({
      geography: geographyValue,
      value: missing.value,
      time: readRoleValue(row, time, datasetProfile),
      feature: geography?.featuresById?.[geographyValue] ?? null,
    });
  }
  return consolidateCandidates(
    candidates,
    (mark) => stableKey(mark.geography, mark.time),
    transformed,
    (group, method) => ({ ...group[0], value: aggregateNumbers(group.map(({ value: item }) => item), method) }),
  );
}
