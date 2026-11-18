import assert from "node:assert/strict";
import test from "node:test";
import { initialPlaybackState, reducePlaybackState } from "../src/charting/time/playbackReducer.js";
import * as scopeModel from "../src/charting/time/playbackPageScope.js";
import { profileDataset } from "../src/charting/data/profileDataset.js";
import { createChartDraft } from "../src/charting/config/chartConfigV3.js";
import { serializeDashboardBundle } from "../src/charting/config/dashboardBundleV3.js";
import { parseDashboardPackageCandidate } from "../src/lib/dashboardPackageCandidate.js";
import { collaboratorPackage } from "./helpers/dashboardPackageFixtures.js";
import { deriveCursorPlayback } from "../src/charting/time/cursorProviderModel.js";
import * as providerModel from "../src/charting/time/cursorProviderModel.js";
import { applyTimeContext } from "../src/charting/time/applyTimeContext.js";
import { buildFrameAvailabilityEvidence } from "../src/components/playback/playbackAvailability.js";

const JAN1 = Date.UTC(2027, 0, 1), JAN2 = Date.UTC(2027, 0, 2), JAN3 = Date.UTC(2027, 0, 3);
const clock = [JAN1, JAN2, JAN3];

function cursorAvailability(activeEpochMs, matching, values = [1, 3]) {
  const rows = [{ date: "2027-01-01", value: values[0] }, { date: "2027-01-03", value: values[1] }];
  const chart = createChartDraft("line", { id: "a", sourceId: "data", title: "A", roles: {
    observation: { field: "date", interpretation: "temporal", format: "YYYY-MM-DD" }, measurements: [{ field: "value" }],
  } });
  const instant = new Date(activeEpochMs).toISOString();
  return buildFrameAvailabilityEvidence({ activeEpochMs, clock: [activeEpochMs], group: { period: { start: instant, end: instant } },
    members: [{ chartId: "a", timeRole: "observation" }], charts: [chart], loadedData: { data: rows }, profiles: { data: profileDataset(rows) },
    contexts: { a: { kind: "cursor", matching } }, timezone: "UTC" })[0];
}

test("cursor availability agrees with exact first-day and carried observations outside its clock window", () => {
  assert.equal(cursorAvailability(JAN1, { policy: "exact" }).status, "concurrent");
  const carried = cursorAvailability(JAN2, { policy: "lastKnown" });
  assert.equal(carried.status, "latest");
  assert.deepEqual(carried.observationEpochs, [JAN1, JAN3]);
});

test("cursor availability respects the same numeric interpolation permission as chart resolution", () => {
  assert.equal(cursorAvailability(JAN2, { policy: "interpolate" }, ["Low", "High"]).status, "unavailable");
});

test("one reducer starts Live and steps from the declared instant into At", () => {
  assert.deepEqual(initialPlaybackState.cursor, { mode: "live", epochMs: null, scope: { kind: "page", id: null }, window: null });
  const previous = reducePlaybackState(initialPlaybackState, { type: "cursorStep", direction: -1, clock, liveEpochMs: JAN2 + 1000 });
  assert.equal(previous.cursor.mode, "at"); assert.equal(previous.cursor.epochMs, JAN2);
  assert.equal(previous.playing, false);
  const next = reducePlaybackState(previous, { type: "cursorStep", direction: 1, clock });
  assert.equal(next.cursor.epochMs, JAN3);
  const live = reducePlaybackState(next, { type: "cursorLive" });
  assert.equal(live.cursor.mode, "live"); assert.equal(live.cursor.epochMs, null);
  assert.equal(initialPlaybackState.cursor.mode, "live");
});

test("cursor seek honors window, scope switches reconcile once and empty clocks disable transport", () => {
  const window = { start: "2027-01-02T00:00:00.000Z", end: "2027-01-03T00:00:00.000Z" };
  let state = reducePlaybackState(initialPlaybackState, { type: "cursorWindow", window, clock: [JAN2, JAN3] });
  state = reducePlaybackState(state, { type: "cursorSeek", epochMs: JAN1, clock: [JAN2, JAN3] });
  assert.equal(state.cursor.epochMs, JAN2);
  state = reducePlaybackState(state, { type: "cursorScope", scope: { kind: "storyline", id: "story" }, clock: [JAN3] });
  assert.equal(state.cursor.epochMs, JAN3);
  state = reducePlaybackState(state, { type: "cursorScope", scope: { kind: "page", id: "empty" }, clock: [] });
  assert.equal(state.cursor.epochMs, null); assert.equal(state.playing, false);
  assert.equal(reducePlaybackState(state, { type: "cursorPlay", clock: [] }).playing, false);
  assert.throws(() => reducePlaybackState(state, { type: "cursorWindow", window: { start: "bad", end: "bad" }, clock: [] }), /window|instant/i);
  assert.throws(() => reducePlaybackState(state, { type: "cursorScope", scope: { kind: "group", id: "old" }, clock: [] }), /scope/i);
});

test("cursor playback advances literal frames and safety pause retains the selected instant", () => {
  let state = reducePlaybackState(initialPlaybackState, { type: "cursorPlay", clock, liveEpochMs: JAN1 });
  assert.equal(state.playing, true); assert.equal(state.cursor.epochMs, JAN1);
  state = reducePlaybackState(state, { type: "cursorTick", clock });
  assert.equal(state.cursor.epochMs, JAN2);
  const lost = reducePlaybackState(state, { type: "connectionLost" });
  assert.equal(lost.playing, false); assert.equal(lost.cursor.epochMs, JAN2);
  state = reducePlaybackState(state, { type: "cursorTick", clock });
  assert.equal(state.cursor.epochMs, JAN3); assert.equal(state.playing, false);
  assert.equal(reducePlaybackState({ ...initialPlaybackState, blackoutActive: true }, { type: "cursorPlay", clock, liveEpochMs: JAN1 }).playing, false);
  assert.equal(reducePlaybackState({ ...initialPlaybackState, connection: "lost" }, { type: "cursorPlay", clock, liveEpochMs: JAN1 }).playing, false);
});

test("scope clocks union eligible plotted observations without snapshot frames", () => {
  assert.equal(typeof scopeModel.buildCursorClock, "function");
  const rows = [{ date: "2027-01-03", value: 3 }, { date: "2027-01-01", value: 1 }, { date: "2027-01-01", value: 2 }];
  const chart = createChartDraft("line", { id: "a", sourceId: "data", title: "A", roles: {
    observation: { field: "date", interpretation: "temporal", format: "YYYY-MM-DD" }, measurements: [{ field: "value" }],
  } });
  const snapshot = createChartDraft("kpi", { id: "static", sourceId: "data", title: "Static", roles: { value: { field: "value" } } });
  const args = { charts: [chart, snapshot], loadedData: { data: rows }, profiles: { data: profileDataset(rows) }, timezone: "Europe/Berlin" };
  assert.deepEqual(scopeModel.buildCursorClock(args), [JAN1, JAN3]);
  assert.deepEqual(scopeModel.buildCursorClock({ ...args, window: { start: "2027-01-02T00:00:00.000Z", end: "2027-01-03T00:00:00.000Z" } }), [JAN3]);
  assert.deepEqual(scopeModel.buildCursorClock({ ...args, charts: [snapshot] }), []);
  assert.deepEqual(scopeModel.buildCursorClock({ ...args, loadedData: { data: [] } }), []);
  const invalidZone = { ...args, timezone: "Mars/Olympus" };
  assert.throws(() => scopeModel.buildCursorClock(invalidZone), /timezone/i);
});

test("mixed-cadence UTC observations stay distinct through a daylight-saving transition", () => {
  const rows = [{ instant: "2027-03-28T00:30:00.000Z", value: 1 }, { instant: "2027-03-28T01:30:00.000Z", value: 2 }];
  const chart = createChartDraft("line", { id: "a", sourceId: "data", title: "A", roles: {
    observation: { field: "instant", interpretation: "temporal", format: "ISO-8601" }, measurements: [{ field: "value" }],
  } });
  const clock = scopeModel.buildCursorClock({ charts: [chart], loadedData: { data: rows }, profiles: { data: profileDataset(rows) }, timezone: "Europe/Berlin" });
  assert.deepEqual(clock, [Date.UTC(2027, 2, 28, 0, 30), Date.UTC(2027, 2, 28, 1, 30)]);
});

test("Live exercise time is separate from scope observations and rejects ambiguous or invalid instants", () => {
  assert.equal(typeof scopeModel.resolveLiveEpochMs, "function");
  assert.equal(scopeModel.resolveLiveEpochMs({ exerciseTime: "2027-01-02T00:00:00.000Z", clock }), JAN2);
  assert.equal(scopeModel.resolveLiveEpochMs({ clock }), JAN3);
  assert.equal(scopeModel.resolveLiveEpochMs({ clock: [] }), null);
  for (const exerciseTime of ["2027-03-28T02:30", "2027-02-30T00:00:00.000Z", "invalid"]) {
    assert.throws(() => scopeModel.resolveLiveEpochMs({ exerciseTime, clock }), /exercise|instant/i);
  }
});

test("matching resolves chart default then Storyline member then session, retaining legacy bounds", () => {
  assert.equal(typeof scopeModel.resolveCursorMatching, "function");
  const chart = { interaction: { timeSync: { matching: { policy: "exact" } } } };
  assert.deepEqual(scopeModel.resolveCursorMatching({ chart }), { policy: "exact" });
  assert.deepEqual(scopeModel.resolveCursorMatching({ chart, member: { matching: { policy: "lastKnown" } } }), { policy: "lastKnown" });
  assert.deepEqual(scopeModel.resolveCursorMatching({ chart, member: { matching: { policy: "lastKnown" } }, sessionOverride: "concurrent" }), { policy: "exact" });
  assert.deepEqual(scopeModel.resolveCursorMatching({ chart, member: { matching: "Snap to Closest" }, inheritedMatching: { policy: "nearest", toleranceMs: 86400000 } }), { policy: "nearest", toleranceMs: 86400000 });
  assert.throws(() => scopeModel.resolveCursorMatching({ chart, member: { matching: { policy: "nearest" } } }), /tolerance/);
  assert.equal(chart.interaction.timeSync.matching.policy, "exact");
});

test("scope selection preserves cross-page Storyline order and excludes unrelated charts", () => {
  assert.equal(typeof scopeModel.selectCursorScopeCharts, "function");
  const charts = [{ id: "a" }, { id: "b" }, { id: "c" }];
  const args = { charts, pageCharts: [charts[0]], storylines: [{ id: "story", members: [{ chartId: "c" }, { chartId: "a" }] }] };
  assert.deepEqual(scopeModel.selectCursorScopeCharts({ ...args, scope: { kind: "page", id: "first" } }).map(chart => chart.id), ["a"]);
  assert.deepEqual(scopeModel.selectCursorScopeCharts({ ...args, scope: { kind: "storyline", id: "story" } }).map(chart => chart.id), ["c", "a"]);
  assert.deepEqual(scopeModel.selectCursorScopeCharts({ ...args, scope: { kind: "dashboard", id: null } }).map(chart => chart.id), ["a", "b", "c"]);
  assert.deepEqual(scopeModel.selectCursorScopeCharts({ ...args, scope: { kind: "storyline", id: "missing" } }), []);
});

test("Storyline source and calendar cadence share the cursor while retaining deliberate no-data frames", () => {
  assert.equal(typeof scopeModel.buildStorylineClock, "function");
  const rows = [{ date: "2027-01-01", value: 1 }, { date: "2027-01-03", value: 3 }];
  const chart = createChartDraft("line", { id: "a", sourceId: "data", title: "A", roles: {
    observation: { field: "date", interpretation: "temporal", format: "YYYY-MM-DD" }, measurements: [{ field: "value" }],
  } });
  const storyline = { id: "story", members: [{ chartId: "a", width: 4 }],
    period: { start: "2027-01-01T00:00:00.000Z", end: "2027-01-03T00:00:00.000Z" },
    frames: { mode: "calendar", interval: { value: 1, unit: "day" } } };
  const args = { charts: [chart], loadedData: { data: rows }, profiles: { data: profileDataset(rows) }, timezone: "Europe/Berlin", storyline };
  assert.deepEqual(scopeModel.buildStorylineClock(args), [JAN1, JAN2, JAN3]);
  assert.deepEqual(scopeModel.buildStorylineClock({ ...args, storyline: { ...storyline, period: undefined } }), [JAN1, JAN2, JAN3]);
  assert.deepEqual(scopeModel.buildStorylineClock({ ...args, window: { start: "2027-01-02T00:00:00.000Z", end: "2027-01-03T00:00:00.000Z" } }), [JAN2, JAN3]);
  assert.deepEqual(scopeModel.buildStorylineClock({ ...args, storyline: { ...storyline, frames: { mode: "calendar", interval: { value: 2, unit: "day" } } },
    window: { start: "2027-01-02T00:00:00.000Z", end: "2027-01-03T00:00:00.000Z" } }), [JAN3]);
  assert.deepEqual(scopeModel.buildStorylineClock({ ...args, storyline: { ...storyline, frames: { mode: "source", chartId: "a", selection: "all" } } }), [JAN1, JAN3]);
  assert.deepEqual(scopeModel.buildStorylineClock({ ...args, storyline: { ...storyline, frames: { mode: "source", chartId: "a", selection: "selected", selectedEpochs: [JAN2, JAN3] } } }), [JAN3]);
});

test("shared projection resolves exact Live literally and preserves member overrides across pages", () => {
  const rows = [{ date: "2027-01-01", value: 1 }, { date: "2027-01-03", value: 3 }];
  const chart = createChartDraft("line", { id: "a", sourceId: "data", title: "A", roles: {
    observation: { field: "date", interpretation: "temporal", format: "YYYY-MM-DD" }, measurements: [{ field: "value" }],
  } });
  chart.interaction.timeSync = { matching: { policy: "exact" } };
  const second = { ...structuredClone(chart), id: "b" };
  const args = { state: initialPlaybackState, charts: [chart, second], pageCharts: [chart], loadedData: { data: rows }, profiles: { data: profileDataset(rows) }, exerciseTime: "2027-01-02T00:00:00.000Z" };
  const live = deriveCursorPlayback(args);
  assert.equal(live.activeEpochMs, JAN2);
  assert.deepEqual(live.contexts.a.matching, { policy: "exact" });
  const rendered = applyTimeContext({ chart, rows, profile: args.profiles.data, timeContext: live.contexts.a });
  assert.equal(rendered.activeTime.status, "missing");
  assert.equal(live.contexts.b, undefined);
  const storyline = { id: "story", members: [{ chartId: "b", matching: { policy: "lastKnown" } }, { chartId: "a" }], frames: { mode: "calendar", interval: { value: 1, unit: "day" } } };
  const state = reducePlaybackState(initialPlaybackState, { type: "cursorScope", scope: { kind: "storyline", id: "story" }, clock });
  const comparison = deriveCursorPlayback({ ...args, state, scenes: [storyline] });
  assert.deepEqual(comparison.members.map(member => member.chartId), ["b", "a"]);
  assert.deepEqual(comparison.contexts.b.matching, { policy: "lastKnown" });
  assert.deepEqual(comparison.contexts.a.matching, { policy: "exact" });
  assert.deepEqual(comparison.clock, [JAN1, JAN2, JAN3]);
});

test("conflicting shared Group policies never choose a chart default by traversal order", () => {
  const groups = [{ members: [{ chartId: "a" }], matching: { policy: "exact" } }, { members: [{ chartId: "a" }], matching: { policy: "lastKnown" } }];
  assert.equal(scopeModel.unambiguousLegacyChartMatching("a", groups), undefined);
  assert.equal(scopeModel.unambiguousLegacyChartMatching("a", [...groups].reverse()), undefined);
  assert.deepEqual(scopeModel.unambiguousLegacyChartMatching("a", groups.slice(0, 1)), { policy: "exact" });
});

test("a page change projects its new scope and reconciled instant atomically before effects publish", () => {
  const rows = [{ date: "2027-01-03", value: 3 }];
  const chart = createChartDraft("line", { id: "a", sourceId: "data", title: "A", roles: {
    observation: { field: "date", interpretation: "temporal", format: "YYYY-MM-DD" }, measurements: [{ field: "value" }],
  } });
  const state = { ...initialPlaybackState, cursor: { mode: "at", epochMs: JAN1, scope: { kind: "page", id: "old" }, window: null } };
  const next = deriveCursorPlayback({ state, charts: [chart], pageCharts: [chart], activePageId: "new", loadedData: { data: rows }, profiles: { data: profileDataset(rows) } });
  assert.deepEqual(next.cursor.scope, { kind: "page", id: "new" });
  assert.equal(next.activeEpochMs, JAN3);
  assert.equal(next.contexts.a.activeEpochMs, JAN3);
  assert.deepEqual(next.contexts.a.scope, { kind: "page", id: "new" });
  assert.equal(state.cursor.epochMs, JAN1);
});

test("Scenario exercise time round-trips explicitly through dashboard normalization and package serialization", () => {
  const config = collaboratorPackage().config;
  config.scenario = { exerciseTime: "2027-03-31T23:59:59.999Z" };
  const parsed = parseDashboardPackageCandidate(JSON.stringify(serializeDashboardBundle(config)));
  assert.deepEqual(parsed.config.scenario, config.scenario);
  config.scenario.exerciseTime = "2027-02-30T00:00:00.000Z";
  assert.throws(() => serializeDashboardBundle(config), /exercise|instant/i);
});

test("legacy Whole page Group-only requests resolve to an available scope", () => {
  assert.equal(typeof providerModel.legacyPlaybackScope, "function");
  const args = { state: initialPlaybackState, requested: "group-only", activePageId: "first", groups: [], scenes: [] };
  assert.deepEqual(providerModel.legacyPlaybackScope(args), { kind: "page", id: "first" });
  assert.deepEqual(providerModel.legacyPlaybackScope({ ...args, state: { ...initialPlaybackState, activeSceneId: "story" }, scenes: [{ id: "story" }] }), { kind: "storyline", id: "story" });
  assert.throws(() => providerModel.legacyPlaybackScope({ ...args, requested: "invented" }), /scope/i);
});

test("legacy integer seek indices clamp while fractional indices stay invalid", () => {
  assert.equal(typeof providerModel.legacySeekEpoch, "function");
  assert.equal(providerModel.legacySeekEpoch(-99, clock), JAN1);
  assert.equal(providerModel.legacySeekEpoch(99, clock), JAN3);
  assert.equal(providerModel.legacySeekEpoch(0, []), null);
  assert.throws(() => providerModel.legacySeekEpoch(0.5, clock), /integer/);
});

test("legacy unbounded nearest remains a recoverable chart diagnostic without crashing the shared provider", () => {
  const rows = [{ date: "2027-01-01", value: 1 }, { date: "2027-01-03", value: 3 }];
  const chart = createChartDraft("line", { id: "a", sourceId: "data", title: "A", roles: {
    observation: { field: "date", interpretation: "temporal", format: "YYYY-MM-DD" }, measurements: [{ field: "value" }],
  } });
  const group = { id: "legacy", name: "Legacy", members: [{ chartId: "a", timeRole: "observation" }],
    period: { start: "2027-01-01", end: "2027-01-03" }, secondsPerFrame: 1, matching: { policy: "exact" } };
  const state = { ...initialPlaybackState, cursor: { mode: "at", epochMs: JAN2, scope: { kind: "storyline", id: "story" }, window: null } };
  for (const value of ["nearest", "Snap to Closest"]) for (const useDefault of [false, true]) {
    const scene = { id: "story", chronoGroupId: "legacy", members: [{ chartId: "a", width: 4, ...(!useDefault ? { matching: value } : {}) }],
      ...(useDefault ? { defaultMatching: value } : {}), frames: { mode: "source", chartId: "a", selection: "all" } };
    const before = structuredClone(scene);
    const result = deriveCursorPlayback({ state, charts: [chart], groups: [group], scenes: [scene], loadedData: { data: rows }, profiles: { data: profileDataset(rows) } });
    assert.deepEqual(result.contexts.a.matching, { policy: "nearest" });
    const rendered = applyTimeContext({ chart, rows, profile: profileDataset(rows), timeContext: result.contexts.a });
    assert.equal(rendered.diagnostics[0].code, "invalid-time-matching");
    assert.deepEqual(rendered.rows, []);
    assert.deepEqual(scene, before);
  }
});

test("nearest session authoring requires an explicit bound and shares it with chart resolution", () => {
  assert.throws(() => reducePlaybackState(initialPlaybackState, { type: "setMatchingOverride", policy: "closest" }), /tolerance/i);
  assert.throws(() => reducePlaybackState(initialPlaybackState, { type: "setMatchingOverride", policy: "closest", nearestToleranceMs: -1 }), /tolerance/i);
  const state = reducePlaybackState(initialPlaybackState, { type: "setMatchingOverride", policy: "closest", nearestToleranceMs: 3_600_000 });
  assert.equal(state.nearestToleranceMs, 3_600_000);
  assert.deepEqual(scopeModel.resolveCursorMatching({ sessionOverride: "closest", nearestToleranceMs: state.nearestToleranceMs }), { policy: "nearest", toleranceMs: 3_600_000 });
  assert.deepEqual(scopeModel.resolveCursorMatching({ sessionOverride: "closest" }), { policy: "nearest" });
});

test("nearest session uses its visible bound and never replaces exact defaults or an invalid legacy session", () => {
  const rows = [{ date: "2027-01-01", value: 1 }, { date: "2027-01-03", value: 3 }];
  const chart = createChartDraft("line", { id: "a", sourceId: "data", title: "A", roles: {
    observation: { field: "date", interpretation: "temporal", format: "YYYY-MM-DD" }, measurements: [{ field: "value" }],
  } });
  chart.interaction.timeSync = { matching: { policy: "exact" } };
  const args = { charts: [chart], loadedData: { data: rows }, profiles: { data: profileDataset(rows) }, exerciseTime: "2027-01-02T00:00:00.000Z" };
  const state = reducePlaybackState(initialPlaybackState, { type: "setMatchingOverride", policy: "closest", nearestToleranceMs: 3_600_000 });
  const projection = deriveCursorPlayback({ ...args, state });
  assert.equal(projection.cursor.nearestToleranceMs, 3_600_000);
  assert.deepEqual(projection.contexts.a.matching, { policy: "nearest", toleranceMs: 3_600_000 });
  assert.equal(applyTimeContext({ chart, rows, profile: args.profiles.data, timeContext: projection.contexts.a }).activeTime.status, "missing");
  const legacy = deriveCursorPlayback({ ...args, state: { ...initialPlaybackState, matchingOverride: "closest" } });
  assert.equal(applyTimeContext({ chart, rows, profile: args.profiles.data, timeContext: legacy.contexts.a }).diagnostics[0].code, "invalid-time-matching");
  const authored = deriveCursorPlayback({ ...args, state: reducePlaybackState(state, { type: "setMatchingOverride", policy: "authored" }) });
  assert.deepEqual(authored.contexts.a.matching, { policy: "exact" });
  assert.deepEqual(chart.interaction.timeSync.matching, { policy: "exact" });
});
