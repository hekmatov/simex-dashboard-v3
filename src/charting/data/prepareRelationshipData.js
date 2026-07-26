import {
  aggregateNumbers,
  applyMissingStrategy,
  clusterValueAndKey,
  consolidateCandidates,
  firstRoleBinding,
  readRoleValue,
  stableKey,
} from "./transforms.js";

export function prepareRelationshipData({ chart, rows, datasetProfile, transformed }) {
  const x = firstRoleBinding(chart, "x");
  const y = firstRoleBinding(chart, "y");
  const size = firstRoleBinding(chart, "size");
  const label = firstRoleBinding(chart, "label");
  const cluster = firstRoleBinding(chart, "cluster");
  const marks = [];
  for (const row of rows) {
    const xValue = applyMissingStrategy(readRoleValue(row, x, datasetProfile), transformed.config.missingStrategy);
    const yValue = applyMissingStrategy(readRoleValue(row, y, datasetProfile), transformed.config.missingStrategy);
    if (!xValue.keep || !yValue.keep) continue;
    const clustered = clusterValueAndKey(row, cluster ? [cluster] : [], datasetProfile);
    marks.push({
      x: xValue.value,
      y: yValue.value,
      size: readRoleValue(row, size, datasetProfile),
      label: readRoleValue(row, label, datasetProfile),
      cluster: clustered.cluster,
      clusterKey: clustered.clusterKey,
    });
  }
  return consolidateCandidates(
    marks,
    (mark) => stableKey(mark.x, mark.y, mark.label, mark.clusterKey),
    transformed,
    (group, method) => ({
      ...group[0],
      size: aggregateNumbers(group.map(({ size: value }) => value), method),
    }),
  );
}
