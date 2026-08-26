import { parseTemporalValue } from "../data/temporal.js";
import { migrateDashboardTimezoneToUtc } from "./normalizeTemporalConfig.js";
import { validateTemporalReview } from "./temporalReview.js";

const CANONICAL_GROUP_REQUIRED_KEYS = Object.freeze([
  "id",
  "name",
  "period",
  "matching",
  "secondsPerFrame",
  "members",
]);
const CANONICAL_GROUP_ALLOWED_KEYS = new Set([...CANONICAL_GROUP_REQUIRED_KEYS, "temporalReview"]);
const PERIOD_KEYS = new Set(["start", "end"]);

/**
 * Converts source, storage, and import payloads to the persisted dashboard
 * temporal contract without mutating the supplied configuration.
 */
export function normalizeDashboardTemporalConfig(
  config,
  { profiles = {}, timezoneFallback = "UTC" } = {},
) {
  if (!isRecord(config)) {
    throw new TypeError("Dashboard configuration must be an object.");
  }

  const normalized = migrateDashboardTimezoneToUtc(config, { timezoneFallback });

  if (Array.isArray(normalized.chronoGroups)) {
    normalized.chronoGroups = normalized.chronoGroups.map((group) => (
      normalizeChronoGroup(group, {
        config,
        profiles,
        timezone: normalized.timezone,
      })
    ));
  }

  scrubChartTimeSyncBacklinks(normalized);
  return normalized;
}

/** Validates the dashboard-owned temporal fields after legacy normalization. */
export function validateCanonicalDashboardTemporalConfig(config) {
  if (!isRecord(config)) {
    throw new TypeError("Dashboard configuration must be an object.");
  }
  validateDashboardTimezone(config.timezone);

  const groups = config.chronoGroups ?? [];
  if (!Array.isArray(groups)) {
    throw new TypeError("Dashboard chronoGroups must be an array.");
  }
  for (const group of groups) {
    validateCanonicalChronoGroup(group);
  }
  return config;
}

/** Returns a validated IANA timezone identifier unchanged. */
export function validateDashboardTimezone(timezone) {
  if (
    typeof timezone !== "string"
    || timezone.trim() === ""
    || timezone.trim() !== timezone
  ) {
    throw new Error("Dashboard timezone must be a non-empty IANA timezone string.");
  }
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone }).format(0);
  } catch {
    throw new Error(`Dashboard timezone "${timezone}" is not a valid IANA timezone.`);
  }
  return timezone;
}

function normalizeChronoGroup(group, { config, profiles, timezone }) {
  if (!isRecord(group)) return group;
  const normalized = structuredClone(group);
  if (normalized.secondsPerFrame === undefined) {
    normalized.secondsPerFrame = 1;
  }
  if (normalized.primaryClock !== undefined) {
    if (normalized.period === undefined) {
      normalized.period = deriveLegacyPeriod(normalized, {
        config,
        profiles,
        timezone,
      });
    }
    delete normalized.primaryClock;
  }
  return normalized;
}

function deriveLegacyPeriod(group, { config, profiles, timezone }) {
  const primaryClock = group.primaryClock;
  if (!isRecord(primaryClock)) {
    throw legacyEvidenceError(group, "primaryClock must be an object");
  }
  const { sourceId, timeField } = primaryClock;
  if (!nonEmptyString(sourceId) || !nonEmptyString(timeField)) {
    throw legacyEvidenceError(
      group,
      "primaryClock must identify a sourceId and timeField",
    );
  }

  const profileEntry = readEntry(profiles, sourceId)
    ?? readEntry(config.datasetProfiles, sourceId);
  const profile = profileEntry?.profile ?? profileEntry;
  if (!isRecord(profile) || !Array.isArray(profile.columns)) {
    throw legacyEvidenceError(
      group,
      `temporal profile evidence for source "${sourceId}" is missing`,
    );
  }
  const columns = profile.columns.filter((column) => column?.name === timeField);
  if (columns.length !== 1 || columns[0]?.type !== "temporal") {
    throw legacyEvidenceError(
      group,
      `temporal profile column "${sourceId}.${timeField}" is missing or invalid`,
    );
  }

  const temporal = columns[0].temporal;
  if (
    !isRecord(temporal)
    || !Array.isArray(temporal.values)
    || !Array.isArray(temporal.diagnostics)
    || temporal.diagnostics.length > 0
  ) {
    throw legacyEvidenceError(
      group,
      `profile column "${sourceId}.${timeField}" has no valid temporal evidence`,
    );
  }

  const dates = [];
  for (const value of temporal.values) {
    if (value === null) continue;
    const parsed = typeof value === "string"
      ? parseTemporalValue(value)
      : { ok: false };
    if (!parsed.ok || parsed.canonical !== value) {
      throw legacyEvidenceError(
        group,
        `profile column "${sourceId}.${timeField}" contains non-canonical temporal evidence`,
      );
    }
    dates.push(parsed.kind === "date-only"
      ? parsed.canonical
      : calendarDateInTimezone(parsed.canonical, timezone));
  }
  if (dates.length === 0) {
    throw legacyEvidenceError(
      group,
      `profile column "${sourceId}.${timeField}" has no usable temporal values`,
    );
  }
  dates.sort();
  return { start: dates[0], end: dates.at(-1) };
}

function validateCanonicalChronoGroup(group) {
  if (!isRecord(group)) {
    throw new TypeError("Dashboard chronoGroups must contain objects.");
  }
  const keys = Object.keys(group);
  for (const key of keys) {
    if (!CANONICAL_GROUP_ALLOWED_KEYS.has(key)) {
      throw new Error(
        `Unknown Chrono Group property "${key}".`,
      );
    }
  }
  for (const key of CANONICAL_GROUP_REQUIRED_KEYS) {
    if (!Object.hasOwn(group, key)) {
      throw new Error(
        `Chrono Group "${group.id ?? "unknown"}" ${key} is required.`,
      );
    }
  }
  if (group.temporalReview !== undefined) {
    validateTemporalReview(group.temporalReview, {
      allowedStatuses: ["needs-review"],
      description: `Chrono Group "${group.id}" temporal review`,
    });
  }
  if (Object.hasOwn(group, "primaryClock")) {
    throw new Error("Canonical Chrono Groups cannot contain primaryClock.");
  }
  validatePeriod(group.period, group.id);
  if (!Number.isFinite(group.secondsPerFrame) || group.secondsPerFrame <= 0) {
    throw new Error(
      `Chrono Group "${group.id}" secondsPerFrame must be positive and finite.`,
    );
  }
}

function validatePeriod(period, groupId) {
  if (!isRecord(period)) {
    throw new TypeError(
      `Chrono Group "${groupId}" period must be an object.`,
    );
  }
  for (const key of Object.keys(period)) {
    if (!PERIOD_KEYS.has(key)) {
      throw new Error(`Unknown time synchronization period property "${key}".`);
    }
  }
  for (const key of PERIOD_KEYS) {
    const value = period[key];
    const parsed = typeof value === "string"
      ? parseTemporalValue(value, { format: "YYYY-MM-DD" })
      : { ok: false };
    if (!parsed.ok || parsed.canonical !== value) {
      throw new Error(
        `Chrono Group "${groupId}" period ${key} must be a canonical YYYY-MM-DD date.`,
      );
    }
  }
  if (period.end < period.start) {
    throw new Error(
      `Chrono Group "${groupId}" period end must be on or after start.`,
    );
  }
}

function scrubChartTimeSyncBacklinks(config) {
  for (const page of config.pages ?? []) {
    for (const section of page?.sections ?? []) {
      for (const panel of section?.panels ?? []) {
        const chart = isRecord(panel) && Object.hasOwn(panel, "chart")
          ? panel.chart
          : panel;
        if (isRecord(chart?.interaction)) {
          chart.interaction.timeSync = null;
        }
      }
    }
  }
}

function calendarDateInTimezone(instant, timezone) {
  validateDashboardTimezone(timezone);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(instant));
  const byType = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function legacyEvidenceError(group, detail) {
  return new Error(
    `Cannot migrate legacy Chrono Group "${group.id ?? "unknown"}" primaryClock: ${detail}; provide valid temporal profile evidence or author an inclusive period.`,
  );
}

function readEntry(collection, key) {
  if (collection instanceof Map) return collection.get(key);
  return isRecord(collection) && Object.hasOwn(collection, key)
    ? collection[key]
    : undefined;
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
