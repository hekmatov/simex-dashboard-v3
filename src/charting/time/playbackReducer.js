export const initialPlaybackState = Object.freeze({
  activeGroupId: null,
  activeIndex: 0,
  playing: false,
  speed: 1,
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
      playing: (
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
      playing: false,
    });
  }
  if (action.type === "next") {
    const clockLength = validClockLength(action.clockLength);
    if (clockLength === 0) return emptyClockState(state);
    const activeIndex = clampStateIndex(state.activeIndex, clockLength);
    return withChanges(state, {
      activeIndex: Math.min(clockLength - 1, activeIndex + 1),
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
      playing: false,
    });
  }
  if (action.type === "tick") {
    return tick(state, validClockLength(action.clockLength));
  }
  if (action.type === "setSpeed") {
    if (![1, 2, 3].includes(action.speed)) {
      throw new RangeError("Playback speed must be 1, 2, or 3.");
    }
    return withChanges(state, { speed: action.speed });
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
      activeGroupId: action.groupId,
      activeIndex: 0,
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
    playing: nextIndex < clockLength - 1,
  });
}

function emptyClockState(state) {
  return withChanges(state, {
    activeIndex: 0,
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
