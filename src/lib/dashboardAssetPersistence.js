import { normalizeStoredDashboardConfig } from "../charting/config/dashboardBundleV3.js";

const DATABASE_NAME = "simex-dashboard-source-assets";
const STORE_NAME = "assets";
const DATABASE_VERSION = 1;
const ASSET_REFERENCE_PREFIX = "simex-browser-asset://";

export function createBrowserDashboardAssetStore({ indexedDB = globalThis.indexedDB } = {}) {
  let databasePromise = null;
  const database = () => {
    if (databasePromise === null) {
      databasePromise = openAssetDatabase(indexedDB).catch((error) => {
        databasePromise = null;
        throw error;
      });
    }
    return databasePromise;
  };
  return Object.freeze({
    async get(id) {
      const db = await database();
      return runRequest(db, "readonly", (store) => store.get(id));
    },
    async put(asset) {
      const db = await database();
      await runRequest(db, "readwrite", (store) => store.put(asset));
      return asset;
    },
    async remove(id) {
      const db = await database();
      await runRequest(db, "readwrite", (store) => store.delete(id));
    },
  });
}

export function createDashboardAssetPersistence({
  store = createBrowserDashboardAssetStore(),
  digest = digestText,
} = {}) {
  const knownAssetIds = new Set();

  return Object.freeze({
    async prepare(dashboard) {
      const storageConfig = structuredClone(dashboard);
      const runtimeConfig = structuredClone(dashboard);
      const createdAssetIds = [];
      try {
        for (const [sourceId, source] of Object.entries(dashboard?.dataSources ?? {})) {
          const storedSource = storageConfig.dataSources[sourceId];
          const runtimeSource = runtimeConfig.dataSources[sourceId];
          if (source?.kind === "dataset" && source.type === "uploadedCsv") {
            const assetId = await stagePayload({
              payloadKind: "csvText",
              payload: source.csvText,
              currentAssetId: source.browserAssetId,
              createdAssetIds,
            });
            runtimeSource.browserAssetId = assetId;
            storedSource.browserAssetId = assetId;
            delete storedSource.csvText;
            continue;
          }
          if (source?.kind === "dataset" && source.type === "uploadedGeoJson") {
            const assetId = await stagePayload({
              payloadKind: "geoJson",
              payload: source.geoJson,
              currentAssetId: source.browserAssetId,
              createdAssetIds,
            });
            runtimeSource.browserAssetId = assetId;
            storedSource.browserAssetId = assetId;
            delete storedSource.geoJson;
            continue;
          }
          if (source?.kind !== "inline" || !Array.isArray(source.rows)) continue;
          delete storedSource.browserImageAssetIds;
          for (const [rowIndex, row] of source.rows.entries()) {
            if (!isEmbeddedImage(row?.src)) continue;
            const assetId = await stagePayload({
              payloadKind: "imageDataUrl",
              payload: row.src,
              currentAssetId: source.browserImageAssetIds?.[rowIndex],
              createdAssetIds,
            });
            runtimeSource.browserImageAssetIds = {
              ...(runtimeSource.browserImageAssetIds ?? {}),
              [rowIndex]: assetId,
            };
            storageConfig.dataSources[sourceId].rows[rowIndex].src = assetReference(assetId);
            delete storageConfig.dataSources[sourceId].rows[rowIndex].browserAssetId;
          }
        }
        return {
          storageConfig,
          runtimeConfig,
          createdAssetIds: [...createdAssetIds],
          rollback: () => removeCreatedAssets(createdAssetIds),
        };
      } catch (error) {
        await removeCreatedAssets(createdAssetIds);
        throw normalizeDashboardAssetStorageError(error);
      }
    },

    async hydrate(dashboard) {
      const hydrated = structuredClone(dashboard);
      try {
        for (const [sourceId, source] of Object.entries(hydrated?.dataSources ?? {})) {
          if (
            source?.kind === "dataset"
            && source.type === "uploadedCsv"
            && typeof source.csvText !== "string"
            && source.browserAssetId
          ) {
            source.csvText = await readPayload(source.browserAssetId, "csvText");
          } else if (
            source?.kind === "dataset"
            && source.type === "uploadedGeoJson"
            && source.geoJson === undefined
            && source.browserAssetId
          ) {
            source.geoJson = await readPayload(source.browserAssetId, "geoJson");
          }
          if (source?.kind !== "inline" || !Array.isArray(source.rows)) continue;
          const imageAssetIds = {};
          for (const [rowIndex, row] of source.rows.entries()) {
            const assetId = referencedAssetId(row?.src);
            if (!assetId) continue;
            row.src = await readPayload(assetId, "imageDataUrl");
            imageAssetIds[rowIndex] = assetId;
            delete row.browserAssetId;
          }
          if (Object.keys(imageAssetIds).length > 0) {
            source.browserImageAssetIds = imageAssetIds;
          }
        }
        return hydrated;
      } catch (error) {
        throw normalizeDashboardAssetStorageError(error);
      }
    },
  });

  async function stagePayload({
    payloadKind,
    payload,
    currentAssetId,
    createdAssetIds,
  }) {
    if (currentAssetId && knownAssetIds.has(currentAssetId)) return currentAssetId;
    if (payload === undefined) {
      throw new Error(`Dashboard ${payloadKind} asset payload is missing.`);
    }
    const serialized = payloadKind === "geoJson"
      ? stableStringify(payload)
      : String(payload);
    const assetId = `sha256-${await digest(`${payloadKind}\u0000${serialized}`)}`;
    if (knownAssetIds.has(assetId)) return assetId;
    const existing = await store.get(assetId);
    if (existing === null) {
      await store.put({
        id: assetId,
        schemaVersion: 1,
        payloadKind,
        payload: structuredClone(payload),
      });
      createdAssetIds.push(assetId);
    } else if (existing.payloadKind !== payloadKind) {
      throw new Error(`Stored dashboard asset "${assetId}" has the wrong payload type.`);
    }
    knownAssetIds.add(assetId);
    return assetId;
  }

  async function readPayload(assetId, payloadKind) {
    const asset = await store.get(assetId);
    if (!asset) {
      throw new Error(`Stored dashboard asset "${assetId}" is missing.`);
    }
    if (asset.payloadKind !== payloadKind) {
      throw new Error(`Stored dashboard asset "${assetId}" has the wrong payload type.`);
    }
    knownAssetIds.add(assetId);
    return structuredClone(asset.payload);
  }

  async function removeCreatedAssets(assetIds) {
    for (const assetId of [...assetIds].reverse()) {
      try {
        await store.remove(assetId);
      } catch {
        // Best-effort rollback must not hide the persistence failure that
        // caused it. Content addressing makes an orphan safe to reuse.
      } finally {
        knownAssetIds.delete(assetId);
      }
    }
  }
}

export async function readDashboardStorageWithAssets(
  storage,
  storageKey,
  { profiles, assets } = {},
) {
  if (!storage || typeof storage.getItem !== "function") {
    throw new TypeError("Dashboard storage must provide getItem.");
  }
  if (!assets || typeof assets.hydrate !== "function") {
    throw new TypeError("Dashboard asset persistence must provide hydrate.");
  }
  if (typeof storageKey !== "string" || storageKey.trim() === "") {
    throw new Error("Dashboard storage key is required.");
  }
  const text = storage.getItem(storageKey);
  if (text === null) return null;
  let compactConfig;
  try {
    compactConfig = JSON.parse(text);
  } catch {
    throw new Error("Saved dashboard configuration must be valid JSON.");
  }
  const hydrated = await assets.hydrate(compactConfig);
  return normalizeStoredDashboardConfig(hydrated, { profiles });
}

export function normalizeDashboardAssetStorageError(error) {
  if (
    error?.code === "DASHBOARD_ASSET_STORAGE_UNAVAILABLE"
    || error?.code === "DASHBOARD_ASSET_QUOTA_EXHAUSTED"
  ) return error;
  const quota = error?.name === "QuotaExceededError"
    || error?.name === "NS_ERROR_DOM_QUOTA_REACHED"
    || error?.code === 22
    || error?.code === 1014;
  const normalized = new Error(quota
    ? "Dashboard asset storage is full."
    : "Dashboard asset storage is unavailable.");
  normalized.code = quota
    ? "DASHBOARD_ASSET_QUOTA_EXHAUSTED"
    : "DASHBOARD_ASSET_STORAGE_UNAVAILABLE";
  normalized.cause = error;
  return normalized;
}

function openAssetDatabase(indexedDB) {
  if (!indexedDB || typeof indexedDB.open !== "function") {
    return Promise.reject(normalizeDashboardAssetStorageError(
      new Error("IndexedDB unavailable"),
    ));
  }
  return new Promise((resolve, reject) => {
    let request;
    try {
      request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    } catch (error) {
      reject(normalizeDashboardAssetStorageError(error));
      return;
    }
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(normalizeDashboardAssetStorageError(request.error));
    request.onblocked = () => reject(normalizeDashboardAssetStorageError(
      new Error("IndexedDB blocked"),
    ));
  });
}

function runRequest(db, mode, operation) {
  return new Promise((resolve, reject) => {
    let transaction;
    let request;
    try {
      transaction = db.transaction(STORE_NAME, mode);
      request = operation(transaction.objectStore(STORE_NAME));
    } catch (error) {
      reject(normalizeDashboardAssetStorageError(error));
      return;
    }
    let result = null;
    request.onsuccess = () => {
      result = request.result ?? null;
    };
    request.onerror = () => reject(normalizeDashboardAssetStorageError(
      request.error ?? transaction.error,
    ));
    transaction.oncomplete = () => resolve(result);
    transaction.onabort = () => reject(normalizeDashboardAssetStorageError(transaction.error));
  });
}

async function digestText(value) {
  if (typeof globalThis.crypto?.subtle?.digest !== "function") {
    throw new Error("Web Crypto hashing is unavailable.");
  }
  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }
  return `{${Object.keys(value).sort().map((key) => (
    `${JSON.stringify(key)}:${stableStringify(value[key])}`
  )).join(",")}}`;
}

function assetReference(assetId) {
  return `${ASSET_REFERENCE_PREFIX}${assetId}`;
}

function referencedAssetId(value) {
  return typeof value === "string" && value.startsWith(ASSET_REFERENCE_PREFIX)
    ? value.slice(ASSET_REFERENCE_PREFIX.length)
    : null;
}

function isEmbeddedImage(value) {
  return typeof value === "string" && /^data:image\/[a-z0-9.+-]+;base64,/i.test(value);
}
