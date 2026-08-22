import {
  bindingField,
  bindingList,
  isMissing,
  profileColumn,
  resolveBindingValue,
} from "../data/bindings.js";
import { applyTransforms } from "../data/transforms.js";
import { getChartSchema } from "../schemas/chartSchemaRegistry.js";

const CANONICAL_DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const EMPTY_AVAILABILITY = Object.freeze([]);
const AVAILABILITY_BY_ROWS = new WeakMap();
const MAX_IDENTITIES_PER_SOURCE = 128;

export function collectTemporalAvailability({
  chart,
  member,
  rows = [],
  profile,
  period,
  timezone = "UTC",
}) {
  if (!chart || typeof chart !== "object" || Array.isArray(chart)) {
    throw new TypeError("Temporal availability chart must be an object.");
  }
  if (!member || typeof member !== "object" || Array.isArray(member)) {
    throw new TypeError("Temporal availability member must be an object.");
  }
  if (!Array.isArray(rows)) {
    throw new TypeError(`Temporal source "${chart.sourceId}" rows must be an array.`);
  }
  const canonicalTimezone = validateIanaTimezone(timezone);
  const timeBindings = bindingList(chart.roles?.[member.timeRole]);
  if (timeBindings.length !== 1) {
    throw new Error(
      `Member chart "${chart.id}" time role "${member.timeRole}" must have one bound temporal field.`,
    );
  }
  const timeBinding = timeBindings[0];
  const timeField = bindingField(timeBinding);
  const timeColumn = profileColumn(profile, timeField);
  if (!timeColumn) {
    throw new Error(
      `Member chart "${chart.id}" time field "${timeField}" is missing from source "${chart.sourceId}" profile.`,
    );
  }

  const plottedRoleBindings = plottedRoleIds(chart).map((roleId) => ({
    roleId,
    bindings: bindingList(chart.roles?.[roleId]),
  }));
  const plottedBindings = plottedRoleBindings.flatMap(({ bindings }) => bindings);
  if (plottedBindings.length === 0) return EMPTY_AVAILABILITY;

  const cache = availabilityCache(rows);
  const cacheIdentity = stableStringify({
    sourceId: chart.sourceId,
    typeId: chart.typeId,
    timeRole: member.timeRole,
    timeBinding,
    plottedRoleBindings,
    transformations: chart.transformations ?? null,
    period,
    timezone: canonicalTimezone,
    columns: [timeField, ...plottedBindings.map(bindingField)]
      .filter((field, index, fields) => fields.indexOf(field) === index)
      .map((field) => [field, profileColumn(profile, field) ?? null]),
  });
  const cached = cache.get(cacheIdentity);
  if (cached) return cached;

  const transformed = applyTransforms(rows, chart.transformations, profile, chart);
  const filterError = transformed.diagnostics.find(
    ({ severity }) => severity === "error",
  );
  if (filterError) {
    throw new Error(
      `Member chart "${chart.id}" saved filters are invalid: ${filterError.message}`,
    );
  }

  const epochs = new Set();
  for (const row of transformed.rows) {
    if (!hasPlottedValue(row, plottedBindings, profile)) continue;
    const resolved = resolveBindingValue(row?.[timeField], timeBinding, timeColumn);
    if (!resolved.ok || resolved.value === null) continue;
    const epochMs = temporalEpochInsidePeriod(
      resolved.value,
      period,
      canonicalTimezone,
    );
    if (epochMs !== null) epochs.add(epochMs);
  }

  const availability = epochs.size === 0
    ? EMPTY_AVAILABILITY
    : Object.freeze([...epochs].sort((left, right) => left - right));
  if (cache.size >= MAX_IDENTITIES_PER_SOURCE) {
    cache.delete(cache.keys().next().value);
  }
  cache.set(cacheIdentity, availability);
  return availability;
}

export function plottedRoleIds(chart) {
  const schema = getChartSchema(chart.typeId);
  if (schema.dataFamily === "axis") return Object.freeze(["measurements"]);
  if (schema.dataFamily === "geography" || schema.dataFamily === "matrix") {
    return Object.freeze(["value"]);
  }
  if (schema.dataFamily === "timeline") return Object.freeze(["event"]);
  if (schema.dataFamily === "operational") return Object.freeze(["columns"]);
  if (schema.dataFamily !== "target") return EMPTY_AVAILABILITY;
  if (chart.typeId === "bullet") return Object.freeze(["actual"]);
  if (chart.typeId === "deltaCard" || chart.typeId === "deltaList") {
    return Object.freeze(["measurement"]);
  }
  return Object.freeze(["value", "target"]);
}

export function validateIanaTimezone(timezone) {
  if (typeof timezone !== "string" || timezone.trim() === "") {
    throw new Error("Dashboard IANA timezone is required.");
  }
  const canonical = timezone.trim();
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: canonical }).format(0);
  } catch {
    throw new Error(`Dashboard IANA timezone "${canonical}" is invalid.`);
  }
  return canonical;
}

function hasPlottedValue(row, bindings, profile) {
  return bindings.some((binding) => {
    const field = bindingField(binding);
    const resolved = resolveBindingValue(
      row?.[field],
      binding,
      profileColumn(profile, field),
    );
    return resolved.ok && !isMissing(resolved.value);
  });
}

function temporalEpochInsidePeriod(value, period, timezone) {
  const dateOnly = CANONICAL_DATE_ONLY.exec(value);
  if (dateOnly) {
    if (value < period.start || value > period.end) return null;
    return utcDateOnlyEpoch(dateOnly);
  }

  const epochMs = Date.parse(value);
  if (!Number.isFinite(epochMs)) return null;
  const localDate = dateInTimezone(epochMs, timezone);
  return localDate >= period.start && localDate <= period.end
    ? epochMs
    : null;
}

function utcDateOnlyEpoch(match) {
  const [, year, month, day] = match;
  const value = new Date(0);
  value.setUTCFullYear(Number(year), Number(month) - 1, Number(day));
  value.setUTCHours(0, 0, 0, 0);
  return value.valueOf();
}

function dateInTimezone(epochMs, timezone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(epochMs);
  const values = Object.fromEntries(
    parts.filter(({ type }) => type !== "literal").map(({ type, value }) => [type, value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function availabilityCache(rows) {
  let cache = AVAILABILITY_BY_ROWS.get(rows);
  if (!cache) {
    cache = new Map();
    AVAILABILITY_BY_ROWS.set(rows, cache);
  }
  return cache;
}

function stableStringify(value) {
  if (value === undefined) return '"[undefined]"';
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(",")}}`;
}
