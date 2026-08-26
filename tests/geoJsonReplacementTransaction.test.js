import assert from "node:assert/strict";
import test from "node:test";

import { createContentDraftCoordinator } from "../src/content-library/contentDraftTransaction.js";
import {
  commitGeoJsonReplacement,
  geoJsonReplacementWarnings,
  prepareGeoJsonReplacement,
} from "../src/content-library/geoJsonReplacementTransaction.js";
import { profileDataset } from "../src/charting/data/profileDataset.js";
import { GEOJSON_LIMITS, SOURCE_GEOJSON_LIMIT_KEYS } from "./helpers/geoJsonBoundaryFixtures.js";
import { makeDashboardV5, makeSourceEntry } from "./helpers/contentLibraryFixtures.js";

test("schema and exactly four resource admission failures hard-block before mutation", async () => {
  const dashboard = replacementDashboard();
  const before = structuredClone(dashboard);
  const malformed = await prepareGeoJsonReplacement({ dashboard, sourceId: "boundaries", candidate: candidate("malformed.geojson", "{"), });
  assert.equal(malformed.status, "blocked");
  assert.equal(malformed.reason.kind, "schema");

  for (const key of SOURCE_GEOJSON_LIMIT_KEYS) {
    const plan = await prepareGeoJsonReplacement({
      dashboard,
      sourceId: "boundaries",
      candidate: candidate(`${key}.geojson`, rejectedFixture(key)),
    });
    assert.equal(plan.status, "blocked", key);
    assert.equal(plan.reason.kind, "admission", key);
    assert.deepEqual(plan.reason.limitKeys, [key], key);
  }
  assert.deepEqual(dashboard, before);
});

test("removed join property and zero usable coverage block atomically with import/remap", async () => {
  const dashboard = replacementDashboard();
  const before = structuredClone(dashboard);
  const missing = await preparePlan(dashboard, collection([point({ other: "A" }, 7, 52)]));
  assert.equal(missing.status, "blocked");
  assert.equal(missing.reason.code, "selected-join-field-absent");
  assert.equal(missing.canImportAsNew, true);
  assert.notEqual(missing.importSourceId, "boundaries");
  assert.deepEqual(missing.remapTargets.map(({ panelId }) => panelId), ["cases-map"]);
  assert.deepEqual(dashboard, before);

  const zero = await preparePlan(dashboard, collection([point({ code: "C" }, 7, 52)]));
  assert.equal(zero.status, "blocked");
  assert.equal(zero.reason.code, "zero-usable-join-coverage");
  assert.deepEqual(dashboard, before);
});

test("historical diagnostics beneath the four gates never independently block", async () => {
  const properties = Object.fromEntries(Array.from({ length: 1_100 }, (_, index) => [`key-${index}`, index]));
  let nested = { leaf: true };
  for (let index = 0; index < 1_500; index += 1) nested = { next: nested };
  properties.code = "A";
  properties.nested = nested;
  properties.containers = Array.from({ length: 5_000 }, () => ({}));
  const plan = await preparePlan(replacementDashboard(), collection([
    { type: "Feature", properties, geometry: { type: "LineString", coordinates: Array.from({ length: 1_500 }, (_, index) => [index / 100, 52]) } },
  ]));
  assert.notEqual(plan.status, "blocked");
  assert.deepEqual(Object.keys(plan.validation.admission.facts), SOURCE_GEOJSON_LIMIT_KEYS);
});

test("geometry and reduced nonzero coverage warnings cancel exactly and confirm atomically without temporal contexts", async () => {
  const harness = replacementHarness();
  const before = structuredClone(harness.dashboard);
  const changed = collection([
    point({ code: "A" }, 8, 53),
    point({ code: "C" }, 9, 53),
    point({ code: "D" }, 10, 53),
  ]);
  const plan = await preparePlan(harness.dashboard, changed);

  assert.equal(plan.status, "requires-confirmation");
  assert.deepEqual(geoJsonReplacementWarnings(plan).map(({ code }) => code), [
    "feature-count-changed",
    "bounding-box-changed",
    "join-coverage-reduced",
  ]);
  harness.coordinator.stageDraft(plan.draft);
  await harness.coordinator.discardDraft(plan.draft.draftId, { reason: "geojson-replacement-cancelled" });
  assert.deepEqual(harness.dashboard, before);
  assert.deepEqual(harness.commits, []);

  const confirmed = await preparePlan(harness.dashboard, changed);
  const result = await commitGeoJsonReplacement(confirmed, {
    confirmWarnings: true,
    contentDraftCoordinator: harness.coordinator,
  });
  assert.equal(result.sourceId, "boundaries");
  assert.deepEqual(harness.dashboard.loadedData.boundaries, changed);
  assert.deepEqual(harness.dashboard.dataSources.boundaries.geoJson, changed);
  assert.equal(harness.dashboard.pages[0].sections[0].panels[0].presentation.map.geoSource, "boundaries");
  assert.deepEqual(harness.dashboard.chronoGroups, before.chronoGroups);
  assert.deepEqual(harness.dashboard.scenes, before.scenes);
  assert.equal(JSON.stringify(harness.dashboard).includes("temporalReview"), false);
  assert.deepEqual(harness.coordinator.getActiveRetainers().records, []);
});

test("blocked candidate imports as a distinct source without silently replacing or remapping", async () => {
  const harness = replacementHarness();
  const before = structuredClone(harness.dashboard);
  const plan = await preparePlan(harness.dashboard, collection([point({ other: "A" }, 7, 52)]));
  harness.coordinator.stageDraft(plan.draft);
  const result = await commitGeoJsonReplacement(plan, { mode: "import-as-new", contentDraftCoordinator: harness.coordinator });

  assert.equal(result.status, "imported");
  assert.notEqual(result.sourceId, "boundaries");
  assert.deepEqual(harness.dashboard.dataSources.boundaries, before.dataSources.boundaries);
  assert.deepEqual(harness.dashboard.loadedData.boundaries, before.loadedData.boundaries);
  assert.equal(harness.dashboard.pages[0].sections[0].panels[0].presentation.map.geoSource, "boundaries");
  assert.deepEqual(harness.dashboard.loadedData[result.sourceId], plan.candidate.geoJson);
  assert.deepEqual(harness.coordinator.getActiveRetainers().records, []);
});

test("expected-current drift and persistence failure preserve the latest exact authority", async () => {
  const drift = replacementHarness();
  const driftPlan = await preparePlan(drift.dashboard, collection([point({ code: "A" }, 7, 53), point({ code: "B" }, 8, 53)]));
  drift.coordinator.stageDraft(driftPlan.draft);
  drift.dashboard.contentLibrary.sourceEntries.boundaries.displayName = "Renamed concurrently";
  const driftBefore = structuredClone(drift.dashboard);
  await assert.rejects(commitGeoJsonReplacement(driftPlan, { confirmWarnings: true, contentDraftCoordinator: drift.coordinator }), /stale|authority changed/i);
  assert.deepEqual(drift.dashboard, driftBefore);
  assert.deepEqual(drift.coordinator.getActiveRetainers().records, []);

  const failing = replacementHarness({ failCommit: true });
  const before = structuredClone(failing.dashboard);
  const plan = await preparePlan(failing.dashboard, collection([point({ code: "A" }, 7, 53), point({ code: "B" }, 8, 53)]));
  await assert.rejects(commitGeoJsonReplacement(plan, { confirmWarnings: true, contentDraftCoordinator: failing.coordinator }), /persistence failed/);
  assert.deepEqual(failing.dashboard, before);
  assert.deepEqual(failing.coordinator.getActiveRetainers().records, []);
});

async function preparePlan(dashboard, geoJson) {
  return prepareGeoJsonReplacement({ dashboard, sourceId: "boundaries", candidate: candidate("replacement.geojson", geoJson) });
}

function replacementDashboard() {
  const rows = [{ municipality: "A", cases: 4 }, { municipality: "B", cases: 7 }];
  const boundaries = collection([point({ code: "A" }, 4, 52), point({ code: "B" }, 5, 52)]);
  return makeDashboardV5({
    dataSources: {
      cases: { kind: "dataset", type: "uploadedCsv", fileName: "cases.csv", csvText: "municipality,cases\nA,4\nB,7" },
      boundaries: { kind: "dataset", type: "uploadedGeoJson", fileName: "boundaries.geojson", geoJson: boundaries },
    },
    datasetProfiles: { cases: profileDataset(rows) },
    loadedData: { cases: rows, boundaries },
    contentLibrary: { sourceEntries: {
      cases: makeSourceEntry("csv", { sourceId: "cases", displayName: "Cases" }),
      boundaries: makeSourceEntry("geojson", { sourceId: "boundaries", origin: "uploaded", displayName: "Boundaries", provenance: { fileName: "boundaries.geojson" } }),
    } },
    chronoGroups: [{ id: "unrelated-group", members: [{ chartId: "cases-map" }] }],
    scenes: [{ id: "unrelated-scene", chartIds: ["cases-map"], present: { chartIds: ["cases-map"] } }],
    pages: [{ id: "overview", title: "Overview", sections: [{ id: "response", title: "Response", panels: [{
      configVersion: 3,
      id: "cases-map",
      typeId: "choroplethMap",
      title: "Cases map",
      sourceId: "cases",
      roles: { geography: { field: "municipality", interpretation: "geographic" }, value: { field: "cases" } },
      presentation: { map: { geoSource: "boundaries", joinField: "code" } },
    }] }] }],
  });
}

function replacementHarness({ failCommit = false } = {}) {
  let dashboard = replacementDashboard();
  let failed = false;
  const commits = [];
  const coordinator = createContentDraftCoordinator({
    getDashboard: () => dashboard,
    async commitDashboard(candidateDashboard, options) {
      commits.push({ candidate: structuredClone(candidateDashboard), options: structuredClone(options) });
      dashboard = structuredClone(candidateDashboard);
      if (failCommit && !options?.rollback && !failed) { failed = true; throw new Error("persistence failed"); }
      return dashboard;
    },
    assetStore: {},
  });
  return { coordinator, commits, get dashboard() { return dashboard; } };
}

function candidate(fileName, geoJson) {
  return { sourceId: "replacement-boundaries", source: { kind: "dataset", type: "uploadedGeoJson", fileName, geoJson }, geoJson };
}

function collection(features) { return { type: "FeatureCollection", features }; }
function point(properties, longitude, latitude) { return { type: "Feature", properties, geometry: { type: "Point", coordinates: [longitude, latitude] } }; }

function rejectedFixture(key) {
  if (key === "encodedBytes") return `${JSON.stringify(collection([point({ code: "A" }, 4, 52)]))}${" ".repeat(GEOJSON_LIMITS.encodedBytes.hardMin)}`;
  if (key === "features") return collection(Array.from({ length: GEOJSON_LIMITS.features.hardMin }, (_, index) => point({ code: String(index) }, index, 0)));
  if (key === "totalPositions") return collection([{ type: "Feature", properties: { code: "A" }, geometry: { type: "LineString", coordinates: Array.from({ length: GEOJSON_LIMITS.totalPositions.hardMin }, (_, index) => [index, 0]) } }]);
  if (key === "renderableFragments") return collection([{ type: "Feature", properties: { code: "A" }, geometry: { type: "MultiLineString", coordinates: Array.from({ length: GEOJSON_LIMITS.renderableFragments.hardMin }, (_, index) => [[index, 0], [index, 1]]) } }]);
  throw new Error(`Unknown GeoJSON admission metric "${key}".`);
}
