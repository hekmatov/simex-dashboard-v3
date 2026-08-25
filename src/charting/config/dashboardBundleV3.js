import Papa from "papaparse";

import { profileDataset } from "../data/profileDataset.js";
import { parseTemporalValue } from "../data/temporal.js";
import { getChartSchema } from "../schemas/chartSchemaRegistry.js";
import { validateScene } from "../time/sceneSchema.js";
import { validateChronoGroups } from "../time/chronoGroupModel.js";
import {
  normalizeDashboardTemporalConfig,
  validateCanonicalDashboardTemporalConfig,
} from "../time/dashboardTemporalConfig.js";
import {
  normalizeChartInstance,
} from "./chartConfigV3.js";
import { stripLegacyVantaBackground } from "./dashboardPresentationV3.js";
import {
  DASHBOARD_CONFIG_STRUCTURE,
  validateDashboardStructure,
} from "./dashboardConfigStructure.js";
import { migrateDashboardV3ToV4 } from "./migrateDashboardV3ToV4.js";
import {
  validateDashboardChartReferences,
} from "./dashboardSemanticReferences.js";
import {
  profilesForConfiguredCsvSources,
  safePublicPath,
  validateGeoJson,
  validateDatasetProfiles,
} from "../../lib/loadDashboard.js";
import {
  validateAuthoredAssetManifest,
  validateStaticSource,
} from "../../static-content/staticSourceSchema.js";
import {
  decodeAssetBase64,
  sha256HexSync,
} from "../../static-content/assets/assetPayloadEnvelope.js";

export const DASHBOARD_SCHEMA_VERSION = DASHBOARD_CONFIG_STRUCTURE.version;
export const DASHBOARD_BUNDLE_VERSION = 4;
export const DASHBOARD_CONFIG_VERSION = DASHBOARD_SCHEMA_VERSION;
export const DASHBOARD_BUNDLE_TYPE = "simex-dashboard-bundle";

const RUNTIME_CONFIGURATION_KEYS = new Set([
  "chartDataStates",
  "dataSourceStates",
  "loadedData",
  "loadedRows",
  "runtimeRows",
]);
const TRACKED_SOURCE_KEYS = new Set(["kind", "path", "parsingMetadata", "provenance"]);
const UPLOADED_CSV_SOURCE_KEYS = new Set(["browserAssetId", "csvText", "fileName", "fingerprint", "kind", "parsingMetadata", "provenance", "sourceFingerprint", "type"]);
const UPLOADED_GEOJSON_SOURCE_KEYS = new Set(["browserAssetId", "fileName", "fingerprint", "geoJson", "kind", "provenance", "sourceFingerprint", "type"]);
const INLINE_SOURCE_KEYS = new Set(["browserImageAssetIds", "fingerprint", "kind", "parsingMetadata", "provenance", "rows", "sourceFingerprint"]);
const BUNDLE_KEYS = new Set(["assetPayloads", "bundleType", "config", "metadata", "version"]);
const BUNDLE_METADATA_KEYS = new Set(["exportedAt", "networkDependencies", "sourceFingerprints"]);
const ASSET_PAYLOAD_KEYS = new Set(["base64", "byteLength", "mediaType", "sha256"]);
const PROVENANCE_KEYS = new Set(["label"]);
const PARSING_RULE_KEYS = new Set(["format", "interpretation", "timezone"]);
const PARSING_INTERPRETATIONS = new Set(["auto", "boolean", "category", "geographic", "numeric", "temporal"]);
const TEMPORAL_FORMATS = new Set(["YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY", "ISO-8601"]);
const TIMEZONES = new Set(["date-only"]);
const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const SOURCE_ID = /^[A-Za-z][A-Za-z0-9_-]*$/;
const CANONICAL_ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const LEGACY_STATIC_INLINE_DATA = Object.freeze({
  image: Object.freeze({
    minRows: 1,
    maxRows: 1,
    fields: Object.freeze(["src", "alt", "fit"]),
  }),
});

function isRecord(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
function requiredString(value, description) { if (typeof value !== "string" || value.trim() === "") throw new Error(`${description} is required.`); }
function ensureObject(value, description) { if (!isRecord(value)) throw new Error(`${description} must be an object.`); }
function checkKnownKeys(value, keys, description) { for (const key of Object.keys(value)) if (!keys.has(key)) throw new Error(`Unknown ${description} property "${key}".`); }

function plainDataEntries(value, description) {
  if (
    !isRecord(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
    || Object.getOwnPropertySymbols(value).length > 0
  ) {
    throw new TypeError(`${description} must be an ordinary data object.`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  return Object.entries(descriptors).map(([key, descriptor]) => {
    if (!Object.hasOwn(descriptor, "value") || !descriptor.enumerable) {
      throw new TypeError(`${description} property "${key}" must be an enumerable data property.`);
    }
    return [key, descriptor.value];
  });
}

function denseDataArray(value, description) {
  if (
    !Array.isArray(value)
    || Object.getPrototypeOf(value) !== Array.prototype
    || Object.getOwnPropertySymbols(value).length > 0
  ) {
    throw new TypeError(`${description} must be an ordinary array.`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const entries = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = descriptors[index];
    if (!descriptor || !Object.hasOwn(descriptor, "value") || !descriptor.enumerable) {
      throw new TypeError(`${description} must be a dense data array.`);
    }
    entries.push(descriptor.value);
  }
  const named = Object.keys(descriptors).filter((key) => key !== "length" && !/^(?:0|[1-9]\d*)$/.test(key));
  if (named.length > 0) throw new TypeError(`${description} cannot contain named properties.`);
  return entries;
}

function entryValue(entries, key) {
  return entries.find(([entryKey]) => entryKey === key)?.[1];
}

function rejectUnknownEntries(entries, allowed, description) {
  for (const [key] of entries) {
    if (!allowed.has(key)) throw new Error(`Unknown ${description} property "${key}".`);
  }
}

function validateSourceId(sourceId) {
  if (typeof sourceId !== "string" || !SOURCE_ID.test(sourceId) || DANGEROUS_KEYS.has(sourceId)) {
    throw new Error(`Data source id "${String(sourceId)}" is invalid.`);
  }
}

function validateColumnName(value, description) {
  if (
    typeof value !== "string"
    || value.trim() === ""
    || /[\u0000-\u001f\u007f]/.test(value)
    || DANGEROUS_KEYS.has(value)
  ) {
    throw new Error(`${description} is invalid.`);
  }
}

function validateProvenance(value, description) {
  const entries = plainDataEntries(value, description);
  rejectUnknownEntries(entries, PROVENANCE_KEYS, description.toLowerCase());
  requiredString(entryValue(entries, "label"), `${description} label`);
}

function validateParsingMetadata(sourceId, value) {
  const entries = plainDataEntries(value, `Data source "${sourceId}" parsingMetadata`);
  for (const [columnName, rule] of entries) {
    validateColumnName(columnName, `Data source "${sourceId}" parsing column name`);
    validateParsingRule(rule, `Data source "${sourceId}" parsing rule for "${columnName}"`);
  }
}

function validateParsingRule(value, description) {
  const entries = plainDataEntries(value, description);
  rejectUnknownEntries(entries, PARSING_RULE_KEYS, description.toLowerCase());
  const interpretation = entryValue(entries, "interpretation");
  const format = entryValue(entries, "format");
  const timezone = entryValue(entries, "timezone");
  if (!PARSING_INTERPRETATIONS.has(interpretation)) throw new Error(`${description} interpretation is invalid.`);
  if (format !== undefined && !TEMPORAL_FORMATS.has(format)) throw new Error(`${description} format is invalid.`);
  if (timezone !== undefined && !TIMEZONES.has(timezone)) throw new Error(`${description} timezone is invalid.`);
  if (interpretation !== "temporal" && (format !== undefined || timezone !== undefined)) {
    throw new Error(`${description} only temporal interpretation accepts format or timezone.`);
  }
}

function validateFingerprint(value, description) {
  if (value !== undefined && (typeof value !== "string" || value.trim() === "")) {
    throw new Error(`${description} must be a non-empty string.`);
  }
}

function validateRowValue(value, description) {
  if (
    value === null
    || typeof value === "string"
    || typeof value === "boolean"
    || (typeof value === "number" && Number.isFinite(value))
  ) return;
  throw new TypeError(`${description} must be a finite JSON scalar.`);
}

function validateRows(value, description) {
  const rows = denseDataArray(value, description);
  for (const [rowIndex, row] of rows.entries()) {
    for (const [key, cell] of plainDataEntries(row, `${description} row ${rowIndex}`)) {
      if (DANGEROUS_KEYS.has(key)) throw new Error(`${description} row ${rowIndex} contains unsafe property "${key}".`);
      validateColumnName(key, `${description} row ${rowIndex} column name`);
      validateRowValue(cell, `${description} row ${rowIndex} value "${key}"`);
    }
  }
  return rows;
}

function sourceRows(sourceId, source) {
  if (source.kind === "inline") return source.rows;
  if (source.type === "uploadedCsv") {
    const parsed = Papa.parse(source.csvText, { header: true, skipEmptyLines: true });
    if (parsed.errors.length) throw new Error(`Uploaded CSV source "${sourceId}" could not be parsed.`);
    return parsed.data;
  }
  return null;
}

function temporalMigrationProfiles(config, suppliedProfiles = {}) {
  const profiles = {
    ...(isRecord(suppliedProfiles) ? suppliedProfiles : {}),
    ...(isRecord(config.datasetProfiles) ? config.datasetProfiles : {}),
  };
  const needsLegacyEvidence = Array.isArray(config.chronoGroups)
    && config.chronoGroups.some((group) => (
      isRecord(group)
      && group.primaryClock !== undefined
      && group.period === undefined
    ));
  if (!needsLegacyEvidence || !isRecord(config.dataSources)) return profiles;

  for (const [sourceId, source] of Object.entries(config.dataSources)) {
    if (!isRecord(source)) continue;
    if (source.browserAssetId && profiles[sourceId]) continue;
    const rows = sourceRows(sourceId, source);
    if (rows !== null) {
      profiles[sourceId] = profileDataset(
        rows,
        source.parsingMetadata ?? {},
      );
    }
  }
  return profiles;
}

function profileColumns(sourceId, source, profiles = {}) {
  const profile = profiles[sourceId];
  if (source.browserAssetId && profile) {
    ensureObject(profile, `Data source "${sourceId}" profile`);
    if (!Array.isArray(profile.columns)) throw new Error(`Data source "${sourceId}" profile columns must be an array.`);
    return profile.columns;
  }
  const rows = sourceRows(sourceId, source);
  if (rows !== null) return profileDataset(rows, source.parsingMetadata ?? {}).columns;
  if (!profile) return Object.entries(source.parsingMetadata ?? {}).map(([name, metadata]) => ({ name, type: metadata.interpretation }));
  ensureObject(profile, `Data source "${sourceId}" profile`);
  if (!Array.isArray(profile.columns)) throw new Error(`Data source "${sourceId}" profile columns must be an array.`);
  return profile.columns;
}

function sourceColumnTypes(sourceId, source, profiles) {
  const columns = profileColumns(sourceId, source, profiles);
  const rows = source.browserAssetId && profiles[sourceId]
    ? null
    : sourceRows(sourceId, source);
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

function validateSource(
  sourceId,
  source,
  {
    allowBrowserAssetIds = false,
    allowTypedStaticSources = false,
    allowSessionImageAssets = false,
    assets,
  } = {},
) {
  validateSourceId(sourceId);
  const entries = plainDataEntries(source, `Data source "${sourceId}"`);
  const kind = entryValue(entries, "kind");
  const type = entryValue(entries, "type");
  if (kind === "csv" || kind === "geojson") {
    rejectUnknownEntries(entries, TRACKED_SOURCE_KEYS, `data source "${sourceId}"`);
    const sourcePath = safePublicPath(entryValue(entries, "path"), sourceId);
    const extension = kind === "csv" ? ".csv" : ".geojson";
    if (!sourcePath.toLowerCase().endsWith(extension)) throw new Error(`Data source "${sourceId}" ${kind} path must end with ${extension}.`);
    validateProvenance(entryValue(entries, "provenance"), `Data source "${sourceId}" provenance`);
  } else if (kind === "dataset" && type === "uploadedCsv") {
    rejectUnknownEntries(entries, UPLOADED_CSV_SOURCE_KEYS, `data source "${sourceId}"`);
    if (typeof entryValue(entries, "csvText") !== "string") throw new Error(`Uploaded CSV source "${sourceId}" csvText must be a string.`);
    const fileName = entryValue(entries, "fileName");
    if (fileName !== undefined) requiredString(fileName, `Uploaded CSV source "${sourceId}" fileName`);
    if (entryValue(entries, "browserAssetId") === undefined) {
      validateRows(sourceRows(sourceId, source), `Uploaded CSV source "${sourceId}" rows`);
    }
  } else if (kind === "dataset" && type === "uploadedGeoJson") {
    rejectUnknownEntries(entries, UPLOADED_GEOJSON_SOURCE_KEYS, `data source "${sourceId}"`);
    const fileName = entryValue(entries, "fileName");
    if (fileName !== undefined) requiredString(fileName, `Uploaded GeoJSON source "${sourceId}" fileName`);
    validateGeoJson(entryValue(entries, "geoJson"), `Uploaded GeoJSON source "${sourceId}"`);
  } else if (kind === "inline") {
    rejectUnknownEntries(entries, INLINE_SOURCE_KEYS, `data source "${sourceId}"`);
    validateRows(entryValue(entries, "rows"), `Inline data source "${sourceId}" rows`);
  } else if (isTypedStaticSource(source)) {
    validateStaticSource(source, { assets });
  } else {
    throw new Error(`Data source "${sourceId}" kind and type are not supported by chart system v3.`);
  }
  const provenance = entryValue(entries, "provenance");
  if (provenance !== undefined && kind !== "csv" && kind !== "geojson") validateProvenance(provenance, `Data source "${sourceId}" provenance`);
  const parsingMetadata = entryValue(entries, "parsingMetadata");
  if (parsingMetadata !== undefined) validateParsingMetadata(sourceId, parsingMetadata);
  validateFingerprint(entryValue(entries, "fingerprint"), `Data source "${sourceId}" fingerprint`);
  validateFingerprint(entryValue(entries, "sourceFingerprint"), `Data source "${sourceId}" sourceFingerprint`);
  const browserAssetId = entryValue(entries, "browserAssetId");
  if (browserAssetId !== undefined && !allowBrowserAssetIds) {
    throw new Error(`Data source "${sourceId}" contains a browser-only asset reference.`);
  }
  validateFingerprint(browserAssetId, `Data source "${sourceId}" browserAssetId`);
  const browserImageAssetIds = entryValue(entries, "browserImageAssetIds");
  if (browserImageAssetIds !== undefined) {
    if (!allowBrowserAssetIds || kind !== "inline") {
      throw new Error(`Data source "${sourceId}" contains browser-only image asset references.`);
    }
    for (const [rowIndex, assetId] of plainDataEntries(
      browserImageAssetIds,
      `Data source "${sourceId}" browserImageAssetIds`,
    )) {
      if (!/^\d+$/.test(rowIndex)) {
        throw new Error(`Data source "${sourceId}" browser image row index is invalid.`);
      }
      validateFingerprint(assetId, `Data source "${sourceId}" browser image asset id`);
    }
  }
}

function validateManualData(chart, source) {
  if (source.kind !== "inline") return;
  const schema = getChartSchema(chart.typeId);
  if (!schema.sources.includes("inline")) throw new Error(`Chart "${chart.id}" does not support inline source "${chart.sourceId}".`);
  const manualData = schema.manualData ?? LEGACY_STATIC_INLINE_DATA[chart.typeId];
  if (!manualData) throw new Error(`Chart "${chart.id}" does not allow manual data.`);
  const rows = source.rows;
  if (manualData.minRows === 1 && manualData.maxRows === 1 && rows.length !== 1) throw new Error(`Chart "${chart.id}" manual data must contain exactly one row.`);
  if (manualData.minRows !== undefined && rows.length < manualData.minRows) throw new Error(`Chart "${chart.id}" manual data requires exactly ${manualData.minRows} row.`);
  if (manualData.maxRows !== undefined && rows.length > manualData.maxRows) throw new Error(`Chart "${chart.id}" manual data exceeds ${manualData.maxRows} rows.`);
  if (manualData.fields) {
    const allowed = new Set(manualData.fields);
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
    const nextContext = context === "dataSources" ? "source" : context === "source" && key === "rows" ? "opaque" : "structural";
    if (key === "dataSources") sanitizeStructural(value[key], "dataSources");
    else sanitizeStructural(value[key], nextContext);
  }
}

function assertStructuralData(value, description = "Dashboard configuration") {
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    denseDataArray(value, description).forEach((entry, index) => (
      assertStructuralData(entry, `${description} ${index}`)
    ));
    return;
  }
  for (const [key, entry] of plainDataEntries(value, description)) {
    if (!RUNTIME_CONFIGURATION_KEYS.has(key)) {
      assertStructuralData(entry, `${description} property "${key}"`);
    }
  }
}

function serializableConfig(config) {
  assertStructuralData(config);
  const clone = structuredClone(config);
  sanitizeStructural(clone);
  return clone;
}

function normalizeDashboardChartInstances(config) {
  if (!isRecord(config) || !Array.isArray(config.pages)) return config;
  return {
    ...config,
    pages: config.pages.map((page) => {
      if (!isRecord(page) || !Array.isArray(page.sections)) return page;
      return {
        ...page,
        sections: page.sections.map((section) => {
          if (!isRecord(section) || !Array.isArray(section.panels)) return section;
          return {
            ...section,
            panels: section.panels.map((panel) => {
              if (isRecord(panel) && Object.hasOwn(panel, "chart")) {
                return {
                  ...panel,
                  chart: normalizeChartInstance(panel.chart),
                };
              }
              return normalizeChartInstance(panel);
            }),
          };
        }),
      };
    }),
  };
}

export function normalizeDashboardBoundary(config, { profiles = {} } = {}) {
  const migrated = migrateDashboardV3ToV4(config);
  const chartNormalized = normalizeDashboardChartInstances(migrated);
  const presentationNormalized = stripLegacyVantaBackground(chartNormalized);
  return normalizeDashboardTemporalConfig(presentationNormalized, {
    profiles: temporalMigrationProfiles(presentationNormalized, profiles),
  });
}

function validCanonicalInstant(now) {
  if (typeof now !== "string" || !CANONICAL_ISO_INSTANT.test(now)) return false;
  const parsed = parseTemporalValue(now, { format: "ISO-8601" });
  return parsed.ok && parsed.canonical === now;
}

/** Validates all configured charts, source records, and page/section placement in a v3 dashboard. */
export function validateDashboardConfig(
  config,
  {
    allowBrowserAssetIds = false,
    allowTypedStaticSources = false,
    allowSessionImageAssets = false,
  } = {},
) {
  const input = config;
  assertStructuralData(config);
  config = migrateDashboardV3ToV4(config);
  const structure = validateDashboardStructure(config, {
    allowRuntimeState: true,
  });
  validateCanonicalDashboardTemporalConfig(config);
  if (config.configVersion !== DASHBOARD_SCHEMA_VERSION) throw new Error("Dashboard configuration version 4 is required.");
  requiredString(config.id, "Dashboard id"); requiredString(config.title, "Dashboard title");
  const sourceEntries = plainDataEntries(config.dataSources, "Dashboard dataSources");
  const profiles = config.datasetProfiles ?? {};
  plainDataEntries(profiles, "Dashboard datasetProfiles");
  validateAuthoredAssetManifest(config.assets ?? {});
  const sources = new Map();
  for (const [sourceId, source] of sourceEntries) {
    validateSource(sourceId, source, {
      allowBrowserAssetIds,
      allowTypedStaticSources,
      allowSessionImageAssets,
      assets: config.assets ?? {},
    });
    sources.set(sourceId, source);
  }
  const tabularDataSources = Object.fromEntries(
    sourceEntries.filter(([, source]) => !isTypedStaticSource(source)),
  );
  validateDatasetProfiles(tabularDataSources, profiles);
  const chartReferences = validateDashboardChartReferences(
    structure,
    config.dataSources,
    {
      assets: config.assets ?? {},
      columnTypesForSource: (sourceId, source) => (
        sourceColumnTypes(sourceId, source, profiles)
      ),
    },
  );
  const charts = chartReferences.map(({ chart }) => chart);
  for (const { chart, source } of chartReferences) {
    validateManualData(chart, source);
  }
  const loadedData = {};
  const validationProfiles = structuredClone(profiles);
  for (const [sourceId, source] of sources) {
    if (isTypedStaticSource(source)) continue;
    const rows = source.browserAssetId && profiles[sourceId]
      ? null
      : sourceRows(sourceId, source);
    loadedData[sourceId] = rows ?? [];
    if (validationProfiles[sourceId] === undefined) {
      validationProfiles[sourceId] = (
        rows === null
          ? profiles[sourceId]
          : profileDataset(rows, source.parsingMetadata ?? {})
      );
    }
  }
  validateChronoGroups(config.chronoGroups ?? [], {
    charts,
    loadedData,
    profiles: validationProfiles,
    timezone: config.timezone,
  });
  const sceneCharts = chartReferences.map(({ chart, pageId }) => ({
    ...chart,
    pageId,
  }));
  for (const scene of config.scenes ?? []) {
    validateScene(scene, {
      chronoGroups: config.chronoGroups ?? [],
      pages: config.pages,
      charts: sceneCharts,
      scenes: config.scenes,
    });
  }
  return input;
}

function isTypedStaticSource(source) {
  return source?.kind === "staticText" || source?.kind === "staticImage";
}

/** Reads only the explicitly supplied v3 storage key and validates before use. */
export function readDashboardStorage(storage, storageKey, { profiles } = {}) {
  if (!storage || typeof storage.getItem !== "function") {
    throw new TypeError("Dashboard storage must provide getItem.");
  }
  requiredString(storageKey, "Dashboard storage key");
  const text = storage.getItem(storageKey);
  if (text === null) return null;
  let config;
  try {
    config = JSON.parse(text);
  } catch {
    throw new Error("Saved dashboard configuration must be valid JSON.");
  }
  return normalizeStoredDashboardConfig(config, { profiles });
}

/** Normalizes and validates a parsed dashboard from the browser storage boundary. */
export function normalizeStoredDashboardConfig(config, { profiles } = {}) {
  const candidate = profiles === undefined
    ? config
    : {
        ...config,
        datasetProfiles: {
          ...profilesForConfiguredCsvSources(
            config.dataSources,
            profiles,
          ),
          ...structuredClone(config.datasetProfiles ?? {}),
        },
      };
  const normalized = normalizeDashboardBoundary(candidate, {
    profiles: profiles ?? {},
  });
  validateDashboardConfig(normalized, { allowBrowserAssetIds: true });
  return structuredClone(normalized);
}

/** Adds a normalized chart, optional new source, and group proposal atomically. */
export function integrateCreatedChart(dashboard, payload, target) {
  ensureObject(dashboard, "Dashboard configuration");
  ensureObject(payload, "Chart creation payload");
  ensureObject(target, "Chart placement");
  requiredString(target.pageId, "Chart placement page id");
  requiredString(target.sectionId, "Chart placement section id");
  const next = serializableConfig(dashboard);
  if (payload.source !== undefined) {
    const sourceId = payload.chart?.sourceId;
    requiredString(sourceId, "Created chart source id");
    if (Object.hasOwn(next.dataSources, sourceId)) {
      throw new Error(`Data source "${sourceId}" already exists.`);
    }
    next.dataSources[sourceId] = structuredClone(payload.source);
  }
  if (payload.chronoGroups !== undefined) {
    next.chronoGroups = structuredClone(payload.chronoGroups);
  }
  const page = next.pages.find(({ id }) => id === target.pageId);
  const section = page?.sections?.find(({ id }) => id === target.sectionId);
  if (!section) {
    throw new Error("The selected chart destination no longer exists.");
  }
  const chart = normalizeChartInstance(payload.chart);
  const relation = target.placement?.relation ?? target.relation ?? "append";
  if (relation === "append") {
    section.panels.push(chart);
  } else if (relation === "before" || relation === "after") {
    const anchorIndex = section.panels.findIndex(
      (panel) => (panel.chart ?? panel).id === target.anchorId,
    );
    if (anchorIndex < 0) {
      throw new Error("The reviewed chart placement anchor no longer exists.");
    }
    section.panels.splice(relation === "before" ? anchorIndex : anchorIndex + 1, 0, chart);
  } else {
    throw new Error(`Unsupported chart placement relation "${String(relation)}".`);
  }
  validateDashboardSessionCandidate(next);
  return next;
}

/** Replaces one normalized chart and its complete group proposal atomically. */
export function integrateSavedChart(dashboard, payload) {
  ensureObject(dashboard, "Dashboard configuration");
  ensureObject(payload, "Chart save payload");
  const chart = normalizeChartInstance(payload.chart);
  const next = serializableConfig(dashboard);
  let replaced = false;
  for (const page of next.pages ?? []) {
    for (const section of page.sections ?? []) {
      section.panels = (section.panels ?? []).map((panel) => {
        if ((panel.chart ?? panel).id !== chart.id) return panel;
        replaced = true;
        return Object.hasOwn(panel, "chart")
          ? { ...panel, chart: structuredClone(chart) }
          : structuredClone(chart);
      });
    }
  }
  if (!replaced) throw new Error(`Chart "${chart.id}" does not exist in the dashboard.`);
  next.chronoGroups = structuredClone(payload.chronoGroups ?? next.chronoGroups ?? []);
  validateDashboardSessionCandidate(next);
  return next;
}

/** Validates the complete dashboard-v4 session candidate, including assets. */
export function validateDashboardSessionCandidate(candidate) {
  validateDashboardConfig(candidate, {
    allowBrowserAssetIds: true,
  });
  return candidate;
}

export function serializeDashboardBundle(config, { now = null, assetPayloads = {} } = {}) {
  const chartNormalized = serializableConfig(
    normalizeDashboardChartInstances(config),
  );
  const serializable = normalizeDashboardBoundary(chartNormalized);
  validateDashboardConfig(serializable);
  if (now !== null && !validCanonicalInstant(now)) throw new Error("Bundle export time must be a valid canonical ISO-8601 timestamp or null.");
  const verifiedPayloads = validateAssetPayloadEnvelope(serializable, assetPayloads);
  return {
    bundleType: DASHBOARD_BUNDLE_TYPE,
    version: DASHBOARD_BUNDLE_VERSION,
    metadata: {
      exportedAt: now,
      sourceFingerprints: sourceFingerprints(serializable.dataSources),
      networkDependencies: linkedImageDependencies(serializable),
    },
    config: serializable,
    assetPayloads: verifiedPayloads,
  };
}

export function parseDashboardBundle(text, { includeEnvelope = false } = {}) {
  let bundle;
  try { bundle = JSON.parse(text); } catch { throw new Error("Dashboard bundle must be valid JSON."); }
  if (!isRecord(bundle) || bundle.bundleType !== DASHBOARD_BUNDLE_TYPE || bundle.version !== DASHBOARD_BUNDLE_VERSION) throw new Error("This dashboard supports version 4 bundles only.");
  if (!isRecord(bundle.config)) throw new Error("Bundle config must be a dashboard configuration object.");
  const bundleEntries = plainDataEntries(bundle, "Dashboard bundle");
  rejectUnknownEntries(bundleEntries, BUNDLE_KEYS, "dashboard bundle");
  const config = normalizeDashboardBoundary(structuredClone(bundle.config));
  validateDashboardConfig(config);
  const assetPayloads = validateAssetPayloadEnvelope(config, bundle.assetPayloads ?? {});
  const metadataEntries = plainDataEntries(bundle.metadata, "Dashboard bundle metadata");
  rejectUnknownEntries(metadataEntries, BUNDLE_METADATA_KEYS, "dashboard bundle metadata");
  const exportedAt = entryValue(metadataEntries, "exportedAt");
  if (exportedAt !== null && !validCanonicalInstant(exportedAt)) throw new Error("Bundle export time must be a valid canonical ISO-8601 timestamp or null.");
  validateSourceFingerprints(
    entryValue(metadataEntries, "sourceFingerprints"),
    sourceFingerprints(config.dataSources),
  );
  validateNetworkDependencies(
    entryValue(metadataEntries, "networkDependencies"),
    linkedImageDependencies(config),
  );
  return includeEnvelope ? { config, assetPayloads } : config;
}

function validateAssetPayloadEnvelope(config, value) {
  const payloadEntries = plainDataEntries(value, "Dashboard bundle assetPayloads");
  const payloads = {};
  for (const [assetId, payload] of payloadEntries) {
    const manifest = config.assets?.[assetId];
    if (!manifest) throw new Error(`Dashboard bundle contains unknown authored asset payload "${assetId}".`);
    const entries = plainDataEntries(payload, `Authored asset payload "${assetId}"`);
    rejectUnknownEntries(entries, ASSET_PAYLOAD_KEYS, `authored asset payload "${assetId}"`);
    const bytes = decodeAssetBase64(entryValue(entries, "base64"));
    const sha256 = entryValue(entries, "sha256");
    const byteLength = entryValue(entries, "byteLength");
    const mediaType = entryValue(entries, "mediaType");
    if (bytes.byteLength !== byteLength || byteLength !== manifest.byteLength) {
      throw new Error(`Authored asset payload "${assetId}" byte length does not match its manifest.`);
    }
    if (mediaType !== manifest.mediaType) {
      throw new Error(`Authored asset payload "${assetId}" media type does not match its manifest.`);
    }
    if (sha256 !== manifest.sha256 || sha256HexSync(bytes) !== sha256) {
      throw new Error(`Authored asset payload "${assetId}" hash does not match its manifest.`);
    }
    payloads[assetId] = { base64: entryValue(entries, "base64"), byteLength, mediaType, sha256 };
  }
  for (const source of Object.values(config.dataSources ?? {})) {
    if (source?.kind !== "staticImage" || source.origin?.kind !== "asset") continue;
    if (!Object.hasOwn(payloads, source.origin.assetId)) {
      throw new Error(`Dashboard bundle is missing authored asset payload "${source.origin.assetId}".`);
    }
  }
  return payloads;
}

function linkedImageDependencies(config) {
  return [...new Set(Object.values(config.dataSources ?? {}).flatMap((source) => (
    source?.kind === "staticImage" && source.origin?.kind === "url"
      ? [source.origin.url]
      : []
  )))].sort();
}

function validateNetworkDependencies(value, expected) {
  const dependencies = denseDataArray(value, "Dashboard bundle networkDependencies");
  if (dependencies.some((entry) => typeof entry !== "string")) {
    throw new Error("Dashboard bundle networkDependencies must contain URLs.");
  }
  if (JSON.stringify([...dependencies].sort()) !== JSON.stringify(expected)) {
    throw new Error("Dashboard bundle networkDependencies do not match linked image sources.");
  }
}

function validateSourceFingerprints(value, expected) {
  const entries = plainDataEntries(value, "Dashboard bundle sourceFingerprints");
  const expectedIds = Object.keys(expected).sort();
  const actualIds = entries.map(([sourceId]) => {
    validateSourceId(sourceId);
    return sourceId;
  }).sort();
  if (JSON.stringify(actualIds) !== JSON.stringify(expectedIds)) {
    throw new Error("Dashboard bundle sourceFingerprints must match every configured data source.");
  }
  for (const [sourceId, fingerprint] of entries) {
    if (fingerprint !== null && typeof fingerprint !== "string") {
      throw new Error(`Dashboard bundle source fingerprint "${sourceId}" must be a string or null.`);
    }
    if (fingerprint !== expected[sourceId]) {
      throw new Error(`Dashboard bundle source fingerprint "${sourceId}" does not match its data source.`);
    }
  }
}
