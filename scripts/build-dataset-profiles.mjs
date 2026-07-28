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
  return {
    sourceId,
    kind: "csv",
    path: source.path,
    provenance: sortValue(source.provenance),
    ...authority,
  };
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
