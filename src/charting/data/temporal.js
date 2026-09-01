const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MONTH_YEAR = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const ISO_INSTANT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})$/;
const YEAR = /^(\d{4})$/;

const FORMAT_PARSERS = Object.freeze({
  YYYY: parseYear,
  "YYYY-MM-DD": parseIsoDateOnly,
  "DD/MM/YYYY": parseDayMonthYear,
  "MM/DD/YYYY": parseMonthDayYear,
  "ISO-8601": parseIsoInstant,
});

export function parseTemporalValue(value, specification = {}) {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return succeeded(value.toISOString(), "instant");
  const source = numericYearText(value) ?? (typeof value === "string" ? value.trim() : null);
  if (source === null) return failedTemporal("invalid-temporal-value", value);
  const format = specification.format ?? detectUnambiguousFormat(source);
  if (!format) return failedTemporal("ambiguous-date-format", value);
  const parser = FORMAT_PARSERS[format];
  if (!parser) return failedTemporal("unsupported-date-format", value, { format });
  return parser(source);
}

export function normalizeTemporalColumn(values, specification = {}) {
  const normalized = [];
  const diagnostics = [];
  for (const [index, value] of (values ?? []).entries()) {
    if (isMissing(value)) { normalized.push(null); continue; }
    const parsed = parseTemporalValue(value, specification);
    if (parsed.ok) normalized.push(parsed.canonical);
    else { normalized.push(null); diagnostics.push({ index, value, ...parsed.diagnostic }); }
  }
  return { values: normalized, diagnostics };
}

function detectUnambiguousFormat(value) {
  if (YEAR.test(value)) return "YYYY";
  if (DATE_ONLY.test(value)) return "YYYY-MM-DD";
  if (ISO_INSTANT.test(value)) return "ISO-8601";
  const slashDate = DAY_MONTH_YEAR.exec(value);
  if (slashDate) {
    const first = Number(slashDate[1]);
    const second = Number(slashDate[2]);
    if (first > 12) return "DD/MM/YYYY";
    if (second > 12) return "MM/DD/YYYY";
  }
  return null;
}

function parseYear(value) {
  if (!YEAR.test(value)) return failedTemporal("invalid-date-format", value, { format: "YYYY" });
  return succeeded(`${value}-01-01`, "date-only");
}

function parseIsoDateOnly(value) {
  const match = DATE_ONLY.exec(value);
  if (!match) return failedTemporal("invalid-date-format", value, { format: "YYYY-MM-DD" });
  return dateOnlyFromParts(match[1], match[2], match[3], value);
}

function parseDayMonthYear(value) {
  const match = DAY_MONTH_YEAR.exec(value);
  if (!match) return failedTemporal("invalid-date-format", value, { format: "DD/MM/YYYY" });
  return dateOnlyFromParts(match[3], match[2], match[1], value);
}

function parseMonthDayYear(value) {
  const match = DAY_MONTH_YEAR.exec(value);
  if (!match) return failedTemporal("invalid-date-format", value, { format: "MM/DD/YYYY" });
  return dateOnlyFromParts(match[3], match[1], match[2], value);
}

function parseIsoInstant(value) {
  const match = ISO_INSTANT.exec(value);
  if (!match) return failedTemporal("invalid-date-format", value, { format: "ISO-8601" });
  const [, yearText, monthText, dayText, hourText, minuteText, secondText = "0", fractionText = "", offsetText] = match;
  const date = dateOnlyFromParts(yearText, monthText, dayText, value);
  if (!date.ok) return date;
  const hour = Number(hourText); const minute = Number(minuteText); const second = Number(secondText);
  if (hour > 23 || minute > 59 || second > 59) return failedTemporal("invalid-time", value);
  const offset = offsetMinutes(offsetText);
  if (offset === null) return failedTemporal("invalid-timezone", value);
  const instant = utcMilliseconds(Number(yearText), Number(monthText), Number(dayText), hour, minute, second, Number(fractionText.padEnd(3, "0"))) - offset * 60_000;
  if (!Number.isFinite(instant)) return failedTemporal("invalid-temporal-value", value);
  return succeeded(new Date(instant).toISOString(), "instant");
}

function dateOnlyFromParts(yearText, monthText, dayText, value) {
  const year = Number(yearText); const month = Number(monthText); const day = Number(dayText);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return failedTemporal("invalid-calendar-date", value);
  return succeeded(`${yearText}-${monthText}-${dayText}`, "date-only");
}

function utcMilliseconds(year, month, day, hour, minute, second, milliseconds) {
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, second, milliseconds);
  return date.valueOf();
}

function offsetMinutes(value) {
  if (value === "Z") return 0;
  const match = /^([+-])(\d{2}):(\d{2})$/.exec(value);
  if (!match || Number(match[2]) > 23 || Number(match[3]) > 59) return null;
  const magnitude = Number(match[2]) * 60 + Number(match[3]);
  return match[1] === "+" ? magnitude : -magnitude;
}

function daysInMonth(year, month) { return [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]; }
function isLeapYear(year) { return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0); }
function numericYearText(value) { return typeof value === "number" && Number.isSafeInteger(value) && value >= 1000 && value <= 9999 ? String(value) : null; }
function succeeded(canonical, kind) { return { ok: true, canonical, kind }; }
function failedTemporal(code, value, details = {}) { return { ok: false, diagnostic: { code, value, ...details } }; }
function isMissing(value) { return value === null || value === undefined || (typeof value === "string" && value.trim() === ""); }
