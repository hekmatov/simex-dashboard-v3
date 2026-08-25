export const AUTHORED_ASSET_STAGING_GRACE_MS = 24 * 60 * 60 * 1_000;

export function buildAssetReferenceGraph({
  dashboard = null,
  activeRetainers = null,
} = {}) {
  const references = new Map();
  for (const assetId of Object.keys(dashboard?.assets ?? {})) {
    addReference(references, assetId, { kind: "saved-manifest" });
  }
  for (const [mediaId, item] of Object.entries(dashboard?.contentLibrary?.mediaItems ?? {})) {
    if (item?.current?.kind === "asset") {
      addReference(references, item.current.assetId, { kind: "saved-media", mediaId });
    }
  }
  addReferences(references, activeRetainers?.assetIds, "active-retainer");
  const referencedAssetIds = [...references.keys()].sort();
  return Object.freeze({
    referencedAssetIds: Object.freeze(referencedAssetIds),
    references: Object.freeze(Object.fromEntries(referencedAssetIds.map((assetId) => [
      assetId,
      Object.freeze(references.get(assetId).map((entry) => Object.freeze(entry))),
    ]))),
  });
}

export function findAuthoredAssetOrphans(records, graph, {
  now = Date.now(),
  stagingGraceMs = AUTHORED_ASSET_STAGING_GRACE_MS,
} = {}) {
  const referenced = new Set(graph?.referencedAssetIds ?? []);
  const deleteAssetIds = [];
  const retainedReferencedAssetIds = [];
  const retainedGraceAssetIds = [];
  for (const record of [...(records ?? [])].sort((left, right) => (
    String(left?.id).localeCompare(String(right?.id))
  ))) {
    const assetId = record?.id;
    if (typeof assetId !== "string" || assetId === "") continue;
    if (referenced.has(assetId)) {
      retainedReferencedAssetIds.push(assetId);
      continue;
    }
    if (
      record.status === "staged"
      && Number.isFinite(record.stagedAt)
      && (now - record.stagedAt) < stagingGraceMs
    ) {
      retainedGraceAssetIds.push(assetId);
      continue;
    }
    deleteAssetIds.push(assetId);
  }
  return Object.freeze({
    deleteAssetIds: Object.freeze(deleteAssetIds),
    retainedReferencedAssetIds: Object.freeze(retainedReferencedAssetIds),
    retainedGraceAssetIds: Object.freeze(retainedGraceAssetIds),
  });
}

function addReferences(references, assetIds, kind) {
  for (const assetId of assetIds ?? []) addReference(references, assetId, { kind });
}

function addReference(references, assetId, reference) {
  if (typeof assetId !== "string" || assetId.trim() === "") return;
  const normalized = assetId.trim();
  const current = references.get(normalized) ?? [];
  current.push(reference);
  references.set(normalized, current);
}
