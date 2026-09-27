import { createHash, randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { runPdpcReleaseCommand } from "./build-pdpc-release.mjs";
import { parsePdpcReleaseArgs } from "./lib/pdpc-release.mjs";
import { buildPdpcSingleFile } from "./lib/pdpc-single-file.mjs";
import { createZipFromDirectory } from "./lib/zip-directory.mjs";
import { verifyPdpcStaticBuild } from "./verify-pdpc-static-build.mjs";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const DEFAULT_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..");
const FACTORY = "simex-pdpc-deliverables";
const FORMAT_VERSION = 1;
const VARIANTS = Object.freeze([
  Object.freeze({ id: "biomedical", label: "Biomedical" }),
  Object.freeze({ id: "socioeconomic", label: "Socioeconomic" }),
]);

export async function buildPdpcDeliverables({
  bundlePath,
  outDir,
  rootDir = DEFAULT_ROOT,
  cwd = process.cwd(),
}) {
  const resolvedRoot = path.resolve(rootDir);
  const resolvedBundle = path.resolve(cwd, bundlePath);
  const resolvedOutput = path.resolve(cwd, outDir ?? path.join(resolvedRoot, "release", "pdpc-deliverables"));
  await assertDeliverableTarget(resolvedOutput, resolvedRoot);

  const parent = path.dirname(resolvedOutput);
  const baseName = path.basename(resolvedOutput);
  await mkdir(parent, { recursive: true });
  let staging = await mkdtemp(path.join(parent, `.${baseName}.staging-`));
  let backup = null;

  try {
    const cloudflareDir = path.join(staging, "Cloudflare");
    const release = await runPdpcReleaseCommand({
      argv: ["--bundle", resolvedBundle, "--out-dir", cloudflareDir],
      rootDir: resolvedRoot,
      cwd,
    });
    const deliverables = [];
    const validation = [];
    for (const variant of VARIANTS) {
      const result = await buildPdpcVariantArtifacts({ staging, cloudflareDir, variant });
      deliverables.push(...result.deliverables);
      validation.push(result.validation);
    }

    const marker = {
      factory: FACTORY,
      formatVersion: FORMAT_VERSION,
      releaseId: release.releaseId,
      sourceBundle: path.basename(resolvedBundle),
      sourceBundleSha256: await sha256File(resolvedBundle),
      appearanceDefault: "light",
      deliverables,
    };
    await writeJson(path.join(staging, "validation-summary.json"), {
      ...marker,
      validation,
    });
    await writeJson(path.join(staging, "pdpc-deliverables.json"), marker);
    await writeFile(path.join(staging, "README.md"), releaseReadme(marker), "utf8");

    if (await exists(resolvedOutput)) {
      backup = path.join(parent, `.${baseName}.backup-${randomUUID()}`);
      await rename(resolvedOutput, backup);
    }
    await rename(staging, resolvedOutput);
    staging = null;
    if (backup) {
      await safeRemove(backup, parent);
      backup = null;
    }
    return Object.freeze({
      outDir: resolvedOutput,
      releaseId: release.releaseId,
      deliverables: marker.deliverables,
    });
  } finally {
    if (staging) await safeRemove(staging, parent);
    if (backup && await exists(backup) && !await exists(resolvedOutput)) {
      await rename(backup, resolvedOutput);
    }
  }
}

export async function buildPdpcVariantArtifacts({
  staging,
  cloudflareDir,
  variant,
  verifyVariant = verifyPdpcStaticBuild,
  buildSingleFile = buildPdpcSingleFile,
  createZip = createZipFromDirectory,
}) {
  const releaseDir = path.join(cloudflareDir, variant.id);
  const offlineFile = path.join(staging, "Offline", `PDPC-${variant.label}-Offline.html`);
  const zipFile = path.join(staging, `PDPC-${variant.label}-Cloudflare.zip`);
  const staticResult = await verifyVariant({ outputDir: releaseDir, variant: variant.id });
  const offlineResult = await buildSingleFile({
    releaseDir,
    outputFile: offlineFile,
    variant: variant.id,
  });
  const zipResult = await createZip({ sourceDir: releaseDir, outputFile: zipFile });
  return Object.freeze({
    deliverables: Object.freeze([
      await fileRecord(staging, zipFile, "cloudflare-zip", variant.id),
      await fileRecord(staging, offlineFile, "offline-single-html", variant.id),
    ]),
    validation: Object.freeze({
      variant: variant.id,
      includedPageIds: staticResult.includedPageIds,
      releaseId: staticResult.releaseId,
      cloudflareFileCount: staticResult.fileCount,
      cloudflareRuntimeAssetCount: staticResult.runtimeAssetCount,
      zipEntries: zipResult.entries.length,
      offlineBytes: offlineResult.bytes,
      embeddedPackageAssets: offlineResult.embeddedPackageAssets,
    }),
  });
}

async function assertDeliverableTarget(outDir, rootDir) {
  const root = path.resolve(rootDir);
  const target = path.resolve(outDir);
  if (samePath(target, path.parse(target).root) || samePath(target, root)) {
    throw new Error("PDPC deliverable output cannot be a filesystem or repository root.");
  }
  const targetInfo = await information(target);
  if (!targetInfo.exists) return;
  if (!targetInfo.directory) throw new Error("PDPC deliverable output must be a directory.");
  let marker;
  try {
    marker = JSON.parse(await readFile(path.join(target, "pdpc-deliverables.json"), "utf8"));
  } catch {
    throw new Error(`Existing output is not owned by ${FACTORY}.`);
  }
  if (marker?.factory !== FACTORY || marker?.formatVersion !== FORMAT_VERSION) {
    throw new Error(`Existing output is not owned by ${FACTORY}.`);
  }
}

async function fileRecord(root, filePath, format, variant) {
  const bytes = await readFile(filePath);
  return {
    path: path.relative(root, filePath).replaceAll("\\", "/"),
    format,
    variant,
    byteLength: bytes.byteLength,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

async function sha256File(filePath) {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function releaseReadme(marker) {
  return `# PDPC dashboard deliverables

Release ID: \`${marker.releaseId}\`  
Source bundle: \`${marker.sourceBundle}\`  
Source bundle SHA-256: \`${marker.sourceBundleSha256}\`  
Default appearance on first launch: **Light**

## Cloudflare Pages

Create two separate Cloudflare Pages projects. Upload \`PDPC-Biomedical-Cloudflare.zip\` to the Biomedical project and \`PDPC-Socioeconomic-Cloudflare.zip\` to the Socioeconomic project. Each archive has \`index.html\` at its root; no build command is required.

The expanded, identical upload contents are also under \`Cloudflare/biomedical\` and \`Cloudflare/socioeconomic\`.

## Offline / flash drive

Copy either file from \`Offline/\` to a flash drive and double-click it:

- \`PDPC-Biomedical-Offline.html\`
- \`PDPC-Socioeconomic-Offline.html\`

Each is a self-contained, script-free-launch HTML file. It needs no command prompt, local server, installation, or internet connection, and works across Windows, macOS, and Linux in a current browser.

## Integrity

Checksums and release validation are recorded in \`pdpc-deliverables.json\` and \`validation-summary.json\`.
`;
}

async function safeRemove(target, parent) {
  const resolvedTarget = path.resolve(target);
  const relative = path.relative(path.resolve(parent), resolvedTarget);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to remove path outside the deliverable staging parent: ${resolvedTarget}`);
  }
  await rm(resolvedTarget, { recursive: true, force: true });
}

async function information(filePath) {
  try {
    const value = await stat(filePath);
    return { exists: true, directory: value.isDirectory() };
  } catch (error) {
    if (error?.code === "ENOENT") return { exists: false, directory: false };
    throw error;
  }
}

async function exists(filePath) {
  return (await information(filePath)).exists;
}

function samePath(left, right) {
  const normalize = (value) => process.platform === "win32" ? value.toLowerCase() : value;
  return normalize(path.resolve(left)) === normalize(path.resolve(right));
}

async function run() {
  try {
    const args = parsePdpcReleaseArgs(process.argv.slice(2));
    const result = await buildPdpcDeliverables({
      bundlePath: args.bundlePath,
      outDir: args.outDir,
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await run();
}
