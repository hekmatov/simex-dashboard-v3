import assert from "node:assert/strict";
import test from "node:test";

import { createChartDraft } from "../src/charting/config/chartConfigV3.js";
import { profileDataset } from "../src/charting/data/profileDataset.js";
import { createContentDraftCoordinator } from "../src/content-library/contentDraftTransaction.js";
import {
  commitCsvReplacement,
  prepareCsvReplacement,
} from "../src/content-library/csvReplacementTransaction.js";
import { makeDashboardV5, makeSourceEntry } from "./helpers/contentLibraryFixtures.js";

const ORIGINAL_ROWS = Object.freeze([
  { date: "2026-01-01", cases: 4, municipality: "A" },
  { date: "2026-01-02", cases: 7, municipality: "B" },
]);
const COMPATIBLE_ROWS = Object.freeze([
  { date: "2026-01-01", cases: 8, municipality: "A" },
  { date: "2026-01-02", cases: 11, municipality: "B" },
]);
const CHANGED_TEMPORAL_ROWS = Object.freeze([
  { date: "2026-02-01", cases: 8, municipality: "A" },
  { date: "2026-02-02", cases: 11, municipality: "B" },
]);

for (const [name, error, code] of [
  ["parse", new Error("CSV parse error in replacement.csv: malformed quote"), "parse-failed"],
  ["size", new Error("CSV upload is too large. The maximum file size is 2097152 bytes."), "size-exceeded"],
]) {
  test(`${name} failure is a typed hard block before mutation`, async () => {
    const dashboard = replacementDashboard();
    const before = structuredClone(dashboard);
    const plan = await prepareCsvReplacement({
      dashboard,
      sourceId: "cases",
      file: fileLike("replacement.csv", "ignored"),
      parseCandidate: async () => { throw error; },
    });
    assert.equal(plan.status, "blocked");
    assert.equal(plan.reason.code, code);
    assert.equal(plan.canImportAsNew, false);
    assert.deepEqual(dashboard, before);
  });
}

test("unsafe candidate keys hard-block before mutation", async () => {
  const dashboard = replacementDashboard();
  const before = structuredClone(dashboard);
  const rows = [{ date: "2026-02-01", cases: 8, constructor: "unsafe" }];
  const plan = await preparePlan(dashboard, rows);
  assert.equal(plan.status, "blocked");
  assert.equal(plan.reason.code, "unsafe-column");
  assert.deepEqual(dashboard, before);
});

test("missing directly-used encoding columns block every dependent chart and leave map GeoJSON exact", async () => {
  const dashboard = replacementDashboard();
  const before = structuredClone(dashboard);
  const plan = await preparePlan(dashboard, [{ date: "2026-02-01", cases: 8 }]);

  assert.equal(plan.status, "blocked");
  assert.equal(plan.reason.code, "missing-encoding-column");
  assert.deepEqual(plan.reasons.map(({ chartId, fields }) => ({ chartId, fields })), [
    { chartId: "cases-map", fields: ["municipality"] },
  ]);
  assert.equal(plan.canImportAsNew, true);
  assert.notEqual(plan.importSourceId, "cases");
  assert.deepEqual(plan.remapTargets.map(({ panelId }) => panelId), ["cases-map", "cases-trend"]);
  assert.deepEqual(dashboard.dataSources.boundaries, before.dataSources.boundaries);
  assert.deepEqual(dashboard.loadedData.boundaries, before.loadedData.boundaries);
  assert.deepEqual(dashboard, before);
});

test("blocked candidate imports as a distinct source without silently replacing or remapping", async () => {
  const harness = replacementHarness();
  const before = structuredClone(harness.dashboard);
  const plan = await preparePlan(harness.dashboard, [{ date: "2026-02-01", cases: 8 }]);
  harness.coordinator.stageDraft(plan.draft);

  const result = await commitCsvReplacement(plan, {
    mode: "import-as-new",
    contentDraftCoordinator: harness.coordinator,
  });

  assert.equal(result.status, "imported");
  assert.equal(result.sourceId, plan.importSourceId);
  assert.notEqual(result.sourceId, "cases");
  assert.deepEqual(harness.dashboard.dataSources.cases, before.dataSources.cases);
  assert.deepEqual(harness.dashboard.datasetProfiles.cases, before.datasetProfiles.cases);
  assert.deepEqual(harness.dashboard.dataSources.boundaries, before.dataSources.boundaries);
  assert.equal(harness.dashboard.pages[0].sections[0].panels[0].sourceId, "cases");
  assert.equal(harness.dashboard.pages[0].sections[0].panels[1].sourceId, "cases");
  assert.equal(harness.dashboard.contentLibrary.sourceEntries[result.sourceId].sourceId, result.sourceId);
  assert.deepEqual(harness.coordinator.getActiveRetainers().records, []);
});

test("cancel discards the staged candidate and is a dashboard no-op", async () => {
  const harness = replacementHarness();
  const before = structuredClone(harness.dashboard);
  const plan = await preparePlan(harness.dashboard, COMPATIBLE_ROWS);
  harness.coordinator.stageDraft(plan.draft);
  await harness.coordinator.discardDraft(plan.draft.draftId, { reason: "csv-replacement-cancelled" });
  assert.deepEqual(harness.dashboard, before);
  assert.deepEqual(harness.commits, []);
  assert.deepEqual(harness.coordinator.getActiveRetainers().records, []);
});

test("expected-current drift rejects without replacing the newer authority", async () => {
  const harness = replacementHarness();
  const plan = await preparePlan(harness.dashboard, COMPATIBLE_ROWS);
  harness.coordinator.stageDraft(plan.draft);
  harness.dashboard.contentLibrary.sourceEntries.cases.displayName = "Renamed concurrently";
  const before = structuredClone(harness.dashboard);

  await assert.rejects(commitCsvReplacement(plan, {
    contentDraftCoordinator: harness.coordinator,
  }), /stale|authority changed/i);

  assert.deepEqual(harness.dashboard, before);
  assert.deepEqual(harness.commits, []);
  assert.deepEqual(harness.coordinator.getActiveRetainers().records, []);
});

test("compatible non-temporal replacement preserves sourceId, chart V3, and map GeoJSON", async () => {
  const harness = replacementHarness();
  const beforeGeo = structuredClone(harness.dashboard.dataSources.boundaries);
  const plan = await preparePlan(harness.dashboard, COMPATIBLE_ROWS);
  harness.coordinator.stageDraft(plan.draft);

  const result = await commitCsvReplacement(plan, {
    contentDraftCoordinator: harness.coordinator,
  });

  assert.equal(result.status, "committed");
  assert.equal(result.sourceId, "cases");
  assert.equal(harness.dashboard.dataSources.cases.csvText, csvText(COMPATIBLE_ROWS));
  assert.deepEqual(harness.dashboard.loadedData.cases, COMPATIBLE_ROWS);
  assert.equal(harness.dashboard.pages[0].sections[0].panels[0].configVersion, 3);
  assert.equal(harness.dashboard.pages[0].sections[0].panels[1].configVersion, 3);
  assert.deepEqual(harness.dashboard.dataSources.boundaries, beforeGeo);
  assert.deepEqual(harness.coordinator.getActiveRetainers().records, []);
});

test("changed directly-used temporal observations require Task 12 review and cannot commit", async () => {
  const harness = replacementHarness();
  const before = structuredClone(harness.dashboard);
  const plan = await preparePlan(harness.dashboard, CHANGED_TEMPORAL_ROWS);

  assert.equal(plan.status, "requires-temporal-review");
  assert.equal(plan.reason.code, "requires-temporal-review");
  assert.equal(plan.canImportAsNew, false);
  harness.coordinator.stageDraft(plan.draft);
  await assert.rejects(commitCsvReplacement(plan, {
    contentDraftCoordinator: harness.coordinator,
  }), /temporal review/i);
  assert.deepEqual(harness.dashboard, before);
  assert.deepEqual(harness.commits, []);
  await harness.coordinator.discardDraft(plan.draft.draftId, { reason: "task-12-deferred" });
});

test("injected persistence failure rolls back descriptor, profile, entry, rows, and retainers", async () => {
  const harness = replacementHarness({ failCommit: true });
  const before = structuredClone(harness.dashboard);
  const plan = await preparePlan(harness.dashboard, COMPATIBLE_ROWS);
  harness.coordinator.stageDraft(plan.draft);

  await assert.rejects(commitCsvReplacement(plan, {
    contentDraftCoordinator: harness.coordinator,
  }), /persistence failed/);

  assert.deepEqual(harness.dashboard, before);
  assert.deepEqual(harness.coordinator.getActiveRetainers().records, []);
});

async function preparePlan(dashboard, rows) {
  const profile = profileDataset(rows);
  return prepareCsvReplacement({
    dashboard,
    sourceId: "cases",
    candidate: {
      sourceId: "replacement-csv",
      source: uploadedSource("replacement.csv", csvText(rows)),
      profile,
      rows: structuredClone(rows),
    },
  });
}

function replacementDashboard() {
  const profile = profileDataset(ORIGINAL_ROWS);
  const line = createChartDraft("line", {
    id: "cases-trend", title: "Cases trend", sourceId: "cases",
    roles: { measurements: [{ field: "cases", axis: "primary" }], observation: { field: "date", interpretation: "temporal", format: "YYYY-MM-DD" } },
  });
  const map = createChartDraft("choroplethMap", {
    id: "cases-map", title: "Cases map", sourceId: "cases",
    roles: { geography: { field: "municipality", interpretation: "geographic" }, value: { field: "cases" } },
    presentation: { map: { geoSource: "boundaries", joinField: "code" } },
  });
  const boundaries = {
    type: "FeatureCollection",
    features: [{ type: "Feature", properties: { code: "A" }, geometry: null }, { type: "Feature", properties: { code: "B" }, geometry: null }],
  };
  return makeDashboardV5({
    dataSources: {
      cases: uploadedSource("cases.csv", csvText(ORIGINAL_ROWS)),
      boundaries: { kind: "dataset", type: "uploadedGeoJson", fileName: "boundaries.geojson", geoJson: boundaries },
    },
    datasetProfiles: { cases: profile },
    loadedData: { cases: structuredClone(ORIGINAL_ROWS), boundaries },
    contentLibrary: { sourceEntries: {
      cases: makeSourceEntry("csv", { sourceId: "cases", origin: "uploaded", displayName: "Cases", provenance: { fileName: "cases.csv", profileFingerprint: profile.fingerprint } }),
      boundaries: makeSourceEntry("geojson", { sourceId: "boundaries", origin: "uploaded", displayName: "Boundaries", provenance: { fileName: "boundaries.geojson" } }),
    } },
    pages: [{ id: "overview", title: "Overview", sections: [{ id: "response", title: "Response", panels: [line, map] }] }],
  });
}

function replacementHarness({ failCommit = false } = {}) {
  let dashboard = replacementDashboard();
  let failed = false;
  const commits = [];
  const coordinator = createContentDraftCoordinator({
    getDashboard: () => dashboard,
    async commitDashboard(candidate, options) {
      commits.push({ candidate: structuredClone(candidate), options: structuredClone(options) });
      dashboard = structuredClone(candidate);
      if (failCommit && !options?.rollback && !failed) { failed = true; throw new Error("persistence failed"); }
      return dashboard;
    },
    assetStore: {},
  });
  return { coordinator, commits, get dashboard() { return dashboard; } };
}

function uploadedSource(fileName, text) {
  return { kind: "dataset", type: "uploadedCsv", fileName, csvText: text };
}

function csvText(rows) {
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  return [columns.join(","), ...rows.map((row) => columns.map((column) => row[column] ?? "").join(","))].join("\n");
}

function fileLike(name, text) {
  return { name, size: Buffer.byteLength(text), text: async () => text };
}
