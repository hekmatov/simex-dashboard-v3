import { cursorFrameIndex, validateCursorScope, validateCursorWindow, validateExerciseTime } from "./cursorModel.js";

const FIELDS = ["mode", "epoch_ms", "scope", "window", "exercise_time", "frame_epochs", "frame_index",
  "trace_mode", "seconds_per_frame", "matching_override", "nearest_tolerance_ms", "members"];
const OVERRIDES = new Set(["authored", "concurrent", "latest", "closest", "interpolate"]);

/** Live carries the controller's resolved instant; the Audience never derives its own clock. */
export function makePresentationTime(playback) {
  const time = {
    mode: playback.cursor.mode, epoch_ms: playback.activeEpochMs ?? null,
    scope: { ...playback.cursor.scope }, window: playback.cursor.window && { ...playback.cursor.window },
    exercise_time: playback.exerciseTime ?? null, frame_epochs: [...playback.clock],
    frame_index: cursorFrameIndex(playback.clock, playback.activeEpochMs), trace_mode: playback.traceMode,
    seconds_per_frame: playback.speed, matching_override: playback.matchingOverride,
    nearest_tolerance_ms: playback.nearestToleranceMs ?? null,
    members: (playback.members ?? []).flatMap(member => {
      const matching = playback.contexts?.[member.chartId]?.matching;
      return matching ? [{ chart_id: member.chartId, time_role: member.timeRole, matching: matching.policy === "nearest"
        ? { policy: matching.policy, tolerance_ms: matching.toleranceMs ?? null } : { policy: matching.policy } }] : [];
    }),
  };
  validatePresentationTime(time);
  Object.freeze(time.scope); if (time.window) Object.freeze(time.window); Object.freeze(time.frame_epochs);
  for (const member of time.members) { Object.freeze(member.matching); Object.freeze(member); } Object.freeze(time.members);
  return Object.freeze(time);
}

export function validatePresentationTime(time) {
  record(time, FIELDS, "Presentation time");
  if (!["live", "at"].includes(time.mode)) invalid("mode");
  if (time.epoch_ms !== null && !validEpoch(time.epoch_ms)) invalid("instant");
  record(time.scope, ["kind", "id"], "Presentation time scope");
  validateCursorScope(time.scope);
  if (time.window !== null) record(time.window, ["start", "end"], "Presentation time window");
  validateCursorWindow(time.window);
  const start = time.window ? Date.parse(time.window.start) : -Infinity;
  const end = time.window ? Date.parse(time.window.end) : Infinity;
  if (time.mode === "at" && time.epoch_ms !== null && (time.epoch_ms < start || time.epoch_ms > end)) invalid("window instant");
  if (time.exercise_time !== null) validateExerciseTime(time.exercise_time);
  if (time.mode === "live" && time.exercise_time !== null && time.epoch_ms !== Date.parse(time.exercise_time)) invalid("declared Live instant");
  if (!Array.isArray(time.frame_epochs)) invalid("frame ledger");
  let previous = -Infinity;
  for (const epoch of time.frame_epochs) {
    if (!validEpoch(epoch) || epoch <= previous) invalid("ordered unique frame ledger");
    if (epoch < start || epoch > end) invalid("window frame ledger");
    previous = epoch;
  }
  if (!Number.isSafeInteger(time.frame_index) || time.frame_index !== cursorFrameIndex(time.frame_epochs, time.epoch_ms)) invalid("frame index");
  if (!["reveal", "full"].includes(time.trace_mode)) invalid("trace mode");
  if (!Number.isFinite(time.seconds_per_frame) || time.seconds_per_frame <= 0) invalid("cadence");
  if (!OVERRIDES.has(time.matching_override)) invalid("matching override");
  // Null retains the transition's unbounded legacy-nearest chart diagnostic.
  // New session authoring requires an explicit bound in the shared reducer.
  if (time.nearest_tolerance_ms !== null && (!Number.isFinite(time.nearest_tolerance_ms) || time.nearest_tolerance_ms < 0)) invalid("nearest distance");
  if (!Array.isArray(time.members)) invalid("member projection");
  const ids = new Set();
  for (const member of time.members) {
    record(member, ["chart_id", "time_role", "matching"], "Presentation time member");
    if (typeof member.chart_id !== "string" || !member.chart_id.trim() || ids.has(member.chart_id)
      || typeof member.time_role !== "string" || !member.time_role.trim()) invalid("member identity");
    ids.add(member.chart_id);
    const matching = member.matching;
    record(matching, matching?.policy === "nearest" ? ["policy", "tolerance_ms"] : ["policy"], "Presentation effective matching");
    if (!["exact", "lastKnown", "nearest", "interpolate"].includes(matching.policy)) invalid("effective member policy");
    if (matching.policy === "nearest" && matching.tolerance_ms !== null && (!Number.isFinite(matching.tolerance_ms) || matching.tolerance_ms < 0)) invalid("effective nearest distance");
    const override = { concurrent: "exact", latest: "lastKnown", closest: "nearest", interpolate: "interpolate" }[time.matching_override];
    if (override && (matching.policy !== override || (override === "nearest" && matching.tolerance_ms !== time.nearest_tolerance_ms))) invalid("effective session policy");
  }
  return time;
}

export function audienceTimeContexts(time, source = null) {
  validatePresentationTime(time);
  const contexts = Object.create(null);
  if (time.epoch_ms === null) return Object.freeze(contexts);
  for (const member of time.members) {
    const matching = member.matching.policy === "nearest" ? { policy: "nearest",
      ...(member.matching.tolerance_ms === null ? {} : { toleranceMs: member.matching.tolerance_ms }) } : { policy: member.matching.policy };
    contexts[member.chart_id] = Object.freeze({ kind: "cursor", mode: time.mode, scope: Object.freeze({ ...time.scope }),
      activeEpochMs: time.epoch_ms, matching: Object.freeze(matching), timeRole: member.time_role, traceMode: time.trace_mode, frameIndex: time.frame_index,
      ...(source?.scene_id ? { sceneId: source.scene_id } : {}) });
  }
  return Object.freeze(contexts);
}

function record(value, fields, name) {
  if (!value || typeof value !== "object" || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new Error(`${name} must be a plain record.`);
  const descriptors = Object.getOwnPropertyDescriptors(value), keys = Reflect.ownKeys(descriptors);
  if (keys.length !== fields.length || keys.some(key => !fields.includes(key) || !("value" in descriptors[key]))) throw new Error(`${name} has invalid fields.`);
}
function validEpoch(value) { return Number.isSafeInteger(value) && Number.isFinite(new Date(value).valueOf()); }
function invalid(field) { throw new Error(`Presentation time has an invalid ${field}.`); }
