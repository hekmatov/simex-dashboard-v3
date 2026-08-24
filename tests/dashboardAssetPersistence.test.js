import assert from "node:assert/strict";
import test from "node:test";

import {
  createBrowserDashboardAssetStore,
  createDashboardAssetPersistence,
  normalizeDashboardAssetStorageError,
  readDashboardStorageWithAssets,
} from "../src/lib/dashboardAssetPersistence.js";
import { normalizeSourceRequest } from "../src/data/sourceRequest.js";

test("dashboard asset persistence removes heavy source payloads and losslessly hydrates them", async () => {
  const memory = createMemoryAssetStore();
  const persistence = createDashboardAssetPersistence({ store: memory.store });
  const dashboard = dashboardWithEmbeddedAssets();

  const prepared = await persistence.prepare(dashboard);

  assert.equal(prepared.storageConfig.dataSources.cases.csvText, undefined);
  assert.match(
    prepared.storageConfig.dataSources.cases.browserAssetId,
    /^sha256-[a-f0-9]{64}$/,
  );
  assert.equal(prepared.storageConfig.dataSources.boundaries.geoJson, undefined);
  assert.match(
    prepared.storageConfig.dataSources.briefing.rows[0].src,
    /^simex-browser-asset:\/\/sha256-[a-f0-9]{64}$/,
  );
  assert.equal(
    JSON.stringify(prepared.storageConfig).includes("municipality,case_count"),
    false,
  );
  assert.equal(
    prepared.runtimeConfig.dataSources.cases.csvText,
    dashboard.dataSources.cases.csvText,
  );
  assert.equal(memory.records.size, 3);

  const hydrated = await persistence.hydrate(prepared.storageConfig);
  assert.equal(hydrated.dataSources.cases.csvText, dashboard.dataSources.cases.csvText);
  assert.deepEqual(hydrated.dataSources.boundaries.geoJson, dashboard.dataSources.boundaries.geoJson);
  assert.equal(hydrated.dataSources.briefing.rows[0].src, dashboard.dataSources.briefing.rows[0].src);
  assert.equal(hydrated.dataSources.briefing.rows[0].alt, "Situation briefing");
  assert.equal(
    Object.hasOwn(hydrated.dataSources.briefing.rows[0], "browserAssetId"),
    false,
  );
  assert.match(
    hydrated.dataSources.briefing.browserImageAssetIds[0],
    /^sha256-[a-f0-9]{64}$/,
  );
});

test("known content-addressed assets are reused without hashing or rewriting large payloads", async () => {
  const memory = createMemoryAssetStore();
  let digestCalls = 0;
  const persistence = createDashboardAssetPersistence({
    store: memory.store,
    digest: async (value) => {
      digestCalls += 1;
      return `digest-${value.length}-${digestCalls}`;
    },
  });

  const first = await persistence.prepare(dashboardWithEmbeddedAssets());
  const firstDigestCalls = digestCalls;
  const firstWrites = memory.putCalls;
  const second = await persistence.prepare(first.runtimeConfig);

  assert.equal(digestCalls, firstDigestCalls);
  assert.equal(memory.putCalls, firstWrites);
  assert.deepEqual(second.storageConfig, first.storageConfig);
});

test("a failed asset stage removes only records created by that stage", async () => {
  const records = new Map();
  const removed = [];
  let puts = 0;
  const store = {
    async get(id) { return records.get(id) ?? null; },
    async put(record) {
      puts += 1;
      if (puts === 2) {
        throw Object.assign(new Error("full"), { name: "QuotaExceededError" });
      }
      records.set(record.id, structuredClone(record));
      return record;
    },
    async remove(id) {
      removed.push(id);
      records.delete(id);
    },
  };
  const persistence = createDashboardAssetPersistence({ store });

  await assert.rejects(
    persistence.prepare(dashboardWithEmbeddedAssets()),
    { code: "DASHBOARD_ASSET_QUOTA_EXHAUSTED" },
  );
  assert.equal(records.size, 0);
  assert.equal(removed.length, 1);
});

test("dashboard asset storage reports unavailable storage and quota separately", () => {
  assert.equal(
    normalizeDashboardAssetStorageError(new Error("unavailable")).code,
    "DASHBOARD_ASSET_STORAGE_UNAVAILABLE",
  );
  assert.equal(
    normalizeDashboardAssetStorageError(
      Object.assign(new Error("full"), { name: "QuotaExceededError" }),
    ).code,
    "DASHBOARD_ASSET_QUOTA_EXHAUSTED",
  );
});

test("browser asset store reports an unavailable IndexedDB boundary distinctly", async () => {
  const store = createBrowserDashboardAssetStore({ indexedDB: null });
  await assert.rejects(store.get("missing"), {
    code: "DASHBOARD_ASSET_STORAGE_UNAVAILABLE",
  });
});

test("a source larger than localStorage becomes a compact persisted reference", async () => {
  const memory = createMemoryAssetStore();
  const persistence = createDashboardAssetPersistence({ store: memory.store });
  const dashboard = dashboardWithEmbeddedAssets();
  dashboard.dataSources.cases.csvText = `municipality,case_count\n${"A,12\n".repeat(1_100_000)}`;

  const prepared = await persistence.prepare(dashboard);
  const serialized = JSON.stringify(prepared.storageConfig);

  assert.ok(dashboard.dataSources.cases.csvText.length > 5 * 1024 * 1024);
  assert.ok(serialized.length < 10_000, `persisted config was ${serialized.length} characters`);
  const restored = await persistence.hydrate(prepared.storageConfig);
  assert.equal(
    restored.dataSources.cases.csvText.length,
    dashboard.dataSources.cases.csvText.length,
  );
});

test("the storage reader hydrates asset references before applying the v3 dashboard boundary", async () => {
  const memory = createMemoryAssetStore();
  const persistence = createDashboardAssetPersistence({ store: memory.store });
  const prepared = await persistence.prepare(validDashboardWithUpload());
  const key = "dashboard-v3";
  const storage = {
    getItem(requestedKey) {
      return requestedKey === key ? JSON.stringify(prepared.storageConfig) : null;
    },
  };

  const restored = await readDashboardStorageWithAssets(storage, key, {
    assets: persistence,
  });

  assert.equal(restored.dataSources.status.csvText, "label,value\nReady,12\n");
  assert.equal(
    restored.dataSources.status.browserAssetId,
    prepared.storageConfig.dataSources.status.browserAssetId,
  );
});

test("embedded image references hydrate through the live image-chart validation boundary", async () => {
  const memory = createMemoryAssetStore();
  const persistence = createDashboardAssetPersistence({ store: memory.store });
  const prepared = await persistence.prepare(validImageDashboard());
  const key = "image-dashboard-v3";

  const restored = await readDashboardStorageWithAssets({
    getItem: () => JSON.stringify(prepared.storageConfig),
  }, key, { assets: persistence });

  assert.equal(
    restored.dataSources.briefing.rows[0].src,
    "data:image/png;base64,aW1hZ2U=",
  );
  assert.equal(
    Object.hasOwn(restored.dataSources.briefing.rows[0], "browserAssetId"),
    false,
  );
});

test("a browser asset id is the stable data-service identity across dashboard reloads", () => {
  const descriptor = {
    kind: "dataset",
    type: "uploadedCsv",
    csvText: "label,value\nReady,12\n",
    browserAssetId: `sha256-${"a".repeat(64)}`,
  };
  const first = normalizeSourceRequest(
    { sourceId: "status", purpose: "dashboard" },
    { descriptor, scopeId: "first-load" },
  );
  const second = normalizeSourceRequest(
    { sourceId: "status", purpose: "dashboard" },
    { descriptor: structuredClone(descriptor), scopeId: "second-load" },
  );

  assert.equal(first.cacheKey, second.cacheKey);
});

function createMemoryAssetStore() {
  const records = new Map();
  const memory = {
    records,
    putCalls: 0,
    store: {
      async get(id) {
        return records.has(id) ? structuredClone(records.get(id)) : null;
      },
      async put(record) {
        memory.putCalls += 1;
        records.set(record.id, structuredClone(record));
        return record;
      },
      async remove(id) {
        records.delete(id);
      },
    },
  };
  return memory;
}

function dashboardWithEmbeddedAssets() {
  return {
    configVersion: 3,
    id: "asset-dashboard",
    title: "Asset dashboard",
    dataSources: {
      cases: {
        kind: "dataset",
        type: "uploadedCsv",
        fileName: "cases.csv",
        csvText: "municipality,case_count\nA,12\nB,18\n",
        provenance: { label: "Uploaded cases" },
      },
      boundaries: {
        kind: "dataset",
        type: "uploadedGeoJson",
        fileName: "boundaries.geojson",
        geoJson: {
          type: "FeatureCollection",
          features: [{
            type: "Feature",
            properties: { municipality: "A" },
            geometry: { type: "Point", coordinates: [4.9, 52.3] },
          }],
        },
        provenance: { label: "Uploaded boundaries" },
      },
      briefing: {
        kind: "inline",
        rows: [{
          src: "data:image/png;base64,aW1hZ2U=",
          alt: "Situation briefing",
          fit: "contain",
        }],
        provenance: { label: "Uploaded briefing" },
      },
      manual: {
        kind: "inline",
        rows: [{ label: "Ready", value: 1 }],
      },
    },
    pages: [],
  };
}

function validDashboardWithUpload() {
  return {
    configVersion: 3,
    id: "stored-dashboard",
    title: "Stored dashboard",
    timezone: "UTC",
    dataSources: {
      status: {
        kind: "dataset",
        type: "uploadedCsv",
        fileName: "status.csv",
        csvText: "label,value\nReady,12\n",
      },
    },
    chronoGroups: [],
    pages: [{
      id: "overview",
      title: "Overview",
      sections: [{
        id: "status-section",
        title: "Status",
        panels: [{
          configVersion: 3,
          id: "status-chart",
          typeId: "pie",
          title: "Status",
          description: "Current status.",
          sourceId: "status",
          roles: {
            category: { field: "label" },
            value: { field: "value" },
          },
          transformations: {
            filters: [],
            grouping: null,
            aggregation: null,
            duplicates: null,
            missingValues: "gap",
          },
          presentation: { title: { align: "left" }, collection: null },
          interaction: { zoom: { enabled: false }, timeSync: null },
          layout: { size: "standard" },
        }],
      }],
    }],
  };
}

function validImageDashboard() {
  return {
    configVersion: 3,
    id: "image-dashboard",
    title: "Image dashboard",
    timezone: "UTC",
    dataSources: {
      briefing: {
        kind: "inline",
        rows: [{
          src: "data:image/png;base64,aW1hZ2U=",
          alt: "Situation briefing",
          fit: "contain",
        }],
      },
    },
    chronoGroups: [],
    pages: [{
      id: "overview",
      title: "Overview",
      sections: [{
        id: "briefing-section",
        title: "Briefing",
        panels: [{
          configVersion: 3,
          id: "briefing-image",
          typeId: "image",
          title: "Situation briefing",
          description: "Current situation briefing.",
          sourceId: "briefing",
          roles: {},
          transformations: {
            filters: [],
            grouping: null,
            aggregation: null,
            duplicates: null,
            missingValues: "gap",
          },
          presentation: { title: { align: "left" }, collection: null },
          interaction: { zoom: { enabled: true }, timeSync: null },
          layout: { size: "standard" },
        }],
      }],
    }],
  };
}
