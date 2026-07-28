import {
  aggregateNumbers,
  applyMissingStrategy,
  consolidateCandidates,
  firstRoleBinding,
  groupMetadata,
  readRoleValue,
  stableKey,
} from "./transforms.js";

export function prepareCompositionData({ chart, rows, datasetProfile, transformed }) {
  const category = firstRoleBinding(chart, "category");
  const value = firstRoleBinding(chart, "value");
  const candidates = [];
  for (const row of rows) {
    const missing = applyMissingStrategy(readRoleValue(row, value, datasetProfile), transformed.config.missingStrategy);
    if (missing.keep) candidates.push({
      category: readRoleValue(row, category, datasetProfile),
      value: missing.value,
      ...groupMetadata(row, transformed, datasetProfile),
    });
  }
  const consolidated = consolidateCandidates(
    candidates,
    (mark) => stableKey(mark.category, mark.groupKey),
    transformed,
    (group, method) => ({ ...group[0], value: aggregateNumbers(group.map(({ value: item }) => item), method) }),
  );
  const total = consolidated.marks.reduce((sum, mark) => sum + (Number.isFinite(mark.value) ? mark.value : 0), 0);
  return {
    ...consolidated,
    marks: consolidated.marks.map((mark) => ({ ...mark, share: total === 0 || mark.value === null ? null : mark.value / total })),
  };
}
