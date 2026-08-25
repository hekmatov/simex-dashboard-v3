import { validateImageOrigin as validateImageOriginContract } from "./image/imageAssetValidation.js";

const STATIC_SOURCE_VERSION = 1;
const PORTABLE_QMD_POLICY = "portable-qmd-v1";
const IMAGE_FITS = new Set(["contain", "cover"]);
const IMAGE_ROTATIONS = new Set([0, 90, 180, 270]);
const IMAGE_MEDIA_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const ASSET_STORAGE_STATES = new Set(["staged", "durable", "missing"]);
const SHA256 = /^[0-9a-f]{64}$/i;
const MIGRATION_WARNINGS = new Set(["legacy-fit-fill", "missing-alt", "replacement-required"]);

export function normalizeStaticSource(source) {
  const value = record(source, "Static source");
  if (value.kind === "staticText") {
    return {
      kind: "staticText",
      sourceVersion: value.sourceVersion ?? STATIC_SOURCE_VERSION,
      revision: value.revision ?? 1,
      renderingPolicy: value.renderingPolicy ?? PORTABLE_QMD_POLICY,
      qmd: value.qmd ?? "",
    };
  }
  if (value.kind === "staticImage") {
    const decorative = value.decorative === true;
    return {
      kind: "staticImage",
      sourceVersion: value.sourceVersion ?? STATIC_SOURCE_VERSION,
      revision: value.revision ?? 1,
      origin: clone(value.origin),
      alt: decorative ? "" : value.alt ?? "",
      decorative,
      fit: value.fit ?? "contain",
      crop: clone(value.crop ?? { x: 0, y: 0, width: 1000, height: 1000 }),
      rotation: value.rotation ?? 0,
      ...(Array.isArray(value.migrationWarnings)
        ? { migrationWarnings: [...value.migrationWarnings] }
        : {}),
    };
  }
  throw new Error(`Unknown static source kind "${String(value.kind)}".`);
}

export function validateStaticSource(source, options = {}) {
  if (source?.kind === "staticText") return validateStaticTextSource(source, options);
  if (source?.kind === "staticImage") return validateStaticImageSource(source, options);
  throw new Error(`Unknown static source kind "${String(source?.kind)}".`);
}

export function validateStaticTextSource(source) {
  const value = record(source, "Static text source");
  validateBase(value, "Static text source");
  if (value.renderingPolicy !== PORTABLE_QMD_POLICY) {
    throw new Error(`Static text rendering policy "${String(value.renderingPolicy)}" is unsupported.`);
  }
  if (typeof value.qmd !== "string") throw new TypeError("Static text QMD source must be a string.");
  return source;
}

export function validateStaticImageSource(source, { assets } = {}) {
  const value = record(source, "Static image source");
  validateBase(value, "Static image source");
  validateImageOriginContract(value.origin);
  if (typeof value.decorative !== "boolean") throw new TypeError("Static image decorative must be boolean.");
  if (typeof value.alt !== "string") throw new TypeError("Static image alternative text must be a string.");
  if (value.decorative && value.alt !== "") {
    throw new Error("A decorative image must store empty alt text.");
  }
  validateMigrationWarnings(value.migrationWarnings);
  if (
    !value.decorative
    && value.alt.trim() === ""
    && !value.migrationWarnings?.includes("missing-alt")
  ) {
    throw new Error("A non-decorative image requires alternative text.");
  }
  if (!IMAGE_FITS.has(value.fit)) throw new Error("Static image fit must be contain or cover.");
  if (!IMAGE_ROTATIONS.has(value.rotation)) throw new Error("Static image rotation must be 0, 90, 180, or 270 degrees.");
  validateCrop(value.crop);
  if (assets !== undefined) {
    validateAuthoredAssetManifest(assets);
    if (value.origin.kind === "asset" && !Object.hasOwn(assets, value.origin.assetId)) {
      throw new Error(`Static image references unknown asset "${value.origin.assetId}".`);
    }
  }
  return source;
}

export function validateAuthoredAssetManifest(assets) {
  const manifest = record(assets, "Authored asset manifest");
  for (const [assetId, rawEntry] of Object.entries(manifest)) {
    requiredText(assetId, "Authored asset id");
    const entry = record(rawEntry, `Authored asset "${assetId}"`);
    const knownKeys = new Set(["mediaType", "byteLength", "width", "height", "sha256", "storageState"]);
    for (const key of Object.keys(entry)) {
      if (!knownKeys.has(key)) throw new Error(`Authored asset "${assetId}" property "${key}" is unknown.`);
    }
    if (!IMAGE_MEDIA_TYPES.has(entry.mediaType)) {
      throw new Error(`Authored asset "${assetId}" media type is unsupported.`);
    }
    positiveInteger(entry.byteLength, `Authored asset "${assetId}" byte length`);
    positiveInteger(entry.width, `Authored asset "${assetId}" width`);
    positiveInteger(entry.height, `Authored asset "${assetId}" height`);
    if (!SHA256.test(entry.sha256 ?? "")) {
      throw new Error(`Authored asset "${assetId}" SHA-256 is invalid.`);
    }
    if (!ASSET_STORAGE_STATES.has(entry.storageState)) {
      throw new Error(`Authored asset "${assetId}" storage state is invalid.`);
    }
  }
  return assets;
}

function validateMigrationWarnings(value) {
  if (value === undefined) return;
  if (!Array.isArray(value) || value.some((entry) => !MIGRATION_WARNINGS.has(entry))) {
    throw new Error("Static image migration warnings are invalid.");
  }
}

function validateBase(source, description) {
  if (source.sourceVersion !== STATIC_SOURCE_VERSION) {
    throw new Error(`${description} source version ${STATIC_SOURCE_VERSION} is required.`);
  }
  positiveInteger(source.revision, `${description} revision`);
}

function validateCrop(crop) {
  const value = record(crop, "Static image crop");
  for (const key of ["x", "y", "width", "height"]) {
    if (!Number.isInteger(value[key])) throw new Error(`Static image crop ${key} must be an integer.`);
  }
  if (
    value.x < 0 || value.x >= 1000
    || value.y < 0 || value.y >= 1000
    || value.width < 1 || value.width > 1000
    || value.height < 1 || value.height > 1000
    || value.x + value.width > 1000
    || value.y + value.height > 1000
  ) {
    throw new Error("Static image crop must stay within the normalized 0–1000 frame.");
  }
}

function record(value, description) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${description} must be an object.`);
  }
  return value;
}

function positiveInteger(value, description) {
  if (!Number.isInteger(value) || value < 1) throw new Error(`${description} must be a positive integer.`);
}

function requiredText(value, description) {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${description} is required.`);
}

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}
