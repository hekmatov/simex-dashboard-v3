import {
  aggregateNumbers,
  applyMissingStrategy,
  consolidateCandidates,
  firstRoleBinding,
  groupMetadata,
  readRoleValue,
  stableKey,
} from "./transforms.js";

export function prepareMatrixData({ chart, rows, datasetProfile, transformed }) {
  const rowRole = firstRoleBinding(chart, "row");
  const column = firstRoleBinding(chart, "column");
  const value = firstRoleBinding(chart, "value");
  const time = firstRoleBinding(chart, "time");
  const candidates = [];
  for (const sourceRow of rows) {
    const missing = applyMissingStrategy(readRoleValue(sourceRow, value, datasetProfile), transformed.config.missingStrategy);
    if (!missing.keep) continue;
    candidates.push({
      row: readRoleValue(sourceRow, rowRole, datasetProfile),
      column: readRoleValue(sourceRow, column, datasetProfile),
      value: missing.value,
      time: readRoleValue(sourceRow, time, datasetProfile),
      ...groupMetadata(sourceRow, transformed, datasetProfile),
    });
  }
  return consolidateCandidates(
    candidates,
    (mark) => stableKey(mark.row, mark.column, mark.time, mark.groupKey),
    transformed,
    (group, method) => ({ ...group[0], value: aggregateNumbers(group.map(({ value: item }) => item), method) }),
  );
}
