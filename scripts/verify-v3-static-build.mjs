import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { inspectRuntimeBoundaries } from "./check-v3-runtime-boundaries.mjs";

export const EXPECTED_QUORUM_CONTRACT_HASH =
  "a876d0b83c9f40ea5179723b9c4304f8873b393142e4a790711af80ed363662c";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const DEFAULT_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..");
const ENTRYPOINTS = Object.freeze(["index.html", "source-viewer.html"]);
const REQUIRED_PACKAGE_ASSETS = Object.freeze([
  "assets/pdpc-mark.png",
  "assets/pwa-icon.svg",
  "manifest.webmanifest",
  "service-worker.js",
  "portable-dashboard-data.js",
  "config/dashboard.json",
  "config/dataset-profiles.json",
  "data/data-sources.generated.json",
  "integration/quorum-chart-catalogue.json",
  "vendor/three.min.js",
  "vendor/vanta.net.min.js",
]);

export async function verifyV3StaticBuild({
  rootDir = DEFAULT_ROOT,
  distDir = path.join(rootDir, "dist"),
  runtimeBoundaryInventory,
} = {}) {
  const resolvedRoot = path.resolve(rootDir);
  const resolvedDist = path.resolve(distDir);
  const files = await readFileInventory(resolvedDist);

  for (const filePath of [...ENTRYPOINTS, ...REQUIRED_PACKAGE_ASSETS]) {
    if (!files.has(filePath)) {
      throw new Error(`required package asset is missing: ${filePath}`);
    }
  }

  const runtimeAssets = new Set();
  for (const entrypoint of ENTRYPOINTS) {
    const source = await readFile(path.join(resolvedDist, entrypoint), "utf8");
    for (const url of extractHtmlRuntimeUrls(source)) {
      validateLocalRuntimeUrl({ url, owner: entrypoint, files, runtimeAssets });
    }
  }
  await validateBuiltRuntimeGraph({ distDir: resolvedDist, files, runtimeAssets });

  const manifest = JSON.parse(
    await readFile(path.join(resolvedDist, "manifest.webmanifest"), "utf8"),
  );
  for (const [field, url] of [["start_url", manifest.start_url], ["scope", manifest.scope]]) {
    if (typeof url !== "string" || !isRelativeLaunchUrl(url)) {
      throw new Error(`manifest.webmanifest: ${field} must be relative: ${String(url)}`);
    }
  }

  const hashedRuntimeAssets = [...runtimeAssets]
    .filter((filePath) => /^assets\/[^/]+-[A-Za-z0-9_-]{8,}\.(?:css|js)$/i.test(filePath))
    .toSorted();
  const referencedScripts = [...runtimeAssets].filter((filePath) => filePath.endsWith(".js"));
  const referencedStyles = [...runtimeAssets].filter((filePath) => filePath.endsWith(".css"));
  if (!referencedScripts.some((filePath) => hashedRuntimeAssets.includes(filePath))) {
    throw new Error("index.html: expected a local hashed JavaScript runtime asset");
  }
  if (!referencedStyles.some((filePath) => hashedRuntimeAssets.includes(filePath))) {
    throw new Error("index.html: expected a local hashed CSS runtime asset");
  }

  const inventory = runtimeBoundaryInventory
    ?? inspectRuntimeBoundaries(await readRepositoryInputs(resolvedRoot));
  if (inventory.quorumContractHash !== EXPECTED_QUORUM_CONTRACT_HASH) {
    throw new Error(
      `Quorum protocol/schema hash mismatch: expected ${EXPECTED_QUORUM_CONTRACT_HASH}, received ${inventory.quorumContractHash}`,
    );
  }
  if ((inventory.remoteRuntimeDependencies ?? []).length > 0) {
    throw new Error("source runtime boundary contains remote dependencies");
  }

  return Object.freeze({
    entrypoints: [...ENTRYPOINTS],
    hashedRuntimeAssets,
    quorumContractHash: inventory.quorumContractHash,
    packageAssetCount: files.size,
  });
}

function validateLocalRuntimeUrl({ url, owner, files, runtimeAssets }) {
  if (/^https?:\/\//i.test(url) || /^\/\//.test(url)) {
    throw new Error(`${owner}: remote runtime URL ${url}`);
  }
  if (url.startsWith("/")) {
    throw new Error(`${owner}: launch URL must be relative: ${url}`);
  }
  if (/^(?:data:|blob:|mailto:|javascript:|#)/i.test(url)) return;

  const target = normalizeRelativeUrl(url);
  if (!target) return;
  if (!files.has(target)) {
    throw new Error(`${owner}: local runtime target is missing: ${target}`);
  }
  if (/\.(?:css|js)$/i.test(target)) runtimeAssets.add(target);
}

function extractHtmlRuntimeUrls(source) {
  const urls = [];
  const attributePattern = /\b(?:href|src)\s*=\s*["']([^"']+)["']/gi;
  for (const match of source.matchAll(attributePattern)) urls.push(match[1]);
  return urls;
}

async function validateBuiltRuntimeGraph({ distDir, files, runtimeAssets }) {
  const pending = [...runtimeAssets];
  const inspected = new Set();
  while (pending.length > 0) {
    const owner = pending.shift();
    if (inspected.has(owner)) continue;
    inspected.add(owner);
    const source = await readFile(path.join(distDir, owner), "utf8");
    for (const url of extractBuiltRuntimeUrls(source, path.extname(owner))) {
      if (isIgnoredRuntimeUrl(url)) continue;
      if (isRemoteRuntimeUrl(url)) {
        throw new Error(`${owner}: remote runtime URL ${url}`);
      }
      if (url.startsWith("/")) {
        throw new Error(`${owner}: runtime URL must be relative: ${url}`);
      }
      const target = normalizeBuiltRuntimeUrl(url, owner);
      if (!files.has(target)) {
        throw new Error(`${owner}: local runtime target is missing: ${target}`);
      }
      if (/\.(?:css|js)$/i.test(target) && !runtimeAssets.has(target)) {
        runtimeAssets.add(target);
        pending.push(target);
      }
    }
  }
}

function extractBuiltRuntimeUrls(source, extension) {
  const urls = [];
  const patterns = extension === ".css"
    ? [/@import\s+(?:url\(\s*)?["']?([^\s"')]+)["']?\s*\)?/gi,
      /url\(\s*["']?([^\s"')]+)["']?\s*\)/gi]
    : [/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
      /(?:^|[;\n])\s*(?:import|export)\s*\{[^}]*\}\s*from\s*["']([^"']+)["']/g,
      /(?:^|[;\n])\s*(?:import|export)\s*\*\s*(?:as\s+[A-Za-z_$][\w$]*\s*)?from\s*["']([^"']+)["']/g,
      /(?:^|[;\n])\s*import\s+[A-Za-z_$][\w$]*(?:\s*,\s*(?:\{[^}]*\}|\*\s*as\s+[A-Za-z_$][\w$]*))?\s*from\s*["']([^"']+)["']/g,
      /(?:^|[;\n])\s*import\s*["']([^"']+)["']/g,
      /\bnew\s+URL\(\s*["']([^"']+)["']\s*,\s*import\.meta\.url\s*\)/g,
      /\b(?:fetch|importScripts)\(\s*["']([^"']+)["']/g,
      /\bnew\s+(?:Worker|SharedWorker|WebSocket|EventSource)\(\s*["']([^"']+)["']/g];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) urls.push(match[1]);
  }
  return [...new Set(urls)];
}

function normalizeBuiltRuntimeUrl(value, owner) {
  const withoutQuery = value.split(/[?#]/, 1)[0].replaceAll("\\", "/");
  const normalized = path.posix.normalize(
    path.posix.join(path.posix.dirname(owner), withoutQuery),
  );
  if (normalized === ".." || normalized.startsWith("../")) {
    throw new Error(`${owner}: runtime URL escapes the package: ${value}`);
  }
  return normalized;
}

function isRemoteRuntimeUrl(value) {
  return /^https?:\/\//i.test(value) || /^\/\//.test(value);
}

function isIgnoredRuntimeUrl(value) {
  return /^(?:data:|blob:|mailto:|javascript:|#)/i.test(value);
}

function normalizeRelativeUrl(value) {
  const withoutQuery = value.split(/[?#]/, 1)[0].replaceAll("\\", "/");
  const normalized = path.posix.normalize(withoutQuery.replace(/^\.\//, ""));
  if (!normalized || normalized === ".") return null;
  if (normalized === ".." || normalized.startsWith("../")) {
    throw new Error(`launch URL escapes the package: ${value}`);
  }
  return normalized;
}

function isRelativeLaunchUrl(value) {
  return value === "." || value === "./" || value.startsWith("./");
}

async function readFileInventory(root) {
  const files = new Set();
  await visit(root, "");
  return files;

  async function visit(directory, relative) {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (error?.code === "ENOENT") throw new Error(`static build directory is missing: ${root}`);
      throw error;
    }
    for (const entry of entries) {
      const childRelative = path.posix.join(relative, entry.name);
      const child = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(child, childRelative);
      else if (entry.isFile()) files.add(childRelative);
    }
  }
}

async function readRepositoryInputs(rootDir) {
  const publicFiles = await readTextTree(
    path.join(rootDir, "public"),
    "public",
    new Set([".css", ".html", ".js", ".json", ".svg"]),
  );
  publicFiles["index.html"] = await readFile(path.join(rootDir, "index.html"), "utf8");
  return {
    packageJson: JSON.parse(await readFile(path.join(rootDir, "package.json"), "utf8")),
    sourceFiles: await readTextTree(
      path.join(rootDir, "src"),
      "src",
      new Set([".css", ".html", ".js", ".jsx"]),
    ),
    publicFiles,
  };
}

async function readTextTree(root, prefix, extensions) {
  const files = {};
  await visit(root, prefix);
  return files;

  async function visit(directory, relative) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const filePath = path.posix.join(relative, entry.name);
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(absolute, filePath);
      else if (extensions.has(path.extname(entry.name))) {
        files[filePath] = await readFile(absolute, "utf8");
      }
    }
  }
}

async function run() {
  try {
    const result = await verifyV3StaticBuild();
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
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
