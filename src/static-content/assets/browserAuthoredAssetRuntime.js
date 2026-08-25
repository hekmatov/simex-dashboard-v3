import { createBrowserAuthoredAssetStore } from "./browserAuthoredAssetStore.js";
import { resolveSessionImageAsset } from "../image/imageAssetValidation.js";

const RUNTIME_STORE_KEY = Symbol.for("simex.browser-authored-asset-store");

export const browserAuthoredAssetStore = globalThis[RUNTIME_STORE_KEY]
  ?? createBrowserAuthoredAssetStore();
globalThis[RUNTIME_STORE_KEY] = browserAuthoredAssetStore;

export async function resolveBrowserAuthoredAsset(assetId) {
  const sessionAsset = resolveSessionImageAsset(assetId);
  if (sessionAsset) return sessionAsset;
  return browserAuthoredAssetStore.createObjectUrlLease(assetId);
}
