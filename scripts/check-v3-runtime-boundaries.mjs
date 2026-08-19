import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const EXPECTED_QUORUM_CONTRACT_HASH =
  "d8b0d7ac09cca77d89c3d14a252054ef8e3eaf560bea90fc10a1966ef86d983d";
const PROTOCOL_PATH = "src/lib/quorumCompanionProtocol.js";
const CATALOGUE_PATH = "public/integration/quorum-chart-catalogue.json";
const CHART_VIEW_PATH = "src/components/charts/ChartView.jsx";
const REGISTRY_PATH = "src/charting/schemas/chartSchemaRegistry.js";
const RENDERER_PATH = "src/charting/rendering/resolveChartRendering.js";
const MODE_ENTRYPOINTS = Object.freeze([
  ["view", "src/components/view/ViewShell.jsx"],
  ["build", "src/components/build/BuildWorkspace.jsx"],
  ["present", "src/components/presentation/PresentWorkspace.jsx"],
  ["audience", "src/components/presentation/AudienceDisplay.jsx"],
]);

export function inspectRuntimeBoundaries({
  packageJson,
  sourceFiles,
  publicFiles,
}) {
  assertRecord(packageJson, "package.json");
  assertTextFileMap(sourceFiles, "sourceFiles");
  assertTextFileMap(publicFiles, "publicFiles");

  const remoteRuntimeDependencies = findRemoteRuntimeDependencies({
    packageJson,
    sourceFiles,
    publicFiles,
  });
  if (remoteRuntimeDependencies.length > 0) {
    const offender = remoteRuntimeDependencies[0];
    throw new Error(
      `Remote runtime dependency at ${offender.path} ${offender.field}: ${offender.value}`,
    );
  }

  assertAudienceHasNoQuorumImport(sourceFiles);
  const quorumContractHash = readQuorumContractHash(sourceFiles, publicFiles);
  if (quorumContractHash !== EXPECTED_QUORUM_CONTRACT_HASH) {
    throw new Error(
      `${PROTOCOL_PATH} quorumContractHash: expected ${EXPECTED_QUORUM_CONTRACT_HASH}, received ${quorumContractHash}`,
    );
  }

  const canonicalRendererEntrypoints = inspectCanonicalEntrypoints(sourceFiles);
  return {
    remoteRuntimeDependencies,
    quorumContractHash,
    canonicalRendererEntrypoints,
  };
}

function findRemoteRuntimeDependencies({ packageJson, sourceFiles, publicFiles }) {
  const findings = [];
  for (const field of ["dependencies", "optionalDependencies"]) {
    for (const [name, value] of Object.entries(packageJson[field] ?? {})) {
      if (isRemoteUrl(value)) {
        findings.push({ path: "package.json", field: `${field}.${name}`, value });
      }
    }
  }

  for (const [filePath, source] of Object.entries(sourceFiles)) {
    for (const specifier of parseImportSpecifiers(source)) {
      if (isRemoteUrl(specifier)) {
        findings.push({ path: filePath, field: "import", value: specifier });
      }
    }
    for (const value of runtimeUrlCalls(source)) {
      findings.push({ path: filePath, field: "runtime URL", value });
    }
  }

  for (const [filePath, source] of Object.entries(publicFiles)) {
    const extension = path.posix.extname(filePath).toLowerCase();
    if ([".html", ".svg"].includes(extension)) {
      for (const value of attributeUrls(source)) {
        findings.push({ path: filePath, field: "asset URL", value });
      }
    } else if (extension === ".css") {
      for (const value of stylesheetUrls(source)) {
        findings.push({ path: filePath, field: "asset URL", value });
      }
    } else if (extension === ".js") {
      for (const specifier of parseImportSpecifiers(source)) {
        if (isRemoteUrl(specifier)) {
          findings.push({ path: filePath, field: "import", value: specifier });
        }
      }
      for (const value of runtimeUrlCalls(source)) {
        findings.push({ path: filePath, field: "runtime URL", value });
      }
    } else if (extension === ".json") {
      for (const finding of jsonRemoteUrls(source, filePath)) findings.push(finding);
    }
  }

  return findings.toSorted(compareFinding);
}

function assertAudienceHasNoQuorumImport(sourceFiles) {
  for (const [filePath, source] of Object.entries(sourceFiles)) {
    if (!/\/Audience[^/]*\.(?:js|jsx)$/.test(filePath)) continue;
    for (const specifier of parseImportSpecifiers(source)) {
      if (/quorum/i.test(specifier)) {
        throw new Error(`${filePath} import: ${specifier}`);
      }
    }
  }
}

function readQuorumContractHash(sourceFiles, publicFiles) {
  const protocolSource = requiredTextFile(sourceFiles, PROTOCOL_PATH)
    .replaceAll("\r\n", "\n");
  const catalogueSource = requiredTextFile(publicFiles, CATALOGUE_PATH);
  let catalogue;
  try {
    catalogue = JSON.parse(catalogueSource);
  } catch {
    throw new Error(`${CATALOGUE_PATH} schema: invalid JSON`);
  }
  const catalogueSchema = {
    contractVersion: catalogue.contract_version,
    chartSchemaVersion: catalogue.chart_schema_version,
    topLevelFields: Object.keys(catalogue).toSorted(),
    chartTypeFields: unionObjectKeys(catalogue.chart_types),
    chartFields: unionObjectKeys(catalogue.charts),
  };
  const payload = JSON.stringify({ protocolSource, catalogueSchema });
  return createHash("sha256").update(payload).digest("hex");
}

function inspectCanonicalEntrypoints(sourceFiles) {
  return MODE_ENTRYPOINTS.map(([mode, entrypoint]) => {
    const reachable = reachableSourceFiles(entrypoint, sourceFiles);
    for (const [field, requiredPath] of [
      ["chartView", CHART_VIEW_PATH],
      ["registry", REGISTRY_PATH],
      ["renderer", RENDERER_PATH],
    ]) {
      if (!reachable.has(requiredPath)) {
        throw new Error(
          `${entrypoint} canonicalRendererEntrypoints.${mode}.${field}: missing ${requiredPath}`,
        );
      }
    }
    return {
      mode,
      entrypoint,
      chartView: CHART_VIEW_PATH,
      registry: REGISTRY_PATH,
      renderer: RENDERER_PATH,
    };
  });
}

function reachableSourceFiles(entrypoint, sourceFiles) {
  requiredTextFile(sourceFiles, entrypoint);
  const visited = new Set();
  const pending = [entrypoint];
  while (pending.length > 0) {
    const filePath = pending.shift();
    if (visited.has(filePath)) continue;
    visited.add(filePath);
    for (const specifier of parseImportSpecifiers(sourceFiles[filePath])) {
      const resolved = resolveSourceImport(filePath, specifier, sourceFiles);
      if (resolved && !visited.has(resolved)) pending.push(resolved);
    }
  }
  return visited;
}

function parseImportSpecifiers(source) {
  const specifiers = [];
  const patterns = [
    /\b(?:import|export)\s+(?:[^"']*?\s+from\s+)?["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) specifiers.push(match[1]);
  }
  return [...new Set(specifiers)];
}

function resolveSourceImport(fromPath, specifier, sourceFiles) {
  if (!specifier.startsWith(".")) return null;
  const base = path.posix.normalize(
    path.posix.join(path.posix.dirname(fromPath), specifier),
  );
  for (const candidate of [
    base,
    `${base}.js`,
    `${base}.jsx`,
    `${base}/index.js`,
    `${base}/index.jsx`,
  ]) {
    if (Object.hasOwn(sourceFiles, candidate)) return candidate;
  }
  return null;
}

function runtimeUrlCalls(source) {
  const values = [];
  const pattern = /\b(?:fetch|import)\s*\(\s*["'](https?:\/\/[^"']+)["']/gi;
  for (const match of source.matchAll(pattern)) values.push(match[1]);
  return values;
}

function attributeUrls(source) {
  const values = [];
  const pattern = /\b(?:src|href)\s*=\s*["'](https?:\/\/[^"']+)["']/gi;
  for (const match of source.matchAll(pattern)) values.push(match[1]);
  return values;
}

function stylesheetUrls(source) {
  const values = [];
  const pattern = /(?:url\(\s*|@import\s+)["']?(https?:\/\/[^"')\s;]+)/gi;
  for (const match of source.matchAll(pattern)) values.push(match[1]);
  return values;
}

function jsonRemoteUrls(source, filePath) {
  let value;
  try {
    value = JSON.parse(source);
  } catch {
    return [];
  }
  const findings = [];
  visit(value, "$", "");
  return findings;

  function visit(current, fieldPath, fieldName) {
    if (Array.isArray(current)) {
      current.forEach((item, index) => visit(item, `${fieldPath}[${index}]`, fieldName));
      return;
    }
    if (current && typeof current === "object") {
      for (const [key, child] of Object.entries(current)) {
        visit(child, `${fieldPath}.${key}`, key);
      }
      return;
    }
    if (
      typeof current === "string"
      && isRemoteUrl(current)
      && /(?:asset|endpoint|gateway|href|src|url)/i.test(fieldName)
    ) {
      findings.push({ path: filePath, field: fieldPath, value: current });
    }
  }
}

function unionObjectKeys(values) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.flatMap((value) => (
    value && typeof value === "object" && !Array.isArray(value)
      ? Object.keys(value)
      : []
  )))].toSorted();
}

function requiredTextFile(files, filePath) {
  const source = files[filePath];
  if (typeof source !== "string") {
    throw new Error(`${filePath} sourceFiles.${filePath}: missing text file`);
  }
  return source;
}

function assertRecord(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label}: expected an object`);
  }
}

function assertTextFileMap(value, label) {
  assertRecord(value, label);
  for (const [filePath, source] of Object.entries(value)) {
    if (typeof source !== "string") {
      throw new Error(`${filePath} ${label}.${filePath}: expected text`);
    }
  }
}

function isRemoteUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

function compareFinding(left, right) {
  return `${left.path}\0${left.field}\0${left.value}`.localeCompare(
    `${right.path}\0${right.field}\0${right.value}`,
  );
}

async function readRepositoryInputs() {
  const publicFiles = await readTextTree(
    "public",
    new Set([".css", ".html", ".js", ".json", ".svg"]),
  );
  publicFiles["index.html"] = await readFile("index.html", "utf8");
  return {
    packageJson: JSON.parse(await readFile("package.json", "utf8")),
    sourceFiles: await readTextTree("src", new Set([".js", ".jsx"])),
    publicFiles,
  };
}

async function readTextTree(root, extensions) {
  const files = {};
  await visit(root);
  return files;

  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const filePath = path.posix.join(directory.replaceAll("\\", "/"), entry.name);
      if (entry.isDirectory()) {
        await visit(filePath);
      } else if (extensions.has(path.extname(entry.name))) {
        files[filePath] = await readFile(filePath, "utf8");
      }
    }
  }
}

async function run() {
  try {
    const inventory = inspectRuntimeBoundaries(await readRepositoryInputs());
    process.stdout.write(`${JSON.stringify(inventory, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

if (
  process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await run();
}
