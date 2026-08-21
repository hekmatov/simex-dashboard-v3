export const initialPlaybackState = Object.freeze({
  source: Object.freeze({ kind: "default", id: null }),
  scope: "all-page",
  frameIndex: 0,
  period: null,
  activeGroupId: null,
  activeSceneId: null,
  activeIndex: 0,
  playing: false,
  speed: 1,
  secondsPerFrame: 1,
  matchingOverride: "authored",
  traceMode: "reveal",
  availabilityVisible: false,
  placement: "deck",
  connection: "connected",
  blackoutActive: false,
  reducedMotion: false,
  playbackView: false,
});

/**
 * Pure synchronized-playback reducer.
 *
 * Unknown action types are identity no-ops so newer dispatchers remain
 * backward compatible. Invalid payloads for known actions fail closed.
 */
export function reducePlaybackState(state, action) {
  if (!isRecord(state)) {
    throw new TypeError("Playback state must be an object.");
  }
  if (!isRecord(action)) {
    throw new TypeError("Playback action must be an object.");
  }

  if (action.type === "play") {
    const clockLength = validClockLength(action.clockLength);
    if (clockLength === 0) return emptyClockState(state);
    const activeIndex = clampStateIndex(state.activeIndex, clockLength);
    return withChanges(state, {
      activeIndex,
      frameIndex: activeIndex,
      playing: (
        !(action.automatic === true && state.reducedMotion === true)
        &&
        state.playbackView === true
        && clockLength > 1
        && activeIndex < clockLength - 1
      ),
    });
  }
  if (action.type === "pause") {
    return withChanges(state, { playing: false });
  }
  if (action.type === "previous") {
    const clockLength = validClockLength(action.clockLength);
    if (clockLength === 0) return emptyClockState(state);
    const activeIndex = clampStateIndex(state.activeIndex, clockLength);
    return withChanges(state, {
      activeIndex: Math.max(0, activeIndex - 1),
      frameIndex: Math.max(0, activeIndex - 1),
      playing: false,
    });
  }
  if (action.type === "next") {
    const clockLength = validClockLength(action.clockLength);
    if (clockLength === 0) return emptyClockState(state);
    const activeIndex = clampStateIndex(state.activeIndex, clockLength);
    return withChanges(state, {
      activeIndex: Math.min(clockLength - 1, activeIndex + 1),
      frameIndex: Math.min(clockLength - 1, activeIndex + 1),
      playing: false,
    });
  }
  if (action.type === "seek") {
    const clockLength = validClockLength(action.clockLength);
    if (!Number.isInteger(action.index)) {
      throw new TypeError("Playback seek index must be an integer.");
    }
    if (clockLength === 0) return emptyClockState(state);
    return withChanges(state, {
      activeIndex: clamp(action.index, 0, clockLength - 1),
      frameIndex: clamp(action.index, 0, clockLength - 1),
      playing: false,
    });
  }
  if (action.type === "tick") {
    return tick(state, validClockLength(action.clockLength));
  }
  if (action.type === "setSpeed") {
    if (!Number.isFinite(action.speed) || action.speed <= 0) {
      throw new RangeError(
        "Playback seconds per frame must be a positive finite number.",
      );
    }
    return withChanges(state, {
      speed: action.speed,
      secondsPerFrame: action.speed,
      playing: false,
    });
  }
  if (action.type === "setGroup") {
    if (
      action.groupId !== null
      && (typeof action.groupId !== "string" || action.groupId.trim() === "")
    ) {
      throw new TypeError(
        "Playback groupId must be null or a non-empty string.",
      );
    }
    return withChanges(state, {
      source: action.groupId === null
        ? { kind: "default", id: null }
        : { kind: "group", id: action.groupId },
      activeGroupId: action.groupId,
      activeSceneId: null,
      activeIndex: 0,
      frameIndex: 0,
      period: action.period === undefined
        ? state.period
        : structuredClone(action.period),
      playing: false,
    });
  }
  if (action.type === "setScene") {
    if (
      action.sceneId !== null
      && (typeof action.sceneId !== "string" || action.sceneId.trim() === "")
    ) {
      throw new TypeError("Playback sceneId must be null or a non-empty string.");
    }
    return withChanges(state, {
      source: action.sceneId === null
        ? { kind: "default", id: null }
        : { kind: "scene", id: action.sceneId },
      activeSceneId: action.sceneId,
      activeIndex: 0,
      frameIndex: 0,
      period: action.period === undefined
        ? state.period
        : structuredClone(action.period),
      playing: false,
    });
  }
  if (action.type === "setScope") {
    if (!["all-page", "group-only"].includes(action.scope)) {
      throw new TypeError("Playback scope must be all-page or group-only.");
    }
    return withChanges(state, { scope: action.scope, playing: false });
  }
  if (action.type === "setMatchingOverride") {
    if (!["authored", "concurrent", "interpolate", "latest", "closest"].includes(action.policy)) {
      throw new TypeError("Playback matching override is invalid.");
    }
    return withChanges(state, {
      matchingOverride: action.policy,
      playing: false,
    });
  }
  if (action.type === "setTraceMode") {
    if (!["reveal", "full"].includes(action.mode)) {
      throw new TypeError("Playback trace mode must be reveal or full.");
    }
    return withChanges(state, { traceMode: action.mode, playing: false });
  }
  if (action.type === "toggleAvailability") {
    return withChanges(state, {
      availabilityVisible: !state.availabilityVisible,
    });
  }
  if (action.type === "moveController") {
    if (!["deck", "mast"].includes(action.placement)) {
      throw new TypeError("Chrono placement must be deck or mast.");
    }
    return withChanges(state, { placement: action.placement });
  }
  if (["navigate", "documentHidden", "modeExit"].includes(action.type)) {
    return withChanges(state, { playing: false });
  }
  if (action.type === "blackout") {
    if (typeof action.active !== "boolean") {
      throw new TypeError("Playback blackout state must be boolean.");
    }
    return withChanges(state, {
      blackoutActive: action.active,
      playing: action.active ? false : state.playing,
    });
  }
  if (action.type === "connectionLost") {
    return withChanges(state, { connection: "lost", playing: false });
  }
  if (action.type === "reconnected") {
    return withChanges(state, { connection: "connected", playing: false });
  }
  if (action.type === "end") {
    const clockLength = validClockLength(action.clockLength ?? 0);
    const finalIndex = clockLength > 0 ? clockLength - 1 : 0;
    return withChanges(state, {
      activeIndex: finalIndex,
      frameIndex: finalIndex,
      playing: false,
    });
  }
  if (action.type === "openView") {
    return withChanges(state, {
      playbackView: true,
      playing: false,
    });
  }
  if (action.type === "closeView") {
    return withChanges(state, {
      playbackView: false,
      playing: false,
    });
  }
  return state;
}

function tick(state, clockLength) {
  if (clockLength === 0) return emptyClockState(state);
  const activeIndex = clampStateIndex(state.activeIndex, clockLength);
  if (state.playing !== true || state.playbackView !== true) {
    return withChanges(state, {
      activeIndex,
      playing: false,
    });
  }
  if (activeIndex === clockLength - 1) {
    return withChanges(state, {
      activeIndex,
      playing: false,
    });
  }
  const nextIndex = activeIndex + 1;
  return withChanges(state, {
    activeIndex: nextIndex,
    frameIndex: nextIndex,
    playing: nextIndex < clockLength - 1,
  });
}

function emptyClockState(state) {
  return withChanges(state, {
    activeIndex: 0,
    frameIndex: 0,
    playing: false,
  });
}

function validClockLength(value) {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError("Playback clockLength must be a non-negative integer.");
  }
  return value;
}

function clampStateIndex(value, clockLength) {
  if (!Number.isInteger(value)) {
    throw new TypeError("Playback state activeIndex must be an integer.");
  }
  return clamp(value, 0, clockLength - 1);
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function withChanges(state, changes) {
  for (const [key, value] of Object.entries(changes)) {
    if (!Object.is(state[key], value)) return { ...state, ...changes };
  }
  return state;
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
