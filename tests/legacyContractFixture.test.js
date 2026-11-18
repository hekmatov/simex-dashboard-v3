import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createHash } from "node:crypto";
import { serializeDashboardBundle } from "../src/charting/config/dashboardBundleV3.js";
import { loadDashboardConfig } from "../src/lib/loadDashboard.js";
import { buildChartCatalogueSnapshot, canonicalCatalogueBytes, catalogueMatchesDashboardSnapshot } from "../src/lib/quorumCatalogue.js";
import { LEGACY_STORAGE_STATE, legacyAliases, legacyCatalogue, legacyContractResponse, legacyDashboard, legacyProfiles } from "./e2e/support/legacyContractFixture.js";

const selected = { headers: { cookie: "unrelated=1; simex-e2e-fixture=legacy-contract" } };

test("historical contract fixture is explicit and cannot replace unselected shipped requests", () => {
  for (const pathname of ["/config/dashboard.json", "/config/dataset-profiles.json", "/integration/quorum-chart-catalogue.json"]) {
    assert.equal(legacyContractResponse({ headers: {} }, pathname), null);
    assert.equal(legacyContractResponse({ headers: { cookie: "simex-e2e-fixture=fable-m0" } }, pathname), null);
  }
  assert.equal(legacyContractResponse(selected, "/config/dashboard.json"), legacyDashboard);
  assert.equal(legacyContractResponse(selected, "/config/dataset-profiles.json"), legacyProfiles);
  // Retain original property order as well as values: the existing storage
  // comparison uses serialized profile identity during save/reload.
  assert.notEqual(JSON.stringify(legacyProfiles), JSON.stringify(legacyDashboard.datasetProfiles));
  assert.equal(legacyContractResponse(selected, "/integration/quorum-chart-catalogue.json"), legacyCatalogue);
  assert.equal(legacyContractResponse(selected, "/config/chart-aliases.json"), legacyAliases);
  assert.equal(legacyContractResponse(selected, "/data/anything.csv"), null);
  assert.equal(LEGACY_STORAGE_STATE.cookies[0].value, "legacy-contract");
});

test("historical fixture retains native V3 charts, profiles, catalogue and available source bytes", async () => {
  const original = structuredClone({ legacyDashboard, legacyCatalogue, legacyProfiles });
  assert.doesNotThrow(() => serializeDashboardBundle(legacyDashboard, { now: null }));
  const portable = {};
  for (const [id, source] of Object.entries(legacyDashboard.dataSources)) {
    if (source.kind === "csv") portable[id] = { kind: "csv", text: await readFile(new URL(`../public/${source.path}`, import.meta.url), "utf8") };
  }
  for (const media of Object.values(legacyDashboard.contentLibrary.mediaItems)) {
    assert.equal((await readFile(new URL(`../public/${media.current.path}`, import.meta.url))).byteLength, media.byteLength);
  }
  const runtime = await loadDashboardConfig(legacyDashboard, legacyDashboard.datasetProfiles, portable);
  const charts = runtime.pages.flatMap(({ sections }) => sections.flatMap(({ panels }) => panels.map((panel) => panel.chart ?? panel)));
  assert.equal(charts.length, 17);
  assert.ok(charts.every(({ configVersion }) => configVersion === 3));
  assert.ok(charts.some(({ id }) => id === "chart-line-mtgz6v76"));
  assert.ok(JSON.stringify(legacyCatalogue).includes("chart-line-mtgz6v76"));
  const { digest, ...historicalBody } = legacyCatalogue;
  assert.equal(createHash("sha256").update(canonicalCatalogueBytes(historicalBody)).digest("hex"), digest,
    "the archived catalogue retains its original valid byte digest");
  assert.equal(legacyCatalogue.contract_version, "2");
  const currentConfig = serializeDashboardBundle(runtime, { now: null }).config;
  assert.equal(await catalogueMatchesDashboardSnapshot(currentConfig, legacyAliases, legacyCatalogue), false,
    "an archived V2 contract cannot claim to describe the migrated V3 contract");
  const migrated = await buildChartCatalogueSnapshot(currentConfig, legacyAliases);
  assert.equal(migrated.contract_version, "3");
  assert.deepEqual(migrated.charts.map(chart => chart.chart_id), legacyCatalogue.charts.map(chart => chart.chart_id));
  assert.equal(await catalogueMatchesDashboardSnapshot(currentConfig, legacyAliases, migrated), true);
  assert.deepEqual({ legacyDashboard, legacyCatalogue, legacyProfiles }, original, "historical fixtures remain untouched");
  for (const id of Object.keys(portable)) assert.equal(runtime.dataSourceStates[id].status, "ready", id);
});
