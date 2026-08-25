import {
  buildAssetReferenceGraph,
  findAuthoredAssetOrphans,
} from "./assetReferenceGraph.js";

export async function reconcileAuthoredAssets({
  store,
  dashboard = null,
  draftAssetIds = [],
  undoAssetIds = [],
  transactionAssetIds = [],
  now = Date.now(),
} = {}) {
  if (!store || typeof store.list !== "function" || typeof store.remove !== "function") {
    throw new TypeError("Authored asset reconciliation requires a list/remove store.");
  }
  const graph = buildAssetReferenceGraph({
    dashboard,
    draftAssetIds,
    undoAssetIds,
    transactionAssetIds,
  });
  const decisions = findAuthoredAssetOrphans(await store.list(), graph, { now });
  const removedAssetIds = [];
  for (const assetId of decisions.deleteAssetIds) {
    await store.remove(assetId);
    removedAssetIds.push(assetId);
  }
  return Object.freeze({
    graph,
    decisions,
    removedAssetIds: Object.freeze(removedAssetIds),
  });
}
