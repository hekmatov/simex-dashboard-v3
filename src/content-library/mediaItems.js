import { validateImageOrigin } from "../static-content/image/imageAssetValidation.js";

const ORIGINS = new Set(["uploaded", "packaged", "external", "legacy-import"]);
const HEALTH = new Set(["ready", "external", "missing", "corrupt", "needs-relink", "needs-review"]);
const MEDIA_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export function createMediaItem(input = {}) {
  const item = structuredClone(input);
  delete item.assets;
  validateMediaItem(item, { assets: input.assets });
  return item;
}

export function replaceMediaItemRevision(item, current) {
  validateMediaItem(item);
  validateCurrent(current);
  return {
    ...structuredClone(item),
    revision: item.revision + 1,
    current: structuredClone(current),
    origin: current.kind === "asset" ? "uploaded" : current.kind === "package" ? "packaged" : "external",
    health: current.kind === "url" ? "external" : "ready",
  };
}

export function renameMediaItem(item, { displayName, defaultDescription } = {}) {
  validateMediaItem(item);
  requiredText(displayName, "Media display name");
  if (typeof defaultDescription !== "string") {
    throw new TypeError("Media default description must be a string.");
  }
  return deepFreeze({
    ...structuredClone(item),
    displayName: displayName.trim(),
    defaultDescription,
  });
}

export function validateMediaItem(item, { assets } = {}) {
  record(item, "Media item");
  rejectUnknown(item, [
    "mediaId", "revision", "current", "displayName", "defaultDescription", "origin", "health",
    "dimensions", "byteLength", "mediaType",
  ], "Media item");
  requiredText(item.mediaId, "Media id");
  positiveInteger(item.revision, "Media revision");
  validateCurrent(item.current);
  requiredText(item.displayName, "Media display name");
  if (typeof item.defaultDescription !== "string") {
    throw new TypeError("Media default description must be a string.");
  }
  if (!ORIGINS.has(item.origin)) throw new Error("Media origin is invalid.");
  if (!HEALTH.has(item.health)) throw new Error("Media health is invalid.");
  validateCurrentCoherence(item);
  if (item.dimensions !== undefined) {
    record(item.dimensions, "Media dimensions");
    rejectUnknown(item.dimensions, ["width", "height"], "Media dimensions");
    positiveInteger(item.dimensions.width, "Media width");
    positiveInteger(item.dimensions.height, "Media height");
  }
  if (item.byteLength !== undefined) positiveInteger(item.byteLength, "Media byte length");
  if (item.mediaType !== undefined && !MEDIA_TYPES.has(item.mediaType)) {
    throw new Error("Media type is unsupported.");
  }
  if (
    assets !== undefined
    && item.current.kind === "asset"
    && !Object.hasOwn(assets, item.current.assetId)
    && !["missing", "corrupt", "needs-relink", "needs-review"].includes(item.health)
  ) {
    throw new Error(`Media item references unknown asset "${item.current.assetId}".`);
  }
  const manifest = item.current.kind === "asset"
    ? assets?.[item.current.assetId]
    : undefined;
  if (manifest) validateManifestMetadata(item, manifest);
  return item;
}

function validateCurrentCoherence(item) {
  if (item.current.kind === "url") {
    if (item.origin !== "external") throw new Error("Media URL current source requires external origin.");
    if (item.health !== "external") throw new Error("Media URL current source requires external health.");
    return;
  }
  if (item.health === "external") {
    throw new Error("Media external health requires a URL current source.");
  }
  if (item.current.kind === "package" && item.origin !== "packaged") {
    throw new Error("Media package current source requires packaged origin.");
  }
  if (
    item.current.kind === "asset"
    && !["uploaded", "legacy-import"].includes(item.origin)
  ) {
    throw new Error("Media asset current source requires uploaded or legacy-import origin.");
  }
}

function validateManifestMetadata(item, manifest) {
  if (
    item.dimensions !== undefined
    && manifest.width !== undefined
    && manifest.height !== undefined
    && (
      item.dimensions.width !== manifest.width
      || item.dimensions.height !== manifest.height
    )
  ) {
    throw new Error("Media dimensions must match the authored asset manifest.");
  }
  if (
    item.byteLength !== undefined
    && manifest.byteLength !== undefined
    && item.byteLength !== manifest.byteLength
  ) {
    throw new Error("Media byte length must match the authored asset manifest.");
  }
  if (
    item.mediaType !== undefined
    && manifest.mediaType !== undefined
    && item.mediaType !== manifest.mediaType
  ) {
    throw new Error("Media type must match the authored asset manifest.");
  }
}

function validateCurrent(current) {
  record(current, "Media current source");
  if (current.kind === "asset") {
    rejectUnknown(current, ["kind", "assetId"], "Media current asset source");
    requiredText(current.assetId, "Media current asset id");
  } else if (current.kind === "package") {
    rejectUnknown(current, ["kind", "path"], "Media current package source");
    validateImageOrigin({ kind: "package", path: current.path });
  } else if (current.kind === "url") {
    rejectUnknown(current, ["kind", "url"], "Media current URL source");
    validateImageOrigin({ kind: "url", url: current.url });
  } else {
    throw new Error("Media current source kind is invalid.");
  }
}

function record(value, description) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${description} must be an object.`);
  }
  return value;
}

function rejectUnknown(value, keys, description) {
  const allowed = new Set(keys);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new Error(`${description} property "${key}" is unknown.`);
  }
}

function requiredText(value, description) {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${description} is required.`);
}

function positiveInteger(value, description) {
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`${description} must be a positive integer.`);
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || ArrayBuffer.isView(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
