import test from "node:test";
import assert from "node:assert/strict";

import {
  PRESENTATION_PROTOCOL_VERSION,
  adaptSceneAudienceToPresentation,
  makePresentationMessage,
  parsePresentationMessage,
  validatePresentationAction,
  validatePresentationState,
} from "../src/lib/presentationProtocol.js";

const presentableItemIndex = new Map([
  ["chart-a", { id: "chart-a", descriptor: { kind: "chart", chart_id: "chart-a" } }],
  ["image-a", {
    id: "image-a",
    descriptor: { kind: "image", panel_id: "image-a", media_id: "media-image-a", revision: 7 },
  }],
]);

const state = {
  dashboard_revision: "dashboard-r17",
  source: { kind: "scene", scene_id: "scene-a", chrono_group_id: "group-a" },
  composition: {
    active_page_id: "biomedical",
    items: [
      { kind: "chart", chart_id: "chart-a" },
      { kind: "image", panel_id: "image-a", media_id: "media-image-a", revision: 7 },
    ],
    layout: "sideBySide",
  },
  timeline: {
    frame_epochs: [1_801_440_000_000, 1_801_526_400_000],
    frame_index: 0,
    period: { start: 1_801_440_000_000, end: 1_801_526_400_000 },
    trace_mode: "reveal",
    seconds_per_frame: 2.5,
  },
  matching: { use_authored_settings: true },
  output_mode: "active",
  blackout: false,
  audience: { date_position: { x_permille: 680, y_permille: 40, width_permille: 280 } },
};

function protocolError(code) {
  return (error) => {
    assert.equal(error.name, "PresentationProtocolError");
    assert.equal(error.code, code);
    assert.equal(error.reason.code, code);
    assert.equal(typeof error.reason.message, "string");
    return true;
  };
}

test("protocol v3 creates clone-isolated envelopes for ready, state, heartbeat, and ended", () => {
  assert.equal(PRESENTATION_PROTOCOL_VERSION, 3);
  for (const [sequence, type, payload] of [
    [1, "ready", null], [2, "state", state], [3, "heartbeat", null], [4, "ended", null],
  ]) {
    const message = makePresentationMessage({
      sessionId: "session-001", sequence, type, payload, presentableItemIndex,
    });
    assert.deepEqual(message, {
      protocol_version: 3, session_id: "session-001", sequence, type, payload,
    });
    if (type === "state") assert.notStrictEqual(message.payload, payload);
  }
});

test("saved Scene Audience date geometry adapts explicitly from camelCase to wire snake_case", () => {
  const savedScene = {
    audience: { datePosition: { xPermille: 700, yPermille: 50, widthPermille: 250 } },
  };
  assert.deepEqual(adaptSceneAudienceToPresentation(savedScene), {
    date_position: { x_permille: 700, y_permille: 50, width_permille: 250 },
  });
  assert.deepEqual(savedScene.audience.datePosition, {
    xPermille: 700, yPermille: 50, widthPermille: 250,
  });
});

test("presentation state enforces every exact field and authored-only matching truth", () => {
  assert.strictEqual(validatePresentationState(state, { presentableItemIndex }), state);
  assert.throws(() => validatePresentationState({
    ...state,
    matching: { use_authored_settings: true, session_override: "interpolate" },
  }, { presentableItemIndex }), protocolError("unknown_field"));
  assert.throws(() => validatePresentationState({
    ...state, matching: { use_authored_settings: false },
  }, { presentableItemIndex }), protocolError("authored_matching_required"));
  assert.throws(() => validatePresentationState({
    ...state, temporalReview: [],
  }, { presentableItemIndex }), protocolError("unknown_field"));
});

test("source identity is exact for Scene, Chrono Group, and manual state", () => {
  for (const source of [
    { kind: "scene", scene_id: "scene-a", chrono_group_id: "group-a" },
    { kind: "Chrono Group", scene_id: null, chrono_group_id: "group-a" },
    { kind: "manual", scene_id: null, chrono_group_id: null },
  ]) assert.doesNotThrow(() => validatePresentationState({ ...state, source }, { presentableItemIndex }));

  for (const source of [
    { kind: "scene", scene_id: null, chrono_group_id: "group-a" },
    { kind: "Chrono Group", scene_id: "scene-a", chrono_group_id: "group-a" },
    { kind: "manual", scene_id: null, chrono_group_id: "group-a" },
  ]) assert.throws(
    () => validatePresentationState({ ...state, source }, { presentableItemIndex }),
    protocolError("invalid_source_identity"),
  );
});

test("composition preserves trusted mixed chart and Image identity without stale-ID reconciliation", () => {
  assert.deepEqual(
    validatePresentationState(state, { presentableItemIndex }).composition.items,
    state.composition.items,
  );
  for (const item of [
    { kind: "chart", chart_id: "unknown-chart" },
    { kind: "image", panel_id: "image-a", media_id: "stale-media", revision: 7 },
    { kind: "image", panel_id: "image-a", media_id: "media-image-a", revision: 6 },
  ]) assert.throws(() => validatePresentationState({
    ...state,
    composition: { ...state.composition, items: [item], layout: "solo" },
  }, { presentableItemIndex }), protocolError("untrusted_presentation_item"));
});

test("timeline validates ordered frames, direct frame bounds, period, modes, and speed", () => {
  for (const timeline of [
    { ...state.timeline, frame_epochs: [2, 1] },
    { ...state.timeline, frame_index: 2 },
    { ...state.timeline, period: { start: 2, end: 1 } },
    { ...state.timeline, trace_mode: "future" },
    { ...state.timeline, seconds_per_frame: 0 },
  ]) assert.throws(
    () => validatePresentationState({ ...state, timeline }, { presentableItemIndex }),
    (error) => error instanceof Error && error.code.startsWith("invalid_"),
  );
  assert.doesNotThrow(() => validatePresentationState({ ...state, timeline: null }, { presentableItemIndex }));
});

test("output modes and date-position geometry enforce exact bounds", () => {
  for (const output_mode of ["holding", "blank", "active"]) {
    assert.doesNotThrow(() => validatePresentationState({ ...state, output_mode }, { presentableItemIndex }));
  }
  assert.throws(
    () => validatePresentationState({ ...state, output_mode: "ended" }, { presentableItemIndex }),
    protocolError("invalid_output_mode"),
  );
  for (const date_position of [
    { x_permille: -1, y_permille: 40, width_permille: 280 },
    { x_permille: 800, y_permille: 40, width_permille: 280 },
    { x_permille: 680, y_permille: 1001, width_permille: 280 },
    { x_permille: 680, y_permille: 40, width_permille: 0 },
    { xPermille: 680, yPermille: 40, widthPermille: 280 },
  ]) assert.throws(
    () => validatePresentationState({ ...state, audience: { date_position } }, { presentableItemIndex }),
    (error) => ["invalid_date_position", "unknown_field"].includes(error.code),
  );
});

test("actions validate exact values and reject matching override actions", () => {
  const actions = [
    [{ type: "SEEK", value: 1 }, { frameCount: 2 }],
    [{ type: "PREVIOUS" }], [{ type: "NEXT" }], [{ type: "PLAY" }], [{ type: "PAUSE" }],
    [{ type: "SELECT_SCENE", value: "scene-a" }],
    [{ type: "SELECT_CHRONO_GROUP", value: "group-a" }],
    [{ type: "SET_TRACE_MODE", value: "full" }],
    [{ type: "SET_OUTPUT_MODE", value: "blank" }],
    [{ type: "SET_COMPOSITION", value: state.composition }, { presentableItemIndex }],
    [{ type: "SET_BLACKOUT", value: true }], [{ type: "END" }],
  ];
  for (const [action, options] of actions) {
    assert.strictEqual(validatePresentationAction(action, options), action);
  }
  assert.throws(
    () => validatePresentationAction({ type: "SEEK", value: 2 }, { frameCount: 2 }),
    protocolError("seek_out_of_bounds"),
  );
  assert.throws(
    () => validatePresentationAction({ type: "SET_MATCHING_OVERRIDE", value: "interpolate" }),
    protocolError("unsupported_action"),
  );
});

test("message parsing rejects protocol/session/payload faults and non-monotonic sequences with reasons", () => {
  const ready = {
    protocol_version: 3, session_id: "session-001", sequence: 2, type: "ready", payload: null,
  };
  assert.deepEqual(parsePresentationMessage(ready, {
    sessionId: "session-001", lastSequence: 1, presentableItemIndex,
  }), ready);
  for (const [candidate, code] of [
    [{ ...ready, protocol_version: 2 }, "protocol_mismatch"],
    [{ ...ready, session_id: "other-session" }, "session_mismatch"],
    [{ ...ready, sequence: 1 }, "non_monotonic_sequence"],
    [{ ...ready, payload: {} }, "invalid_message_payload"],
    [{ ...ready, type: "command" }, "unsupported_message_type"],
  ]) assert.throws(
    () => parsePresentationMessage(candidate, {
      sessionId: "session-001", lastSequence: 1, presentableItemIndex,
    }),
    protocolError(code),
  );
});
