import { getChartSchema } from "../schemas/chartSchemaRegistry.js";
import { validateChartInstance } from "./chartConfigV3.js";

export const DASHBOARD_CONFIG_VERSION = 3;
export const DASHBOARD_BUNDLE_TYPE = "simex-dashboard-bundle";

const RUNTIME_CONFIGURATION_KEYS = new Set(["loadedData", "loadedRows", "runtimeRows"]);
const SOURCE_KINDS = new Set(["dataset", "inline"]);

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requiredString(value, description) {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${description} is required.`);
}

function ensureObject(value, description) {
  if (!isRecord(value)) throw new Error(`${description} must be an object.`);
}

function ensureUnique(ids, value, description) {
  requiredString(value, description);
  if (ids.has(value)) throw new Error(`Duplicate ${description.toLowerCase()} "${value}".`);
  ids.add(value);
}

function validateSource(sourceId, source) {
  ensureObject(source, `Data source "${sourceId}"`);
  if (!SOURCE_KINDS.has(source.kind)) throw new Error(`Data source "${sourceId}" kind must be dataset or inline.`);
  if (source.type !== undefined) requiredString(source.type, `Data source "${sourceId}" type`);
  for (const metadata of ["parsingMetadata", "provenance"]) {
    if (source[metadata] !== undefined) ensureObject(source[metadata], `Data source "${sourceId}" ${metadata}`);
  }
  for (const fingerprint of ["fingerprint", "sourceFingerprint"]) {
    if (source[fingerprint] !== undefined && typeof source[fingerprint] !== "string") throw new Error(`Data source "${sourceId}" ${fingerprint} must be a string.`);
  }
  if (source.type === "uploadedCsv") {
    if (source.kind !== "dataset") throw new Error(`Uploaded CSV source "${sourceId}" must be a dataset source.`);
    if (typeof source.csvText !== "string") throw new Error(`Uploaded CSV source "${sourceId}" csvText must be a string.`);
    if (source.fileName !== undefined) requiredString(source.fileName, `Uploaded CSV source "${sourceId}" fileName`);
  }
  if (source.kind === "inline") {
    const rows = source.rows ?? source.data;
    if (!Array.isArray(rows) || rows.some((row) => !isRecord(row))) throw new Error(`Inline data source "${sourceId}" must contain an array of row objects.`);
  }
}

function configuredPanels(config) {
  const seenPages = new Set();
  const panels = [];
  if (!Array.isArray(config.pages) || config.pages.length === 0) throw new Error("Dashboard pages must be a non-empty array.");
  for (const page of config.pages) {
    ensureObject(page, "Dashboard page");
    ensureUnique(seenPages, page.id, "Dashboard page id");
    if (!Array.isArray(page.sections) || page.sections.length === 0) throw new Error(`Dashboard page "${page.id}" sections must be a non-empty array.`);
    const pageSectionIds = new Set();
    for (const section of page.sections) {
      ensureObject(section, "Dashboard section");
      ensureUnique(pageSectionIds, section.id, "Dashboard section id");
      if (!Array.isArray(section.panels)) throw new Error(`Dashboard section "${section.id}" panels must be an array.`);
      for (const panel of section.panels) {
        ensureObject(panel, "Dashboard chart panel");
        panels.push(panel.chart ?? panel);
      }
    }
  }
  return panels;
}

function sourceFingerprints(dataSources) {
  return Object.fromEntries(Object.keys(dataSources).sort().map((id) => [
    id,
    dataSources[id].sourceFingerprint ?? dataSources[id].fingerprint ?? null,
  ]));
}

function serializableConfig(config) {
  const clone = structuredClone(config);
  for (const key of RUNTIME_CONFIGURATION_KEYS) delete clone[key];
  for (const source of Object.values(clone.dataSources)) {
    for (const key of RUNTIME_CONFIGURATION_KEYS) delete source[key];
  }
  return clone;
}

/** Validates all configured charts, source records, and page/section placement in a v3 dashboard. */
export function validateDashboardConfig(config) {
  ensureObject(config, "Dashboard configuration");
  if (config.configVersion !== DASHBOARD_CONFIG_VERSION) throw new Error("Dashboard configuration version 3 is required.");
  requiredString(config.id, "Dashboard id");
  requiredString(config.title, "Dashboard title");
  ensureObject(config.dataSources, "Dashboard dataSources");
  for (const [sourceId, source] of Object.entries(config.dataSources)) {
    requiredString(sourceId, "Data source id");
    validateSource(sourceId, source);
  }
  const chartIds = new Set();
  for (const chart of configuredPanels(config)) {
    validateChartInstance(chart);
    ensureUnique(chartIds, chart.id, "Chart id");
    const source = config.dataSources[chart.sourceId];
    if (!source) throw new Error(`Chart "${chart.id}" references unknown source "${chart.sourceId}".`);
    if (!getChartSchema(chart.typeId).sources.includes(source.kind)) throw new Error(`Chart "${chart.id}" does not support ${source.kind} source "${chart.sourceId}".`);
  }
  return config;
}

/** Exports a deterministic, serializable v3 dashboard bundle without loaded runtime rows. */
export function serializeDashboardBundle(config, { now = null } = {}) {
  validateDashboardConfig(config);
  if (now !== null && (typeof now !== "string" || Number.isNaN(Date.parse(now)))) throw new Error("Bundle export time must be an ISO timestamp or null.");
  const serializable = serializableConfig(config);
  return {
    bundleType: DASHBOARD_BUNDLE_TYPE,
    version: DASHBOARD_CONFIG_VERSION,
    metadata: {
      exportedAt: now,
      sourceFingerprints: sourceFingerprints(serializable.dataSources),
    },
    config: serializable,
  };
}

/** Imports only strict v3 bundles and returns an independent configuration clone. */
export function parseDashboardBundle(text) {
  let bundle;
  try {
    bundle = JSON.parse(text);
  } catch {
    throw new Error("Dashboard bundle must be valid JSON.");
  }
  if (!isRecord(bundle) || bundle.bundleType !== DASHBOARD_BUNDLE_TYPE || bundle.version !== DASHBOARD_CONFIG_VERSION) {
    throw new Error("This dashboard supports version 3 bundles only.");
  }
  const config = serializableConfig(bundle.config);
  validateDashboardConfig(config);
  return config;
}
