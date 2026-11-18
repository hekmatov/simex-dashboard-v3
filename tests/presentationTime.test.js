import test from "node:test";
import assert from "node:assert/strict";
import { makePresentationTime, validatePresentationTime, audienceTimeContexts } from "../src/charting/time/acceptedTimeProjection.js";
import { createChartDraft } from "../src/charting/config/chartConfigV3.js";
import { profileDataset } from "../src/charting/data/profileDataset.js";
import { makePresentationMessage, parsePresentationMessage } from "../src/lib/presentationProtocol.js";
import { projectAudienceSnapshot } from "../src/lib/audienceProjection.js";
import { initialPlaybackState, reducePlaybackState } from "../src/charting/time/playbackReducer.js";
import { deriveCursorPlayback } from "../src/charting/time/cursorProviderModel.js";

const JAN1 = Date.parse("2027-01-01"), JAN2 = Date.parse("2027-01-02"), JAN3 = Date.parse("2027-01-03");
function playback(extra = {}) {
  return { cursor: { mode: "live", scope: { kind: "dashboard", id: null }, window: null },
    activeEpochMs: JAN2, clock: [JAN1, JAN3], activeIndex: 0, exerciseTime: "2027-01-02T00:00:00.000Z",
    speed: 0.75, traceMode: "full", matchingOverride: "authored", nearestToleranceMs: null, ...extra };
}

test("accepted time carries declared Live instant between frames without substituting a frame", () => {
  const input = playback(), original = structuredClone(input), time = makePresentationTime(input);
  assert.equal(time.mode, "live"); assert.equal(time.epoch_ms, JAN2);
  assert.deepEqual(time.frame_epochs, [JAN1, JAN3]); assert.equal(time.frame_index, 0);
  assert.equal(time.seconds_per_frame, 0.75); assert.equal(time.trace_mode, "full");
  assert.deepEqual(input, original); assert.ok(Object.isFrozen(time)); assert.ok(Object.isFrozen(time.scope));
  assert.doesNotThrow(() => validatePresentationTime(time));
});

test("accepted time retains fine At instant, scope, session window and explicit nearest distance", () => {
  const time = makePresentationTime(playback({ cursor: { mode: "at", scope: { kind: "storyline", id: "story" },
    window: { start: "2027-01-01T00:00:00.000Z", end: "2027-01-03T00:00:00.000Z" } },
    matchingOverride: "closest", nearestToleranceMs: 3_600_000 }));
  assert.equal(time.epoch_ms, JAN2); assert.equal(time.frame_index, 0);
  assert.deepEqual(time.scope, { kind: "storyline", id: "story" });
  assert.equal(time.matching_override, "closest"); assert.equal(time.nearest_tolerance_ms, 3_600_000);
  assert.equal(time.window.end, "2027-01-03T00:00:00.000Z");
});

test("accepted time supports an empty scope and preserves legacy unbounded nearest as a diagnostic", () => {
  const empty = makePresentationTime(playback({ clock: [], activeEpochMs: null, exerciseTime: null }));
  assert.equal(empty.epoch_ms, null); assert.deepEqual(empty.frame_epochs, []); assert.equal(empty.frame_index, 0);
  const legacy = makePresentationTime(playback({ matchingOverride: "closest", nearestToleranceMs: null }));
  assert.equal(legacy.nearest_tolerance_ms, null);
});

test("Present reentry restores fine accepted cursor and policy atomically while remaining paused", () => {
  const time = makePresentationTime(playback({ cursor: { mode: "at", scope: { kind: "storyline", id: "story" }, window: null },
    matchingOverride: "closest", nearestToleranceMs: 100 }));
  const state = reducePlaybackState({ ...initialPlaybackState, playing: true }, { type: "restoreAcceptedTime", time, sceneId: "story", groupId: null });
  assert.equal(state.cursor.epochMs, JAN2); assert.equal(state.playing, false);
  assert.equal(state.activeSceneId, "story"); assert.equal(state.matchingOverride, "closest");
  assert.equal(state.nearestToleranceMs, 100); assert.equal(state.speed, 0.75); assert.equal(state.traceMode, "full");
  assert.throws(() => reducePlaybackState(state, { type: "restoreAcceptedTime", time: { ...time, epoch_ms: Infinity } }));
});

test("accepted time rejects malformed fields, clocks, policies and declared Live substitutions without mutation", () => {
  const valid = makePresentationTime(playback());
  for (const patch of [{ group_id: "old" }, { mode: "future" }, { epoch_ms: NaN },
    { frame_epochs: [JAN3, JAN1] }, { frame_epochs: [JAN1, JAN1] }, { frame_index: 1 },
    { scope: { kind: "storyline", id: null } }, { nearest_tolerance_ms: -1 }, { nearest_tolerance_ms: Infinity },
    { matching_override: "unlimited" }, { seconds_per_frame: 0 }, { trace_mode: "hidden" },
    { mode: "at", window: { start: "2027-01-01T00:00:00.000Z", end: "2027-01-01T00:00:00.000Z" } },
    { mode: "at", epoch_ms: JAN1, window: { start: "2027-01-01T00:00:00.000Z", end: "2027-01-02T00:00:00.000Z" } },
    { exercise_time: "2027-01-03T00:00:00.000Z" }, { window: { start: "2027-01-03", end: "2027-01-01" } }]) {
    assert.throws(() => validatePresentationTime({ ...valid, ...patch }), undefined, JSON.stringify(patch));
  }
  assert.equal(valid.epoch_ms, JAN2);
});

test("Audience resolves accepted cross-page member and session policies at the accepted instant", () => {
  const rows = [{ date: "2027-01-01", value: 10 }, { date: "2027-01-03", value: 30 }];
  const chart = createChartDraft("line", { id: "cases", sourceId: "source", roles: {
    observation: { field: "date", interpretation: "temporal", format: "YYYY-MM-DD" }, measurements: [{ field: "value" }],
  } });
  const other = { ...structuredClone(chart), id: "trust", interaction: { ...chart.interaction, timeSync: { matching: { policy: "exact" } } } };
  const dashboard = { pages: [{ id: "bio", sections: [{ panels: [chart] }] }, { id: "socio", sections: [{ panels: [other] }] }],
    datasetProfiles: { source: profileDataset(rows) }, chronoGroups: [], scenes: [{ id: "story", members: [{ chartId: "cases" },
      { chartId: "trust", matching: { policy: "lastKnown" } }] }] };
  const state = { ...initialPlaybackState, cursor: { mode: "at", epochMs: JAN2, scope: { kind: "storyline", id: "story" }, window: null } };
  const producer = extra => deriveCursorPlayback({ state: { ...state, ...extra }, charts: [chart, other], pageCharts: [chart],
    scenes: dashboard.scenes, profiles: dashboard.datasetProfiles, loadedData: { source: rows }, activePageId: "bio" });
  const time = makePresentationTime(playback({ ...producer() }));
  const authored = audienceTimeContexts(time);
  assert.equal(authored.cases.activeEpochMs, JAN2); assert.deepEqual(authored.cases.matching, { policy: "exact" });
  assert.deepEqual(authored.trust.matching, { policy: "lastKnown" });
  const override = audienceTimeContexts(makePresentationTime(playback({ ...producer({ matchingOverride: "closest", nearestToleranceMs: 3_600_000 }),
    matchingOverride: "closest", nearestToleranceMs: 3_600_000 })));
  assert.deepEqual(override.trust.matching, { policy: "nearest", toleranceMs: 3_600_000 });
  assert.deepEqual(Object.keys(audienceTimeContexts({ ...time, epoch_ms: null })), []);
});

test("accepted effective member policy survives a Build default edit with retained old Audience config", () => {
  const rows = [{ date: "2027-01-01", value: 10 }, { date: "2027-01-03", value: 30 }];
  const oldChart = createChartDraft("line", { id: "cases", sourceId: "source", roles: {
    observation: { field: "date", interpretation: "temporal", format: "YYYY-MM-DD" }, measurements: [{ field: "value" }],
  } });
  oldChart.interaction.timeSync = { matching: { policy: "exact" } };
  const edited = structuredClone(oldChart); edited.interaction.timeSync.matching = { policy: "lastKnown" };
  const profiles = { source: profileDataset(rows) };
  const state = { ...initialPlaybackState, cursor: { mode: "at", epochMs: JAN2, scope: { kind: "page", id: "bio" }, window: null } };
  const producer = deriveCursorPlayback({ state, charts: [edited], pageCharts: [edited], loadedData: { source: rows }, profiles, activePageId: "bio" });
  const time = makePresentationTime(playback({ ...producer, exerciseTime: null }));
  assert.deepEqual(time.members, [{ chart_id: "cases", time_role: "observation", matching: { policy: "lastKnown" } }]);
  assert.deepEqual(audienceTimeContexts(time).cases.matching, producer.contexts.cases.matching);
  assert.deepEqual(oldChart.interaction.timeSync.matching, { policy: "exact" });
});

test("accepted member policies reject duplicate identities and conflicting session bounds while preserving legacy diagnostics", () => {
  const time = makePresentationTime(playback({ matchingOverride: "closest", nearestToleranceMs: 100,
    members: [{ chartId: "cases", timeRole: "observation" }], contexts: { cases: { matching: { policy: "nearest", toleranceMs: 100 } } } }));
  const member = time.members[0];
  for (const members of [[member, member], [{ ...member, chart_id: "" }], [{ ...member, time_role: "" }],
    [{ ...member, matching: { policy: "nearest", tolerance_ms: 200 } }], [{ ...member, matching: { policy: "nearest", tolerance_ms: -1 } }],
    [{ ...member, matching: { policy: "lastKnown" } }], [{ ...member, matching: { policy: "unknown" } }],
    [{ ...member, matching: { policy: "nearest", tolerance_ms: 100, unlimited: true } }]]) {
    assert.throws(() => validatePresentationTime({ ...time, members }));
  }
  const legacy = makePresentationTime(playback({ members: [{ chartId: "cases", timeRole: "observation" }], contexts: { cases: { matching: { policy: "nearest" } } } }));
  assert.deepEqual(legacy.members[0].matching, { policy: "nearest", tolerance_ms: null });
  assert.deepEqual(audienceTimeContexts(legacy).cases.matching, { policy: "nearest" });
});

test("V4 accepted state carries one time projection and stale V3 cannot replace Audience output", () => {
  const state = { dashboard_revision: "reference", source: { kind: "manual", scene_id: null },
    composition: { active_page_id: "bio", displayed_chart_ids: [], layout: "solo" },
    time: makePresentationTime(playback()), output_mode: "active", blackout: false,
    audience: { date_position: { x_permille: 680, y_permille: 40, width_permille: 280 } },
    payload: { items: [], audience_facts: { dashboard_name: false, page: false, parent_chrono_group: false, scene_name: false, scene_date: false } } };
  const message = makePresentationMessage({ sessionId: "session", sequence: 1, type: "state", payload: state, presentableItemIndex: new Map() });
  assert.equal(message.protocol_version, 4);
  assert.ok(message.payload.time); assert.equal(Object.hasOwn(message.payload, "timeline"), false);
  assert.equal(Object.hasOwn(message.payload, "matching"), false);
  const accepted = projectAudienceSnapshot(parsePresentationMessage(message));
  assert.equal(accepted.projection.time.epoch_ms, JAN2);
  const stale = { ...message, sequence: 2, protocol_version: 3 };
  assert.throws(() => parsePresentationMessage(stale), /version/i);
  const retained = projectAudienceSnapshot(stale, accepted.lastValid);
  assert.equal(retained.accepted, false); assert.deepEqual(retained.projection, accepted.lastValid);
});
