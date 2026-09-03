import test from "node:test";
import assert from "node:assert/strict";

import {
  projectAudienceSnapshot,
  projectPresentationState,
} from "../src/lib/audienceProjection.js";

test("projects local presenter state through the same immutable Audience mapping", () => {
  const state = presentationState({ traceMode: "full", frameIndex: 1 });
  const direct = projectPresentationState(state);
  const enveloped = projectAudienceSnapshot(stateMessage({ state }), null).projection;

  assert.deepEqual(direct, enveloped);
  state.composition.displayed_chart_ids.reverse();
  state.timeline.frame_index = 0;
  assert.deepEqual(direct.composition.displayed_chart_ids, ["chart-b", "chart-a"]);
  assert.equal(direct.timeline.frame_index, 1);
});

test("projects an accepted state envelope without changing authored order, timeline, trace, or date position", () => {
  const message = stateMessage({
    sequence: 7,
    state: presentationState({
      outputMode: "active",
      traceMode: "full",
      frameIndex: 1,
      datePosition: { x_permille: 123, y_permille: 456, width_permille: 321 },
    }),
  });

  const result = projectAudienceSnapshot(message, null);

  assert.equal(result.accepted, true);
  assert.equal(result.projection.kind, "output");
  assert.equal(result.projection.mode, "active");
  assert.deepEqual(result.projection.composition.displayed_chart_ids, ["chart-b", "chart-a"]);
  assert.equal(result.projection.timeline.frame_index, 1);
  assert.equal(result.projection.timeline.trace_mode, "full");
  assert.deepEqual(result.projection.audience.date_position, {
    x_permille: 123,
    y_permille: 456,
    width_permille: 321,
  });
  assert.deepEqual(result.projection.matching, { use_authored_settings: true });
  assert.deepEqual(result.projection.theme, {
    dashboard_style: "signal-instrument",
    dashboard_color_profile: "signal-instrument/calibrated-steel",
    chart_color_mode: "profile",
    appearance_preference: "light",
    resolved_appearance: "light",
  });
  assert.deepEqual(result.lastValid, result.projection);

  message.payload.composition.displayed_chart_ids.reverse();
  message.payload.timeline.frame_index = 0;
  assert.deepEqual(result.projection.composition.displayed_chart_ids, ["chart-b", "chart-a"]);
  assert.equal(result.projection.timeline.frame_index, 1);
});

test("keeps holding, deliberate blank, and blackout as distinct immutable output states", () => {
  const active = projectAudienceSnapshot(stateMessage(), null).lastValid;
  const holding = projectAudienceSnapshot(stateMessage({
    sequence: 2,
    state: presentationState({ outputMode: "holding" }),
  }), active);
  const blank = projectAudienceSnapshot(stateMessage({
    sequence: 3,
    state: presentationState({ outputMode: "blank" }),
  }), holding.lastValid);
  const blackout = projectAudienceSnapshot(stateMessage({
    sequence: 4,
    state: presentationState({ blackout: true }),
  }), blank.lastValid);

  assert.equal(holding.projection.mode, "holding");
  assert.equal(blank.projection.mode, "blank");
  assert.equal(blank.projection.blackout, false);
  assert.equal(blackout.projection.mode, "active");
  assert.equal(blackout.projection.blackout, true);
  assert.deepEqual(blackout.projection.payload.items, active.payload.items);
});

test("retains last-valid projection when the channel rejects invalid, incomplete, gapped, or old-session input", () => {
  const lastValid = projectAudienceSnapshot(stateMessage(), null).lastValid;
  for (const code of [
    "invalid_object",
    "source_not_presentable",
    "sequence_gap",
    "session_mismatch",
  ]) {
    const reason = { code, message: `Rejected: ${code}` };
    const result = projectAudienceSnapshot({ accepted: false, reason }, lastValid);
    assert.equal(result.accepted, false);
    assert.deepEqual(result.projection, lastValid);
    assert.deepEqual(result.lastValid, lastValid);
    assert.deepEqual(result.reason, reason);
  }
});

test("rejects non-state inputs without attempting protocol sequencing or replacing last-valid", () => {
  const lastValid = projectAudienceSnapshot(stateMessage(), null).lastValid;
  const result = projectAudienceSnapshot({
    protocol_version: 2,
    session_id: "old-session",
    sequence: 99,
    type: "state",
    payload: presentationState(),
  }, lastValid);

  assert.equal(result.accepted, false);
  assert.equal(result.reason.code, "unaccepted_audience_message");
  assert.deepEqual(result.projection, lastValid);
});

test("projects accepted ended as exact neutral terminal copy while retaining diagnostics only", () => {
  const lastValid = projectAudienceSnapshot(stateMessage(), null).lastValid;
  const endedMessage = {
    protocol_version: 3,
    session_id: "session-a",
    sequence: 9,
    type: "ended",
    payload: null,
  };

  const result = projectAudienceSnapshot(endedMessage, lastValid);

  assert.deepEqual(result.projection, {
    kind: "ended",
    heading: "Presentation ended",
    body: "This display is no longer active.",
  });
  assert.deepEqual(result.lastValid, lastValid);
  assert.equal(result.accepted, true);
  endedMessage.type = "state";
  assert.equal(result.projection.kind, "ended");
});

function stateMessage({ sequence = 1, state = presentationState() } = {}) {
  return {
    protocol_version: 3,
    session_id: "session-a",
    sequence,
    type: "state",
    payload: state,
  };
}

function presentationState({
  outputMode = "active",
  blackout = false,
  traceMode = "reveal",
  frameIndex = 0,
  datePosition = { x_permille: 680, y_permille: 40, width_permille: 280 },
} = {}) {
  return {
    dashboard_revision: "dashboard-r1",
    theme: {
      dashboard_style: "signal-instrument",
      dashboard_color_profile: "signal-instrument/calibrated-steel",
      chart_color_mode: "profile",
      appearance_preference: "light",
      resolved_appearance: "light",
    },
    source: { kind: "scene", scene_id: "scene-a", chrono_group_id: "group-a" },
    composition: {
      active_page_id: "biomedical",
      displayed_chart_ids: ["chart-b", "chart-a"],
      layout: "sideBySide",
    },
    timeline: {
      frame_epochs: [100, 200, 300],
      frame_index: frameIndex,
      period: { start: 100, end: 300 },
      trace_mode: traceMode,
      seconds_per_frame: 1,
    },
    matching: { use_authored_settings: true },
    output_mode: outputMode,
    blackout,
    audience: { date_position: datePosition },
    payload: {
      items: [
        { kind: "chart", chart_id: "chart-b" },
        { kind: "chart", chart_id: "chart-a" },
      ],
      audience_facts: {
        dashboard_name: true,
        page: false,
        parent_chrono_group: true,
        scene_name: true,
        scene_date: true,
      },
    },
  };
}
