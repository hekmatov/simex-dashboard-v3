import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const EXPECTED_QUORUM_CONTRACT_HASH =
  "a876d0b83c9f40ea5179723b9c4304f8873b393142e4a790711af80ed363662c";
const PROTOCOL_PATH = "src/lib/quorumCompanionProtocol.js";
const CATALOGUE_PATH = "public/integration/quorum-chart-catalogue.json";
const CHART_VIEW_PATH = "src/components/charts/ChartView.jsx";
const REGISTRY_PATH = "src/charting/schemas/chartSchemaRegistry.js";
const RENDERER_PATH = "src/charting/rendering/resolveChartRendering.js";
const ECHARTS_TEXT_METRICS_HELPER_PATH =
  "src/charting/rendering/axisTitleGraphics.js";
const AUDIENCE_ENTRYPOINT = "src/components/presentation/AudienceDisplay.jsx";
const ALLOWED_RESOLVER_CONSUMERS = new Set([
  CHART_VIEW_PATH,
  "src/components/chart-authoring/ChartPreview.jsx",
  "src/components/playback/PlaybackView.jsx",
]);
// Canonical wrappers may compose ChartView/EChartsChartView, but mode-reachable
// code may access a raw rendering engine or canvas context only at these audited
// capability boundaries. EyeDropper samples pixels; it does not render charts.
const RAW_RENDER_SURFACE_ALLOWLIST = new Map([
  [
    "src/components/charts/EChartsChartView.jsx",
    new Set(["echarts-runtime"]),
  ],
  [
    "src/components/color/EyeDropperCoordinator.js",
    new Set(["canvas-context"]),
  ],
]);
const MODE_ENTRYPOINTS = Object.freeze([
  ["view", "src/components/dashboard/DashboardModeWorkspace.jsx"],
  ["build", "src/components/dashboard/DashboardModeWorkspace.jsx"],
  ["present", "src/components/presentation/PresentWorkspace.jsx"],
  ["audience", "src/components/presentation/AudienceDisplay.jsx"],
]);
const SCHEMA_TEXT = schemaScalar("string");
const SCHEMA_NUMBER = schemaScalar("number");
const SCHEMA_BOOLEAN = schemaScalar("boolean");
const SCHEMA_TEXT_ARRAY = schemaArray(SCHEMA_TEXT);
const ROLE_SCHEMA = schemaObject({
  accepted_semantic_types: SCHEMA_TEXT_ARRAY,
  cardinality: schemaObject({
    max: schemaNullable(SCHEMA_NUMBER),
    min: SCHEMA_NUMBER,
  }),
  label: SCHEMA_TEXT,
  required: SCHEMA_BOOLEAN,
  role_id: SCHEMA_TEXT,
});
const COLLECTION_SCHEMA = schemaNullable(schemaObject({
  grid: schemaObject({
    max_columns: SCHEMA_NUMBER,
    max_rows: SCHEMA_NUMBER,
    min_columns: SCHEMA_NUMBER,
    min_rows: SCHEMA_NUMBER,
  }),
  layout_modes: SCHEMA_TEXT_ARRAY,
  priority_methods: SCHEMA_TEXT_ARRAY,
  ranking_modes: SCHEMA_TEXT_ARRAY,
}));
const MANUAL_DATA_SCHEMA = schemaAnyOf([
  schemaLiteral(null),
  schemaObject({ maxRows: SCHEMA_NUMBER }),
  schemaObject({
    fields: SCHEMA_TEXT_ARRAY,
    maxRows: SCHEMA_NUMBER,
    minRows: SCHEMA_NUMBER,
  }),
]);
const GEOGRAPHY_SCHEMA = schemaNullable(schemaObject({
  data_source: schemaObject({
    descriptor_kind: SCHEMA_TEXT,
    presentation_field: SCHEMA_TEXT,
    required: SCHEMA_BOOLEAN,
  }),
  geography_role_id: SCHEMA_TEXT,
  join: schemaObject({
    ambiguous_property_match: SCHEMA_TEXT,
    default_strategy: schemaNullable(SCHEMA_TEXT),
    explicit_strategy: SCHEMA_TEXT,
    feature_id_precedence: SCHEMA_TEXT,
    inferred_strategies: SCHEMA_TEXT_ARRAY,
    presentation_field: SCHEMA_TEXT,
  }),
  version: SCHEMA_NUMBER,
}));
const TEMPORAL_SCHEMA = schemaNullable(schemaObject({
  interpolation_eligible: SCHEMA_BOOLEAN,
  interpolation_requires_explicit_permission: SCHEMA_BOOLEAN,
  matching_policies: SCHEMA_TEXT_ARRAY,
  time_role_ids: SCHEMA_TEXT_ARRAY,
}));
const CHART_TYPE_SCHEMA = schemaObject({
  authoring_workflow: SCHEMA_TEXT,
  capabilities: schemaObject({
    collection: SCHEMA_BOOLEAN,
    source_csv: SCHEMA_BOOLEAN,
    surfaces: SCHEMA_TEXT_ARRAY,
    time_context: SCHEMA_BOOLEAN,
    time_sync: SCHEMA_BOOLEAN,
    zoom: SCHEMA_BOOLEAN,
  }),
  collection: COLLECTION_SCHEMA,
  conversion: schemaObject({
    compatible_type_ids: SCHEMA_TEXT_ARRAY,
    rules: schemaObject({
      compatible_when: SCHEMA_TEXT_ARRAY,
      missing_required_target_roles: SCHEMA_TEXT,
      otherwise: SCHEMA_TEXT,
      preserve_roles_when: SCHEMA_TEXT_ARRAY,
      version: SCHEMA_NUMBER,
    }),
  }),
  data_constraints: schemaObject({
    manual_data: MANUAL_DATA_SCHEMA,
    source_kinds: SCHEMA_TEXT_ARRAY,
    transforms: SCHEMA_TEXT_ARRAY,
  }),
  data_family: SCHEMA_TEXT,
  description: SCHEMA_TEXT,
  geography: GEOGRAPHY_SCHEMA,
  group_id: SCHEMA_TEXT,
  label: SCHEMA_TEXT,
  mark: SCHEMA_TEXT,
  presentation_section_ids: SCHEMA_TEXT_ARRAY,
  purpose: SCHEMA_TEXT,
  renderer: SCHEMA_TEXT,
  role_ids: SCHEMA_TEXT_ARRAY,
  roles: schemaArray(ROLE_SCHEMA),
  temporal: TEMPORAL_SCHEMA,
  type_id: SCHEMA_TEXT,
});
const CONFIGURED_CHART_SCHEMA = schemaObject({
  aliases: SCHEMA_TEXT_ARRAY,
  chart_id: SCHEMA_TEXT,
  collection_capability: SCHEMA_BOOLEAN,
  description: SCHEMA_TEXT,
  keywords: SCHEMA_TEXT_ARRAY,
  page_id: SCHEMA_TEXT,
  role_ids: SCHEMA_TEXT_ARRAY,
  section_id: SCHEMA_TEXT,
  supported_display_modes: SCHEMA_TEXT_ARRAY,
  chrono_group_id: schemaNullable(SCHEMA_TEXT),
  title: SCHEMA_TEXT,
  type_id: SCHEMA_TEXT,
});
const CATALOGUE_SCHEMA = schemaObject({
  catalogue_id: SCHEMA_TEXT,
  catalogue_revision: SCHEMA_TEXT,
  chart_schema_version: schemaLiteral(3),
  chart_types: schemaArray(CHART_TYPE_SCHEMA),
  charts: schemaArray(CONFIGURED_CHART_SCHEMA),
  contract_version: schemaLiteral("2"),
  dashboard_semantic_digest: SCHEMA_TEXT,
  digest: SCHEMA_TEXT,
});

function schemaScalar(type) {
  return { kind: "scalar", type };
}

function schemaLiteral(value) {
  return { kind: "literal", value };
}

function schemaObject(fields) {
  return { kind: "object", fields };
}

function schemaArray(item) {
  return { kind: "array", item };
}

function schemaNullable(schema) {
  return { kind: "nullable", schema };
}

function schemaAnyOf(variants) {
  return { kind: "anyOf", variants };
}

function validateSchema(value, schema, fieldPath) {
  if (schema.kind === "literal") {
    if (!Object.is(value, schema.value)) {
      throw new Error(
        `${fieldPath}: expected literal ${JSON.stringify(schema.value)}`,
      );
    }
    return;
  }
  if (schema.kind === "scalar") {
    if (typeof value !== schema.type) {
      throw new Error(`${fieldPath}: expected ${schema.type}`);
    }
    return;
  }
  if (schema.kind === "nullable") {
    if (value !== null) validateSchema(value, schema.schema, fieldPath);
    return;
  }
  if (schema.kind === "anyOf") {
    const errors = [];
    for (const variant of schema.variants) {
      try {
        validateSchema(value, variant, fieldPath);
        return;
      } catch (error) {
        errors.push(error);
      }
    }
    throw errors.at(-1);
  }
  if (schema.kind === "array") {
    if (!Array.isArray(value)) {
      throw new Error(`${fieldPath}: expected array`);
    }
    value.forEach((item, index) => {
      validateSchema(item, schema.item, `${fieldPath}[${index}]`);
    });
    return;
  }
  if (schema.kind === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`${fieldPath}: expected object`);
    }
    for (const field of Object.keys(schema.fields)) {
      if (!Object.hasOwn(value, field)) {
        throw new Error(`${schemaFieldPath(fieldPath, field)}: missing required field`);
      }
    }
    for (const field of Object.keys(value)) {
      if (!Object.hasOwn(schema.fields, field)) {
        throw new Error(`${schemaFieldPath(fieldPath, field)}: unexpected field`);
      }
    }
    for (const [field, childSchema] of Object.entries(schema.fields)) {
      validateSchema(value[field], childSchema, schemaFieldPath(fieldPath, field));
    }
    return;
  }
  throw new Error(`${fieldPath}: unknown schema kind`);
}

function schemaFieldPath(fieldPath, field) {
  return fieldPath === CATALOGUE_PATH
    ? `${fieldPath} ${field}`
    : `${fieldPath}.${field}`;
}

function stableJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value).toSorted().map((key) => (
      `${JSON.stringify(key)}:${stableJson(value[key])}`
    )).join(",")}}`;
  }
  return JSON.stringify(value);
}


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

  assertAudienceHasNoQuorumPath(sourceFiles);
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
    const extension = path.posix.extname(filePath).toLowerCase();
    if (extension === ".css") {
      for (const value of stylesheetUrls(source)) {
        findings.push({ path: filePath, field: "asset URL", value });
      }
    } else if ([".html", ".svg"].includes(extension)) {
      for (const value of attributeUrls(source)) {
        findings.push({ path: filePath, field: "asset URL", value });
      }
    } else if ([".js", ".jsx"].includes(extension)) {
      for (const specifier of parseImportSpecifiers(source)) {
        if (isRemoteUrl(specifier)) {
          findings.push({ path: filePath, field: "import", value: specifier });
        }
      }
      for (const value of runtimeUrlCalls(source)) {
        findings.push({ path: filePath, field: "runtime URL", value });
      }
      for (const value of attributeUrls(source)) {
        findings.push({ path: filePath, field: "asset URL", value });
      }
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

function assertAudienceHasNoQuorumPath(sourceFiles) {
  requiredTextFile(sourceFiles, AUDIENCE_ENTRYPOINT);
  const visited = new Set();
  const pending = [{ filePath: AUDIENCE_ENTRYPOINT, via: [] }];
  while (pending.length > 0) {
    const { filePath, via } = pending.shift();
    if (visited.has(filePath)) continue;
    visited.add(filePath);
    for (const specifier of parseImportSpecifiers(sourceFiles[filePath])) {
      const resolved = resolveSourceImport(filePath, specifier, sourceFiles);
      const quorumTarget = /quorum/i.test(resolved ?? specifier);
      if (quorumTarget) {
        const target = resolved ?? specifier;
        const transit = via.length > 0 ? ` via ${via.join(" -> ")}` : "";
        throw new Error(
          `${AUDIENCE_ENTRYPOINT} quorumBoundary.audience: reaches ${target}${transit}`,
        );
      }
      if (resolved && !visited.has(resolved)) {
        pending.push({ filePath: resolved, via: [...via, resolved] });
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
  validateSchema(catalogue, CATALOGUE_SCHEMA, CATALOGUE_PATH);
  const payload = stableJson({
    protocolSource,
    catalogueSchema: CATALOGUE_SCHEMA,
  });
  return createHash("sha256").update(payload).digest("hex");
}

function inspectCanonicalEntrypoints(sourceFiles) {
  const reachableByMode = new Map();
  const inventory = MODE_ENTRYPOINTS.map(([mode, entrypoint]) => {
    const reachable = reachableSourceFiles(entrypoint, sourceFiles);
    reachableByMode.set(mode, reachable);
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
  assertCanonicalRendererExclusivity(sourceFiles, reachableByMode);
  return inventory;
}

function assertCanonicalRendererExclusivity(sourceFiles, reachableByMode) {
  const reachable = new Set(
    [...reachableByMode.values()].flatMap((paths) => [...paths]),
  );
  for (const filePath of [...reachable].toSorted()) {
    const source = sourceFiles[filePath];
    const specifiers = parseImportSpecifiers(source);
    const importsRenderer = specifiers.some(
      (specifier) => resolveSourceImport(filePath, specifier, sourceFiles) === RENDERER_PATH,
    );
    if (importsRenderer && !ALLOWED_RESOLVER_CONSUMERS.has(filePath)) {
      throw new Error(
        `${filePath} canonicalRendererExclusivity: unexpected renderer consumer`,
      );
    }

    const allowedSignals = RAW_RENDER_SURFACE_ALLOWLIST.get(filePath) ?? new Set();
    const unexpectedSignals = rawRenderSurfaceSignals(filePath, source, specifiers)
      .filter((signal) => !allowedSignals.has(signal));
    if (unexpectedSignals.length > 0) {
      throw new Error(
        `${filePath} canonicalRendererExclusivity: unexpected raw render surface (${unexpectedSignals.join(", ")})`,
      );
    }
  }
}

function rawRenderSurfaceSignals(filePath, source, specifiers) {
  const signals = [];
  if (
    specifiers.some((specifier) => specifier === "echarts" || specifier === "echarts-for-react")
    && (
      specifiers.includes("echarts-for-react")
      || !isAuditedEChartsTextMetricsCapability(filePath, source)
    )
  ) {
    signals.push("echarts-runtime");
  }
  if (
    /<canvas\b/i.test(source)
    || /React\.createElement\(\s*["']canvas["']/i.test(source)
    || /document\.createElement\(\s*["']canvas["']/i.test(source)
  ) {
    signals.push("canvas-element");
  }
  if (/\.getContext\(\s*["'](?:2d|webgl2?|bitmaprenderer)["']/i.test(source)) {
    signals.push("canvas-context");
  }
  return signals;
}

function isAuditedEChartsTextMetricsCapability(filePath, source) {
  if (filePath !== ECHARTS_TEXT_METRICS_HELPER_PATH) return false;
  const echartsModuleReferences = [
    ...source.matchAll(
      /\b(?:import|export)\s+(?:[^"']*?\s+from\s+)?["']echarts["']|\bimport\s*\(\s*["']echarts["']\s*\)/g,
    ),
  ];
  return (
    echartsModuleReferences.length === 1
    && /^\s*import\s*\{\s*format\s+as\s+echartsFormat\s*\}\s*from\s+["']echarts["']\s*;?\s*$/m.test(source)
    && !/\bechartsFormat\s*(?:\.|\?\.)\s*init\s*\(/.test(source)
  );
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
  const patterns = [
    /\bfetch\s*\(\s*["'](https?:\/\/[^"']+)["']/gi,
    /\bnew\s+URL\s*\(\s*["'](https?:\/\/[^"']+)["']/gi,
    /\b(?:WebSocket|EventSource|Worker|SharedWorker)\s*\(\s*["'](https?:\/\/[^"']+)["']/gi,
    /\bnavigator\.sendBeacon\s*\(\s*["'](https?:\/\/[^"']+)["']/gi,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) values.push(match[1]);
  }
  return values;
}

function attributeUrls(source) {
  const values = [];
  const patterns = [
    /\b(?:src|href)\s*=\s*["'](https?:\/\/[^"']+)["']/gi,
    /\b(?:src|href)\s*=\s*\{\s*["'](https?:\/\/[^"']+)["']\s*\}/gi,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) values.push(match[1]);
  }
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
    sourceFiles: await readTextTree("src", new Set([".css", ".html", ".js", ".jsx"])),
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
