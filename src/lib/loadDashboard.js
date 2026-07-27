import { loadCsv, parseCsvText } from "./loadCsv.js";

const dataSourceCache = new Map();
const SOURCE_KINDS = new Set(["csv", "geojson"]);
const SOURCE_KEYS = new Set(["kind", "path", "provenance", "parsingMetadata"]);
const PARSING_KEYS = new Set(["interpretation", "format", "timezone"]);
const PROFILE_KEYS = new Set([
  "columns",
  "fingerprint",
  "kind",
  "path",
  "provenance",
  "rowCount",
  "sourceId",
  "warnings",
]);
const PROFILE_COLUMN_KEYS = new Set([
  "examples",
  "geographicHint",
  "missingCount",
  "name",
  "parsing",
  "temporalValues",
  "type",
  "uniqueCount",
  "warnings",
]);
const COLUMN_TYPES = new Set([
  "boolean",
  "category",
  "geographic",
  "numeric",
  "temporal",
]);

export async function loadDashboard(
  configPath,
  profilesPath = "config/dataset-profiles.json",
) {
  const portable = portableDashboard();
  if (usingFileProtocol() && portable?.config) {
    return loadDashboardConfig(
      portable.config,
      portable.datasetProfiles,
      portable.sources,
    );
  }

  try {
    const [dashboard, datasetProfiles] = await Promise.all([
      fetchJson(configPath, `dashboard config: ${configPath}`),
      fetchJson(sourceUrl(profilesPath), `dataset profiles: ${profilesPath}`),
    ]);
    return loadDashboardConfig(dashboard, datasetProfiles);
  } catch (error) {
    if (portable?.config) {
      return loadDashboardConfig(
        portable.config,
        portable.datasetProfiles,
        portable.sources,
      );
    }
    throw error;
  }
}

export async function loadDashboardConfig(
  dashboard,
  datasetProfiles,
  portableSources = null,
) {
  if (!isRecord(dashboard)) {
    throw new Error("Dashboard config must be an object.");
  }
  const dataSources = dashboard.dataSources ?? {};
  const reusableProfiles = datasetProfiles ?? dashboard.datasetProfiles;
  validateDatasetProfiles(dataSources, reusableProfiles);

  const loadedData = {};
  for (const [sourceId, source] of Object.entries(dataSources)) {
    loadedData[sourceId] = await loadDataSource(
      sourceId,
      source,
      portableSources?.[sourceId],
    );
  }

  return {
    ...dashboard,
    pages: normalizePages(dashboard),
    dataSources,
    datasetProfiles: reusableProfiles,
    loadedData,
  };
}

export function validateDataSourceDescriptor(sourceId, source) {
  if (!isRecord(source)) {
    throw new Error(`Data source "${sourceId}" descriptor must be an object.`);
  }
  rejectUnknownKeys(source, SOURCE_KEYS, `data source "${sourceId}" descriptor`);
  if (!SOURCE_KINDS.has(source.kind)) {
    throw new Error(
      `Data source "${sourceId}" kind must be "csv" or "geojson".`,
    );
  }
  const normalizedPath = safePublicPath(source.path, sourceId);
  const expectedExtension = source.kind === "csv" ? ".csv" : ".geojson";
  if (!normalizedPath.toLowerCase().endsWith(expectedExtension)) {
    throw new Error(
      `Data source "${sourceId}" ${source.kind} path must end with ${expectedExtension}.`,
    );
  }
  if (!isRecord(source.provenance)) {
    throw new Error(`Data source "${sourceId}" provenance must be an object.`);
  }
  if (
    typeof source.provenance.label !== "string"
    || source.provenance.label.trim() === ""
  ) {
    throw new Error(
      `Data source "${sourceId}" provenance label is required.`,
    );
  }
  if (source.parsingMetadata !== undefined) {
    validateParsingMetadata(sourceId, source.parsingMetadata);
  }
  return normalizedPath;
}

export function safePublicPath(value, sourceId = "unknown") {
  if (
    typeof value !== "string"
    || value === ""
    || value.includes("\\")
    || value.includes("%")
    || value.startsWith("/")
    || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(value)
    || value.includes("?")
    || value.includes("#")
    || /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new Error(
      `Data source "${sourceId}" path must be a safe relative public path.`,
    );
  }
  const segments = value.split("/");
  if (
    segments.some((segment) => segment === "" || segment === "." || segment === "..")
    || segments[0] !== "data"
  ) {
    throw new Error(
      `Data source "${sourceId}" path must be a safe relative public path.`,
    );
  }
  return value;
}

export function validateDatasetProfiles(dataSources, datasetProfiles) {
  if (!isRecord(dataSources)) {
    throw new Error("Dashboard dataSources must be an object.");
  }
  if (!isRecord(datasetProfiles)) {
    throw new Error("Dataset profiles must be an object.");
  }

  const csvIds = [];
  for (const [sourceId, source] of Object.entries(dataSources)) {
    validateDataSourceDescriptor(sourceId, source);
    if (source.kind === "csv") csvIds.push(sourceId);
  }
  csvIds.sort();

  const profileIds = Object.keys(datasetProfiles).sort();
  const missing = csvIds.filter((sourceId) => !profileIds.includes(sourceId));
  if (missing.length > 0) {
    throw new Error(`Missing dataset profile for source "${missing[0]}".`);
  }
  const unexpected = profileIds.filter((sourceId) => !csvIds.includes(sourceId));
  if (unexpected.length > 0) {
    throw new Error(
      `Unexpected dataset profile for source "${unexpected[0]}".`,
    );
  }

  for (const sourceId of csvIds) {
    validateDatasetProfile(
      sourceId,
      dataSources[sourceId],
      datasetProfiles[sourceId],
    );
  }
}

async function loadDataSource(sourceId, source, portableSource) {
  const cacheKey = dataSourceCacheKey(sourceId, source, portableSource);
  if (dataSourceCache.has(cacheKey)) {
    return dataSourceCache.get(cacheKey);
  }

  const loadPromise = loadDataSourceFresh(sourceId, source, portableSource);
  dataSourceCache.set(cacheKey, loadPromise);
  try {
    const loaded = await loadPromise;
    dataSourceCache.set(cacheKey, loaded);
    return loaded;
  } catch (error) {
    dataSourceCache.delete(cacheKey);
    throw error;
  }
}

async function loadDataSourceFresh(sourceId, source, portableSource) {
  validateDataSourceDescriptor(sourceId, source);
  if (portableSource) {
    return parsePortableSource(sourceId, source, portableSource);
  }

  const url = sourceUrl(source.path);
  if (source.kind === "geojson") {
    return fetchJson(url, `data file: ${source.path}`);
  }
  return loadCsv(url);
}

function validateDatasetProfile(sourceId, source, profile) {
  if (!isRecord(profile)) {
    throw new Error(`Dataset profile "${sourceId}" must be an object.`);
  }
  rejectUnknownKeys(profile, PROFILE_KEYS, `dataset profile "${sourceId}"`);
  if (profile.sourceId !== sourceId) {
    throw new Error(`Dataset profile "${sourceId}" sourceId does not match.`);
  }
  if (profile.kind !== "csv") {
    throw new Error(`Dataset profile "${sourceId}" kind must be "csv".`);
  }
  if (profile.path !== source.path) {
    throw new Error(`Dataset profile "${sourceId}" profile path does not match.`);
  }
  if (
    !Number.isSafeInteger(profile.rowCount)
    || profile.rowCount < 0
    || !Array.isArray(profile.columns)
    || profile.columns.length === 0
    || !Array.isArray(profile.warnings)
    || !/^[a-f0-9]{64}$/.test(profile.fingerprint)
  ) {
    throw new Error(`Dataset profile "${sourceId}" is invalid.`);
  }
  if (JSON.stringify(profile.provenance) !== JSON.stringify(source.provenance)) {
    throw new Error(
      `Dataset profile "${sourceId}" provenance does not match its source.`,
    );
  }

  const columnNames = new Set();
  for (const column of profile.columns) {
    if (!isRecord(column)) {
      throw new Error(`Dataset profile "${sourceId}" column is invalid.`);
    }
    rejectUnknownKeys(
      column,
      PROFILE_COLUMN_KEYS,
      `dataset profile "${sourceId}" column`,
    );
    if (
      typeof column.name !== "string"
      || column.name === ""
      || columnNames.has(column.name)
      || !COLUMN_TYPES.has(column.type)
      || !Number.isSafeInteger(column.missingCount)
      || column.missingCount < 0
      || !Number.isSafeInteger(column.uniqueCount)
      || column.uniqueCount < 0
      || !Array.isArray(column.examples)
      || !Array.isArray(column.warnings)
    ) {
      throw new Error(`Dataset profile "${sourceId}" column is invalid.`);
    }
    columnNames.add(column.name);
    if (column.parsing !== undefined) {
      validateParsingRule(sourceId, column.name, column.parsing);
    }
    if (
      column.temporalValues !== undefined
      && !Array.isArray(column.temporalValues)
    ) {
      throw new Error(
        `Dataset profile "${sourceId}" temporal values are invalid.`,
      );
    }
  }
}

function validateParsingMetadata(sourceId, parsingMetadata) {
  if (!isRecord(parsingMetadata)) {
    throw new Error(
      `Data source "${sourceId}" parsingMetadata must be an object.`,
    );
  }
  for (const [columnName, parsing] of Object.entries(parsingMetadata)) {
    validateParsingRule(sourceId, columnName, parsing);
  }
}

function validateParsingRule(sourceId, columnName, parsing) {
  if (!isRecord(parsing)) {
    throw new Error(
      `Data source "${sourceId}" parsing rule for "${columnName}" must be an object.`,
    );
  }
  rejectUnknownKeys(
    parsing,
    PARSING_KEYS,
    `data source "${sourceId}" parsing rule for "${columnName}"`,
  );
  if (
    typeof parsing.interpretation !== "string"
    || parsing.interpretation.trim() === ""
  ) {
    throw new Error(
      `Data source "${sourceId}" parsing interpretation for "${columnName}" is required.`,
    );
  }
  for (const key of ["format", "timezone"]) {
    if (
      parsing[key] !== undefined
      && (typeof parsing[key] !== "string" || parsing[key].trim() === "")
    ) {
      throw new Error(
        `Data source "${sourceId}" parsing ${key} for "${columnName}" must be a non-empty string.`,
      );
    }
  }
}

function dataSourceCacheKey(sourceId, source, portableSource) {
  return [
    sourceId,
    source.kind,
    source.path,
    stableStringify(source.parsingMetadata ?? {}),
    portableSource ? "portable" : "network",
  ].join(":");
}

function sourceUrl(sourcePath) {
  const baseUrl = import.meta.env?.BASE_URL ?? "/";
  return `${baseUrl}${sourcePath}`;
}

function portableDashboard() {
  return globalThis.window?.SIMEX_PORTABLE_DASHBOARD ?? null;
}

function parsePortableSource(sourceId, source, portableSource) {
  if (!isRecord(portableSource) || portableSource.kind !== source.kind) {
    throw new Error(
      `Portable data source "${sourceId}" does not match its descriptor.`,
    );
  }
  if (source.kind === "geojson") {
    if (!isRecord(portableSource.data)) {
      throw new Error(`Portable GeoJSON source "${sourceId}" is invalid.`);
    }
    return structuredClone(portableSource.data);
  }
  if (typeof portableSource.text !== "string") {
    throw new Error(`Portable CSV source "${sourceId}" is invalid.`);
  }
  return parseCsvText(portableSource.text, source.path);
}

function usingFileProtocol() {
  return globalThis.window?.location?.protocol === "file:";
}

async function fetchJson(url, description) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not load ${description}`);
  }
  return response.json();
}

function rejectUnknownKeys(value, allowed, description) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      throw new Error(`Unknown ${description} property "${key}".`);
    }
  }
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }
  return `{${Object.keys(value).sort().map((key) => (
    `${JSON.stringify(key)}:${stableStringify(value[key])}`
  )).join(",")}}`;
}

function normalizePages(dashboard) {
  if (Array.isArray(dashboard.pages)) {
    return dashboard.pages;
  }

  return [
    {
      id: "dashboard",
      label: "Dashboard",
      title: dashboard.title,
      description: dashboard.description,
      sections: [
        {
          id: "main",
          title: dashboard.title,
          description: dashboard.description,
          layout: dashboard.layout,
          panels: dashboard.charts ?? [],
        },
      ],
    },
  ];
}
