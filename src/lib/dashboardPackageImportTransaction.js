import { decodeAssetBase64 } from "../static-content/assets/assetPayloadEnvelope.js";

export async function commitDashboardPackageImport({
  candidate,
  prepare,
  validateAsset = async () => {},
  stageAsset,
  rollbackAsset = async () => {},
  commitAsset = async () => {},
  replace,
  rebase,
  transactionId = createImportTransactionId(),
}) {
  await prepare();
  const stagedAssetIds = [];
  try {
    for (const [assetId, payload] of Object.entries(candidate.assetPayloads ?? {}).sort()) {
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
  for (const assetId of stagedAssetIds) {
    await commitAsset(assetId, { transactionId });
  }
  rebase(committed);
  return committed;
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
