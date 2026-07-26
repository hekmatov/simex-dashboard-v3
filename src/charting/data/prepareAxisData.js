import {
  aggregateNumbers,
  applyMissingStrategy,
  bindingField,
  clusterValueAndKey,
  consolidateCandidates,
  firstRoleBinding,
  groupMetadata,
  readRoleValue,
  roleBindings,
  stableKey,
} from "./transforms.js";

export function prepareAxisData({ chart, rows, datasetProfile, transformed }) {
  const measurements = roleBindings(chart, "measurements");
  const observation = firstRoleBinding(chart, "observation");
  const clusters = roleBindings(chart, "cluster");
  const label = firstRoleBinding(chart, "label");
  const candidates = [];

  for (const row of rows) {
    const x = readRoleValue(row, observation, datasetProfile);
    const cluster = clusterValueAndKey(row, clusters, datasetProfile);
    const group = groupMetadata(row, transformed, datasetProfile);
    for (const measurement of measurements) {
      const missing = applyMissingStrategy(readRoleValue(row, measurement, datasetProfile), transformed.config.missingStrategy);
      if (!missing.keep) continue;
      candidates.push({
        x,
        value: missing.value,
        measure: bindingField(measurement),
        measureLabel: measurement?.label ?? bindingField(measurement),
        cluster: cluster.cluster,
        clusterKey: cluster.clusterKey,
        label: readRoleValue(row, label, datasetProfile),
        axis: measurement?.axis === "secondary" || measurement?.yAxisIndex === 1 ? "secondary" : "primary",
        ...group,
      });
    }
  }

  const consolidated = consolidateCandidates(
    candidates,
    (mark) => stableKey(mark.x, mark.measure, mark.clusterKey, mark.label, mark.groupKey),
    transformed,
    (group, method) => ({ ...group[0], value: aggregateNumbers(group.map(({ value }) => value), method) }),
  );
  return {
    ...consolidated,
    meta: {
      axes: {
        primary: measurements.filter((binding) => binding?.axis !== "secondary" && binding?.yAxisIndex !== 1).map(bindingField),
        secondary: measurements.filter((binding) => binding?.axis === "secondary" || binding?.yAxisIndex === 1).map(bindingField),
      },
    },
  };
}
