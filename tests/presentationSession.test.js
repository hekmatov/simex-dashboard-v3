import test from "node:test";
import assert from "node:assert/strict";

import {
  createInitialPresentationSession,
  reducePresentationSession,
} from "../src/lib/presentationSession.js";

const presentableItemIndex = new Map([
  ["chart-001", {
    id: "chart-001",
    descriptor: { kind: "chart", chart_id: "chart-001" },
  }],
]);
const validationContext = { presentableItemIndex };

function openSession(state = createInitialPresentationSession(), overrides = {}) {
  return reducePresentationSession(state, {
    type: "OPEN_NEW_SESSION",
    sessionId: "session-001",
    requestedWindowName: "simex-audience-session-001",
    ...overrides,
  });
}

function event(state, type, overrides = {}) {
  return {
    type,
    sessionId: state.sessionId,
    channelGeneration: state.channelGeneration,
    ...overrides,
  };
}

function presentationState(overrides = {}) {
  return {
    dashboard_revision: "dashboard-1",
    source: {
      kind: "scene",
      scene_id: "scene-001",
      chrono_group_id: "group-001",
    },
    composition: {
      active_page_id: "page-001",
      displayed_chart_ids: ["chart-001"],
      layout: "solo",
    },
    timeline: {
      frame_epochs: [1_000, 2_000, 3_000],
      frame_index: 0,
      period: { start: 1_000, end: 3_000 },
      trace_mode: "reveal",
      seconds_per_frame: 2,
    },
    matching: { use_authored_settings: true },
    output_mode: "active",
    blackout: false,
    audience: {
      date_position: {
        x_permille: 700,
        y_permille: 50,
        width_permille: 250,
      },
    },
    payload: {
      items: [{ kind: "chart", chart_id: "chart-001" }],
      audience_facts: {
        dashboard_name: true,
        page: true,
        parent_chrono_group: true,
        scene_name: true,
        scene_date: true,
      },
    },
    ...overrides,
  };
}

function acceptedMessage(state, payload = presentationState()) {
  return {
    protocol_version: 3,
    session_id: state.sessionId,
    sequence: 1,
    type: "state",
    payload,
  };
}

function liveSession() {
  const connected = reducePresentationSession(
    openSession(),
    event(openSession(), "CONNECTED"),
  );
  return reducePresentationSession(connected, event(connected, "SNAPSHOT_ACCEPTED", {
    message: acceptedMessage(connected),
  }), validationContext);
}

test("OPEN_NEW_SESSION is the allocation transition and requires runtime identity", () => {
  const initial = createInitialPresentationSession();
  assert.equal(initial.sessionId, null);
  assert.equal(initial.channelGeneration, 0);
  assert.equal(initial.acceptsSessionEvents, false);

  assert.throws(
    () => reducePresentationSession(initial, {
      type: "OPEN_NEW_SESSION",
      requestedWindowName: "audience-1",
    }),
    /sessionId/,
  );

  const opened = openSession(initial);
  assert.deepEqual(
    {
      sessionId: opened.sessionId,
      requestedWindowName: opened.requestedWindowName,
      channelGeneration: opened.channelGeneration,
      lifecycle: opened.lifecycle,
      window: opened.window,
      closeOutcome: opened.closeOutcome,
      connection: opened.connection,
      output: opened.output,
      playback: opened.playback,
      blackout: opened.blackout,
      acceptsSessionEvents: opened.acceptsSessionEvents,
    },
    {
      sessionId: "session-001",
      requestedWindowName: "simex-audience-session-001",
      channelGeneration: 1,
      lifecycle: "waiting",
      window: "opening",
      closeOutcome: "not-requested",
      connection: "connecting",
      output: "holding",
      playback: "paused",
      blackout: false,
      acceptsSessionEvents: true,
    },
  );
});

test("OPEN_NEW_SESSION cannot replace a waiting or live session", () => {
  const replacement = {
    type: "OPEN_NEW_SESSION",
    sessionId: "session-002",
    requestedWindowName: "simex-audience-session-002",
  };
  const waiting = openSession();
  assert.equal(reducePresentationSession(waiting, replacement), waiting);
  const live = liveSession();
  assert.equal(reducePresentationSession(live, replacement), live);
});

test("a new session must use distinct runtime identity and a newer generation", () => {
  const ended = reducePresentationSession(openSession(), { type: "END" });
  for (const action of [
    {
      type: "OPEN_NEW_SESSION",
      sessionId: ended.sessionId,
      requestedWindowName: "simex-audience-session-002",
    },
    {
      type: "OPEN_NEW_SESSION",
      sessionId: "session-002",
      requestedWindowName: ended.requestedWindowName,
    },
    {
      type: "OPEN_NEW_SESSION",
      sessionId: "session-002",
      requestedWindowName: "simex-audience-session-002",
      channelGeneration: ended.channelGeneration,
    },
  ]) {
    assert.throws(() => reducePresentationSession(ended, action));
  }

  const reopened = reducePresentationSession(ended, {
    type: "OPEN_NEW_SESSION",
    sessionId: "session-002",
    requestedWindowName: "simex-audience-session-002",
    channelGeneration: 7,
  });
  assert.equal(reopened.lifecycle, "waiting");
  assert.equal(reopened.channelGeneration, 7);
  assert.equal(reopened.lastValidSnapshot, null);
});

test("later sessions cannot reuse any earlier channel or denied-close surface name", () => {
  const firstEnded = reducePresentationSession(openSession(), { type: "END" });
  const firstDenied = reducePresentationSession(
    firstEnded,
    event(firstEnded, "AUDIENCE_CLOSE_DENIED", { surfaceRemains: true }),
  );
  const second = reducePresentationSession(firstDenied, {
    type: "OPEN_NEW_SESSION",
    sessionId: "session-002",
    requestedWindowName: "simex-audience-session-002",
  });
  const secondEnded = reducePresentationSession(second, { type: "END" });

  assert.throws(() => reducePresentationSession(secondEnded, {
    type: "OPEN_NEW_SESSION",
    sessionId: "session-001",
    requestedWindowName: "simex-audience-session-003",
  }), /sessionId/);
  assert.throws(() => reducePresentationSession(secondEnded, {
    type: "OPEN_NEW_SESSION",
    sessionId: "session-003",
    requestedWindowName: "simex-audience-session-001",
  }), /requestedWindowName/);
});

test("waiting connection and deliberate output transitions retain accepted output", () => {
  const opened = openSession();
  const connected = reducePresentationSession(opened, event(opened, "CONNECTED"));
  assert.equal(connected.window, "open");
  assert.equal(connected.connection, "connected");
  assert.equal(connected.lifecycle, "waiting");

  const blank = reducePresentationSession(connected, { type: "SET_OUTPUT_MODE", mode: "blank" });
  assert.equal(blank.output, "blank");
  assert.equal(blank.playback, "paused");
  assert.equal(blank.lastValidSnapshot, null);
});

test("source selection is a paused request and only a valid accepted snapshot enters live", () => {
  const opened = openSession();
  const requested = reducePresentationSession(opened, {
    type: "SELECT_SCENE",
    sceneId: "scene-001",
  });
  assert.equal(requested.lifecycle, "waiting");
  assert.equal(requested.output, "holding");
  assert.equal(requested.source, null);
  assert.deepEqual(requested.pendingRequest, {
    type: "SELECT_SCENE",
    sceneId: "scene-001",
  });

  const invalid = reducePresentationSession(requested, event(requested, "SNAPSHOT_ACCEPTED", {
    message: { session_id: requested.sessionId, type: "state", payload: {} },
  }));
  assert.equal(invalid.lifecycle, "waiting");
  assert.equal(invalid.lastValidSnapshot, null);
  assert.equal(invalid.playback, "paused");

  const payload = presentationState();
  const live = reducePresentationSession(invalid, event(invalid, "SNAPSHOT_ACCEPTED", {
    message: acceptedMessage(invalid, payload),
  }), validationContext);
  payload.source.scene_id = "mutated-after-dispatch";
  assert.equal(live.lifecycle, "live");
  assert.equal(live.output, "active");
  assert.equal(live.playback, "paused");
  assert.equal(live.source.scene_id, "scene-001");
  assert.equal(live.lastValidSnapshot.source.scene_id, "scene-001");
});

test("accepted snapshots require the trusted descriptor context", () => {
  const waiting = openSession();
  const message = acceptedMessage(waiting);
  const missingContext = reducePresentationSession(
    waiting,
    event(waiting, "SNAPSHOT_ACCEPTED", { message }),
  );
  assert.equal(missingContext.lifecycle, "waiting");
  assert.equal(missingContext.rejectionReason.code, "presentable_item_index_required");

  const unknownDescriptor = new Map([
    ["chart-other", {
      id: "chart-other",
      descriptor: { kind: "chart", chart_id: "chart-other" },
    }],
  ]);
  const untrusted = reducePresentationSession(
    waiting,
    event(waiting, "SNAPSHOT_ACCEPTED", { message }),
    { presentableItemIndex: unknownDescriptor },
  );
  assert.equal(untrusted.lifecycle, "waiting");
  assert.equal(untrusted.lastValidSnapshot, null);
  assert.equal(untrusted.rejectionReason.code, "untrusted_presentation_item");
});

test("rejected snapshots and invalid selections pause while retaining visible output", () => {
  const playing = reducePresentationSession(liveSession(), { type: "PLAY" });
  const pending = reducePresentationSession(playing, {
    type: "SELECT_SCENE",
    sceneId: "scene-002",
  });
  const reason = {
    code: "scene_needs_attention",
    message: "Scene needs attention before presenting.",
    sourceId: "scene-002",
  };
  const rejected = reducePresentationSession(pending, event(pending, "SNAPSHOT_REJECTED", {
    reason,
  }));
  reason.sourceId = "mutated";
  assert.equal(rejected.output, "active");
  assert.equal(rejected.playback, "paused");
  assert.deepEqual(rejected.rejectionReason, {
    code: "scene_needs_attention",
    message: "Scene needs attention before presenting.",
    sourceId: "scene-002",
  });
  assert.equal(Object.isFrozen(rejected.rejectionReason), true);
  assert.equal(rejected.pendingRequest, null);
  assert.deepEqual(rejected.lastValidSnapshot, playing.lastValidSnapshot);
});

test("playback actions pause for safety and TICK stops at the endpoint without looping", () => {
  let state = liveSession();
  state = reducePresentationSession(state, { type: "PLAY" });
  assert.equal(state.playback, "playing");
  const beforeOldTick = state;
  state = reducePresentationSession(state, event(state, "TICK", {
    sessionId: "session-old",
  }));
  assert.equal(state, beforeOldTick);
  state = reducePresentationSession(state, event(state, "TICK", {
    channelGeneration: state.channelGeneration + 1,
  }));
  assert.equal(state, beforeOldTick);
  state = reducePresentationSession(state, event(state, "TICK"));
  assert.equal(state.frameIndex, 1);
  assert.equal(state.playback, "playing");
  assert.equal(state.sourcePositions["scene:scene-001"], 1);
  state = reducePresentationSession(state, event(state, "TICK"));
  assert.equal(state.frameIndex, 2);
  assert.equal(state.playback, "at-end");
  assert.equal(state.sourcePositions["scene:scene-001"], 2);
  state = reducePresentationSession(state, event(state, "TICK"));
  assert.equal(state.frameIndex, 2);
  assert.equal(state.playback, "at-end");

  for (const action of [
    { type: "SEEK", frameIndex: 1 },
    { type: "PREVIOUS" },
    { type: "NEXT" },
    { type: "SELECT_CHRONO_GROUP", groupId: "group-002" },
    { type: "SET_TRACE_MODE", mode: "full" },
    { type: "SET_COMPOSITION", composition: { displayed_chart_ids: ["chart-001"] } },
    { type: "DOCUMENT_HIDDEN" },
    { type: "MODE_EXIT" },
  ]) {
    const playing = reducePresentationSession(liveSession(), { type: "PLAY" });
    assert.equal(reducePresentationSession(playing, action).playback, "paused", action.type);
  }
});

test("PLAY on a one-frame ledger is immediately at-end", () => {
  const opened = openSession();
  const waiting = reducePresentationSession(opened, event(opened, "CONNECTED"));
  const payload = presentationState({
    timeline: {
      ...presentationState().timeline,
      frame_epochs: [1_000],
      frame_index: 0,
      period: { start: 1_000, end: 1_000 },
    },
  });
  const live = reducePresentationSession(
    waiting,
    event(waiting, "SNAPSHOT_ACCEPTED", {
      message: acceptedMessage(waiting, payload),
    }),
    validationContext,
  );
  assert.equal(reducePresentationSession(live, { type: "PLAY" }).playback, "at-end");
});

test("source cursor memory is frozen and included when returning to a source", () => {
  let state = liveSession();
  state = reducePresentationSession(state, { type: "SEEK", frameIndex: 2 });
  assert.equal(state.sourcePositions["scene:scene-001"], 2);
  assert.equal(Object.isFrozen(state.sourcePositions), true);

  state = reducePresentationSession(state, {
    type: "SELECT_CHRONO_GROUP",
    groupId: "group-002",
  });
  const groupPayload = presentationState({
    source: {
      kind: "Chrono Group",
      scene_id: null,
      chrono_group_id: "group-002",
    },
    timeline: { ...presentationState().timeline, frame_index: 1 },
  });
  state = reducePresentationSession(
    state,
    event(state, "SNAPSHOT_ACCEPTED", {
      message: acceptedMessage(state, groupPayload),
    }),
    validationContext,
  );
  assert.equal(state.sourcePositions["group:group-002"], 1);
  state = reducePresentationSession(state, { type: "PREVIOUS" });
  assert.equal(state.sourcePositions["group:group-002"], 0);
  state = reducePresentationSession(state, { type: "NEXT" });
  assert.equal(state.sourcePositions["group:group-002"], 1);
  state = reducePresentationSession(state, { type: "PREVIOUS" });

  const returnToScene = reducePresentationSession(state, {
    type: "SELECT_SCENE",
    sceneId: "scene-001",
  });
  assert.deepEqual(returnToScene.pendingRequest, {
    type: "SELECT_SCENE",
    sceneId: "scene-001",
    frameIndex: 2,
  });
  const returnToGroup = reducePresentationSession(returnToScene, {
    type: "SELECT_CHRONO_GROUP",
    groupId: "group-002",
  });
  assert.deepEqual(returnToGroup.pendingRequest, {
    type: "SELECT_CHRONO_GROUP",
    groupId: "group-002",
    frameIndex: 0,
  });
});

test("blackout restores the prior deliberate output and never autoplays", () => {
  const holding = reducePresentationSession(liveSession(), {
    type: "SET_OUTPUT_MODE",
    mode: "holding",
  });
  const playing = reducePresentationSession(holding, { type: "PLAY" });
  const blackedOut = reducePresentationSession(playing, {
    type: "SET_BLACKOUT",
    active: true,
  });
  assert.equal(blackedOut.blackout, true);
  assert.equal(blackedOut.output, "holding");
  assert.equal(blackedOut.playback, "paused");

  const restored = reducePresentationSession(blackedOut, {
    type: "SET_BLACKOUT",
    active: false,
  });
  assert.equal(restored.blackout, false);
  assert.equal(restored.output, "holding");
  assert.equal(restored.playback, "paused");
});

test("connection and window safety transitions retain output and require both session guards", () => {
  const playing = reducePresentationSession(liveSession(), { type: "PLAY" });
  const wrongSession = reducePresentationSession(playing, event(playing, "CONNECTION_LOST", {
    sessionId: "session-other",
  }));
  const wrongGeneration = reducePresentationSession(playing, event(playing, "CONNECTION_LOST", {
    channelGeneration: playing.channelGeneration + 1,
  }));
  assert.equal(wrongSession, playing);
  assert.equal(wrongGeneration, playing);

  const lost = reducePresentationSession(playing, event(playing, "CONNECTION_LOST"));
  assert.equal(lost.connection, "disconnected");
  assert.equal(lost.output, "active");
  assert.equal(lost.playback, "paused");

  const reconnecting = reducePresentationSession(lost, event(lost, "RECONNECTING"));
  assert.equal(reconnecting.connection, "reconnecting");
  assert.equal(reconnecting.window, "open");
  const reconnected = reducePresentationSession(reconnecting, event(reconnecting, "CONNECTED"));
  assert.equal(reconnected.connection, "connected");
  assert.equal(reconnected.playback, "paused");
  assert.equal(reconnected.pendingRequest, null);

  const closed = reducePresentationSession(reconnected, event(reconnected, "WINDOW_CLOSED"));
  assert.equal(closed.window, "closed");
  assert.equal(closed.connection, "disconnected");
  assert.equal(closed.output, "active");
});

test("active output is rejected until a last-valid snapshot exists", () => {
  const waiting = openSession();
  const rejected = reducePresentationSession(waiting, {
    type: "SET_OUTPUT_MODE",
    mode: "active",
  });
  assert.equal(rejected.output, "holding");
  assert.equal(rejected.lifecycle, "waiting");
  assert.equal(rejected.rejectionReason.code, "no_valid_snapshot");

  const live = liveSession();
  const holding = reducePresentationSession(live, {
    type: "SET_OUTPUT_MODE",
    mode: "holding",
  });
  assert.equal(
    reducePresentationSession(holding, { type: "SET_OUTPUT_MODE", mode: "active" }).output,
    "active",
  );
});

test("END makes the generation terminal before ordered effects and close outcomes cannot revive it", () => {
  const live = liveSession();
  const ended = reducePresentationSession(live, { type: "END" });
  assert.deepEqual(
    {
      lifecycle: ended.lifecycle,
      window: ended.window,
      closeOutcome: ended.closeOutcome,
      connection: ended.connection,
      output: ended.output,
      playback: ended.playback,
      blackout: ended.blackout,
      acceptsSessionEvents: ended.acceptsSessionEvents,
      effects: ended.effects,
      effectsVersion: ended.effectsVersion,
      effectsConsumedVersion: ended.effectsConsumedVersion,
    },
    {
      lifecycle: "ended",
      window: "closing",
      closeOutcome: "requested",
      connection: "terminated",
      output: "ended",
      playback: "paused",
      blackout: false,
      acceptsSessionEvents: false,
      effects: ["PUBLISH_ENDED", "REQUEST_AUDIENCE_CLOSE", "TERMINATE_CHANNEL"],
      effectsVersion: 1,
      effectsConsumedVersion: 0,
    },
  );

  const succeeded = reducePresentationSession(ended, event(ended, "AUDIENCE_CLOSE_SUCCEEDED"));
  assert.equal(succeeded.window, "closed");
  assert.equal(succeeded.closeOutcome, "succeeded");
  assert.equal(succeeded.lifecycle, "ended");
  assert.equal(succeeded.connection, "terminated");
  assert.equal(succeeded.acceptsSessionEvents, false);
  assert.equal(succeeded.effectsVersion, ended.effectsVersion);
  assert.deepEqual(succeeded.effects, ended.effects);

  const denied = reducePresentationSession(ended, event(ended, "AUDIENCE_CLOSE_DENIED", {
    surfaceRemains: true,
  }));
  assert.equal(denied.window, "open");
  assert.equal(denied.closeOutcome, "denied-surface-remains");
  assert.equal(denied.lifecycle, "ended");
  assert.equal(denied.connection, "terminated");
  assert.equal(denied.output, "ended");
  assert.equal(denied.blackout, false);
});

test("END effects are one-shot, guarded, and close outcomes do not create a new batch", () => {
  const ended = reducePresentationSession(liveSession(), { type: "END" });
  const staleAcknowledgement = reducePresentationSession(ended, event(
    ended,
    "EFFECTS_CONSUMED",
    { channelGeneration: ended.channelGeneration + 1, effectsVersion: 1 },
  ));
  assert.equal(staleAcknowledgement, ended);

  const consumed = reducePresentationSession(ended, event(ended, "EFFECTS_CONSUMED", {
    effectsVersion: ended.effectsVersion,
  }));
  assert.deepEqual(consumed.effects, []);
  assert.equal(consumed.effectsVersion, 1);
  assert.equal(consumed.effectsConsumedVersion, 1);
  assert.equal(
    reducePresentationSession(consumed, event(consumed, "EFFECTS_CONSUMED", {
      effectsVersion: consumed.effectsVersion,
    })),
    consumed,
  );

  for (const outcome of [
    event(consumed, "AUDIENCE_CLOSE_SUCCEEDED"),
    event(consumed, "AUDIENCE_CLOSE_DENIED", { surfaceRemains: true }),
  ]) {
    const closed = reducePresentationSession(consumed, outcome);
    assert.deepEqual(closed.effects, []);
    assert.equal(closed.effectsVersion, consumed.effectsVersion);
    assert.equal(closed.effectsConsumedVersion, consumed.effectsConsumedVersion);
  }

  const nextSession = reducePresentationSession(consumed, {
    type: "OPEN_NEW_SESSION",
    sessionId: "session-002",
    requestedWindowName: "simex-audience-session-002",
  });
  const nextEnded = reducePresentationSession(nextSession, { type: "END" });
  assert.equal(nextEnded.effectsVersion, 2);
  assert.equal(nextEnded.effectsConsumedVersion, 1);
});

test("every old-session event is ignored after either END close outcome", () => {
  const ended = reducePresentationSession(liveSession(), { type: "END" });
  const outcomes = [
    reducePresentationSession(ended, event(ended, "AUDIENCE_CLOSE_SUCCEEDED")),
    reducePresentationSession(ended, event(ended, "AUDIENCE_CLOSE_DENIED", {
      surfaceRemains: true,
    })),
  ];
  const oldEvents = [
    event(ended, "WINDOW_OPENED"),
    event(ended, "WINDOW_CLOSED"),
    event(ended, "CONNECTING"),
    event(ended, "CONNECTED"),
    event(ended, "CONNECTION_LOST"),
    event(ended, "RECONNECTING"),
    event(ended, "SNAPSHOT_ACCEPTED", { message: acceptedMessage(ended) }),
    event(ended, "SNAPSHOT_REJECTED", { reason: "late" }),
    { type: "PLAY" },
    { type: "PAUSE" },
    { type: "TICK" },
    { type: "SEEK", frameIndex: 1 },
    { type: "PREVIOUS" },
    { type: "NEXT" },
    { type: "SELECT_SCENE", sceneId: "scene-002" },
    { type: "SELECT_CHRONO_GROUP", groupId: "group-002" },
    { type: "SET_TRACE_MODE", mode: "full" },
    { type: "SET_OUTPUT_MODE", mode: "blank" },
    { type: "SET_COMPOSITION", composition: {} },
    { type: "SET_BLACKOUT", active: true },
    { type: "DOCUMENT_HIDDEN" },
    { type: "MODE_EXIT" },
    { type: "END" },
  ];

  for (const outcome of outcomes) {
    for (const action of oldEvents) {
      assert.equal(reducePresentationSession(outcome, action), outcome, action.type);
    }
  }
});
