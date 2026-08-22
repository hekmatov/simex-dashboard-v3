export const TEMPORAL_SCHEMA_VERSION = 1;

const CANONICAL_UTC_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export function validateIanaTimeZone(timeZone) {
  if (
    typeof timeZone !== "string"
    || timeZone.trim() === ""
    || timeZone.trim() !== timeZone
  ) {
    throw new Error("dashboard.timeZone must be a valid IANA timezone.");
  }
  try {
    new Intl.DateTimeFormat("en", { timeZone }).format(0);
  } catch {
    throw new Error(`dashboard.timeZone "${timeZone}" is not a valid IANA timezone.`);
  }
  return timeZone;
}

export function isCanonicalUtcInstant(value) {
  if (typeof value !== "string" || !CANONICAL_UTC_INSTANT.test(value)) {
    return false;
  }
  const epochMs = Date.parse(value);
  return Number.isFinite(epochMs) && new Date(epochMs).toISOString() === value;
}

export function validateTemporalBundle(bundle) {
  const dashboard = requireRecord(bundle?.dashboard, "Temporal bundle dashboard");
  const hasCanonicalZone = Object.hasOwn(dashboard, "timeZone");
  const hasLegacyZone = Object.hasOwn(dashboard, "timezone");
  if (!hasCanonicalZone) {
    throw new Error("dashboard.timeZone is required after temporal migration.");
  }
  if (hasLegacyZone) {
    throw new Error("Dashboard must contain exactly one timezone field: dashboard.timeZone.");
  }
  validateIanaTimeZone(dashboard.timeZone);

  const groups = dashboard.chronoGroups ?? [];
  if (!Array.isArray(groups)) {
    throw new TypeError("dashboard.chronoGroups must be an array.");
  }
  for (const [groupIndex, group] of groups.entries()) {
    const checkedGroup = requireRecord(group, `dashboard.chronoGroups[${groupIndex}]`);
    validatePeriod(checkedGroup.period, `dashboard.chronoGroups[${groupIndex}].period`);
    const scenes = checkedGroup.scenes ?? [];
    if (!Array.isArray(scenes)) {
      throw new TypeError(`dashboard.chronoGroups[${groupIndex}].scenes must be an array.`);
    }
    for (const [sceneIndex, scene] of scenes.entries()) {
      const checkedScene = requireRecord(
        scene,
        `dashboard.chronoGroups[${groupIndex}].scenes[${sceneIndex}]`,
      );
      validatePeriod(
        checkedScene.period,
        `dashboard.chronoGroups[${groupIndex}].scenes[${sceneIndex}].period`,
      );
      validateSelectedInstants(
        checkedScene.frameRule,
        `dashboard.chronoGroups[${groupIndex}].scenes[${sceneIndex}].frameRule`,
      );
    }
  }
  return bundle;
}

function validatePeriod(period, path) {
  const checked = requireRecord(period, path);
  assertCanonicalUtcInstant(checked.start, `${path}.start`);
  assertCanonicalUtcInstant(checked.end, `${path}.end`);
  if (Date.parse(checked.end) < Date.parse(checked.start)) {
    throw new Error(`${path}.end must be on or after start.`);
  }
}

function validateSelectedInstants(frameRule, path) {
  if (frameRule === undefined) return;
  const checked = requireRecord(frameRule, path);
  if (checked.mode !== "selected") return;
  if (!Array.isArray(checked.selectedInstants)) {
    throw new TypeError(`${path}.selectedInstants must be an array.`);
  }
  for (const [index, instant] of checked.selectedInstants.entries()) {
    assertCanonicalUtcInstant(instant, `${path}.selectedInstants[${index}]`);
  }
}

function assertCanonicalUtcInstant(value, path) {
  if (!isCanonicalUtcInstant(value)) {
    throw new Error(`${path} must be a canonical UTC instant.`);
  }
}

function requireRecord(value, description) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${description} must be an object.`);
  }
  return value;
}
