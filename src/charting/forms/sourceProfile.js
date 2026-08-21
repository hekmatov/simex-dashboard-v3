import { profileDataset } from "../data/profileDataset.js";

const DEFAULT_CSV_LIMITS = Object.freeze({
  maxBytes: 2 * 1024 * 1024,
  maxRows: 50_000,
});

export function profileChartSource({
  sourceId,
  kind = "existing",
  rows = [],
  authorMetadata = {},
  provenance = null,
  availability = "available",
  byteLength = null,
  limits = DEFAULT_CSV_LIMITS,
} = {}) {
  const id = requiredId(sourceId);
  if (availability !== "available") {
    const forbidden = availability === "forbidden";
    return unavailable(id, provenance, {
      code: forbidden ? "source-forbidden" : "source-unavailable",
      message: forbidden
        ? `Data source ${id} cannot be accessed with the current permission.`
        : `Data source ${id} is unavailable. Retry when access is restored.`,
      stage: "data-source",
      retryable: !forbidden,
    });
  }
  if (!Array.isArray(rows)) {
    return unavailable(id, provenance, {
      code: "source-invalid",
      message: `Data source ${id} did not provide rows that can be profiled.`,
      stage: "data-source",
      retryable: false,
    });
  }
  if (kind === "csv") {
    const effectiveLimits = { ...DEFAULT_CSV_LIMITS, ...limits };
    if (Number.isFinite(byteLength) && byteLength > effectiveLimits.maxBytes) {
      return unavailable(id, provenance, {
        code: "csv-byte-limit",
        message: `CSV ${id} is ${byteLength} bytes; the effective limit is ${effectiveLimits.maxBytes} bytes. Choose a smaller file.`,
        stage: "data-source",
        retryable: false,
      });
    }
    if (rows.length > effectiveLimits.maxRows) {
      return unavailable(id, provenance, {
        code: "csv-row-limit",
        message: `CSV ${id} has ${rows.length} rows; the effective limit is ${effectiveLimits.maxRows} rows. Reduce the file and try again.`,
        stage: "data-source",
        retryable: false,
      });
    }
  }

  const profile = profileDataset(rows, authorMetadata);
  const fields = profile.columns.map((column) => ({
    id: column.name,
    type: normalizeFieldType(column.type),
    unit: authorMetadata[column.name]?.unit ?? null,
    nullable: column.missingCount > 0,
    examples: structuredClone(column.examples),
  }));
  const invalidRowCount = rows.filter((row) => !isRecord(row)).length;
  const missingCellCount = profile.columns.reduce(
    (total, column) => total + column.missingCount,
    0,
  );
  const status = profile.rowCount === 0 || fields.length === 0
    ? "empty"
    : invalidRowCount > 0 || missingCellCount > 0
      ? "partial"
      : "ready";
  return {
    status,
    sourceId: id,
    kind,
    provenance: provenance ? structuredClone(provenance) : null,
    schemaRevision: `${id}:${profile.fingerprint}`,
    fields,
    rowCount: profile.rowCount,
    timeCoverage: deriveTimeCoverage(profile.columns),
    error: null,
  };
}

function unavailable(sourceId, provenance, error) {
  return {
    status: "unavailable",
    sourceId,
    schemaRevision: null,
    fields: [],
    timeCoverage: null,
    provenance: provenance ? structuredClone(provenance) : null,
    error,
  };
}

function deriveTimeCoverage(columns) {
  const epochs = columns.flatMap((column) => (
    column.type === "temporal"
      ? column.examples.map((value) => Date.parse(value)).filter(Number.isFinite)
      : []
  ));
  return epochs.length > 0
    ? { start: Math.min(...epochs), end: Math.max(...epochs) }
    : null;
}

function normalizeFieldType(type) {
  return type === "numeric" ? "number" : type;
}

function requiredId(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("A source id is required for profiling.");
  }
  return value.trim();
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
