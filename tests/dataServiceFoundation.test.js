import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeSourceRequest,
  providerKindForDescriptor,
} from "../src/data/sourceRequest.js";
import { createProviderRegistry } from "../src/data/providerRegistry.js";

test("source requests normalize purpose, provider kind, and stable cache identity", () => {
  const descriptor = {
    kind: "csv",
    path: "data/cases.csv",
    provenance: { label: "Cases" },
    parsingMetadata: {
      date: { interpretation: "temporal", format: "YYYY-MM-DD" },
    },
  };
  const profile = { fingerprint: "a".repeat(64) };
  const first = normalizeSourceRequest("cases", {
    descriptor,
    profile,
    scopeId: "dashboard-a",
  });
  const second = normalizeSourceRequest({
    sourceId: "cases",
    purpose: "wizard",
  }, {
    descriptor,
    profile,
    scopeId: "dashboard-b",
  });

  assert.deepEqual(
    { sourceId: first.sourceId, purpose: first.purpose, providerKind: first.providerKind },
    { sourceId: "cases", purpose: "dashboard", providerKind: "csv" },
  );
  assert.equal(first.cacheKey, second.cacheKey);
  assert.equal(second.purpose, "wizard");
  assert.ok(Object.isFrozen(first));
});

test("cache identity changes with tracked paths and isolates portable payloads", () => {
  const profile = { fingerprint: "a".repeat(64) };
  const base = {
    kind: "csv",
    path: "data/cases.csv",
    provenance: { label: "Cases" },
  };
  const first = normalizeSourceRequest("cases", {
    descriptor: base,
    profile,
    scopeId: "scope-a",
  });
  const changedPath = normalizeSourceRequest("cases", {
    descriptor: { ...base, path: "data/revised-cases.csv" },
    profile,
    scopeId: "scope-a",
  });
  const portableA = normalizeSourceRequest("cases", {
    descriptor: base,
    profile,
    portableSource: { kind: "csv", text: "cases\n7\n" },
    scopeId: "scope-a",
  });
  const portableB = normalizeSourceRequest("cases", {
    descriptor: base,
    profile,
    portableSource: { kind: "csv", text: "cases\n7\n" },
    scopeId: "scope-b",
  });

  assert.notEqual(first.cacheKey, changedPath.cacheKey);
  assert.notEqual(first.cacheKey, portableA.cacheKey);
  assert.notEqual(portableA.cacheKey, portableB.cacheKey);
});

test("descriptor forms map to the four initial provider kinds", () => {
  assert.equal(providerKindForDescriptor({ kind: "csv" }), "csv");
  assert.equal(providerKindForDescriptor({ kind: "geojson" }), "geojson");
  assert.equal(providerKindForDescriptor({ kind: "inline", rows: [] }), "inline");
  assert.equal(providerKindForDescriptor({
    kind: "dataset",
    type: "uploadedCsv",
    csvText: "value\n1\n",
  }), "uploadedCsv");
  assert.throws(
    () => providerKindForDescriptor({ kind: "stream" }),
    /unsupported source descriptor/i,
  );
});

test("unfingerprinted runtime sources are stable only inside their service scope", () => {
  const descriptor = {
    kind: "dataset",
    type: "uploadedCsv",
    csvText: "value\n1\n",
  };
  const first = normalizeSourceRequest("upload", {
    descriptor,
    scopeId: "scope-a",
  });
  const sameScope = normalizeSourceRequest("upload", {
    descriptor,
    scopeId: "scope-a",
  });
  const otherScope = normalizeSourceRequest("upload", {
    descriptor,
    scopeId: "scope-b",
  });

  assert.equal(first.cacheKey, sameScope.cacheKey);
  assert.notEqual(first.cacheKey, otherScope.cacheKey);
});

test("provider registry rejects duplicates and resolves registered providers", async () => {
  const csv = {
    kind: "csv",
    async load() {
      return { data: [{ value: 1 }] };
    },
  };
  const registry = createProviderRegistry([csv]);

  assert.equal(registry.resolve("csv"), csv);
  assert.deepEqual(registry.kinds(), ["csv"]);
  assert.throws(() => registry.register(csv), /already registered/i);
  assert.throws(() => registry.resolve("geojson"), /no data provider/i);
  assert.ok(Object.isFrozen(registry));
});
