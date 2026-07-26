import {
  aggregateNumbers,
  applyMissingStrategy,
  consolidateCandidates,
  error,
  firstRoleBinding,
  readRoleValue,
  stableKey,
} from "./transforms.js";

export function prepareTargetData({ schema, chart, rows, datasetProfile, transformed }) {
  if (schema.typeId === "deltaCard" || schema.typeId === "deltaList") {
    return prepareDeltaData({ schema, chart, rows, datasetProfile, transformed });
  }
  const valueRole = firstRoleBinding(chart, "value");
  const actualRole = firstRoleBinding(chart, "actual");
  const targetRole = firstRoleBinding(chart, "target");
  const entityRole = firstRoleBinding(chart, "entity");
  const labelRole = firstRoleBinding(chart, "label");
  const timeRole = firstRoleBinding(chart, "time");
  const marks = [];
  for (const row of rows) {
    const primaryBinding = schema.typeId === "bullet" ? actualRole : valueRole;
    const primary = applyMissingStrategy(
      readRoleValue(row, primaryBinding, datasetProfile),
      transformed.config.missingStrategy,
    );
    const targetValue = targetRole
      ? applyMissingStrategy(readRoleValue(row, targetRole, datasetProfile), transformed.config.missingStrategy)
      : { keep: true, value: null };
    if (!primary.keep || !targetValue.keep) continue;
    const identity = {
      entity: readRoleValue(row, entityRole, datasetProfile),
      label: readRoleValue(row, labelRole, datasetProfile),
    };
    marks.push(schema.typeId === "bullet"
      ? {
          actual: primary.value,
          target: targetValue.value,
          ...identity,
          time: readRoleValue(row, timeRole, datasetProfile),
        }
      : {
          value: primary.value,
          target: targetValue.value,
          ...identity,
          time: readRoleValue(row, timeRole, datasetProfile),
        }
    );
  }
  return consolidateCandidates(
    marks,
    (mark) => stableKey(mark.time, mark.entity, mark.label),
    transformed,
    (duplicates, method) => (
      schema.typeId === "bullet"
        ? {
            ...duplicates[0],
            actual: aggregateNumbers(duplicates.map(({ actual }) => actual), method),
            target: aggregateNumbers(duplicates.map(({ target: value }) => value), method),
          }
        : {
            ...duplicates[0],
            value: aggregateNumbers(duplicates.map(({ value }) => value), method),
            target: aggregateNumbers(duplicates.map(({ target: value }) => value), method),
          }
    ),
  );
}

function prepareDeltaData({ schema, chart, rows, datasetProfile, transformed }) {
  const measurement = firstRoleBinding(chart, "measurement");
  const entity = firstRoleBinding(chart, "entity");
  const time = firstRoleBinding(chart, "time");
  const target = firstRoleBinding(chart, "target");
  const candidates = [];
  for (const row of rows) {
    const primary = applyMissingStrategy(
      readRoleValue(row, measurement, datasetProfile),
      transformed.config.missingStrategy,
    );
    const targetValue = target
      ? applyMissingStrategy(readRoleValue(row, target, datasetProfile), transformed.config.missingStrategy)
      : { keep: true, value: null };
    if (!primary.keep || !targetValue.keep) continue;
    const entityValue = readRoleValue(row, entity, datasetProfile);
    const timeValue = readRoleValue(row, time, datasetProfile);
    if (timeValue === null) continue;
    candidates.push({
      entity: entityValue,
      value: primary.value,
      time: timeValue,
      target: targetValue.value,
    });
  }
  if (schema.typeId === "deltaCard" && entity) {
    const entities = new Set(candidates.map(({ entity: value }) => stableKey(value)));
    if (entities.size > 1) {
      return {
        marks: [],
        diagnostics: [error(
          "delta-card-multiple-entities",
          "Filter one entity for a delta card, or use a delta list to compare multiple entities.",
          { entityCount: entities.size },
        )],
        duplicateGroupCount: 0,
      };
    }
  }
  const consolidated = consolidateCandidates(
    candidates,
    (observation) => stableKey(observation.entity, observation.time),
    transformed,
    (duplicates, method) => ({
      ...duplicates[0],
      value: aggregateNumbers(duplicates.map(({ value }) => value), method),
      target: aggregateNumbers(duplicates.map(({ target: value }) => value), method),
    }),
  );
  if (consolidated.diagnostics.some(({ severity }) => severity === "error")) return consolidated;

  const groups = new Map();
  for (const observation of consolidated.marks) {
    const key = stableKey(observation.entity);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(observation);
  }
  const marks = [];
  for (const observations of groups.values()) {
    observations.sort((left, right) => String(left.time).localeCompare(String(right.time)));
    if (observations.length < 2) continue;
    const comparison = observations.at(-2);
    const displayed = observations.at(-1);
    const comparable = Number.isFinite(displayed.value) && Number.isFinite(comparison.value);
    const absolute = comparable ? displayed.value - comparison.value : null;
    marks.push({
      entity: displayed.entity,
      time: displayed.time,
      displayedTime: displayed.time,
      comparisonTime: comparison.time,
      displayed: displayed.value,
      comparison: comparison.value,
      target: displayed.target,
      delta: {
        absolute,
        percentage: !comparable || comparison.value === 0 ? null : (absolute / Math.abs(comparison.value)) * 100,
      },
    });
  }
  return {
    marks,
    diagnostics: consolidated.diagnostics,
    duplicateGroupCount: consolidated.duplicateGroupCount,
  };
}
