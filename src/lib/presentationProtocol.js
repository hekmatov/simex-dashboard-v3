import {
  APPEARANCE_PREFERENCES,
  CHART_COLOR_MODES,
  DASHBOARD_COLOR_PROFILES,
  DASHBOARD_STYLES,
} from "../theme/dashboardTheme.js";

export const PRESENTATION_PROTOCOL_VERSION = 3;
export const PRESENTATION_THEME_PROTOCOL_VERSION = 1;

const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const MESSAGE_TYPES = new Set([
  "ready",
  "state",
  "heartbeat",
  "ended",
  "audience-date-position",
]);
const OUTPUT_MODES = new Set(["holding", "blank", "active"]);
const TRACE_MODES = new Set(["reveal", "full"]);
const LAYOUTS_BY_COUNT = Object.freeze({
  0: new Set(["solo"]),
  1: new Set(["solo"]),
  2: new Set(["sideBySide", "overUnder"]),
  3: new Set(["topFocus", "bottomFocus", "leftFocus", "rightFocus"]),
  4: new Set(["grid2x2"]),
});

const ENVELOPE_FIELDS = ["protocol_version", "session_id", "sequence", "type", "payload"];
const LEGACY_STATE_FIELDS = [
  "dashboard_revision", "source", "composition", "timeline", "matching",
  "output_mode", "blackout", "audience", "payload",
];
const STATE_FIELDS = ["dashboard_revision", "theme", ...LEGACY_STATE_FIELDS.slice(1)];
const SOURCE_FIELDS = ["kind", "scene_id", "chrono_group_id"];
const COMPOSITION_FIELDS = ["active_page_id", "displayed_chart_ids", "layout"];
const PAYLOAD_FIELDS = ["items", "audience_facts"];
const AUDIENCE_FACT_FIELDS = [
  "dashboard_name", "page", "parent_chrono_group", "scene_name", "scene_date",
];
const TIMELINE_FIELDS = [
  "frame_epochs", "frame_index", "period", "trace_mode", "seconds_per_frame",
];
const PERIOD_FIELDS = ["start", "end"];
const MATCHING_FIELDS = ["use_authored_settings"];
const AUDIENCE_FIELDS = ["date_position"];
const DATE_POSITION_FIELDS = ["x_permille", "y_permille", "width_permille"];
const DATE_MOVEMENT_FIELDS = ["x_permille", "y_permille"];
const AUDIENCE_DATE_POSITION_MESSAGE_FIELDS = ["source", "date_position"];
const CHART_ITEM_FIELDS = ["kind", "chart_id"];
const IMAGE_ITEM_FIELDS = ["kind", "panel_id", "media_id", "revision"];
const THEME_FIELDS = [
  "dashboard_style", "dashboard_color_profile", "chart_color_mode",
  "appearance_preference", "resolved_appearance",
];
const DASHBOARD_STYLE_IDS = new Set(DASHBOARD_STYLES.map(({ id }) => id));
const DASHBOARD_COLOR_PROFILE_IDS = new Set(DASHBOARD_COLOR_PROFILES.map(({ id }) => id));

const VALUELESS_ACTIONS = new Set(["PREVIOUS", "NEXT", "PLAY", "PAUSE", "END"]);
const IDENTIFIER_ACTIONS = new Set(["SELECT_SCENE", "SELECT_CHRONO_GROUP"]);

export class PresentationProtocolError extends Error {
  constructor(code, message, path = null) {
    super(message);
    this.name = "PresentationProtocolError";
    this.code = code;
    this.path = path;
    this.reason = Object.freeze({ code, message, ...(path ? { path } : {}) });
  }
}

export function presentationChannelName(sessionId) {
  assertIdentifier(sessionId, "session ID", "session_id");
  return `simex-presentation-${sessionId}`;
}

export function adaptSceneAudienceToPresentation(scene) {
  assertPlainObject(scene, "saved Scene", "scene");
  assertPlainObject(scene.audience, "saved Scene Audience settings", "scene.audience");
  const position = scene.audience.datePosition;
  assertPlainObject(position, "saved Scene Audience datePosition", "scene.audience.datePosition");
  const audience = {
    date_position: {
      x_permille: position.xPermille,
      y_permille: position.yPermille,
      width_permille: position.widthPermille,
    },
  };
  validateAudience(audience);
  return audience;
}

export function makePresentationMessage({
  sessionId,
  sequence,
  type,
  payload,
  presentableItemIndex,
}) {
  if (type === "state") {
    validatePresentationState(payload, { presentableItemIndex });
  }
  const message = {
    protocol_version: PRESENTATION_PROTOCOL_VERSION,
    session_id: sessionId,
    sequence,
    type,
    payload: type === "state" ? legacyWireState(payload) : clone(payload),
  };
  validateMessage(message, { presentableItemIndex });
  return message;
}

export function makePresentationThemeMessage({ sessionId, sequence, payload }) {
  const message = {
    protocol_version: PRESENTATION_THEME_PROTOCOL_VERSION,
    session_id: sessionId,
    sequence,
    type: "theme",
    payload: clone(payload),
  };
  validatePresentationThemeMessage(message);
  return message;
}

export function parsePresentationMessage(
  value,
  { sessionId, lastSequence, presentableItemIndex } = {},
) {
  const message = clone(value);
  validateMessage(message, { sessionId, lastSequence, presentableItemIndex });
  return message;
}

export function parsePresentationThemeMessage(
  value,
  { sessionId, lastSequence } = {},
) {
  const message = clone(value);
  validatePresentationThemeMessage(message, { sessionId, lastSequence });
  return message;
}

export function validatePresentationState(state, { presentableItemIndex } = {}) {
  assertPlainObject(state, "presentation state", "payload");
  const hasTheme = Object.hasOwn(state, "theme");
  assertExactFields(
    state,
    hasTheme ? STATE_FIELDS : LEGACY_STATE_FIELDS,
    "presentation state",
    "payload",
  );
  assertRevision(state.dashboard_revision);
  if (hasTheme) validateTheme(state.theme);
  validateSource(state.source);
  validatePayload(state.payload, { presentableItemIndex });
  validateComposition(state.composition, {
    presentableItemIndex,
    payloadItems: state.payload.items,
  });
  validateTimeline(state.timeline);
  validateMatching(state.matching);
  if (!OUTPUT_MODES.has(state.output_mode)) {
    reject("invalid_output_mode", "presentation output mode is not supported", "payload.output_mode");
  }
  if (typeof state.blackout !== "boolean") {
    reject("invalid_blackout", "presentation blackout must be a boolean", "payload.blackout");
  }
  validateAudience(state.audience);
  return state;
}

export function presentationThemeChannelName(sessionId) {
  assertIdentifier(sessionId, "session ID", "session_id");
  return `simex-presentation-theme-v${PRESENTATION_THEME_PROTOCOL_VERSION}-${sessionId}`;
}

function validatePresentationThemeMessage(message, { sessionId, lastSequence } = {}) {
  assertPlainObject(message, "presentation theme message", "message");
  assertExactFields(message, ENVELOPE_FIELDS, "presentation theme message", "message");
  if (message.protocol_version !== PRESENTATION_THEME_PROTOCOL_VERSION) {
    reject("protocol_mismatch", "unsupported presentation theme protocol version", "message.protocol_version");
  }
  assertIdentifier(message.session_id, "session ID", "message.session_id");
  if (sessionId !== undefined && message.session_id !== sessionId) {
    reject("session_mismatch", "unexpected presentation session", "message.session_id");
  }
  if (!Number.isSafeInteger(message.sequence) || message.sequence < 1) {
    reject("invalid_sequence", "presentation theme sequence must be a positive integer", "message.sequence");
  }
  if (lastSequence !== undefined && message.sequence <= lastSequence) {
    reject("non_monotonic_sequence", "presentation theme sequence must increase", "message.sequence");
  }
  if (message.type !== "theme") {
    reject("unsupported_message_type", "unsupported presentation theme message type", "message.type");
  }
  validateTheme(message.payload);
}

function legacyWireState(state) {
  const snapshot = clone(state);
  delete snapshot.theme;
  return snapshot;
}

function validateTheme(theme) {
  assertPlainObject(theme, "presentation theme", "payload.theme");
  assertExactFields(theme, THEME_FIELDS, "presentation theme", "payload.theme");
  const valid = DASHBOARD_STYLE_IDS.has(theme.dashboard_style)
    && DASHBOARD_COLOR_PROFILE_IDS.has(theme.dashboard_color_profile)
    && CHART_COLOR_MODES.includes(theme.chart_color_mode)
    && APPEARANCE_PREFERENCES.includes(theme.appearance_preference)
    && ["light", "dark"].includes(theme.resolved_appearance)
    && (
      theme.appearance_preference === "system"
      || theme.appearance_preference === theme.resolved_appearance
    );
  if (!valid) {
    reject("invalid_theme", "presentation theme must use an approved exact snapshot", "payload.theme");
  }
}

export function validatePresentationAction(
  action,
  { frameCount, presentableItemIndex } = {},
) {
  assertPlainObject(action, "presentation action", "action");
  if (typeof action.type !== "string") {
    reject("unsupported_action", "presentation action type is not supported", "action.type");
  }
  if (VALUELESS_ACTIONS.has(action.type)) {
    assertExactFields(action, ["type"], "presentation action", "action");
    return action;
  }
  if (action.type === "SEEK") {
    assertExactFields(action, ["type", "value"], "presentation action", "action");
    if (!Number.isSafeInteger(action.value) || action.value < 0) {
      reject("invalid_seek", "presentation seek must use a non-negative frame index", "action.value");
    }
    if (frameCount !== undefined) {
      if (!Number.isSafeInteger(frameCount) || frameCount < 0) {
        reject("invalid_frame_count", "frame count must be a non-negative integer", "frameCount");
      }
      if (action.value >= frameCount) {
        reject("seek_out_of_bounds", "presentation seek is outside the frame ledger", "action.value");
      }
    }
    return action;
  }
  if (IDENTIFIER_ACTIONS.has(action.type)) {
    assertExactFields(action, ["type", "value"], "presentation action", "action");
    assertIdentifier(action.value, "presentation source ID", "action.value");
    return action;
  }
  if (action.type === "SET_TRACE_MODE") {
    assertExactFields(action, ["type", "value"], "presentation action", "action");
    if (!TRACE_MODES.has(action.value)) {
      reject("invalid_trace_mode", "presentation trace mode is not supported", "action.value");
    }
    return action;
  }
  if (action.type === "SET_OUTPUT_MODE") {
    assertExactFields(action, ["type", "value"], "presentation action", "action");
    if (!OUTPUT_MODES.has(action.value)) {
      reject("invalid_output_mode", "presentation output mode is not supported", "action.value");
    }
    return action;
  }
  if (action.type === "SET_COMPOSITION") {
    assertExactFields(action, ["type", "value"], "presentation action", "action");
    validateComposition(action.value, { presentableItemIndex });
    return action;
  }
  if (action.type === "SET_BLACKOUT") {
    assertExactFields(action, ["type", "value"], "presentation action", "action");
    if (typeof action.value !== "boolean") {
      reject("invalid_blackout", "presentation blackout must be a boolean", "action.value");
    }
    return action;
  }
  reject("unsupported_action", "presentation action type is not supported", "action.type");
}

export function presentationRejectionReason(error) {
  if (error?.reason?.code && error?.reason?.message) return clone(error.reason);
  return {
    code: "presentation_rejected",
    message: error instanceof Error ? error.message : "presentation value was rejected",
  };
}

function validateMessage(message, { sessionId, lastSequence, presentableItemIndex }) {
  assertPlainObject(message, "presentation message", "message");
  assertExactFields(message, ENVELOPE_FIELDS, "presentation message", "message");
  if (message.protocol_version !== PRESENTATION_PROTOCOL_VERSION) {
    reject("protocol_mismatch", "unsupported presentation protocol version", "message.protocol_version");
  }
  assertIdentifier(message.session_id, "session ID", "message.session_id");
  if (sessionId !== undefined && message.session_id !== sessionId) {
    reject("session_mismatch", "unexpected presentation session", "message.session_id");
  }
  if (!Number.isSafeInteger(message.sequence) || message.sequence < 1) {
    reject("invalid_sequence", "presentation sequence must be a positive integer", "message.sequence");
  }
  if (lastSequence !== undefined && message.sequence <= lastSequence) {
    reject("non_monotonic_sequence", "presentation sequence must increase", "message.sequence");
  }
  if (!MESSAGE_TYPES.has(message.type)) {
    reject("unsupported_message_type", "unsupported presentation message type", "message.type");
  }
  if (message.type === "state") {
    validatePresentationState(message.payload, { presentableItemIndex });
  } else if (message.type === "audience-date-position") {
    validateAudienceDatePositionMessage(message.payload);
  } else if (message.payload !== null) {
    reject("invalid_message_payload", `${message.type} presentation payload must be null`, "message.payload");
  }
}

function validateAudienceDatePositionMessage(payload) {
  assertPlainObject(payload, "Audience date-position message", "message.payload");
  assertExactFields(
    payload,
    AUDIENCE_DATE_POSITION_MESSAGE_FIELDS,
    "Audience date-position message",
    "message.payload",
  );
  validateSource(payload.source);
  validateDateMovement(payload.date_position, "message.payload.date_position");
}

function validateDateMovement(position, path) {
  assertPlainObject(position, "Audience date movement", path);
  assertExactFields(position, DATE_MOVEMENT_FIELDS, "Audience date movement", path);
  for (const key of DATE_MOVEMENT_FIELDS) {
    if (!Number.isInteger(position[key]) || position[key] < 0 || position[key] > 1000) {
      reject(
        "invalid_date_position",
        "Audience date movement must use integer permille values",
        `${path}.${key}`,
      );
    }
  }
}

function validateSource(source) {
  assertPlainObject(source, "presentation source", "payload.source");
  assertExactFields(source, SOURCE_FIELDS, "presentation source", "payload.source");
  const valid = (
    source.kind === "scene"
      && isIdentifier(source.scene_id)
      && isIdentifier(source.chrono_group_id)
  ) || (
    source.kind === "Chrono Group"
      && source.scene_id === null
      && isIdentifier(source.chrono_group_id)
  ) || (
    source.kind === "manual"
      && source.scene_id === null
      && source.chrono_group_id === null
  );
  if (!valid) {
    reject("invalid_source_identity", "presentation source identity does not match its kind", "payload.source");
  }
}

function validateComposition(composition, { presentableItemIndex, payloadItems } = {}) {
  assertPlainObject(composition, "presentation composition", "payload.composition");
  assertExactFields(composition, COMPOSITION_FIELDS, "presentation composition", "payload.composition");
  assertIdentifier(composition.active_page_id, "active page ID", "payload.composition.active_page_id");
  const ids = composition.displayed_chart_ids;
  if (!Array.isArray(ids) || ids.length > 4) {
    reject(
      "invalid_item_count",
      "displayed chart IDs must contain 0 to 4 identifiers",
      "payload.composition.displayed_chart_ids",
    );
  }
  const uniqueIds = new Set();
  for (const id of ids) {
    assertIdentifier(id, "displayed item ID", "payload.composition.displayed_chart_ids");
    if (uniqueIds.has(id)) {
      reject(
        "duplicate_presentation_item",
        "displayed chart IDs must be unique",
        "payload.composition.displayed_chart_ids",
      );
    }
    uniqueIds.add(id);
    if (presentableItemIndex != null && !presentableItemIndex.has?.(id)) {
      reject(
        "untrusted_presentation_item",
        "displayed item identity is not allowed",
        "payload.composition.displayed_chart_ids",
      );
    }
  }
  if (payloadItems !== undefined) {
    const payloadIds = payloadItems.map(presentationItemId);
    if (
      ids.length !== payloadIds.length
      || ids.some((id, index) => id !== payloadIds[index])
    ) {
      reject(
        "composition_payload_mismatch",
        "displayed chart IDs must match payload item identities and order",
        "payload.composition.displayed_chart_ids",
      );
    }
  }
  if (!LAYOUTS_BY_COUNT[ids.length]?.has(composition.layout)) {
    reject(
      "invalid_layout",
      "layout is not valid for presentation item count",
      "payload.composition.layout",
    );
  }
}

function validatePayload(payload, { presentableItemIndex }) {
  assertPlainObject(payload, "presentation payload", "payload.payload");
  assertExactFields(payload, PAYLOAD_FIELDS, "presentation payload", "payload.payload");
  assertPresentationItems(payload.items, presentableItemIndex);
  assertPlainObject(
    payload.audience_facts,
    "presentation Audience facts",
    "payload.payload.audience_facts",
  );
  assertExactFields(
    payload.audience_facts,
    AUDIENCE_FACT_FIELDS,
    "presentation Audience facts",
    "payload.payload.audience_facts",
  );
  if (AUDIENCE_FACT_FIELDS.some((key) => typeof payload.audience_facts[key] !== "boolean")) {
    reject(
      "invalid_audience_facts",
      "Audience fact flags must be booleans",
      "payload.payload.audience_facts",
    );
  }
}

function validateTimeline(timeline) {
  if (timeline === null) return;
  assertPlainObject(timeline, "presentation timeline", "payload.timeline");
  assertExactFields(timeline, TIMELINE_FIELDS, "presentation timeline", "payload.timeline");
  if (!Array.isArray(timeline.frame_epochs) || timeline.frame_epochs.length === 0) {
    reject("invalid_frame_ledger", "presentation frame ledger must not be empty", "payload.timeline.frame_epochs");
  }
  let previous = -Infinity;
  for (const epoch of timeline.frame_epochs) {
    if (!Number.isSafeInteger(epoch) || epoch <= previous) {
      reject(
        "invalid_frame_ledger",
        "presentation frame epochs must be ordered unique integers",
        "payload.timeline.frame_epochs",
      );
    }
    previous = epoch;
  }
  if (
    !Number.isSafeInteger(timeline.frame_index)
    || timeline.frame_index < 0
    || timeline.frame_index >= timeline.frame_epochs.length
  ) {
    reject("invalid_frame_index", "presentation frame index is outside the frame ledger", "payload.timeline.frame_index");
  }
  assertPlainObject(timeline.period, "presentation period", "payload.timeline.period");
  assertExactFields(timeline.period, PERIOD_FIELDS, "presentation period", "payload.timeline.period");
  const { start, end } = timeline.period;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end) {
    reject("invalid_period", "presentation period must be an ordered integer epoch range", "payload.timeline.period");
  }
  if (timeline.frame_epochs[0] < start || timeline.frame_epochs.at(-1) > end) {
    reject("invalid_period", "presentation frames must remain inside the period", "payload.timeline.period");
  }
  if (!TRACE_MODES.has(timeline.trace_mode)) {
    reject("invalid_trace_mode", "presentation trace mode is not supported", "payload.timeline.trace_mode");
  }
  if (!Number.isFinite(timeline.seconds_per_frame) || timeline.seconds_per_frame <= 0) {
    reject("invalid_seconds_per_frame", "presentation seconds per frame must be positive", "payload.timeline.seconds_per_frame");
  }
}

function validateMatching(matching) {
  assertPlainObject(matching, "presentation matching", "payload.matching");
  assertExactFields(matching, MATCHING_FIELDS, "presentation matching", "payload.matching");
  if (matching.use_authored_settings !== true) {
    reject(
      "authored_matching_required",
      "Present must use authored matching settings",
      "payload.matching.use_authored_settings",
    );
  }
}

function validateAudience(audience) {
  assertPlainObject(audience, "presentation Audience settings", "payload.audience");
  assertExactFields(audience, AUDIENCE_FIELDS, "presentation Audience settings", "payload.audience");
  validateDatePosition(audience.date_position, "payload.audience.date_position");
}

function validateDatePosition(position, path) {
  assertPlainObject(position, "presentation Audience date position", path);
  assertExactFields(
    position,
    DATE_POSITION_FIELDS,
    "presentation Audience date position",
    path,
  );
  for (const key of DATE_POSITION_FIELDS) {
    if (!Number.isInteger(position[key]) || position[key] < 0 || position[key] > 1000) {
      reject("invalid_date_position", "Audience date position must use integer permille values", `${path}.${key}`);
    }
  }
  if (position.width_permille < 1 || position.x_permille + position.width_permille > 1000) {
    reject("invalid_date_position", "Audience date position must fit within the Audience canvas", path);
  }
}

function assertPresentationItems(items, presentableItemIndex) {
  if (!Array.isArray(items) || items.length > 4) {
    reject("invalid_item_count", "presentation items must contain 0 to 4 items", "payload.payload.items");
  }
  const uniqueIds = new Set();
  for (const item of items) {
    assertPlainObject(item, "presentation item", "payload.payload.items");
    const itemId = validatePresentationItem(item);
    if (uniqueIds.has(itemId)) {
      reject("duplicate_presentation_item", "presentation items must be unique", "payload.payload.items");
    }
    uniqueIds.add(itemId);
    if (presentableItemIndex != null) {
      const trusted = presentableItemIndex.get?.(itemId)?.descriptor;
      if (!trusted || !descriptorsEqual(item, trusted)) {
        reject(
          "untrusted_presentation_item",
          "presentation item identity or revision is not allowed",
          "payload.payload.items",
        );
      }
    }
  }
}

function validatePresentationItem(item) {
  if (item.kind === "chart") {
    assertExactFields(item, CHART_ITEM_FIELDS, "presentation item", "payload.payload.items");
    assertIdentifier(item.chart_id, "chart ID", "payload.payload.items.chart_id");
    return item.chart_id;
  }
  if (item.kind === "image") {
    assertExactFields(item, IMAGE_ITEM_FIELDS, "presentation item", "payload.payload.items");
    assertIdentifier(item.panel_id, "Image panel ID", "payload.payload.items.panel_id");
    assertIdentifier(item.media_id, "Image media ID", "payload.payload.items.media_id");
    if (!Number.isSafeInteger(item.revision) || item.revision < 1) {
      reject("invalid_image_revision", "Image revision must be a positive integer", "payload.payload.items.revision");
    }
    return item.panel_id;
  }
  reject("unsupported_presentation_item", "presentation item kind is not allowed", "payload.payload.items.kind");
}

function presentationItemId(item) {
  return item.kind === "chart" ? item.chart_id : item.panel_id;
}

function assertRevision(value) {
  if ((typeof value !== "string" || value.trim() === "") && !Number.isSafeInteger(value)) {
    reject("invalid_dashboard_revision", "dashboard revision must be a non-empty string or integer", "payload.dashboard_revision");
  }
}

function descriptorsEqual(left, right) {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return leftKeys.length === rightKeys.length && leftKeys.every(
    (key) => Object.hasOwn(right, key) && left[key] === right[key],
  );
}

function isIdentifier(value) {
  return typeof value === "string" && IDENTIFIER.test(value);
}

function assertIdentifier(value, label, path) {
  if (!isIdentifier(value)) reject("invalid_identifier", `${label} must be an allowed identifier`, path);
}

function assertExactFields(value, fields, label, path) {
  const expected = new Set(fields);
  for (const key of Object.keys(value)) {
    if (!expected.has(key)) reject("unknown_field", `unknown ${label} field: ${key}`, `${path}.${key}`);
  }
  for (const key of fields) {
    if (!Object.hasOwn(value, key)) reject("missing_field", `missing ${label} field: ${key}`, `${path}.${key}`);
  }
}

function assertPlainObject(value, label, path) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    reject("invalid_object", `${label} must be an object`, path);
  }
}

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function reject(code, message, path) {
  throw new PresentationProtocolError(code, message, path);
}
