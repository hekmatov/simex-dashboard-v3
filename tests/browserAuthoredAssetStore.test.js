import assert from "node:assert/strict";
import test from "node:test";

import {
  commitAuthoredAsset,
  createBrowserAuthoredAssetStore,
  createObjectUrlLease,
  readAuthoredAsset,
  stageAuthoredAsset,
} from "../src/static-content/assets/browserAuthoredAssetStore.js";

const PNG_BYTES = new Uint8Array([137, 80, 78, 71, 1, 2, 3, 4]);
const PNG_SHA = "cc1cdcbcf0bdb70801a2f0777e9f9c85571461df7f96d1d3f1476f420df37e38";

test("authored bytes stage once by hash and become durable only after dashboard commit", async () => {
  const adapter = createMemoryAdapter();
  const store = createBrowserAuthoredAssetStore({ adapter, now: () => 1_000 });

  const first = await stageAuthoredAsset(store, {
    bytes: PNG_BYTES,
    mediaType: "image/png",
    width: 2,
    height: 3,
    transactionId: "create-panel",
  });
  const duplicate = await stageAuthoredAsset(store, {
    bytes: PNG_BYTES.slice(),
    mediaType: "image/png",
    width: 2,
    height: 3,
    transactionId: "reuse-panel",
  });

  assert.equal(first.assetId, `asset-${PNG_SHA}`);
  assert.equal(duplicate.assetId, first.assetId);
  assert.equal(adapter.putCount, 2, "the duplicate updates transaction facts, not payload identity");
  assert.deepEqual(adapter.records.get(first.assetId).transactionIds, [
    "create-panel",
    "reuse-panel",
  ]);
  assert.equal(adapter.records.get(first.assetId).status, "staged");

  const committed = await commitAuthoredAsset(store, first.assetId, {
    transactionId: "create-panel",
  });
  assert.equal(committed.status, "durable");
  assert.deepEqual(committed.transactionIds, ["reuse-panel"]);
  assert.deepEqual(await readAuthoredAsset(store, first.assetId), {
    assetId: first.assetId,
    mediaType: "image/png",
    byteLength: PNG_BYTES.byteLength,
    width: 2,
    height: 3,
    sha256: PNG_SHA,
    bytes: PNG_BYTES,
  });
  assert.notStrictEqual((await readAuthoredAsset(store, first.assetId)).bytes, PNG_BYTES);
});

test("authored reads reject missing and hash-corrupt records with typed failures", async () => {
  const adapter = createMemoryAdapter();
  const store = createBrowserAuthoredAssetStore({ adapter });

  await assert.rejects(readAuthoredAsset(store, "asset-missing"), {
    code: "AUTHORED_ASSET_MISSING",
  });
  const staged = await stageAuthoredAsset(store, {
    bytes: PNG_BYTES,
    mediaType: "image/png",
    width: 2,
    height: 3,
    transactionId: "corrupt-test",
  });
  adapter.records.get(staged.assetId).bytes[0] = 0;
  await assert.rejects(readAuthoredAsset(store, staged.assetId), {
    code: "AUTHORED_ASSET_CORRUPT",
  });
});

test("quota and unavailable IndexedDB failures remain distinguishable", async () => {
  const unavailable = createBrowserAuthoredAssetStore({ indexedDB: null });
  await assert.rejects(stageAuthoredAsset(unavailable, {
    bytes: PNG_BYTES,
    mediaType: "image/png",
    width: 2,
    height: 3,
    transactionId: "unavailable",
  }), { code: "AUTHORED_ASSET_STORAGE_UNAVAILABLE" });

  const quota = createMemoryAdapter({
    putError: Object.assign(new Error("full"), { name: "QuotaExceededError" }),
  });
  await assert.rejects(stageAuthoredAsset(
    createBrowserAuthoredAssetStore({ adapter: quota }),
    {
      bytes: PNG_BYTES,
      mediaType: "image/png",
      width: 2,
      height: 3,
      transactionId: "quota",
    },
  ), { code: "AUTHORED_ASSET_QUOTA_EXHAUSTED" });
});

test("object URL leases are per store/window and revoke only after the final release", async () => {
  const adapter = createMemoryAdapter();
  const urls = [];
  const revoked = [];
  const urlApi = {
    createObjectURL(blob) {
      urls.push(blob);
      return `blob:test-${urls.length}`;
    },
    revokeObjectURL(url) { revoked.push(url); },
  };
  const store = createBrowserAuthoredAssetStore({ adapter, urlApi });
  const staged = await stageAuthoredAsset(store, {
    bytes: PNG_BYTES,
    mediaType: "image/png",
    width: 2,
    height: 3,
    transactionId: "lease",
  });

  const first = await createObjectUrlLease(store, staged.assetId);
  const second = await createObjectUrlLease(store, staged.assetId);
  assert.equal(first.url, second.url);
  assert.equal(urls.length, 1);
  assert.equal(first.release(), true);
  assert.deepEqual(revoked, []);
  assert.equal(second.release(), true);
  assert.deepEqual(revoked, [first.url]);
  assert.equal(second.release(), false);

  const otherWindowUrls = [];
  const otherStore = createBrowserAuthoredAssetStore({
    adapter,
    urlApi: {
      createObjectURL() {
        otherWindowUrls.push(true);
        return "blob:other-window";
      },
      revokeObjectURL() {},
    },
  });
  const otherLease = await createObjectUrlLease(otherStore, staged.assetId);
  assert.equal(otherLease.url, "blob:other-window");
  assert.equal(otherWindowUrls.length, 1);
  otherLease.release();
});

function createMemoryAdapter({ putError = null } = {}) {
  const adapter = {
    records: new Map(),
    putCount: 0,
    async get(id) {
      const value = adapter.records.get(id);
      return value ? structuredClone(value) : null;
    },
    async put(record) {
      if (putError) throw putError;
      adapter.putCount += 1;
      adapter.records.set(record.id, structuredClone(record));
      return structuredClone(record);
    },
    async remove(id) { adapter.records.delete(id); },
    async list() { return [...adapter.records.values()].map((value) => structuredClone(value)); },
  };
  return adapter;
}
