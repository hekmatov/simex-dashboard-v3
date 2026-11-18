import test from "node:test";
import assert from "node:assert/strict";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { validatePresentationState } from "../src/lib/presentationProtocol.js";
import { presentationTimeFixture } from "./helpers/presentationTimeFixture.js";

const vite = await createServer({
  root: process.cwd(),
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});
const controllerModule = await vite.ssrLoadModule(
  "/src/components/presentation/PresentationController.jsx",
).catch(() => null);
await vite.close();

const presentableItemIndex = new Map([
  ["chart-a", { descriptor: { kind: "chart", chart_id: "chart-a" } }],
  ["chart-b", { descriptor: { kind: "chart", chart_id: "chart-b" } }],
]);

const scene = {
  id: "scene-a",
  name: "Response scene",
  chronoGroupId: "group-a",
  secondsPerFrame: 2,
  period: { start: "1970-01-01T00:00:00.500Z", end: "1970-01-01T00:00:03.500Z" },
  audience: {
    datePosition: { xPermille: 640, yPermille: 70, widthPermille: 300 },
  },
  present: { chartIds: ["chart-a", "chart-b"], layout: "split-horizontal" },
};
const group = {
  id: "group-a",
  name: "Response timeline",
  secondsPerFrame: 3,
  members: [{ chartId: "chart-a" }, { chartId: "chart-b" }],
};
const playback = {
  cursor: { mode: "at", scope: { kind: "storyline", id: scene.id }, window: null },
  activeEpochMs: 2_000, exerciseTime: null, matchingOverride: "authored", nearestToleranceMs: null,
  activeScene: scene,
  activeSceneId: scene.id,
  activeGroup: group,
  activeGroupId: group.id,
  activeIndex: 1,
  clock: [1_000, 2_000, 3_000],
  groups: [group],
  scenes: [scene],
  speed: 2,
  traceMode: "reveal",
  playing: false,
  dispatch() {},
};

test("Present projects the shared Live/At cursor for manual and parentless Storyline output", () => {
  const shared = { ...playback, activeScene: null, activeSceneId: null, activeGroupId: null,
    activeGroup: { id: "cursor-dashboard" }, source: { kind: "default", id: null },
    cursor: { mode: "live", scope: { kind: "dashboard", id: null }, window: null },
    activeEpochMs: 1500, exerciseTime: "1970-01-01T00:00:01.500Z", matchingOverride: "closest", nearestToleranceMs: 100 };
  const options = { dashboard: { id: "reference" }, activePageId: "bio", displayedChartIds: ["chart-a"], layout: "solo",
    presentableItemIndex, audienceFacts: { dashboard_name: false, page: false, parent_chrono_group: false, scene_name: false, scene_date: true } };
  const manual = controllerModule.buildPresentationState({ ...options, playback: shared });
  assert.deepEqual(manual.source, { kind: "manual", scene_id: null });
  assert.equal(manual.time.epoch_ms, 1500); assert.equal(manual.time.mode, "live");
  assert.equal(manual.time.nearest_tolerance_ms, 100); assert.equal(Object.hasOwn(manual, "timeline"), false);
  const parentless = { ...scene }; delete parentless.chronoGroupId;
  const saved = controllerModule.buildPresentationState({ ...options, playback: { ...shared, activeScene: parentless,
    cursor: { ...shared.cursor, mode: "at", scope: { kind: "storyline", id: scene.id } } } });
  assert.equal(Object.hasOwn(saved.source, "chrono_group_id"), false); assert.equal(saved.time.epoch_ms, 1500);
  assert.doesNotThrow(() => validatePresentationState(saved, { presentableItemIndex }));
});

test("strict state projection uses authored matching and explicit Scene Audience wire mapping", () => {
  assert.equal(typeof controllerModule?.buildPresentationState, "function");
  const projected = controllerModule.buildPresentationState({
    dashboard: { id: "dashboard-a", configVersion: 3, lastUpdated: "2026-08-27", scenes: [scene] },
    activePageId: "biomedical",
    displayedChartIds: ["chart-a", "chart-b"],
    layout: "sideBySide",
    playback,
    presentableItemIndex,
    audienceFacts: {
      dashboard_name: true,
      page: false,
      parent_chrono_group: true,
      scene_name: true,
      scene_date: true,
    },
    outputMode: "active",
    blackout: false,
    themeProjection: {
      dashboardStyle: "humanist-standard",
      dashboardColorProfile: "humanist-standard/open-forum",
      chartColorMode: "standard",
      appearancePreference: "system",
      resolvedAppearance: "dark",
    },
  });

  assert.equal(projected.time.matching_override, "authored");
  assert.equal(Object.hasOwn(projected, "matching"), false);
  assert.deepEqual(projected.source, {
    kind: "scene",
    scene_id: "scene-a",
  });
  assert.deepEqual(projected.time, presentationTimeFixture({
    frame_epochs: [1_000, 2_000, 3_000],
    frame_index: 1,
    scope: { kind: "storyline", id: scene.id },
    trace_mode: "reveal",
    seconds_per_frame: 2,
  }));
  assert.deepEqual(projected.audience, {
    date_position: { x_permille: 640, y_permille: 70, width_permille: 300 },
  });
  assert.deepEqual(projected.composition.displayed_chart_ids, ["chart-a", "chart-b"]);
  assert.deepEqual(projected.payload.items, [
    { kind: "chart", chart_id: "chart-a" },
    { kind: "chart", chart_id: "chart-b" },
  ]);
  assert.deepEqual(projected.theme, {
    dashboard_style: "humanist-standard",
    dashboard_color_profile: "humanist-standard/open-forum",
    chart_color_mode: "standard",
    appearance_preference: "system",
    resolved_appearance: "dark",
  });
});

test("manual Present selection retains the same shared cursor and clock", () => {
  const input = { ...playback, activeScene: null, activeSceneId: null, activeGroupId: null,
    cursor: { ...playback.cursor, scope: { kind: "dashboard", id: null } }, source: { kind: "default", id: null } };
  const manual = controllerModule.resolvePresentPlayback(input);
  assert.equal(manual, input);
  assert.deepEqual(manual.clock, [1_000, 2_000, 3_000]);
  assert.equal(controllerModule.resolvePresentPlayback(playback), playback);
});

test("source eligibility distinguishes valid authored sources from Needs-attention", () => {
  assert.deepEqual(controllerModule.presentationSourceEligibility(scene), {
    status: "valid",
    reason: null,
  });
  assert.deepEqual(controllerModule.presentationSourceEligibility({
    ...scene,
    present: {
      ...scene.present,
      temporalReview: { status: "degraded", sourceIds: ["source-a"] },
    },
  }), {
    status: "needs-attention",
    reason: {
      code: "scene_needs_attention",
      message: "Scene needs attention before it can replace the Audience output.",
      sourceId: "scene-a",
    },
  });
  assert.deepEqual(controllerModule.presentationSourceEligibility({
    ...scene,
    frames: { mode: "unresolved", reason: "source-chart-moved", previousChartId: "chart-old" },
  }), {
    status: "needs-attention",
    reason: {
      code: "scene_unresolved_frame_source",
      message: "Choose and save a replacement Frame source before using this Scene in Audience output.",
      sourceId: "scene-a",
    },
  });
});

test("Scene publication waits for DashboardRenderer to land the saved composition", () => {
  assert.deepEqual(controllerModule.presentationSourceEligibility(scene, {
    compositionReady: false,
  }), {
    status: "invalid",
    reason: {
      code: "scene_composition_transition_pending",
      message: "The saved Scene composition is still being applied.",
      sourceId: "scene-a",
    },
  });
  assert.deepEqual(controllerModule.presentationSourceEligibility(scene, {
    compositionReady: true,
  }), { status: "valid", reason: null });
});

test("legacy Group projection retains shared frames without inventing a session window", () => {
  const projected = controllerModule.buildPresentationState({
    dashboard: { id: "dashboard-a", configVersion: 3, lastUpdated: "2026-08-27" },
    activePageId: "biomedical",
    displayedChartIds: ["chart-a"],
    layout: "solo",
    playback: {
      ...playback,
      activeScene: null,
      activeSceneId: null,
      activeGroup: {
        ...group,
        period: { start: "1970-01-01", end: "1970-01-01" },
      },
      activeIndex: 0,
      activeEpochMs: 1_000,
      cursor: { mode: "at", scope: { kind: "storyline", id: group.id }, window: null },
    },
    presentableItemIndex,
    audienceFacts: {
      dashboard_name: true,
      page: false,
      parent_chrono_group: true,
      scene_name: false,
      scene_date: true,
    },
    outputMode: "active",
    blackout: false,
  });
  assert.deepEqual(projected.time.frame_epochs, [1_000, 2_000, 3_000]);
  assert.equal(projected.time.window, null);
});

test("implicit empty default-page playback projects as a manual static-only source", () => {
  const projected = controllerModule.buildPresentationState({
    dashboard: { id: "dashboard-static", configVersion: 6, lastUpdated: "2026-08-28" },
    activePageId: "biomedical",
    displayedChartIds: ["chart-a"],
    layout: "solo",
    playback: {
      ...playback,
      activeScene: null,
      activeSceneId: null,
      activeGroup: {
        id: "default-page",
        name: "Default page timeline",
        members: [],
      },
      activeGroupId: "default-page",
      activeIndex: 0,
      clock: [],
      activeEpochMs: null,
      cursor: { mode: "live", scope: { kind: "page", id: "biomedical" }, window: null },
      source: { kind: "default" },
    },
    presentableItemIndex,
    audienceFacts: {
      dashboard_name: true,
      page: false,
      parent_chrono_group: false,
      scene_name: false,
      scene_date: false,
    },
  });

  assert.deepEqual(projected.source, {
    kind: "manual",
    scene_id: null,
  });
  assert.deepEqual(projected.time.frame_epochs, []);
  assert.equal(projected.time.epoch_ms, null);
});

test("dated default-page playback gives Audience its actual shared Live instant and frame ledger", () => {
  const projected = controllerModule.buildPresentationState({
    dashboard: { id: "dashboard-dated", configVersion: 6, lastUpdated: "2026-08-28" },
    activePageId: "biomedical",
    displayedChartIds: ["chart-a"],
    layout: "solo",
    playback: {
      ...playback,
      activeScene: null,
      activeSceneId: null,
      activeGroup: {
        id: "default-page",
        name: "Default page timeline",
        members: [{ chartId: "chart-a" }],
      },
      activeGroupId: "default-page",
      clock: [1_000, 2_000, 3_000],
      activeEpochMs: 3_000,
      cursor: { mode: "live", scope: { kind: "page", id: "biomedical" }, window: null },
      source: { kind: "default" },
    },
    presentableItemIndex,
    audienceFacts: {
      dashboard_name: true,
      page: false,
      parent_chrono_group: false,
      scene_name: false,
      scene_date: false,
    },
  });

  assert.deepEqual(projected.time.frame_epochs, [1_000, 2_000, 3_000]);
  assert.equal(projected.time.epoch_ms, 3_000);
  assert.equal(projected.time.mode, "live");
  assert.doesNotThrow(() => validatePresentationState(projected, { presentableItemIndex }));
});

test("END effects execute once in order and report truthful close outcomes", () => {
  assert.equal(typeof controllerModule?.executePresentationEndEffects, "function");
  const calls = [];
  const actions = controllerModule.executePresentationEndEffects({
    effects: ["PUBLISH_ENDED", "REQUEST_AUDIENCE_CLOSE", "TERMINATE_CHANNEL"],
    sessionId: "session-a",
    channelGeneration: 4,
    effectsVersion: 2,
  }, {
    publishEnded: () => calls.push("publish"),
    requestClose: () => {
      calls.push("close");
      return { outcome: "denied-surface-remains" };
    },
    terminateChannel: () => calls.push("terminate"),
  });

  assert.deepEqual(calls, ["publish", "close", "terminate"]);
  assert.deepEqual(actions, [
    {
      type: "AUDIENCE_CLOSE_DENIED",
      sessionId: "session-a",
      channelGeneration: 4,
      surfaceRemains: true,
    },
    {
      type: "EFFECTS_CONSUMED",
      sessionId: "session-a",
      channelGeneration: 4,
      effectsVersion: 2,
    },
  ]);
});

test("END effects guard each adapter and always consume effects after disposal", () => {
  const calls = [];
  const actions = controllerModule.executePresentationEndEffects({
    effects: ["PUBLISH_ENDED", "REQUEST_AUDIENCE_CLOSE", "TERMINATE_CHANNEL"],
    sessionId: "session-throwing",
    channelGeneration: 7,
    effectsVersion: 3,
  }, {
    publishEnded() {
      calls.push("publish");
      throw new Error("publish failed");
    },
    requestClose() {
      calls.push("close");
      throw new Error("close failed");
    },
    terminateChannel() {
      calls.push("terminate");
      throw new Error("terminate failed");
    },
  });

  assert.deepEqual(calls, ["publish", "close", "terminate"]);
  assert.deepEqual(actions, [
    {
      type: "AUDIENCE_CLOSE_DENIED",
      sessionId: "session-throwing",
      channelGeneration: 7,
      surfaceRemains: true,
    },
    {
      type: "EFFECTS_CONSUMED",
      sessionId: "session-throwing",
      channelGeneration: 7,
      effectsVersion: 3,
    },
  ]);
});

test("lower controller exposes only output choices while the shared Time bar owns transport", () => {
  assert.equal(typeof controllerModule?.default, "function");
  const html = renderToStaticMarkup(React.createElement(controllerModule.default, {
    runtime: {
      sessionState: {
        lifecycle: "ended",
        connection: "terminated",
        output: "ended",
        playback: "paused",
        blackout: false,
        rejectionReason: null,
      },
      openNewSession() {},
      reopenAudience() {},
      publish() {},
      dispatch() {},
      end() {},
    },
    playback,
    presentationState: { output_mode: "active" },
    sourceEligibility: { status: "valid", reason: null },
  }));

  for (const controlId of [
    "output-active", "output-holding", "output-black", "close-output-controls",
  ]) {
    assert.match(html, new RegExp(`data-presentation-control-id="${controlId}"`), controlId);
  }
  assert.doesNotMatch(html, /data-presentation-control-id="(?:source|previous|seek|next|trace-reveal|trace-full|cadence|play|pause)"/);
  assert.doesNotMatch(html, /open-new-session|reopen-audience|Open audience display|Reopen audience display/);
  assert.doesNotMatch(html, /matching override|session_override|SET_MATCHING_OVERRIDE|>Presentation source<|>Restore<|>Blackout<|>End presentation</i);
});
