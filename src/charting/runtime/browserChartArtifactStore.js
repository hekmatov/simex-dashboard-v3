const DATABASE_NAME = "simex-chart-runtime-artifacts";
const STORE_NAME = "artifacts";
const DATABASE_VERSION = 1;

export function createBrowserChartArtifactStore({ indexedDB = globalThis.indexedDB } = {}) {
  return Object.freeze({
    async get(identity) {
      const db = await openArtifactDatabase(indexedDB);
      return runRequest(db, "readonly", (store) => store.get(identity));
    },
    async put(artifact) {
      const db = await openArtifactDatabase(indexedDB);
      await runRequest(db, "readwrite", (store) => store.put(artifact));
      return artifact;
    },
    async remove(identity) {
      const db = await openArtifactDatabase(indexedDB);
      await runRequest(db, "readwrite", (store) => store.delete(identity));
    },
  });
}

export function normalizeArtifactStorageError(error) {
  if (error?.code === "ARTIFACT_STORAGE_UNAVAILABLE"
    || error?.code === "ARTIFACT_QUOTA_EXHAUSTED") return error;
  const quota = error?.name === "QuotaExceededError"
    || error?.name === "NS_ERROR_DOM_QUOTA_REACHED";
  const normalized = new Error(quota
    ? "Chart artifact storage is full."
    : "Chart artifact storage is unavailable.");
  normalized.code = quota
    ? "ARTIFACT_QUOTA_EXHAUSTED"
    : "ARTIFACT_STORAGE_UNAVAILABLE";
  normalized.cause = error;
  return normalized;
}

function openArtifactDatabase(indexedDB) {
  if (!indexedDB || typeof indexedDB.open !== "function") {
    return Promise.reject(normalizeArtifactStorageError(new Error("IndexedDB unavailable")));
  }
  return new Promise((resolve, reject) => {
    let request;
    try {
      request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    } catch (error) {
      reject(normalizeArtifactStorageError(error));
      return;
    }
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "identity" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(normalizeArtifactStorageError(request.error));
    request.onblocked = () => reject(normalizeArtifactStorageError(new Error("IndexedDB blocked")));
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
      reject(normalizeArtifactStorageError(error));
      return;
    }
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(normalizeArtifactStorageError(request.error ?? transaction.error));
    transaction.onabort = () => reject(normalizeArtifactStorageError(transaction.error));
  });
}
