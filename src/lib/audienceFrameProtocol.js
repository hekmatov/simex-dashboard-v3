import { resolvePresentationResolution } from "./presentationResolution.js";

export const MAX_AUDIENCE_FRAME_BYTES = 600 * 1024;
export const AUDIENCE_FRAME_TYPES = Object.freeze([
  "audience_frame", "audience_viewport", "audience_heartbeat", "audience_frame_unavailable",
]);
const IDENTITY_FIELDS = ["stream_id", "accepted_sequence", "dashboard_revision"];
const FIELDS = {
  audience_frame: [...IDENTITY_FIELDS, "revision", "viewport", "stage", "image", "capturedAt", "reason"],
  audience_viewport: [...IDENTITY_FIELDS, "viewport", "stage"],
  audience_heartbeat: [...IDENTITY_FIELDS, "status", "since"],
  audience_frame_unavailable: [...IDENTITY_FIELDS, "reason"],
};

export function validateAudienceFramePayload(type, payload) {
  exact(payload, FIELDS[type]);
  if (typeof payload.stream_id !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(payload.stream_id)) fail("invalid_frame_identity");
  integer(payload.accepted_sequence, 1, Number.MAX_SAFE_INTEGER);
  if (!(typeof payload.dashboard_revision === "string" && payload.dashboard_revision.trim().length > 0
    && payload.dashboard_revision.length <= 512)
    && !(Number.isSafeInteger(payload.dashboard_revision) && payload.dashboard_revision >= 0)) fail("invalid_frame_identity");
  if (type === "audience_frame" || type === "audience_viewport") {
    exact(payload.viewport, ["width", "height", "dpr"]);
    number(payload.viewport.width, 1, 16384); number(payload.viewport.height, 1, 16384);
    number(payload.viewport.dpr, 0.25, 8);
    exact(payload.stage, ["width", "height", "scale"]);
    const { width, height, scale } = payload.stage;
    try { resolvePresentationResolution({ width, height }); } catch { fail("invalid_frame_geometry"); }
    number(scale, Number.MIN_VALUE, 128);
  }
  if (type === "audience_frame") {
    integer(payload.revision, 1, Number.MAX_SAFE_INTEGER);
    number(payload.capturedAt, 0, Number.MAX_SAFE_INTEGER);
    // Data URLs are ASCII; count the entire encoded string, not just its bytes
    // after decoding. Reject before cloning or retaining an exercise image.
    if (typeof payload.image !== "string" || payload.image.length > MAX_AUDIENCE_FRAME_BYTES) fail("frame_too_large");
    if (!/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]*={0,2}$/.test(payload.image)) fail("invalid_frame_image");
  }
  if (Object.hasOwn(payload, "reason") && (typeof payload.reason !== "string" || !/^[a-z][a-z0-9-]{0,63}$/.test(payload.reason))) fail("invalid_frame_reason");
  if (type === "audience_heartbeat") {
    if (!["static", "hidden", "disconnected"].includes(payload.status)) fail("invalid_frame_status");
    number(payload.since, 0, Number.MAX_SAFE_INTEGER);
  }
}

function exact(value, fields) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || !fields || Object.keys(value).length !== fields.length
    || fields.some(key => !Object.hasOwn(value, key))) fail("invalid_frame_shape");
}
function number(value, min, max) {
  if (!Number.isFinite(value) || value < min || value > max) fail("invalid_frame_geometry");
}
function integer(value, min, max) {
  if (!Number.isSafeInteger(value) || value < min || value > max) fail("invalid_frame_identity");
}
function fail(code) {
  const error = new Error(`Invalid Audience stream metadata (${code}).`);
  error.code = code;
  error.reason = { code, message: error.message };
  throw error;
}
