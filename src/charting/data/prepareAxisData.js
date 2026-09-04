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
import {
  profileColumn as findProfileColumn,
  resolveEffectiveBinding as effectiveBinding,
} from "./bindings.js";

export function prepareAxisData({ chart, rows, datasetProfile, transformed }) {
  const measurements = roleBindings(chart, "measurements");
  const observation = firstRoleBinding(chart, "observation");
  const observationBinding = effectiveBinding(
    observation,
    findProfileColumn(datasetProfile, bindingField(observation)),
  );
  const clusters = roleBindings(chart, "cluster");
  const label = firstRoleBinding(chart, "label");
  const candidates = [];
  const pivotMeasures = transformed.config.pivot?.mode === "measuresToRows";

  for (const row of rows) {
    const x = readRoleValue(row, observation, datasetProfile);
    const cluster = clusterValueAndKey(row, clusters, datasetProfile);
    const group = groupMetadata(row, transformed, datasetProfile);
    for (const measurement of measurements) {
      const missing = applyMissingStrategy(readRoleValue(row, measurement, datasetProfile), transformed.config.missingStrategy);
      if (!missing.keep) continue;
      const pivotCluster = pivotClusterValue(x, cluster);
      candidates.push({
        x: pivotMeasures ? measurement?.label ?? bindingField(measurement) : x,
        value: missing.value,
        measure: pivotMeasures ? "__pivot_value__" : bindingField(measurement),
        measureLabel: pivotMeasures ? "" : measurement?.label ?? bindingField(measurement),
        cluster: pivotMeasures ? pivotCluster.cluster : cluster.cluster,
        clusterKey: pivotMeasures ? pivotCluster.clusterKey : cluster.clusterKey,
        label: readRoleValue(row, label, datasetProfile),
        axis: pivotMeasures ? "primary" : measurement?.axis === "secondary" || measurement?.yAxisIndex === 1 ? "secondary" : "primary",
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
      axisInterpretation: observationBinding.type,
      ...(typeof observationBinding.temporal?.format === "string"
        ? { axisTemporalFormat: observationBinding.temporal.format }
        : {}),
      axes: {
        primary: pivotMeasures
          ? ["__pivot_value__"]
          : measurements.filter((binding) => binding?.axis !== "secondary" && binding?.yAxisIndex !== 1).map(bindingField),
        secondary: pivotMeasures
          ? []
          : measurements.filter((binding) => binding?.axis === "secondary" || binding?.yAxisIndex === 1).map(bindingField),
      },
    },
  };
}

function pivotClusterValue(observation, cluster) {
  if (cluster.cluster === null || cluster.cluster === undefined) {
    return { cluster: observation, clusterKey: stableKey(observation) };
  }
  const values = Array.isArray(cluster.cluster)
    ? [observation, ...cluster.cluster]
    : [observation, cluster.cluster];
  return { cluster: values, clusterKey: stableKey(...values) };
}
