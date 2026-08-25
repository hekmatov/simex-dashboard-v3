import { decodeAssetBase64 } from "../static-content/assets/assetPayloadEnvelope.js";

export async function commitDashboardPackageImport({
  candidate,
  prepare,
  validateAsset = async () => {},
  stageAsset,
  preflightAsset = async () => {},
  rollbackAsset = async () => {},
  commitAsset = async () => {},
  commitAssets = null,
  replace,
  rebase,
  transactionId = createImportTransactionId(),
}) {
  await prepare();
  const payloadEntries = Object.entries(candidate.assetPayloads ?? {}).sort();
  if (payloadEntries.length > 1 && typeof commitAssets !== "function") {
    throw new Error("Dashboard package import requires an atomic authored asset commit boundary.");
  }
  const stagedAssetIds = [];
  try {
    for (const [assetId, payload] of payloadEntries) {
      if (typeof stageAsset !== "function") {
        throw new Error("Dashboard package import requires authored asset storage.");
      }
      const manifest = candidate.config.assets?.[assetId];
      if (!manifest) throw new Error(`Imported authored asset "${assetId}" has no manifest entry.`);
      const bytes = decodeAssetBase64(payload.base64);
      await validateAsset({ assetId, bytes, payload, manifest });
      const staged = await stageAsset({
        assetId,
        bytes,
        mediaType: payload.mediaType,
        width: manifest.width,
        height: manifest.height,
        sha256: payload.sha256,
        transactionId,
      });
      if (staged?.assetId !== assetId) {
        throw new Error(`Imported authored asset "${assetId}" content identity does not match.`);
      }
      stagedAssetIds.push(assetId);
    }
    for (const assetId of stagedAssetIds) {
      await preflightAsset(assetId, { transactionId });
    }
  } catch (error) {
    await rollbackStagedAssets(stagedAssetIds, rollbackAsset, transactionId);
    throw error;
  }

  let committed;
  try {
    committed = await replace(candidate.config);
  } catch (error) {
    await rollbackStagedAssets(stagedAssetIds, rollbackAsset, transactionId);
    throw error;
  }
  try {
    if (typeof commitAssets === "function") {
      await commitAssets(stagedAssetIds, { transactionId });
    } else {
      for (const assetId of stagedAssetIds) {
        await commitAsset(assetId, { transactionId });
      }
    }
    rebase(committed);
  } catch (error) {
    try {
      rebase(committed);
    } catch {
      // The persisted dashboard remains authoritative even if UI rebasing also fails.
    }
    throw dashboardCommittedError(error, committed);
  }
  return committed;
}

function dashboardCommittedError(error, committed) {
  const wrapped = new Error(
    error?.message || "Dashboard replacement committed, but authored assets remain staged for recovery.",
    { cause: error },
  );
  wrapped.code = error?.code ?? "AUTHORED_ASSET_COMMIT_RECOVERY_REQUIRED";
  wrapped.dashboardCommitted = true;
  wrapped.committedDashboard = structuredClone(committed);
  return wrapped;
}

async function rollbackStagedAssets(assetIds, rollbackAsset, transactionId) {
  for (const assetId of [...assetIds].reverse()) {
    await rollbackAsset(assetId, { transactionId });
  }
}

function createImportTransactionId() {
  return globalThis.crypto?.randomUUID?.() ?? `dashboard-import-${Date.now()}`;
}

export function createImportedRendererDraftState(dashboard) {
  return {
    dashboardDraft: {
      programLabel: dashboard?.programLabel ?? "",
      scenarioLabel: dashboard?.scenarioLabel ?? "",
      lastUpdated: dashboard?.lastUpdated ?? "",
    },
    pageDrafts: {},
    sectionDrafts: {},
  };
}
