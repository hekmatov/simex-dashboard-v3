import { parseTemporalValue } from "../charting/data/temporal.js";
import { profileDataset } from "../charting/data/profileDataset.js";
import { validateDashboardStructure } from "../charting/config/dashboardConfigStructure.js";
import {
  validateDashboardChartReferences,
} from "../charting/config/dashboardSemanticReferences.js";
import { validateTimeSyncGroups } from "../charting/time/timeSyncModel.js";
import { createDashboardSourceProviders } from "../data/dashboardSourceProviders.js";
import { createDataService, createSourceCache } from "../data/dataService.js";
import { createProviderRegistry } from "../data/providerRegistry.js";
import { loadCsv, parseCsvText } from "./loadCsv.js";

const dashboardSourceCache = createSourceCache();
const SOURCE_KINDS = new Set(["csv", "geojson"]);
const SOURCE_KEYS = new Set(["kind", "path", "provenance", "parsingMetadata"]);
const INLINE_SOURCE_KEYS = new Set([
  "fingerprint",
  "kind",
  "parsingMetadata",
  "provenance",
  "rows",
  "sourceFingerprint",
]);
const UPLOADED_SOURCE_KEYS = new Set([
  "csvText",
  "fileName",
  "fingerprint",
  "kind",
  "parsingMetadata",
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
const GEOJSON_GEOMETRY_TYPES = new Set([
  "Point",
  "MultiPoint",
  "LineString",
  "MultiLineString",
  "Polygon",
  "MultiPolygon",
]);
const GEOJSON_FEATURE_COLLECTION_KEYS = new Set(["bbox", "features", "type"]);
const GEOJSON_FEATURE_KEYS = new Set([
  "bbox",
  "geometry",
  "id",
  "properties",
  "type",
]);
const GEOJSON_COORDINATE_GEOMETRY_KEYS = new Set([
  "bbox",
  "coordinates",
  "type",
]);
const GEOJSON_COLLECTION_GEOMETRY_KEYS = new Set([
  "bbox",
  "geometries",
  "type",
]);

export async function loadDashboardDefinition(
  configPath,
  profilesPath = "config/dataset-profiles.json",
) {
  const portable = portableDashboard();
  if (usingFileProtocol() && portable?.config) {
    return {
      dashboard: portable.config,
      datasetProfiles: portable.datasetProfiles ?? {},
      portableSources: portable.sources ?? null,
    };
  }

  try {
    const [dashboard, datasetProfiles] = await Promise.all([
      fetchJson(configPath, `dashboard config: ${configPath}`),
      fetchJson(sourceUrl(profilesPath), `dataset profiles: ${profilesPath}`),
    ]);
    return { dashboard, datasetProfiles, portableSources: null };
  } catch (error) {
    if (portable?.config) {
      return {
        dashboard: portable.config,
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
) {
  const structure = validateDashboardStructure(dashboard, {
    allowRuntimeState: true,
  });
  const dashboardEntries = plainDataEntries(dashboard, "Dashboard config");
  const dataSources = entryValue(dashboardEntries, "dataSources") ?? {};
  const reusableProfiles = mergeDatasetProfiles(
    profilesForConfiguredCsvSources(dataSources, datasetProfiles),
    entryValue(dashboardEntries, "datasetProfiles"),
  );
  validateDatasetProfiles(dataSources, reusableProfiles);
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
    validateGeoJson,
  }));
  const dataService = createDataService({
    dataSources,
    profiles: reusableProfiles,
    portableSources,
    providers,
    cache: dashboardSourceCache,
  });
  for (const sourceId of Object.keys(dataSources)) {
    const request = { sourceId, purpose: "compatibility" };
    if (dataService.getSnapshot(request).status === "error") {
      dataService.evict(request);
    }
  }
  const {
    loadedData,
    profiles: hydratedProfiles,
  } = await dataService.hydrateAll({ purpose: "compatibility" });

  validateTimeSyncGroups(dashboard.timeSyncGroups ?? [], {
    charts: chartReferences.map(({ chart }) => chart),
    loadedData,
    profiles: hydratedProfiles,
  });

  return {
    ...dashboard,
    dataSources,
    datasetProfiles: hydratedProfiles,
    loadedData,
  };
}

export async function loadDashboardConfigProgressively(
  dashboard,
  datasetProfiles,
  portableSources = null,
  { onUpdate = () => {} } = {},
) {
  const structure = validateDashboardStructure(dashboard, {
    allowRuntimeState: true,
  });
  const dashboardEntries = plainDataEntries(dashboard, "Dashboard config");
  const dataSources = entryValue(dashboardEntries, "dataSources") ?? {};
  const reusableProfiles = mergeDatasetProfiles(
    profilesForConfiguredCsvSources(dataSources, datasetProfiles),
    entryValue(dashboardEntries, "datasetProfiles"),
  );
  validateDatasetProfiles(dataSources, reusableProfiles);
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
    validateGeoJson,
  }));
  const dataService = createDataService({
    dataSources,
    profiles: reusableProfiles,
    portableSources,
    providers,
    cache: dashboardSourceCache,
  });
  const sourceIds = Object.keys(dataSources);
  const loadedData = {};
  const hydratedProfiles = { ...reusableProfiles };
  const dataSourceStates = {};

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
    validateTimeSyncGroups(dashboard.timeSyncGroups ?? [], {
      charts: chartReferences.map(({ chart }) => chart),
      loadedData,
      profiles: hydratedProfiles,
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
  const entries = plainDataEntries(value, description);
  rejectUnknownEntries(
    entries,
    GEOJSON_FEATURE_COLLECTION_KEYS,
    `${description} FeatureCollection`,
  );
  if (entryValue(entries, "type") !== "FeatureCollection") {
    throw new Error(`${description} must be a GeoJSON FeatureCollection.`);
  }
  validateGeoJsonBbox(entryValue(entries, "bbox"), `${description} bbox`);
  const features = denseDataArray(
    entryValue(entries, "features"),
    `${description} features`,
  );
  if (features.length === 0) {
    throw new Error(`${description} features cannot be empty.`);
  }
  for (const [index, feature] of features.entries()) {
    validateGeoJsonFeature(feature, `${description} feature ${index}`);
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

function validateGeoJsonFeature(feature, description) {
  const entries = plainDataEntries(feature, description);
  rejectUnknownEntries(entries, GEOJSON_FEATURE_KEYS, `${description} Feature`);
  if (entryValue(entries, "type") !== "Feature") {
    throw new Error(`${description} must have GeoJSON type "Feature".`);
  }
  validateGeoJsonBbox(entryValue(entries, "bbox"), `${description} bbox`);
  const id = entryValue(entries, "id");
  if (
    id !== undefined
    && typeof id !== "string"
    && !(typeof id === "number" && Number.isFinite(id))
  ) {
    throw new Error(`${description} id must be a string or finite number.`);
  }
  const properties = entryValue(entries, "properties");
  if (properties !== null) {
    validateJsonObject(properties, `${description} properties`);
  }
  const geometry = entryValue(entries, "geometry");
  if (geometry !== null) validateGeoJsonGeometry(geometry, `${description} geometry`);
}

function validateGeoJsonGeometry(geometry, description) {
  const entries = plainDataEntries(geometry, description);
  const type = entryValue(entries, "type");
  if (type === "GeometryCollection") {
    rejectUnknownEntries(
      entries,
      GEOJSON_COLLECTION_GEOMETRY_KEYS,
      `${description} GeometryCollection`,
    );
    validateGeoJsonBbox(entryValue(entries, "bbox"), `${description} bbox`);
    const geometries = denseDataArray(
      entryValue(entries, "geometries"),
      `${description} geometries`,
    );
    if (geometries.length === 0) {
      throw new Error(`${description} geometries cannot be empty.`);
    }
    geometries.forEach((entry, index) => (
      validateGeoJsonGeometry(entry, `${description} geometry ${index}`)
    ));
    return;
  }
  if (!GEOJSON_GEOMETRY_TYPES.has(type)) {
    throw new Error(`${description} has an unsupported GeoJSON geometry type.`);
  }
  rejectUnknownEntries(
    entries,
    GEOJSON_COORDINATE_GEOMETRY_KEYS,
    `${description} ${type}`,
  );
  validateGeoJsonBbox(entryValue(entries, "bbox"), `${description} bbox`);
  const coordinates = entryValue(entries, "coordinates");
  switch (type) {
    case "Point":
      validatePosition(coordinates, `${description} coordinates`);
      break;
    case "MultiPoint":
      validatePositions(coordinates, `${description} coordinates`, 1);
      break;
    case "LineString":
      validateLineString(coordinates, `${description} coordinates`);
      break;
    case "MultiLineString":
      validateMultiLineString(coordinates, `${description} coordinates`);
      break;
    case "Polygon":
      validatePolygon(coordinates, `${description} coordinates`);
      break;
    case "MultiPolygon":
      validateMultiPolygon(coordinates, `${description} coordinates`);
      break;
    default:
      throw new Error(`${description} has an unsupported GeoJSON geometry type.`);
  }
}

function validateGeoJsonBbox(value, description) {
  if (value === undefined) return;
  const coordinates = denseDataArray(value, description);
  if (
    coordinates.length < 4
    || coordinates.length % 2 !== 0
    || coordinates.some((entry) => (
      typeof entry !== "number" || !Number.isFinite(entry)
    ))
  ) {
    throw new Error(`${description} must contain finite coordinate bounds.`);
  }
}

function validatePosition(value, description) {
  const position = denseDataArray(value, description);
  if (
    position.length < 2
    || position.some((entry) => (
      typeof entry !== "number" || !Number.isFinite(entry)
    ))
  ) {
    throw new Error(`${description} must be a position of finite numbers.`);
  }
  return position;
}

function validatePositions(value, description, minimum) {
  const positions = denseDataArray(value, description);
  if (positions.length < minimum) {
    throw new Error(`${description} must contain at least ${minimum} positions.`);
  }
  return positions.map((entry, index) => (
    validatePosition(entry, `${description} position ${index}`)
  ));
}

function validateLineString(value, description) {
  validatePositions(value, description, 2);
}

function validateMultiLineString(value, description) {
  const lines = denseDataArray(value, description);
  if (lines.length === 0) {
    throw new Error(`${description} must contain at least one line string.`);
  }
  lines.forEach((line, index) => (
    validateLineString(line, `${description} line string ${index}`)
  ));
}

function validateLinearRing(value, description) {
  const positions = validatePositions(value, description, 4);
  const first = positions[0];
  const last = positions[positions.length - 1];
  if (
    first.length !== last.length
    || first.some((coordinate, index) => coordinate !== last[index])
  ) {
    throw new Error(`${description} must be closed across every dimension.`);
  }
}

function validatePolygon(value, description) {
  const rings = denseDataArray(value, description);
  if (rings.length === 0) {
    throw new Error(`${description} must contain at least one linear ring.`);
  }
  rings.forEach((ring, index) => (
    validateLinearRing(ring, `${description} linear ring ${index}`)
  ));
}

function validateMultiPolygon(value, description) {
  const polygons = denseDataArray(value, description);
  if (polygons.length === 0) {
    throw new Error(`${description} must contain at least one polygon.`);
  }
  polygons.forEach((polygon, index) => (
    validatePolygon(polygon, `${description} polygon ${index}`)
  ));
}

function validateJsonObject(value, description) {
  for (const [key, entry] of plainDataEntries(value, description)) {
    if (DANGEROUS_KEYS.has(key)) {
      throw new Error(`${description} contains unsafe property "${key}".`);
    }
    validateJsonValue(entry, `${description}.${key}`);
  }
}

function validateJsonValue(value, description) {
  if (isJsonScalar(value)) return;
  if (Array.isArray(value)) {
    denseDataArray(value, description).forEach((entry, index) => (
      validateJsonValue(entry, `${description} ${index}`)
    ));
    return;
  }
  validateJsonObject(value, description);
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
