import { parseTemporalValue } from "../charting/data/temporal.js";
import { profileDataset } from "../charting/data/profileDataset.js";
import { validateDashboardStructure } from "../charting/config/dashboardConfigStructure.js";
import { migrateDashboardV3ToV4 } from "../charting/config/migrateDashboardV3ToV4.js";
import { migrateDashboardV4ToV5 } from "../content-library/migrateDashboardV4ToV5.js";
import { stripLegacyVantaBackground } from "../charting/config/dashboardPresentationV3.js";
import {
  normalizeDashboardTemporalConfig,
  validateCanonicalDashboardTemporalConfig,
} from "../charting/time/dashboardTemporalConfig.js";
import {
  validateDashboardChartReferences,
} from "../charting/config/dashboardSemanticReferences.js";
import { validateChronoGroups } from "../charting/time/chronoGroupModel.js";
import { createDashboardSourceProviders } from "../data/dashboardSourceProviders.js";
import { createDataService, createSourceCache } from "../data/dataService.js";
import { createProviderRegistry } from "../data/providerRegistry.js";
import { loadCsv, parseCsvText } from "./loadCsv.js";
import { validateStaticSource } from "../static-content/staticSourceSchema.js";
import { validateGeoJson as validateBoundedGeoJson } from "./geoJsonValidation.js";

const dashboardSourceCache = createSourceCache();
const SOURCE_KINDS = new Set(["csv", "geojson"]);
const SOURCE_KEYS = new Set(["kind", "path", "provenance", "parsingMetadata"]);
const INLINE_SOURCE_KEYS = new Set([
  "browserImageAssetIds",
  "fingerprint",
  "kind",
  "parsingMetadata",
  "provenance",
  "rows",
  "sourceFingerprint",
]);
const UPLOADED_SOURCE_KEYS = new Set([
  "browserAssetId",
  "csvText",
  "fileName",
  "fingerprint",
  "kind",
  "parsingMetadata",
  "provenance",
  "sourceFingerprint",
  "type",
]);
const UPLOADED_GEOJSON_SOURCE_KEYS = new Set([
  "browserAssetId",
  "fileName",
  "fingerprint",
  "geoJson",
  "kind",
  "provenance",
  "sourceFingerprint",
  "type",
]);
const PROVENANCE_KEYS = new Set(["label"]);
const PARSING_KEYS = new Set(["interpretation", "format", "timezone"]);
const PARSING_INTERPRETATIONS = new Set([
  "auto",
  "boolean",
  "category",
  "geographic",
  "numeric",
  "temporal",
]);
const TEMPORAL_FORMATS = new Set([
  "YYYY-MM-DD",
  "DD/MM/YYYY",
  "MM/DD/YYYY",
  "ISO-8601",
]);
const TIMEZONES = new Set(["date-only"]);
const PROFILE_KEYS = new Set([
  "columns",
  "fingerprint",
  "kind",
  "path",
  "provenance",
  "rowCount",
  "sourceId",
]);
const PROFILE_COLUMN_KEYS = new Set([
  "examples",
  "geographicHint",
  "missingCount",
  "name",
  "temporal",
  "type",
  "uniqueCount",
]);
const TEMPORAL_KEYS = new Set([
  "diagnostics",
  "parsingMetadata",
  "values",
]);
const DIAGNOSTIC_KEYS = new Set(["code", "format", "index", "value"]);
const DIAGNOSTIC_CODES = new Set([
  "ambiguous-date-format",
  "invalid-calendar-date",
  "invalid-date-format",
  "invalid-temporal-value",
  "invalid-time",
  "invalid-timezone",
  "unsupported-date-format",
]);
const COLUMN_TYPES = new Set([
  "boolean",
  "category",
  "geographic",
  "numeric",
  "temporal",
]);
const GEOGRAPHIC_HINTS = new Set([
  null,
  "latitude",
  "longitude",
  "place",
]);
const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const SOURCE_ID = /^[A-Za-z][A-Za-z0-9_-]*$/;

export function normalizeDashboardSource(dashboard, suppliedProfiles = {}) {
  const v4 = dashboard?.configVersion === 5
    ? structuredClone(dashboard)
    : migrateDashboardV3ToV4(dashboard);
  const migrated = migrateDashboardV4ToV5(v4);
  const presentationNormalized = stripLegacyVantaBackground(migrated);
  const normalized = normalizeDashboardTemporalConfig(presentationNormalized, {
    profiles: temporalMigrationProfiles(presentationNormalized, suppliedProfiles),
  });
  // Temporal normalization never changes source descriptors. Preserve the
  // established runtime descriptor identity after the inert-data check while
  // still cloning and normalizing temporal dashboard state.
  if (isRecord(presentationNormalized?.dataSources)) {
    normalized.dataSources = presentationNormalized.dataSources;
  }
  return normalized;
}

function temporalMigrationProfiles(dashboard, suppliedProfiles = {}) {
  const profiles = {
    ...(isRecord(suppliedProfiles) ? suppliedProfiles : {}),
    ...(isRecord(dashboard?.datasetProfiles) ? dashboard.datasetProfiles : {}),
  };
  const needsLegacyEvidence = Array.isArray(dashboard?.chronoGroups)
    && dashboard.chronoGroups.some((group) => (
      isRecord(group)
      && group.primaryClock !== undefined
      && group.period === undefined
    ));
  if (!needsLegacyEvidence || !isRecord(dashboard?.dataSources)) return profiles;

  for (const [sourceId, source] of Object.entries(dashboard.dataSources)) {
    if (!isRecord(source)) continue;
    let rows = null;
    if (source.kind === "inline" && Array.isArray(source.rows)) {
      rows = source.rows;
    } else if (source.type === "uploadedCsv" && typeof source.csvText === "string") {
      rows = parseCsvText(source.csvText, source.fileName ?? sourceId);
    }
    if (rows !== null) {
      profiles[sourceId] = profileDataset(
        rows,
        source.parsingMetadata ?? {},
      );
    }
  }
  return profiles;
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
export async function loadDashboardDefinition(
  configPath,
  profilesPath = "config/dataset-profiles.json",
) {
  const portable = portableDashboard();
  if (usingFileProtocol() && portable?.config) {
    return {
      dashboard: normalizeDashboardSource(portable.config, portable.datasetProfiles),
      datasetProfiles: portable.datasetProfiles ?? {},
      portableSources: portable.sources ?? null,
    };
  }

  try {
    const [dashboard, datasetProfiles] = await Promise.all([
      fetchJson(configPath, `dashboard config: ${configPath}`),
      fetchJson(sourceUrl(profilesPath), `dataset profiles: ${profilesPath}`),
    ]);
    return {
      dashboard: normalizeDashboardSource(dashboard, datasetProfiles),
      datasetProfiles,
      portableSources: null,
    };
  } catch (error) {
    if (portable?.config) {
      return {
        dashboard: normalizeDashboardSource(portable.config, portable.datasetProfiles),
        datasetProfiles: portable.datasetProfiles ?? {},
        portableSources: portable.sources ?? null,
      };
    }
    throw error;
  }
}

export async function loadDashboard(
  configPath,
  profilesPath = "config/dataset-profiles.json",
) {
  const definition = await loadDashboardDefinition(configPath, profilesPath);
  return loadDashboardConfig(
    definition.dashboard,
    definition.datasetProfiles,
    definition.portableSources,
  );
}

export async function loadDashboardConfig(
  dashboard,
  datasetProfiles,
  portableSources = null,
  { readAuthoredAsset } = {},
) {
  dashboard = normalizeDashboardSource(dashboard, datasetProfiles);
  validateDashboardSourceDescriptors(dashboard);
  const structure = validateDashboardStructure(dashboard, {
    allowRuntimeState: true,
  });
  validateCanonicalDashboardTemporalConfig(dashboard);
  const dashboardEntries = plainDataEntries(dashboard, "Dashboard config");
  const dataSources = entryValue(dashboardEntries, "dataSources") ?? {};
  const tabularDataSources = Object.fromEntries(
    plainDataEntries(dataSources, "Dashboard dataSources")
      .filter(([, source]) => !isTypedStaticSource(source)),
  );
  const reusableProfiles = mergeDatasetProfiles(
    profilesForConfiguredCsvSources(tabularDataSources, datasetProfiles),
    entryValue(dashboardEntries, "datasetProfiles"),
  );
  validateDatasetProfiles(tabularDataSources, reusableProfiles);
  const chartReferences = validateDashboardChartReferences(
    structure,
    dataSources,
  );
  const providers = createProviderRegistry(createDashboardSourceProviders({
    loadCsv,
    parseCsvText,
    profileDataset,
    fetchJson,
    sourceUrl,
    validateGeoJson: validateBoundedGeoJson,
  }));
  const dataService = createDataService({
    dataSources: tabularDataSources,
    profiles: reusableProfiles,
    portableSources,
    providers,
    cache: dashboardSourceCache,
  });
  for (const sourceId of Object.keys(tabularDataSources)) {
    const request = { sourceId, purpose: "compatibility" };
    if (dataService.getSnapshot(request).status === "error") {
      dataService.evict(request);
    }
  }
  const {
    loadedData,
    profiles: hydratedProfiles,
  } = await dataService.hydrateAll({ purpose: "compatibility" });
  const staticSourceStates = await resolveStaticSourceStates(
    dataSources,
    dashboard.assets ?? {},
    dashboard.contentLibrary?.mediaItems ?? {},
    { readAuthoredAsset },
  );
  const dataSourceStates = {
    ...Object.fromEntries(
      Object.keys(tabularDataSources).map((sourceId) => [sourceId, { status: "ready" }]),
    ),
    ...staticSourceStates,
  };

  validateChronoGroups(dashboard.chronoGroups ?? [], {
    charts: chartReferences.map(({ chart }) => chart),
    loadedData,
    profiles: hydratedProfiles,
    timezone: dashboard.timezone,
  });

  return {
    ...dashboard,
    dataSources,
    datasetProfiles: hydratedProfiles,
    loadedData,
    dataSourceStates,
  };
}

export async function loadDashboardConfigProgressively(
  dashboard,
  datasetProfiles,
  portableSources = null,
  { onUpdate = () => {}, readAuthoredAsset } = {},
) {
  dashboard = normalizeDashboardSource(dashboard, datasetProfiles);
  validateDashboardSourceDescriptors(dashboard);
  const structure = validateDashboardStructure(dashboard, {
    allowRuntimeState: true,
  });
  validateCanonicalDashboardTemporalConfig(dashboard);
  const dashboardEntries = plainDataEntries(dashboard, "Dashboard config");
  const dataSources = entryValue(dashboardEntries, "dataSources") ?? {};
  const tabularDataSources = Object.fromEntries(
    plainDataEntries(dataSources, "Dashboard dataSources")
      .filter(([, source]) => !isTypedStaticSource(source)),
  );
  const reusableProfiles = mergeDatasetProfiles(
    profilesForConfiguredCsvSources(tabularDataSources, datasetProfiles),
    entryValue(dashboardEntries, "datasetProfiles"),
  );
  validateDatasetProfiles(tabularDataSources, reusableProfiles);
  const chartReferences = validateDashboardChartReferences(
    structure,
    dataSources,
  );
  const providers = createProviderRegistry(createDashboardSourceProviders({
    loadCsv,
    parseCsvText,
    profileDataset,
    fetchJson,
    sourceUrl,
    validateGeoJson: validateBoundedGeoJson,
  }));
  const dataService = createDataService({
    dataSources: tabularDataSources,
    profiles: reusableProfiles,
    portableSources,
    providers,
    cache: dashboardSourceCache,
  });
  const sourceIds = Object.keys(tabularDataSources);
  const loadedData = {};
  const hydratedProfiles = { ...reusableProfiles };
  const dataSourceStates = await resolveStaticSourceStates(
    dataSources,
    dashboard.assets ?? {},
    dashboard.contentLibrary?.mediaItems ?? {},
    { readAuthoredAsset },
  );

  for (const sourceId of sourceIds) {
    const request = { sourceId, purpose: "dashboard" };
    if (dataService.getSnapshot(request).status === "error") {
      dataService.evict(request);
    }
    const snapshot = dataService.getSnapshot(request);
    if (snapshot.status === "ready") {
      loadedData[sourceId] = snapshot.data;
      if (snapshot.profile) hydratedProfiles[sourceId] = snapshot.profile;
      dataSourceStates[sourceId] = { status: "ready" };
    } else {
      dataSourceStates[sourceId] = { status: "loading" };
    }
  }

  let latest = publishProgressiveDashboard();
  await Promise.all(sourceIds.map(async (sourceId) => {
    const request = { sourceId, purpose: "dashboard" };
    try {
      const snapshot = await dataService.load(request);
      loadedData[sourceId] = snapshot.data;
      if (snapshot.profile) hydratedProfiles[sourceId] = snapshot.profile;
      dataSourceStates[sourceId] = { status: "ready" };
    } catch {
      const snapshot = dataService.getSnapshot(request);
      if (snapshot.data !== null && snapshot.data !== undefined) {
        loadedData[sourceId] = snapshot.data;
      }
      dataSourceStates[sourceId] = { status: "error" };
    }
    latest = publishProgressiveDashboard();
  }));

  if (sourceIds.every((sourceId) => dataSourceStates[sourceId].status === "ready")) {
    validateChronoGroups(dashboard.chronoGroups ?? [], {
      charts: chartReferences.map(({ chart }) => chart),
      loadedData,
      profiles: hydratedProfiles,
      timezone: dashboard.timezone,
    });
  }
  return latest;

  function publishProgressiveDashboard() {
    const runtimeDashboard = {
      ...dashboard,
      dataSources,
      datasetProfiles: { ...hydratedProfiles },
      loadedData: { ...loadedData },
      dataSourceStates: Object.fromEntries(
        Object.entries(dataSourceStates).map(([sourceId, state]) => [
          sourceId,
          { ...state },
        ]),
      ),
    };
    onUpdate(runtimeDashboard);
    return runtimeDashboard;
  }
}

export function validateDashboardSourceDescriptors(dashboard) {
  const dashboardEntries = plainDataEntries(
    dashboard,
    "Dashboard config",
  );
  const dataSources = entryValue(dashboardEntries, "dataSources") ?? {};
  for (const [sourceId, source] of plainDataEntries(
    dataSources,
    "Dashboard dataSources",
  )) {
    if (isTypedStaticSource(source)) {
      validateSourceId(sourceId);
      validateStaticSource(source, { assets: dashboard.assets ?? {} });
      continue;
    }
    validateDataSourceDescriptor(sourceId, source);
  }
}

function isTypedStaticSource(source) {
  return source?.kind === "staticText" || source?.kind === "staticImage";
}

async function resolveStaticSourceStates(
  dataSources,
  assets,
  mediaItems,
  { readAuthoredAsset } = {},
) {
  const states = {};
  for (const [sourceId, source] of plainDataEntries(
    dataSources,
    "Dashboard dataSources",
  )) {
    if (!isTypedStaticSource(source)) continue;
    if (source.kind === "staticText") {
      states[sourceId] = { status: "ready" };
      continue;
    }
    const mediaItem = mediaItems[source.mediaId];
    if (!mediaItem || mediaItem.health === "needs-relink") {
      states[sourceId] = { status: "error", code: "replacement-required" };
      continue;
    }
    if (mediaItem.current.kind !== "asset") {
      states[sourceId] = { status: "ready" };
      continue;
    }
    const asset = assets[mediaItem.current.assetId];
    if (!asset || asset.storageState !== "durable") {
      states[sourceId] = { status: "error", code: "authored-asset-missing" };
      continue;
    }
    if (typeof readAuthoredAsset !== "function") {
      states[sourceId] = { status: "ready" };
      continue;
    }
    try {
      await readAuthoredAsset(mediaItem.current.assetId);
      states[sourceId] = { status: "ready" };
    } catch (error) {
      states[sourceId] = {
        status: "error",
        code: error?.code === "AUTHORED_ASSET_CORRUPT"
          ? "authored-asset-corrupt"
          : "authored-asset-missing",
      };
    }
  }
  return states;
}

export function profilesForConfiguredCsvSources(
  dataSources,
  datasetProfiles = {},
) {
  const sourcesById = new Map(
    plainDataEntries(dataSources ?? {}, "Dashboard dataSources"),
  );
  return Object.fromEntries(
    plainDataEntries(
      datasetProfiles ?? {},
      "External dataset profiles",
    )
      .filter(([sourceId]) => sourcesById.get(sourceId)?.kind === "csv")
      .map(([sourceId, profile]) => [
        sourceId,
        structuredClone(profile),
      ]),
  );
}

function mergeDatasetProfiles(externalProfiles, embeddedProfiles) {
  const merged = new Map(
    plainDataEntries(
      externalProfiles ?? {},
      "External dataset profiles",
    ),
  );
  for (const [sourceId, profile] of plainDataEntries(
    embeddedProfiles ?? {},
    "Dashboard datasetProfiles",
  )) {
    // A serialized/imported dashboard is a self-contained accepted contract.
    // External tracked profiles fill gaps but cannot replace its source-local
    // profile with a stale profile that happened to use the same source id.
    merged.set(sourceId, profile);
  }
  return Object.fromEntries(
    [...merged].map(([sourceId, profile]) => [
      sourceId,
      structuredClone(profile),
    ]),
  );
}

export function validateDataSourceDescriptor(sourceId, source) {
  validateSourceId(sourceId);
  const entries = plainDataEntries(
    source,
    `Data source "${sourceId}" descriptor`,
  );
  const kind = entryValue(entries, "kind");
  if (kind === "staticText" || kind === "staticImage") {
    validateStaticSource(source);
    return "static";
  }
  if (kind === "inline") {
    rejectUnknownEntries(
      entries,
      INLINE_SOURCE_KEYS,
      `data source "${sourceId}" descriptor`,
    );
    validateTabularRows(
      entryValue(entries, "rows"),
      `Inline data source "${sourceId}" rows`,
    );
    validateOptionalSourceMetadata(sourceId, entries);
    return "inline";
  }
  if (kind === "dataset" && entryValue(entries, "type") === "uploadedCsv") {
    rejectUnknownEntries(
      entries,
      UPLOADED_SOURCE_KEYS,
      `data source "${sourceId}" descriptor`,
    );
    if (typeof entryValue(entries, "csvText") !== "string") {
      throw new Error(`Uploaded CSV source "${sourceId}" csvText is required.`);
    }
    const fileName = entryValue(entries, "fileName");
    if (
      fileName !== undefined
      && (typeof fileName !== "string" || fileName.trim() === "")
    ) {
      throw new Error(`Uploaded CSV source "${sourceId}" fileName is invalid.`);
    }
    validateOptionalSourceMetadata(sourceId, entries);
    return "uploadedCsv";
  }
  if (kind === "dataset" && entryValue(entries, "type") === "uploadedGeoJson") {
    rejectUnknownEntries(
      entries,
      UPLOADED_GEOJSON_SOURCE_KEYS,
      `data source "${sourceId}" descriptor`,
    );
    const fileName = entryValue(entries, "fileName");
    if (
      fileName !== undefined
      && (typeof fileName !== "string" || fileName.trim() === "")
    ) {
      throw new Error(`Uploaded GeoJSON source "${sourceId}" fileName is invalid.`);
    }
    validateGeoJson(
      entryValue(entries, "geoJson"),
      `Uploaded GeoJSON source "${sourceId}"`,
    );
    validateOptionalSourceMetadata(sourceId, entries);
    return "uploadedGeoJson";
  }
  if (kind === "dataset") {
    throw new Error(
      `Data source "${sourceId}" kind and type are not supported by chart system v3.`,
    );
  }
  rejectUnknownEntries(
    entries,
    SOURCE_KEYS,
    `data source "${sourceId}" descriptor`,
  );
  if (!SOURCE_KINDS.has(kind)) {
    throw new Error(
      `Data source "${sourceId}" kind must be "csv" or "geojson".`,
    );
  }
  const normalizedPath = safePublicPath(entryValue(entries, "path"), sourceId);
  const expectedExtension = kind === "csv" ? ".csv" : ".geojson";
  if (!normalizedPath.toLowerCase().endsWith(expectedExtension)) {
    throw new Error(
      `Data source "${sourceId}" ${kind} path must end with ${expectedExtension}.`,
    );
  }
  validateProvenance(
    entryValue(entries, "provenance"),
    `Data source "${sourceId}" provenance`,
  );
  const parsingMetadata = entryValue(entries, "parsingMetadata");
  if (parsingMetadata !== undefined) {
    validateParsingMetadata(sourceId, parsingMetadata);
  }
  return normalizedPath;
}

export function safePublicPath(value, sourceId = "unknown") {
  if (
    typeof value !== "string"
    || value === ""
    || value.includes("\\")
    || value.includes("%")
    || value.includes(":")
    || value.startsWith("/")
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
  const sourceEntries = plainDataEntries(
    dataSources,
    "Dashboard dataSources",
  );
  const profileEntries = plainDataEntries(
    datasetProfiles,
    "Dataset profiles",
  );
  const profilesById = new Map(profileEntries);
  const csvIds = [];

  for (const [sourceId, source] of sourceEntries) {
    validateDataSourceDescriptor(sourceId, source);
    if (source.kind === "csv") csvIds.push(sourceId);
  }
  csvIds.sort();

  const profileIds = [...profilesById.keys()].sort();
  const missing = csvIds.filter((sourceId) => !profilesById.has(sourceId));
  if (missing.length > 0) {
    throw new Error(`Missing dataset profile for source "${missing[0]}".`);
  }
  const runtimeTabularIds = sourceEntries
    .filter(([, source]) => (
      source.kind === "inline" || source.type === "uploadedCsv"
    ))
    .map(([sourceId]) => sourceId);
  const unexpected = profileIds.filter((sourceId) => (
    !csvIds.includes(sourceId) && !runtimeTabularIds.includes(sourceId)
  ));
  if (unexpected.length > 0) {
    throw new Error(
      `Unexpected dataset profile for source "${unexpected[0]}".`,
    );
  }

  for (const sourceId of csvIds) {
    validateDatasetProfile(
      sourceId,
      sourceEntries.find(([id]) => id === sourceId)[1],
      profilesById.get(sourceId),
    );
  }
}

export function validateGeoJson(value, description = "GeoJSON source") {
  const result = validateBoundedGeoJson(value);
  if (!result.schema.ok) {
    throw new Error(`${description} ${result.schema.errors[0].message}`);
  }
  if (result.admission?.status === "rejected") {
    throw new Error(
      `${description} exceeds GeoJSON admission limits: ${result.admission.violations.join(", ")}.`,
    );
  }
  return value;
}

function validateDatasetProfile(sourceId, source, profile) {
  const entries = plainDataEntries(
    profile,
    `Dataset profile "${sourceId}"`,
  );
  rejectUnknownEntries(entries, PROFILE_KEYS, `dataset profile "${sourceId}"`);
  if (entryValue(entries, "sourceId") !== sourceId) {
    throw new Error(`Dataset profile "${sourceId}" sourceId does not match.`);
  }
  if (entryValue(entries, "kind") !== "csv") {
    throw new Error(`Dataset profile "${sourceId}" kind must be "csv".`);
  }
  if (entryValue(entries, "path") !== source.path) {
    throw new Error(`Dataset profile "${sourceId}" profile path does not match.`);
  }
  validateProvenance(
    entryValue(entries, "provenance"),
    `Dataset profile "${sourceId}" provenance`,
  );
  if (
    stableStringify(entryValue(entries, "provenance"))
    !== stableStringify(source.provenance)
  ) {
    throw new Error(
      `Dataset profile "${sourceId}" provenance does not match its source.`,
    );
  }

  const rowCount = entryValue(entries, "rowCount");
  const fingerprint = entryValue(entries, "fingerprint");
  if (
    !Number.isSafeInteger(rowCount)
    || rowCount < 0
    || !/^[a-f0-9]{64}$/.test(fingerprint)
  ) {
    throw new Error(`Dataset profile "${sourceId}" is invalid.`);
  }
  const columns = denseDataArray(
    entryValue(entries, "columns"),
    `Dataset profile "${sourceId}" columns`,
  );
  if (columns.length === 0) {
    throw new Error(`Dataset profile "${sourceId}" columns cannot be empty.`);
  }
  const columnNames = new Set();
  for (const [index, column] of columns.entries()) {
    validateProfileColumn(sourceId, column, index, rowCount, columnNames);
  }
}

function validateProfileColumn(
  sourceId,
  column,
  index,
  rowCount,
  columnNames,
) {
  const description = `Dataset profile "${sourceId}" column ${index}`;
  const entries = plainDataEntries(column, description);
  rejectUnknownEntries(entries, PROFILE_COLUMN_KEYS, description);
  const name = entryValue(entries, "name");
  validateColumnName(name, `${description} name`);
  if (columnNames.has(name)) {
    throw new Error(`Dataset profile "${sourceId}" column name "${name}" is duplicated.`);
  }
  columnNames.add(name);

  const type = entryValue(entries, "type");
  const missingCount = entryValue(entries, "missingCount");
  const uniqueCount = entryValue(entries, "uniqueCount");
  if (
    !COLUMN_TYPES.has(type)
    || !Number.isSafeInteger(missingCount)
    || missingCount < 0
    || missingCount > rowCount
    || !Number.isSafeInteger(uniqueCount)
    || uniqueCount < 0
    || uniqueCount > rowCount
    || !GEOGRAPHIC_HINTS.has(entryValue(entries, "geographicHint"))
  ) {
    throw new Error(`${description} is invalid.`);
  }
  const examples = denseDataArray(
    entryValue(entries, "examples"),
    `${description} examples`,
  );
  if (examples.length > 3 || examples.some((value) => !isJsonScalar(value))) {
    throw new Error(`${description} examples are invalid.`);
  }

  const temporal = entryValue(entries, "temporal");
  if (type === "temporal") {
    validateTemporalProfile(sourceId, name, temporal, rowCount);
  } else if (temporal !== undefined) {
    throw new Error(`${description} non-temporal column cannot contain temporal evidence.`);
  }
}

function validateTemporalProfile(sourceId, columnName, temporal, rowCount) {
  const description = `Dataset profile "${sourceId}" temporal column "${columnName}"`;
  const entries = plainDataEntries(temporal, description);
  rejectUnknownEntries(entries, TEMPORAL_KEYS, description);
  const parsingMetadata = entryValue(entries, "parsingMetadata");
  const parsing = validateParsingRule(
    sourceId,
    columnName,
    parsingMetadata,
    { authorRule: false },
  );
  if (!["auto", "temporal"].includes(parsing.interpretation)) {
    throw new Error(`${description} temporal parsing interpretation is invalid.`);
  }
  const values = denseDataArray(
    entryValue(entries, "values"),
    `${description} values`,
  );
  if (values.length !== rowCount) {
    throw new Error(`${description} values must align with every source row.`);
  }
  for (const [index, value] of values.entries()) {
    if (value === null) continue;
    const parsed = (
      typeof value === "string"
      && parseTemporalValue(value, { interpretation: "temporal" })
    );
    if (!parsed?.ok || parsed.canonical !== value) {
      throw new Error(
        `${description} values must contain canonical temporal strings or null (index ${index}).`,
      );
    }
  }

  const diagnostics = denseDataArray(
    entryValue(entries, "diagnostics"),
    `${description} diagnostics`,
  );
  const diagnosticIndexes = new Set();
  for (const [diagnosticIndex, diagnostic] of diagnostics.entries()) {
    const diagnosticEntries = plainDataEntries(
      diagnostic,
      `${description} diagnostic ${diagnosticIndex}`,
    );
    rejectUnknownEntries(
      diagnosticEntries,
      DIAGNOSTIC_KEYS,
      `${description} diagnostic`,
    );
    const index = entryValue(diagnosticEntries, "index");
    const code = entryValue(diagnosticEntries, "code");
    const format = entryValue(diagnosticEntries, "format");
    if (
      !Number.isSafeInteger(index)
      || index < 0
      || index >= rowCount
      || diagnosticIndexes.has(index)
      || !DIAGNOSTIC_CODES.has(code)
      || !isJsonScalar(entryValue(diagnosticEntries, "value"))
      || (format !== undefined && !TEMPORAL_FORMATS.has(format))
      || values[index] !== null
    ) {
      throw new Error(`${description} diagnostic is invalid.`);
    }
    diagnosticIndexes.add(index);
  }
}

function validateParsingMetadata(sourceId, parsingMetadata) {
  const entries = plainDataEntries(
    parsingMetadata,
    `Data source "${sourceId}" parsingMetadata`,
  );
  for (const [columnName, parsing] of entries) {
    validateColumnName(
      columnName,
      `Data source "${sourceId}" parsing column name`,
    );
    validateParsingRule(
      sourceId,
      columnName,
      parsing,
      { authorRule: true },
    );
  }
}

function validateParsingRule(
  sourceId,
  columnName,
  parsing,
  { authorRule },
) {
  const description = `Data source "${sourceId}" parsing rule for "${columnName}"`;
  const entries = plainDataEntries(parsing, description);
  rejectUnknownEntries(entries, PARSING_KEYS, description);
  const interpretation = entryValue(entries, "interpretation");
  const format = entryValue(entries, "format");
  const timezone = entryValue(entries, "timezone");
  if (!PARSING_INTERPRETATIONS.has(interpretation)) {
    throw new Error(`${description} interpretation is invalid.`);
  }
  if (format !== undefined && !TEMPORAL_FORMATS.has(format)) {
    throw new Error(`${description} format is invalid.`);
  }
  if (timezone !== undefined && !TIMEZONES.has(timezone)) {
    throw new Error(`${description} timezone is invalid.`);
  }
  if (
    authorRule
    && interpretation !== "temporal"
    && (format !== undefined || timezone !== undefined)
  ) {
    throw new Error(`${description} only temporal interpretation accepts format or timezone.`);
  }
  if (
    timezone === "date-only"
    && format === "ISO-8601"
  ) {
    throw new Error(`${description} date-only timezone cannot use ISO-8601 instant format.`);
  }
  return { interpretation, format, timezone };
}

function validateProvenance(provenance, description) {
  const entries = plainDataEntries(provenance, description);
  rejectUnknownEntries(entries, PROVENANCE_KEYS, description);
  const label = entryValue(entries, "label");
  if (typeof label !== "string" || label.trim() === "") {
    throw new Error(`${description} label is required.`);
  }
}

function validateSourceId(sourceId) {
  if (
    typeof sourceId !== "string"
    || !SOURCE_ID.test(sourceId)
    || DANGEROUS_KEYS.has(sourceId)
  ) {
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

function validateOptionalSourceMetadata(sourceId, entries) {
  const provenance = entryValue(entries, "provenance");
  if (provenance !== undefined) {
    validateProvenance(provenance, `Data source "${sourceId}" provenance`);
  }
  const parsingMetadata = entryValue(entries, "parsingMetadata");
  if (parsingMetadata !== undefined) {
    validateParsingMetadata(sourceId, parsingMetadata);
  }
  for (const key of ["fingerprint", "sourceFingerprint"]) {
    const value = entryValue(entries, key);
    if (
      value !== undefined
      && (typeof value !== "string" || value.trim() === "")
    ) {
      throw new Error(`Data source "${sourceId}" ${key} is invalid.`);
    }
  }
}

function validateTabularRows(value, description) {
  const rows = denseDataArray(value, description);
  for (const [rowIndex, row] of rows.entries()) {
    for (const [key, cell] of plainDataEntries(
      row,
      `${description} row ${rowIndex}`,
    )) {
      validateColumnName(key, `${description} row ${rowIndex} column name`);
      if (!isJsonScalar(cell)) {
        throw new TypeError(
          `${description} row ${rowIndex} value "${key}" must be a finite JSON scalar.`,
        );
      }
    }
  }
}

function sourceUrl(sourcePath) {
  const baseUrl = import.meta.env?.BASE_URL ?? "/";
  return `${baseUrl}${sourcePath}`;
}

function portableDashboard() {
  return globalThis.window?.SIMEX_PORTABLE_DASHBOARD ?? null;
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

function plainDataEntries(value, description) {
  if (
    value === null
    || typeof value !== "object"
    || Array.isArray(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
    || Object.getOwnPropertySymbols(value).length > 0
  ) {
    throw new TypeError(`${description} must be an ordinary data object.`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const entries = [];
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (!Object.hasOwn(descriptor, "value") || !descriptor.enumerable) {
      throw new TypeError(
        `${description} property "${key}" must be an enumerable data property.`,
      );
    }
    entries.push([key, descriptor.value]);
  }
  return entries;
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
  const values = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = descriptors[index];
    if (
      !descriptor
      || !Object.hasOwn(descriptor, "value")
      || !descriptor.enumerable
    ) {
      throw new TypeError(`${description} must be a dense data array.`);
    }
    values.push(descriptor.value);
  }
  const extra = Object.keys(descriptors).filter((key) => (
    key !== "length" && !/^(?:0|[1-9]\d*)$/.test(key)
  ));
  if (extra.length > 0) {
    throw new TypeError(`${description} cannot contain named properties.`);
  }
  return values;
}

function rejectUnknownEntries(entries, allowed, description) {
  for (const [key] of entries) {
    if (!allowed.has(key)) {
      throw new Error(`Unknown ${description} property "${key}".`);
    }
  }
}

function entryValue(entries, key) {
  return entries.find(([entryKey]) => entryKey === key)?.[1];
}

function isJsonScalar(value) {
  return (
    value === null
    || typeof value === "string"
    || typeof value === "boolean"
    || (typeof value === "number" && Number.isFinite(value))
  );
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
