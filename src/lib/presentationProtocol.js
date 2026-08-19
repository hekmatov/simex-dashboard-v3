export const PRESENTATION_PROTOCOL_VERSION = 2;

const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const MESSAGE_TYPES = new Set(["ready", "state", "heartbeat", "ended"]);
const LAYOUTS_BY_COUNT = Object.freeze({
  0: new Set(["solo"]),
  1: new Set(["solo"]),
  2: new Set(["sideBySide", "overUnder"]),
  3: new Set(["topFocus", "bottomFocus", "leftFocus", "rightFocus"]),
  4: new Set(["grid2x2"]),
});
const ENVELOPE_FIELDS = [
  "protocol_version",
  "session_id",
  "sequence",
  "type",
  "payload",
];
const STATE_FIELDS = [
  "active_page_id",
  "displayed_chart_ids",
  "layout",
  "time",
  "audience_facts",
  "blackout",
];
const AUDIENCE_FACT_FIELDS = [
  "dashboard_name",
  "page",
  "parent_time_group",
  "scene_name",
  "scene_date",
];
const TIME_FIELDS = ["group_id", "active_epoch_ms"];

export function presentationChannelName(sessionId) {
  assertIdentifier(sessionId, "session ID");
  return `simex-presentation-${sessionId}`;
}

export function makePresentationMessage({
  sessionId,
  sequence,
  type,
  payload,
  validChartIds,
}) {
  const message = {
    protocol_version: PRESENTATION_PROTOCOL_VERSION,
    session_id: sessionId,
    sequence,
    type,
    payload: structuredClone(payload),
  };
  validateMessage(message, { validChartIds });
  return message;
}

export function parsePresentationMessage(value, { sessionId, validChartIds } = {}) {
  const message = structuredClone(value);
  validateMessage(message, { sessionId, validChartIds });
  return message;
}

export function validatePresentationState(state, { validChartIds } = {}) {
  assertPlainObject(state, "presentation state");
  assertExactFields(state, STATE_FIELDS, "presentation state");
  assertIdentifier(state.active_page_id, "active page ID");
  assertChartIds(state.displayed_chart_ids, validChartIds);

  if (!LAYOUTS_BY_COUNT[state.displayed_chart_ids.length].has(state.layout)) {
    throw new Error("layout is not valid for displayed chart count");
  }
  validateAudienceFacts(state.audience_facts);
  if (typeof state.blackout !== "boolean") {
    throw new Error("presentation state flags must be booleans");
  }
  validateTime(state.time);
  return state;
}

function validateMessage(message, { sessionId, validChartIds }) {
  assertPlainObject(message, "presentation message");
  assertExactFields(message, ENVELOPE_FIELDS, "presentation message");
  if (message.protocol_version !== PRESENTATION_PROTOCOL_VERSION) {
    throw new Error("unsupported presentation protocol version");
  }
  assertIdentifier(message.session_id, "session ID");
  if (sessionId !== undefined && message.session_id !== sessionId) {
    throw new Error("unexpected presentation session");
  }
  if (!Number.isSafeInteger(message.sequence) || message.sequence < 1) {
    throw new Error("presentation sequence must be a positive integer");
  }
  if (!MESSAGE_TYPES.has(message.type)) {
    throw new Error("unsupported presentation message type");
  }

  if (message.type === "state") {
    validatePresentationState(message.payload, { validChartIds });
  } else {
    assertPlainObject(message.payload, "presentation payload");
    assertExactFields(message.payload, [], "presentation payload");
  }
}

function validateAudienceFacts(facts) {
  assertPlainObject(facts, "presentation audience facts");
  assertExactFields(
    facts,
    AUDIENCE_FACT_FIELDS,
    "presentation audience facts",
  );
  if (AUDIENCE_FACT_FIELDS.some((key) => typeof facts[key] !== "boolean")) {
    throw new Error("Audience fact flags must be booleans");
  }
}

function validateTime(time) {
  if (time === null) return;
  assertPlainObject(time, "presentation time");
  assertExactFields(time, TIME_FIELDS, "presentation time");
  assertIdentifier(time.group_id, "time group ID");
  if (!Number.isFinite(time.active_epoch_ms)) {
    throw new Error("presentation time must use a finite epoch value");
  }
}

function assertChartIds(chartIds, validChartIds) {
  if (!Array.isArray(chartIds) || chartIds.length > 4) {
    throw new Error("displayed chart IDs must contain 0 to 4 items");
  }
  const allowedIds = validChartIds == null ? null : new Set(validChartIds);
  const uniqueIds = new Set();
  for (const chartId of chartIds) {
    assertIdentifier(chartId, "chart ID");
    if (uniqueIds.has(chartId)) {
      throw new Error("displayed chart IDs must be unique chart IDs");
    }
    if (allowedIds && !allowedIds.has(chartId)) {
      throw new Error("displayed chart ID is not allowed");
    }
    uniqueIds.add(chartId);
  }
}

function assertIdentifier(value, label) {
  if (typeof value !== "string" || !IDENTIFIER.test(value)) {
    throw new Error(`${label} must be an allowed identifier`);
  }
}

function assertExactFields(value, fields, label) {
  const expected = new Set(fields);
  for (const key of Object.keys(value)) {
    if (!expected.has(key)) throw new Error(`unknown ${label} field: ${key}`);
  }
  for (const key of fields) {
    if (!Object.hasOwn(value, key)) throw new Error(`missing ${label} field: ${key}`);
  }
}

function assertPlainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
}
