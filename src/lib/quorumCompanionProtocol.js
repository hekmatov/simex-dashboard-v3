export const QUORUM_PROTOCOL_VERSION = "1";
export const MAX_PROTOCOL_MESSAGE_BYTES = 16_384;

export const DASHBOARD_CAPABILITIES = Object.freeze([
  "display_set",
  "display_state",
  "individual_close",
  "reorder",
  "reconnect_snapshot",
]);

export const REASON_CODES = Object.freeze([
  "operator_selected_recommendation",
  "manual_open",
  "manual_close",
  "manual_reorder",
  "reconnect_snapshot",
  "protocol_mismatch",
  "credential_mismatch",
  "session_mismatch",
  "catalogue_mismatch",
  "stale_revision",
  "invalid_chart",
  "invalid_sequence",
  "capacity_exceeded",
  "malformed_message",
]);

const ENVELOPE_FIELDS = Object.freeze([
  "acknowledgement_status",
  "idempotency_key",
  "message_id",
  "payload",
  "protocol_version",
  "sequence",
  "session_id",
  "type",
]);

const BOOTSTRAP_FIELDS = Object.freeze([
  "catalogue_digest",
  "catalogue_id",
  "credential",
  "gateway_path",
  "protocol_version",
  "session_id",
]);

const MESSAGE_DEFINITIONS = Object.freeze({
  dashboard_hello: Object.freeze({
    acknowledgement: "required",
    fields: Object.freeze([
      "capabilities",
      "catalogue_digest",
      "catalogue_id",
      "credential",
      "dashboard_instance_id",
      "display_revision",
      "displayed_chart_ids",
    ]),
  }),
  companion_ready: Object.freeze({
    acknowledgement: "accepted",
    fields: Object.freeze([
      "accepted_dashboard_instance_id",
      "accepted_display_revision",
      "catalogue_digest",
      "catalogue_id",
    ]),
  }),
  display_set_requested: Object.freeze({
    acknowledgement: "required",
    fields: Object.freeze([
      "chart_ids",
      "expected_display_revision",
      "reason_code",
    ]),
  }),
  display_state_changed: Object.freeze({
    acknowledgement: "required",
    fields: Object.freeze([
      "change_reason",
      "display_revision",
      "displayed_chart_ids",
    ]),
  }),
  display_rejected: Object.freeze({
    acknowledgement: "rejected",
    fields: Object.freeze([
      "display_revision",
      "reason_code",
      "rejected_message_id",
    ]),
  }),
  dashboard_snapshot: Object.freeze({
    acknowledgement: "required",
    fields: Object.freeze([
      "dashboard_instance_id",
      "display_revision",
      "displayed_chart_ids",
    ]),
  }),
});

const STATE_CHANGE_REASONS = new Set([
  "operator_selected_recommendation",
  "manual_open",
  "manual_close",
  "manual_reorder",
  "reconnect_snapshot",
]);
const REJECTION_REASONS = new Set(
  REASON_CODES.filter((reason) => !STATE_CHANGE_REASONS.has(reason)),
);
const CAPABILITY_SET = new Set(DASHBOARD_CAPABILITIES);
const LOWERCASE_DIGEST = /^[0-9a-f]{64}$/;

export function parseBootstrap(value) {
  const bootstrap = cloneObject(value, "bootstrap");
  assertExactFields(bootstrap, BOOTSTRAP_FIELDS, "bootstrap");
  assertProtocolVersion(bootstrap.protocol_version);
  assertIdentifier(bootstrap.session_id, "session ID");
  assertIdentifier(bootstrap.catalogue_id, "catalogue ID");
  assertDigest(bootstrap.catalogue_digest);
  assertIdentifier(bootstrap.credential, "credential");
  if (bootstrap.gateway_path !== "/companion/ws") {
    throw new Error("gateway path must be /companion/ws");
  }
  return deepFreeze(bootstrap);
}

export function parseCompanionMessage(text) {
  if (typeof text !== "string") {
    throw new Error("message must be text");
  }
  const size = new TextEncoder().encode(text).byteLength;
  if (size > MAX_PROTOCOL_MESSAGE_BYTES) {
    throw new Error(`message exceeds ${MAX_PROTOCOL_MESSAGE_BYTES} bytes`);
  }

  let value;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("malformed message");
  }
  validateEnvelope(value);
  return deepFreeze(value);
}

export function makeDashboardMessage({
  messageId,
  sessionId,
  sequence,
  idempotencyKey,
  type,
  acknowledgementStatus = "required",
  payload,
}) {
  const message = structuredClone({
    protocol_version: QUORUM_PROTOCOL_VERSION,
    message_id: messageId,
    session_id: sessionId,
    sequence,
    idempotency_key: idempotencyKey,
    type,
    acknowledgement_status: acknowledgementStatus,
    payload,
  });
  validateEnvelope(message);
  return deepFreeze(message);
}

function validateEnvelope(value) {
  assertPlainObject(value, "message");
  assertExactFields(value, ENVELOPE_FIELDS, "envelope");
  assertProtocolVersion(value.protocol_version);
  assertIdentifier(value.message_id, "message ID");
  assertIdentifier(value.session_id, "session ID");
  assertPositiveInteger(value.sequence, "sequence");
  assertIdentifier(value.idempotency_key, "idempotency key");

  const definition = MESSAGE_DEFINITIONS[value.type];
  if (!definition) {
    throw new Error(`unsupported message type: ${String(value.type)}`);
  }
  if (value.acknowledgement_status !== definition.acknowledgement) {
    throw new Error(`invalid acknowledgement status for ${value.type}`);
  }
  assertPlainObject(value.payload, "payload");
  assertExactFields(value.payload, definition.fields, "payload");
  validatePayload(value.type, value.payload);
}

function validatePayload(type, payload) {
  switch (type) {
    case "dashboard_hello":
      assertIdentifier(payload.credential, "credential");
      assertIdentifier(payload.dashboard_instance_id, "dashboard instance ID");
      assertIdentifier(payload.catalogue_id, "catalogue ID");
      assertDigest(payload.catalogue_digest);
      assertCapabilities(payload.capabilities);
      assertNonNegativeInteger(payload.display_revision, "display revision");
      assertChartIds(payload.displayed_chart_ids, { minimum: 0 });
      return;
    case "companion_ready":
      assertIdentifier(
        payload.accepted_dashboard_instance_id,
        "accepted dashboard instance ID",
      );
      assertIdentifier(payload.catalogue_id, "catalogue ID");
      assertDigest(payload.catalogue_digest);
      assertNonNegativeInteger(
        payload.accepted_display_revision,
        "accepted display revision",
      );
      return;
    case "display_set_requested":
      assertChartIds(payload.chart_ids, { minimum: 1 });
      assertNonNegativeInteger(
        payload.expected_display_revision,
        "expected display revision",
      );
      if (payload.reason_code !== "operator_selected_recommendation") {
        throw new Error("invalid reason code for display request");
      }
      return;
    case "display_state_changed":
      assertNonNegativeInteger(payload.display_revision, "display revision");
      assertChartIds(payload.displayed_chart_ids, { minimum: 0 });
      if (!STATE_CHANGE_REASONS.has(payload.change_reason)) {
        throw new Error("invalid reason code for display state");
      }
      return;
    case "display_rejected":
      assertIdentifier(payload.rejected_message_id, "rejected message ID");
      assertNonNegativeInteger(payload.display_revision, "display revision");
      if (!REJECTION_REASONS.has(payload.reason_code)) {
        throw new Error("invalid reason code for rejection");
      }
      return;
    case "dashboard_snapshot":
      assertIdentifier(payload.dashboard_instance_id, "dashboard instance ID");
      assertNonNegativeInteger(payload.display_revision, "display revision");
      assertChartIds(payload.displayed_chart_ids, { minimum: 0 });
      return;
    default:
      throw new Error(`unsupported message type: ${type}`);
  }
}

function assertCapabilities(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("capabilities must be a non-empty array");
  }
  const unique = new Set();
  for (const capability of value) {
    assertIdentifier(capability, "capability");
    if (!CAPABILITY_SET.has(capability)) {
      throw new Error(`unsupported capability: ${capability}`);
    }
    if (unique.has(capability)) {
      throw new Error("capabilities must be unique");
    }
    unique.add(capability);
  }
}

function assertChartIds(value, { minimum }) {
  if (!Array.isArray(value) || value.length < minimum || value.length > 4) {
    throw new Error(`chart IDs must contain ${minimum} to 4 items`);
  }
  const unique = new Set();
  for (const chartId of value) {
    assertIdentifier(chartId, "chart ID");
    if (unique.has(chartId)) {
      throw new Error("display state requires unique chart IDs");
    }
    unique.add(chartId);
  }
}

function assertExactFields(value, expectedFields, label) {
  const expected = new Set(expectedFields);
  for (const key of Object.keys(value)) {
    if (!expected.has(key)) {
      throw new Error(`unknown ${label} field: ${key}`);
    }
  }
  for (const field of expectedFields) {
    if (!Object.hasOwn(value, field)) {
      throw new Error(`missing ${label} field: ${field}`);
    }
  }
}

function assertProtocolVersion(value) {
  if (value !== QUORUM_PROTOCOL_VERSION) {
    throw new Error(`unsupported protocol version: ${String(value)}`);
  }
}

function assertDigest(value) {
  if (typeof value !== "string" || !LOWERCASE_DIGEST.test(value)) {
    throw new Error("catalogue digest must be 64 lowercase hexadecimal characters");
  }
}

function assertIdentifier(value, label) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 256 ||
    value.trim() !== value
  ) {
    throw new Error(`${label} must be non-empty bounded text`);
  }
}

function assertPositiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
}

function assertNonNegativeInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
}

function cloneObject(value, label) {
  assertPlainObject(value, label);
  return structuredClone(value);
}

function assertPlainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) {
    deepFreeze(child);
  }
  return Object.freeze(value);
}
