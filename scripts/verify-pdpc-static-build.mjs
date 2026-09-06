import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  PDPC_RELEASE_FACTORY,
  PDPC_RELEASE_MANIFEST_VERSION,
  PDPC_RELEASE_VARIANTS,
} from "./lib/pdpc-release.mjs";

const RUNTIME_PRECACHE_MANIFEST = "runtime-precache-manifest.js";
const REQUIRED_FILES = Object.freeze([
  "index.html",
  "release-manifest.json",
  "service-worker.js",
  "portable-dashboard-data.js",
  "config/dashboard.json",
  "config/dataset-profiles.json",
  "vendor/three.min.js",
  "vendor/vanta.net.min.js",
]);

export async function finalizePdpcRuntimeManifest({ outputDir, variant }) {
  const files = await readFileInventory(outputDir);
  files.delete(RUNTIME_PRECACHE_MANIFEST);
  const assets = Object.freeze([
    "./",
    ...[...files].toSorted().map((file) => `./${file}`),
    `./${RUNTIME_PRECACHE_MANIFEST}`,
  ]);
  const digest = await runtimeDigest({ outputDir, assets });
  const manifest = Object.freeze({
    cacheName: `simex-dashboard-pdpc-${variant}-${digest.slice(0, 16)}`,
    assets,
  });
  await writeFile(
    path.join(outputDir, RUNTIME_PRECACHE_MANIFEST),
    `self.__SIMEX_RUNTIME_PRECACHE_MANIFEST__ = ${JSON.stringify(manifest, null, 2)};\n`,
  );
  return manifest;
}

export async function verifyPdpcStaticBuild({ outputDir, variant, manifest = null }) {
  const expectedVariant = PDPC_RELEASE_VARIANTS[variant];
  if (!expectedVariant) throw new Error(`Unsupported PDPC release variant "${String(variant)}".`);
  const resolvedOutput = path.resolve(outputDir);
  const releaseManifest = manifest ?? JSON.parse(
    await readFile(path.join(resolvedOutput, "release-manifest.json"), "utf8"),
  );
  validateReleaseManifest(releaseManifest, expectedVariant);

  const config = JSON.parse(
    await readFile(path.join(resolvedOutput, "config", "dashboard.json"), "utf8"),
  );
  const pageIds = Array.isArray(config.pages) ? config.pages.map(({ id }) => id) : [];
  if (JSON.stringify(pageIds) !== JSON.stringify(releaseManifest.includedPageIds)) {
    throw new Error("PDPC static config pages do not match release manifest.");
  }
  await verifyPackagedMedia({ outputDir: resolvedOutput, config });

  const files = await readFileInventory(resolvedOutput);
  for (const file of [...REQUIRED_FILES, RUNTIME_PRECACHE_MANIFEST]) {
    if (!files.has(file)) throw new Error(`PDPC static asset is missing: ${file}`);
  }
  if (files.has("release.html") || files.has("source-viewer.html")) {
    throw new Error("PDPC static output contains a non-release entrypoint.");
  }
  if (![...files].some((file) => /^assets\/pdpc-logo-[A-Za-z0-9_-]+\.png$/i.test(file))) {
    throw new Error("PDPC static output is missing its fingerprinted official logo.");
  }

  const runtimeAssets = new Set();
  const indexHtml = await readFile(path.join(resolvedOutput, "index.html"), "utf8");
  for (const url of extractHtmlRuntimeUrls(indexHtml)) {
    validateLocalRuntimeUrl({ url, owner: "index.html", files, runtimeAssets });
  }
  await validateBuiltRuntimeGraph({ outputDir: resolvedOutput, files, runtimeAssets });

  const runtimeText = (await Promise.all(
    [...files]
      .filter((file) => /\.(?:css|js)$/i.test(file))
      .map((file) => readFile(path.join(resolvedOutput, file), "utf8")),
  )).join("\n");
  if (!runtimeText.includes("Fictional scenario · Exercise use only")) {
    throw new Error("PDPC static runtime does not contain the release disclaimer.");
  }

  const expectedRuntimeManifest = await expectedPrecacheManifest({
    outputDir: resolvedOutput,
    files,
    variant,
  });
  const generatedRuntimeManifest = await readRuntimeManifest(resolvedOutput);
  if (JSON.stringify(generatedRuntimeManifest) !== JSON.stringify(expectedRuntimeManifest)) {
    throw new Error("PDPC runtime precache manifest does not match the output graph.");
  }

  return Object.freeze({
    variant,
    includedPageIds: [...pageIds],
    releaseId: releaseManifest.releaseId,
    fileCount: files.size,
    runtimeAssetCount: runtimeAssets.size,
  });
}

function validateReleaseManifest(manifest, variant) {
  if (
    manifest?.factory !== PDPC_RELEASE_FACTORY
    || manifest?.manifestVersion !== PDPC_RELEASE_MANIFEST_VERSION
    || manifest?.variant !== variant.id
    || JSON.stringify(manifest?.includedPageIds) !== JSON.stringify(variant.pageIds)
  ) {
    throw new Error(`PDPC release manifest does not match variant "${variant.id}".`);
  }
}

async function verifyPackagedMedia({ outputDir, config }) {
  for (const mediaItem of Object.values(config.contentLibrary?.mediaItems ?? {})) {
    if (mediaItem?.current?.kind !== "package") continue;
    const relativePath = safePackagePath(mediaItem.current.path);
    const absolutePath = path.join(outputDir, ...relativePath.split("/"));
    let bytes;
    try {
      bytes = await readFile(absolutePath);
    } catch (error) {
      if (error?.code === "ENOENT") {
        throw new Error(`PDPC packaged media asset is missing: ${relativePath}`);
      }
      throw error;
    }
    const assetId = path.posix.basename(relativePath, path.posix.extname(relativePath));
    const manifest = config.assets?.[assetId];
    if (!manifest) throw new Error(`PDPC packaged media manifest is missing: ${assetId}`);
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (bytes.byteLength !== manifest.byteLength || digest !== manifest.sha256) {
      throw new Error(`PDPC packaged media asset does not match its manifest: ${relativePath}`);
    }
  }
}

function safePackagePath(value) {
  if (
    typeof value !== "string"
    || !value.startsWith("assets/package/")
    || value.includes("\\")
    || value.includes("%")
    || value.includes(":")
    || value.startsWith("/")
  ) {
    throw new Error(`PDPC packaged media path is unsafe: ${String(value)}`);
  }
  const normalized = path.posix.normalize(value);
  if (normalized !== value || normalized.includes("../")) {
    throw new Error(`PDPC packaged media path is unsafe: ${value}`);
  }
  return normalized;
}

async function expectedPrecacheManifest({ outputDir, files, variant }) {
  const assets = [
    "./",
    ...[...files]
      .filter((file) => file !== RUNTIME_PRECACHE_MANIFEST)
      .toSorted()
      .map((file) => `./${file}`),
    `./${RUNTIME_PRECACHE_MANIFEST}`,
  ];
  const digest = await runtimeDigest({ outputDir, assets });
  return {
    cacheName: `simex-dashboard-pdpc-${variant}-${digest.slice(0, 16)}`,
    assets,
  };
}

async function runtimeDigest({ outputDir, assets }) {
  const hash = createHash("sha256");
  for (const asset of assets) {
    if (asset === "./" || asset === `./${RUNTIME_PRECACHE_MANIFEST}`) continue;
    const file = asset.slice(2);
    hash.update(file);
    hash.update("\0");
    hash.update(await readFile(path.join(outputDir, ...file.split("/"))));
    hash.update("\0");
  }
  return hash.digest("hex");
}

async function readRuntimeManifest(outputDir) {
  const source = await readFile(path.join(outputDir, RUNTIME_PRECACHE_MANIFEST), "utf8");
  const match = source.match(/__SIMEX_RUNTIME_PRECACHE_MANIFEST__\s*=\s*([\s\S]+?);\s*$/);
  if (!match) throw new Error("PDPC runtime precache manifest has invalid syntax.");
  return JSON.parse(match[1]);
}

function extractHtmlRuntimeUrls(source) {
  return [...source.matchAll(/\b(?:href|src)\s*=\s*["']([^"']+)["']/gi)]
    .map((match) => match[1]);
}

function validateLocalRuntimeUrl({ url, owner, files, runtimeAssets }) {
  if (/^https?:\/\//i.test(url) || /^\/\//.test(url)) {
    throw new Error(`${owner}: remote runtime URL ${url}`);
  }
  if (url.startsWith("/")) throw new Error(`${owner}: launch URL must be relative: ${url}`);
  if (/^(?:data:|blob:|mailto:|javascript:|#)/i.test(url)) return;
  const target = normalizeRuntimeUrl(url, owner);
  if (!target) return;
  if (!files.has(target)) throw new Error(`${owner}: local runtime target is missing: ${target}`);
  runtimeAssets.add(target);
}

async function validateBuiltRuntimeGraph({ outputDir, files, runtimeAssets }) {
  const pending = [...runtimeAssets].filter((file) => /\.(?:css|js)$/i.test(file));
  const inspected = new Set();
  while (pending.length > 0) {
    const owner = pending.shift();
    if (inspected.has(owner)) continue;
    inspected.add(owner);
    const source = await readFile(path.join(outputDir, ...owner.split("/")), "utf8");
    for (const url of extractBuiltRuntimeUrls(source, path.posix.extname(owner))) {
      if (/^(?:data:|blob:|mailto:|javascript:|#)/i.test(url)) continue;
      if (/^https?:\/\//i.test(url) || /^\/\//.test(url)) {
        throw new Error(`${owner}: remote runtime URL ${url}`);
      }
      if (url.startsWith("/")) throw new Error(`${owner}: runtime URL must be relative: ${url}`);
      const target = normalizeBuiltRuntimeUrl(url, owner);
      if (!files.has(target)) throw new Error(`${owner}: local runtime target is missing: ${target}`);
      if (!runtimeAssets.has(target)) runtimeAssets.add(target);
      if (/\.(?:css|js)$/i.test(target) && !inspected.has(target)) pending.push(target);
    }
  }
}

function extractBuiltRuntimeUrls(source, extension) {
  const patterns = extension === ".css"
    ? [/@import\s+(?:url\(\s*)?["']?([^\s"')]+)["']?\s*\)?/gi,
      /url\(\s*["']?([^\s"')]+)["']?\s*\)/gi]
    : [/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
      /\bnew\s+URL\(\s*["']([^"']+)["']\s*,\s*import\.meta\.url\s*\)/g,
      /\b(?:fetch|importScripts)\(\s*["']([^"']+)["']/g];
  return [...new Set(patterns.flatMap((pattern) => (
    [...source.matchAll(pattern)].map((match) => match[1])
  )))];
}

function normalizeRuntimeUrl(value, owner) {
  const withoutQuery = value.split(/[?#]/, 1)[0].replaceAll("\\", "/");
  const normalized = path.posix.normalize(withoutQuery.replace(/^\.\//, ""));
  if (!normalized || normalized === ".") return null;
  if (normalized === ".." || normalized.startsWith("../")) {
    throw new Error(`${owner}: launch URL escapes the package: ${value}`);
  }
  return normalized;
}

function normalizeBuiltRuntimeUrl(value, owner) {
  const withoutQuery = value.split(/[?#]/, 1)[0].replaceAll("\\", "/");
  const normalized = path.posix.normalize(path.posix.join(path.posix.dirname(owner), withoutQuery));
  if (normalized === ".." || normalized.startsWith("../")) {
    throw new Error(`${owner}: runtime URL escapes the package: ${value}`);
  }
  return normalized;
}

async function readFileInventory(root) {
  const files = new Set();
  await visit(root, "");
  return files;

  async function visit(directory, relative) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const childRelative = path.posix.join(relative, entry.name);
      const child = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(child, childRelative);
      else if (entry.isFile()) files.add(childRelative);
    }
  }
}
