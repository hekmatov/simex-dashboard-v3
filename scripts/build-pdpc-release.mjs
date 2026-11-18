import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";

import react from "@vitejs/plugin-react";
import { build as viteBuild } from "vite";

import { parseDashboardBundle } from "../src/charting/config/dashboardBundleV3.js";
import {
  PDPC_RELEASE_SET_FILE,
  PDPC_RELEASE_VARIANTS,
  assertPdpcOutputTarget,
  createPdpcReleaseMetadata,
  materializePdpcPackageAssets,
  parsePdpcReleaseArgs,
  projectPdpcVariant,
  validatePdpcReleasePages,
} from "./lib/pdpc-release.mjs";
import {
  finalizePdpcRuntimeManifest,
  verifyPdpcStaticBuild,
} from "./verify-pdpc-static-build.mjs";
import { createPdpcLightDefaultPlugin } from "./lib/pdpc-light-default.mjs";
import { safePublicPath } from "../src/lib/loadDashboard.js";
import { validateImageOrigin } from "../src/static-content/image/imageAssetValidation.js";

const execFileAsync = promisify(execFile);
const SCRIPT_PATH = fileURLToPath(import.meta.url);
const DEFAULT_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..");

export async function buildPdpcReleaseSet({
  rootDir = DEFAULT_ROOT,
  outDir = path.join(rootDir, "release", "pdpc"),
  envelope,
  metadata,
  buildVariant = buildPdpcStaticVariant,
  verifyVariant = verifyPdpcStaticBuild,
}) {
  const resolvedRoot = path.resolve(rootDir);
  const resolvedOutput = path.resolve(outDir);
  validatePdpcReleasePages(envelope?.config);
  const projections = Object.fromEntries(Object.keys(PDPC_RELEASE_VARIANTS).map(id => [id, projectPdpcVariant(envelope.config, id)]));
  const target = await assertPdpcOutputTarget({
    repoRoot: resolvedRoot,
    outDir: resolvedOutput,
  });
  const parent = path.dirname(resolvedOutput);
  const baseName = path.basename(resolvedOutput);
  await mkdir(parent, { recursive: true });
  let staging = await mkdtemp(path.join(parent, `.${baseName}.staging-`));
  let backup = null;

  try {
    for (const variant of Object.values(PDPC_RELEASE_VARIANTS)) {
      const projection = projections[variant.id];
      const assetPayloads = Object.fromEntries(Object.entries(envelope.assetPayloads ?? {}).filter(([id]) => Object.hasOwn(projection.config.assets ?? {}, id)));
      const materialized = materializePdpcPackageAssets({ config: projection.config, assetPayloads });
      const variantManifest = { ...metadata.variantManifests[variant.id], projectionOmissions: projection.omissions };
      const publicDir = path.join(staging, `.public-${variant.id}`);
      const outputDir = path.join(staging, variant.id);
      await createVariantPublicTree({
        rootDir: resolvedRoot,
        publicDir,
        config: materialized.config,
        files: materialized.files,
        variant: variant.id,
      });
      await buildVariant({
        rootDir: resolvedRoot,
        variant: variant.id,
        publicDir,
        outputDir,
      });
      await writeStableJson(
        path.join(outputDir, "release-manifest.json"),
        variantManifest,
      );
      await finalizePdpcRuntimeManifest({ outputDir, variant: variant.id });
      await verifyVariant({
        outputDir,
        variant: variant.id,
        manifest: variantManifest,
      });
      await safeRemove(publicDir, staging);
    }
    await writeStableJson(path.join(staging, PDPC_RELEASE_SET_FILE), {
      ...metadata.setManifest,
      variants: metadata.setManifest.variants.map(variant => ({ ...variant, projectionOmissions: projections[variant.variant].omissions })),
    });

    if (target.exists) {
      backup = path.join(parent, `.${baseName}.backup-${randomUUID()}`);
      await rename(resolvedOutput, backup);
    }
    try {
      await rename(staging, resolvedOutput);
      staging = null;
    } catch (error) {
      if (backup) {
        await rename(backup, resolvedOutput);
        backup = null;
      }
      throw error;
    }
    if (backup) {
      await safeRemove(backup, parent);
      backup = null;
    }
    return Object.freeze({
      outDir: resolvedOutput,
      releaseId: metadata.releaseId,
      variants: Object.keys(PDPC_RELEASE_VARIANTS),
    });
  } finally {
    if (staging) await safeRemove(staging, parent);
    if (backup && await exists(backup) && !await exists(resolvedOutput)) {
      await rename(backup, resolvedOutput);
      backup = null;
    }
  }
}

export async function buildPdpcStaticVariant({ rootDir, variant, publicDir, outputDir }) {
  const lightDefaultPlugin = createPdpcLightDefaultPlugin({
    themeModulePath: path.join(rootDir, "src", "theme", "dashboardTheme.js"),
  });
  await viteBuild({
    root: rootDir,
    configFile: false,
    base: "./",
    publicDir,
    logLevel: "info",
    plugins: [react(), lightDefaultPlugin],
    define: {
      __SIMEX_PDPC_VARIANT__: JSON.stringify(variant),
    },
    build: {
      outDir: outputDir,
      emptyOutDir: true,
      rollupOptions: {
        input: {
          release: path.join(rootDir, "release.html"),
        },
        output: { inlineDynamicImports: true },
      },
    },
  });
  if (lightDefaultPlugin.appliedCount() !== 1) {
    throw new Error(
      `Expected the PDPC Light-default transform once; applied ${lightDefaultPlugin.appliedCount()} times.`,
    );
  }
  await rename(path.join(outputDir, "release.html"), path.join(outputDir, "index.html"));
}

export async function runPdpcReleaseCommand({
  argv = process.argv.slice(2),
  rootDir = DEFAULT_ROOT,
  cwd = process.cwd(),
} = {}) {
  const args = parsePdpcReleaseArgs(argv);
  const resolvedRoot = path.resolve(rootDir);
  await assertCleanTrackedWorktree(resolvedRoot);
  const bundlePath = path.resolve(cwd, args.bundlePath);
  const inputBytes = await readFile(bundlePath);
  const inputSha256 = createHash("sha256").update(inputBytes).digest("hex");
  const text = inputBytes.toString("utf8").replace(/^\uFEFF/, "");
  const envelope = parseDashboardBundle(text, { includeEnvelope: true });
  const rawBundle = JSON.parse(text);
  const sourceCommit = await gitOutput(resolvedRoot, ["rev-parse", "HEAD"]);
  const metadata = createPdpcReleaseMetadata({
    sourceCommit,
    inputSha256,
    bundleType: rawBundle.bundleType,
    bundleVersion: rawBundle.version,
  });
  const outDir = args.outDir === null
    ? path.join(resolvedRoot, "release", "pdpc")
    : path.resolve(cwd, args.outDir);
  return buildPdpcReleaseSet({
    rootDir: resolvedRoot,
    outDir,
    envelope,
    metadata,
  });
}

async function createVariantPublicTree({ rootDir, publicDir, config, files, variant }) {
  const sourceRoot = await realpath(path.join(rootDir, "public"));
  await mkdir(publicDir, { recursive: true });
  const copy = async (relativePath, optional = false) => {
    if (files.has(relativePath)) return;
    const segments = relativePath.split("/");
    if (relativePath.includes(":") || relativePath.includes("\\") || segments.some(segment => !segment || segment === "." || segment === "..")) throw new Error(`Unsafe PDPC public dependency: ${relativePath}`);
    const source = path.join(sourceRoot, ...segments);
    let resolved;
    try { resolved = await realpath(source); } catch (error) { if (optional && error.code === "ENOENT") return; throw error; }
    const relative = path.relative(sourceRoot, resolved);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative) || !(await stat(resolved)).isFile()) throw new Error(`PDPC public dependency escapes its local source tree: ${relativePath}`);
    const destination = path.join(publicDir, ...segments);
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(resolved, destination);
  };
  // Generated config/portable data/precache replace full-workspace equivalents.
  // Exercise assets are copied only through the native retained content graph.
  for (const relativePath of ["_headers", "service-worker.js", "vendor/three.min.js", "vendor/vanta.net.min.js", "assets/pwa-icon.svg", "assets/pdpc-logo.png", "assets/pdpc-mark-watermark.png"]) await copy(relativePath, true);
  for (const [directory, pattern] of [["fonts", /\.(?:woff2?|ttf|otf)$/i], ["licenses", /\.(?:txt|md)$/i]]) {
    const base = path.join(sourceRoot, directory);
    if (!(await exists(base))) continue;
    for (const file of await readdir(base, { recursive: true })) if (pattern.test(file)) await copy(`${directory}/${file.replaceAll("\\", "/")}`);
  }
  for (const source of Object.values(config.dataSources ?? {})) if (["csv", "geojson"].includes(source.kind)) await copy(safePublicPath(source.path));
  for (const item of Object.values(config.contentLibrary?.mediaItems ?? {})) if (item.current?.kind === "package") await copy(validateImageOrigin(item.current).path);
  for (const page of config.pages) {
    const preview = page.landing?.previewAsset?.src;
    if (preview && !/^(?:https?:|data:)/.test(preview)) await copy(preview);
    for (const section of page.sections) for (const panel of section.panels) {
      const chart = panel.chart ?? panel;
      if (chart.typeId !== "image") continue;
      for (const row of config.dataSources?.[chart.sourceId]?.rows ?? []) if (typeof row.src === "string" && !/^(?:https?:|data:)/.test(row.src)) await copy(row.src);
    }
  }
  await writeStableJson(path.join(publicDir, "config", "dashboard.json"), config);
  await writeStableJson(
    path.join(publicDir, "config", "dataset-profiles.json"),
    config.datasetProfiles ?? {},
  );
  const portable = sortValue({
    type: "simex-dashboard-v3-portable-data",
    config,
    dataSources: config.dataSources ?? {},
    datasetProfiles: config.datasetProfiles ?? {},
    sources: {},
  });
  await writeFile(
    path.join(publicDir, "portable-dashboard-data.js"),
    `window.SIMEX_PORTABLE_DASHBOARD = ${JSON.stringify(portable)};\n`,
  );
  await writeStableJson(path.join(publicDir, "manifest.webmanifest"), {
    name: `PDPC ${variant === "biomedical" ? "Biomedical" : "Socioeconomic"} Simulation Exercise`,
    short_name: "PDPC SimEx",
    description: "View-only PDPC simulation exercise dashboard.",
    start_url: "./",
    scope: "./",
    display: "standalone",
    background_color: "#f7f9fc",
    theme_color: "#08224a",
    icons: [{
      src: "assets/pwa-icon.svg",
      sizes: "any",
      type: "image/svg+xml",
      purpose: "any maskable",
    }],
  });
  for (const [relativePath, bytes] of files) {
    const destination = path.join(publicDir, ...relativePath.split("/"));
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, bytes);
  }
}

async function writeStableJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(sortValue(value), null, 2)}\n`, "utf8");
}

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, sortValue(value[key])]),
  );
}

async function assertCleanTrackedWorktree(rootDir) {
  const status = await gitOutput(rootDir, ["status", "--porcelain", "--untracked-files=no"]);
  if (status !== "") {
    throw new Error("PDPC releases require a clean tracked Git worktree so the manifest source commit is exact.");
  }
}

async function gitOutput(rootDir, args) {
  const { stdout } = await execFileAsync("git", args, { cwd: rootDir, windowsHide: true });
  return stdout.trim();
}

async function safeRemove(target, parent) {
  const resolvedTarget = path.resolve(target);
  const resolvedParent = path.resolve(parent);
  const relative = path.relative(resolvedParent, resolvedTarget);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to remove path outside the release staging parent: ${resolvedTarget}`);
  }
  await rm(resolvedTarget, { recursive: true, force: true });
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function run() {
  try {
    const result = await runPdpcReleaseCommand();
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
