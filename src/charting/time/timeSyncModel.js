import {
  bindingField,
  bindingList,
  canonicalColumnType,
  profileColumn,
  resolveEffectiveBinding,
} from "../data/bindings.js";
import { getChartSchema } from "../schemas/chartSchemaRegistry.js";

const GROUP_KEYS = new Set([
  "id",
  "name",
  "primaryClock",
  "matching",
  "members",
]);
const PRIMARY_CLOCK_KEYS = new Set(["sourceId", "timeField"]);
const MEMBER_KEYS = new Set(["chartId", "timeRole", "matching"]);
const MATCHING_KEYS = new Set(["policy", "toleranceMs"]);
const MATCHING_POLICIES = new Set([
  "exact",
  "lastKnown",
  "nearest",
  "interpolate",
]);
const NON_INTERPOLATABLE_FAMILIES = new Set([
  "matrix",
  "timeline",
  "operational",
]);
const EMPTY_CLOCK = Object.freeze([]);
const CANONICAL_DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const CANONICAL_INSTANT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.(\d{3})Z$/;

/**
 * Validates named synchronization groups against loaded sources, profiles,
 * configured charts, and the chart schema registry. Validation is strict:
 * invalid contracts throw and valid contracts are returned without mutation.
 */
export function validateTimeSyncGroups(groups, context = {}) {
  if (!Array.isArray(groups)) {
    throw new TypeError("Time synchronization groups must be an array.");
  }
  if (!isRecord(context)) {
    throw new TypeError("Time synchronization validation context must be an object.");
  }

  const charts = chartCollection(context.charts);
  const chartsById = indexCharts(charts);
  const groupIds = new Set();
  const membershipByChartId = new Map();

  for (const group of groups) {
    validateGroupShape(group);
    if (groupIds.has(group.id)) {
      throw new Error(`Duplicate time synchronization group id "${group.id}".`);
    }
    groupIds.add(group.id);

    const groupMatching = validateEffectiveTimeSyncMatching(
      group.matching,
      `Time synchronization group "${group.id}"`,
    );
    buildPrimaryClock(group, context.loadedData, context.profiles);

    const memberIds = new Set();
    for (const member of group.members) {
      validateMemberShape(member, group.id);
      if (memberIds.has(member.chartId)) {
        throw new Error(
          `Duplicate member chart id "${member.chartId}" in time synchronization group "${group.id}".`,
        );
      }
      memberIds.add(member.chartId);
      if (membershipByChartId.has(member.chartId)) {
        throw new Error(
          `Member chart "${member.chartId}" belongs to more than one time synchronization group.`,
        );
      }
      membershipByChartId.set(member.chartId, group.id);

      const chart = chartsById.get(member.chartId);
      if (!chart) {
        throw new Error(
          `Time synchronization member chart "${member.chartId}" does not exist.`,
        );
      }
      const schema = schemaForMember(chart);
      validateMemberEligibility({
        chart,
        schema,
        member,
        group,
        profiles: context.profiles,
      });

      const effectiveMatching = member.matching === undefined
        ? groupMatching
        : validateEffectiveTimeSyncMatching(
            member.matching,
            `Time synchronization member "${member.chartId}"`,
          );
      if (effectiveMatching.policy === "interpolate") {
        validateInterpolationPermission(chart, schema, member, unwrapProfile(
          readEntry(context.profiles, chart.sourceId),
        ));
      }
    }
  }

  validateChartReferences(charts, groupIds, membershipByChartId);
  return groups;
}

/**
 * Reuses the synchronization-group validator's interpolation decision at the
 * projection boundary. This prevents playback context from widening a chart's
 * declared interpolation capability.
 */
export function assertTimeSyncInterpolationAllowed({
  chart,
  timeRole,
  profile,
}) {
  if (!isRecord(chart)) {
    throw new TypeError("Time synchronization chart must be an object.");
  }
  requiredString(timeRole, "Time synchronization member timeRole");
  const schema = schemaForMember(chart);
  validateInterpolationPermission(
    chart,
    schema,
    { timeRole },
    unwrapProfile(profile),
  );
  return true;
}

/**
 * Finds one group without normalizing or cloning it. A null group id represents
 * the documented no-active-group state; unknown actions and lookups fail
 * deterministically rather than selecting an arbitrary fallback.
 */
export function getTimeSyncGroup(groups, groupId) {
  if (!Array.isArray(groups)) {
    throw new TypeError("Time synchronization groups must be an array.");
  }
  if (groupId === null) return null;
  requiredString(groupId, "Time synchronization group id");

  let found = null;
  const ids = new Set();
  for (const group of groups) {
    if (!isRecord(group)) {
      throw new TypeError("Time synchronization groups must contain objects.");
    }
    requiredString(group.id, "Time synchronization group id");
    if (ids.has(group.id)) {
      throw new Error(`Duplicate time synchronization group id "${group.id}".`);
    }
    ids.add(group.id);
    if (group.id === groupId) found = group;
  }
  if (!found) {
    throw new Error(`Unknown time synchronization group "${groupId}".`);
  }
  return found;
}

/**
 * Builds the primary clock exclusively from the designated source profile's
 * canonical temporal evidence. Raw loaded rows and member-source clocks are
 * intentionally never parsed or unioned.
 */
export function buildPrimaryClock(group, loadedData = {}, profiles = {}) {
  if (group === null || group === undefined) return EMPTY_CLOCK;
  if (!isRecord(group)) {
    throw new TypeError("Time synchronization group must be an object.");
  }
  requiredString(group.id, "Time synchronization group id");
  validatePrimaryClockShape(group.primaryClock, group.id);

  const { sourceId, timeField } = group.primaryClock;
  if (
    !hasEntry(loadedData, sourceId)
    || readEntry(loadedData, sourceId) === null
    || readEntry(loadedData, sourceId) === undefined
  ) {
    throw new Error(
      `Time synchronization group "${group.id}" primary source "${sourceId}" is not loaded.`,
    );
  }

  const profileEntry = readEntry(profiles, sourceId);
  if (profileEntry === undefined || profileEntry === null) {
    throw new Error(
      `Temporal profile for primary source "${sourceId}" is required by time synchronization group "${group.id}".`,
    );
  }
  const profile = unwrapProfile(profileEntry);
  if (!isRecord(profile) || !Array.isArray(profile.columns)) {
    throw new Error(
      `Temporal profile for primary source "${sourceId}" must contain a columns array.`,
    );
  }
  const matches = profile.columns.filter((column) => column?.name === timeField);
  if (matches.length === 0) {
    throw new Error(
      `Primary time field "${timeField}" is missing from source "${sourceId}" profile.`,
    );
  }
  if (matches.length > 1) {
    throw new Error(
      `Primary time field "${timeField}" is duplicated in source "${sourceId}" profile.`,
    );
  }

  const column = matches[0];
  if (canonicalColumnType(column.type) !== "temporal") {
    throw new Error(
      `Primary time field "${timeField}" in source "${sourceId}" must be temporal.`,
    );
  }
  const values = validatedTemporalEvidence(column, {
    sourceId,
    timeField,
    description: "Primary",
  });

  const clock = [];
  let previousEpochMs = null;
  for (const [index, value] of values.entries()) {
    if (value === null) continue;
    const epochMs = canonicalEpochMs(value);
    if (!Number.isFinite(epochMs)) {
      throw new TypeError(
        `Primary time field "${timeField}" temporal profile evidence must contain finite canonical temporal values (index ${index}).`,
      );
    }
    if (previousEpochMs !== null && epochMs === previousEpochMs) {
      continue;
    }
    if (previousEpochMs !== null && epochMs < previousEpochMs) {
      throw new Error(
        `Primary clock for source "${sourceId}" must be strictly increasing.`,
      );
    }
    clock.push(epochMs);
    previousEpochMs = epochMs;
  }

  return clock.length === 0 ? EMPTY_CLOCK : Object.freeze(clock);
}

function validateGroupShape(group) {
  if (!isRecord(group)) {
    throw new TypeError("Time synchronization groups must contain objects.");
  }
  checkKnownKeys(group, GROUP_KEYS, "time synchronization group");
  requiredString(group.id, "Time synchronization group id");
  requiredString(group.name, "Time synchronization group name");
  if (group.matching === undefined) {
    throw new Error(
      `Time synchronization group "${group.id}" matching is required.`,
    );
  }
  validatePrimaryClockShape(group.primaryClock, group.id);
  if (!Array.isArray(group.members) || group.members.length === 0) {
    throw new TypeError(
      `Time synchronization group "${group.id}" members must be a non-empty array.`,
    );
  }
}

function validatePrimaryClockShape(primaryClock, groupId) {
  if (!isRecord(primaryClock)) {
    throw new TypeError(
      `Time synchronization group "${groupId}" primaryClock must be an object.`,
    );
  }
  checkKnownKeys(primaryClock, PRIMARY_CLOCK_KEYS, "primary clock");
  requiredString(
    primaryClock.sourceId,
    `Time synchronization group "${groupId}" primary sourceId`,
  );
  requiredString(
    primaryClock.timeField,
    `Time synchronization group "${groupId}" primary timeField`,
  );
}

function validateMemberShape(member, groupId) {
  if (!isRecord(member)) {
    throw new TypeError(
      `Time synchronization group "${groupId}" members must contain objects.`,
    );
  }
  checkKnownKeys(member, MEMBER_KEYS, "time synchronization member");
  requiredString(member.chartId, "Time synchronization member chartId");
  requiredString(member.timeRole, "Time synchronization member timeRole");
}

export function validateEffectiveTimeSyncMatching(
  matching,
  description = "Effective time synchronization",
) {
  if (!isRecord(matching)) {
    throw new TypeError(`${description} matching must be an object.`);
  }
  const prototype = Object.getPrototypeOf(matching);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${description} matching must be a plain object.`);
  }
  if (Object.getOwnPropertySymbols(matching).length > 0) {
    throw new TypeError(`${description} matching cannot contain symbol properties.`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(matching);
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (!Object.hasOwn(descriptor, "value")) {
      throw new TypeError(
        `${description} matching property "${key}" must be a data property.`,
      );
    }
    if (!descriptor.enumerable) {
      throw new TypeError(
        `${description} matching property "${key}" must be enumerable.`,
      );
    }
  }
  checkKnownKeys(descriptors, MATCHING_KEYS, "temporal matching");
  if (!Object.hasOwn(descriptors, "policy")) {
    throw new Error(`${description} matching policy is required.`);
  }
  const policy = descriptors.policy.value;
  requiredString(policy, `${description} matching policy`);
  if (!MATCHING_POLICIES.has(policy)) {
    throw new Error(`Unknown temporal matching policy "${policy}".`);
  }
  const hasTolerance = Object.hasOwn(descriptors, "toleranceMs");
  const toleranceMs = descriptors.toleranceMs?.value;
  if (
    policy === "nearest"
    && (!hasTolerance
      || !Number.isFinite(toleranceMs)
      || toleranceMs < 0)
  ) {
    throw new RangeError(
      `${description} nearest matching requires a finite, non-negative toleranceMs.`,
    );
  }
  if (policy !== "nearest" && hasTolerance) {
    throw new Error(
      `${description} only nearest matching accepts toleranceMs.`,
    );
  }
  return Object.freeze({
    policy,
    ...(hasTolerance ? { toleranceMs } : {}),
  });
}

function validateMemberEligibility({
  chart,
  schema,
  member,
  group,
  profiles,
}) {
  if (schema.capabilities.timeSync !== true) {
    throw new Error(
      `Member chart "${chart.id}" type "${chart.typeId}" does not support time synchronization.`,
    );
  }

  const role = schema.roles.find(({ id }) => id === member.timeRole);
  if (!role || !role.accepts.includes("temporal")) {
    throw new Error(
      `Member chart "${chart.id}" time role "${member.timeRole}" is not a temporal role.`,
    );
  }
  const bindings = bindingList(chart.roles?.[member.timeRole]);
  if (bindings.length !== 1) {
    throw new Error(
      `Member chart "${chart.id}" time role "${member.timeRole}" must have one bound temporal field.`,
    );
  }
  const field = bindingField(bindings[0]);
  requiredString(
    field,
    `Member chart "${chart.id}" time role "${member.timeRole}" field`,
  );

  const profileEntry = readEntry(profiles, chart.sourceId);
  if (profileEntry === undefined || profileEntry === null) {
    throw new Error(
      `Temporal profile for member chart "${chart.id}" source "${chart.sourceId}" is required.`,
    );
  }
  const profile = unwrapProfile(profileEntry);
  const column = profileColumn(profile, field);
  if (!column) {
    throw new Error(
      `Member chart "${chart.id}" time field "${field}" is missing from source "${chart.sourceId}" profile.`,
    );
  }
  if (resolveEffectiveBinding(bindings[0], column).type !== "temporal") {
    throw new Error(
      `Member chart "${chart.id}" time role "${member.timeRole}" is not backed by a temporal profile field.`,
    );
  }
  const values = validatedTemporalEvidence(column, {
    sourceId: chart.sourceId,
    timeField: field,
    description: `Member chart "${chart.id}"`,
  });
  for (const [index, value] of values.entries()) {
    if (value === null) continue;
    if (!Number.isFinite(canonicalEpochMs(value))) {
      throw new TypeError(
        `Member chart "${chart.id}" time field "${field}" temporal profile evidence must contain finite canonical temporal values (index ${index}).`,
      );
    }
  }

  const reference = chart.interaction?.timeSync;
  if (!isRecord(reference)) {
    throw new Error(
      `Member chart "${chart.id}" does not reference time synchronization group "${group.id}".`,
    );
  }
  requiredString(
    reference.groupId,
    `Member chart "${chart.id}" time synchronization groupId`,
  );
  if (reference.groupId !== group.id) {
    throw new Error(
      `Member chart "${chart.id}" references group "${reference.groupId}" instead of "${group.id}".`,
    );
  }
}

function validateInterpolationPermission(chart, schema, member, profile) {
  const semanticMark = schema.semantics?.mark ?? "";
  if (
    NON_INTERPOLATABLE_FAMILIES.has(schema.dataFamily)
    || /(?:event|cell|row)/i.test(semanticMark)
  ) {
    const reason = /event/i.test(semanticMark)
      ? "event"
      : "discrete";
    throw new Error(
      `Member chart "${chart.id}" ${reason} schema does not permit interpolation.`,
    );
  }

  const numericMeasures = [];
  const measureRoleIds = interpolationMeasureRoleIds(chart, schema);
  for (const role of schema.roles) {
    if (
      role.id === member.timeRole
      || !measureRoleIds.has(role.id)
      || !role.accepts.includes("number")
    ) {
      continue;
    }
    for (const binding of bindingList(chart.roles?.[role.id])) {
      const field = bindingField(binding);
      const column = profileColumn(profile, field);
      if (
        !column
        || canonicalColumnType(column.type) !== "number"
        || resolveEffectiveBinding(binding, column).type !== "number"
      ) {
        continue;
      }
      numericMeasures.push({ binding, column, field, role });
    }
  }
  if (numericMeasures.length === 0) {
    throw new Error(
      `Member chart "${chart.id}" does not bind a numeric measure whose schema permits interpolation.`,
    );
  }
  for (const { binding, column, field, role } of numericMeasures) {
    const explicitlyAllowed = (
      schema.capabilities.interpolation === true
      || role.interpolationAllowed === true
      || binding?.interpolationAllowed === true
      || column.interpolationAllowed === true
    );
    if (!explicitlyAllowed) {
      throw new Error(
        `Member chart "${chart.id}" numeric measure "${field}" does not explicitly permit interpolation.`,
      );
    }
  }
}

function interpolationMeasureRoleIds(chart, schema) {
  if (schema.dataFamily === "axis") return new Set(["measurements"]);
  if (schema.dataFamily === "geography") return new Set(["value"]);
  if (schema.dataFamily !== "target") return new Set(["value"]);
  if (chart.typeId === "bullet") return new Set(["actual"]);
  if (chart.typeId === "deltaCard" || chart.typeId === "deltaList") {
    return new Set(["measurement"]);
  }
  return new Set(["value"]);
}

function validateChartReferences(charts, groupIds, membershipByChartId) {
  for (const chart of charts) {
    const reference = chart.interaction?.timeSync;
    if (reference === null || reference === undefined) continue;
    if (!isRecord(reference)) {
      throw new TypeError(
        `Chart "${chart.id}" time synchronization reference must be an object or null.`,
      );
    }
    requiredString(
      reference.groupId,
      `Chart "${chart.id}" time synchronization groupId`,
    );
    if (!groupIds.has(reference.groupId)) {
      throw new Error(
        `Chart "${chart.id}" references unknown time synchronization group "${reference.groupId}".`,
      );
    }
    if (membershipByChartId.get(chart.id) !== reference.groupId) {
      throw new Error(
        `Chart "${chart.id}" references group "${reference.groupId}" but is not a member.`,
      );
    }
  }
}

function validatedTemporalEvidence(column, {
  sourceId,
  timeField,
  description,
}) {
  if (
    !isRecord(column.temporal)
    || !Array.isArray(column.temporal.values)
    || !Array.isArray(column.temporal.diagnostics)
    || column.temporal.diagnostics.length > 0
  ) {
    throw new Error(
      `${description} time field "${timeField}" in source "${sourceId}" requires valid temporal profile evidence.`,
    );
  }
  return column.temporal.values;
}

function canonicalEpochMs(value) {
  if (typeof value !== "string") return null;

  const dateOnly = CANONICAL_DATE_ONLY.exec(value);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return validDateParts(year, month, day)
      ? utcMilliseconds(year, month, day, 0, 0, 0, 0)
      : null;
  }

  const instant = CANONICAL_INSTANT.exec(value);
  if (!instant) return null;
  const [
    ,
    year,
    month,
    day,
    hour,
    minute,
    second,
    milliseconds,
  ] = instant;
  if (
    !validDateParts(year, month, day)
    || Number(hour) > 23
    || Number(minute) > 59
    || Number(second) > 59
  ) {
    return null;
  }
  return utcMilliseconds(
    year,
    month,
    day,
    hour,
    minute,
    second,
    milliseconds,
  );
}

function utcMilliseconds(
  year,
  month,
  day,
  hour,
  minute,
  second,
  milliseconds,
) {
  const date = new Date(0);
  date.setUTCFullYear(Number(year), Number(month) - 1, Number(day));
  date.setUTCHours(
    Number(hour),
    Number(minute),
    Number(second),
    Number(milliseconds),
  );
  return date.valueOf();
}

function validDateParts(yearText, monthText, dayText) {
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  return (
    month >= 1
    && month <= 12
    && day >= 1
    && day <= daysInMonth(year, month)
  );
}

function daysInMonth(year, month) {
  return [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ][month - 1];
}

function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function schemaForMember(chart) {
  try {
    return getChartSchema(chart.typeId);
  } catch {
    throw new Error(
      `Member chart "${chart.id}" uses unknown chart type "${chart.typeId}".`,
    );
  }
}

function chartCollection(charts) {
  if (charts === undefined) return [];
  if (Array.isArray(charts)) return charts;
  if (charts instanceof Map) return [...charts.values()];
  if (isRecord(charts)) return Object.values(charts);
  throw new TypeError("Time synchronization charts must be an array or keyed collection.");
}

function indexCharts(charts) {
  const byId = new Map();
  for (const chart of charts) {
    if (!isRecord(chart)) {
      throw new TypeError("Time synchronization charts must contain objects.");
    }
    requiredString(chart.id, "Chart id");
    if (byId.has(chart.id)) {
      throw new Error(`Duplicate chart id "${chart.id}".`);
    }
    byId.set(chart.id, chart);
  }
  return byId;
}

function unwrapProfile(value) {
  return value?.datasetProfile ?? value?.profile ?? value;
}

function hasEntry(collection, key) {
  if (collection instanceof Map) return collection.has(key);
  return isRecord(collection) && Object.hasOwn(collection, key);
}

function readEntry(collection, key) {
  if (collection instanceof Map) return collection.get(key);
  return isRecord(collection) ? collection[key] : undefined;
}

function checkKnownKeys(value, keys, description) {
  for (const key of Object.keys(value)) {
    if (!keys.has(key)) {
      throw new Error(`Unknown ${description} property "${key}".`);
    }
  }
}

function requiredString(value, description) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${description} is required.`);
  }
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
