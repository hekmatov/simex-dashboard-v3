import { createHash } from "node:crypto";

import Papa from "papaparse";

export const MUNICIPAL_DERIVATIVE_PATHS = Object.freeze({
  map: "public/data/biomedical/municipal_map_timeline.csv",
  aggregate: "public/data/biomedical/municipal_aggregate_timeseries.csv",
  bubble: "public/data/biomedical/municipal_latest_bubble.csv",
  manifest: "public/data/biomedical/municipal_derivatives.manifest.json",
});

const COMPILER_VERSION = 1;
const REQUIRED_COLUMNS = Object.freeze([
  "Datum",
  "MunicipalityCode",
  "Gemeentecode",
  "Gemeentenaam",
  "Provincienaam",
  "AantalCumulatief",
  "population",
  "infectionsPerPopulation",
  "infectionsPer1000",
  "infectionsPer10000",
  "dataMethod",
  "populationSource",
  "sourceMunicipalityCodes",
]);
const MAP_COLUMNS = Object.freeze([
  "Datum",
  "MunicipalityCode",
  "infectionsPer10000",
]);
const AGGREGATE_COLUMNS = Object.freeze(["Datum", "AantalCumulatief"]);
const BUBBLE_COLUMNS = Object.freeze([
  "Datum",
  "population",
  "infectionsPer10000",
  "AantalCumulatief",
  "Gemeentenaam",
  "Provincienaam",
]);

export function buildMunicipalDerivatives(csvText, { sourcePath } = {}) {
  if (typeof csvText !== "string" || csvText.trim() === "") {
    throw new TypeError("Authoritative municipal CSV text is required.");
  }
  if (typeof sourcePath !== "string" || sourcePath.trim() === "") {
    throw new TypeError("Authoritative municipal source path is required.");
  }

  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });
  if (parsed.errors.length > 0) {
    const first = parsed.errors[0];
    throw new Error(`Authoritative municipal CSV is invalid: ${first.message}`);
  }
  const rows = validateAuthority(parsed.data, parsed.meta.fields ?? []);
  const map = emitRows(MAP_COLUMNS, rows);
  const aggregateRows = aggregateByDate(rows);
  const aggregate = emitRows(AGGREGATE_COLUMNS, aggregateRows);
  const latestDate = rows.reduce(
    (latest, row) => latest === null || row.Datum > latest ? row.Datum : latest,
    null,
  );
  const bubbleRows = rows.filter(({ Datum }) => Datum === latestDate);
  const bubble = emitRows(BUBBLE_COLUMNS, bubbleRows);

  return Object.freeze({
    files: Object.freeze({ map, aggregate, bubble }),
    manifest: Object.freeze({
      format: "simex-biomedical-municipal-derivatives",
      compilerVersion: COMPILER_VERSION,
      authoritative: Object.freeze({
        path: sourcePath,
        sha256: sha256(csvText),
        rowCount: rows.length,
        columns: REQUIRED_COLUMNS,
      }),
      dimensions: Object.freeze({
        dates: new Set(rows.map(({ Datum }) => Datum)).size,
        municipalities: new Set(rows.map(({ MunicipalityCode }) => MunicipalityCode)).size,
        latestDate,
      }),
      derivatives: Object.freeze({
        map: derivativeManifest(
          MUNICIPAL_DERIVATIVE_PATHS.map,
          MAP_COLUMNS,
          rows.length,
          map,
          "Exact date, municipality, and infection-rate projection.",
        ),
        aggregate: derivativeManifest(
          MUNICIPAL_DERIVATIVE_PATHS.aggregate,
          AGGREGATE_COLUMNS,
          aggregateRows.length,
          aggregate,
          "Sum of cumulative infections by date.",
        ),
        bubble: derivativeManifest(
          MUNICIPAL_DERIVATIVE_PATHS.bubble,
          BUBBLE_COLUMNS,
          bubbleRows.length,
          bubble,
          `Exact latest-date projection for ${latestDate}.`,
        ),
      }),
    }),
  });
}

function validateAuthority(rows, fields) {
  const missingColumns = REQUIRED_COLUMNS.filter((field) => !fields.includes(field));
  if (missingColumns.length > 0) {
    throw new Error(`Authoritative municipal CSV is missing field "${missingColumns[0]}".`);
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("Authoritative municipal CSV must contain rows.");
  }

  const dates = new Set();
  const municipalities = new Set();
  const keys = new Set();
  for (const [index, row] of rows.entries()) {
    const date = requiredCell(row.Datum, "Datum", index);
    const municipality = requiredCell(row.MunicipalityCode, "MunicipalityCode", index);
    requiredCell(row.Gemeentenaam, "Gemeentenaam", index);
    requiredCell(row.Provincienaam, "Provincienaam", index);
    finiteCell(row.AantalCumulatief, "AantalCumulatief", index);
    finiteCell(row.population, "population", index);
    finiteCell(row.infectionsPer10000, "infectionsPer10000", index);
    const key = `${date}|${municipality}`;
    if (keys.has(key)) {
      throw new Error(`Duplicate municipal map key "${key}".`);
    }
    keys.add(key);
    dates.add(date);
    municipalities.add(municipality);
  }
  if (rows.length !== dates.size * municipalities.size) {
    throw new Error(
      "Authoritative municipal CSV must form a complete date-by-municipality grid.",
    );
  }
  return rows;
}

function aggregateByDate(rows) {
  const aggregates = new Map();
  for (const row of rows) {
    aggregates.set(
      row.Datum,
      (aggregates.get(row.Datum) ?? 0) + Number(row.AantalCumulatief),
    );
  }
  return [...aggregates].map(([Datum, AantalCumulatief]) => ({
    Datum,
    AantalCumulatief: String(AantalCumulatief),
  }));
}

function emitRows(columns, rows) {
  return [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(",")),
  ].join("\n");
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function requiredCell(value, field, index) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Municipal row ${index + 1} requires ${field}.`);
  }
  return value;
}

function finiteCell(value, field, index) {
  if (typeof value !== "string" || value.trim() === "" || !Number.isFinite(Number(value))) {
    throw new Error(`Municipal row ${index + 1} requires finite ${field}.`);
  }
  return value;
}

function derivativeManifest(path, columns, rowCount, text, rule) {
  return Object.freeze({
    path,
    sha256: sha256(text),
    rowCount,
    columns,
    rule,
  });
}

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
