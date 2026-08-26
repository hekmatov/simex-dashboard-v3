const SOURCE_ORIGINS = new Set(["uploaded", "linked-project", "packaged", "legacy-import", "generated"]);
const SOURCE_OWNERS = new Set(["builder", "dashboard"]);
const SOURCE_HEALTH = new Set(["ready", "missing", "corrupt", "needs-relink", "needs-review"]);

export function createUploadedCsvSourceEntry({ sourceId, displayName, fileName, fingerprint } = {}) {
  const normalizedSourceId = requiredText(sourceId, "Source entry sourceId");
  const entry = {
    sourceId: normalizedSourceId,
    origin: "uploaded",
    ownership: "builder",
    displayName: requiredText(displayName, "Source entry display name"),
    provenance: {
      fileName: requiredText(fileName, "Uploaded CSV file name"),
      profileFingerprint: requiredText(fingerprint, "Uploaded CSV profile fingerprint"),
    },
    health: "ready",
  };
  validateSourceEntry(entry, {
    sourceId: normalizedSourceId,
    descriptor: { kind: "dataset", type: "uploadedCsv", fileName },
  });
  return deepFreeze(entry);
}

export function buildCsvContentDraft({
  owner,
  sourceId,
  source,
  profile,
  displayName,
  finalized = null,
  destination = null,
} = {}) {
  const normalizedOwner = requiredText(owner, "CSV draft owner");
  if (!new Set(["manager", "chart"]).has(normalizedOwner)) throw new Error('CSV draft owner must be "manager" or "chart".');
  const normalizedSourceId = requiredText(sourceId, "CSV source id");
  record(source, "CSV source descriptor");
  if (source.kind !== "dataset" || source.type !== "uploadedCsv" || typeof source.csvText !== "string") {
    throw new Error("CSV draft requires the existing uploadedCsv descriptor shape.");
  }
  record(profile, "CSV dataset profile");
  if (!Array.isArray(profile.columns) || !Number.isSafeInteger(profile.rowCount)) throw new Error("CSV draft requires a complete dataset profile.");
  if (normalizedOwner === "chart" && finalized !== null) record(finalized.chart, "Finalized chart CSV content");
  const entry = createUploadedCsvSourceEntry({ sourceId: normalizedSourceId, displayName, fileName: source.fileName, fingerprint: profile.fingerprint });
  const payload = normalizedOwner === "chart"
    ? { finalized, sourceId: normalizedSourceId, source: structuredClone(source), profile: structuredClone(profile), entry, destination: structuredClone(destination) }
    : { sourceId: normalizedSourceId, source: structuredClone(source), profile: structuredClone(profile), entry };
  const draftId = `${normalizedOwner}-csv-${normalizedSourceId}`;
  return {
    draftId,
    owner: normalizedOwner,
    kind: normalizedOwner === "manager" ? "manager-csv-add" : "chart-csv-add",
    payload,
    assetIds: [],
    mediaIds: [],
    sourceIds: [normalizedSourceId],
    entry,
    source: structuredClone(source),
    profile: structuredClone(profile),
    buildCandidate({ dashboard, draft }) {
      const currentPayload = draft?.payload ?? payload;
      const next = structuredClone(dashboard);
      next.dataSources ??= {};
      next.datasetProfiles ??= {};
      next.contentLibrary ??= { mediaItems: {}, sourceEntries: {} };
      next.contentLibrary.sourceEntries ??= {};
      if (Object.hasOwn(next.dataSources, normalizedSourceId) || Object.hasOwn(next.contentLibrary.sourceEntries, normalizedSourceId)) {
        throw new Error(`Data source "${normalizedSourceId}" already exists.`);
      }
      next.dataSources[normalizedSourceId] = structuredClone(currentPayload.source);
      next.datasetProfiles[normalizedSourceId] = structuredClone(currentPayload.profile);
      next.contentLibrary.sourceEntries[normalizedSourceId] = structuredClone(currentPayload.entry);
      const candidate = normalizedOwner === "chart"
        ? integrateChartWithoutDuplicateSource(next, currentPayload.finalized, currentPayload.destination)
        : next;
      return { dashboard: candidate, commitAssetIds: [], discardAssetIds: [], itemIds: [normalizedSourceId] };
    },
  };
}

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

function integrateChartWithoutDuplicateSource(dashboard, finalized, destination) {
  record(finalized?.chart, "Finalized chart CSV content");
  record(destination, "Chart CSV destination");
  const next = structuredClone(dashboard);
  const page = next.pages?.find(({ id }) => id === destination.pageId);
  const section = page?.sections?.find(({ id }) => id === destination.sectionId);
  if (!section) throw new Error("The selected chart destination no longer exists.");
  const relation = destination.placement?.relation ?? destination.relation ?? "append";
  const chart = structuredClone(finalized.chart);
  if (relation === "append") {
    section.panels.push(chart);
  } else if (relation === "before" || relation === "after") {
    const anchorId = destination.placement?.anchorId ?? destination.anchorId;
    const anchorIndex = section.panels.findIndex((panel) => (panel.chart ?? panel).id === anchorId);
    if (anchorIndex < 0) throw new Error("The reviewed chart placement anchor no longer exists.");
    section.panels.splice(relation === "before" ? anchorIndex : anchorIndex + 1, 0, chart);
  } else {
    throw new Error(`Unsupported chart placement relation "${String(relation)}".`);
  }
  if (finalized.chronoGroups !== undefined) next.chronoGroups = structuredClone(finalized.chronoGroups);
  return next;
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
