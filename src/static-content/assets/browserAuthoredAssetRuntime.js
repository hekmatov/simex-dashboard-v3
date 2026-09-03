import { createBrowserAuthoredAssetStore } from "./browserAuthoredAssetStore.js";
import { resolveSessionImageAsset } from "../image/imageAssetValidation.js";

const RUNTIME_STORE_KEY = Symbol.for("simex.browser-authored-asset-store");

export const browserAuthoredAssetStore = globalThis[RUNTIME_STORE_KEY]
  ?? createBrowserAuthoredAssetStore();
globalThis[RUNTIME_STORE_KEY] = browserAuthoredAssetStore;

export async function resolveBrowserAuthoredAsset(assetId, manifestEntry) {
  return resolveBrowserAuthoredAssetFromSources(assetId, manifestEntry, {
    resolveSessionAsset: resolveSessionImageAsset,
    createObjectUrlLease: (id) => browserAuthoredAssetStore.createObjectUrlLease(id),
  });
}

export async function resolveBrowserAuthoredAssetFromSources(assetId, manifestEntry, {
  resolveSessionAsset,
  createObjectUrlLease,
} = {}) {
  if (typeof resolveSessionAsset !== "function" || typeof createObjectUrlLease !== "function") {
    throw new TypeError("Authored asset resolution sources are required.");
  }
  if (manifestEntry?.storageState === "durable") {
    return createObjectUrlLease(assetId);
  }
  if (manifestEntry?.storageState !== "staged") {
    try {
      return await createObjectUrlLease(assetId);
    } catch (error) {
      const sessionAsset = resolveSessionAsset(assetId);
      if (sessionAsset) return sessionAsset;
      throw error;
    }
  }
  const sessionAsset = resolveSessionAsset(assetId);
  if (sessionAsset) return sessionAsset;
  return createObjectUrlLease(assetId);
}
