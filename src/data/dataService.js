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
  #snapshots;

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
    this.#snapshots = new WeakMap();
  }

  getSnapshot(input) {
    const request = this.#request(input);
    return this.#snapshot(this.#entry(request));
  }

  load(input) {
    const request = this.#request(input);
    const entry = this.#entry(request);
    entry.lastUsedAt = this.#now();
    if (entry.status === "ready") {
      const snapshot = this.#snapshot(entry);
      this.#emit("source-cache-hit", request, entry);
      return Promise.resolve(snapshot);
    }
    if (entry.status === "loading") {
      this.#emit("source-inflight-reuse", request, entry);
      return this.#awaitSnapshot(entry);
    }
    if (entry.status === "error") {
      return Promise.reject(entry.error);
    }
    return this.#startLoad(request, entry);
  }

  acquire(input) {
    const request = this.#request(input);
    const entry = this.#entry(request);
    const token = Symbol(request.purpose);
    entry.leases.add(token);
    this.#touch(entry);
    this.#emit("source-lease-acquired", request, entry);
    const ready = this.load(request);
    const service = this;
    let released = false;
    return Object.freeze({
      sourceId: request.sourceId,
      purpose: request.purpose,
      ready,
      get snapshot() {
        return service.#snapshot(entry);
      },
      release: () => {
        if (released) return;
        released = true;
        entry.leases.delete(token);
        this.#touch(entry);
        this.#emit("source-lease-released", request, entry);
      },
    });
  }

  retry(input) {
    const request = this.#request(input);
    const entry = this.#entry(request);
    if (entry.status === "loading") return this.#awaitSnapshot(entry);
    if (entry.status !== "error") return this.load(request);
    this.#publish(entry, {
      status: "unloaded",
      data: null,
      error: null,
      loadedAt: null,
      loadDurationMs: null,
      estimatedBytes: null,
    });
    return this.#startLoad(request, entry);
  }

  evict(input) {
    const request = this.#request(input);
    const entry = this.#cache.entries.get(request.cacheKey);
    if (!entry) return true;
    if (entry.leases.size > 0 || entry.status === "loading") return false;
    this.#cache.entries.delete(request.cacheKey);
    this.#emit("source-evicted", request, entry);
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
        sourceId: entry.sourceId,
        status: entry.status,
        revision: entry.revision,
        leaseCount: entry.leases.size,
        loadedAt: entry.loadedAt,
        loadDurationMs: entry.loadDurationMs,
        estimatedBytes: entry.estimatedBytes,
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
        sourceId: request.sourceId,
        status: "unloaded",
        revision: this.#cache.revisions.get(request.cacheKey) ?? 0,
        data: null,
        providerProfile: null,
        error: null,
        leases: new Set(),
        promise: null,
        loadedAt: null,
        loadDurationMs: null,
        estimatedBytes: null,
        lastUsedAt: this.#now(),
        version: 0,
      };
      this.#cache.entries.set(request.cacheKey, entry);
    }
    return entry;
  }

  #startLoad(request, entry) {
    const startedAt = this.#now();
    this.#publish(entry, {
      status: "loading",
      data: null,
      error: null,
      loadedAt: null,
      loadDurationMs: null,
      estimatedBytes: null,
    });

    let loadPromise;
    loadPromise = Promise.resolve()
      .then(() => {
        const provider = this.#providers.resolve(request.providerKind);
        return provider.load(request);
      })
      .then((result) => {
        if (!result || !Object.hasOwn(result, "data")) {
          throw new Error(
            `Data provider "${request.providerKind}" returned no data.`,
          );
        }
        const revision = (this.#cache.revisions.get(request.cacheKey) ?? 0) + 1;
        this.#cache.revisions.set(request.cacheKey, revision);
        const finishedAt = this.#now();
        this.#publish(entry, {
          status: "ready",
          revision,
          data: result.data,
          providerProfile: result.profile ?? null,
          error: null,
          loadedAt: finishedAt,
          loadDurationMs: finishedAt - startedAt,
          estimatedBytes: result.estimatedBytes ?? null,
        });
        if (entry.promise === loadPromise) entry.promise = null;
        this.#emit("source-load-ready", request, entry);
        return entry;
      })
      .catch((error) => {
        const normalizedError = error instanceof Error
          ? error
          : new Error(String(error));
        const finishedAt = this.#now();
        this.#publish(entry, {
          status: "error",
          data: null,
          error: normalizedError,
          loadedAt: null,
          loadDurationMs: finishedAt - startedAt,
          estimatedBytes: null,
        });
        if (entry.promise === loadPromise) entry.promise = null;
        this.#emit("source-load-error", request, entry);
        throw normalizedError;
      });
    entry.promise = loadPromise;
    this.#emit("source-load-start", request, entry);
    return this.#awaitSnapshot(entry, loadPromise);
  }

  #awaitSnapshot(entry, promise = entry.promise) {
    return promise.then(() => this.#snapshot(entry));
  }

  #publish(entry, values) {
    Object.assign(entry, values);
    this.#touch(entry);
  }

  #touch(entry) {
    entry.version += 1;
  }

  #snapshot(entry) {
    const profile = entry.providerProfile
      ?? this.#profiles[entry.sourceId]
      ?? null;
    const cached = this.#snapshots.get(entry);
    if (cached?.version === entry.version && cached.profile === profile) {
      return cached.snapshot;
    }
    const snapshot = Object.freeze({
      sourceId: entry.sourceId,
      status: entry.status,
      revision: entry.revision,
      data: entry.data,
      profile,
      error: entry.error,
      leaseCount: entry.leases.size,
      loadedAt: entry.loadedAt,
      loadDurationMs: entry.loadDurationMs,
      estimatedBytes: entry.estimatedBytes,
    });
    this.#snapshots.set(entry, {
      version: entry.version,
      profile,
      snapshot,
    });
    return snapshot;
  }

  #emit(type, request, entry) {
    const event = Object.freeze({
      type,
      sourceId: request.sourceId,
      purpose: request.purpose,
      providerKind: request.providerKind,
      status: entry.status,
      revision: entry.revision,
      leaseCount: entry.leases.size,
      durationMs: entry.loadDurationMs,
      estimatedBytes: entry.estimatedBytes,
    });
    try {
      this.#onEvent(event);
    } catch {
      // Diagnostics cannot interrupt dashboard data delivery.
    }
  }
}

let scopeSequence = 0;

function nextDataServiceScopeId() {
  scopeSequence += 1;
  return `data-service-${scopeSequence}`;
}
