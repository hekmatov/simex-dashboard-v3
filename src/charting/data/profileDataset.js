import { normalizeTemporalColumn } from "./temporal.js";

const EXAMPLE_LIMIT = 3;
const LATITUDE_NAMES = new Set(["lat", "latitude"]);
const LONGITUDE_NAMES = new Set(["lon", "lng", "long", "longitude"]);
const GEOGRAPHIC_NAME = /(?:country|region|district|province|state|city|municipality|location|place|address|geography|geo)/i;
const TEMPORAL_NAME = /(?:^|[_\s-])(date|time|timestamp|datetime|year|month|day)(?:$|[_\s-])/i;

export function profileDataset(rows = [], authorMetadata = {}) {
  const safeRows = Array.isArray(rows) ? rows.filter(isRow) : [];
  const names = collectColumnNames(safeRows);
  const columns = names.map((name) => profileColumn(name, safeRows, authorMetadata[name] ?? {}));
  return { rowCount: safeRows.length, columns, fingerprint: sourceFingerprint(safeRows, names) };
}

function profileColumn(name, rows, specification) {
  const sourceValues = rows.map((row) => row[name]);
  const present = sourceValues.filter((value) => !isMissing(value));
  const normalizedTemporal = normalizeTemporalColumn(sourceValues, specification);
  const temporal = { ...normalizedTemporal, parsingMetadata: temporalParsingMetadata(present, specification) };
  const type = forcedType(specification.interpretation) ?? inferType(name, present, temporal);
  const result = {
    name, type,
    missingCount: sourceValues.length - present.length,
    uniqueCount: new Set(present.map(fingerprintValue)).size,
    examples: uniqueExamples(present),
    geographicHint: geographicHint(name),
  };
  if (type === "temporal") result.temporal = temporal;
  return result;
}

function inferType(name, values, temporal) {
  if (
    values.length > 0
    && temporal.diagnostics.length === 0
    && (!values.every(isNumeric) || TEMPORAL_NAME.test(name))
  ) return "temporal";
  if (values.length > 0 && values.every(isBoolean)) return "boolean";
  if (values.length > 0 && values.every(isNumeric)) return "numeric";
  if (values.length > 0 && TEMPORAL_NAME.test(name)) return "temporal";
  return "category";
}

function forcedType(interpretation) {
  if (!interpretation || interpretation === "auto") return null;
  return { number: "numeric", numeric: "numeric", boolean: "boolean", temporal: "temporal", geographic: "geographic", category: "category" }[interpretation] ?? null;
}

function temporalParsingMetadata(values, specification) {
  const parsingMetadata = { interpretation: specification.interpretation ?? "auto" };
  const format = specification.format ?? inferTemporalFormat(values);
  if (format) parsingMetadata.format = format;
  if (specification.timezone !== undefined) parsingMetadata.timezone = specification.timezone;
  return parsingMetadata;
}

function inferTemporalFormat(values) {
  if (values.length === 0) return null;
  if (values.every(isFourDigitYear)) return "YYYY";
  if (values.every((value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim()))) return "YYYY-MM-DD";
  if (values.every((value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value.trim()))) return "ISO-8601";
  const formats = values.map(autoSlashFormat);
  return formats.every(Boolean) && new Set(formats).size === 1 ? formats[0] : null;
}

function isFourDigitYear(value) {
  return (
    (typeof value === "number" && Number.isSafeInteger(value) && value >= 1000 && value <= 9999)
    || (typeof value === "string" && /^\d{4}$/.test(value.trim()))
  );
}

function autoSlashFormat(value) {
  const match = typeof value === "string" && /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  if (Number(match[1]) > 12) return "DD/MM/YYYY";
  if (Number(match[2]) > 12) return "MM/DD/YYYY";
  return null;
}

function geographicHint(name) {
  const normalized = String(name).trim().toLowerCase().replace(/[ _-]+/g, "");
  if (LATITUDE_NAMES.has(normalized)) return "latitude";
  if (LONGITUDE_NAMES.has(normalized)) return "longitude";
  return GEOGRAPHIC_NAME.test(name) ? "place" : null;
}

function collectColumnNames(rows) { const names = new Set(); for (const row of rows) for (const name of Object.keys(row)) names.add(name); return [...names]; }
function uniqueExamples(values) { const examples = []; const seen = new Set(); for (const value of values) { const key = fingerprintValue(value); if (seen.has(key)) continue; seen.add(key); examples.push(value); if (examples.length === EXAMPLE_LIMIT) break; } return examples; }
function isNumeric(value) { return typeof value === "number" ? Number.isFinite(value) : typeof value === "string" && value.trim() !== "" && /^[-+]?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][-+]?\d+)?$/.test(value.trim()) && Number.isFinite(Number(value)); }
function isBoolean(value) { return typeof value === "boolean" || (typeof value === "string" && /^(?:true|false)$/i.test(value.trim())); }
function isMissing(value) { return value === null || value === undefined || (typeof value === "string" && value.trim() === ""); }
function isRow(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }

function sourceFingerprint(rows, names) {
  const payload = stableStringify({ columns: names, rows: rows.map((row) => names.map((name) => row[name])) });
  return [0x811c9dc5, 0x01000193, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35, 0x27d4eb2f, 0x165667b1, 0xd3a2646c].map((seed) => fnv1a(payload, seed).toString(16).padStart(8, "0")).join("");
}

function fnv1a(text, seed) { let hash = seed; for (let index = 0; index < text.length; index += 1) { hash ^= text.charCodeAt(index); hash = Math.imul(hash, 0x01000193); } return hash >>> 0; }
function fingerprintValue(value) { return stableStringify(value); }
function stableStringify(value) {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "number") return stableNumber(value);
  if (typeof value === "boolean") return `boolean:${value}`;
  if (typeof value === "string") return `string:${JSON.stringify(value)}`;
  if (value instanceof Date) return `date:${value.toISOString()}`;
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  return String(value);
}

function stableNumber(value) {
  if (Number.isNaN(value)) return "number:NaN";
  if (value === Number.POSITIVE_INFINITY) return "number:Infinity";
  if (value === Number.NEGATIVE_INFINITY) return "number:-Infinity";
  if (Object.is(value, -0)) return "number:-0";
  return `number:${value}`;
}
