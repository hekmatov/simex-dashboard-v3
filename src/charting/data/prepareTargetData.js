import {
  applyMissingStrategy,
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
  const labelRole = firstRoleBinding(chart, "label");
  const timeRole = firstRoleBinding(chart, "time");
  const marks = [];
  for (const row of rows) {
    const primaryBinding = schema.typeId === "bullet" ? actualRole : valueRole;
    const primary = applyMissingStrategy(
      readRoleValue(row, primaryBinding, datasetProfile),
      transformed.config.missingStrategy,
    );
    if (!primary.keep) continue;
    marks.push(schema.typeId === "bullet"
      ? {
          actual: primary.value,
          target: readRoleValue(row, targetRole, datasetProfile),
          label: readRoleValue(row, labelRole, datasetProfile),
          time: readRoleValue(row, timeRole, datasetProfile),
        }
      : {
          value: primary.value,
          target: readRoleValue(row, targetRole, datasetProfile),
          time: readRoleValue(row, timeRole, datasetProfile),
        }
    );
  }
  return { marks, diagnostics: [], duplicateGroupCount: 0 };
}

function prepareDeltaData({ schema, chart, rows, datasetProfile, transformed }) {
  const measurement = firstRoleBinding(chart, "measurement");
  const entity = firstRoleBinding(chart, "entity");
  const time = firstRoleBinding(chart, "time");
  const target = firstRoleBinding(chart, "target");
  const groups = new Map();
  for (const row of rows) {
    const primary = applyMissingStrategy(
      readRoleValue(row, measurement, datasetProfile),
      transformed.config.missingStrategy,
    );
    if (!primary.keep) continue;
    const entityValue = readRoleValue(row, entity, datasetProfile);
    const key = schema.typeId === "deltaList" ? stableKey(entityValue) : "all";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({
      entity: entityValue,
      value: primary.value,
      time: readRoleValue(row, time, datasetProfile),
      target: readRoleValue(row, target, datasetProfile),
    });
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
      displayed: displayed.value,
      comparison: comparison.value,
      target: displayed.target,
      delta: {
        absolute,
        percentage: !comparable || comparison.value === 0 ? null : (absolute / Math.abs(comparison.value)) * 100,
      },
    });
  }
  return { marks, diagnostics: [], duplicateGroupCount: 0 };
}
