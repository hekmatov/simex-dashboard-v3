import test from "node:test";
import assert from "node:assert/strict";

import {
  isGeoJsonDescriptor,
  normalizeSourceRequest,
  providerKindForDescriptor,
} from "../src/data/sourceRequest.js";

import { createProviderRegistry } from "../src/data/providerRegistry.js";
import {
  createDataService,
  createSourceCache,
} from "../src/data/dataService.js";
import { createDashboardSourceProviders } from "../src/data/dashboardSourceProviders.js";
import { validateGeoJson } from "../src/lib/loadDashboard.js";

test("tracked and packaged geography descriptors share the live geography boundary", () => {
  assert.equal(isGeoJsonDescriptor({ kind: "geojson", path: "areas.geojson" }), true);
  assert.equal(isGeoJsonDescriptor({
    kind: "dataset",
    type: "uploadedGeoJson",
    geoJson: { type: "FeatureCollection", features: [] },
  }), true);
  assert.equal(isGeoJsonDescriptor({ kind: "dataset", type: "uploadedCsv" }), false);
});

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

function serviceFixture({ load, onEvent, now, cache } = {}) {
  const provider = {
    kind: "csv",
    load: load ?? (async () => ({ data: [{ value: 1 }] })),
  };
  return createDataService({
    dataSources: {
      cases: {
        kind: "csv",
        path: "data/cases.csv",
        provenance: { label: "Fixture" },
      },
    },
    profiles: { cases: { fingerprint: "b".repeat(64), columns: [] } },
    providers: createProviderRegistry([provider]),
    cache,
    onEvent,
    now,
    scopeId: "fixture",
  });
}

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

test("data service publishes immutable unloaded, loading, and ready snapshots", async () => {
  const pending = deferred();
  let loads = 0;
  const service = serviceFixture({
    load: async () => {
      loads += 1;
      return pending.promise;
    },
  });

  assert.equal(service.getSnapshot("cases").status, "unloaded");
  const first = service.load({ sourceId: "cases", purpose: "dashboard" });
  const second = service.load({ sourceId: "cases", purpose: "wizard" });
  assert.equal(service.getSnapshot("cases").status, "loading");
  await Promise.resolve();
  assert.equal(loads, 1);

  pending.resolve({ data: [{ value: 7 }], estimatedBytes: 24 });
  const [firstSnapshot, secondSnapshot] = await Promise.all([first, second]);
  assert.equal(firstSnapshot, secondSnapshot);
  assert.equal(firstSnapshot.status, "ready");
  assert.equal(firstSnapshot.revision, 1);
  assert.deepEqual(firstSnapshot.data, [{ value: 7 }]);
  assert.equal(firstSnapshot.estimatedBytes, 24);
  assert.ok(Object.isFrozen(firstSnapshot));
});

test("shared cache reuses a ready descriptor revision across service instances", async () => {
  const cache = createSourceCache();
  let loads = 0;
  const load = async () => {
    loads += 1;
    return { data: [{ value: 11 }] };
  };
  const first = serviceFixture({ load, cache });
  const second = serviceFixture({ load, cache });

  const firstReady = await first.load("cases");
  const secondReady = await second.load("cases");
  assert.equal(loads, 1);
  assert.equal(firstReady.data, secondReady.data);
  assert.equal(secondReady.revision, 1);
});

test("shared payload reuse preserves each service's tracked profile authority", async () => {
  const cache = createSourceCache();
  const rows = [{ value: 11 }];
  let loads = 0;
  const providers = createProviderRegistry([{
    kind: "csv",
    async load() {
      loads += 1;
      return { data: rows };
    },
  }]);
  const dataSources = {
    cases: { kind: "csv", path: "data/cases.csv" },
  };
  const firstProfile = {
    fingerprint: "g".repeat(64),
    columns: [{ name: "value", examples: [11] }],
  };
  const secondProfile = {
    fingerprint: "g".repeat(64),
    columns: [{ name: "value", examples: ["current dashboard"] }],
  };
  const first = createDataService({
    dataSources,
    profiles: { cases: firstProfile },
    providers,
    cache,
    scopeId: "first-profile",
  });
  const second = createDataService({
    dataSources,
    profiles: { cases: secondProfile },
    providers,
    cache,
    scopeId: "second-profile",
  });

  const firstReady = await first.load("cases");
  const secondReady = await second.load("cases");
  assert.equal(loads, 1);
  assert.equal(firstReady.data, rows);
  assert.equal(secondReady.data, rows);
  assert.equal(firstReady.profile, firstProfile);
  assert.equal(secondReady.profile, secondProfile);
});

test("start events can re-enter load and receive the registered in-flight promise", async () => {
  let reentrantLoad = null;
  let service;
  service = serviceFixture({
    onEvent(event) {
      if (event.type === "source-load-start" && reentrantLoad === null) {
        reentrantLoad = service.load("cases");
      }
    },
  });

  const first = service.load("cases");
  assert.ok(reentrantLoad instanceof Promise);
  const [firstReady, reentrantReady] = await Promise.all([first, reentrantLoad]);
  assert.equal(firstReady.data, reentrantReady.data);
});

test("missing providers publish a retryable source-local error", async () => {
  const registry = createProviderRegistry();
  const service = createDataService({
    dataSources: { cases: { kind: "csv", path: "data/cases.csv" } },
    profiles: { cases: { fingerprint: "h".repeat(64), columns: [] } },
    providers: registry,
    scopeId: "missing-provider",
  });

  await assert.rejects(service.load("cases"), /no data provider/i);
  assert.equal(service.getSnapshot("cases").status, "error");
  registry.register({
    kind: "csv",
    async load() {
      return { data: [{ value: 12 }] };
    },
  });
  const recovered = await service.retry("cases");
  assert.equal(recovered.status, "ready");
});

test("leases prevent eviction and release idempotently", async () => {
  const service = serviceFixture();
  const lease = service.acquire({ sourceId: "cases", purpose: "editor" });
  await lease.ready;

  assert.equal(service.getSnapshot("cases").leaseCount, 1);
  assert.equal(service.evict("cases"), false);
  lease.release();
  lease.release();
  assert.equal(service.getSnapshot("cases").leaseCount, 0);
  assert.equal(service.evict("cases"), true);
  assert.equal(service.getSnapshot("cases").status, "unloaded");
});

test("a failed source is observable, isolated, and retryable", async () => {
  let brokenAttempts = 0;
  const registry = createProviderRegistry([{
    kind: "csv",
    async load({ sourceId }) {
      if (sourceId === "broken") {
        brokenAttempts += 1;
        if (brokenAttempts === 1) throw new Error("fixture unavailable");
      }
      return { data: [{ sourceId }] };
    },
  }]);
  const service = createDataService({
    dataSources: {
      ready: { kind: "csv", path: "data/ready.csv" },
      broken: { kind: "csv", path: "data/broken.csv" },
    },
    profiles: {
      ready: { fingerprint: "c".repeat(64) },
      broken: { fingerprint: "d".repeat(64) },
    },
    providers: registry,
    scopeId: "failures",
  });

  await service.load("ready");
  await assert.rejects(service.load("broken"), /fixture unavailable/i);
  assert.equal(service.getSnapshot("ready").status, "ready");
  assert.equal(service.getSnapshot("broken").status, "error");
  await assert.rejects(service.load("broken"), /fixture unavailable/i);
  assert.equal(brokenAttempts, 1);
  const recovered = await service.retry({ sourceId: "broken", purpose: "dashboard" });
  assert.equal(recovered.status, "ready");
  assert.equal(recovered.revision, 1);
});

test("measurement events and inspection never copy source payloads", async () => {
  const events = [];
  const ticks = [0, 0, 10, 16];
  const rows = [{ value: 9 }];
  const service = serviceFixture({
    load: async () => ({ data: rows, estimatedBytes: 18 }),
    onEvent: (event) => events.push(event),
    now: () => ticks.shift() ?? 16,
  });

  await service.load({ sourceId: "cases", purpose: "fullscreen" });
  await service.load({ sourceId: "cases", purpose: "wizard" });
  const report = service.inspect();

  assert.deepEqual(
    events.map(({ type }) => type),
    ["source-load-start", "source-load-ready", "source-cache-hit"],
  );
  assert.equal(events[1].durationMs, 6);
  assert.equal(report[0].status, "ready");
  assert.equal(report[0].estimatedBytes, 18);
  assert.equal(Object.hasOwn(report[0], "data"), false);
  assert.equal(service.getSnapshot("cases").data, rows);
});

test("hydrateAll preserves deterministic source order and legacy output shape", async () => {
  const order = [];
  const service = createDataService({
    dataSources: {
      first: { kind: "csv", path: "data/first.csv" },
      second: { kind: "csv", path: "data/second.csv" },
    },
    profiles: {
      first: { fingerprint: "e".repeat(64) },
      second: { fingerprint: "f".repeat(64) },
    },
    providers: createProviderRegistry([{
      kind: "csv",
      async load({ sourceId }) {
        order.push(sourceId);
        return { data: [{ sourceId }] };
      },
    }]),
    scopeId: "hydrate-all",
  });

  const hydrated = await service.hydrateAll({ purpose: "compatibility" });
  assert.deepEqual(order, ["first", "second"]);
  assert.deepEqual(Object.keys(hydrated.loadedData), ["first", "second"]);
  assert.equal(hydrated.loadedData.first[0].sourceId, "first");
  assert.equal(hydrated.profiles.second.fingerprint, "f".repeat(64));
});

test("dashboard providers load tracked, uploaded, inline, and GeoJSON sources", async () => {
  const calls = [];
  const providers = createProviderRegistry(createDashboardSourceProviders({
    loadCsv: async (url) => {
      calls.push(["csv", url]);
      return [{ date: "2027-01-01", cases: 7 }];
    },
    parseCsvText: (text, label) => {
      calls.push(["parse", label]);
      return [{ text }];
    },
    profileDataset: (rows) => ({ rowCount: rows.length, fingerprint: "p".repeat(64) }),
    fetchJson: async (url) => {
      calls.push(["geojson", url]);
      return {
        type: "FeatureCollection",
        features: [{
          type: "Feature",
          properties: { name: "North" },
          geometry: { type: "Point", coordinates: [4.9, 52.3] },
        }],
      };
    },
    sourceUrl: (path) => `/base/${path}`,
    validateGeoJson: (data) => data,
  }));

  const csv = await providers.resolve("csv").load({
    sourceId: "cases",
    descriptor: { kind: "csv", path: "data/cases.csv" },
    portableSource: null,
  });
  const uploaded = await providers.resolve("uploadedCsv").load({
    sourceId: "upload",
    descriptor: {
      kind: "dataset",
      type: "uploadedCsv",
      fileName: "upload.csv",
      csvText: "value\n4\n",
    },
    portableSource: null,
  });
  const manualRows = [{ value: 5 }];
  const inline = await providers.resolve("inline").load({
    sourceId: "manual",
    descriptor: { kind: "inline", rows: manualRows },
    portableSource: null,
  });
  const geo = await providers.resolve("geojson").load({
    sourceId: "regions",
    descriptor: { kind: "geojson", path: "data/regions.geojson" },
    portableSource: null,
  });

  assert.equal(csv.data[0].cases, 7);
  assert.equal(uploaded.profile.rowCount, 1);
  assert.deepEqual(inline.data, manualRows);
  assert.notEqual(inline.data, manualRows);
  assert.notEqual(inline.data[0], manualRows[0]);
  assert.equal(geo.data.type, "FeatureCollection");
  assert.deepEqual(calls, [
    ["csv", "/base/data/cases.csv"],
    ["parse", "upload.csv"],
    ["geojson", "/base/data/regions.geojson"],
  ]);
});

test("dashboard providers parse the existing portable payload without network access", async () => {
  let networkCalls = 0;
  const providers = createProviderRegistry(createDashboardSourceProviders({
    loadCsv: async () => {
      networkCalls += 1;
      return [];
    },
    parseCsvText: (text) => [{ text }],
    profileDataset: () => ({ rowCount: 1, fingerprint: "q".repeat(64) }),
    fetchJson: async () => {
      networkCalls += 1;
      return {};
    },
    sourceUrl: (path) => path,
    validateGeoJson: (data) => data,
  }));

  const csv = await providers.resolve("csv").load({
    sourceId: "cases",
    descriptor: { kind: "csv", path: "data/cases.csv" },
    portableSource: { kind: "csv", text: "cases\n7\n" },
  });
  const geoPayload = { type: "FeatureCollection", features: [{ id: "north" }] };
  const geo = await providers.resolve("geojson").load({
    sourceId: "regions",
    descriptor: { kind: "geojson", path: "data/regions.geojson" },
    portableSource: { kind: "geojson", data: geoPayload },
  });

  assert.equal(csv.data[0].text, "cases\n7\n");
  assert.deepEqual(geo.data, geoPayload);
  assert.notEqual(geo.data, geoPayload);
  assert.equal(networkCalls, 0);
});

test("portable GeoJSON is validated with its legacy label before cloning", async () => {
  const unexpected = () => {
    throw new Error("Unexpected provider dependency call.");
  };
  const providers = createProviderRegistry(createDashboardSourceProviders({
    loadCsv: unexpected,
    parseCsvText: unexpected,
    profileDataset: unexpected,
    fetchJson: unexpected,
    sourceUrl: (path) => path,
    validateGeoJson,
  }));
  const malformedPayload = {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [() => 4.9, 52.3],
      },
    }],
  };

  await assert.rejects(
    providers.resolve("geojson").load({
      sourceId: "regions",
      descriptor: { kind: "geojson", path: "data/regions.geojson" },
      portableSource: { kind: "geojson", data: malformedPayload },
    }),
    /Portable data source "regions" GeoJSON feature 0 geometry coordinates must be a position of finite numbers/,
  );
});
