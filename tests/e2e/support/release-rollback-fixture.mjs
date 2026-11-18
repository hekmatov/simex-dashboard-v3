import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { readFile, realpath, stat, mkdir, mkdtemp } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { decodeAssetBase64 } from "../../../src/static-content/assets/assetPayloadEnvelope.js";
import { DASHBOARD_CONFIG_STRUCTURE } from "../../../src/charting/config/dashboardConfigStructure.js";
import { dashboardBundleIntegrity } from "../../../src/charting/config/dashboardBundleV3.js";

const WORKTREE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const PREVIOUS_COMMIT = "107c100848a0bca849a67b29a437eb31e24d39f7";
export const rollbackSha256 = bytes => createHash("sha256").update(bytes).digest("hex");
const RUNTIME_CONFIG_FIELDS = new Set([...DASHBOARD_CONFIG_STRUCTURE.runtimeNonSemanticFields,
  "chartDataStates", "dataSourceStates", "runtimeContentHealth", "loadedData", "loadedRows", "runtimeRows"]);

/** Compare native packages without migrating V6 to V7 or masking authored data. */
export function assertRollbackExportPreserved(actual, expected) {
  const canonical = pkg => {
    const { config, metadata, assetPayloads: _payloads, ...envelope } = pkg;
    const { exportedAt: _timestamp, ...semanticMetadata } = metadata;
    if (pkg.version === 7) {
      const integrity = metadata.integrity;
      assert.deepEqual(Object.keys(integrity ?? {}).sort(), ["algorithm", "digest"], "whole-package integrity fields");
      assert.equal(integrity.algorithm, "sha256", "whole-package integrity algorithm");
      assert.match(integrity.digest, /^[a-f0-9]{64}$/, "whole-package integrity digest");
      assert.equal(dashboardBundleIntegrity(pkg), integrity.digest, "whole-package integrity must verify before semantic comparison");
      delete semanticMetadata.integrity;
    }
    return { ...envelope, metadata: semanticMetadata,
      config: Object.fromEntries(Object.entries(config).filter(([key]) => !RUNTIME_CONFIG_FIELDS.has(key))) };
  };
  assert.deepEqual(canonical(actual), canonical(expected), "full package config/metadata must survive import and export");
  const actualPayloads = actual.assetPayloads ?? {}, expectedPayloads = expected.assetPayloads ?? {};
  assert.deepEqual(Object.keys(actualPayloads).sort(), Object.keys(expectedPayloads).sort(), "all original payloads must remain present");
  const verifiedBytes = (pkg, id) => {
    const payload = pkg.assetPayloads[id], manifest = pkg.config.assets?.[id];
    assert.ok(manifest, `payload ${id} must have its authored manifest`);
    const bytes = decodeAssetBase64(payload.base64);
    assert.equal(bytes.byteLength, payload.byteLength, `payload ${id} byte length`);
    assert.equal(bytes.byteLength, manifest.byteLength, `manifest ${id} byte length`);
    assert.equal(payload.mediaType, manifest.mediaType, `payload ${id} media type`);
    assert.equal(rollbackSha256(bytes), payload.sha256, `payload ${id} actual SHA256`);
    assert.equal(payload.sha256, manifest.sha256, `manifest ${id} SHA256`);
    return bytes;
  };
  for (const id of Object.keys(expectedPayloads)) {
    const { base64: _actualBase64, ...actualMetadata } = actualPayloads[id];
    const { base64: _expectedBase64, ...expectedMetadata } = expectedPayloads[id];
    assert.deepEqual(actualMetadata, expectedMetadata, `payload ${id} metadata must remain unchanged`);
    assert.deepEqual(verifiedBytes(actual, id), verifiedBytes(expected, id), `payload ${id} bytes must remain unchanged`);
  }
}
const prerequisite = message => new Error(`Rollback prerequisite: ${message}`);
const contained = (parent, child) => { const value = path.relative(parent, child); return value !== ".." && !value.startsWith(`..${path.sep}`) && !path.isAbsolute(value); };
const safeRelative = value => {
  const relative = String(value).replace(/^\.\//, "");
  if (!relative || /[\\:%?#]/.test(relative) || relative.startsWith("/") || relative.split("/").some(part => !part || part === "." || part === "..")) throw prerequisite(`unsafe artifact path ${value}`);
  return relative;
};

async function artifact(role, declaration, base) {
  if (!declaration || !/^[a-f0-9]{40}$/.test(declaration.sourceCommit ?? "") || !declaration.appVersion) throw prerequisite(`${role} needs full sourceCommit and appVersion`);
  const root = await realpath(path.resolve(base, declaration.root));
  const files = {};
  for (const [relative, expected] of [["index.html", declaration.indexSha256], ["runtime-precache-manifest.js", declaration.runtimeManifestSha256]]) {
    const bytes = await readFile(path.join(root, relative));
    if (!/^[a-f0-9]{64}$/.test(expected ?? "") || rollbackSha256(bytes) !== expected) throw prerequisite(`${role} ${relative} checksum mismatch`);
    files[relative] = { sha256: expected, bytes };
  }
  const manifestText = files["runtime-precache-manifest.js"].bytes.toString("utf8");
  const manifestMatch = /^\s*self\.__SIMEX_RUNTIME_PRECACHE_MANIFEST__\s*=\s*({[\s\S]*})\s*;?\s*$/.exec(manifestText);
  if (!manifestMatch) throw prerequisite(`${role} has no native generated runtime manifest`);
  const manifest = JSON.parse(manifestMatch[1]);
  if (!manifest.cacheName?.startsWith("simex-dashboard-") || manifest.cacheName !== declaration.cacheName || !Array.isArray(manifest.assets)) throw prerequisite(`${role} runtime cache identity mismatch`);
  if (!Array.isArray(declaration.lazyPaths) || !declaration.lazyPaths.length) throw prerequisite(`${role} needs actual required lazy chunk paths`);
  const lazyPaths = declaration.lazyPaths.map(safeRelative);
  for (const owner of ["BuildWorkspace", "ChartWizardV3"]) if (!lazyPaths.some(file => path.posix.basename(file).startsWith(`${owner}-`) && file.endsWith(".js"))) throw prerequisite(`${role} must declare its actual ${owner} lazy chunk`);
  for (const relative of ["config/dashboard.json", "service-worker.js", ...lazyPaths]) {
    if (!manifest.assets.includes(`./${relative}`)) throw prerequisite(`${role} does not precache ${relative}`);
    const bytes = await readFile(path.join(root, relative));
    files[relative] = { sha256: rollbackSha256(bytes), bytes };
  }
  const packagePath = await realpath(path.resolve(base, declaration.packagePath));
  const packageBytes = await readFile(packagePath);
  if (!/^[a-f0-9]{64}$/.test(declaration.packageSha256 ?? "") || rollbackSha256(packageBytes) !== declaration.packageSha256) throw prerequisite(`${role} package checksum mismatch`);
  const pkg = JSON.parse(packageBytes.toString("utf8").replace(/^\uFEFF/, ""));
  const configVersion = role === "candidate" ? 7 : 6;
  if (pkg.bundleType !== "simex-dashboard-bundle" || pkg.version !== configVersion || pkg.config?.configVersion !== configVersion || declaration.configVersion !== configVersion) throw prerequisite(`${role} must have its actual native V${configVersion} package`);
  if (JSON.parse(files["config/dashboard.json"].bytes).configVersion !== configVersion) throw prerequisite(`${role} built dashboard has the wrong configuration version`);
  const smokePage = pkg.config.pages?.find(page => page.id === declaration.smoke?.pageId);
  const smokeChart = smokePage?.sections?.flatMap(section => section.panels).map(panel => panel.chart ?? panel).find(chart => chart.id === declaration.smoke?.chartId);
  if (!smokeChart) throw prerequisite(`${role} smoke chart is absent from the declared package/page`);
  // Serve only security headers actually present in that build. The retained
  // pre-CSP app must not be presented as having the candidate's security policy.
  const headers = {};
  try {
    for (const line of (await readFile(path.join(root, "_headers"), "utf8")).split(/\r?\n/)) {
      const match = /^  (Content-Security-Policy|X-Content-Type-Options|Referrer-Policy): (.+)$/.exec(line);
      if (match) headers[match[1]] = match[2];
    }
  } catch (error) { if (error.code !== "ENOENT") throw error; }
  return { ...declaration, role, root, files, lazyPaths, packagePath, packageBytes, pkg, manifest, headers, smokeChart };
}

export async function loadRollbackInputs(inputPath = process.env.SIMEX_ROLLBACK_INPUTS) {
  if (!inputPath) throw prerequisite("SIMEX_ROLLBACK_INPUTS must name reviewed actual build/package identities; no synthetic fallback is supplied");
  const filename = await realpath(path.resolve(inputPath));
  const declaration = JSON.parse(await readFile(filename, "utf8"));
  if (declaration.previous?.sourceCommit !== PREVIOUS_COMMIT) throw prerequisite(`previous source must be the retained accepted ${PREVIOUS_COMMIT}`);
  const candidate = await artifact("candidate", declaration.candidate, path.dirname(filename));
  const previous = await artifact("previous", declaration.previous, path.dirname(filename));
  if (candidate.root === previous.root || candidate.manifest.cacheName === previous.manifest.cacheName || candidate.indexSha256 === previous.indexSha256) throw prerequisite("candidate and previous must identify distinct immutable app outputs and caches");
  const evidenceRoot = path.resolve(WORKTREE, declaration.evidenceRoot ?? "release/rollback-backups");
  const releaseRoot = path.join(await realpath(WORKTREE), "release");
  if (!contained(releaseRoot, evidenceRoot) || evidenceRoot === releaseRoot) throw prerequisite("backup evidenceRoot must be a child of this worktree's ignored release/");
  let existing = evidenceRoot;
  while (true) {
    try { if (!contained(releaseRoot, await realpath(existing))) throw prerequisite("backup evidence ancestor escapes release/"); break; }
    catch (error) { if (error.code !== "ENOENT") throw error; existing = path.dirname(existing); if (!contained(releaseRoot, existing)) break; }
  }
  return { filename, candidate, previous, evidenceRoot };
}

export async function createRollbackBackupDirectory(inputs) {
  await mkdir(inputs.evidenceRoot, { recursive: true });
  return mkdtemp(path.join(inputs.evidenceRoot, "rehearsal-"));
}

/** One owned loopback origin; only its source root changes during rollback. */
export async function startRollbackOrigin(inputs) {
  let selected = inputs.candidate;
  const errors = [];
  const server = createServer(async (request, response) => {
    const current = selected;
    try {
      if (!["GET", "HEAD"].includes(request.method)) { response.writeHead(405); response.end(); return; }
      const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
      const relative = pathname === "/" ? "index.html" : safeRelative(pathname.replace(/^\//, ""));
      const file = await realpath(path.join(current.root, ...relative.split("/")));
      if (!contained(current.root, file) || !(await stat(file)).isFile()) throw Object.assign(new Error("Not found"), { code: "ENOENT" });
      const critical = current.files[relative];
      if (critical && rollbackSha256(await readFile(file)) !== critical.sha256) throw new Error(`Artifact changed after preflight: ${current.role}/${relative}`);
      response.writeHead(200, { ...current.headers, "cache-control": "no-store", "content-type": mimeType(file) });
      if (request.method === "HEAD") response.end(); else createReadStream(file).pipe(response);
    } catch (error) {
      if (error.code !== "ENOENT") errors.push(String(error.message));
      response.writeHead(error.code === "ENOENT" ? 404 : 500, { "content-type": "text/plain" }); response.end(String(error.message));
    }
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  return {
    origin: `http://127.0.0.1:${server.address().port}`,
    selectPrevious() { selected = inputs.previous; },
    errors,
    close: () => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())),
  };
}

export function rollbackArtifactIdentity(artifact) {
  return { root: artifact.root, sourceCommit: artifact.sourceCommit, appVersion: artifact.appVersion,
    configVersion: artifact.configVersion, indexSha256: artifact.indexSha256,
    runtimeManifestSha256: artifact.runtimeManifestSha256, cacheName: artifact.manifest.cacheName,
    packagePath: artifact.packagePath, packageSha256: artifact.packageSha256,
    requiredFiles: Object.fromEntries(Object.entries(artifact.files).map(([name, file]) => [name, file.sha256])) };
}

function mimeType(filename) {
  return ({ ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".geojson": "application/geo+json", ".csv": "text/csv", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf", ".webmanifest": "application/manifest+json" })[path.extname(filename)] ?? "application/octet-stream";
}
