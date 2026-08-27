import {
  parsePresentationMessage,
  presentationChannelName,
  presentationRejectionReason,
} from "./presentationProtocol.js";

const END_EFFECTS = Object.freeze([
  "PUBLISH_ENDED",
  "REQUEST_AUDIENCE_CLOSE",
  "TERMINATE_CHANNEL",
]);

const GUARDED_SESSION_EVENTS = new Set([
  "WINDOW_OPENED",
  "WINDOW_CLOSED",
  "CONNECTING",
  "CONNECTED",
  "CONNECTION_LOST",
  "RECONNECTING",
  "SNAPSHOT_ACCEPTED",
  "SNAPSHOT_REJECTED",
  "TICK",
  "EFFECTS_CONSUMED",
  "AUDIENCE_CLOSE_SUCCEEDED",
  "AUDIENCE_CLOSE_DENIED",
]);

export function createInitialPresentationSession() {
  return sessionState({
    sessionId: null,
    requestedWindowName: null,
    lifecycle: "ended",
    window: "closed",
    closeOutcome: "not-requested",
    connection: "terminated",
    output: "ended",
    playback: "paused",
    blackout: false,
    source: null,
    frameIndex: 0,
    traceMode: "reveal",
    lastValidSnapshot: null,
    channelGeneration: 0,
    acceptsSessionEvents: false,
    effects: [],
    effectsVersion: 0,
    effectsConsumedVersion: 0,
    pendingRequest: null,
    rejectionReason: null,
    preBlackoutOutput: "holding",
    allocatedSessionIds: [],
    allocatedWindowNames: [],
    sourcePositions: {},
  });
}

export function reducePresentationSession(state, action, context = {}) {
  assertRecord(state, "Presentation session state");
  assertRecord(action, "Presentation session action");

  if (action.type === "OPEN_NEW_SESSION") {
    return canOpenNewSession(state) ? openNewSession(state, action) : state;
  }

  if (GUARDED_SESSION_EVENTS.has(action.type) && !matchesActiveGeneration(state, action)) {
    return state;
  }

  if (state.lifecycle === "ended") {
    if (action.type === "AUDIENCE_CLOSE_SUCCEEDED") {
      return sessionState({ ...state, window: "closed", closeOutcome: "succeeded" });
    }
    if (action.type === "AUDIENCE_CLOSE_DENIED" && action.surfaceRemains === true) {
      return sessionState({
        ...state,
        window: "open",
        closeOutcome: "denied-surface-remains",
      });
    }
    if (
      action.type === "EFFECTS_CONSUMED"
      && action.effectsVersion === state.effectsVersion
      && state.effectsConsumedVersion < state.effectsVersion
    ) {
      return sessionState({
        ...state,
        effects: [],
        effectsConsumedVersion: state.effectsVersion,
      });
    }
    return state;
  }

  switch (action.type) {
    case "WINDOW_OPENED":
      return pause(state, { window: "open" });
    case "WINDOW_CLOSED":
      return pause(state, { window: "closed", connection: "disconnected" });
    case "CONNECTING":
      return pause(state, { connection: "connecting" });
    case "CONNECTED":
      return pause(state, {
        window: "open",
        connection: "connected",
      });
    case "CONNECTION_LOST":
      return pause(state, { connection: "disconnected" });
    case "RECONNECTING":
      return pause(state, { window: "open", connection: "reconnecting" });
    case "SNAPSHOT_ACCEPTED":
      return acceptSnapshot(state, action.message, context);
    case "SNAPSHOT_REJECTED":
      return rejectSnapshot(state, action.reason);
    case "PLAY":
      return play(state);
    case "PAUSE":
      return pause(state);
    case "TICK":
      return tick(state);
    case "SEEK":
      return seek(state, action.frameIndex);
    case "PREVIOUS":
      return moveFrame(state, -1, action.type);
    case "NEXT":
      return moveFrame(state, 1, action.type);
    case "SELECT_SCENE":
      assertNonEmptyString(action.sceneId, "sceneId");
      return pause(state, {
        pendingRequest: requestWithRememberedFrame(
          state,
          { type: action.type, sceneId: action.sceneId },
          `scene:${action.sceneId}`,
        ),
        rejectionReason: null,
      });
    case "SELECT_CHRONO_GROUP":
      assertNonEmptyString(action.groupId, "groupId");
      return pause(state, {
        pendingRequest: requestWithRememberedFrame(
          state,
          { type: action.type, groupId: action.groupId },
          `group:${action.groupId}`,
        ),
        rejectionReason: null,
      });
    case "SET_TRACE_MODE":
      if (!new Set(["reveal", "full"]).has(action.mode)) {
        throw new TypeError("mode must be reveal or full");
      }
      return pause(state, {
        traceMode: action.mode,
        pendingRequest: { type: action.type, mode: action.mode },
      });
    case "SET_OUTPUT_MODE":
      if (!new Set(["holding", "blank", "active"]).has(action.mode)) {
        throw new TypeError("mode must be holding, blank, or active");
      }
      if (action.mode === "active" && !state.lastValidSnapshot) {
        return pause(state, {
          pendingRequest: null,
          rejectionReason: {
            code: "no_valid_snapshot",
            message: "Active output requires an accepted presentation snapshot.",
          },
        });
      }
      return pause(state, {
        output: action.mode,
        preBlackoutOutput: action.mode,
        pendingRequest: { type: action.type, mode: action.mode },
      });
    case "SET_COMPOSITION":
      assertRecord(action.composition, "composition");
      return pause(state, {
        pendingRequest: {
          type: action.type,
          composition: structuredClone(action.composition),
        },
      });
    case "SET_BLACKOUT":
      if (typeof action.active !== "boolean") {
        throw new TypeError("active must be a boolean");
      }
      return setBlackout(state, action.active);
    case "DOCUMENT_HIDDEN":
    case "MODE_EXIT":
      return pause(state);
    case "END":
      return sessionState({
        ...state,
        lifecycle: "ended",
        window: "closing",
        closeOutcome: "requested",
        connection: "terminated",
        output: "ended",
        playback: "paused",
        blackout: false,
        acceptsSessionEvents: false,
        effects: END_EFFECTS,
        effectsVersion: state.effectsVersion + 1,
        pendingRequest: null,
      });
    default:
      return state;
  }
}

function openNewSession(state, action) {
  assertNonEmptyString(action.sessionId, "sessionId");
  presentationChannelName(action.sessionId);
  assertNonEmptyString(action.requestedWindowName, "requestedWindowName");
  if (state.allocatedSessionIds.includes(action.sessionId)) {
    throw new Error("sessionId must be unique across presentation sessions");
  }
  if (state.allocatedWindowNames.includes(action.requestedWindowName)) {
    throw new Error("requestedWindowName must be unique across presentation sessions");
  }

  const channelGeneration = action.channelGeneration
    ?? state.channelGeneration + 1;
  if (
    !Number.isSafeInteger(channelGeneration)
    || channelGeneration <= state.channelGeneration
  ) {
    throw new RangeError("channelGeneration must be newer than the previous generation");
  }

  return sessionState({
    sessionId: action.sessionId,
    requestedWindowName: action.requestedWindowName,
    lifecycle: "waiting",
    window: "opening",
    closeOutcome: "not-requested",
    connection: "connecting",
    output: "holding",
    playback: "paused",
    blackout: false,
    source: null,
    frameIndex: 0,
    traceMode: "reveal",
    lastValidSnapshot: null,
    channelGeneration,
    acceptsSessionEvents: true,
    effects: [],
    effectsVersion: state.effectsVersion,
    effectsConsumedVersion: state.effectsConsumedVersion,
    pendingRequest: null,
    rejectionReason: null,
    preBlackoutOutput: "holding",
    allocatedSessionIds: [...state.allocatedSessionIds, action.sessionId],
    allocatedWindowNames: [
      ...state.allocatedWindowNames,
      action.requestedWindowName,
    ],
    sourcePositions: {},
  });
}

function acceptSnapshot(state, message, context) {
  try {
    if (!context.presentableItemIndex?.get) {
      return pause(state, {
        pendingRequest: null,
        rejectionReason: {
          code: "presentable_item_index_required",
          message: "Accepted snapshots require the trusted presentable item index.",
        },
      });
    }
    const accepted = parsePresentationMessage(message, {
      sessionId: state.sessionId,
      presentableItemIndex: context.presentableItemIndex,
    });
    if (accepted.type !== "state") {
      return pause(state, { rejectionReason: "snapshot-must-be-state" });
    }
    const snapshot = deepFreeze(accepted.payload);
    return sessionState({
      ...state,
      lifecycle: "live",
      output: snapshot.output_mode,
      playback: "paused",
      blackout: snapshot.blackout,
      source: deepFreeze(structuredClone(snapshot.source)),
      frameIndex: snapshot.timeline?.frame_index ?? 0,
      traceMode: snapshot.timeline?.trace_mode ?? state.traceMode,
      lastValidSnapshot: snapshot,
      pendingRequest: null,
      rejectionReason: null,
      preBlackoutOutput: snapshot.output_mode,
      sourcePositions: rememberSourcePosition(
        state.sourcePositions,
        snapshot.source,
        snapshot.timeline?.frame_index,
      ),
    });
  } catch (error) {
    return pause(state, {
      pendingRequest: null,
      rejectionReason: presentationRejectionReason(error),
    });
  }
}

function play(state) {
  if (
    state.lifecycle !== "live"
    || state.connection !== "connected"
    || state.blackout
    || state.output !== "active"
  ) {
    return pause(state);
  }
  const frameCount = timelineFrameCount(state);
  if (frameCount === 0) return pause(state);
  if (state.frameIndex >= frameCount - 1) {
    return sessionState({ ...state, playback: "at-end" });
  }
  return sessionState({ ...state, playback: "playing" });
}

function tick(state) {
  if (state.playback !== "playing") return state;
  const frameCount = timelineFrameCount(state);
  if (frameCount === 0 || state.frameIndex >= frameCount - 1) {
    return sessionState({ ...state, playback: "at-end" });
  }
  const frameIndex = state.frameIndex + 1;
  return sessionState({
    ...state,
    frameIndex,
    playback: frameIndex === frameCount - 1 ? "at-end" : "playing",
    pendingRequest: { type: "TICK", frameIndex },
  });
}

function seek(state, frameIndex) {
  const frameCount = timelineFrameCount(state);
  if (!Number.isSafeInteger(frameIndex) || frameIndex < 0 || frameIndex >= frameCount) {
    return pause(state, { rejectionReason: "seek-out-of-bounds" });
  }
  return pause(state, {
    frameIndex,
    pendingRequest: { type: "SEEK", frameIndex },
    rejectionReason: null,
  });
}

function moveFrame(state, offset, type) {
  const frameCount = timelineFrameCount(state);
  if (frameCount === 0) return pause(state);
  const frameIndex = Math.max(0, Math.min(frameCount - 1, state.frameIndex + offset));
  return pause(state, {
    frameIndex,
    pendingRequest: { type, frameIndex },
  });
}

function setBlackout(state, active) {
  if (active) {
    return pause(state, {
      blackout: true,
      preBlackoutOutput: state.blackout ? state.preBlackoutOutput : state.output,
      pendingRequest: { type: "SET_BLACKOUT", active: true },
    });
  }
  return pause(state, {
    blackout: false,
    output: state.preBlackoutOutput,
    pendingRequest: { type: "SET_BLACKOUT", active: false },
  });
}

function pause(state, changes = {}) {
  return sessionState({ ...state, ...changes, playback: "paused" });
}

function timelineFrameCount(state) {
  return state.lastValidSnapshot?.timeline?.frame_epochs?.length ?? 0;
}

function matchesActiveGeneration(state, action) {
  return (
    action.sessionId === state.sessionId
    && action.channelGeneration === state.channelGeneration
  );
}

function canOpenNewSession(state) {
  return (
    state.lifecycle === "ended"
    && state.effects.length === 0
    && state.effectsConsumedVersion === state.effectsVersion
  );
}

function rejectSnapshot(state, reason) {
  const snapshot = state.lastValidSnapshot;
  return pause(state, {
    pendingRequest: null,
    rejectionReason: normalizeRejectionReason(reason),
    ...(snapshot ? {
      frameIndex: snapshot.timeline?.frame_index ?? 0,
      traceMode: snapshot.timeline?.trace_mode ?? state.traceMode,
      output: snapshot.output_mode,
      source: deepFreeze(structuredClone(snapshot.source)),
      preBlackoutOutput: snapshot.output_mode,
    } : {}),
  });
}

function requestWithRememberedFrame(state, request, sourceKey) {
  const frameIndex = state.sourcePositions[sourceKey];
  return Number.isSafeInteger(frameIndex) ? { ...request, frameIndex } : request;
}

function rememberSourcePosition(sourcePositions, source, frameIndex) {
  const key = presentationSourceKey(source);
  if (!key || !Number.isSafeInteger(frameIndex) || frameIndex < 0) {
    return sourcePositions;
  }
  return { ...sourcePositions, [key]: frameIndex };
}

function presentationSourceKey(source) {
  if (source?.kind === "scene") return `scene:${source.scene_id}`;
  if (source?.kind === "Chrono Group") return `group:${source.chrono_group_id}`;
  return null;
}

function normalizeRejectionReason(reason) {
  if (
    reason
    && typeof reason === "object"
    && !Array.isArray(reason)
    && typeof reason.code === "string"
    && typeof reason.message === "string"
  ) {
    return structuredClone(reason);
  }
  return {
    code: "snapshot_rejected",
    message: typeof reason === "string" ? reason : "Presentation snapshot was rejected.",
  };
}

function sessionState(value) {
  return Object.freeze({
    ...value,
    effects: Object.freeze([...value.effects]),
    pendingRequest: value.pendingRequest == null
      ? null
      : deepFreeze(structuredClone(value.pendingRequest)),
    allocatedSessionIds: Object.freeze([...value.allocatedSessionIds]),
    allocatedWindowNames: Object.freeze([...value.allocatedWindowNames]),
    sourcePositions: Object.freeze({ ...value.sourcePositions }),
    rejectionReason: value.rejectionReason == null
      ? null
      : deepFreeze(structuredClone(value.rejectionReason)),
  });
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function assertRecord(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
}

function assertNonEmptyString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${label} must be a non-empty string`);
  }
}
