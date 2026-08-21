import {
  validateIanaTimeZone,
  validateTemporalBundle,
} from "./temporalSchema.js";

const EXPLICIT_OFFSET = /(?:Z|[+-]\d{2}:\d{2})$/;

export function migrateDashboardTimezoneToUtc(bundle) {
  if (bundle === null || typeof bundle !== "object" || Array.isArray(bundle)) {
    throw new TypeError("Temporal bundle must be an object.");
  }
  if (
    bundle.dashboard === null
    || typeof bundle.dashboard !== "object"
    || Array.isArray(bundle.dashboard)
  ) {
    throw new TypeError("Temporal bundle dashboard must be an object.");
  }

  const migrated = structuredClone(bundle);
  const dashboard = migrated.dashboard;
  if (dashboard.timeZone !== undefined && dashboard.timezone !== undefined) {
    throw new Error("Legacy dashboard contains conflicting timeZone and timezone fields.");
  }
  dashboard.timeZone = dashboard.timeZone ?? dashboard.timezone ?? "UTC";
  validateIanaTimeZone(dashboard.timeZone);
  delete dashboard.timezone;

  if (Array.isArray(dashboard.timeGroups)) {
    for (const [groupIndex, group] of dashboard.timeGroups.entries()) {
      normalizePeriod(group?.period, `dashboard.timeGroups[${groupIndex}].period`);
      if (!Array.isArray(group?.scenes)) continue;
      for (const [sceneIndex, scene] of group.scenes.entries()) {
        const scenePath = `dashboard.timeGroups[${groupIndex}].scenes[${sceneIndex}]`;
        normalizePeriod(scene?.period, `${scenePath}.period`);
        normalizeSelectedInstants(scene?.frameRule, `${scenePath}.frameRule`);
      }
    }
  }

  validateTemporalBundle(migrated);
  return migrated;
}

function normalizePeriod(period, path) {
  if (period === null || typeof period !== "object" || Array.isArray(period)) {
    throw new TypeError(`${path} must be an object.`);
  }
  period.start = canonicalizeInstant(period.start, `${path}.start`);
  period.end = canonicalizeInstant(period.end, `${path}.end`);
}

function normalizeSelectedInstants(frameRule, path) {
  if (frameRule?.mode !== "selected") return;
  if (!Array.isArray(frameRule.selectedInstants)) {
    throw new TypeError(`${path}.selectedInstants must be an array.`);
  }
  frameRule.selectedInstants = frameRule.selectedInstants.map((instant, index) => (
    canonicalizeInstant(instant, `${path}.selectedInstants[${index}]`)
  ));
}

function canonicalizeInstant(value, path) {
  if (typeof value !== "string" || !EXPLICIT_OFFSET.test(value)) {
    throw new Error(`${path} must include explicit UTC or numeric offset information.`);
  }
  const epochMs = Date.parse(value);
  if (!Number.isFinite(epochMs)) {
    throw new Error(`${path} must be a valid timestamp.`);
  }
  return new Date(epochMs).toISOString();
}
