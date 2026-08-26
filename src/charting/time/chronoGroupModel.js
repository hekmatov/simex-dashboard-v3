import {
  bindingField,
  bindingList,
  canonicalColumnType,
  profileColumn,
  resolveEffectiveBinding,
} from "../data/bindings.js";
import { getChartSchema } from "../schemas/chartSchemaRegistry.js";
import {
  collectTemporalAvailability,
  validateIanaTimezone,
} from "./temporalAvailability.js";
import { validateTemporalReview } from "./temporalReview.js";

const GROUP_KEYS = new Set([
  "id",
  "name",
  "period",
  "matching",
  "secondsPerFrame",
  "members",
  "temporalReview",
]);
const PERIOD_KEYS = new Set(["start", "end"]);
const MEMBER_KEYS = new Set(["chartId", "timeRole", "matching"]);
const MATCHING_KEYS = new Set(["policy", "toleranceMs"]);
export const TIME_SYNC_MATCHING_POLICIES = Object.freeze([
  "exact",
  "lastKnown",
  "nearest",
  "interpolate",
]);
const MATCHING_POLICIES = new Set(TIME_SYNC_MATCHING_POLICIES);
const NON_INTERPOLATABLE_FAMILIES = new Set([
  "matrix",
  "timeline",
  "operational",
]);
const EMPTY_CLOCK = Object.freeze([]);
const CANONICAL_DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Validates named synchronization groups against loaded sources, profiles,
 * configured charts, and the chart schema registry. Validation is strict:
 * invalid contracts throw and valid contracts are returned without mutation.
 */
export function validateChronoGroups(groups, context = {}) {
  if (!Array.isArray(groups)) {
    throw new TypeError("Chrono Groups must be an array.");
  }
  if (!isRecord(context)) {
    throw new TypeError("Time synchronization validation context must be an object.");
  }

  const charts = chartCollection(context.charts);
  const chartsById = indexCharts(charts);
  const timezone = validateIanaTimezone(context.timezone ?? "UTC");
  const groupIds = new Set();

  for (const group of groups) {
    validateGroupShape(group);
    if (groupIds.has(group.id)) {
      throw new Error(`Duplicate Chrono Group id "${group.id}".`);
    }
    groupIds.add(group.id);

    const groupMatching = validateEffectiveTimeSyncMatching(
      group.matching,
      `Chrono Group "${group.id}"`,
    );

    const memberIds = new Set();
    for (const member of group.members) {
      validateMemberShape(member, group.id);
      if (memberIds.has(member.chartId)) {
        throw new Error(
          `Duplicate member chart id "${member.chartId}" in Chrono Group "${group.id}".`,
        );
      }
      memberIds.add(member.chartId);

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
    buildChronoGroupClock(group, {
      charts,
      loadedData: context.loadedData,
      profiles: context.profiles,
      timezone,
    });
  }

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

export function isTimeSyncInterpolationEligible(schema) {
  const semanticMark = schema?.semantics?.mark ?? "";
  return Boolean(
    schema?.capabilities?.timeSync === true
    && !NON_INTERPOLATABLE_FAMILIES.has(schema?.dataFamily)
    && !/(?:event|cell|row)/i.test(semanticMark),
  );
}

/**
 * Finds one group without normalizing or cloning it. A null group id represents
 * the documented no-active-group state; unknown actions and lookups fail
 * deterministically rather than selecting an arbitrary fallback.
 */
export function getChronoGroup(groups, groupId) {
  if (!Array.isArray(groups)) {
    throw new TypeError("Chrono Groups must be an array.");
  }
  if (groupId === null) return null;
  requiredString(groupId, "Chrono Group id");

  let found = null;
  const ids = new Set();
  for (const group of groups) {
    if (!isRecord(group)) {
      throw new TypeError("Chrono Groups must contain objects.");
    }
    requiredString(group.id, "Chrono Group id");
    if (ids.has(group.id)) {
      throw new Error(`Duplicate Chrono Group id "${group.id}".`);
    }
    ids.add(group.id);
    if (group.id === groupId) found = group;
  }
  if (!found) {
    throw new Error(`Unknown Chrono Group "${groupId}".`);
  }
  return found;
}

export function buildChronoGroupClock(group, {
  charts = [],
  loadedData = {},
  profiles = {},
  timezone = "UTC",
} = {}) {
  if (group === null || group === undefined) return EMPTY_CLOCK;
  validateGroupShape(group);
  const canonicalTimezone = validateIanaTimezone(timezone);
  const chartsById = indexCharts(chartCollection(charts));
  const epochs = new Set();

  for (const member of group.members) {
    validateMemberShape(member, group.id);
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
      profiles,
    });
    const rows = readEntry(loadedData, chart.sourceId);
    if (!Array.isArray(rows)) {
      throw new Error(
        `Time synchronization member source "${chart.sourceId}" for chart "${chart.id}" is not loaded.`,
      );
    }
    const profileEntry = readEntry(profiles, chart.sourceId);
    if (profileEntry === undefined || profileEntry === null) {
      throw new Error(
        `Temporal profile for member chart "${chart.id}" source "${chart.sourceId}" is required.`,
      );
    }
    const profile = unwrapProfile(profileEntry);
    for (const epochMs of collectTemporalAvailability({
      chart,
      member,
      rows,
      profile,
      period: group.period,
      timezone: canonicalTimezone,
    })) {
      epochs.add(epochMs);
    }
  }

  return epochs.size === 0
    ? EMPTY_CLOCK
    : Object.freeze([...epochs].sort((left, right) => left - right));
}

export function buildPrimaryClock(
  group,
  loadedData = {},
  profiles = {},
  charts = [],
  timezone = "UTC",
) {
  return buildChronoGroupClock(group, {
    charts,
    loadedData,
    profiles,
    timezone,
  });
}

function validateGroupShape(group) {
  if (!isRecord(group)) {
    throw new TypeError("Chrono Groups must contain objects.");
  }
  checkKnownKeys(group, GROUP_KEYS, "Chrono Group");
  requiredString(group.id, "Chrono Group id");
  requiredString(group.name, "Chrono Group name");
  if (group.matching === undefined) {
    throw new Error(
      `Chrono Group "${group.id}" matching is required.`,
    );
  }
  validatePeriodShape(group.period, group.id);
  if (!Number.isFinite(group.secondsPerFrame) || group.secondsPerFrame <= 0) {
    throw new RangeError(
      `Chrono Group "${group.id}" secondsPerFrame must be a positive finite number.`,
    );
  }
  if (!Array.isArray(group.members) || group.members.length === 0) {
    throw new TypeError(
      `Chrono Group "${group.id}" members must be a non-empty array.`,
    );
  }
  if (group.temporalReview !== undefined) {
    validateTemporalReview(group.temporalReview, {
      allowedStatuses: ["needs-review"],
      description: `Chrono Group "${group.id}" temporal review`,
    });
  }
}

function validatePeriodShape(period, groupId) {
  if (!isRecord(period)) {
    throw new TypeError(
      `Chrono Group "${groupId}" period must be an object.`,
    );
  }
  checkKnownKeys(period, PERIOD_KEYS, "time synchronization period");
  validateCanonicalPeriodDate(period.start, groupId, "start");
  validateCanonicalPeriodDate(period.end, groupId, "end");
  if (period.end < period.start) {
    throw new RangeError(
      `Chrono Group "${groupId}" period end cannot be before its start.`,
    );
  }
}

function validateCanonicalPeriodDate(value, groupId, edge) {
  if (typeof value !== "string" || !CANONICAL_DATE_ONLY.test(value)) {
    throw new Error(
      `Chrono Group "${groupId}" period ${edge} must use canonical YYYY-MM-DD format.`,
    );
  }
  const [, year, month, day] = CANONICAL_DATE_ONLY.exec(value);
  if (!validDateParts(year, month, day)) {
    throw new Error(
      `Chrono Group "${groupId}" period ${edge} must be a valid calendar date.`,
    );
  }
}

function validateMemberShape(member, groupId) {
  if (!isRecord(member)) {
    throw new TypeError(
      `Chrono Group "${groupId}" members must contain objects.`,
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
  profiles,
}) {
  if (schema.authoringWorkflow === "static") {
    throw new Error(
      `Static panel "${chart.id}" cannot join Chrono Groups.`,
    );
  }
  if (chart.presentation?.collection != null) {
    throw new Error(
      `Member chart "${chart.id}" is a Collection display. Collection displays cannot join Chrono Groups.`,
    );
  }

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
}

function validateInterpolationPermission(chart, schema, member, profile) {
  const semanticMark = schema.semantics?.mark ?? "";
  if (!isTimeSyncInterpolationEligible(schema)) {
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
