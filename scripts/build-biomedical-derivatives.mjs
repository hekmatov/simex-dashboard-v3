import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import {
  buildMunicipalDerivatives,
  MUNICIPAL_DERIVATIVE_PATHS,
} from "./biomedicalMunicipalDerivatives.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const authorityPath = "public/data/biomedical/municipal_infections_2021_harmonized.csv";
const checking = process.argv.slice(2).includes("--check");

const sourceText = await readFile(path.join(repositoryRoot, authorityPath), "utf8");
const result = buildMunicipalDerivatives(sourceText, { sourcePath: authorityPath });
const outputs = [
  [MUNICIPAL_DERIVATIVE_PATHS.map, result.files.map],
  [MUNICIPAL_DERIVATIVE_PATHS.aggregate, result.files.aggregate],
  [MUNICIPAL_DERIVATIVE_PATHS.bubble, result.files.bubble],
  [MUNICIPAL_DERIVATIVE_PATHS.manifest, `${JSON.stringify(result.manifest, null, 2)}\n`],
];

for (const [relativePath, expected] of outputs) {
  const absolutePath = path.join(repositoryRoot, relativePath);
  if (checking) {
    let actual = null;
    try {
      actual = await readFile(absolutePath, "utf8");
    } catch {}
    if (actual !== expected) {
      throw new Error(`Biomedical derivative is stale: ${relativePath}`);
    }
    continue;
  }
  await writeFile(absolutePath, expected, "utf8");
}

const { dimensions, derivatives } = result.manifest;
process.stdout.write(
  `${checking ? "Verified" : "Generated"} biomedical derivatives: `
  + `${derivatives.map.rowCount} map rows, `
  + `${derivatives.aggregate.rowCount} aggregate rows, `
  + `${derivatives.bubble.rowCount} bubble rows, `
  + `${dimensions.dates} dates, ${dimensions.municipalities} municipalities.\n`,
);
