import { decodeAssetBase64 } from "../static-content/assets/assetPayloadEnvelope.js";
import { validateContentPackage } from "../content-library/contentPackageValidation.js";
import { DASHBOARD_CONFIG_STRUCTURE } from "../charting/config/dashboardConfigStructure.js";

export async function commitDashboardPackageImport({
  candidate,
  prepare,
  validateAsset = async () => {},
  stageAsset,
  preflightAsset = async () => {},
  rollbackAsset = async () => {},
  commitAsset = async () => {},
  commitAssets = null,
  snapshotAssets = null,
  restoreAssets = null,
  snapshotDashboard = null,
  restoreDashboard = null,
  replace,
  rebase,
  transactionId = createImportTransactionId(),
}) {
  if (candidate?.config?.configVersion === DASHBOARD_CONFIG_STRUCTURE.version) {
    validateContentPackage(candidate);
  }
  await prepare();
  const payloadEntries = Object.entries(candidate.assetPayloads ?? {}).sort();
  if (payloadEntries.length > 1 && typeof commitAssets !== "function") {
    throw new Error("Dashboard package import requires an atomic authored asset commit boundary.");
  }
  if (typeof snapshotDashboard !== "function" || typeof restoreDashboard !== "function") {
    throw new Error("Dashboard package import requires a compensatable dashboard boundary.");
  }
  if (payloadEntries.length > 0 && (
    typeof snapshotAssets !== "function"
    || typeof restoreAssets !== "function"
  )) {
    throw new Error("Dashboard package import requires a compensatable authored asset boundary.");
  }
  const assetIds = payloadEntries.map(([assetId]) => assetId);
  const assetSnapshot = payloadEntries.length > 0 ? await snapshotAssets(assetIds) : null;
  const previousDashboard = await snapshotDashboard();
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
    await compensateAssetsOrThrow({
      error,
      stagedAssetIds,
      rollbackAsset,
      restoreAssets,
      assetSnapshot,
      transactionId,
    });
    throw error;
  }

  try {
    if (stagedAssetIds.length > 0) {
      if (typeof commitAssets === "function") {
        await commitAssets(stagedAssetIds, { transactionId });
      } else {
        for (const assetId of stagedAssetIds) {
          await commitAsset(assetId, { transactionId });
        }
      }
    }
  } catch (error) {
    await compensateAssetsOrThrow({
      error,
      stagedAssetIds,
      rollbackAsset,
      restoreAssets,
      assetSnapshot,
      transactionId,
    });
    throw error;
  }

  let committed;
  try {
    committed = await replace(candidate.config);
    rebase(committed);
  } catch (error) {
    const restorationFailures = [];
    try {
      const restored = await restoreDashboard(previousDashboard);
      if (committed !== undefined) rebase(restored ?? previousDashboard);
    } catch (restoreError) {
      restorationFailures.push(restoreError);
    }
    if (payloadEntries.length > 0) {
      try {
        await compensateAssetsOrThrow({
          error,
          stagedAssetIds,
          rollbackAsset,
          restoreAssets,
          assetSnapshot,
          transactionId,
        });
      } catch (restoreError) {
        restorationFailures.push(restoreError);
      }
    }
    if (restorationFailures.length > 0) {
      throw new AggregateError(
        [error, ...restorationFailures],
        "Dashboard package import could not restore the prior dashboard and authored asset store.",
      );
    }
    throw error;
  }
  return committed;
}

async function compensateAssetsOrThrow({
  error,
  stagedAssetIds,
  rollbackAsset,
  restoreAssets,
  assetSnapshot,
  transactionId,
}) {
  const failures = [];
  await rollbackStagedAssets(stagedAssetIds, rollbackAsset, transactionId, failures);
  if (typeof restoreAssets === "function") {
    try {
      await restoreAssets(assetSnapshot);
    } catch (restoreError) {
      failures.push(restoreError);
    }
  }
  if (failures.length > 0) {
    throw new AggregateError(
      [error, ...failures],
      "Dashboard package import could not restore the prior authored asset store.",
    );
  }
}

async function rollbackStagedAssets(assetIds, rollbackAsset, transactionId, failures = []) {
  for (const assetId of [...assetIds].reverse()) {
    try {
      await rollbackAsset(assetId, { transactionId });
    } catch (error) {
      failures.push(error);
    }
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
