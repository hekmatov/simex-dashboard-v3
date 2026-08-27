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
    period: { start: 1_000, end: 3_000 },
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

test("controller exposes source, playback, output, session, and terminal controls without matching override", () => {
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
    "open-new-session", "source", "previous", "seek", "next",
    "trace-reveal", "trace-full", "cadence", "play", "pause",
    "output-active", "output-holding", "output-blank", "blackout", "restore", "end",
  ]) {
    assert.match(html, new RegExp(`data-presentation-control-id="${controlId}"`), controlId);
  }
  assert.doesNotMatch(html, /matching override|session_override|SET_MATCHING_OVERRIDE/i);
});
