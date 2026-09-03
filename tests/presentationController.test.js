import test from "node:test";
import assert from "node:assert/strict";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

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

  assert.deepEqual(projected.matching, { use_authored_settings: true });
  assert.equal(Object.hasOwn(projected.matching, "session_override"), false);
  assert.deepEqual(projected.source, {
    kind: "scene",
    scene_id: "scene-a",
    chrono_group_id: "group-a",
  });
  assert.deepEqual(projected.timeline, {
    frame_epochs: [1_000, 2_000, 3_000],
    frame_index: 1,
    period: { start: 500, end: 3_500 },
    trace_mode: "reveal",
    seconds_per_frame: 2,
  });
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

test("Chrono Group projection uses its authored inclusive period rather than observed endpoints", () => {
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
  assert.deepEqual(projected.timeline.period, { start: 0, end: 86_399_999 });
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
    chrono_group_id: null,
  });
  assert.equal(projected.timeline, null);
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

test("lower controller exposes source, playback, output, and terminal controls without the Audience lifecycle action", () => {
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
    "source", "previous", "seek", "next",
    "trace-reveal", "trace-full", "cadence", "play", "pause",
    "output-active", "output-holding", "output-blank", "blackout", "restore", "end",
  ]) {
    assert.match(html, new RegExp(`data-presentation-control-id="${controlId}"`), controlId);
  }
  assert.doesNotMatch(html, /open-new-session|reopen-audience|Open audience display|Reopen audience display/);
  assert.doesNotMatch(html, /matching override|session_override|SET_MATCHING_OVERRIDE/i);
});
