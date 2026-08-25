import * as echarts from "echarts";
import { validateGeoJson } from "/src/lib/loadDashboard.js";
import { prepareDashboardPackageExport } from "/src/lib/dashboardPackageExport.js";
import { parseDashboardPackageCandidate } from "/src/lib/dashboardPackageCandidate.js";
import { serializeDashboardBundle } from "/src/charting/config/dashboardBundleV3.js";
import {
  fixtureFor,
  fixtureMetadata,
  summarizeGeoJson,
} from "./fixture-generator.mjs";

const status = document.querySelector("#status");
const maps = document.querySelector("#maps");
const longTasks = [];
if (globalThis.PerformanceObserver?.supportedEntryTypes?.includes("longtask")) {
  const observer = new PerformanceObserver((list) => {
    longTasks.push(...list.getEntries().map((entry) => ({
      startTime: entry.startTime,
      duration: entry.duration,
    })));
  });
  observer.observe({ type: "longtask", buffered: true });
}

window.calibrationHarness = Object.freeze({
  environment() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: navigator.deviceMemory ?? null,
      heapLimitBytes: performance.memory?.jsHeapSizeLimit ?? null,
      longTaskObserver: globalThis.PerformanceObserver?.supportedEntryTypes?.includes("longtask") ?? false,
    };
  },
  async loadProjectFixture(path) {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error(`Fixture read failed: ${response.status}`);
    const text = await response.text();
    return { text, geoJson: JSON.parse(text) };
  },
  async measureProjectFixture(path, repeats = 7) {
    const samples = [];
    let metadata = null;
    for (let index = 0; index < repeats; index += 1) {
      const beforeLongTask = longTasks.length;
      const heapBefore = performance.memory?.usedJSHeapSize ?? null;
      const readStart = performance.now();
      const response = await fetch(`${path}?run=${index}-${Date.now()}`, { cache: "no-store" });
      const text = await response.text();
      const readMs = performance.now() - readStart;
      const parseStart = performance.now();
      const geoJson = JSON.parse(text);
      const parseMs = performance.now() - parseStart;
      const validateMs = measured(() => validateGeoJson(geoJson, "Calibration GeoJSON"));
      const summaryStart = performance.now();
      const summary = summarizeGeoJson(geoJson);
      const summaryMs = performance.now() - summaryStart;
      const packageResult = await measurePackageRoundTrip(geoJson);
      const mapResult = await measureMap(geoJson, 1);
      const heapAfter = performance.memory?.usedJSHeapSize ?? null;
      metadata ??= {
        id: path.split("/").at(-1),
        encodedBytes: new TextEncoder().encode(text).byteLength,
        ...summary,
      };
      samples.push({
        readMs,
        parseMs,
        validateMs,
        summaryMs,
        ...packageResult,
        ...mapResult,
        heapDeltaBytes: heapBefore === null || heapAfter === null ? null : heapAfter - heapBefore,
        longTasks: longTasks.slice(beforeLongTask),
      });
    }
    return { metadata, samples, phases: aggregateSamples(samples) };
  },
  async measureGeneratedFixture(dimension, value, repeats = 7) {
    const geoJson = fixtureFor(dimension, value);
    const metadata = fixtureMetadata(dimension, value, geoJson);
    const samples = [];
    for (let index = 0; index < repeats; index += 1) {
      const beforeLongTask = longTasks.length;
      const heapBefore = performance.memory?.usedJSHeapSize ?? null;
      const encodeStart = performance.now();
      const text = JSON.stringify(geoJson);
      const encoded = new TextEncoder().encode(text);
      const encodeMs = performance.now() - encodeStart;
      const parseStart = performance.now();
      const parsed = JSON.parse(new TextDecoder().decode(encoded));
      const parseMs = performance.now() - parseStart;
      let validateError = null;
      const validateStart = performance.now();
      try {
        validateGeoJson(parsed, "Calibration GeoJSON");
      } catch (error) {
        validateError = error.message;
      }
      const validateMs = performance.now() - validateStart;
      let summaryError = null;
      const summaryStart = performance.now();
      try {
        summarizeGeoJson(parsed);
      } catch (error) {
        summaryError = error.message;
      }
      const summaryMs = performance.now() - summaryStart;
      const persistence = await measurePersistence(text);
      const packageResult = await measurePackageRoundTrip(parsed);
      const mapCount = dimension === "concurrentMaps" ? value : 1;
      const mapResult = await measureMap(parsed, mapCount);
      const rollback = await measureRollback(parsed);
      const heapAfter = performance.memory?.usedJSHeapSize ?? null;
      samples.push({
        encodeMs,
        parseMs,
        validateMs,
        validateError,
        summaryMs,
        summaryError,
        ...persistence,
        ...packageResult,
        ...mapResult,
        ...rollback,
        heapDeltaBytes: heapBefore === null || heapAfter === null ? null : heapAfter - heapBefore,
        longTasks: longTasks.slice(beforeLongTask),
      });
    }
    return { metadata, samples, phases: aggregateSamples(samples) };
  },
  async inspectFixture(dimension, value) {
    const geoJson = fixtureFor(dimension, value);
    validateGeoJson(geoJson, "Checkpoint GeoJSON");
    const metadata = fixtureMetadata(dimension, value, geoJson);
    const mapResult = await measureMap(geoJson, dimension === "concurrentMaps" ? value : 1, true);
    status.textContent = `${metadata.id}: ${metadata.features} features, ${metadata.totalPositions} positions`;
    return {
      status: status.textContent,
      metadata,
      mapResult,
      mapHosts: maps.children.length,
      documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  },
  async inspectProjectFixture(path) {
    const { text, geoJson } = await this.loadProjectFixture(path);
    validateGeoJson(geoJson, "Project checkpoint GeoJSON");
    const metadata = {
      id: path.split("/").at(-1),
      encodedBytes: new TextEncoder().encode(text).byteLength,
      ...summarizeGeoJson(geoJson),
    };
    const mapResult = await measureMap(geoJson, 1, true);
    status.textContent = `${metadata.id}: ${metadata.features} features, ${metadata.totalPositions} positions`;
    return {
      status: status.textContent,
      metadata,
      mapResult,
      mapHosts: maps.children.length,
      documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  },
});

function measured(callback) {
  const start = performance.now();
  callback();
  return performance.now() - start;
}

function aggregateSamples(samples) {
  const numericKeys = [...new Set(samples.flatMap((sample) => Object.keys(sample)))]
    .filter((key) => samples.some((sample) => Number.isFinite(sample[key])));
  return Object.fromEntries(numericKeys.map((key) => {
    const values = samples.map((sample) => sample[key]).filter(Number.isFinite).sort((a, b) => a - b);
    return [key, {
      median: percentile(values, 0.5),
      p95: percentile(values, 0.95),
      max: values.at(-1),
    }];
  }).concat([[
    "longTasks",
    {
      count: samples.reduce((total, sample) => total + (sample.longTasks?.length ?? 0), 0),
      maxDurationMs: Math.max(0, ...samples.flatMap((sample) => sample.longTasks?.map((task) => task.duration) ?? [])),
    },
  ]]));
}

function percentile(values, fraction) {
  if (!values.length) return null;
  const rank = Math.min(values.length - 1, Math.ceil(fraction * values.length) - 1);
  return values[rank];
}

async function measurePersistence(text) {
  const stableStart = performance.now();
  const stableText = stableStringify(JSON.parse(text));
  const stableStringifyMs = performance.now() - stableStart;
  const hashStart = performance.now();
  await crypto.subtle.digest("SHA-256", new TextEncoder().encode(stableText));
  const hashMs = performance.now() - hashStart;
  const database = await openDatabase();
  const writeStart = performance.now();
  await transactionRequest(database, "readwrite", (store) => store.put(text, "fixture"));
  const persistenceWriteMs = performance.now() - writeStart;
  const readStart = performance.now();
  const restored = await transactionRequest(database, "readonly", (store) => store.get("fixture"));
  JSON.parse(restored);
  const persistenceReloadMs = performance.now() - readStart;
  database.close();
  return { stableStringifyMs, hashMs, persistenceWriteMs, persistenceReloadMs };
}

async function measurePackageRoundTrip(geoJson) {
  const dashboard = packageDashboard();
  const exportStart = performance.now();
  const prepared = await prepareDashboardPackageExport(dashboard, {
    readText: async () => "label,value\nReady,1\n",
    readJson: async () => geoJson,
  });
  const bundle = serializeDashboardBundle(prepared.config, { now: "2026-08-25T12:00:00.000Z" });
  const packageExportMs = performance.now() - exportStart;
  const packageText = JSON.stringify(bundle);
  const importStart = performance.now();
  parseDashboardPackageCandidate(packageText);
  const packageImportMs = performance.now() - importStart;
  return { packageExportMs, packageImportMs, packageBytes: new TextEncoder().encode(packageText).byteLength };
}

async function measureMap(geoJson, count, retain = false) {
  disposeMaps();
  const instances = [];
  let mapError = null;
  const registrationStart = performance.now();
  try {
    echarts.registerMap(`calibration-${Date.now()}-${Math.random()}`, geoJson);
  } catch (error) {
    mapError = error.message;
  }
  const mapRegistrationMs = performance.now() - registrationStart;
  const firstUsableStart = performance.now();
  if (!mapError) {
    try {
      for (let index = 0; index < count; index += 1) {
        const host = document.createElement("div");
        host.className = "map-host";
        host.style.height = count > 4 ? "180px" : "300px";
        maps.append(host);
        const name = `calibration-map-${index}-${Date.now()}-${Math.random()}`;
        echarts.registerMap(name, geoJson);
        const instance = echarts.init(host, undefined, { renderer: "canvas" });
        instance.setOption({
          animation: false,
          geo: { map: name, roam: true },
          series: [{ type: "map", map: name, data: [] }],
        }, { notMerge: true, lazyUpdate: false });
        instances.push(instance);
      }
    } catch (error) {
      mapError = error.message;
    }
  }
  await nextPaint();
  const firstUsableMapMs = performance.now() - firstUsableStart;
  const interactionStart = performance.now();
  for (const instance of instances) {
    instance.dispatchAction({ type: "geoRoam", zoom: 1.05, originX: 100, originY: 100 });
    instance.resize();
  }
  await nextPaint();
  const interactionResponseMs = performance.now() - interactionStart;
  const result = {
    mapRegistrationMs,
    firstUsableMapMs,
    interactionResponseMs,
    concurrentMapCount: count,
    ...(mapError ? { mapError } : {}),
  };
  if (!retain) disposeMaps();
  return result;
}

async function measureRollback(geoJson) {
  const before = stableStringify(geoJson);
  const selectedProperty = Object.keys(geoJson.features?.[0]?.properties ?? {})[0] ?? null;
  const compatibilityStart = performance.now();
  const coveredFeatures = selectedProperty === null
    ? 0
    : geoJson.features.filter((feature) => (
      feature.properties?.[selectedProperty] !== null
      && feature.properties?.[selectedProperty] !== undefined
      && feature.properties?.[selectedProperty] !== ""
    )).length;
  const replacementCompatibilityMs = performance.now() - compatibilityStart;
  const replacementJoinCoverageRatio = geoJson.features.length === 0
    ? 0
    : coveredFeatures / geoJson.features.length;
  const invalid = structuredClone(geoJson);
  invalid.features = [];
  const start = performance.now();
  let rejected = false;
  try {
    validateGeoJson(invalid, "Rollback candidate");
  } catch {
    rejected = true;
  }
  const rollbackMs = performance.now() - start;
  const dashboard = packageDashboard();
  const dashboardBefore = stableStringify(dashboard);
  let packageRejected = false;
  try {
    await prepareDashboardPackageExport(dashboard, {
      readText: async () => "label,value\nReady,1\n",
      readJson: async () => {
        throw new Error("injected-geojson-read-failure");
      },
    });
  } catch {
    packageRejected = true;
  }
  return {
    rollbackMs,
    replacementCompatibilityMs,
    replacementJoinCoverageRatio,
    rollbackPreserved: rejected && stableStringify(geoJson) === before ? 1 : 0,
    packageRollbackPreserved: packageRejected && stableStringify(dashboard) === dashboardBefore ? 1 : 0,
  };
}

function disposeMaps() {
  for (const host of maps.querySelectorAll(".map-host")) {
    echarts.getInstanceByDom(host)?.dispose();
  }
  maps.replaceChildren();
}

function nextPaint() {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("simex-geojson-calibration", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("fixtures");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionRequest(database, mode, operation) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction("fixtures", mode);
    const request = operation(transaction.objectStore("fixtures"));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.onerror = () => reject(transaction.error);
  });
}

function packageDashboard() {
  return {
    configVersion: 3,
    id: "calibration-package",
    title: "Calibration package",
    timezone: "UTC",
    dataSources: {
      cases: { kind: "csv", path: "data/cases.csv", provenance: { label: "Cases" } },
      boundaries: { kind: "geojson", path: "data/boundaries.geojson", provenance: { label: "Boundaries" } },
    },
    datasetProfiles: {},
    chronoGroups: [],
    pages: [{
      id: "overview",
      title: "Overview",
      sections: [{ id: "content", title: "Content", panels: [] }],
    }],
  };
}

status.textContent = "Calibration harness ready";

const checkpoint = new URLSearchParams(location.search);
if (checkpoint.has("project") || checkpoint.has("dimension")) {
  const output = document.createElement("pre");
  output.id = "checkpoint-output";
  output.setAttribute("aria-label", "Inspected checkpoint result");
  document.body.append(output);
  try {
    const result = checkpoint.has("project")
      ? await window.calibrationHarness.inspectProjectFixture(checkpoint.get("project"))
      : await window.calibrationHarness.inspectFixture(
        checkpoint.get("dimension"),
        Number(checkpoint.get("value")),
      );
    output.textContent = JSON.stringify(result, null, 2);
  } catch (error) {
    status.textContent = `Checkpoint failed: ${error.message}`;
    output.textContent = JSON.stringify({ error: error.message }, null, 2);
  }
}
