import { validateMediaItem } from "./mediaItems.js";

const SOURCE_ORIGINS = new Set(["uploaded", "linked-project", "packaged", "legacy-import", "generated"]);
const OWNERSHIP = new Set(["builder", "dashboard"]);
const HEALTH = new Set(["ready", "missing", "corrupt", "needs-relink", "needs-review"]);

export function normalizeContentLibrary(value = {}) {
  record(value, "Content library");
  rejectUnknown(value, ["mediaItems", "sourceEntries"], "Content library");
  const mediaItems = value.mediaItems ?? {};
  const sourceEntries = value.sourceEntries ?? {};
  record(mediaItems, "Content library mediaItems");
  record(sourceEntries, "Content library sourceEntries");
  return {
    mediaItems: structuredClone(mediaItems),
    sourceEntries: structuredClone(sourceEntries),
  };
}

export function validateContentLibrary(value, authorities = {}) {
  const library = normalizeContentLibrary(value);
  for (const [mediaId, item] of Object.entries(library.mediaItems)) {
    validateMediaItem(item, { assets: authorities.assets });
    if (item.mediaId !== mediaId) throw new Error(`MediaItem mediaId "${item.mediaId}" must match key "${mediaId}".`);
  }
  for (const [sourceId, entry] of Object.entries(library.sourceEntries)) {
    validateSourceEntry(entry);
    if (entry.sourceId !== sourceId) throw new Error(`SourceEntry sourceId "${entry.sourceId}" must match key "${sourceId}".`);
    const descriptor = authorities.dataSources?.[sourceId];
    if (!descriptor || !isManagedDescriptor(descriptor)) {
      throw new Error(`SourceEntry "${sourceId}" must derive kind from a CSV or GeoJSON dataSource.`);
    }
  }
  return value;
}

function validateSourceEntry(entry) {
  record(entry, "Source entry");
  rejectUnknown(entry, [
    "sourceId", "origin", "ownership", "displayName", "provenance", "health", "updateStatus",
  ], "Source entry");
  requiredText(entry.sourceId, "Source entry sourceId");
  if (!SOURCE_ORIGINS.has(entry.origin)) throw new Error("Source entry origin is invalid.");
  if (!OWNERSHIP.has(entry.ownership)) throw new Error("Source entry ownership is invalid.");
  requiredText(entry.displayName, "Source entry display name");
  record(entry.provenance, "Source entry provenance");
  if (!HEALTH.has(entry.health)) throw new Error("Source entry health is invalid.");
  if (entry.updateStatus !== undefined && typeof entry.updateStatus !== "string") {
    throw new Error("Source entry updateStatus must be text.");
  }
}

function isManagedDescriptor(value) {
  return value?.kind === "csv" || value?.kind === "geojson"
    || (value?.kind === "dataset" && ["uploadedCsv", "uploadedGeoJson"].includes(value.type));
}

function record(value, description) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${description} must be an object.`);
  return value;
}

function rejectUnknown(value, keys, description) {
  const allowed = new Set(keys);
  for (const key of Object.keys(value)) if (!allowed.has(key)) throw new Error(`${description} property "${key}" is unknown.`);
}

function requiredText(value, description) {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${description} is required.`);
}
