import assert from "node:assert/strict";
import test from "node:test";

import { createChartDraft } from "../src/charting/config/chartConfigV3.js";
import { profileDataset } from "../src/charting/data/profileDataset.js";
import { createContentDraftCoordinator } from "../src/content-library/contentDraftTransaction.js";
import {
  commitCsvReplacement,
  csvReplacementWarnings,
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

test("changed temporal observations expose exact impacts, cancel exactly, and confirm durable review marks", async () => {
  const harness = replacementHarness();
  const before = structuredClone(harness.dashboard);
  const plan = await preparePlan(harness.dashboard, CHANGED_TEMPORAL_ROWS);

  assert.equal(plan.status, "requires-temporal-review");
  assert.equal(plan.reason.code, "requires-temporal-review");
  assert.equal(plan.canImportAsNew, false);
  assert.deepEqual(plan.impactContexts.map(({ kind, id }) => ({ kind, id })), [
    { kind: "chrono-group", id: "cases-playback" },
    { kind: "scene", id: "cases-scene" },
    { kind: "scene-presentation", id: "cases-scene" },
  ]);
  assert.deepEqual(csvReplacementWarnings(plan).map(({ code }) => code), ["requires-temporal-review"]);
  harness.coordinator.stageDraft(plan.draft);
  await harness.coordinator.discardDraft(plan.draft.draftId, { reason: "csv-replacement-cancelled" });
  assert.deepEqual(harness.dashboard, before);
  assert.deepEqual(harness.commits, []);

  const confirmedPlan = await preparePlan(harness.dashboard, CHANGED_TEMPORAL_ROWS);
  const result = await commitCsvReplacement(confirmedPlan, {
    confirmTemporalReview: true,
    contentDraftCoordinator: harness.coordinator,
  });
  assert.equal(result.sourceId, "cases");
  assert.deepEqual(harness.dashboard.loadedData.cases, CHANGED_TEMPORAL_ROWS);
  assert.deepEqual(harness.dashboard.chronoGroups.find(({ id }) => id === "cases-playback").temporalReview, {
    status: "needs-review", sourceIds: ["cases"],
  });
  const scene = harness.dashboard.scenes.find(({ id }) => id === "cases-scene");
  assert.deepEqual(scene.temporalReview, { status: "needs-review", sourceIds: ["cases"] });
  assert.deepEqual(scene.present.temporalReview, { status: "degraded", sourceIds: ["cases"] });
  assert.equal(harness.dashboard.contentLibrary.sourceEntries.cases.updateStatus, "needs-review");
  assert.equal(Object.hasOwn(harness.dashboard.chronoGroups.find(({ id }) => id === "unrelated-playback"), "temporalReview"), false);
});

test("wrapped placement identity preserves exact temporal impacts and durable marks by chart id", async () => {
  const harness = replacementHarness({ wrappedPlacement: true });
  const plan = await preparePlan(harness.dashboard, CHANGED_TEMPORAL_ROWS);

  assert.deepEqual(plan.impactContexts.map(({ kind, id }) => ({ kind, id })), [
    { kind: "chrono-group", id: "cases-playback" },
    { kind: "scene", id: "cases-scene" },
    { kind: "scene-presentation", id: "cases-scene" },
  ]);
  harness.coordinator.stageDraft(plan.draft);
  await commitCsvReplacement(plan, {
    confirmTemporalReview: true,
    contentDraftCoordinator: harness.coordinator,
  });
  assert.deepEqual(harness.dashboard.chronoGroups.find(({ id }) => id === "cases-playback").temporalReview, {
    status: "needs-review", sourceIds: ["cases"],
  });
  assert.deepEqual(harness.dashboard.scenes.find(({ id }) => id === "cases-scene").temporalReview, {
    status: "needs-review", sourceIds: ["cases"],
  });
  assert.deepEqual(harness.dashboard.scenes.find(({ id }) => id === "cases-scene").present.temporalReview, {
    status: "degraded", sourceIds: ["cases"],
  });
});

test("field-only observation bindings inherit temporal authority from the current profile", async () => {
  const harness = replacementHarness({ implicitTemporalObservation: true });
  const before = structuredClone(harness.dashboard);
  const plan = await preparePlan(harness.dashboard, CHANGED_TEMPORAL_ROWS);

  assert.equal(harness.dashboard.pages[0].sections[0].panels[0].roles.observation.interpretation, undefined);
  assert.equal(harness.dashboard.datasetProfiles.cases.columns.find(({ name }) => name === "date").type, "temporal");
  assert.equal(plan.status, "requires-temporal-review");
  assert.deepEqual(plan.reason.fields, ["date"]);
  harness.coordinator.stageDraft(plan.draft);
  await assert.rejects(commitCsvReplacement(plan, {
    contentDraftCoordinator: harness.coordinator,
  }), /temporal review/i);
  assert.deepEqual(harness.dashboard, before);
  await harness.coordinator.discardDraft(plan.draft.draftId, { reason: "task-12-deferred" });
});

test("repeat temporal confirmation unions sorted sourceIds and persistence failure rolls back every mark", async () => {
  const harness = replacementHarness();
  harness.dashboard.chronoGroups.find(({ id }) => id === "cases-playback").temporalReview = {
    status: "needs-review", sourceIds: ["older-source"],
  };
  harness.dashboard.scenes.find(({ id }) => id === "cases-scene").present.temporalReview = {
    status: "degraded", sourceIds: ["older-source"],
  };
  const plan = await preparePlan(harness.dashboard, CHANGED_TEMPORAL_ROWS);
  await commitCsvReplacement(plan, { confirmTemporalReview: true, contentDraftCoordinator: harness.coordinator });
  assert.deepEqual(harness.dashboard.chronoGroups.find(({ id }) => id === "cases-playback").temporalReview.sourceIds, ["cases", "older-source"]);
  assert.deepEqual(harness.dashboard.scenes.find(({ id }) => id === "cases-scene").present.temporalReview.sourceIds, ["cases", "older-source"]);

  const failing = replacementHarness({ failCommit: true });
  const before = structuredClone(failing.dashboard);
  const failingPlan = await preparePlan(failing.dashboard, CHANGED_TEMPORAL_ROWS);
  await assert.rejects(commitCsvReplacement(failingPlan, {
    confirmTemporalReview: true,
    contentDraftCoordinator: failing.coordinator,
  }), /persistence failed/);
  assert.deepEqual(failing.dashboard, before);
  assert.deepEqual(failing.coordinator.getActiveRetainers().records.map(({ ownerId, status }) => ({ ownerId, status })), [{
    ownerId: failingPlan.draft.draftId,
    status: "error",
  }]);
  await commitCsvReplacement(failingPlan, {
    confirmTemporalReview: true,
    contentDraftCoordinator: failing.coordinator,
  });
  assert.deepEqual(failing.coordinator.getActiveRetainers().records, []);
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
  assert.deepEqual(harness.coordinator.getActiveRetainers().records.map(({ ownerId, status }) => ({ ownerId, status })), [{
    ownerId: plan.draft.draftId,
    status: "error",
  }]);
  await commitCsvReplacement(plan, { contentDraftCoordinator: harness.coordinator });
  assert.deepEqual(harness.coordinator.getActiveRetainers().records, []);
  assert.equal(harness.dashboard.contentLibrary.sourceEntries.cases.health, "ready");
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

function replacementDashboard({ implicitTemporalObservation = false, wrappedPlacement = false } = {}) {
  const profile = profileDataset(ORIGINAL_ROWS);
  const line = createChartDraft("line", {
    id: "cases-trend", title: "Cases trend", sourceId: "cases",
    roles: {
      measurements: [{ field: "cases", axis: "primary" }],
      observation: implicitTemporalObservation
        ? { field: "date" }
        : { field: "date", interpretation: "temporal", format: "YYYY-MM-DD" },
    },
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
    chronoGroups: [{
      id: "cases-playback", name: "Cases playback", period: { start: "2026-01-01", end: "2026-02-28" },
      matching: { policy: "exact" }, secondsPerFrame: 1,
      members: [{ chartId: "cases-trend", timeRole: "observation" }],
    }, {
      id: "unrelated-playback", name: "Unrelated playback", period: { start: "2026-01-01", end: "2026-02-28" },
      matching: { policy: "exact" }, secondsPerFrame: 1,
      members: [{ chartId: "other-chart", timeRole: "observation" }],
    }],
    scenes: [{
      id: "cases-scene", name: "Cases scene", chronoGroupId: "cases-playback", pageId: "overview",
      members: [{ chartId: "cases-trend", width: 1 }],
      chartIds: ["cases-trend"], frames: { mode: "source", chartId: "cases-trend", selection: "all" },
      present: { chartIds: ["cases-trend"], layout: "single" },
    }],
    pages: [{ id: "overview", title: "Overview", sections: [{
      id: "response", title: "Response",
      panels: [wrappedPlacement ? { id: "cases-trend-placement", title: "Cases trend placement", chart: line } : line, map],
    }] }],
  });
}

function replacementHarness({ failCommit = false, implicitTemporalObservation = false, wrappedPlacement = false } = {}) {
  let dashboard = replacementDashboard({ implicitTemporalObservation, wrappedPlacement });
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
