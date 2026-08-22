import assert from "node:assert/strict";
import test from "node:test";

import {
  createBrowserChartArtifactStore,
  normalizeArtifactStorageError,
} from "../src/charting/runtime/browserChartArtifactStore.js";

test("browser artifact store reports unavailable storage distinctly", async () => {
  const store = createBrowserChartArtifactStore({ indexedDB: null });
  await assert.rejects(store.get("identity"), {
    code: "ARTIFACT_STORAGE_UNAVAILABLE",
  });
  await assert.rejects(store.put({ identity: "identity" }), {
    code: "ARTIFACT_STORAGE_UNAVAILABLE",
  });
});

test("browser artifact store distinguishes quota exhaustion", () => {
  const quota = new DOMException("full", "QuotaExceededError");
  const normalized = normalizeArtifactStorageError(quota);
  assert.equal(normalized.code, "ARTIFACT_QUOTA_EXHAUSTED");
  assert.strictEqual(normalized.cause, quota);
});
