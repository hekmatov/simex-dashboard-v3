import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { buildPortableData } from "../scripts/build-portable-data.mjs";
import { preparePromotedDashboard } from "../scripts/promote-dashboard-bundle.mjs";
import { serializeDashboardBundle } from "../src/charting/config/dashboardBundleV3.js";
import { loadDashboardConfig } from "../src/lib/loadDashboard.js";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const GEO_ID = "geo_netherlands_municipalities_2026";
const fixture = () => readFile(new URL("./fixtures/fable-m0-sources.json", import.meta.url), "utf8").then(JSON.parse);

async function inputTree(t, config, files = []) {
  const parent = path.join(ROOT, "test-results", "m0-sources");
  await mkdir(parent, { recursive: true });
  const rootDir = await mkdtemp(path.join(parent, "fixture-"));
  t.after(() => rm(rootDir, { recursive: true, force: true }));
  const configPath = path.join(rootDir, "public", "config", "dashboard.json");
  const profilesPath = path.join(rootDir, "public", "config", "dataset-profiles.json");
  const outputPath = path.join(rootDir, "portable.js");
  await mkdir(path.dirname(configPath), { recursive: true });
  await writeFile(configPath, JSON.stringify(config));
  await writeFile(profilesPath, JSON.stringify(config.datasetProfiles ?? {}));
  for (const { relativePath, contents } of files) {
    const destination = path.join(rootDir, "public", relativePath);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, contents);
  }
  return { rootDir, configPath, profilesPath, outputPath, embedPortableData: true };
}

test("uploaded GeoJSON, CSV and inline rows remain self-contained portable sources", async (t) => {
  const config = await fixture();
  config.dataSources.inline = { kind: "inline", rows: [{ value: 7 }] };
  const options = await inputTree(t, config);
  const { payload } = await buildPortableData(options);
  assert.deepEqual(payload.config, config);
  assert.deepEqual(payload.sources[GEO_ID], { kind: "geojson", data: config.dataSources[GEO_ID].geoJson });
  assert.deepEqual(payload.sources.cases, { kind: "csv", text: config.dataSources.cases.csvText });
  assert.equal(Object.hasOwn(payload.sources, "briefing"), false);
  assert.equal(Object.hasOwn(payload.sources, "inline"), false);
  const runtime = await loadDashboardConfig(payload.config, payload.datasetProfiles, payload.sources);
  assert.equal(runtime.loadedData[GEO_ID].features[0].id, "GM0473");
  assert.deepEqual(runtime.loadedData.cases, [
    { Date: "2027-02-19", national_total_cases: 1 },
    { Date: "2027-02-20", national_total_cases: 2 },
  ]);
  assert.deepEqual(runtime.loadedData.inline, [{ value: 7 }]);
  assert.equal(runtime.dataSourceStates[GEO_ID].status, "ready");
});

test("package promotion preserves GeoJSON identity and equivalent data through portable loading", async (t) => {
  const config = await fixture();
  const before = structuredClone(config);
  const bundle = serializeDashboardBundle(config, { now: null });
  const promoted = preparePromotedDashboard(JSON.stringify(bundle));
  assert.deepEqual(config, before);
  assert.deepEqual(promoted.config.dataSources[GEO_ID], config.dataSources[GEO_ID]);
  assert.deepEqual(promoted.config.contentLibrary.sourceEntries[GEO_ID], config.contentLibrary.sourceEntries[GEO_ID]);
  assert.equal(promoted.config.dataSources.cases.kind, "csv");
  assert.equal(Object.hasOwn(promoted.config.datasetProfiles, GEO_ID), false);
  const options = await inputTree(t, promoted.config, promoted.files);
  const { payload } = await buildPortableData(options);
  const runtime = await loadDashboardConfig(payload.config, payload.datasetProfiles, payload.sources);
  assert.deepEqual(runtime.loadedData[GEO_ID], config.dataSources[GEO_ID].geoJson);
  assert.equal(runtime.loadedData.cases[1].national_total_cases, 2);
  assert.equal(runtime.dataSourceStates[GEO_ID].status, "ready");
  assert.deepEqual(runtime.runtimeContentHealth.sourceEntries, {});
});

test("tracked GeoJSON assets embed equivalent data and diagnose missing or malformed files", async (t) => {
  const config = await fixture();
  const geoJson = config.dataSources[GEO_ID].geoJson;
  config.dataSources[GEO_ID] = { kind: "geojson", path: "data/boundaries.geojson", provenance: { label: "Fixture boundaries" } };
  delete config.dataSources.cases;
  config.pages[0].sections[0].panels = [];
  const options = await inputTree(t, config);
  await assert.rejects(buildPortableData(options), (error) => {
    assert.match(error.message, /geo_netherlands_municipalities_2026.*data\/boundaries\.geojson/);
    assert.equal(error.cause.code, "ENOENT");
    return true;
  });
  const asset = path.join(options.rootDir, "public", "data", "boundaries.geojson");
  await mkdir(path.dirname(asset), { recursive: true });
  await writeFile(asset, "{broken");
  await assert.rejects(buildPortableData(options), /geo_netherlands_municipalities_2026.*data\/boundaries\.geojson.*JSON/);
  await writeFile(asset, JSON.stringify({ type: "FeatureCollection", features: [] }));
  await assert.rejects(buildPortableData(options), /geo_netherlands_municipalities_2026.*data\/boundaries\.geojson/);
  await writeFile(asset, `\uFEFF${JSON.stringify(geoJson)}`);
  const { payload } = await buildPortableData(options);
  assert.deepEqual(payload.sources[GEO_ID], { kind: "geojson", data: geoJson });
  const runtime = await loadDashboardConfig(payload.config, {}, payload.sources);
  assert.deepEqual(runtime.loadedData[GEO_ID], geoJson);
});

test("invalid embedded GeoJSON fails with its source identity before writing portable output", async (t) => {
  const config = await fixture();
  delete config.dataSources[GEO_ID].geoJson;
  const options = await inputTree(t, config);
  await assert.rejects(buildPortableData(options), /Uploaded GeoJSON source "geo_netherlands_municipalities_2026"/);
  await assert.rejects(readFile(options.outputPath), { code: "ENOENT" });
});
