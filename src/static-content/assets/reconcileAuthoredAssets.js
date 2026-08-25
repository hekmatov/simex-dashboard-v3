import {
  buildAssetReferenceGraph,
  findAuthoredAssetOrphans,
} from "./assetReferenceGraph.js";

export async function reconcileAuthoredAssets({
  store,
  dashboard = null,
  activeRetainers = null,
  now = Date.now(),
} = {}) {
  if (!store || typeof store.list !== "function" || typeof store.remove !== "function") {
    throw new TypeError("Authored asset reconciliation requires a list/remove store.");
  }
  const graph = buildAssetReferenceGraph({
    dashboard,
    activeRetainers,
  });
  const records = await store.list();
  const saved = new Set(Object.entries(graph.references)
    .filter(([, references]) => references.some(({ kind }) => kind === "saved-manifest" || kind === "saved-media"))
    .map(([assetId]) => assetId));
  const recoveredAssetIds = records
    .filter((record) => record?.status === "staged" && saved.has(record.id))
    .map(({ id }) => id)
    .sort();
  if (recoveredAssetIds.length > 0) {
    if (typeof store.commitMany === "function") {
      await store.commitMany(recoveredAssetIds);
    } else if (typeof store.commit === "function") {
      for (const assetId of recoveredAssetIds) await store.commit(assetId);
    }
  }
  const decisions = findAuthoredAssetOrphans(records, graph, { now });
  const removedAssetIds = [];
  for (const assetId of decisions.deleteAssetIds) {
    await store.remove(assetId);
    removedAssetIds.push(assetId);
  }
  return Object.freeze({
    graph,
    decisions,
    recoveredAssetIds: Object.freeze(recoveredAssetIds),
    removedAssetIds: Object.freeze(removedAssetIds),
  });
}
