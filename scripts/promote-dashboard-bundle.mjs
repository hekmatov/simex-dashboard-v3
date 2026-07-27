import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  parseDashboardBundle,
} from "../src/charting/config/dashboardBundleV3.js";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const DEFAULT_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..");

export function preparePromotedDashboard(bundleText) {
  const config = parseDashboardBundle(stripBom(bundleText));
  const promoted = structuredClone(config);
  const files = [];

  for (const [sourceId, source] of Object.entries(promoted.dataSources ?? {})) {
    if (source?.kind !== "dataset" || source.type !== "uploadedCsv") continue;
    const fileName = [
      safeFileStem(source.fileName ?? sourceId),
      safeFileStem(sourceId),
    ].join("-");
    const relativePath = `data/uploaded/${fileName}.csv`;
    files.push({
      relativePath,
      contents: source.csvText,
    });
    promoted.dataSources[sourceId] = {
      kind: "csv",
      path: relativePath,
      provenance: {
        label: provenanceLabel(source, source.fileName ?? sourceId),
      },
      ...(source.parsingMetadata === undefined
        ? {}
        : { parsingMetadata: structuredClone(source.parsingMetadata) }),
    };
  }

  delete promoted.datasetProfiles;
  return {
    config: promoted,
    files,
  };
}

export async function promoteDashboardBundle({
  inputPath,
  rootDir = DEFAULT_ROOT,
} = {}) {
  const resolvedRoot = path.resolve(rootDir);
  const resolvedInput = path.resolve(
    resolvedRoot,
    inputPath ?? "packaged-dashboard-bundle.json",
  );
  const publicDir = path.join(resolvedRoot, "public");
  const configPath = path.join(publicDir, "config", "dashboard.json");
  const prepared = preparePromotedDashboard(
    await fs.readFile(resolvedInput, "utf8"),
  );

  await fs.mkdir(path.dirname(configPath), { recursive: true });
  for (const file of prepared.files) {
    const outputPath = path.resolve(publicDir, file.relativePath);
    assertWithinPublicDirectory(outputPath, publicDir);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, file.contents, "utf8");
  }
  await fs.writeFile(
    configPath,
    `${JSON.stringify(prepared.config, null, 2)}\n`,
    "utf8",
  );
  return {
    configPath,
    inputPath: resolvedInput,
    uploadedPaths: prepared.files.map(({ relativePath }) => (
      path.resolve(publicDir, relativePath)
    )),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) {
  const result = await promoteDashboardBundle({
    inputPath: process.argv[2],
  });
  console.log(
    `Promoted ${path.relative(DEFAULT_ROOT, result.inputPath)} into `
    + `${path.relative(DEFAULT_ROOT, result.configPath)}.`,
  );
  console.log(
    "Review the Git diff, rebuild dataset profiles, then commit the updated "
    + "configuration and files under public/data/uploaded.",
  );
}

function assertWithinPublicDirectory(outputPath, publicDir) {
  const relative = path.relative(path.resolve(publicDir), outputPath);
  if (
    relative === ""
    || relative === ".."
    || relative.startsWith(`..${path.sep}`)
    || path.isAbsolute(relative)
  ) {
    throw new Error("Promoted data must remain inside the public directory.");
  }
}

function provenanceLabel(source, fallback) {
  const label = source.provenance?.label;
  return typeof label === "string" && label.trim() !== ""
    ? label.trim()
    : `Uploaded ${fallback}`;
}

function safeFileStem(value) {
  return String(value ?? "uploaded")
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    || "uploaded";
}

function stripBom(text) {
  return String(text).replace(/^\uFEFF/, "");
}
