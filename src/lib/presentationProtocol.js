export const PRESENTATION_PROTOCOL_VERSION = 3;

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
  "items",
  "layout",
  "time",
  "audience_facts",
  "blackout",
];
const AUDIENCE_FACT_FIELDS = [
  "dashboard_name",
  "page",
  "parent_chrono_group",
  "scene_name",
  "scene_date",
];
const TIME_FIELDS = ["group_id", "active_epoch_ms"];
const CHART_ITEM_FIELDS = ["kind", "chart_id"];
const IMAGE_ITEM_FIELDS = ["kind", "panel_id", "source_id", "revision"];

export function presentationChannelName(sessionId) {
  assertIdentifier(sessionId, "session ID");
  return `simex-presentation-${sessionId}`;
}

export function makePresentationMessage({
  sessionId,
  sequence,
  type,
  payload,
  presentableItemIndex,
}) {
  const message = {
    protocol_version: PRESENTATION_PROTOCOL_VERSION,
    session_id: sessionId,
    sequence,
    type,
    payload: structuredClone(payload),
  };
  validateMessage(message, { presentableItemIndex });
  return message;
}

export function parsePresentationMessage(value, { sessionId, presentableItemIndex } = {}) {
  const message = structuredClone(value);
  validateMessage(message, { sessionId, presentableItemIndex });
  return message;
}

export function validatePresentationState(state, { presentableItemIndex } = {}) {
  assertPlainObject(state, "presentation state");
  assertExactFields(state, STATE_FIELDS, "presentation state");
  assertIdentifier(state.active_page_id, "active page ID");
  assertPresentationItems(state.items, presentableItemIndex);

  if (!LAYOUTS_BY_COUNT[state.items.length].has(state.layout)) {
    throw new Error("layout is not valid for presentation item count");
  }
  validateAudienceFacts(state.audience_facts);
  if (typeof state.blackout !== "boolean") {
    throw new Error("presentation state flags must be booleans");
  }
  validateTime(state.time);
  return state;
}

export function reconcilePresentationState(state, { presentableItemIndex } = {}) {
  assertPlainObject(state, "presentation state");
  if (!Array.isArray(state.items)) {
    return validatePresentationState(state, { presentableItemIndex });
  }
  const items = state.items.filter((item) => {
    assertPlainObject(item, "presentation item");
    const itemId = validatePresentationItem(item);
    const trusted = presentableItemIndex?.get?.(itemId)?.descriptor;
    return trusted && descriptorsEqual(item, trusted);
  });
  const allowedLayouts = LAYOUTS_BY_COUNT[items.length];
  const reconciled = {
    ...state,
    items: structuredClone(items),
    layout: allowedLayouts.has(state.layout)
      ? state.layout
      : allowedLayouts.values().next().value,
  };
  return validatePresentationState(reconciled, { presentableItemIndex });
}

function validateMessage(message, { sessionId, presentableItemIndex }) {
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
    validatePresentationState(message.payload, { presentableItemIndex });
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
  assertIdentifier(time.group_id, "chrono group ID");
  if (!Number.isFinite(time.active_epoch_ms)) {
    throw new Error("presentation time must use a finite epoch value");
  }
}

function assertPresentationItems(items, presentableItemIndex) {
  if (!Array.isArray(items) || items.length > 4) {
    throw new Error("presentation items must contain 0 to 4 items");
  }
  const uniqueIds = new Set();
  for (const item of items) {
    assertPlainObject(item, "presentation item");
    const itemId = validatePresentationItem(item);
    if (uniqueIds.has(itemId)) {
      throw new Error("presentation state must contain unique presentation items");
    }
    uniqueIds.add(itemId);

    if (presentableItemIndex != null) {
      const trusted = presentableItemIndex.get?.(itemId)?.descriptor;
      if (!trusted || !descriptorsEqual(item, trusted)) {
        throw new Error("presentation item identity or revision is not allowed");
      }
    }
  }
}

function validatePresentationItem(item) {
  if (item.kind === "chart") {
    assertExactFields(item, CHART_ITEM_FIELDS, "presentation item");
    assertIdentifier(item.chart_id, "chart ID");
    return item.chart_id;
  }
  if (item.kind === "image") {
    assertExactFields(item, IMAGE_ITEM_FIELDS, "presentation item");
    assertIdentifier(item.panel_id, "Image panel ID");
    assertIdentifier(item.source_id, "Image source ID");
    if (!Number.isSafeInteger(item.revision) || item.revision < 1) {
      throw new Error("Image revision must be a positive integer");
    }
    return item.panel_id;
  }
  throw new Error("presentation item descriptor kind is not allowed");
}

function descriptorsEqual(left, right) {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return leftKeys.length === rightKeys.length && leftKeys.every(
    (key) => Object.hasOwn(right, key) && left[key] === right[key],
  );
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
