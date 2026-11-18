import assert from "node:assert/strict";
import test from "node:test";
import { createChartDraft, validateChartInstance } from "../src/charting/config/chartConfigV3.js";
import { profileDataset } from "../src/charting/data/profileDataset.js";
import { normalizeSceneDefaults, validateScene } from "../src/charting/time/sceneSchema.js";
import { normalizeDashboardTemporalConfig } from "../src/charting/time/dashboardTemporalConfig.js";
import { createBuildLayoutDraft, moveBuildLayoutSection, removeBuildLayoutPage } from "../src/components/build/buildLayoutDraft.js";
import { analyzeBuildLayoutMove, applyBuildLayoutMove } from "../src/components/build/buildLayoutMove.js";
import { validateChartTimeSyncDefault } from "../src/charting/time/chronoGroupModel.js";
import { collaboratorPackage } from "./helpers/dashboardPackageFixtures.js";
import { serializeDashboardBundle } from "../src/charting/config/dashboardBundleV3.js";
import { parseDashboardPackageCandidate } from "../src/lib/dashboardPackageCandidate.js";
import { buildDashboardPackageMerge } from "../src/lib/dashboardPackageMerge.js";
import { removeDashboardPanel } from "../src/static-content/staticPanelTransaction.js";
import { deriveTemporalNeedsAttention } from "../src/charting/time/temporalNeedsAttention.js";
import { createSceneDraft, reduceSceneDraft } from "../src/components/time/sceneDraft.js";

const rows = [{ date: "2027-01-01", value: 1 }, { date: "2027-01-03", value: 3 }];
const profile = profileDataset(rows);
function chart(id = "a") {
  return createChartDraft("line", {
    id, sourceId: "data", title: id,
    roles: { observation: { field: "date", interpretation: "temporal", format: "YYYY-MM-DD" }, measurements: [{ field: "value", interpolationAllowed: true }] },
  });
}
function storyline() {
  return normalizeSceneDefaults({
    id: "story", name: "Cross-page comparison",
    period: { start: "2027-01-01T00:00:00.000Z", end: "2027-01-03T00:00:00.000Z" },
    frames: { mode: "calendar", interval: { value: 1, unit: "day" } },
    members: [{ chartId: "a", width: 2, matching: { policy: "nearest", toleranceMs: 86400000 } }, { chartId: "b", width: 2 }],
  });
}
function context() {
  return { charts: [{ ...chart("a"), pageId: "first" }, { ...chart("b"), pageId: "second" }], pages: [{ id: "first" }, { id: "second" }], profiles: { data: profile } };
}

test("chart V3 owns validated time matching without a Group backlink", () => {
  const value = chart();
  for (const matching of [{ policy: "exact" }, { policy: "lastKnown" }, { policy: "nearest", toleranceMs: 1000 }, { policy: "interpolate" }]) {
    value.interaction.timeSync = { matching };
    assert.doesNotThrow(() => validateChartInstance(value));
    assert.equal(value.configVersion, 3);
  }
  for (const matching of [{ policy: "nearest" }, { policy: "exact", toleranceMs: 1000 }, { policy: "invented" }]) {
    value.interaction.timeSync = { matching };
    assert.throws(() => validateChartInstance(value), /matching|policy|tolerance/i);
  }
});

test("temporal normalization preserves chart matching while removing legacy backlinks", () => {
  const a = chart();
  a.interaction.timeSync = { groupId: "old", matching: { policy: "exact" } };
  const original = { configVersion: 6, timezone: "UTC", pages: [{ sections: [{ panels: [{ chart: a }] }] }] };
  const result = normalizeDashboardTemporalConfig(original);
  assert.deepEqual(result.pages[0].sections[0].panels[0].chart.interaction.timeSync, { matching: { policy: "exact" } });
  assert.equal(original.pages[0].sections[0].panels[0].chart.interaction.timeSync.groupId, "old");
  assert.deepEqual(normalizeDashboardTemporalConfig(result), result);
});

test("chart interpolation defaults require eligible numeric measure permission", () => {
  const value = chart(); value.interaction.timeSync = { matching: { policy: "interpolate" } };
  assert.doesNotThrow(() => validateChartTimeSyncDefault(value, { profiles: { data: profile } }));
  delete value.roles.measurements[0].interpolationAllowed;
  assert.throws(() => validateChartTimeSyncDefault(value, { profiles: { data: profile } }), /explicitly permit interpolation/);
});

test("parentless Storylines validate cross-page temporal members in saved order", () => {
  const value = storyline();
  assert.strictEqual(validateScene(value, context()), value);
  assert.deepEqual(value.members.map(member => member.chartId), ["a", "b"]);
  assert.deepEqual(value.present, { chartIds: ["a", "b"], layout: "vertical-divider" });
});

test("parentless Storylines can retain whole coverage without an authored window", () => {
  const value = storyline(); delete value.period;
  assert.doesNotThrow(() => validateScene(value, context()));
  assert.equal(Object.hasOwn(value, "period"), false);
});

test("chart-owned matching survives package export, parse and selective import", () => {
  const candidate = collaboratorPackage();
  candidate.config.pages[0].sections[0].panels[0].chart.interaction.timeSync = { matching: { policy: "nearest", toleranceMs: 1000 } };
  const parsed = parseDashboardPackageCandidate(JSON.stringify(serializeDashboardBundle(candidate.config)));
  const proposal = buildDashboardPackageMerge({ current: collaboratorPackage().config, candidate: parsed,
    selection: { placementIds: ["placement-a"] }, destination: { scope: "placements", pageId: "overview", sectionId: "signals" } });
  assert.deepEqual(proposal.issues.filter(issue => issue.blocking), []);
  assert.deepEqual(proposal.config.pages[0].sections[0].panels.at(-1).chart.interaction.timeSync, { matching: { policy: "nearest", toleranceMs: 1000 } });
});

test("parentless Storylines reject missing, non-temporal and invalid matching members", () => {
  const value = storyline();
  const missing = context(); missing.charts.pop();
  assert.throws(() => validateScene(value, missing), /does not exist/);
  const invalid = context(); invalid.charts[1].roles.observation = { field: "value" };
  assert.throws(() => validateScene(value, invalid), /temporal/);
  value.members[0].matching = { policy: "nearest" };
  assert.throws(() => validateScene(value, context()), /tolerance/);
});

test("moving a section preserves parentless Storyline members and layouts", () => {
  const saved = { id: "dashboard", pages: [
    { id: "first", sections: [{ id: "moving", panels: [{ id: "pa", chart: chart("a") }] }, { id: "remaining", panels: [] }] },
    { id: "second", sections: [{ id: "destination", panels: [{ id: "pb", chart: chart("b") }] }] },
  ], scenes: [storyline()] };
  const moved = moveBuildLayoutSection(createBuildLayoutDraft(saved), "first", "moving", "second");
  assert.deepEqual(moved.value.scenes, saved.scenes);
  assert.equal(moved.value.pages[1].sections.at(-1).id, "moving");
});

test("legacy Scenes accept cross-page parent members without losing parent period checks", () => {
  const value = { ...storyline(), pageId: "first", chronoGroupId: "legacy" };
  const ctx = context();
  ctx.chronoGroups = [{ id: "legacy", period: value.period, members: [{ chartId: "a" }, { chartId: "b" }] }];
  assert.doesNotThrow(() => validateScene(value, ctx));
  value.period = { ...value.period, end: "2027-01-04T00:00:00.000Z" };
  assert.throws(() => validateScene(value, ctx), /parent Chrono Group/);
});

test("canonical partial cross-page moves preserve Scene members, source frames and Present layout", () => {
  const value = { ...storyline(), pageId: "first", chronoGroupId: "legacy", frames: { mode: "source", chartId: "a", selection: "all" } };
  const saved = { id: "dashboard", pages: [
    { id: "first", sections: [{ id: "origin", panels: [{ id: "pa", chart: chart("a") }, { id: "pb", chart: chart("b") }] }] },
    { id: "second", sections: [{ id: "destination", panels: [] }] },
  ], scenes: [value] };
  const analysis = analyzeBuildLayoutMove(saved, { kind: "panel", source: { pageId: "first", sectionId: "origin", placementId: "pa" }, target: { pageId: "second", sectionId: "destination", index: 0 } });
  assert.equal(analysis.requiresConfirmation, false);
  assert.deepEqual(analysis.consequences, []);
  const moved = applyBuildLayoutMove(createBuildLayoutDraft(saved), analysis, {});
  assert.deepEqual(moved.value.scenes, saved.scenes);
  assert.equal(moved.value.pages[1].sections[0].panels[0].chart.id, "a");
});

test("deleting a display page preserves surviving cross-page members and marks removed frame sources honestly", () => {
  const value = { ...storyline(), pageId: "first", frames: { mode: "source", chartId: "a", selection: "all" } };
  const saved = { id: "dashboard", pages: [
    { id: "first", sections: [{ id: "origin", panels: [{ id: "pa", chart: chart("a") }] }] },
    { id: "second", sections: [{ id: "destination", panels: [{ id: "pb", chart: chart("b") }] }] },
  ], scenes: [value] };
  const removed = removeBuildLayoutPage(createBuildLayoutDraft(saved), "first", { disposition: "delete-charts" });
  assert.equal(removed.value.scenes.length, 1);
  assert.equal(removed.value.scenes[0].pageId, "second");
  assert.deepEqual(removed.value.scenes[0].members, [value.members[1]]);
  assert.deepEqual(removed.value.scenes[0].present, { chartIds: ["b"], layout: "single" });
  assert.deepEqual(removed.value.scenes[0].frames, { mode: "unresolved", reason: "source-chart-removed", previousChartId: "a" });
  assert.deepEqual(saved.scenes[0], value);
});

test("panel removal uses the same surviving member and frame-source contract", () => {
  const value = { ...storyline(), frames: { mode: "source", chartId: "a", selection: "all" } };
  const saved = { pages: [{ sections: [{ panels: [{ id: "pa", chart: chart("a") }, { id: "pb", chart: chart("b") }] }] }], scenes: [value] };
  removeDashboardPanel(saved, "pa");
  assert.deepEqual(saved.scenes[0].members, [value.members[1]]);
  assert.equal(saved.scenes[0].frames.reason, "source-chart-removed");
  assert.equal(saved.scenes[0].present.layout, "single");
});

test("whole-coverage Needs attention derives eligible bounds and reports empty coverage without an invalid period", () => {
  const value = storyline(); delete value.period;
  const charts = ["a", "b"].map(id => ({ id, chronoGroupEligibility: { eligible: true }, variables: [{ observations: [{ epochMs: Date.UTC(2027, 0, 1), value: 1 }, { epochMs: Date.UTC(2027, 0, 3), value: 3 }] }] }));
  for (const period of [undefined, null]) {
    assert.deepEqual(deriveTemporalNeedsAttention({ timezone: "UTC", charts, scenes: [{ ...value, period }] }), []);
  }
  const ineligible = charts.map(chart => ({ ...chart, chronoGroupEligibility: { eligible: false } }));
  assert.deepEqual(deriveTemporalNeedsAttention({ timezone: "UTC", charts: ineligible, scenes: [value] }).map(item => item.code), ["zero-frame-ledger"]);
  assert.equal(Object.hasOwn(value, "period"), false);
  const parented = { ...value, chronoGroupId: "legacy" };
  assert.ok(deriveTemporalNeedsAttention({ timezone: "UTC", charts, scenes: [parented] }).some(item => item.code === "invalid-period"));
});

test("Scene matching edits create bounded nearest objects and preserve the authored tolerance", () => {
  let draft = createSceneDraft(storyline(), context());
  draft = reduceSceneDraft(draft, { type: "SET_MATCHING", chartId: "a", matching: "Snap to Closest" });
  assert.deepEqual(draft.value.members[0].matching, { policy: "nearest", toleranceMs: 86400000 });
  assert.doesNotThrow(() => validateScene(draft.value, context()));
  draft = reduceSceneDraft(draft, { type: "SET_MATCHING", chartId: "b", matching: "Snap to Closest" });
  assert.deepEqual(draft.value.members[1].matching, { policy: "nearest", toleranceMs: 0 });
  draft = reduceSceneDraft(draft, { type: "SET_MATCHING", chartId: "b", matching: { policy: "nearest", toleranceMs: 7200000 } });
  assert.equal(draft.value.members[1].matching.toleranceMs, 7200000);
  draft = reduceSceneDraft(draft, { type: "SET_MATCHING", chartId: "b", matching: "authored" });
  assert.equal(Object.hasOwn(draft.value.members[1], "matching"), false);
});

test("Scene interpolation overrides and defaults validate numeric permission with and without a Group", () => {
  for (const hasParent of [false, true]) for (const defaultOverride of [false, true]) {
    const value = storyline();
    delete value.members[0].matching;
    if (defaultOverride) value.defaultMatching = "Interpolate";
    else value.members[0].matching = { policy: "interpolate" };
    const ctx = context();
    if (hasParent) {
      value.pageId = "first"; value.chronoGroupId = "legacy";
      ctx.chronoGroups = [{ id: "legacy", period: value.period, matching: { policy: "exact" }, members: [{ chartId: "a", timeRole: "observation" }, { chartId: "b", timeRole: "observation" }] }];
    }
    assert.doesNotThrow(() => validateScene(value, ctx));
    delete ctx.charts[0].roles.measurements[0].interpolationAllowed;
    assert.throws(() => validateScene(value, ctx), /explicitly permit interpolation/);
  }
});
