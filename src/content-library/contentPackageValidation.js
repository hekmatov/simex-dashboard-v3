import { validateContentLibrary } from "./contentLibrarySchema.js";
import { classifyManagedSource } from "./sourceEntrySchema.js";
import {
  SOURCE_GEOJSON_LIMIT_KEYS,
  validateGeoJson,
} from "../lib/geoJsonValidation.js";
import {
  decodeAssetBase64,
  sha256HexSync,
} from "../static-content/assets/assetPayloadEnvelope.js";
import {
  inspectImageAnimation,
  inspectRasterMetadata,
} from "../static-content/image/imageAssetValidation.js";
import { parsePortableQmdWithMedia } from "../static-content/qmd/portableQmdMedia.js";

const GEOJSON_SUMMARY_KEYS = Object.freeze([
  "featureCount",
  "geometryTypeCounts",
  "boundingBox",
  "propertyKeys",
  "encodedBytes",
  "totalPositions",
  "renderableFragments",
]);

export function validateContentPackage(input) {
  record(input, "Content package");
  const config = record(input.config, "Content package config");
  const assetPayloads = record(input.assetPayloads ?? {}, "Content package assetPayloads");
  if (config.configVersion !== 5) {
    throw new Error("Content package validation requires a migrated DashboardV5 config.");
  }

  const assets = config.assets ?? {};
  const library = config.contentLibrary;
  validateContentLibrary(library, { assets, dataSources: config.dataSources ?? {} });
  validateManagedSources(config);
  validateQmdReferences(config);

  const referencedAssetIds = new Set();
  for (const [mediaId, item] of Object.entries(library.mediaItems)) {
    if (item.current.kind === "url") continue;
    if (item.health !== "ready") {
      throw new Error(`Local media item "${mediaId}" is ${item.health} and cannot form a complete package.`);
    }
    if (item.current.kind === "asset") {
      referencedAssetIds.add(item.current.assetId);
      validateAssetPayload(mediaId, item, assets, assetPayloads);
    }
  }

  for (const assetId of Object.keys(assetPayloads)) {
    if (!referencedAssetIds.has(assetId)) {
      throw new Error(`Authored asset payload "${assetId}" is not reachable from a retained media item.`);
    }
  }
  return input;
}

function validateManagedSources(config) {
  const dataSources = config.dataSources ?? {};
  const sourceEntries = config.contentLibrary.sourceEntries;
  const profiles = config.datasetProfiles ?? {};
  for (const [sourceId, source] of Object.entries(dataSources)) {
    const classification = classifyManagedSource(sourceId, source);
    if (classification?.ownership === "builder" && !Object.hasOwn(sourceEntries, sourceId)) {
      throw new Error(`Builder-managed source "${sourceId}" requires a retained SourceEntry.`);
    }
    if (source?.kind === "dataset" && source.type === "uploadedCsv" && typeof source.csvText !== "string") {
      throw new Error(`Managed CSV source "${sourceId}" is missing its package payload.`);
    }
    if (source?.kind === "dataset" && source.type === "uploadedGeoJson") {
      const validation = validateGeoJson(source.geoJson);
      if (!validation.schema.ok || validation.admission?.status === "rejected" || !validation.summary) {
        throw new Error(`Managed GeoJSON source "${sourceId}" is not package-safe.`);
      }
      assertExactKeys(validation.admission.facts, SOURCE_GEOJSON_LIMIT_KEYS, `GeoJSON source "${sourceId}" admission facts`);
      assertExactKeys(validation.summary, GEOJSON_SUMMARY_KEYS, `GeoJSON source "${sourceId}" summary`);
    }
  }
  for (const sourceId of Object.keys(profiles)) {
    const source = dataSources[sourceId];
    const csv = source?.kind === "csv"
      || (source?.kind === "dataset" && source.type === "uploadedCsv");
    if (!csv) throw new Error(`Dataset profile "${sourceId}" must belong to a CSV source.`);
  }
}

function validateQmdReferences(config) {
  const mediaItems = config.contentLibrary.mediaItems;
  for (const source of Object.values(config.dataSources ?? {})) {
    if (source?.kind !== "staticText" || typeof source.qmd !== "string") continue;
    const parsed = parsePortableQmdWithMedia(source.qmd);
    if (parsed.ast === null) continue;
    for (const node of parsed.ast.mediaNodes) {
      const item = mediaItems[node.mediaId];
      if (!item) continue;
      const local = item.current.kind === "asset" || item.current.kind === "package";
      if (local && item.health !== "ready") {
        throw new Error(`QMD media reference "${node.mediaId}" is not ready for portable use.`);
      }
    }
  }
}

function validateAssetPayload(mediaId, item, assets, payloads) {
  const assetId = item.current.assetId;
  const manifest = assets[assetId];
  if (!manifest || manifest.storageState !== "durable") {
    throw new Error(`Local media item "${mediaId}" is missing a durable authored asset manifest.`);
  }
  const payload = payloads[assetId];
  if (!payload) {
    throw new Error(`Content package is missing authored asset payload "${assetId}" for media item "${mediaId}".`);
  }
  const bytes = decodeAssetBase64(payload.base64);
  if (
    payload.byteLength !== bytes.byteLength
    || payload.byteLength !== manifest.byteLength
    || payload.byteLength !== item.byteLength
    || payload.mediaType !== manifest.mediaType
    || payload.mediaType !== item.mediaType
    || payload.sha256 !== manifest.sha256
    || sha256HexSync(bytes) !== manifest.sha256
  ) {
    throw new Error(`Authored asset payload "${assetId}" hash, byte length, or media type does not match its manifest.`);
  }
  let intrinsic;
  let animation;
  try {
    intrinsic = inspectRasterMetadata(bytes);
    animation = inspectImageAnimation(bytes, intrinsic.mediaType);
  } catch (cause) {
    throw new Error(`Authored asset payload "${assetId}" does not match its declared raster media type.`, { cause });
  }
  if (
    intrinsic.mediaType !== payload.mediaType
    || intrinsic.width !== manifest.width
    || intrinsic.height !== manifest.height
    || intrinsic.width !== item.dimensions?.width
    || intrinsic.height !== item.dimensions?.height
  ) {
    throw new Error(`Authored asset payload "${assetId}" intrinsic media type or dimensions do not match its manifest and media item.`);
  }
  if (animation.animated) {
    throw new Error(`Authored asset payload "${assetId}" must be a single-frame image.`);
  }
}

function assertExactKeys(value, expected, description) {
  const keys = Object.keys(record(value, description));
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    throw new Error(`${description} must contain only the canonical lean fields.`);
  }
}

function record(value, description) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${description} must be an object.`);
  }
  return value;
}
