import test from "node:test";
import assert from "node:assert/strict";
import { authoringTimeContext } from "../src/charting/time/authoringTimePreview.js";
import { createChartDraft } from "../src/charting/config/chartConfigV3.js";
import { profileDataset } from "../src/charting/data/profileDataset.js";

const JAN1 = Date.parse("2027-01-01"), JAN2 = Date.parse("2027-01-02"), JAN3 = Date.parse("2027-01-03");
const profile = profileDataset([{ date: "2027-01-01", value: 1 }, { date: "2027-01-03", value: 3 }]);
const chart = createChartDraft("line", { id: "draft", title: "Draft", sourceId: "data", roles: {
  observation: { field: "date", interpretation: "temporal", format: "YYYY-MM-DD" }, measurements: [{ field: "value" }],
} });
const playback = { cursor: { mode: "at", scope: { kind: "page", id: "page" } }, activeEpochMs: JAN2, liveEpochMs: JAN3,
  groups: [], activeScene: null, matchingOverride: "authored", nearestToleranceMs: null, traceMode: "reveal" };

test("local draft preview borrows At or Live instant without requiring saved membership or mutating the cursor", () => {
  const before = structuredClone(playback);
  const at = authoringTimeContext({ chart, profile, playback, mode: "at" });
  assert.equal(at.activeEpochMs, JAN2); assert.equal(at.mode, "at");
  assert.deepEqual(at.matching, { policy: "exact" });
  const live = authoringTimeContext({ chart, profile, playback, mode: "live" });
  assert.equal(live.activeEpochMs, JAN3); assert.equal(live.mode, "live");
  assert.deepEqual(playback, before);
});

test("preview matching preserves real member then session precedence and explicit nearest bounds", () => {
  const scene = { id: "story", defaultMatching: { policy: "exact" }, members: [{ chartId: chart.id, matching: { policy: "lastKnown" } }] };
  const scoped = { ...playback, activeScene: scene, cursor: { ...playback.cursor, scope: { kind: "storyline", id: scene.id } } };
  assert.deepEqual(authoringTimeContext({ chart, profile, playback: scoped }).matching, { policy: "lastKnown" });
  assert.deepEqual(authoringTimeContext({ chart, profile, playback: { ...scoped, matchingOverride: "closest", nearestToleranceMs: 60_000 } }).matching, { policy: "nearest", toleranceMs: 60_000 });
  const outside = { ...chart, id: "another-draft" };
  assert.deepEqual(authoringTimeContext({ chart: outside, profile, playback: scoped }).matching, { policy: "exact" });
});

test("snapshot and unavailable-time previews do not invent temporal membership", () => {
  const snapshot = createChartDraft("kpi", { id: "snapshot", sourceId: "data", title: "Snapshot", roles: { value: { field: "value" } } });
  assert.equal(authoringTimeContext({ chart: snapshot, profile, playback }), undefined);
  assert.equal(authoringTimeContext({ chart, profile, playback: { ...playback, activeEpochMs: null } }), undefined);
  assert.deepEqual(authoringTimeContext({ chart, profile, suppliedContext: { activeEpochMs: JAN1 } }), { activeEpochMs: JAN1 });
});

test("incomplete local nearest edits stay repairable diagnostics rather than crashing the stage", () => {
  const draft = { ...chart, interaction: { ...chart.interaction, timeSync: { matching: { policy: "nearest", toleranceMs: NaN } } } };
  const context = authoringTimeContext({ chart: draft, profile, playback });
  assert.equal(context.matching.policy, "nearest");
  assert.ok(Number.isNaN(context.matching.toleranceMs));
});
