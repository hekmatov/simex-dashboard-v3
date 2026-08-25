const DATABASE_NAME = "simex-authored-assets-v1";
const STORE_NAME = "assets";
const DATABASE_VERSION = 1;

export function createBrowserAuthoredAssetStore({
  indexedDB = globalThis.indexedDB,
  adapter = null,
  now = () => Date.now(),
  urlApi = globalThis.URL,
  BlobCtor = globalThis.Blob,
} = {}) {
  const durableAdapter = adapter ?? createIndexedDbAdapter(indexedDB);
  const leases = new Map();
  const store = {
    now,
    urlApi,
    BlobCtor,
    adapter: durableAdapter,
    stage(input) { return stageAuthoredAsset(store, input); },
    commit(assetId, options) { return commitAuthoredAsset(store, assetId, options); },
    commitMany(assetIds, options) { return commitAuthoredAssets(store, assetIds, options); },
    verify(assetId) { return verifyAuthoredAsset(store, assetId); },
    read(assetId) { return readAuthoredAsset(store, assetId); },
    createObjectUrlLease(assetId) { return createObjectUrlLease(store, assetId); },
    async rollback(assetId, { transactionId } = {}) {
      const record = await durableAdapter.get(assetId);
      if (!record) return false;
      const transactionIds = record.transactionIds.filter((id) => id !== transactionId);
      if (record.status !== "durable" && transactionIds.length === 0) {
        await durableAdapter.remove(assetId);
        releaseAllLeases(leases, assetId, urlApi);
        return true;
      }
      await durableAdapter.put({ ...record, transactionIds });
      return false;
    },
    async remove(assetId) {
      await durableAdapter.remove(assetId);
      releaseAllLeases(leases, assetId, urlApi);
    },
    list() { return durableAdapter.list(); },
    leases,
  };
  return Object.freeze(store);
}

export async function stageAuthoredAsset(store, input = {}) {
  assertStore(store);
  const bytes = copyBytes(input.bytes);
  if (bytes.byteLength === 0) throw authoredError(
    "AUTHORED_ASSET_INVALID",
    "Authored asset bytes are required.",
  );
  const transactionId = requiredText(input.transactionId, "Authored asset transaction id");
  const mediaType = requiredText(input.mediaType, "Authored asset media type");
  const width = positiveInteger(input.width, "Authored asset width");
  const height = positiveInteger(input.height, "Authored asset height");
  const sha256 = await sha256Hex(bytes);
  const assetId = `asset-${sha256}`;
  try {
    const existing = await store.adapter.get(assetId);
    if (existing) {
      await verifyStoredRecord(existing);
      assertRecordMatches(existing, { bytes, mediaType, width, height, sha256 });
      const transactionIds = [...new Set([
        ...(existing.transactionIds ?? []),
        transactionId,
      ])].sort();
      const updated = { ...existing, transactionIds };
      await store.adapter.put(updated);
      return stageResult(updated);
    }
    const stagedAt = store.now();
    const record = {
      id: assetId,
      schemaVersion: 1,
      status: "staged",
      stagedAt,
      durableAt: null,
      transactionIds: [transactionId],
      mediaType,
      byteLength: bytes.byteLength,
      width,
      height,
      sha256,
      bytes,
    };
    await store.adapter.put(record);
    return stageResult(record);
  } catch (error) {
    throw normalizeStorageError(error);
  }
}

export async function commitAuthoredAsset(store, assetId, { transactionId } = {}) {
  const [committed] = await commitAuthoredAssets(store, [assetId], { transactionId });
  return committed;
}

export async function commitAuthoredAssets(store, assetIds, { transactionId } = {}) {
  assertStore(store);
  const ids = [...new Set((assetIds ?? []).map((assetId) => (
    requiredText(assetId, "Authored asset id")
  )))];
  try {
    const committedAt = store.now();
    const committed = [];
    for (const id of ids) {
      const record = await store.adapter.get(id);
      if (!record) throw authoredError(
        "AUTHORED_ASSET_MISSING",
        `Authored asset "${id}" is missing.`,
      );
      await verifyStoredRecord(record);
      const transactionIds = transactionId
        ? (record.transactionIds ?? []).filter((value) => value !== transactionId)
        : [];
      committed.push({
        ...record,
        status: "durable",
        durableAt: committedAt,
        transactionIds,
      });
    }
    if (committed.length > 1 && typeof store.adapter.putMany !== "function") {
      throw authoredError(
        "AUTHORED_ASSET_STORAGE_UNAVAILABLE",
        "Authored asset storage cannot commit this transaction atomically.",
      );
    }
    if (typeof store.adapter.putMany === "function") {
      await store.adapter.putMany(committed);
    } else if (committed.length === 1) {
      await store.adapter.put(committed[0]);
    }
    return committed.map(cloneRecord);
  } catch (error) {
    throw normalizeStorageError(error);
  }
}

export async function verifyAuthoredAsset(store, assetId) {
  assertStore(store);
  const id = requiredText(assetId, "Authored asset id");
  try {
    const record = await store.adapter.get(id);
    if (!record) throw authoredError(
      "AUTHORED_ASSET_MISSING",
      `Authored asset "${id}" is missing.`,
    );
    await verifyStoredRecord(record);
    return cloneRecord(record);
  } catch (error) {
    throw normalizeStorageError(error);
  }
}

export async function readAuthoredAsset(store, assetId) {
  assertStore(store);
  const id = requiredText(assetId, "Authored asset id");
  try {
    const record = await store.adapter.get(id);
    if (!record) throw authoredError(
      "AUTHORED_ASSET_MISSING",
      `Authored asset "${id}" is missing.`,
    );
    await verifyStoredRecord(record);
    return {
      assetId: record.id,
      mediaType: record.mediaType,
      byteLength: record.byteLength,
      width: record.width,
      height: record.height,
      sha256: record.sha256,
      bytes: copyBytes(record.bytes),
    };
  } catch (error) {
    throw normalizeStorageError(error);
  }
}

export async function createObjectUrlLease(store, assetId) {
  assertStore(store);
  const id = requiredText(assetId, "Authored asset id");
  let entry = store.leases.get(id);
  if (!entry) {
    const asset = await readAuthoredAsset(store, id);
    if (
      typeof store.urlApi?.createObjectURL !== "function"
      || typeof store.urlApi?.revokeObjectURL !== "function"
      || typeof store.BlobCtor !== "function"
    ) {
      throw authoredError(
        "AUTHORED_ASSET_URL_UNAVAILABLE",
        "This window cannot create an authored image URL.",
      );
    }
    entry = {
      url: store.urlApi.createObjectURL(new store.BlobCtor(
        [asset.bytes],
        { type: asset.mediaType },
      )),
      references: 0,
    };
    store.leases.set(id, entry);
  }
  entry.references += 1;
  let released = false;
  return Object.freeze({
    assetId: id,
    url: entry.url,
    release() {
      if (released) return false;
      released = true;
      entry.references -= 1;
      if (entry.references === 0) {
        store.urlApi.revokeObjectURL(entry.url);
        store.leases.delete(id);
      }
      return true;
    },
  });
}

function stageResult(record) {
  return {
    assetId: record.id,
    manifestEntry: {
      mediaType: record.mediaType,
      byteLength: record.byteLength,
      width: record.width,
      height: record.height,
      sha256: record.sha256,
      storageState: record.status,
    },
  };
}

async function verifyStoredRecord(record) {
  try {
    const bytes = copyBytes(record.bytes);
    if (bytes.byteLength !== record.byteLength) throw new Error("byte length mismatch");
    const digest = await sha256Hex(bytes);
    if (digest !== record.sha256 || record.id !== `asset-${digest}`) {
      throw new Error("hash mismatch");
    }
  } catch (cause) {
    throw authoredError(
      "AUTHORED_ASSET_CORRUPT",
      `Authored asset "${String(record?.id)}" is corrupt.`,
      cause,
    );
  }
}

function assertRecordMatches(record, expected) {
  if (
    record.mediaType !== expected.mediaType
    || record.byteLength !== expected.bytes.byteLength
    || record.width !== expected.width
    || record.height !== expected.height
    || record.sha256 !== expected.sha256
  ) {
    throw authoredError(
      "AUTHORED_ASSET_CORRUPT",
      `Authored asset "${record.id}" metadata does not match its content identity.`,
    );
  }
}

function createIndexedDbAdapter(indexedDB) {
  let databasePromise = null;
  const database = () => {
    if (databasePromise === null) {
      databasePromise = openDatabase(indexedDB).catch((error) => {
        databasePromise = null;
        throw error;
      });
    }
    return databasePromise;
  };
  return {
    async get(id) {
      return requestResult(await database(), "readonly", (objectStore) => objectStore.get(id));
    },
    async put(record) {
      await requestResult(await database(), "readwrite", (objectStore) => objectStore.put(record));
      return cloneRecord(record);
    },
    async putMany(records) {
      await putManyRecords(await database(), records);
      return records.map(cloneRecord);
    },
    async remove(id) {
      await requestResult(await database(), "readwrite", (objectStore) => objectStore.delete(id));
    },
    async list() {
      const records = await requestResult(
        await database(),
        "readonly",
        (objectStore) => objectStore.getAll(),
      );
      return Array.isArray(records) ? records : [];
    },
  };
}

function putManyRecords(db, records) {
  return new Promise((resolve, reject) => {
    let transaction;
    try {
      transaction = db.transaction(STORE_NAME, "readwrite");
      const objectStore = transaction.objectStore(STORE_NAME);
      for (const record of records) objectStore.put(record);
    } catch (error) {
      reject(normalizeStorageError(error));
      return;
    }
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(normalizeStorageError(transaction.error));
    transaction.onabort = () => reject(normalizeStorageError(transaction.error));
  });
}

function openDatabase(indexedDB) {
  if (!indexedDB || typeof indexedDB.open !== "function") {
    return Promise.reject(authoredError(
      "AUTHORED_ASSET_STORAGE_UNAVAILABLE",
      "Authored asset storage is unavailable.",
    ));
  }
  return new Promise((resolve, reject) => {
    let request;
    try {
      request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    } catch (error) {
      reject(normalizeStorageError(error));
      return;
    }
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(normalizeStorageError(request.error));
    request.onblocked = () => reject(authoredError(
      "AUTHORED_ASSET_STORAGE_UNAVAILABLE",
      "Authored asset storage is blocked.",
    ));
  });
}

function requestResult(db, mode, operation) {
  return new Promise((resolve, reject) => {
    let transaction;
    let request;
    try {
      transaction = db.transaction(STORE_NAME, mode);
      request = operation(transaction.objectStore(STORE_NAME));
    } catch (error) {
      reject(normalizeStorageError(error));
      return;
    }
    let result = null;
    request.onsuccess = () => { result = request.result ?? null; };
    request.onerror = () => reject(normalizeStorageError(request.error ?? transaction.error));
    transaction.oncomplete = () => resolve(result);
    transaction.onabort = () => reject(normalizeStorageError(transaction.error));
  });
}

function normalizeStorageError(error) {
  if (typeof error?.code === "string" && error.code.startsWith("AUTHORED_ASSET_")) {
    return error;
  }
  const quota = error?.name === "QuotaExceededError"
    || error?.name === "NS_ERROR_DOM_QUOTA_REACHED"
    || error?.code === 22
    || error?.code === 1014;
  return authoredError(
    quota ? "AUTHORED_ASSET_QUOTA_EXHAUSTED" : "AUTHORED_ASSET_STORAGE_UNAVAILABLE",
    quota ? "Authored asset storage is full." : "Authored asset storage is unavailable.",
    error,
  );
}

function releaseAllLeases(leases, assetId, urlApi) {
  const entry = leases.get(assetId);
  if (!entry) return;
  urlApi?.revokeObjectURL?.(entry.url);
  leases.delete(assetId);
}

async function sha256Hex(bytes) {
  if (typeof globalThis.crypto?.subtle?.digest !== "function") {
    throw authoredError("AUTHORED_ASSET_STORAGE_UNAVAILABLE", "Web Crypto hashing is unavailable.");
  }
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function copyBytes(value) {
  if (value instanceof Uint8Array) return value.slice();
  if (value instanceof ArrayBuffer) return new Uint8Array(value.slice(0));
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength));
  }
  return new Uint8Array();
}

function positiveInteger(value, description) {
  if (!Number.isInteger(value) || value < 1) throw authoredError(
    "AUTHORED_ASSET_INVALID",
    `${description} must be a positive integer.`,
  );
  return value;
}

function requiredText(value, description) {
  if (typeof value !== "string" || value.trim() === "") throw authoredError(
    "AUTHORED_ASSET_INVALID",
    `${description} is required.`,
  );
  return value.trim();
}

function authoredError(code, message, cause) {
  const error = new Error(message, cause ? { cause } : undefined);
  error.code = code;
  return error;
}

function cloneRecord(record) {
  return record === null || record === undefined ? record : structuredClone(record);
}

function assertStore(store) {
  if (!store?.adapter) throw new TypeError("An authored asset store is required.");
}
