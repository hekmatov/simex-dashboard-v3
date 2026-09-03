import test from "node:test";
import assert from "node:assert/strict";
import { buildContentDependencyGraph } from "../src/content-library/contentDependencyGraph.js";

import {
  PRESENTATION_PROTOCOL_VERSION,
  PRESENTATION_THEME_PROTOCOL_VERSION,
  adaptSceneAudienceToPresentation,
  makePresentationMessage,
  makePresentationThemeMessage,
  parsePresentationMessage,
  parsePresentationThemeMessage,
  presentationThemeChannelName,
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
  theme: {
    dashboard_style: "humanist-standard",
    dashboard_color_profile: "humanist-standard/open-forum",
    chart_color_mode: "standard",
    appearance_preference: "system",
    resolved_appearance: "dark",
  },
  source: { kind: "scene", scene_id: "scene-a", chrono_group_id: "group-a" },
  composition: {
    active_page_id: "biomedical",
    displayed_chart_ids: ["chart-a", "image-a"],
    layout: "sideBySide",
  },
  payload: {
    items: [
      { kind: "chart", chart_id: "chart-a" },
      { kind: "image", panel_id: "image-a", media_id: "media-image-a", revision: 7 },
    ],
    audience_facts: {
      dashboard_name: true,
      page: true,
      parent_chrono_group: true,
      scene_name: true,
      scene_date: true,
    },
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
    const wirePayload = type === "state" ? structuredClone(payload) : payload;
    if (type === "state") delete wirePayload.theme;
    assert.deepEqual(message, {
      protocol_version: 3, session_id: "session-001", sequence, type, payload: wirePayload,
    });
    if (type === "state") assert.notStrictEqual(message.payload, payload);
  }
});

test("Audience date movement uses an exact clone-isolated source-bound envelope", () => {
  const payload = {
    source: { kind: "scene", scene_id: "scene-a", chrono_group_id: "group-a" },
    date_position: { x_permille: 515, y_permille: 260 },
  };
  const message = makePresentationMessage({
    sessionId: "session-001",
    sequence: 5,
    type: "audience-date-position",
    payload,
    presentableItemIndex,
  });

  assert.deepEqual(message, {
    protocol_version: 3,
    session_id: "session-001",
    sequence: 5,
    type: "audience-date-position",
    payload: {
      source: { kind: "scene", scene_id: "scene-a", chrono_group_id: "group-a" },
      date_position: { x_permille: 515, y_permille: 260 },
    },
  });
  assert.notStrictEqual(message.payload, payload);
  assert.notStrictEqual(message.payload.source, payload.source);
  assert.notStrictEqual(message.payload.date_position, payload.date_position);

  payload.source.scene_id = "scene-mutated";
  payload.date_position.x_permille = 0;
  assert.equal(message.payload.source.scene_id, "scene-a");
  assert.equal(message.payload.date_position.x_permille, 515);

  const parsed = parsePresentationMessage(message, {
    sessionId: "session-001",
    lastSequence: 4,
    presentableItemIndex,
  });
  message.payload.date_position.y_permille = 0;
  assert.equal(parsed.payload.date_position.y_permille, 260);
});

test("Audience date movement rejects malformed, extra, and out-of-bounds payloads", () => {
  const envelope = {
    protocol_version: 3,
    session_id: "session-001",
    sequence: 5,
    type: "audience-date-position",
    payload: {
      source: { kind: "scene", scene_id: "scene-a", chrono_group_id: "group-a" },
      date_position: { x_permille: 515, y_permille: 260 },
    },
  };

  for (const [payload, code] of [
    [null, "invalid_object"],
    [{ ...envelope.payload, extra: true }, "unknown_field"],
    [{
      ...envelope.payload,
      source: { ...envelope.payload.source, page_id: "biomedical" },
    }, "unknown_field"],
    [{
      ...envelope.payload,
      date_position: { x_permille: 515, y_permille: 260, width_permille: 280 },
    }, "unknown_field"],
    [{
      ...envelope.payload,
      date_position: { x_permille: 1001, y_permille: 260 },
    }, "invalid_date_position"],
    [{
      ...envelope.payload,
      date_position: { x_permille: 515.5, y_permille: 260 },
    }, "invalid_date_position"],
  ]) assert.throws(
    () => parsePresentationMessage({ ...envelope, payload }, {
      sessionId: "session-001",
      lastSequence: 4,
      presentableItemIndex,
    }),
    protocolError(code),
  );
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

test("presentation state accepts only an exact approved semantic theme snapshot", () => {
  assert.deepEqual(validatePresentationState(state, { presentableItemIndex }).theme, state.theme);
  for (const theme of [
    { ...state.theme, dashboard_style: "rounded-modern" },
    { ...state.theme, dashboard_color_profile: "custom/arbitrary-css" },
    { ...state.theme, chart_color_mode: "custom" },
    { ...state.theme, appearance_preference: "sepia" },
    { ...state.theme, resolved_appearance: "system" },
    { ...state.theme, css_variables: { "--simex-accent": "hotpink" } },
  ]) {
    assert.throws(
      () => validatePresentationState({ ...state, theme }, { presentableItemIndex }),
      (error) => ["invalid_theme", "unknown_field"].includes(error.code),
    );
  }
});

test("protocol v3 remains wire-compatible while exact Theme snapshots use an isolated sidecar", () => {
  const legacyState = structuredClone(state);
  delete legacyState.theme;
  assert.strictEqual(validatePresentationState(legacyState, { presentableItemIndex }), legacyState);

  const stateMessage = makePresentationMessage({
    sessionId: "session-001",
    sequence: 2,
    type: "state",
    payload: state,
    presentableItemIndex,
  });
  assert.deepEqual(stateMessage.payload, legacyState);
  assert.deepEqual(parsePresentationMessage(stateMessage, {
    sessionId: "session-001",
    presentableItemIndex,
  }).payload, legacyState);

  assert.equal(PRESENTATION_THEME_PROTOCOL_VERSION, 1);
  assert.equal(presentationThemeChannelName("session-001"), "simex-presentation-theme-v1-session-001");
  const themeMessage = makePresentationThemeMessage({
    sessionId: "session-001",
    sequence: 1,
    payload: state.theme,
  });
  assert.deepEqual(parsePresentationThemeMessage(themeMessage, {
    sessionId: "session-001",
    lastSequence: 0,
  }), {
    protocol_version: 1,
    session_id: "session-001",
    sequence: 1,
    type: "theme",
    payload: state.theme,
  });
  assert.throws(
    () => parsePresentationThemeMessage({
      ...themeMessage,
      payload: { ...state.theme, css_variables: { "--simex-accent": "hotpink" } },
    }),
    protocolError("unknown_field"),
  );
});

test("presentation state requires the accepted payload shape and rejects the legacy composition-items shape", () => {
  const missingPayload = { ...state };
  delete missingPayload.payload;
  assert.throws(
    () => validatePresentationState(missingPayload, { presentableItemIndex }),
    protocolError("missing_field"),
  );
  assert.throws(() => validatePresentationState({
    ...state,
    composition: {
      active_page_id: "biomedical",
      items: state.payload.items,
      layout: "sideBySide",
    },
  }, { presentableItemIndex }), protocolError("unknown_field"));
  assert.throws(() => validatePresentationState({
    ...state,
    payload: { ...state.payload, extra: true },
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
    validatePresentationState(state, { presentableItemIndex }).payload.items,
    state.payload.items,
  );
  for (const item of [
    { kind: "chart", chart_id: "unknown-chart" },
    { kind: "image", panel_id: "image-a", media_id: "stale-media", revision: 7 },
    { kind: "image", panel_id: "image-a", media_id: "media-image-a", revision: 6 },
  ]) assert.throws(() => validatePresentationState({
    ...state,
    composition: {
      ...state.composition,
      displayed_chart_ids: [item.kind === "chart" ? item.chart_id : item.panel_id],
      layout: "solo",
    },
    payload: { ...state.payload, items: [item] },
  }, { presentableItemIndex }), protocolError("untrusted_presentation_item"));
});

test("composition IDs exactly match mixed payload item identities and order", () => {
  for (const [displayed_chart_ids, code] of [
    [["image-a", "chart-a"], "composition_payload_mismatch"],
    [["chart-a"], "composition_payload_mismatch"],
    [["chart-a", "chart-a"], "duplicate_presentation_item"],
  ]) assert.throws(
    () => validatePresentationState({
      ...state,
      composition: { ...state.composition, displayed_chart_ids },
    }, { presentableItemIndex }),
    protocolError(code),
  );
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

test("Image payload descriptors reject forbidden transport, asset, and temporal fields", () => {
  const image = state.payload.items[1];
  for (const [field, value] of [
    ["url", "https://example.test/image.png"],
    ["blob_url", "blob:https://example.test/secret"],
    ["crop", { x: 0, y: 0, width: 1000, height: 1000 }],
    ["fit", "cover"],
    ["rotation", 90],
    ["asset_bytes", "AAAA"],
    ["chrono_group_id", "group-a"],
    ["scene_id", "scene-a"],
    ["frame_id", "frame-a"],
    ["time", { active_epoch_ms: 1 }],
  ]) assert.throws(() => validatePresentationState({
    ...state,
    composition: { ...state.composition, displayed_chart_ids: ["image-a"], layout: "solo" },
    payload: { ...state.payload, items: [{ ...image, [field]: value }] },
  }, { presentableItemIndex }), protocolError("unknown_field"), field);
});

test("identifiers, layouts, finite time, and independent Audience facts remain strict", () => {
  assert.throws(
    () => validatePresentationState({
      ...state,
      composition: { ...state.composition, active_page_id: "bad page" },
    }, { presentableItemIndex }),
    protocolError("invalid_identifier"),
  );
  assert.throws(
    () => validatePresentationState({
      ...state,
      composition: { ...state.composition, layout: "grid2x2" },
    }, { presentableItemIndex }),
    protocolError("invalid_layout"),
  );
  assert.throws(
    () => validatePresentationState({
      ...state,
      timeline: { ...state.timeline, seconds_per_frame: Number.NaN },
    }, { presentableItemIndex }),
    protocolError("invalid_seconds_per_frame"),
  );
  for (const key of Object.keys(state.payload.audience_facts)) {
    const audience_facts = { ...state.payload.audience_facts };
    delete audience_facts[key];
    assert.throws(
      () => validatePresentationState({
        ...state,
        payload: { ...state.payload, audience_facts },
      }, { presentableItemIndex }),
      protocolError("missing_field"),
    );
    assert.throws(
      () => validatePresentationState({
        ...state,
        payload: {
          ...state.payload,
          audience_facts: { ...state.payload.audience_facts, [key]: "yes" },
        },
      }, { presentableItemIndex }),
      protocolError("invalid_audience_facts"),
    );
  }
  assert.throws(
    () => validatePresentationState({
      ...state,
      payload: {
        ...state.payload,
        audience_facts: { ...state.payload.audience_facts, owner: true },
      },
    }, { presentableItemIndex }),
    protocolError("unknown_field"),
  );
});

test("Present and Audience runtime payloads do not become durable content dependencies", () => {
  const dashboard = {
    contentLibrary: { mediaItems: {}, sourceEntries: { cases: { sourceId: "cases", kind: "csv" } } },
    dataSources: { cases: { kind: "csv" } },
    pages: [{
      id: "page-a",
      sections: [{ id: "section-a", panels: [{ id: "chart-a", chart: { id: "chart-a", sourceId: "cases" } }] }],
    }],
  };
  const baseline = buildContentDependencyGraph({ dashboard });
  const withRuntime = buildContentDependencyGraph({
    dashboard,
    presentationState: state,
    audienceMessages: [makePresentationMessage({
      sessionId: "session-001",
      sequence: 1,
      type: "state",
      payload: state,
      presentableItemIndex,
    })],
    mediaLeases: [{ mediaId: "media-image-a", revision: 7 }],
  });
  assert.deepEqual(withRuntime.directUses, baseline.directUses);
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
