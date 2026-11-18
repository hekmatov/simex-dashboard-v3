import { readdir, readFile, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { resolveDashboardPackageSelection, dashboardPackageSectionKey } from "../../src/lib/dashboardPackageSelection.js";

import {
  decodeAssetBase64,
  sha256HexSync,
} from "../../src/static-content/assets/assetPayloadEnvelope.js";

export const PDPC_RELEASE_FACTORY = "simex-pdpc-release";
export const PDPC_RELEASE_MANIFEST_VERSION = 1;
export const PDPC_RELEASE_SET_FILE = "pdpc-release-set.json";

const REQUIRED_PAGE_IDS = Object.freeze([
  "scenario",
  "biomedical",
  "socio_economic",
]);

export const PDPC_RELEASE_VARIANTS = Object.freeze({
  biomedical: Object.freeze({
    id: "biomedical",
    pageIds: Object.freeze(["scenario", "biomedical"]),
  }),
  socioeconomic: Object.freeze({
    id: "socioeconomic",
    pageIds: Object.freeze(["scenario", "socio_economic"]),
  }),
});

const MEDIA_EXTENSIONS = Object.freeze({
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
});

const FULL_SHA256 = /^[0-9a-f]{64}$/;
const FULL_COMMIT = /^[0-9a-f]{40,64}$/;
const SAFE_ASSET_ID = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

export function parsePdpcReleaseArgs(argv) {
  if (!Array.isArray(argv)) throw new TypeError("Release arguments must be an array.");
  const values = { bundlePath: null, outDir: null };
  const names = new Map([
    ["--bundle", "bundlePath"],
    ["--out-dir", "outDir"],
  ]);

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const property = names.get(argument);
    if (!property) throw new Error(`Unknown argument "${String(argument)}".`);
    if (values[property] !== null) throw new Error(`${argument} may be provided only once.`);
    const value = argv[index + 1];
    if (typeof value !== "string" || value.trim() === "" || value.startsWith("--")) {
      throw new Error(`${argument} requires a value.`);
    }
    values[property] = value;
    index += 1;
  }

  if (values.bundlePath === null) throw new Error("--bundle is required.");
  return Object.freeze(values);
}

export function validatePdpcReleasePages(config) {
  const pages = config?.pages;
  const ids = Array.isArray(pages) ? pages.map((page) => page?.id) : [];
  const uniqueIds = new Set(ids);
  const valid = ids.length === REQUIRED_PAGE_IDS.length
    && uniqueIds.size === REQUIRED_PAGE_IDS.length
    && REQUIRED_PAGE_IDS.every((pageId) => uniqueIds.has(pageId));
  if (!valid) {
    throw new Error(
      "A PDPC release requires exactly one each of scenario, biomedical, and socio_economic and no other pages.",
    );
  }
  return pages;
}

export function projectPdpcVariants(config) {
  validatePdpcReleasePages(config);
  return Object.freeze(Object.fromEntries(
    Object.values(PDPC_RELEASE_VARIANTS).map((variant) => [
      variant.id,
      projectPdpcVariant(config, variant.id).config,
    ]),
  ));
}

const pick = (record, ids) => Object.fromEntries([...ids].sort().filter(id => Object.hasOwn(record ?? {}, id)).map(id => [id, record[id]]));
const chartIdsFor = config => new Set((config.pages ?? []).flatMap(page => page.sections.flatMap(section => section.panels.map(panel => (panel.chart ?? panel).id))));
const compositionMembers = value => [...(value.chartIds ?? []), ...(value.members ?? []).map(member => typeof member === "string" ? member : member.chartId)];

/** Participant projection preserves whole comparisons; it never trims members. */
export function projectPdpcVariant(input, variantId) {
  const variant = PDPC_RELEASE_VARIANTS[variantId];
  if (!variant) throw new Error(`Unsupported PDPC variant ${variantId}.`);
  const pages = validatePdpcReleasePages(input);
  const pageById = new Map(pages.map(page => [page.id, page]));
  const config = structuredClone({ ...input, pages: variant.pageIds.map(id => pageById.get(id)) });
  const chartIds = chartIdsFor(config);
  const pageIds = new Set(variant.pageIds);
  const whollyIncluded = ids => ids.length > 0 && ids.every(id => chartIds.has(id));
  const groupIds = new Set((config.chronoGroups ?? []).filter(group => whollyIncluded(compositionMembers(group))).map(group => group.id));
  if (config.chronoGroups) config.chronoGroups = config.chronoGroups.filter(group => groupIds.has(group.id));
  if (config.scenes) config.scenes = config.scenes.filter(scene => {
    const referenced = [...compositionMembers(scene), ...(scene.present?.chartIds ?? []),
      ...(scene.frames?.mode === "source" ? [scene.frames.chartId] : []),
      ...(scene.frameRule?.chartId ? [scene.frameRule.chartId] : [])];
    return whollyIncluded(referenced) && (scene.pageId == null || pageIds.has(scene.pageId))
      && (scene.chronoGroupId == null || groupIds.has(scene.chronoGroupId));
  });
  const detachedGroupChartIds = [];
  for (const page of config.pages) {
    // A common Scenario cannot be silently rewritten into two different briefs.
    const destinations = [page.landing?.hero?.primaryAction?.pageId, ...(page.landing?.domainRoutes ?? []).map(route => route.pageId)].filter(Boolean);
    if (destinations.some(id => !pageIds.has(id))) throw new Error(`Retained page ${page.id} navigates to an omitted discipline. Author a shared participant-safe Scenario before release.`);
    for (const section of page.sections) for (const placement of section.panels) {
      const chart = placement.chart ?? placement, sync = chart.interaction?.timeSync;
      if (sync?.groupId && !groupIds.has(sync.groupId)) {
        chart.interaction.timeSync = sync.matching ? { matching: sync.matching } : null;
        detachedGroupChartIds.push(chart.id);
      }
    }
  }
  const selection = resolveDashboardPackageSelection({ config, assetPayloads: {} }, {
    sectionIds: config.pages.flatMap(page => page.sections.map(section => dashboardPackageSectionKey(page.id, section.id))),
  });
  const assetIds = new Set(selection.assetIds);
  // Already-packaged authored media still need their native manifest for
  // runtime byte validation, even though they no longer have an asset origin.
  for (const id of selection.mediaIds) {
    const item = config.contentLibrary?.mediaItems?.[id];
    if (item?.current?.kind !== "package") continue;
    const assetId = path.posix.basename(item.current.path, path.posix.extname(item.current.path));
    if (config.assets?.[assetId]) assetIds.add(assetId);
  }
  if (config.dataSources) config.dataSources = pick(config.dataSources, selection.sourceIds);
  if (config.datasetProfiles) config.datasetProfiles = pick(config.datasetProfiles, selection.sourceIds);
  if (config.contentLibrary) config.contentLibrary = {
    ...config.contentLibrary,
    sourceEntries: pick(config.contentLibrary.sourceEntries, selection.sourceIds),
    mediaItems: pick(config.contentLibrary.mediaItems, selection.mediaIds),
  };
  if (config.assets) config.assets = pick(config.assets, assetIds);
  const omitted = (original, retained) => Object.keys(original ?? {}).filter(id => !Object.hasOwn(retained ?? {}, id)).sort();
  const omissions = {
    pageIds: REQUIRED_PAGE_IDS.filter(id => !pageIds.has(id)),
    sourceIds: omitted(input.dataSources, config.dataSources),
    profileIds: omitted(input.datasetProfiles, config.datasetProfiles),
    mediaIds: omitted(input.contentLibrary?.mediaItems, config.contentLibrary?.mediaItems),
    assetIds: omitted(input.assets, config.assets),
    chronoGroupIds: (input.chronoGroups ?? []).filter(group => !groupIds.has(group.id)).map(group => group.id).sort(),
    sceneIds: (input.scenes ?? []).filter(scene => !config.scenes?.some(retained => retained.id === scene.id)).map(scene => scene.id).sort(),
    detachedGroupChartIds: detachedGroupChartIds.sort(),
  };
  return { config, omissions };
}

export function createPdpcReleaseMetadata({
  sourceCommit,
  inputSha256,
  bundleType,
  bundleVersion,
}) {
  if (typeof sourceCommit !== "string" || !FULL_COMMIT.test(sourceCommit)) {
    throw new Error("PDPC release source commit must be a full lowercase Git revision.");
  }
  if (typeof inputSha256 !== "string" || !FULL_SHA256.test(inputSha256)) {
    throw new Error("PDPC release input SHA-256 must be a full lowercase digest.");
  }
  if (typeof bundleType !== "string" || bundleType === "") {
    throw new Error("PDPC release bundle type is required.");
  }
  if (!Number.isInteger(bundleVersion) || bundleVersion < 1) {
    throw new Error("PDPC release bundle version must be a positive integer.");
  }

  const releaseId = `pdpc-v${PDPC_RELEASE_MANIFEST_VERSION}-${sourceCommit.slice(0, 12)}-${inputSha256.slice(0, 12)}`;
  const shared = {
    factory: PDPC_RELEASE_FACTORY,
    manifestVersion: PDPC_RELEASE_MANIFEST_VERSION,
    releaseId,
    sourceCommit,
    inputSha256,
    bundleType,
    bundleVersion,
  };
  const variantManifests = Object.fromEntries(
    Object.values(PDPC_RELEASE_VARIANTS).map((variant) => [
      variant.id,
      Object.freeze({
        ...shared,
        variant: variant.id,
        includedPageIds: [...variant.pageIds],
      }),
    ]),
  );
  return Object.freeze({
    releaseId,
    setManifest: Object.freeze({
      ...shared,
      variants: Object.values(PDPC_RELEASE_VARIANTS).map((variant) => Object.freeze({
        variant: variant.id,
        includedPageIds: [...variant.pageIds],
      })),
    }),
    variantManifests: Object.freeze(variantManifests),
  });
}

export function materializePdpcPackageAssets({ config, assetPayloads }) {
  if (config === null || typeof config !== "object" || Array.isArray(config)) {
    throw new TypeError("PDPC release config must be an object.");
  }
  if (assetPayloads === null || typeof assetPayloads !== "object" || Array.isArray(assetPayloads)) {
    throw new TypeError("PDPC release asset payloads must be an object.");
  }

  const projected = structuredClone(config);
  const files = new Map();
  for (const [assetId, payload] of Object.entries(assetPayloads)) {
    if (!SAFE_ASSET_ID.test(assetId)) {
      throw new Error(`Authored asset payload "${assetId}" has an unsafe id.`);
    }
    const manifest = projected.assets?.[assetId];
    if (!manifest) throw new Error(`Authored asset payload "${assetId}" has no manifest entry.`);
    const extension = MEDIA_EXTENSIONS[payload?.mediaType];
    if (!extension || payload.mediaType !== manifest.mediaType) {
      throw new Error(`Authored asset payload "${assetId}" media type does not match its manifest.`);
    }
    const bytes = decodeAssetBase64(payload.base64);
    if (bytes.byteLength !== payload.byteLength || bytes.byteLength !== manifest.byteLength) {
      throw new Error(`Authored asset payload "${assetId}" byte length does not match its manifest.`);
    }
    const digest = sha256HexSync(bytes);
    if (digest !== payload.sha256 || digest !== manifest.sha256) {
      throw new Error(`Authored asset payload "${assetId}" SHA-256 does not match its manifest.`);
    }
    files.set(`assets/package/${assetId}.${extension}`, bytes);
  }

  for (const [mediaId, mediaItem] of Object.entries(
    projected.contentLibrary?.mediaItems ?? {},
  )) {
    if (mediaItem?.current?.kind !== "asset") continue;
    const assetId = mediaItem.current.assetId;
    const manifest = projected.assets?.[assetId];
    const extension = MEDIA_EXTENSIONS[manifest?.mediaType];
    const relativePath = extension ? `assets/package/${assetId}.${extension}` : null;
    if (!relativePath || !files.has(relativePath)) {
      throw new Error(`Media item "${mediaId}" is missing authored asset payload "${assetId}".`);
    }
    mediaItem.origin = "packaged";
    mediaItem.current = { kind: "package", path: relativePath };
  }

  return Object.freeze({ config: projected, files });
}

export async function assertPdpcOutputTarget({
  repoRoot,
  outDir,
  homeDir = os.homedir(),
}) {
  const resolvedRepo = path.resolve(repoRoot);
  const resolvedOutput = path.resolve(outDir);
  const resolvedHome = path.resolve(homeDir);
  if (samePath(resolvedOutput, path.parse(resolvedOutput).root)) {
    throw new Error("PDPC release output cannot be a filesystem root.");
  }
  if (samePath(resolvedOutput, resolvedRepo)) {
    throw new Error("PDPC release output cannot be the repository root.");
  }
  if (samePath(resolvedOutput, resolvedHome)) {
    throw new Error("PDPC release output cannot be the user home directory.");
  }
  for (const name of [".git", ".worktrees", "docs", "node_modules", "public", "scripts", "src"]) {
    if (isWithin(path.join(resolvedRepo, name), resolvedOutput)) {
      throw new Error(`PDPC release output cannot be inside protected repository directory "${name}".`);
    }
  }

  const information = await pathInformation(resolvedOutput);
  if (!information.exists) {
    return Object.freeze({ outDir: resolvedOutput, exists: false, owned: false });
  }
  if (!information.directory) throw new Error("PDPC release output target must be a directory.");
  const entries = await readdir(resolvedOutput);
  if (entries.length === 0) {
    return Object.freeze({ outDir: resolvedOutput, exists: true, owned: false });
  }

  let marker;
  try {
    marker = JSON.parse(await readFile(path.join(resolvedOutput, PDPC_RELEASE_SET_FILE), "utf8"));
  } catch {
    throw new Error(`Existing output is not owned by ${PDPC_RELEASE_FACTORY}.`);
  }
  if (
    marker?.factory !== PDPC_RELEASE_FACTORY
    || marker?.manifestVersion !== PDPC_RELEASE_MANIFEST_VERSION
  ) {
    throw new Error(`Existing output is not owned by ${PDPC_RELEASE_FACTORY}.`);
  }
  return Object.freeze({ outDir: resolvedOutput, exists: true, owned: true });
}

async function pathInformation(filePath) {
  try {
    const information = await stat(filePath);
    return { exists: true, directory: information.isDirectory() };
  } catch (error) {
    if (error?.code === "ENOENT") return { exists: false, directory: false };
    throw error;
  }
}

function samePath(left, right) {
  const normalize = (value) => process.platform === "win32" ? value.toLowerCase() : value;
  return normalize(path.resolve(left)) === normalize(path.resolve(right));
}

function isWithin(parent, child) {
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}
