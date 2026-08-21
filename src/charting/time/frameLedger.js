import { validateIanaTimeZone } from "./temporalSchema.js";

const DAY_MS = 24 * 60 * 60 * 1_000;
const CALENDAR_UNITS = new Set(["day", "month", "year"]);

export function buildDefaultChronoLedger({ pageCharts = [], period, timeZone } = {}) {
  validateIanaTimeZone(timeZone);
  const bounds = validateEpochPeriod(period);
  if (!Array.isArray(pageCharts)) {
    throw new TypeError("pageCharts must be an array.");
  }
  return Object.freeze(collectAvailableEpochs(pageCharts, bounds));
}

export function buildSceneFrameLedger({ scene, charts = [], timeZone } = {}) {
  validateIanaTimeZone(timeZone);
  if (scene === null || typeof scene !== "object" || Array.isArray(scene)) {
    throw new TypeError("scene must be an object.");
  }
  if (!Array.isArray(charts)) {
    throw new TypeError("charts must be an array.");
  }
  const period = validateEpochPeriod(scene.period);
  const rule = scene.frameRule;
  if (rule === null || typeof rule !== "object" || Array.isArray(rule)) {
    throw new TypeError("scene.frameRule must be an object.");
  }

  if (rule.type === "source") {
    return buildSourceLedger({ rule, charts, period });
  }
  if (rule.type === "calendar") {
    return freezeLedger(generateCalendarFrames({ rule, period, timeZone }), []);
  }
  throw new Error(`Unknown Scene frame rule type "${rule.type}".`);
}

function buildSourceLedger({ rule, charts, period }) {
  if (rule.mode !== "all" && rule.mode !== "selected") {
    throw new Error('Source frame mode must be "all" or "selected".');
  }
  const sourceChart = charts.find(({ id }) => id === rule.chartId);
  const candidates = sourceChart ? collectAvailableEpochs([sourceChart], period) : [];
  if (rule.mode === "all") return freezeLedger(candidates, []);

  if (!Array.isArray(rule.selectedEpochMs)) {
    throw new TypeError("Selected source frames require selectedEpochMs.");
  }
  const selected = sortedUniqueEpochs(rule.selectedEpochMs, "selectedEpochMs");
  const candidateSet = new Set(candidates);
  const frames = selected.filter((epochMs) => candidateSet.has(epochMs));
  const missing = selected.filter((epochMs) => !candidateSet.has(epochMs));
  return freezeLedger(frames, missing);
}

function generateCalendarFrames({ rule, period, timeZone }) {
  const { interval, unit } = rule;
  if (!Number.isInteger(interval) || interval <= 0) {
    throw new RangeError("Calendar frame interval must be a positive integer.");
  }
  if (!CALENDAR_UNITS.has(unit)) {
    throw new Error('Calendar frame unit must be "day", "month", or "year".');
  }

  const frames = [period.startEpochMs];
  for (let step = 1; ; step += 1) {
    const next = unit === "day"
      ? period.startEpochMs + (step * interval * DAY_MS)
      : addZonedCalendarUnits(period.startEpochMs, step * interval, unit, timeZone);
    if (next >= period.endEpochMs) break;
    frames.push(next);
  }
  if (period.endEpochMs !== period.startEpochMs) frames.push(period.endEpochMs);
  return frames;
}

function collectAvailableEpochs(charts, period) {
  const epochs = new Set();
  for (const chart of charts) {
    for (const variable of chart?.variables ?? []) {
      for (const observation of variable?.observations ?? []) {
        if (
          observation?.value === null
          || observation?.value === undefined
          || observation?.available === false
        ) continue;
        const epochMs = observation.epochMs;
        if (!Number.isFinite(epochMs)) continue;
        if (epochMs < period.startEpochMs || epochMs > period.endEpochMs) continue;
        epochs.add(epochMs);
      }
    }
  }
  return [...epochs].sort((left, right) => left - right);
}

function validateEpochPeriod(period) {
  if (period === null || typeof period !== "object" || Array.isArray(period)) {
    throw new TypeError("Temporal period must be an object.");
  }
  if (!Number.isFinite(period.startEpochMs) || !Number.isFinite(period.endEpochMs)) {
    throw new TypeError("Temporal period boundaries must be finite epoch milliseconds.");
  }
  if (period.endEpochMs < period.startEpochMs) {
    throw new RangeError("Temporal period end must be on or after start.");
  }
  return period;
}

function sortedUniqueEpochs(values, description) {
  for (const value of values) {
    if (!Number.isFinite(value)) {
      throw new TypeError(`${description} must contain finite epoch milliseconds.`);
    }
  }
  return [...new Set(values)].sort((left, right) => left - right);
}

function addZonedCalendarUnits(startEpochMs, amount, unit, timeZone) {
  const origin = zonedParts(startEpochMs, timeZone);
  let year = origin.year;
  let month = origin.month;
  if (unit === "month") {
    const monthIndex = (year * 12) + (month - 1) + amount;
    year = Math.floor(monthIndex / 12);
    month = modulo(monthIndex, 12) + 1;
  } else {
    year += amount;
  }
  const day = Math.min(origin.day, daysInMonth(year, month));
  return epochFromZonedParts({ ...origin, year, month, day }, timeZone);
}

function zonedParts(epochMs, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-US-u-ca-gregory", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const values = Object.fromEntries(
    formatter.formatToParts(new Date(epochMs)).map(({ type, value }) => [type, value]),
  );
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
    millisecond: modulo(epochMs, 1_000),
  };
}

function epochFromZonedParts(parts, timeZone) {
  const desiredAsUtc = partsAsUtc(parts);
  let candidate = desiredAsUtc;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const rendered = zonedParts(candidate, timeZone);
    const offset = partsAsUtc(rendered) - candidate;
    const next = desiredAsUtc - offset;
    if (next === candidate) break;
    candidate = next;
  }
  const roundTrip = zonedParts(candidate, timeZone);
  if (!sameParts(roundTrip, parts)) {
    throw new Error("Calendar frame lands on a nonexistent or ambiguous timezone wall time.");
  }
  return candidate;
}

function partsAsUtc(parts) {
  return Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    parts.millisecond,
  );
}

function sameParts(left, right) {
  return ["year", "month", "day", "hour", "minute", "second", "millisecond"]
    .every((key) => left[key] === right[key]);
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function modulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function freezeLedger(frames, missingSelectedFrames) {
  return Object.freeze({
    frames: Object.freeze([...frames]),
    missingSelectedFrames: Object.freeze([...missingSelectedFrames]),
  });
}
