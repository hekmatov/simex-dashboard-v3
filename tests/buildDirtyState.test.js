import assert from "node:assert/strict";
import test from "node:test";

import {
  createBuildDirtyState,
  hasActiveContentRetainers,
  hasUnsavedAuthoredContent,
  buildSessionContentSignature,
} from "../src/components/build/buildDirtyState.js";

test("an untouched Build workspace has no unsaved authored content", () => {
  assert.equal(hasUnsavedAuthoredContent(createBuildDirtyState()), false);
});

test("Build session changes compare authored content, ignoring hydration and object key order", () => {
  const baseline = { pages: [{ id: "biomedical", title: "Cases", sections: [] }], chronoGroups: [], dataSources: {}, datasetProfiles: {} };
  assert.equal(buildSessionContentSignature(baseline), buildSessionContentSignature({
    datasetProfiles: {}, dataSources: {}, chronoGroups: [], pages: baseline.pages,
    loadedData: { cases: [{ date: "2027-03-01", value: 2 }] },
    chartDataStates: { cases: { status: "ready" } }, dataSourceStates: {}, runtimeContentHealth: {},
  }));
  for (const changed of [
    { ...baseline, pages: [{ ...baseline.pages[0], title: "Changed" }] },
    { ...baseline, chronoGroups: [{ id: "new-group" }] },
    { ...baseline, dataSources: { cases: { kind: "csv", path: "changed.csv" } } },
    { ...baseline, datasetProfiles: { cases: { columns: [{ name: "date", type: "temporal" }] } } },
  ]) assert.notEqual(buildSessionContentSignature(baseline), buildSessionContentSignature(changed));
});

test("each approved authored-content category independently protects package import", () => {
  for (const key of [
    "chartEditor",
    "chartWizard",
    "inlineRename",
    "pendingContent",
    "chronoGroup",
    "scene",
    "dashboardMetadata",
  ]) {
    assert.equal(
      hasUnsavedAuthoredContent({ ...createBuildDirtyState(), [key]: true }),
      true,
      `${key} should be classified as authored content`,
    );
  }
});

test("cosmetic and unknown state never triggers the authored-content warning", () => {
  assert.equal(hasUnsavedAuthoredContent({
    ...createBuildDirtyState(),
    appearance: true,
    colorProfile: true,
    palette: true,
    futureCosmeticProjection: true,
  }), false);
});

test("only exact active content-retainer records make the Build content slice dirty", () => {
  assert.equal(hasActiveContentRetainers({ records: [] }), false);
  assert.equal(hasActiveContentRetainers({ records: [{ ownerId: "qmd-a", status: "staged" }] }), true);
  assert.equal(hasActiveContentRetainers(null), false);
});
