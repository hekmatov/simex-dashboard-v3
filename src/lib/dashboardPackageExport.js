const RUNTIME_KEYS = [
  "chartDataStates",
  "dataSourceStates",
  "loadedData",
];

const EXPORT_ISSUES = Object.freeze([
  ["chartEditor", "chart-editor", "Chart changes", "Return to chart editor"],
  ["chartWizard", "chart-wizard", "New chart draft", "Resume chart draft"],
  ["layout", "layout", "Layout changes", "Review layout changes"],
  ["structure", "structure", "Pages and sections draft", "Open Pages & sections"],
  ["scenario", "scenario", "Scenario Passport draft", "Open Scenario Passport"],
  ["chronoGroup", "chrono-group", "Chrono Group draft", "Open Chrono Studio"],
  ["scene", "scene", "Scene draft", "Open Scene Studio"],
  ["inlineRename", "inline-rename", "Unfinished rename", "Return to rename"],
  ["operation", "operation", "Dashboard operation in progress", "Wait for operation"],
]);

export function collectDashboardPackageExportIssues(state = {}) {
  return EXPORT_ISSUES.flatMap(([key, id, label, actionLabel]) => (
    state[key] === true ? [{ id, label, actionLabel }] : []
  ));
}

export async function prepareDashboardPackageExport(dashboard, {
  readText = missingReader("CSV"),
  readJson = missingReader("GeoJSON"),
  readImageDataUrl = missingReader("image"),
  readAuthoredAsset = missingReader("authored image"),
} = {}) {
  const config = structuredClone(dashboard);
  for (const key of RUNTIME_KEYS) delete config[key];

  const sources = config.dataSources ?? {};
  for (const [sourceId, source] of Object.entries(sources)) {
    if (source && typeof source === "object") {
      delete source.browserAssetId;
      delete source.browserImageAssetIds;
    }
    if (source?.kind === "csv") {
      const csvText = await readText(source.path, { sourceId, source });
      if (typeof csvText !== "string") {
        throw new Error(`CSV source "${sourceId}" could not be included in the dashboard package.`);
      }
      sources[sourceId] = compact({
        kind: "dataset",
        type: "uploadedCsv",
        fileName: fileName(source.path, `${sourceId}.csv`),
        csvText,
        parsingMetadata: source.parsingMetadata,
        provenance: source.provenance,
      });
      continue;
    }
    if (source?.kind === "geojson") {
      const geoJson = await readJson(source.path, { sourceId, source });
      if (!geoJson || typeof geoJson !== "object" || Array.isArray(geoJson)) {
        throw new Error(`GeoJSON source "${sourceId}" could not be included in the dashboard package.`);
      }
      sources[sourceId] = compact({
        kind: "dataset",
        type: "uploadedGeoJson",
        fileName: fileName(source.path, `${sourceId}.geojson`),
        geoJson,
        provenance: source.provenance,
      });
    }
  }

  let embeddedImageCount = 0;
  for (const sourceId of imageSourceIds(config)) {
    const source = sources[sourceId];
    if (source?.kind !== "inline" || !Array.isArray(source.rows)) continue;
    for (const row of source.rows) {
      if (row && typeof row === "object") delete row.browserAssetId;
      if (!row || typeof row.src !== "string" || isEmbeddedImage(row.src)) continue;
      const dataUrl = await readImageDataUrl(row.src, { sourceId, source });
      if (!isEmbeddedImage(dataUrl)) {
        throw new Error(`Image source "${sourceId}" could not be included in the dashboard package.`);
      }
      row.src = dataUrl;
      embeddedImageCount += 1;
    }
  }

  const assetPayloads = {};
  const authoredMediaByAsset = new Map();
  for (const [mediaId, item] of Object.entries(config.contentLibrary?.mediaItems ?? {})) {
    if (item?.current?.kind === "asset") {
      authoredMediaByAsset.set(item.current.assetId, mediaId);
    }
  }
  for (const [assetId, mediaId] of [...authoredMediaByAsset].sort()) {
    const manifestEntry = config.assets?.[assetId];
    if (!manifestEntry || manifestEntry.storageState !== "durable") {
      throw new Error(`Local media item "${mediaId}" is missing durable authored bytes.`);
    }
    let asset;
    try {
      asset = await readAuthoredAsset(assetId, { mediaId, mediaItem: config.contentLibrary.mediaItems[mediaId] });
    } catch (cause) {
      const state = cause?.code === "AUTHORED_ASSET_CORRUPT" ? "corrupt" : "missing";
      throw new Error(`Local media item "${mediaId}" has ${state} authored bytes.`, { cause });
    }
    const bytes = asset?.bytes instanceof Uint8Array
      ? asset.bytes
      : asset?.bytes instanceof ArrayBuffer
        ? new Uint8Array(asset.bytes)
        : null;
    const corrupt = (
      !bytes
      || asset.assetId !== assetId
      || asset.mediaType !== manifestEntry.mediaType
      || asset.byteLength !== manifestEntry.byteLength
      || bytes.byteLength !== manifestEntry.byteLength
      || asset.width !== manifestEntry.width
      || asset.height !== manifestEntry.height
      || asset.sha256 !== manifestEntry.sha256
      || sha256HexSync(bytes) !== manifestEntry.sha256
    );
    if (corrupt) {
      throw new Error(`Local media item "${mediaId}" has corrupt authored bytes.`);
    }
    assetPayloads[assetId] = {
      base64: encodeAssetBase64(bytes),
      byteLength: manifestEntry.byteLength,
      mediaType: manifestEntry.mediaType,
      sha256: manifestEntry.sha256,
    };
  }

  const networkDependencies = [...new Set(Object.values(config.contentLibrary?.mediaItems ?? {}).flatMap((item) => (
    item?.current?.kind === "url"
      ? [item.current.url]
      : []
  )))].sort();

  return {
    config,
    assetPayloads,
    manifest: {
      embeddedCsvCount: Object.values(sources).filter((source) => source?.type === "uploadedCsv").length,
      embeddedGeoJsonCount: Object.values(sources).filter((source) => source?.type === "uploadedGeoJson").length,
      embeddedImageCount,
      authoredAssetCount: Object.keys(assetPayloads).length,
      networkDependencies,
    },
  };
}

function imageSourceIds(config) {
  return new Set((config.pages ?? []).flatMap((page) => (
    (page.sections ?? []).flatMap((section) => (
      (section.panels ?? []).flatMap((placement) => {
        const chart = placement?.chart ?? placement;
        return chart?.typeId === "image" && typeof chart.sourceId === "string"
          ? [chart.sourceId]
          : [];
      })
    ))
  )));
}

function compact(value) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}

function fileName(path, fallback) {
  if (typeof path !== "string") return fallback;
  const value = path.split(/[\\/]/).filter(Boolean).at(-1);
  return value || fallback;
}

function isEmbeddedImage(value) {
  return typeof value === "string" && /^data:image\/[a-z0-9.+-]+;base64,/i.test(value);
}

function missingReader(kind) {
  return async () => {
    throw new Error(`${kind} source material could not be read for dashboard package export.`);
  };
}
import {
  encodeAssetBase64,
  sha256HexSync,
} from "../static-content/assets/assetPayloadEnvelope.js";
