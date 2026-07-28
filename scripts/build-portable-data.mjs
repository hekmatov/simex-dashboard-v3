import {
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  validateDataSourceDescriptor,
  validateDatasetProfiles,
  validateGeoJson,
} from "../src/lib/loadDashboard.js";

const defaultRootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

export async function buildPortableData({
  rootDir = defaultRootDir,
  configPath = path.join(rootDir, "public", "config", "dashboard.json"),
  profilesPath = path.join(
    rootDir,
    "public",
    "config",
    "dataset-profiles.json",
  ),
  outputPath = path.join(rootDir, "public", "portable-dashboard-data.js"),
  embedPortableData = process.env.SIMEX_EMBED_PORTABLE_DATA !== "0",
} = {}) {
  const publicDir = path.join(rootDir, "public");
  const config = JSON.parse(stripBom(await readFile(configPath, "utf8")));
  const datasetProfiles = JSON.parse(
    stripBom(await readFile(profilesPath, "utf8")),
  );
  validateDatasetProfiles(config.dataSources, datasetProfiles);

  const dataSources = sortValue(config.dataSources);
  const sources = {};
  if (embedPortableData) {
    for (const sourceId of Object.keys(dataSources)) {
      const source = dataSources[sourceId];
      const sourcePath = validateDataSourceDescriptor(sourceId, source);
      const absoluteSourcePath = path.join(publicDir, sourcePath);
      if (source.kind === "geojson") {
        const data = JSON.parse(
          stripBom(await readFile(absoluteSourcePath, "utf8")),
        );
        validateGeoJson(data, `Data source "${sourceId}" GeoJSON`);
        sources[sourceId] = {
          kind: "geojson",
          data,
        };
      } else {
        sources[sourceId] = {
          kind: "csv",
          text: await readFile(absoluteSourcePath, "utf8"),
        };
      }
    }
  }

  const payload = sortValue({
    type: "simex-dashboard-v3-portable-data",
    config: embedPortableData ? config : null,
    dataSources: embedPortableData ? dataSources : {},
    datasetProfiles: embedPortableData ? datasetProfiles : {},
    sources,
  });
  const output = `window.SIMEX_PORTABLE_DASHBOARD = ${JSON.stringify(payload)};\n`;
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, output, "utf8");
  return { payload, output };
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
  const { payload } = await buildPortableData();
  console.log(
    `Wrote public/portable-dashboard-data.js with ${Object.keys(payload.sources).length} embedded data source(s).`,
  );
}
