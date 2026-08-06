# Demand-Driven Data Service Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce the provider-backed `DataService` foundation while preserving the current eagerly hydrated dashboard result through a temporary `hydrateAll` compatibility path.

**Architecture:** Normalize source requests against validated dashboard descriptors, resolve transport through a provider registry, and publish immutable readiness snapshots from a shared source cache. Extract the current CSV, uploaded CSV, inline, portable, and GeoJSON loaders into providers, but keep `loadDashboardConfig` eagerly hydrating every source so this first slice changes no consumer contract or chart semantics.

**Tech Stack:** JavaScript ES modules, Node.js test runner, React 19 runtime, Papa Parse, Vite 6, existing Chart System V3 validators and dataset profiler.

## Global Constraints

- Work only in `C:\Users\hekma\Documents\SimEx Dashboard\.worktrees\simex-dashboard-v2\dashboard-refinement-round-2`.
- Do not read from or write to OneDrive.
- Do not modify any existing dashboard worktree.
- Do not merge, push, deploy, or update the Cloudflare branch without user approval.
- Do not add a runtime dependency.
- Keep the persisted dashboard schema at `configVersion: 3` and the Quorum catalogue at `contract_version: "2"`.
- Keep filtering, grouping, aggregation, duplicate handling, missing-value handling, geography joins, temporal matching, and mark construction in `src/charting/data/prepareChartData.js` and its current collaborators.
- Do not recursively clone or freeze large provider payloads; freeze snapshot wrappers and treat payloads as read-only by contract.
- Preserve `loadDashboardConfig(dashboard, datasetProfiles, portableSources)` and its returned `loadedData` and `datasetProfiles` behavior during this foundation.
- Preserve deterministic sequential eager hydration in `hydrateAll` to avoid changing load ordering or causing a parse-memory spike.
- Treat one service instance's validated descriptors as immutable. Replacing a descriptor creates a new service/request identity rather than mutating a live cache entry.
- Do not hash or canonicalize entire CSV or GeoJSON payloads merely to form cache keys. Always include tracked paths; use an existing descriptor/profile fingerprint where available; otherwise isolate runtime and portable payloads to the service scope.
- Cache provider payload state separately from the tracked profile catalogue supplied by each dashboard. A shared raw-data hit must not replace the current dashboard's tracked profile.
- Use tests first for every behavior change and commit each task atomically.

## File Structure

| Path | Responsibility |
| --- | --- |
| `src/data/sourceRequest.js` | Validate and normalize demand requests, map descriptors to provider kinds, and construct stable cache identities. |
| `src/data/providerRegistry.js` | Register and resolve one provider per source kind. |
| `src/data/dataService.js` | Own readiness snapshots, shared cache entries, in-flight reuse, revisions, leases, retries, eviction, inspection, and compatibility hydration. |
| `src/data/dashboardSourceProviders.js` | Adapt tracked CSV, uploaded CSV, inline rows, GeoJSON, and current portable payloads to the provider result contract. |
| `src/lib/loadDashboard.js` | Retain descriptor/profile validation and route eager source hydration through the service. |
| `tests/dataServiceFoundation.test.js` | Focused source request, registry, service-state, cache, lease, provider, failure, and measurement tests. |
| `tests/datasetProfilesV3.test.js` | Preserve existing end-to-end loader/profile/portable semantics. |
| `docs/chart-data-system-v3.md` | Record the new runtime authority and the temporary eager compatibility boundary. |

---

### Task 1: Source Request Normalization and Provider Registry

**Files:**
- Create: `src/data/sourceRequest.js`
- Create: `src/data/providerRegistry.js`
- Create: `tests/dataServiceFoundation.test.js`

**Interfaces:**
- Consumes: validated version-3 source descriptors and optional tracked profiles/portable payloads.
- Produces: `providerKindForDescriptor(descriptor)`, `normalizeSourceRequest(request, context)`, and `createProviderRegistry(initialProviders)`.
- `normalizeSourceRequest` returns a frozen `{ sourceId, purpose, providerKind, cacheKey, descriptor, portableSource }` record.
- Cache identity always includes `sourceId`, provider kind, tracked path, parsing metadata, and transport. Network sources may share across service instances when those fields and an available fingerprint match. Portable sources and unfingerprinted uploaded/inline sources include `scopeId`, avoiding stale cross-dashboard reuse without hashing full payloads.
- A provider is `{ kind: string, load(request): Promise<{ data, profile?, estimatedBytes? }> }`.

- [ ] **Step 1: Write failing normalization and registry tests**

Create `tests/dataServiceFoundation.test.js` with these imports and tests:

```js
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
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```powershell
node --test tests/dataServiceFoundation.test.js
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/data/sourceRequest.js`.

- [ ] **Step 3: Implement request normalization**

Create `src/data/sourceRequest.js`:

```js
const PURPOSES = new Set([
  "dashboard",
  "wizard",
  "editor",
  "fullscreen",
  "playback",
  "compatibility",
]);

export function providerKindForDescriptor(descriptor) {
  if (descriptor?.kind === "inline") return "inline";
  if (
    descriptor?.kind === "dataset"
    && descriptor?.type === "uploadedCsv"
  ) {
    return "uploadedCsv";
  }
  if (descriptor?.kind === "csv" || descriptor?.kind === "geojson") {
    return descriptor.kind;
  }
  throw new Error("Unsupported source descriptor for the data service.");
}

export function normalizeSourceRequest(
  request,
  {
    descriptor,
    profile = null,
    portableSource = null,
    scopeId,
  } = {},
) {
  const sourceId = typeof request === "string" ? request : request?.sourceId;
  const purpose = typeof request === "string"
    ? "dashboard"
    : request?.purpose ?? "dashboard";
  if (typeof sourceId !== "string" || sourceId.trim() === "") {
    throw new TypeError("Data source request sourceId is required.");
  }
  if (!PURPOSES.has(purpose)) {
    throw new Error(`Data source request purpose "${purpose}" is invalid.`);
  }
  if (!descriptor || typeof descriptor !== "object") {
    throw new Error(`Data source "${sourceId}" is not registered.`);
  }
  if (typeof scopeId !== "string" || scopeId === "") {
    throw new TypeError("Data service scopeId is required.");
  }

  const providerKind = providerKindForDescriptor(descriptor);
  const fingerprint = descriptor.sourceFingerprint
    ?? descriptor.fingerprint
    ?? profile?.fingerprint
    ?? null;
  const parsingIdentity = stableStringify(descriptor.parsingMetadata ?? {});
  const portable = portableSource !== null && portableSource !== undefined;
  const transport = portable ? `portable:${scopeId}` : "network";
  const runtimeScope = fingerprint === null && !descriptor.path
    ? scopeId
    : null;
  return Object.freeze({
    sourceId,
    purpose,
    providerKind,
    cacheKey: stableStringify({
      sourceId,
      providerKind,
      path: descriptor.path ?? null,
      fingerprint,
      parsingIdentity,
      runtimeScope,
      transport,
    }),
    descriptor,
    portableSource,
  });
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
```

- [ ] **Step 4: Implement the provider registry**

Create `src/data/providerRegistry.js`:

```js
export function createProviderRegistry(initialProviders = []) {
  const providers = new Map();

  function register(provider) {
    if (
      !provider
      || typeof provider.kind !== "string"
      || provider.kind.trim() === ""
      || typeof provider.load !== "function"
    ) {
      throw new TypeError("A data provider requires a kind and load function.");
    }
    if (providers.has(provider.kind)) {
      throw new Error(`Data provider "${provider.kind}" is already registered.`);
    }
    providers.set(provider.kind, provider);
    return api;
  }

  function resolve(kind) {
    const provider = providers.get(kind);
    if (!provider) throw new Error(`No data provider is registered for "${kind}".`);
    return provider;
  }

  function kinds() {
    return [...providers.keys()].sort();
  }

  const api = Object.freeze({ register, resolve, kinds });
  for (const provider of initialProviders) register(provider);
  return api;
}
```

- [ ] **Step 5: Run the focused test and verify it passes**

Run:

```powershell
node --test tests/dataServiceFoundation.test.js
```

Expected: PASS with 4 tests and 0 failures.

- [ ] **Step 6: Commit the request and registry boundary**

```powershell
git add src/data/sourceRequest.js src/data/providerRegistry.js tests/dataServiceFoundation.test.js
git commit -m "feat: define data source request and provider contracts"
```

---

### Task 2: Immutable Snapshot Cache, Leases, Failures, and Measurements

**Files:**
- Create: `src/data/dataService.js`
- Modify: `tests/dataServiceFoundation.test.js`

**Interfaces:**
- Consumes: `normalizeSourceRequest`, a validated `dataSources` record, a provider registry, optional profiles/portable sources, and an optional shared cache.
- Produces: `createSourceCache()`, `createDataService(options)`, and `DataService` methods `getSnapshot`, `load`, `acquire`, `retry`, `evict`, `hydrateAll`, and `inspect`.
- A snapshot is a frozen `{ sourceId, status, revision, data, profile, error, leaseCount, loadedAt, loadDurationMs, estimatedBytes }` wrapper.
- Shared cache entries own provider state, payloads, provider-derived profiles, promises, revisions, and leases. A service overlays its own tracked profile when it publishes a snapshot, so raw-data reuse cannot leak another dashboard's profile metadata.
- `#startLoad` assigns the guarded in-flight promise before emitting `source-load-start`, and provider resolution occurs inside that guarded chain. Re-entrant loads therefore reuse a real promise, and a missing provider publishes a normal retryable error snapshot.
- `hydrateAll` produces `{ loadedData, profiles }` without cloning provider payloads.

- [ ] **Step 1: Add failing service-state and in-flight reuse tests**

Append to `tests/dataServiceFoundation.test.js`:

```js
import {
  createDataService,
  createSourceCache,
} from "../src/data/dataService.js";

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
```

- [ ] **Step 2: Add failing lease, eviction, failure-isolation, and event tests**

Append:

```js
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
```

- [ ] **Step 3: Run the focused tests and verify they fail**

Run:

```powershell
node --test tests/dataServiceFoundation.test.js
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/data/dataService.js`.

- [ ] **Step 4: Implement the source cache and service state machine**

Create `src/data/dataService.js` with the following implementation. Keep event
payloads metadata-only and do not clone `result.data`:

> **Approved preflight correction:** The code below is an implementation
> outline, not permission to cache caller-owned tracked profiles. Cache the
> provider state and provider-derived profile, and materialize each service's
> frozen snapshot with that service's tracked profile when the provider did not
> return one. Assign the complete guarded `entry.promise` before emitting
> `source-load-start`, and resolve the provider inside that promise chain so
> registry failures follow the normal error/retry path. In-flight reuse means
> one provider operation and one payload reference; service-specific snapshot
> wrappers do not need to be reference-equal across service instances.

```js
import { normalizeSourceRequest } from "./sourceRequest.js";

export function createSourceCache() {
  return Object.freeze({
    entries: new Map(),
    revisions: new Map(),
  });
}

export function createDataService(options) {
  return new DataService(options);
}

export class DataService {
  #cache;
  #cacheKeys;
  #dataSources;
  #identityProfiles;
  #now;
  #onEvent;
  #portableSources;
  #profiles;
  #providers;
  #scopeId;

  constructor({
    dataSources,
    profiles = {},
    portableSources = {},
    providers,
    cache = createSourceCache(),
    scopeId = null,
    now = () => globalThis.performance?.now?.() ?? Date.now(),
    onEvent = () => {},
  }) {
    if (!dataSources || typeof dataSources !== "object") {
      throw new TypeError("DataService dataSources are required.");
    }
    if (!providers || typeof providers.resolve !== "function") {
      throw new TypeError("DataService provider registry is required.");
    }
    this.#dataSources = dataSources;
    this.#cacheKeys = new Set();
    this.#identityProfiles = { ...profiles };
    this.#profiles = { ...profiles };
    this.#portableSources = portableSources ?? {};
    this.#providers = providers;
    this.#cache = cache;
    this.#scopeId = scopeId ?? nextDataServiceScopeId();
    this.#now = now;
    this.#onEvent = onEvent;
  }

  getSnapshot(input) {
    const request = this.#request(input);
    return this.#entry(request).snapshot;
  }

  load(input) {
    const request = this.#request(input);
    const entry = this.#entry(request);
    entry.lastUsedAt = this.#now();
    if (entry.snapshot.status === "ready") {
      this.#emit("source-cache-hit", request, entry.snapshot);
      return Promise.resolve(entry.snapshot);
    }
    if (entry.snapshot.status === "loading") {
      this.#emit("source-inflight-reuse", request, entry.snapshot);
      return entry.promise;
    }
    if (entry.snapshot.status === "error") {
      return Promise.reject(entry.snapshot.error);
    }
    return this.#startLoad(request, entry);
  }

  acquire(input) {
    const request = this.#request(input);
    const entry = this.#entry(request);
    const token = Symbol(request.purpose);
    entry.leases.add(token);
    this.#publish(entry, {
      ...entry.snapshot,
      leaseCount: entry.leases.size,
    });
    this.#emit("source-lease-acquired", request, entry.snapshot);
    const ready = this.load(request);
    let released = false;
    return Object.freeze({
      sourceId: request.sourceId,
      purpose: request.purpose,
      ready,
      get snapshot() {
        return entry.snapshot;
      },
      release: () => {
        if (released) return;
        released = true;
        entry.leases.delete(token);
        this.#publish(entry, {
          ...entry.snapshot,
          leaseCount: entry.leases.size,
        });
        this.#emit("source-lease-released", request, entry.snapshot);
      },
    });
  }

  retry(input) {
    const request = this.#request(input);
    const entry = this.#entry(request);
    if (entry.snapshot.status === "loading") return entry.promise;
    if (entry.snapshot.status !== "error") return this.load(request);
    this.#publish(entry, unloadedSnapshot(
      request.sourceId,
      entry.snapshot.profile,
      entry.leases.size,
      entry.snapshot.revision,
    ));
    return this.#startLoad(request, entry);
  }

  evict(input) {
    const request = this.#request(input);
    const entry = this.#cache.entries.get(request.cacheKey);
    if (!entry) return true;
    if (entry.leases.size > 0 || entry.snapshot.status === "loading") return false;
    this.#cache.entries.delete(request.cacheKey);
    this.#emit("source-evicted", request, entry.snapshot);
    return true;
  }

  async hydrateAll({ purpose = "compatibility" } = {}) {
    const loadedData = {};
    const profiles = { ...this.#profiles };
    for (const sourceId of Object.keys(this.#dataSources)) {
      const snapshot = await this.load({ sourceId, purpose });
      loadedData[sourceId] = snapshot.data;
      if (snapshot.profile) profiles[sourceId] = snapshot.profile;
    }
    return { loadedData, profiles };
  }

  inspect() {
    const entries = [...this.#cacheKeys]
      .map((cacheKey) => this.#cache.entries.get(cacheKey))
      .filter(Boolean);
    return Object.freeze(entries.map((entry) => (
      Object.freeze({
        sourceId: entry.snapshot.sourceId,
        status: entry.snapshot.status,
        revision: entry.snapshot.revision,
        leaseCount: entry.snapshot.leaseCount,
        loadedAt: entry.snapshot.loadedAt,
        loadDurationMs: entry.snapshot.loadDurationMs,
        estimatedBytes: entry.snapshot.estimatedBytes,
        lastUsedAt: entry.lastUsedAt,
      })
    )));
  }

  #request(input) {
    const sourceId = typeof input === "string" ? input : input?.sourceId;
    return normalizeSourceRequest(input, {
      descriptor: this.#dataSources[sourceId],
      profile: this.#identityProfiles[sourceId],
      portableSource: this.#portableSources[sourceId],
      scopeId: this.#scopeId,
    });
  }

  #entry(request) {
    this.#cacheKeys.add(request.cacheKey);
    let entry = this.#cache.entries.get(request.cacheKey);
    if (!entry) {
      entry = {
        cacheKey: request.cacheKey,
        leases: new Set(),
        promise: null,
        lastUsedAt: this.#now(),
        snapshot: unloadedSnapshot(
          request.sourceId,
          this.#profiles[request.sourceId] ?? null,
          0,
          this.#cache.revisions.get(request.cacheKey) ?? 0,
        ),
      };
      this.#cache.entries.set(request.cacheKey, entry);
    }
    return entry;
  }

  #startLoad(request, entry) {
    const startedAt = this.#now();
    this.#publish(entry, {
      ...entry.snapshot,
      status: "loading",
      data: null,
      error: null,
      loadedAt: null,
      loadDurationMs: null,
      estimatedBytes: null,
    });
    this.#emit("source-load-start", request, entry.snapshot);
    const provider = this.#providers.resolve(request.providerKind);
    entry.promise = Promise.resolve()
      .then(() => provider.load(request))
      .then((result) => {
        if (!result || !Object.hasOwn(result, "data")) {
          throw new Error(`Data provider "${provider.kind}" returned no data.`);
        }
        const profile = result.profile ?? entry.snapshot.profile ?? null;
        if (profile) this.#profiles[request.sourceId] = profile;
        const revision = (this.#cache.revisions.get(request.cacheKey) ?? 0) + 1;
        this.#cache.revisions.set(request.cacheKey, revision);
        const finishedAt = this.#now();
        this.#publish(entry, {
          sourceId: request.sourceId,
          status: "ready",
          revision,
          data: result.data,
          profile,
          error: null,
          leaseCount: entry.leases.size,
          loadedAt: finishedAt,
          loadDurationMs: finishedAt - startedAt,
          estimatedBytes: result.estimatedBytes ?? null,
        });
        entry.promise = null;
        this.#emit("source-load-ready", request, entry.snapshot);
        return entry.snapshot;
      })
      .catch((error) => {
        const finishedAt = this.#now();
        this.#publish(entry, {
          sourceId: request.sourceId,
          status: "error",
          revision: entry.snapshot.revision,
          data: null,
          profile: entry.snapshot.profile,
          error: error instanceof Error ? error : new Error(String(error)),
          leaseCount: entry.leases.size,
          loadedAt: null,
          loadDurationMs: finishedAt - startedAt,
          estimatedBytes: null,
        });
        entry.promise = null;
        this.#emit("source-load-error", request, entry.snapshot);
        throw entry.snapshot.error;
      });
    return entry.promise;
  }

  #publish(entry, value) {
    entry.snapshot = Object.freeze(value);
  }

  #emit(type, request, snapshot) {
    const event = Object.freeze({
      type,
      sourceId: request.sourceId,
      purpose: request.purpose,
      providerKind: request.providerKind,
      status: snapshot.status,
      revision: snapshot.revision,
      leaseCount: snapshot.leaseCount,
      durationMs: snapshot.loadDurationMs,
      estimatedBytes: snapshot.estimatedBytes,
    });
    try {
      this.#onEvent(event);
    } catch {
      // Diagnostics cannot interrupt dashboard data delivery.
    }
  }
}

function unloadedSnapshot(sourceId, profile, leaseCount, revision) {
  return Object.freeze({
    sourceId,
    status: "unloaded",
    revision,
    data: null,
    profile,
    error: null,
    leaseCount,
    loadedAt: null,
    loadDurationMs: null,
    estimatedBytes: null,
  });
}

let scopeSequence = 0;

function nextDataServiceScopeId() {
  scopeSequence += 1;
  return `data-service-${scopeSequence}`;
}
```

- [ ] **Step 5: Run the focused tests and correct only contract-level defects**

Run:

```powershell
node --test tests/dataServiceFoundation.test.js
```

Expected: PASS with 14 tests and 0 failures. If the count differs because Node
reports nested assertions differently, require every named test above to pass.

- [ ] **Step 6: Commit the service state machine**

```powershell
git add src/data/dataService.js tests/dataServiceFoundation.test.js
git commit -m "feat: add immutable demand-driven data service"
```

---

### Task 3: Extract Dashboard Source Providers and Preserve Eager Loading

**Files:**
- Create: `src/data/dashboardSourceProviders.js`
- Modify: `src/lib/loadDashboard.js:1-205`
- Modify: `src/lib/loadDashboard.js:loadDataSource through parsePortableSource helpers`
- Modify: `tests/dataServiceFoundation.test.js`
- Modify: `tests/datasetProfilesV3.test.js:630-687`

**Interfaces:**
- Consumes: current `loadCsv`, `parseCsvText`, `profileDataset`, `fetchJson`, `sourceUrl`, and `validateGeoJson` authorities through explicit dependencies.
- Produces: `createDashboardSourceProviders(dependencies)` returning providers for `csv`, `uploadedCsv`, `inline`, and `geojson`.
- `loadDashboardConfig` constructs a service, calls `hydrateAll({ purpose: "compatibility" })`, validates time-sync groups with the returned rows/profiles, and returns the same public hydrated dashboard shape as before.
- One module-scoped `dashboardSourceCache` reuses tracked and explicitly fingerprinted sources across loader calls while moving ownership from the legacy loader to the service. Unfingerprinted uploaded/inline and portable payloads remain service-scoped in this foundation so stale content cannot cross dashboard instances without adding payload hashing.

- [ ] **Step 1: Add failing provider tests**

Append to `tests/dataServiceFoundation.test.js`:

```js
import { createDashboardSourceProviders } from "../src/data/dashboardSourceProviders.js";

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
```

- [ ] **Step 2: Run the provider tests and verify they fail**

Run:

```powershell
node --test tests/dataServiceFoundation.test.js
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for
`src/data/dashboardSourceProviders.js`.

- [ ] **Step 3: Implement the four dashboard providers**

Create `src/data/dashboardSourceProviders.js`:

```js
export function createDashboardSourceProviders({
  loadCsv,
  parseCsvText,
  profileDataset,
  fetchJson,
  sourceUrl,
  validateGeoJson,
}) {
  return [
    {
      kind: "csv",
      async load(request) {
        const { sourceId, descriptor, portableSource } = request;
        if (portableSource) {
          requirePortableKind(sourceId, portableSource, "csv");
          if (typeof portableSource.text !== "string") {
            throw new Error(`Portable CSV source "${sourceId}" is invalid.`);
          }
          return {
            data: parseCsvText(portableSource.text, descriptor.path),
            estimatedBytes: portableSource.text.length * 2,
          };
        }
        return { data: await loadCsv(sourceUrl(descriptor.path)) };
      },
    },
    {
      kind: "uploadedCsv",
      async load({ sourceId, descriptor }) {
        const data = parseCsvText(
          descriptor.csvText,
          descriptor.fileName ?? `${sourceId}.csv`,
        );
        return {
          data,
          profile: profileDataset(data, descriptor.parsingMetadata ?? {}),
          estimatedBytes: descriptor.csvText.length * 2,
        };
      },
    },
    {
      kind: "inline",
      async load({ descriptor }) {
        const data = structuredClone(descriptor.rows);
        return {
          data,
          profile: profileDataset(data, descriptor.parsingMetadata ?? {}),
        };
      },
    },
    {
      kind: "geojson",
      async load(request) {
        const { sourceId, descriptor, portableSource } = request;
        const data = portableSource
          ? portableGeoJson(sourceId, portableSource)
          : await fetchJson(
              sourceUrl(descriptor.path),
              `data file: ${descriptor.path}`,
            );
        validateGeoJson(data, `Data source "${sourceId}" GeoJSON`);
        return { data };
      },
    },
  ];
}

function requirePortableKind(sourceId, portableSource, expectedKind) {
  if (portableSource.kind !== expectedKind) {
    throw new Error(
      `Portable data source "${sourceId}" does not match its descriptor.`,
    );
  }
}

function portableGeoJson(sourceId, portableSource) {
  requirePortableKind(sourceId, portableSource, "geojson");
  return structuredClone(portableSource.data);
}
```

- [ ] **Step 4: Run the focused provider/service tests**

Run:

```powershell
node --test tests/dataServiceFoundation.test.js
```

Expected: PASS with 11 tests and 0 failures.

- [ ] **Step 5: Route `loadDashboardConfig` through the service**

In `src/lib/loadDashboard.js`, replace the current loader imports and
module-global `dataSourceCache` with:

```js
import { createDashboardSourceProviders } from "../data/dashboardSourceProviders.js";
import { createDataService, createSourceCache } from "../data/dataService.js";
import { createProviderRegistry } from "../data/providerRegistry.js";
import { loadCsv, parseCsvText } from "./loadCsv.js";

const dashboardSourceCache = createSourceCache();
```

Keep all existing validation before hydration. Replace
`const hydratedProfiles = structuredClone(reusableProfiles);` and the complete
loop that creates `loadedData` and derives inline/upload profiles with:

```js
  const providers = createProviderRegistry(createDashboardSourceProviders({
    loadCsv,
    parseCsvText,
    profileDataset,
    fetchJson,
    sourceUrl,
    validateGeoJson,
  }));
  const dataService = createDataService({
    dataSources,
    profiles: reusableProfiles,
    portableSources,
    providers,
    cache: dashboardSourceCache,
  });
  const {
    loadedData,
    profiles: hydratedProfiles,
  } = await dataService.hydrateAll({ purpose: "compatibility" });
```

Keep the existing `validateTimeSyncGroups` call and returned object unchanged,
using the new `loadedData` and `hydratedProfiles` variables:

```js
  validateTimeSyncGroups(dashboard.timeSyncGroups ?? [], {
    charts: chartReferences.map(({ chart }) => chart),
    loadedData,
    profiles: hydratedProfiles,
  });

  return {
    ...dashboard,
    dataSources,
    datasetProfiles: hydratedProfiles,
    loadedData,
  };
```

Delete the obsolete `loadDataSource`, `loadDataSourceFresh`,
`dataSourceCacheKey`, and `parsePortableSource` functions. Retain `fetchJson`,
`sourceUrl`, `portableDashboard`, and `usingFileProtocol`, because bootstrap and
the new provider dependencies still use them.

- [ ] **Step 6: Strengthen the existing loader compatibility test**

In `tests/datasetProfilesV3.test.js`, within
`runtime loads descriptors with faithfully hydrated reusable profiles`, add a
`requestedUrls` array before the fetch stub and record each URL:

```js
  const requestedUrls = [];
  globalThis.fetch = async (url) => {
    requestedUrls.push(String(url));
```

After the existing profile assertions, add:

```js
    assert.deepEqual(requestedUrls, [
      "/data/cases.csv",
      "/data/regions.geojson",
    ]);
```

Add one focused loader integration test containing both an uploaded CSV source
and an inline source with temporal parsing metadata. Assert that
`loadDashboardConfig` returns their parsed/cloned rows, derives their current
profiles with the configured temporal interpretation, and preserves the public
`{ ...dashboard, dataSources, datasetProfiles, loadedData }` shape. This is a
compatibility test, not a new validation or caching subsystem.

Keep the provider's existing kind, CSV text, and GeoJSON validation. Do not add
new hostile-object/accessor hardening or payload hashing in this task.

- [ ] **Step 7: Run focused compatibility tests**

Run:

```powershell
node --test tests/dataServiceFoundation.test.js tests/datasetProfilesV3.test.js
```

Expected: PASS with all tests in both files and 0 failures. Specifically confirm
that malformed GeoJSON is still rejected, portable payloads remain
deterministic, uploaded/inline profiles are hydrated, and the tracked CSV and
GeoJSON outputs match the pre-refactor shapes.

- [ ] **Step 8: Commit provider extraction and eager compatibility**

```powershell
git add src/data/dashboardSourceProviders.js src/lib/loadDashboard.js tests/dataServiceFoundation.test.js tests/datasetProfilesV3.test.js
git commit -m "refactor: hydrate dashboard sources through data service"
```

---

### Task 4: Document Runtime Authority and Verify the Foundation

**Files:**
- Modify: `docs/chart-data-system-v3.md`
- Test: `tests/dataServiceFoundation.test.js`
- Test: `tests/datasetProfilesV3.test.js`

**Interfaces:**
- Consumes: the completed foundation and approved design at `docs/superpowers/specs/2026-08-01-demand-driven-data-service-design.md`.
- Produces: an authoritative runtime-source section, explicit compatibility/deprecation language for `loadedData`, and exact verification evidence at the branch tip.

- [ ] **Step 1: Update the authoritative module table**

In `docs/chart-data-system-v3.md`, add these rows beneath dataset profiling:

```markdown
| Runtime source readiness and caching | `src/data/dataService.js` |
| Source request normalization | `src/data/sourceRequest.js` |
| Runtime provider registration | `src/data/providerRegistry.js` |
| Packaged/manual source providers | `src/data/dashboardSourceProviders.js` |
```

- [ ] **Step 2: Document the foundation boundary**

Add this section immediately after `## Source contracts and profiling` and its
current content:

```markdown
## Runtime source lifecycle

All runtime source loading passes through `DataService`. The service publishes
immutable `unloaded`, `loading`, `ready`, and `error` snapshot wrappers, reuses
equivalent in-flight and ready loads, and records active consumer leases. Large
row and GeoJSON payloads are read-only by contract rather than recursively
frozen or cloned.

Providers translate transport-specific source records into tabular rows or a
validated GeoJSON `FeatureCollection`. Providers do not filter, aggregate,
interpolate, consolidate duplicates, or produce chart marks. Those operations
remain in `prepareChartData.js` and the family preparers.

The initial compatibility stage still calls `hydrateAll()` and exposes
`dashboard.loadedData` so existing dashboard, authoring, fullscreen, and
playback consumers behave unchanged. `loadedData` is a temporary runtime
compatibility object, not a persisted contract. Consumer migrations will
replace direct reads with explicit page, wizard, editor, fullscreen, and
playback demand before the compatibility object is removed.

Tracked profiles remain available before their CSV rows are loaded. Uploaded
CSV and inline sources receive a profile when their first ready revision is
published. Measurement events are local metadata-only hooks; they never include
source rows and do not perform network telemetry.
```

- [ ] **Step 3: Run focused tests once more at the final source state**

Run:

```powershell
node --test tests/dataServiceFoundation.test.js tests/datasetProfilesV3.test.js
```

Expected: PASS with 0 failures.

- [ ] **Step 4: Run the complete unit suite**

Run:

```powershell
pnpm test
```

Expected: PASS with 0 failures. Do not claim a count copied from an earlier
commit; record the actual count printed by this run in the task handoff.

- [ ] **Step 5: Build the production artifact**

Run:

```powershell
pnpm build
```

Expected: exit code 0, with dataset profiles, portable data, Quorum catalogue,
and Vite production output generated successfully.

- [ ] **Step 6: Run browser regression coverage because bootstrap changed**

Run:

```powershell
pnpm test:e2e -- --project=chromium
```

Expected: PASS with 0 failures. This is one end-of-slice browser run, not a full
E2E run after each implementation step.

- [ ] **Step 7: Inspect the final diff and ensure the semantic pipeline is untouched**

Run:

```powershell
git diff --check
git diff --stat b7de939..HEAD
git status --short
```

Expected: `git diff --check` exits 0; the source diff is limited to the new data
service modules, `loadDashboard.js`, focused tests, and documentation; no file
under `src/charting/data/prepareChartData.js` or its family preparers changed.

- [ ] **Step 8: Commit the documentation**

```powershell
git add docs/chart-data-system-v3.md
git commit -m "docs: describe demand-driven source lifecycle"
```

- [ ] **Step 9: Record exact-tip verification for review**

Run:

```powershell
git rev-parse HEAD
git status --short
```

Expected: print the exact commit under review and an empty status. Report the
actual unit, build, and E2E outcomes together with this commit; do not merge,
push, or deploy without the user's approval.

---

## Foundation Exit Criteria

- `loadDashboardConfig` still returns fully populated `loadedData` and hydrated
  profiles to every existing consumer.
- The source transport implementation has moved out of `loadDashboard.js` and
  all four current source forms use registered providers.
- Equivalent concurrent requests and equivalent source identities reuse one
  provider result.
- Snapshot wrappers expose explicit readiness, revision, lease, timing, error,
  and size metadata without copying payloads.
- Failures are source-local and retryable.
- Leased or loading entries cannot be evicted.
- Tracked profiles remain reusable and inline/upload profiles derive once per
  ready revision.
- Existing time-sync and GeoJSON validation receive the same hydrated inputs as
  before.
- The complete unit suite, production build, and one Chromium E2E run pass at
  the exact reviewed commit.
- No consumer has yet been converted to lazy demand; that work begins only in
  the next plan, after this compatibility foundation is reviewed.
