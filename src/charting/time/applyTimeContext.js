import {
  bindingField,
  bindingList,
  profileColumn,
  readBoundValue,
} from "../data/bindings.js";
import {
  assertTimeSyncInterpolationAllowed,
  validateEffectiveTimeSyncMatching,
} from "./timeSyncModel.js";
import { matchTemporalObservation } from "./temporalMatch.js";

const TRACE_TYPES = new Set(["line", "area", "mixed", "timeline", "swimlane"]);
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const CANONICAL_INSTANT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.(\d{3})Z$/;

export function applyTimeContext({
  chart = {},
  rows = [],
  profile,
  timeContext,
  transformed,
} = {}) {
  if (!isPlaybackContext(timeContext)) {
    return inactiveProjection(rows);
  }

  if (!Number.isFinite(timeContext.activeEpochMs)) {
    return invalidProjection(
      rows,
      "invalid-time-context",
      "The active playback time must be a finite canonical timestamp.",
    );
  }
  if (!Number.isFinite(new Date(timeContext.activeEpochMs).valueOf())) {
    return invalidProjection(
      rows,
      "invalid-time-context",
      "The active playback time must be within the supported date range.",
    );
  }
  let matching;
  try {
    matching = validateEffectiveTimeSyncMatching(
      timeContext.matching,
      "Active playback group or member",
    );
  } catch (cause) {
    return invalidProjection(
      rows,
      "invalid-time-matching",
      boundedMessage(
        `Active playback requires a validated group or member matching policy. ${cause?.message ?? ""}`.trim(),
      ),
    );
  }

  const timeBinding = temporalBinding(chart);
  if (!timeBinding) {
    return invalidProjection(
      rows,
      "invalid-time-binding",
      "This synchronized chart does not have a bound temporal role.",
    );
  }

  const activeCanonical = canonicalActiveTime(
    timeContext.activeEpochMs,
    rows,
    timeBinding,
    profile,
  );
  if (matching.policy === "interpolate") {
    try {
      assertTimeSyncInterpolationAllowed({
        chart,
        timeRole: temporalRoleId(chart),
        profile,
      });
    } catch (cause) {
      return invalidProjection(
        rows,
        "invalid-time-projection",
        boundedMessage(cause?.message || "This chart does not permit interpolation."),
      );
    }
  }
  const mode = TRACE_TYPES.has(chart.typeId) ? "trace" : "snapshot";
  const groups = groupRows(chart, rows, profile, transformed, timeBinding);
  const matches = new Map();
  const projectedRows = [];
  const projectedSourceRows = new Map();
  const projectedSyntheticRows = new Map();
  const measurements = measureBindings(chart);
  const measureRows = familyForType(chart.typeId) === "axis" && measurements.length > 1
    ? new Map(measurements.map((measure) => [
        bindingField(measure),
        { measure, rows: [] },
      ]))
    : null;

  try {
    for (const [identity, group] of groups) {
      const buckets = temporalBuckets(group.rows, timeBinding, profile);
      const match = matchGroup({
        chart,
        buckets,
        measure: group.measure,
        matching,
        profile,
        activeEpochMs: timeContext.activeEpochMs,
        transformed,
      });
      const provenance = temporalProvenance(match, timeContext.activeEpochMs, activeCanonical);
      const availableBuckets = matchableBuckets(
        chart,
        buckets,
        profile,
        transformed,
        group.measure,
      );
      const record = { identity, buckets, availableBuckets, match, provenance };
      matches.set(identity, record);

      if (mode === "trace") {
        appendMeasureRows(measureRows, group.measure, group.rows);
        appendProjectedSourceRows({
          chart,
          rows: group.rows,
          measure: group.measure,
          measurements,
          projectedRows,
          projectedSourceRows,
        });
        if (match.status === "interpolated") {
          const interpolatedRow = synthesizeInterpolatedRow({
            chart,
            buckets,
            measure: group.measure,
            matching,
            profile,
            activeEpochMs: timeContext.activeEpochMs,
            activeCanonical,
            transformed,
          });
          appendMeasureRows(measureRows, group.measure, [interpolatedRow]);
          appendProjectedSyntheticRow({
            chart,
            row: interpolatedRow,
            identity: group.baseIdentity,
            measure: group.measure,
            measurements,
            projectedRows,
            projectedSyntheticRows,
          });
        }
        continue;
      }

      if (match.status === "missing") continue;
      if (match.status === "interpolated") {
        if (isDeltaChart(chart)) {
          appendDeltaHistory(
            projectedRows,
            availableBuckets,
            timeContext.activeEpochMs,
            false,
          );
        }
        const interpolatedRow = synthesizeInterpolatedRow({
          chart,
          buckets,
          measure: group.measure,
          matching,
          profile,
          activeEpochMs: timeContext.activeEpochMs,
          activeCanonical,
          transformed,
        });
        appendMeasureRows(measureRows, group.measure, [interpolatedRow]);
        appendProjectedSyntheticRow({
          chart,
          row: interpolatedRow,
          identity: group.baseIdentity,
          measure: group.measure,
          measurements,
          projectedRows,
          projectedSyntheticRows,
        });
        continue;
      }

      if (isDeltaChart(chart)) {
        appendDeltaHistory(
          projectedRows,
          availableBuckets,
          match.observation.epochMs,
          true,
        );
        continue;
      }
      appendMeasureRows(measureRows, group.measure, match.observation.rows);
      appendProjectedSourceRows({
        chart,
        rows: match.observation.rows,
        measure: group.measure,
        measurements,
        projectedRows,
        projectedSourceRows,
      });
    }
  } catch (cause) {
    return invalidProjection(
      rows,
      "invalid-time-projection",
      boundedMessage(cause?.message || "The synchronized time projection is invalid."),
    );
  }

  const statuses = [...matches.values()].map(({ match }) => match.status);
  const activeTime = {
    groupId: timeContext.groupId,
    epochMs: timeContext.activeEpochMs,
    canonical: activeCanonical,
    mode,
    status: combinedStatus(statuses),
  };
  const diagnostics = (
    mode === "snapshot"
    && projectedRows.length === 0
    && statuses.length > 0
    && statuses.every((status) => status === "missing")
  )
    ? [warning(
        "no-measurement-at-active-time",
        `No measurement at this time (${activeCanonical}). Change the playback time or matching policy.`,
      )]
    : [];

  return {
    active: true,
    rows: projectedRows,
    rowsAfterTimeContext: projectedRows.length,
    diagnostics,
    matches,
    activeTime,
    timeBinding,
    ...(measureRows ? { measureRows } : {}),
    transformed,
  };
}

export function applyTemporalProvenance({ chart = {}, prepared = {}, projection }) {
  if (!projection?.active) return prepared;
  const marks = (prepared.marks ?? []).map((sourceMark) => {
    const mark = projection.activeTime.mode === "snapshot"
      ? projectSnapshotMarkTime(chart, sourceMark, projection.activeTime.canonical)
      : sourceMark;
    const record = projection.matches.get(markIdentity(chart, mark));
    const provenance = record?.provenance ?? missingProvenance(projection.activeTime);
    const active = projection.activeTime.mode === "snapshot"
      ? provenance.status !== "missing"
      : traceMarkIsActive(chart, mark, record);
    return {
      ...mark,
      active,
      temporalProvenance: isDeltaChart(chart) && sourceMark.comparisonProvenance
        ? { ...provenance, comparison: sourceMark.comparisonProvenance }
        : provenance,
    };
  });
  return {
    ...prepared,
    marks,
    meta: {
      ...(prepared.meta ?? {}),
      activeTime: projection.activeTime,
    },
  };
}

function groupRows(chart, rows, profile, transformed, timeBinding) {
  const groups = new Map();
  const measurements = familyForType(chart.typeId) === "axis"
    ? measureBindings(chart)
    : [];
  const groupMeasurements = measurements.length > 0 ? measurements : [null];
  for (const row of rows) {
    const baseIdentity = rowIdentity(chart, row, profile, transformed, timeBinding);
    for (const measure of groupMeasurements) {
      const identity = rowIdentity(chart, row, profile, transformed, timeBinding, measure);
      if (!groups.has(identity)) {
        groups.set(identity, { baseIdentity, measure, rows: [] });
      }
      groups.get(identity).rows.push(row);
    }
  }
  return groups;
}

function temporalBuckets(rows, timeBinding, profile) {
  const byEpoch = new Map();
  for (const row of rows) {
    const canonical = readBoundValue(row, timeBinding, profile);
    const epochMs = canonicalEpochMs(canonical);
    if (!Number.isFinite(epochMs)) continue;
    if (!byEpoch.has(epochMs)) {
      byEpoch.set(epochMs, { epochMs, canonical, rows: [] });
    }
    byEpoch.get(epochMs).rows.push(row);
  }
  return [...byEpoch.values()].sort((left, right) => left.epochMs - right.epochMs);
}

function matchGroup({
  chart,
  buckets,
  measure: selectedMeasure,
  matching,
  profile,
  activeEpochMs,
  transformed,
}) {
  const measure = selectedMeasure ?? measureBindings(chart)[0] ?? null;
  const interpolationAllowed = measure ? bindingAllowsInterpolation(measure, profile) : false;
  const observations = matchableBuckets(
    chart,
    buckets,
    profile,
    transformed,
    measure,
  ).map((bucket) => ({
      ...bucket,
      value: measure
        ? bucketMeasureValue(bucket, measure, profile, transformed)
        : 0,
    }));
  return matchTemporalObservation({
    observations,
    activeEpochMs,
    policy: matching.policy,
    toleranceMs: matching.toleranceMs,
    interpolationAllowed: matching.policy === "interpolate"
      ? true
      : interpolationAllowed,
  });
}

function synthesizeInterpolatedRow({
  chart,
  buckets,
  measure: selectedMeasure,
  matching,
  profile,
  activeEpochMs,
  activeCanonical,
  transformed,
}) {
  const measure = selectedMeasure ?? measureBindings(chart)[0] ?? null;
  const usableBuckets = matchableBuckets(
    chart,
    buckets,
    profile,
    transformed,
    measure,
  );
  const lowerIndex = usableBuckets.findIndex(({ epochMs }) => epochMs > activeEpochMs) - 1;
  const lower = usableBuckets[lowerIndex];
  const upper = usableBuckets[lowerIndex + 1];
  if (!lower || !upper) throw new Error("Interpolation requires observations on both sides.");
  const timeBinding = temporalBinding(chart);
  const row = { ...lower.rows[0], [bindingField(timeBinding)]: activeCanonical };
  for (const measureBinding of measure ? [measure] : measureBindings(chart)) {
    const observations = buckets
      .map((bucket) => ({
        epochMs: bucket.epochMs,
        value: bucketMeasureValue(bucket, measureBinding, profile, transformed),
      }))
      .filter(({ value }) => Number.isFinite(value));
    const match = matchTemporalObservation({
      observations,
      activeEpochMs,
      policy: matching.policy,
      toleranceMs: matching.toleranceMs,
      interpolationAllowed: matching.policy === "interpolate"
        ? true
        : bindingAllowsInterpolation(measureBinding, profile),
    });
    row[bindingField(measureBinding)] = match.observation.value;
  }
  return row;
}

function bucketMeasureValue(bucket, binding, profile, transformed) {
  const values = bucket.rows
    .map((row) => readBoundValue(row, binding, profile))
    .filter(Number.isFinite);
  if (values.length === 0) {
    return transformed?.config?.missingStrategy === "zero" ? 0 : null;
  }
  if (values.length === 1) return values[0];
  const method = transformed?.config?.duplicateStrategy === "aggregate"
    ? transformed?.config?.aggregation
    : transformed?.config?.duplicateStrategy;
  if (!["sum", "mean", "average", "min", "max", "count", "first", "last"].includes(method)) {
    throw new Error(`Duplicate canonical timestamp ${bucket.epochMs} requires aggregation before interpolation.`);
  }
  if (method === "sum") return values.reduce((sum, value) => sum + value, 0);
  if (method === "mean" || method === "average") {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }
  if (method === "min") return Math.min(...values);
  if (method === "max") return Math.max(...values);
  if (method === "count") return values.length;
  return method === "last" ? values.at(-1) : values[0];
}

function matchableBuckets(chart, buckets, profile, transformed, selectedMeasure = null) {
  const measure = selectedMeasure ?? measureBindings(chart)[0] ?? null;
  if (!measure) return buckets;
  return buckets.filter((bucket) => Number.isFinite(
    bucketMeasureValue(bucket, measure, profile, transformed),
  ));
}

function temporalProvenance(match, activeEpochMs, activeCanonical) {
  return {
    status: match.status,
    activeEpochMs,
    activeCanonical,
    ...(match.sourceEpochMs === undefined ? {} : { sourceEpochMs: match.sourceEpochMs }),
    ...(match.lowerEpochMs === undefined ? {} : { lowerEpochMs: match.lowerEpochMs }),
    ...(match.upperEpochMs === undefined ? {} : { upperEpochMs: match.upperEpochMs }),
  };
}

function missingProvenance(activeTime) {
  return {
    status: "missing",
    activeEpochMs: activeTime.epochMs,
    activeCanonical: activeTime.canonical,
  };
}

function traceMarkIsActive(chart, mark, record) {
  if (!record || record.match.status === "missing") return false;
  const markTime = markTimeValue(chart, mark);
  const markEpochMs = canonicalEpochMs(markTime);
  if (record.match.status === "interpolated") {
    return markEpochMs === record.provenance.activeEpochMs;
  }
  return markEpochMs === record.match.sourceEpochMs;
}

function appendDeltaHistory(target, buckets, displayedEpochMs, includeDisplayed) {
  for (const bucket of buckets) {
    if (
      bucket.epochMs < displayedEpochMs
      || (includeDisplayed && bucket.epochMs === displayedEpochMs)
    ) {
      appendRows(target, bucket.rows);
    }
  }
}

function temporalBinding(chart) {
  const role = temporalRoleId(chart);
  return bindingList(chart.roles?.[role])[0] ?? null;
}

function temporalRoleId(chart) {
  return chart.typeId === "line"
    || chart.typeId === "area"
    || chart.typeId === "mixed"
    || ["bar", "groupedBar", "stackedBar", "horizontalBar", "horizontalStackedBar"].includes(chart.typeId)
    ? "observation"
    : chart.typeId === "timeline" || chart.typeId === "swimlane"
      ? "start"
      : "time";
}

function measureBindings(chart) {
  const roleIds = chart.typeId === "bullet"
    ? ["actual"]
    : isDeltaChart(chart)
      ? ["measurement"]
      : ["measurements", "value"];
  return roleIds.flatMap((role) => bindingList(chart.roles?.[role]));
}

function rowIdentity(chart, row, profile, transformed, timeBinding, measure = null) {
  const family = familyForType(chart.typeId);
  const group = groupValue(row, transformed, profile, timeBinding);
  if (family === "axis") {
    const values = [
      multiRoleValue(row, chart, "cluster", profile),
      roleValue(row, chart, "label", profile),
      group,
    ];
    if (measure) values.push(bindingField(measure));
    return stableKey(values);
  }
  if (family === "target") {
    return stableKey([
      roleValue(row, chart, "entity", profile),
      roleValue(row, chart, "label", profile),
    ]);
  }
  if (family === "geography") {
    return stableKey([roleValue(row, chart, "geography", profile), group]);
  }
  if (family === "matrix") {
    return stableKey([
      roleValue(row, chart, "row", profile),
      roleValue(row, chart, "column", profile),
      group,
    ]);
  }
  if (family === "timeline") {
    return stableKey([roleValue(row, chart, "lane", profile), group]);
  }
  return stableKey([]);
}

function markIdentity(chart, mark) {
  const family = familyForType(chart.typeId);
  if (family === "axis") return stableKey([mark.cluster, mark.label, mark.group, mark.measure]);
  if (family === "target") return stableKey([mark.entity, mark.label]);
  if (family === "geography") return stableKey([mark.geography, mark.group]);
  if (family === "matrix") return stableKey([mark.row, mark.column, mark.group]);
  if (family === "timeline") return stableKey([mark.lane, mark.group]);
  return stableKey([]);
}

function markTimeValue(chart, mark) {
  if (familyForType(chart.typeId) === "axis") return mark.x;
  if (chart.typeId === "timeline" || chart.typeId === "swimlane") return mark.start;
  return mark.time ?? mark.displayedTime;
}

function projectSnapshotMarkTime(chart, mark, activeCanonical) {
  const family = familyForType(chart.typeId);
  if (family === "axis") return { ...mark, x: activeCanonical };
  if (isDeltaChart(chart)) {
    return { ...mark, time: activeCanonical, displayedTime: activeCanonical };
  }
  if (["target", "geography", "matrix", "operational"].includes(family)) {
    return { ...mark, time: activeCanonical };
  }
  return mark;
}

function appendProjectedSourceRows({
  chart,
  rows,
  measure,
  measurements,
  projectedRows,
  projectedSourceRows,
}) {
  if (familyForType(chart.typeId) !== "axis" || measurements.length <= 1 || !measure) {
    appendRows(projectedRows, rows);
    return;
  }
  for (const row of rows) {
    let projected = projectedSourceRows.get(row);
    if (!projected) {
      projected = measurementOnlyRow(row, measurements, measure);
      projectedSourceRows.set(row, projected);
      projectedRows.push(projected);
    } else {
      const field = bindingField(measure);
      projected[field] = row[field];
    }
  }
}

function appendProjectedSyntheticRow({
  chart,
  row,
  identity,
  measure,
  measurements,
  projectedRows,
  projectedSyntheticRows,
}) {
  if (familyForType(chart.typeId) !== "axis" || measurements.length <= 1 || !measure) {
    projectedRows.push(row);
    return;
  }
  let projected = projectedSyntheticRows.get(identity);
  if (!projected) {
    projected = measurementOnlyRow(row, measurements, measure);
    projectedSyntheticRows.set(identity, projected);
    projectedRows.push(projected);
  } else {
    const field = bindingField(measure);
    projected[field] = row[field];
  }
}

function measurementOnlyRow(row, measurements, selectedMeasure) {
  const projected = { ...row };
  for (const measurement of measurements) {
    projected[bindingField(measurement)] = null;
  }
  const selectedField = bindingField(selectedMeasure);
  projected[selectedField] = row[selectedField];
  return projected;
}

function appendMeasureRows(measureRows, measure, rows) {
  if (!measureRows || !measure) return;
  const target = measureRows.get(bindingField(measure))?.rows;
  if (target) appendRows(target, rows);
}

function appendRows(target, rows) {
  for (const row of rows) target.push(row);
}

function roleValue(row, chart, roleId, profile) {
  const binding = bindingList(chart.roles?.[roleId])[0] ?? null;
  return binding ? readBoundValue(row, binding, profile) : null;
}

function multiRoleValue(row, chart, roleId, profile) {
  const values = bindingList(chart.roles?.[roleId])
    .map((binding) => readBoundValue(row, binding, profile));
  if (values.length === 0) return null;
  return values.length === 1 ? values[0] : values;
}

function groupValue(row, transformed, profile, timeBinding) {
  const values = (transformed?.config?.groupFields ?? [])
    .filter((field) => field !== bindingField(timeBinding))
    .map((field) => readBoundValue(row, { field }, profile));
  if (values.length === 0) return null;
  return values.length === 1 ? values[0] : values;
}

function familyForType(typeId) {
  if (["bar", "groupedBar", "stackedBar", "horizontalBar", "horizontalStackedBar", "line", "area", "mixed"].includes(typeId)) return "axis";
  if (["kpi", "gauge", "bullet", "deltaCard", "deltaList"].includes(typeId)) return "target";
  if (["choroplethMap", "chronoChoroplethMap", "mapScatter"].includes(typeId)) return "geography";
  if (["heatmap", "readinessMatrix"].includes(typeId)) return "matrix";
  if (["timeline", "swimlane"].includes(typeId)) return "timeline";
  return "operational";
}

function bindingAllowsInterpolation(binding, profile) {
  const column = profileColumn(profile, bindingField(binding));
  return binding?.interpolationAllowed === true || column?.interpolationAllowed === true;
}

function canonicalActiveTime(activeEpochMs, rows, timeBinding, profile) {
  const dateOnly = rows
    .map((row) => readBoundValue(row, timeBinding, profile))
    .filter((value) => value !== null)
    .every((value) => DATE_ONLY.test(value));
  const date = new Date(activeEpochMs);
  if (
    dateOnly
    && date.getUTCHours() === 0
    && date.getUTCMinutes() === 0
    && date.getUTCSeconds() === 0
    && date.getUTCMilliseconds() === 0
  ) {
    return date.toISOString().slice(0, 10);
  }
  return date.toISOString();
}

function canonicalEpochMs(value) {
  if (typeof value !== "string") return Number.NaN;
  let match = DATE_ONLY.exec(value);
  if (match) return utcEpoch(match.slice(1).map(Number), [0, 0, 0, 0]);
  match = CANONICAL_INSTANT.exec(value);
  if (!match) return Number.NaN;
  return utcEpoch(match.slice(1, 4).map(Number), match.slice(4).map(Number));
}

function utcEpoch([year, month, day], [hour, minute, second, milliseconds]) {
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, second, milliseconds);
  return date.valueOf();
}

function combinedStatus(statuses) {
  if (statuses.length === 0) return "missing";
  return new Set(statuses).size === 1 ? statuses[0] : "mixed";
}

function stableKey(values) {
  return values.map((value) => JSON.stringify(value ?? null)).join("\u001f");
}

function inactiveProjection(rows) {
  return {
    active: false,
    rows,
    rowsAfterTimeContext: rows.length,
    diagnostics: [],
  };
}

function invalidProjection(rows, code, message) {
  return {
    active: true,
    rows: [],
    rowsAfterTimeContext: 0,
    diagnostics: [{ severity: "error", code, message: boundedMessage(message) }],
    matches: new Map(),
    activeTime: null,
  };
}

function warning(code, message) {
  return { severity: "warning", code, message: boundedMessage(message) };
}

function boundedMessage(message) {
  return message.length <= 240 ? message : `${message.slice(0, 239)}…`;
}

function isPlaybackContext(value) {
  return value !== null
    && typeof value === "object"
    && !Array.isArray(value)
    && Object.hasOwn(value, "groupId");
}

function isDeltaChart(chart) {
  return chart.typeId === "deltaCard" || chart.typeId === "deltaList";
}
