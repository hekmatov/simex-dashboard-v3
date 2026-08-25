import { sha256HexSync } from "./assetPayloadEnvelope.js";

export async function commitDurableStaticPanelTransaction({
  prepared,
  store,
  readSessionAsset,
  discardSessionAsset = () => {},
  commitPrepared,
  transactionId = createTransactionId(),
} = {}) {
  if (prepared?.kind !== "static-panel-transaction") {
    throw new TypeError("A prepared static panel transaction is required.");
  }
  if (!store || typeof store.stage !== "function") {
    throw new TypeError("Durable authored asset storage is required.");
  }
  if (typeof commitPrepared !== "function") {
    throw new TypeError("A prepared dashboard commit function is required.");
  }

  const durablePrepared = structuredClone(prepared);
  const stagedAssetIds = [];
  const declaredStagedAssetIds = new Set(durablePrepared.stagedAssetIds ?? []);
  try {
    for (const [assetId, manifest] of Object.entries(
      durablePrepared.candidateDashboard.assets ?? {},
    ).sort()) {
      if (manifest.storageState !== "staged" || !declaredStagedAssetIds.has(assetId)) continue;
      const sessionAsset = readSessionAsset?.(assetId);
      assertSessionAsset(sessionAsset, assetId, manifest);
      const staged = await store.stage({
        bytes: sessionAsset.bytes,
        mediaType: manifest.mediaType,
        width: manifest.width,
        height: manifest.height,
        transactionId,
      });
      if (staged?.assetId !== assetId) {
        if (staged?.assetId) await store.rollback?.(staged.assetId, { transactionId });
        throw new Error(`Staged Image asset "${assetId}" content identity does not match.`);
      }
      stagedAssetIds.push(assetId);
      durablePrepared.candidateDashboard.assets[assetId] = {
        ...manifest,
        storageState: "durable",
      };
    }
    for (const assetId of stagedAssetIds) {
      await store.verify?.(assetId);
    }
  } catch (error) {
    await rollbackAll(store, stagedAssetIds, transactionId);
    throw error;
  }

  let committed;
  try {
    committed = await commitPrepared(durablePrepared);
  } catch (error) {
    await rollbackAll(store, stagedAssetIds, transactionId);
    throw error;
  }
  try {
    if (typeof store.commitMany === "function") {
      await store.commitMany(stagedAssetIds, { transactionId });
    } else {
      for (const assetId of stagedAssetIds) {
        await store.commit(assetId, { transactionId });
      }
    }
  } catch (error) {
    const wrapped = new Error(error?.message || "Authored asset commit requires recovery.", {
      cause: error,
    });
    wrapped.code = error?.code ?? "AUTHORED_ASSET_COMMIT_RECOVERY_REQUIRED";
    wrapped.dashboardCommitted = true;
    wrapped.committedDashboard = structuredClone(committed.dashboard ?? committed);
    throw wrapped;
  }
  for (const assetId of stagedAssetIds) {
    discardSessionAsset(assetId);
  }
  return committed;
}

function assertSessionAsset(asset, assetId, manifest) {
  const bytes = asset?.bytes instanceof Uint8Array ? asset.bytes : null;
  if (
    !bytes
    || asset.assetId !== assetId
    || asset.mediaType !== manifest.mediaType
    || asset.byteLength !== manifest.byteLength
    || bytes.byteLength !== manifest.byteLength
    || asset.width !== manifest.width
    || asset.height !== manifest.height
    || asset.sha256 !== manifest.sha256
    || sha256HexSync(bytes) !== manifest.sha256
  ) {
    throw new Error(`Staged Image asset "${assetId}" is missing or corrupt.`);
  }
}

async function rollbackAll(store, assetIds, transactionId) {
  for (const assetId of [...assetIds].reverse()) {
    await store.rollback?.(assetId, { transactionId });
  }
}

function createTransactionId() {
  return globalThis.crypto?.randomUUID?.() ?? `static-panel-${Date.now()}`;
}
