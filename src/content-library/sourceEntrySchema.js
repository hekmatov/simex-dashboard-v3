const SOURCE_ORIGINS = new Set(["uploaded", "linked-project", "packaged", "legacy-import", "generated"]);
const SOURCE_OWNERS = new Set(["builder", "dashboard"]);
const SOURCE_HEALTH = new Set(["ready", "missing", "corrupt", "needs-relink", "needs-review"]);

export function classifyManagedSource(sourceId, descriptor) {
  requiredText(sourceId, "Managed source id");
  const kind = descriptorKind(descriptor);
  if (kind === null) return null;
  const dashboardOwned = descriptor?.provenance?.ownership === "dashboard"
    || descriptor?.provenance?.generated === true;
  const classification = {
    kind,
    origin: dashboardOwned ? "generated" : descriptorOrigin(descriptor),
    ownership: dashboardOwned ? "dashboard" : "builder",
    manageable: !dashboardOwned,
  };
  return Object.freeze(classification);
}

export function validateSourceEntry(entry, context = {}) {
  record(entry, "Source entry");
  rejectUnknown(entry, [
    "sourceId", "origin", "ownership", "displayName", "provenance", "health", "updateStatus",
  ], "Source entry");
  requiredText(entry.sourceId, "Source entry sourceId");
  if (!SOURCE_ORIGINS.has(entry.origin)) throw new Error("Source entry origin is invalid.");
  if (!SOURCE_OWNERS.has(entry.ownership)) throw new Error("Source entry ownership is invalid.");
  requiredText(entry.displayName, "Source entry display name");
  record(entry.provenance, "Source entry provenance");
  if (!SOURCE_HEALTH.has(entry.health)) throw new Error("Source entry health is invalid.");
  if (entry.updateStatus !== undefined && typeof entry.updateStatus !== "string") {
    throw new Error("Source entry updateStatus must be text.");
  }
  if (context.sourceId !== undefined && entry.sourceId !== context.sourceId) {
    throw new Error(`Source entry sourceId "${entry.sourceId}" must match key "${context.sourceId}".`);
  }
  if (context.descriptor !== undefined) {
    const classification = classifyManagedSource(entry.sourceId, context.descriptor);
    if (classification === null) throw new Error("Source entry requires a CSV or GeoJSON descriptor.");
    if (entry.ownership === "dashboard" && classification.ownership !== "dashboard") {
      throw new Error("Dashboard source ownership requires trusted explicit provenance.");
    }
    if (entry.origin === "generated" && classification.origin !== "generated") {
      throw new Error("Generated source origin requires trusted explicit provenance.");
    }
  }
  return entry;
}

export function renameSourceEntry(entry, displayName) {
  validateSourceEntry(entry);
  requiredText(displayName, "Source entry display name");
  return deepFreeze({
    ...structuredClone(entry),
    displayName: displayName.trim(),
  });
}

export function listManageableSourceEntries(library, dataSources) {
  record(library ?? {}, "Content library");
  record(dataSources ?? {}, "Data sources");
  const entries = [];
  for (const sourceId of Object.keys(library?.sourceEntries ?? {}).sort()) {
    const entry = library.sourceEntries[sourceId];
    const descriptor = dataSources[sourceId];
    const classification = descriptor ? classifyManagedSource(sourceId, descriptor) : null;
    if (!classification?.manageable || entry?.ownership !== "builder") continue;
    validateSourceEntry(entry, { sourceId, descriptor });
    entries.push(deepFreeze({ ...structuredClone(entry), kind: classification.kind }));
  }
  return Object.freeze(entries);
}

function descriptorKind(descriptor) {
  if (descriptor?.kind === "csv") return "csv";
  if (descriptor?.kind === "geojson") return "geojson";
  if (descriptor?.kind === "dataset" && descriptor.type === "uploadedCsv") return "csv";
  if (descriptor?.kind === "dataset" && descriptor.type === "uploadedGeoJson") return "geojson";
  return null;
}

function descriptorOrigin(descriptor) {
  if (SOURCE_ORIGINS.has(descriptor?.origin) && descriptor.origin !== "generated") {
    return descriptor.origin;
  }
  if (descriptor?.browserAssetId) return "uploaded";
  if (["csv", "geojson"].includes(descriptor?.kind)) return "linked-project";
  return "packaged";
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
  return value.trim();
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || ArrayBuffer.isView(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
