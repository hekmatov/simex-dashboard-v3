import test from "node:test";
import assert from "node:assert/strict";
import { profileDataset } from "../src/charting/data/profileDataset.js";
import { createChartDraft } from "../src/charting/config/chartConfigV3.js";
import { validateScene } from "../src/charting/time/sceneSchema.js";
import { createComparisonStoryline, buildStorylineCoverage, filterStorylineCoverage, storylineDraftAdmission, storylineViewMembers } from "../src/components/time/storylineAuthoring.js";
import { createSceneDraft, reduceSceneDraft } from "../src/components/time/sceneDraft.js";
import { createChronoContentState, selectSceneStudioSections } from "../src/components/time/chronoContentState.js";
import { buildScenePreviewProjection } from "../src/components/time/scenePreviewTime.js";
import { removeTemporalChartReferences } from "../src/charting/time/storylineReferences.js";

function fixture() {
  const rows = [{ date: "2027-01-01", value: 1 }, { date: "2027-01-03", value: 3 }];
  const chart = id => createChartDraft("line", { id, sourceId: "data", title: id, roles: {
    observation: { field: "date", interpretation: "temporal", format: "YYYY-MM-DD" }, measurements: [{ field: "value" }],
  } });
  return { timezone: "UTC", dataSources: { data: {} }, datasetProfiles: { data: profileDataset(rows) }, loadedData: { data: rows },
    pages: ["first", "second"].map((id, index) => ({ id, title: id, sections: [{ id: `s${index}`, title: `Section ${index}`, panels: [{ id: `p${index}`, chart: chart(index ? "b" : "a") }] }] })) };
}

test("saving a cross-page comparison creates an ordered parentless proposal without mutating content", () => {
  const dashboard = fixture(), before = structuredClone(dashboard);
  const proposal = createComparisonStoryline({ dashboard, chartIds: ["b", "a"], layout: "overUnder", id: "story", name: "Comparison" });
  assert.deepEqual(proposal.members.map(member => member.chartId), ["b", "a"]);
  assert.deepEqual(proposal.view, { layout: "overUnder" });
  assert.deepEqual(proposal.present, { chartIds: ["b", "a"], layout: "horizontal-divider" });
  assert.deepEqual(proposal.period, { start: "2027-01-01T00:00:00.000Z", end: "2027-01-03T00:00:00.000Z" });
  assert.equal(Object.hasOwn(proposal, "chronoGroupId"), false);
  assert.equal(Object.hasOwn(proposal, "pageId"), false);
  const charts = dashboard.pages.flatMap(page => page.sections.flatMap(section => section.panels.map(panel => panel.chart)));
  validateScene(proposal, { charts, profiles: dashboard.datasetProfiles });
  assert.deepEqual(dashboard, before);
  const draft = createSceneDraft(proposal, { charts, profiles: dashboard.datasetProfiles });
  assert.deepEqual(reduceSceneDraft(draft, { type: "DISCARD" }).value, proposal);
  assert.deepEqual(dashboard, before);
});

test("proposal admission preserves readonly and existing draft ownership", () => {
  assert.match(storylineDraftAdmission({ readOnly: true }), /read-only/);
  for (const owner of [{ chartDraftOpen: true }, { sceneDraft: { status: "clean" } }, { chronoGroupDraft: {} }, { layoutDraft: { status: "dirty" } }, { sourceContentOwners: [{}] }]) {
    assert.match(storylineDraftAdmission(owner), /existing Build drafts/);
  }
  assert.equal(storylineDraftAdmission(), "");
});

test("coverage uses filtered temporal observations, discloses empty/partial coverage and preserves filter identity", () => {
  const dashboard = fixture();
  dashboard.pages[1].sections[0].panels[0].chart.sourceId = "empty";
  dashboard.datasetProfiles.empty = dashboard.datasetProfiles.data;
  dashboard.loadedData.empty = [];
  const candidates = buildStorylineCoverage(dashboard, { start: "2026-12-31T00:00:00.000Z", end: "2027-01-04T00:00:00.000Z" });
  assert.equal(candidates[0].coverage, "partial"); assert.equal(candidates[0].inWindowCount, 2);
  assert.equal(candidates[1].coverage, "none"); assert.equal(candidates[1].eligible, true);
  assert.deepEqual(filterStorylineCoverage(candidates, { sourceId: "empty" }).map(candidate => candidate.id), ["b"]);
  assert.deepEqual(filterStorylineCoverage(candidates, { query: "Section 0" }).map(candidate => candidate.id), ["a"]);
  assert.deepEqual(filterStorylineCoverage(candidates, { cadence: "none" }).map(candidate => candidate.id), ["b"]);
  delete dashboard.loadedData.empty;
  const unloaded = buildStorylineCoverage(dashboard).find(candidate => candidate.id === "b");
  assert.equal(unloaded.eligible, false);
  assert.match(unloaded.reason, /not loaded/);
});

test("missing and non-temporal comparison members are refused without weakening eligibility", () => {
  const dashboard = fixture();
  assert.throws(() => createComparisonStoryline({ dashboard, chartIds: ["a", "missing"], layout: "sideBySide", id: "story" }), /no longer exists|temporal/);
  dashboard.pages[1].sections[0].panels[0].chart.roles.observation = { field: "value", interpretation: "category" };
  assert.throws(() => createComparisonStoryline({ dashboard, chartIds: ["a", "b"], layout: "sideBySide", id: "story" }), /temporal/);
});

test("comparison layouts retain their member geometry independently of Present", () => {
  assert.deepEqual(storylineViewMembers(["a", "b", "c"], "rightFocus"), [
    { chartId: "a", width: 2, height: 2 }, { chartId: "b", width: 2, height: 1 }, { chartId: "c", width: 2, height: 1 },
  ]);
  assert.throws(() => storylineViewMembers(["a", "b"], "leftFocus"), /layout/);
});

test("layout edits preserve member policies and independent Present order while membership leaves fixed presets", () => {
  const dashboard = fixture();
  const scene = createComparisonStoryline({ dashboard, chartIds: ["a", "b"], layout: "overUnder", id: "story", name: "Draft" });
  scene.members[0].matching = { policy: "lastKnown" };
  const draft = createSceneDraft(scene);
  const rearranged = reduceSceneDraft(draft, { type: "SET_VIEW_LAYOUT", layout: "sideBySide" });
  assert.deepEqual(rearranged.value.members[0].matching, { policy: "lastKnown" });
  assert.equal(rearranged.value.members[0].width, 2);
  assert.deepEqual(rearranged.value.present, scene.present);
  const missing = reduceSceneDraft(rearranged, { type: "SET_WIDTH", chartId: "missing", width: 4 });
  assert.equal(missing.error.code, "SCENE_CHART_MISSING");
  assert.deepEqual(missing.value, rearranged.value);
  const removed = reduceSceneDraft(rearranged, { type: "REMOVE_MEMBER", chartId: "b" });
  assert.equal(removed.value.view, undefined);
  assert.deepEqual(removed.value.members[0].matching, { policy: "lastKnown" });
});

test("whole-coverage parentless drafts accept date entry in either order and reject incomplete dates", () => {
  const dashboard = fixture();
  const charts = dashboard.pages.flatMap(page => page.sections.flatMap(section => section.panels.map(panel => panel.chart)));
  const scene = createComparisonStoryline({ dashboard, chartIds: ["a", "b"], layout: "sideBySide", id: "story", name: "Draft" });
  let draft = reduceSceneDraft(createSceneDraft(scene, { charts, profiles: dashboard.datasetProfiles }), { type: "CLEAR_PERIOD" });
  draft = reduceSceneDraft(draft, { type: "SET_PERIOD", start: "2027-01-01", end: "" });
  assert.equal(draft.value.period, undefined);
  assert.equal(reduceSceneDraft(draft, { type: "SAVE_REQUEST" }).status, "error");
  draft = reduceSceneDraft(draft, { type: "SET_PERIOD", start: "2027-01-01", end: "2027-01-03" });
  assert.equal(reduceSceneDraft(draft, { type: "SAVE_REQUEST" }).status, "saving");
  assert.deepEqual(buildScenePreviewProjection({ dashboard, scene }).timeContexts.a.matching, { policy: "exact" });
});

test("parentless saved Storylines remain discoverable and invalid fixed geometry is rejected", () => {
  const dashboard = fixture();
  const scene = createComparisonStoryline({ dashboard, chartIds: ["a", "b"], layout: "sideBySide", id: "story", name: "Saved" });
  const sections = selectSceneStudioSections(createChronoContentState({ scenes: [scene], pages: dashboard.pages, studio: "scene" }));
  assert.equal(sections[0].pageLabel, "Across pages");
  assert.equal(sections[0].scenes[0].id, scene.id);
  const charts = dashboard.pages.flatMap(page => page.sections.flatMap(section => section.panels.map(panel => panel.chart)));
  assert.throws(() => validateScene({ ...scene, view: { layout: "grid2x2" } }, { charts, profiles: dashboard.datasetProfiles }), /View layout/);
  scene.members[0].height = 1.03;
  assert.throws(() => validateScene(scene, { charts, profiles: dashboard.datasetProfiles }), /height/);
});

test("two-era sparse sources disclose non-overlap and large membership keeps Present capped at four", () => {
  const dashboard = fixture();
  const oldRows = [{ date: "2004-01-01", value: 8 }, { date: "2004-02-01", value: 9 }];
  const oldChart = structuredClone(dashboard.pages[1].sections[0].panels[0].chart);
  oldChart.id = "historic"; oldChart.sourceId = "historic-source";
  dashboard.loadedData[oldChart.sourceId] = oldRows;
  dashboard.datasetProfiles[oldChart.sourceId] = profileDataset(oldRows);
  dashboard.pages[1].sections[0].panels.push({ id: "historic-placement", chart: oldChart });
  for (let index = 0; index < 7; index++) {
    const copy = structuredClone(oldChart); copy.id = `historic-${index}`;
    dashboard.pages[1].sections[0].panels.push({ id: `placement-${index}`, chart: copy });
  }
  const coverage = buildStorylineCoverage(dashboard, { start: "2027-01-01T00:00:00.000Z", end: "2027-01-03T00:00:00.000Z" });
  assert.equal(coverage.find(candidate => candidate.id === "historic").coverage, "none");
  assert.equal(coverage.find(candidate => candidate.id === "historic").cadence, "monthly");
  assert.deepEqual(filterStorylineCoverage(coverage, { sourceId: "historic-source" }).map(candidate => candidate.inWindowCount), Array(8).fill(0));
  const scene = createComparisonStoryline({ dashboard, chartIds: ["a", "b"], layout: "sideBySide", id: "story", name: "Many charts" });
  const charts = dashboard.pages.flatMap(page => page.sections.flatMap(section => section.panels.map(panel => panel.chart)));
  let draft = createSceneDraft(scene, { charts, profiles: dashboard.datasetProfiles });
  for (const candidate of coverage.filter(candidate => candidate.sourceId === "historic-source")) draft = reduceSceneDraft(draft, { type: "ADD_MEMBER", chartId: candidate.id });
  assert.equal(draft.value.members.length, 10);
  assert.deepEqual(draft.value.present.chartIds, ["a", "b", "historic", "historic-0"]);
  assert.equal(draft.value.present.layout, "grid-2x2");
  assert.equal(reduceSceneDraft(draft, { type: "SAVE_REQUEST" }).status, "saving");
});

test("external deletion clears incompatible View layout and preserves surviving geometry and matching", () => {
  const dashboard = fixture();
  const scene = createComparisonStoryline({ dashboard, chartIds: ["a", "b"], layout: "overUnder", id: "story", name: "Saved comparison" });
  scene.members[1].matching = { policy: "lastKnown" };
  dashboard.scenes = [scene];
  const before = structuredClone(dashboard);
  const next = removeTemporalChartReferences(dashboard, ["a"]);
  assert.equal(next.scenes[0].view, undefined);
  assert.deepEqual(next.scenes[0].members, [scene.members[1]]);
  assert.equal(next.scenes[0].present.layout, "single");
  assert.equal(next.scenes[0].frames.reason, "source-chart-removed");
  validateScene(next.scenes[0], { charts: [dashboard.pages[1].sections[0].panels[0].chart], profiles: dashboard.datasetProfiles });
  assert.deepEqual(dashboard, before);
});
