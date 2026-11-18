import { isCanonicalUtcInstant } from "./temporalSchema.js";

export const INITIAL_TIME_CURSOR = Object.freeze({
  mode: "live", epochMs: null,
  scope: Object.freeze({ kind: "page", id: null }), window: null,
});

export function validateCursorScope(scope) {
  if (!scope || typeof scope !== "object" || Array.isArray(scope)
    || Object.keys(scope).some(key => !["kind", "id"].includes(key))
    || !["page", "storyline", "dashboard"].includes(scope.kind)
    || (scope.id !== null && (typeof scope.id !== "string" || !scope.id.trim()))
    || (scope.kind === "storyline" && scope.id === null)
    || (scope.kind === "dashboard" && scope.id !== null)) {
    throw new Error("Time cursor scope must identify a page, Storyline or dashboard.");
  }
  return scope;
}

export function validateCursorWindow(window) {
  if (window === null) return window;
  if (!window || typeof window !== "object" || Array.isArray(window)
    || Object.keys(window).some(key => !["start", "end"].includes(key))
    || !isCanonicalUtcInstant(window.start) || !isCanonicalUtcInstant(window.end)
    || Date.parse(window.end) < Date.parse(window.start)) {
    throw new Error("Time cursor window requires ordered canonical UTC instants.");
  }
  return window;
}

export function validateExerciseTime(value) {
  if (!isCanonicalUtcInstant(value)) throw new Error("Scenario exerciseTime must be a canonical UTC instant.");
  return value;
}

export function cursorFrameIndex(clock, epochMs) {
  if (!clock.length || !Number.isFinite(epochMs)) return 0;
  const after = lowerBound(clock, epochMs);
  if (after === 0) return 0;
  if (after === clock.length) return clock.length - 1;
  return epochMs - clock[after - 1] <= clock[after] - epochMs ? after - 1 : after;
}

/** Derived clocks stay on actions, never in durable or session cursor state. */
export function reduceTimeCursorState(state, action) {
  const cursor = state.cursor ?? INITIAL_TIME_CURSOR;
  if (action.type === "cursorLive") return update(state, { ...cursor, mode: "live", epochMs: null }, { playing: false });
  if (action.type === "cursorScope") {
    validateCursorScope(action.scope);
    const clock = checkedClock(action.clock);
    const epochMs = cursor.mode === "at" && Number.isFinite(cursor.epochMs) && clock.length
      ? clock[cursorFrameIndex(clock, cursor.epochMs)] : null;
    return update(state, { ...cursor, scope: { ...action.scope }, epochMs }, { playing: false });
  }
  if (action.type === "cursorWindow") {
    validateCursorWindow(action.window);
    return update(state, { ...cursor, window: action.window && { ...action.window },
      epochMs: Number.isFinite(cursor.epochMs) ? withinWindow(cursor.epochMs, action.window) : null }, { playing: false });
  }
  if (action.type === "cursorSeek") {
    validEpoch(action.epochMs);
    const clock = checkedClock(action.clock);
    const epochMs = withinWindow(action.epochMs, cursor.window);
    return update(state, { ...cursor, mode: "at", epochMs }, { playing: false, activeIndex: cursorFrameIndex(clock, epochMs), frameIndex: cursorFrameIndex(clock, epochMs) });
  }
  if (!["cursorStep", "cursorPlay", "cursorTick", "cursorReconcile"].includes(action.type)) return state;
  const clock = checkedClock(action.clock);
  if (!clock.length) return update(state, { ...cursor, epochMs: null }, { playing: false, activeIndex: 0, frameIndex: 0 });
  const reference = cursor.mode === "at" && Number.isFinite(cursor.epochMs)
    ? cursor.epochMs : action.liveEpochMs ?? clock.at(-1);
  validEpoch(reference);
  if (action.type === "cursorReconcile") {
    if (cursor.mode === "live") return state;
    const epochMs = Math.max(clock[0], Math.min(clock.at(-1), withinWindow(reference, cursor.window)));
    return update(state, { ...cursor, epochMs }, { playing: state.playing && epochMs < clock.at(-1), activeIndex: cursorFrameIndex(clock, epochMs), frameIndex: cursorFrameIndex(clock, epochMs) });
  }
  if (action.type === "cursorTick" && state.playing !== true) return state;
  let epochMs;
  if (action.type === "cursorPlay") {
    epochMs = Math.max(clock[0], Math.min(clock.at(-1), withinWindow(reference, cursor.window)));
  } else {
    const direction = action.type === "cursorTick" ? 1 : action.direction;
    if (direction !== -1 && direction !== 1) throw new Error("Time cursor step direction must be -1 or 1.");
    const index = direction === -1 ? lowerBound(clock, reference) - 1 : upperBound(clock, reference);
    epochMs = clock[Math.max(0, Math.min(clock.length - 1, index))];
  }
  const playing = action.type === "cursorStep" ? false
    : epochMs < clock.at(-1) && state.blackoutActive !== true && state.connection !== "lost"
      && !(action.automatic === true && state.reducedMotion === true);
  return update(state, { ...cursor, mode: "at", epochMs }, { playing, activeIndex: cursorFrameIndex(clock, epochMs), frameIndex: cursorFrameIndex(clock, epochMs) });
}

function update(state, cursor, fields) {
  const current = state.cursor;
  const sameCursor = current?.mode === cursor.mode && current?.epochMs === cursor.epochMs
    && current.scope.kind === cursor.scope.kind && current.scope.id === cursor.scope.id
    && current.window?.start === cursor.window?.start && current.window?.end === cursor.window?.end;
  return sameCursor && Object.entries(fields).every(([key, value]) => Object.is(state[key], value))
    ? state : { ...state, ...fields, cursor };
}
function validEpoch(value) {
  if (!Number.isSafeInteger(value) || !Number.isFinite(new Date(value).valueOf())) throw new Error("Time cursor instant must be a valid epoch millisecond.");
}
function checkedClock(clock = []) {
  if (!Array.isArray(clock)) throw new Error("Time cursor clock must be an ordered array.");
  let previous = -Infinity;
  for (const epoch of clock) { validEpoch(epoch); if (epoch <= previous) throw new Error("Time cursor clock must be unique and ordered."); previous = epoch; }
  return clock;
}
function withinWindow(epoch, window) {
  return window ? Math.max(Date.parse(window.start), Math.min(Date.parse(window.end), epoch)) : epoch;
}
function lowerBound(clock, epoch) {
  let left = 0, right = clock.length;
  while (left < right) { const mid = (left + right) >>> 1; if (clock[mid] < epoch) left = mid + 1; else right = mid; }
  return left;
}
function upperBound(clock, epoch) {
  let left = 0, right = clock.length;
  while (left < right) { const mid = (left + right) >>> 1; if (clock[mid] <= epoch) left = mid + 1; else right = mid; }
  return left;
}
