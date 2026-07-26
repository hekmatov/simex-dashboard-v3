import Papa from "papaparse";

import { profileDataset } from "../data/profileDataset.js";
import { parseTemporalValue } from "../data/temporal.js";
import { getChartSchema } from "../schemas/chartSchemaRegistry.js";
import { validateChartInstance } from "./chartConfigV3.js";

export const DASHBOARD_CONFIG_VERSION = 3;
export const DASHBOARD_BUNDLE_TYPE = "simex-dashboard-bundle";

const RUNTIME_CONFIGURATION_KEYS = new Set(["loadedData", "loadedRows", "runtimeRows"]);
const SOURCE_KINDS = new Set(["dataset", "inline"]);
const SOURCE_KEYS = new Set(["kind", "type", "fileName", "csvText", "rows", "data", "parsingMetadata", "provenance", "fingerprint", "sourceFingerprint", "profile", "datasetProfile", "url"]);
const CANONICAL_ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function isRecord(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
function requiredString(value, description) { if (typeof value !== "string" || value.trim() === "") throw new Error(`${description} is required.`); }
function ensureObject(value, description) { if (!isRecord(value)) throw new Error(`${description} must be an object.`); }
function checkKnownKeys(value, keys, description) { for (const key of Object.keys(value)) if (!keys.has(key)) throw new Error(`Unknown ${description} property "${key}".`); }
function ensureUnique(ids, value, description) { requiredString(value, description); if (ids.has(value)) throw new Error(`Duplicate ${description.toLowerCase()} "${value}".`); ids.add(value); }

function sourceRows(sourceId, source) {
  if (source.kind === "inline") return source.rows ?? source.data;
  if (source.type === "uploadedCsv") {
    const parsed = Papa.parse(source.csvText, { header: true, skipEmptyLines: true });
    if (parsed.errors.length) throw new Error(`Uploaded CSV source "${sourceId}" could not be parsed.`);
    return parsed.data;
  }
  return null;
}

function profileColumns(sourceId, source) {
  const rows = sourceRows(sourceId, source);
  if (rows !== null) return profileDataset(rows, source.parsingMetadata ?? {}).columns;
  const profile = source.profile ?? source.datasetProfile;
  if (!profile) return Object.entries(source.parsingMetadata ?? {}).map(([name, metadata]) => ({ name, type: metadata.interpretation }));
  ensureObject(profile, `Data source "${sourceId}" profile`);
  if (!Array.isArray(profile.columns)) throw new Error(`Data source "${sourceId}" profile columns must be an array.`);
  return profile.columns;
}

function sourceColumnTypes(sourceId, source) {
  const columns = profileColumns(sourceId, source);
  const rows = sourceRows(sourceId, source);
  const map = new Map();
  for (const column of columns) {
    ensureObject(column, `Data source "${sourceId}" profile column`);
    requiredString(column.name, `Data source "${sourceId}" profile column name`);
    requiredString(column.type, `Data source "${sourceId}" profile column type`);
    map.set(column.name, {
      type: column.type,
      values: rows?.map((row) => row[column.name]) ?? [],
      authorInterpretation: source.parsingMetadata?.[column.name]?.interpretation ?? column.temporal?.parsingMetadata?.interpretation,
      parsingMetadata: source.parsingMetadata?.[column.name] ?? column.temporal?.parsingMetadata,
      temporal: column.temporal,
    });
  }
  return map;
}

function validateSource(sourceId, source) {
  ensureObject(source, `Data source "${sourceId}"`);
  checkKnownKeys(source, SOURCE_KEYS, `data source "${sourceId}"`);
  if (!SOURCE_KINDS.has(source.kind)) throw new Error(`Data source "${sourceId}" kind must be dataset or inline.`);
  if (source.type !== undefined) requiredString(source.type, `Data source "${sourceId}" type`);
  for (const metadata of ["parsingMetadata", "provenance"]) if (source[metadata] !== undefined) ensureObject(source[metadata], `Data source "${sourceId}" ${metadata}`);
  for (const fingerprint of ["fingerprint", "sourceFingerprint"]) if (source[fingerprint] !== undefined && typeof source[fingerprint] !== "string") throw new Error(`Data source "${sourceId}" ${fingerprint} must be a string.`);
  if (source.type === "uploadedCsv") {
    if (source.kind !== "dataset") throw new Error(`Uploaded CSV source "${sourceId}" must be a dataset source.`);
    if (typeof source.csvText !== "string") throw new Error(`Uploaded CSV source "${sourceId}" csvText must be a string.`);
    if (source.fileName !== undefined) requiredString(source.fileName, `Uploaded CSV source "${sourceId}" fileName`);
  }
  if (source.kind === "inline") {
    if (Object.hasOwn(source, "rows") && Object.hasOwn(source, "data")) throw new Error(`Inline data source "${sourceId}" cannot define both rows and data.`);
    const rows = source.rows ?? source.data;
    if (!Array.isArray(rows) || rows.some((row) => !isRecord(row))) throw new Error(`Inline data source "${sourceId}" must contain an array of row objects.`);
  }
}

function configuredPanels(config) {
  const pageIds = new Set(); const panels = [];
  if (!Array.isArray(config.pages) || config.pages.length === 0) throw new Error("Dashboard pages must be a non-empty array.");
  for (const page of config.pages) {
    ensureObject(page, "Dashboard page"); ensureUnique(pageIds, page.id, "Dashboard page id");
    if (!Array.isArray(page.sections) || page.sections.length === 0) throw new Error(`Dashboard page "${page.id}" sections must be a non-empty array.`);
    const sectionIds = new Set();
    for (const section of page.sections) {
      ensureObject(section, "Dashboard section"); ensureUnique(sectionIds, section.id, "Dashboard section id");
      if (!Array.isArray(section.panels)) throw new Error(`Dashboard section "${section.id}" panels must be an array.`);
      for (const panel of section.panels) { ensureObject(panel, "Dashboard chart panel"); panels.push(panel.chart ?? panel); }
    }
  }
  return panels;
}

function validateManualData(chart, source) {
  if (source.kind !== "inline") return;
  const schema = getChartSchema(chart.typeId);
  if (!schema.sources.includes("inline")) throw new Error(`Chart "${chart.id}" does not support inline source "${chart.sourceId}".`);
  if (!schema.manualData) throw new Error(`Chart "${chart.id}" does not allow manual data.`);
  const rows = source.rows ?? source.data;
  if (schema.manualData.maxRows !== undefined && rows.length > schema.manualData.maxRows) throw new Error(`Chart "${chart.id}" manual data exceeds ${schema.manualData.maxRows} rows.`);
  if (schema.manualData.fields) {
    const allowed = new Set(schema.manualData.fields);
    for (const row of rows) for (const field of Object.keys(row)) if (!allowed.has(field)) throw new Error(`Chart "${chart.id}" manual data field "${field}" is not allowed.`);
  }
}

function sourceFingerprints(dataSources) {
  return Object.fromEntries(Object.keys(dataSources).sort().map((id) => [id, dataSources[id].sourceFingerprint ?? dataSources[id].fingerprint ?? null]));
}

function sanitizeStructural(value, context = "structural") {
  if (!isRecord(value) && !Array.isArray(value)) return;
  if (Array.isArray(value)) { if (context !== "opaque") value.forEach((entry) => sanitizeStructural(entry, context)); return; }
  if (context === "opaque") return;
  for (const key of Object.keys(value)) {
    if (RUNTIME_CONFIGURATION_KEYS.has(key)) { delete value[key]; continue; }
    const nextContext = context === "dataSources" ? "source" : context === "source" && ["rows", "data"].includes(key) ? "opaque" : "structural";
    if (key === "dataSources") sanitizeStructural(value[key], "dataSources");
    else sanitizeStructural(value[key], nextContext);
  }
}

function serializableConfig(config) {
  const clone = structuredClone(config);
  sanitizeStructural(clone);
  return clone;
}

function validCanonicalInstant(now) {
  if (typeof now !== "string" || !CANONICAL_ISO_INSTANT.test(now)) return false;
  const parsed = parseTemporalValue(now, { format: "ISO-8601" });
  return parsed.ok && parsed.canonical === now;
}

/** Validates all configured charts, source records, and page/section placement in a v3 dashboard. */
export function validateDashboardConfig(config) {
  ensureObject(config, "Dashboard configuration");
  if (config.configVersion !== DASHBOARD_CONFIG_VERSION) throw new Error("Dashboard configuration version 3 is required.");
  requiredString(config.id, "Dashboard id"); requiredString(config.title, "Dashboard title"); ensureObject(config.dataSources, "Dashboard dataSources");
  const sources = new Map();
  for (const [sourceId, source] of Object.entries(config.dataSources)) { requiredString(sourceId, "Data source id"); validateSource(sourceId, source); sources.set(sourceId, source); }
  const chartIds = new Set();
  for (const chart of configuredPanels(config)) {
    const source = sources.get(chart.sourceId);
    if (!source) { validateChartInstance(chart); throw new Error(`Chart "${chart.id}" references unknown source "${chart.sourceId}".`); }
    const schema = getChartSchema(chart.typeId);
    if (!schema.sources.includes(source.kind)) throw new Error(`Chart "${chart.id}" does not support ${source.kind} source "${chart.sourceId}".`);
    validateChartInstance(chart, { columnTypes: sourceColumnTypes(chart.sourceId, source) });
    ensureUnique(chartIds, chart.id, "Chart id");
    validateManualData(chart, source);
  }
  return config;
}

export function serializeDashboardBundle(config, { now = null } = {}) {
  const serializable = serializableConfig(config);
  validateDashboardConfig(serializable);
  if (now !== null && !validCanonicalInstant(now)) throw new Error("Bundle export time must be a valid canonical ISO-8601 timestamp or null.");
  return { bundleType: DASHBOARD_BUNDLE_TYPE, version: DASHBOARD_CONFIG_VERSION, metadata: { exportedAt: now, sourceFingerprints: sourceFingerprints(serializable.dataSources) }, config: serializable };
}

export function parseDashboardBundle(text) {
  let bundle;
  try { bundle = JSON.parse(text); } catch { throw new Error("Dashboard bundle must be valid JSON."); }
  if (!isRecord(bundle) || bundle.bundleType !== DASHBOARD_BUNDLE_TYPE || bundle.version !== DASHBOARD_CONFIG_VERSION) throw new Error("This dashboard supports version 3 bundles only.");
  if (!isRecord(bundle.config)) throw new Error("Bundle config must be a version 3 dashboard configuration object.");
  const config = serializableConfig(bundle.config);
  validateDashboardConfig(config);
  return config;
}
