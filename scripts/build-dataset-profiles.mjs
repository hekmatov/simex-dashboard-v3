import {
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { profileDataset } from "../src/charting/data/profileDataset.js";
import { parseCsvText } from "../src/lib/loadCsv.js";
import { validateDataSourceDescriptor } from "../src/lib/loadDashboard.js";

const defaultRootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

export async function generateDatasetProfiles({
  rootDir = defaultRootDir,
  dashboardPath = path.join(rootDir, "public", "config", "dashboard.json"),
  outputPath = path.join(
    rootDir,
    "public",
    "config",
    "dataset-profiles.json",
  ),
} = {}) {
  const publicDir = path.join(rootDir, "public");
  const dashboard = JSON.parse(stripBom(await readFile(dashboardPath, "utf8")));
  if (!isRecord(dashboard.dataSources)) {
    throw new Error("Dashboard dataSources must be an object.");
  }

  const profiles = {};
  for (const sourceId of Object.keys(dashboard.dataSources).sort()) {
    const source = dashboard.dataSources[sourceId];
    const sourcePath = validateDataSourceDescriptor(sourceId, source);
    if (source.kind !== "csv") continue;

    let csvText;
    try {
      csvText = await readFile(path.join(publicDir, sourcePath), "utf8");
    } catch (error) {
      throw new Error(
        `Data source "${sourceId}" could not be read at "${sourcePath}".`,
        { cause: error },
      );
    }
    const rows = parseCsvText(csvText, sourcePath);
    profiles[sourceId] = reusableProfile(sourceId, source, rows);
  }

  const output = `${JSON.stringify(sortValue(profiles), null, 2)}\n`;
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, output, "utf8");
  return { profiles: sortValue(profiles), output };
}

function reusableProfile(sourceId, source, rows) {
  const authority = profileDataset(rows, source.parsingMetadata ?? {});
  const columns = authority.columns.map((column) => {
    const warnings = summarizeDiagnostics(column.temporal?.diagnostics ?? []);
    return {
      name: column.name,
      type: column.type,
      missingCount: column.missingCount,
      uniqueCount: column.uniqueCount,
      examples: column.examples,
      geographicHint: column.geographicHint,
      ...(column.type === "temporal" ? {
        parsing: column.temporal.parsingMetadata,
        temporalValues: column.temporal.values.slice(0, 3),
      } : {}),
      warnings,
    };
  });
  const warnings = columns
    .flatMap((column) => column.warnings.map((warning) => ({
      column: column.name,
      ...warning,
    })))
    .sort(compareWarnings);

  return {
    sourceId,
    kind: "csv",
    path: source.path,
    provenance: sortValue(source.provenance),
    rowCount: authority.rowCount,
    columns,
    warnings,
    fingerprint: authority.fingerprint,
  };
}

function summarizeDiagnostics(diagnostics) {
  const byCode = new Map();
  for (const diagnostic of diagnostics) {
    const current = byCode.get(diagnostic.code) ?? {
      code: diagnostic.code,
      count: 0,
      examples: [],
    };
    current.count += 1;
    if (
      current.examples.length < 3
      && !current.examples.some((value) => Object.is(value, diagnostic.value))
    ) {
      current.examples.push(diagnostic.value);
    }
    byCode.set(diagnostic.code, current);
  }
  return [...byCode.values()].sort(compareWarnings);
}

function compareWarnings(left, right) {
  const leftKey = [
    String(left.column ?? ""),
    left.code,
  ].join("\u0000");
  const rightKey = [
    String(right.column ?? ""),
    right.code,
  ].join("\u0000");
  return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
}

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, sortValue(value[key])]),
  );
}

function stripBom(text) {
  return text.replace(/^\uFEFF/, "");
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

if (
  process.argv[1]
  && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  const { profiles } = await generateDatasetProfiles();
  console.log(
    `Wrote public/config/dataset-profiles.json with ${Object.keys(profiles).length} tabular profile(s).`,
  );
}
