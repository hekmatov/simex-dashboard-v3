import { activeRetentions, csvDependencies, geoJsonDependencies, mediaDependencies } from "./contentDependencyGraph.js";

export function prepareContentDeletion({ dashboard, graph, item } = {}) {
  const kind = normalizedKind(item?.kind);
  const itemId = requiredText(item?.id, "Content item id");
  const record = recordFor(dashboard, kind, itemId);
  if (!record) throw new Error(`Unknown ${kind} content item "${itemId}".`);
  const directUses = kind === "media" ? mediaDependencies(graph, itemId) : kind === "csv" ? csvDependencies(graph, itemId) : geoJsonDependencies(graph, itemId);
  const retainers = activeRetentions(graph, { kind, id: itemId });
  return deepFreeze({
    status: directUses.length > 0 || retainers.length > 0 ? "blocked" : "ready",
    item: { kind, id: itemId },
    directUses: [...directUses], retainers: [...retainers],
    expectedIdentity: identityFor(kind, itemId, record),
    expectedRevision: revisionFor(record),
  });
}

export async function commitContentDeletion(plan, adapters = {}) {
  if (plan?.status !== "ready") throw new Error("A ready deletion plan is required.");
  if (typeof adapters.getDashboard !== "function" || typeof adapters.commitDashboard !== "function") throw new TypeError("Deletion adapters require getDashboard and commitDashboard.");
  const previous = structuredClone(await adapters.getDashboard());
  assertCurrent(plan, previous);
  const candidate = deleteCandidate(previous, plan.item);
  const transactionId = `content-delete:${plan.item.kind}:${plan.item.id}`;
  const authoritySnapshot = await adapters.snapshotAuthority?.(plan, previous);
  let wroteDashboard = false;
  try {
    await adapters.commitDashboard(candidate, { transactionId });
    wroteDashboard = true;
    await adapters.deleteAuthority?.(plan, { dashboard: candidate, transactionId });
    return deepFreeze({ status: "committed", item: plan.item, dashboard: candidate });
  } catch (error) {
    const rollbackErrors = [];
    const current = await adapters.getDashboard();
    if (wroteDashboard || JSON.stringify(current) !== JSON.stringify(previous)) {
      try { await adapters.commitDashboard(previous, { transactionId, rollback: true }); } catch (rollbackError) { rollbackErrors.push(rollbackError); }
    }
    if (typeof adapters.restoreAuthority === "function") {
      try { await adapters.restoreAuthority(authoritySnapshot, plan, { transactionId, rollback: true }); } catch (rollbackError) { rollbackErrors.push(rollbackError); }
    }
    if (rollbackErrors.length > 0) throw new AggregateError([error, ...rollbackErrors], "Content deletion failed and rollback did not complete.");
    throw error;
  }
}

function deleteCandidate(dashboard, item) {
  const next = structuredClone(dashboard);
  if (item.kind === "media") {
    const current = next.contentLibrary.mediaItems[item.id];
    delete next.contentLibrary.mediaItems[item.id];
    const assetId = current?.current?.kind === "asset" ? current.current.assetId : null;
    if (assetId && !Object.values(next.contentLibrary.mediaItems).some((record) => record?.current?.kind === "asset" && record.current.assetId === assetId)) delete next.assets?.[assetId];
  } else {
    delete next.contentLibrary.sourceEntries[item.id];
    delete next.dataSources?.[item.id];
    delete next.datasetProfiles?.[item.id];
  }
  return next;
}

function assertCurrent(plan, dashboard) {
  const record = recordFor(dashboard, plan.item.kind, plan.item.id);
  if (!record || identityFor(plan.item.kind, plan.item.id, record) !== plan.expectedIdentity || revisionFor(record) !== plan.expectedRevision) throw new Error("Content deletion plan is stale; the item identity or revision changed.");
}
function recordFor(dashboard, kind, id) { return kind === "media" ? dashboard?.contentLibrary?.mediaItems?.[id] : dashboard?.contentLibrary?.sourceEntries?.[id]; }
function identityFor(kind, id, record) { return `${kind}:${id}:${String(kind === "media" ? record.mediaId ?? "" : record.sourceId ?? "")}:${JSON.stringify(record.current ?? null)}`; }
function revisionFor(record) { return Number.isSafeInteger(record?.revision) ? record.revision : null; }
function normalizedKind(value) { const kind = String(value ?? "").toLocaleLowerCase(); if (!["media", "csv", "geojson"].includes(kind)) throw new TypeError("Content item kind must be media, csv, or geojson."); return kind; }
function requiredText(value, description) { if (typeof value !== "string" || !value.trim()) throw new TypeError(`${description} is required.`); return value.trim(); }
function deepFreeze(value) { if (!value || typeof value !== "object") return value; for (const child of Object.values(value)) deepFreeze(child); return Object.freeze(value); }
