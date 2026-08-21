import React from "react";

import {
  buildTimeGroupClock,
  validateTimeSyncGroups,
} from "../../charting/time/timeSyncModel.js";
import {
  initialPlaybackState,
  reducePlaybackState,
} from "../../charting/time/playbackReducer.js";

const PlaybackContext = React.createContext(null);
const EMPTY_ARRAY = Object.freeze([]);
const MAX_STATUS_LENGTH = 240;

export function PlaybackProvider({
  groups = EMPTY_ARRAY,
  scenes = EMPTY_ARRAY,
  charts = EMPTY_ARRAY,
  loadedData = {},
  profiles = {},
  initialState,
  initialPosition = "earliest",
  timezone = "UTC",
  children,
}) {
  const temporalContext = React.useMemo(() => ({
    charts,
    loadedData,
    profiles,
    timezone,
  }), [charts, loadedData, profiles, timezone]);
  const validatedGroups = React.useMemo(() => {
    validateTimeSyncGroups(groups, temporalContext);
    return groups;
  }, [groups, temporalContext]);
  const [state, baseDispatch] = React.useReducer(
    reducePlaybackState,
    {
      groups: validatedGroups,
      scenes,
      charts,
      initialState,
      initialPosition,
      loadedData,
      profiles,
      timezone,
    },
    initializePlaybackState,
  );
  const dispatch = React.useCallback(
    (action) => dispatchPlaybackAction(baseDispatch, action, {
      groups: validatedGroups,
      scenes,
      activeGroupId: state.activeGroupId,
    }),
    [baseDispatch, scenes, state.activeGroupId, validatedGroups],
  );
  const activeScene = React.useMemo(
    () => resolveActiveScene(scenes, state.activeSceneId),
    [scenes, state.activeSceneId],
  );
  const activeGroup = React.useMemo(
    () => resolveActiveGroup(
      validatedGroups,
      activeScene?.groupId ?? state.activeGroupId,
    ),
    [activeScene, validatedGroups, state.activeGroupId],
  );
  const groupClock = React.useMemo(
    () => buildTimeGroupClock(activeGroup, temporalContext),
    [activeGroup, temporalContext],
  );
  const clock = React.useMemo(
    () => activeScene
      ? buildScenePlaybackClock(activeScene, groupClock)
      : groupClock,
    [activeScene, groupClock],
  );
  const activeIndex = clock.length === 0
    ? 0
    : Math.min(clock.length - 1, Math.max(0, state.activeIndex));
  const activeEpochMs = clock[activeIndex] ?? null;
  const canAdvance = (
    state.playbackView === true
    && clock.length > 1
    && activeIndex < clock.length - 1
  );
  const playing = state.playing === true && canAdvance;
  const participatingMembers = React.useMemo(
    () => selectParticipatingMembers(activeGroup, activeScene, state.scope),
    [activeGroup, activeScene, state.scope],
  );
  const participatingChartIds = React.useMemo(
    () => Object.freeze(participatingMembers.map(({ chartId }) => chartId)),
    [participatingMembers],
  );
  const memberTimeContexts = React.useMemo(
    () => buildMemberTimeContexts(
      activeGroup ? { ...activeGroup, members: participatingMembers } : null,
      activeEpochMs,
      {
        scene: activeScene,
        sessionMatchingOverride: state.matchingOverride,
        traceMode: state.traceMode,
      },
    ),
    [activeEpochMs, activeGroup, activeScene, participatingMembers, state.matchingOverride, state.traceMode],
  );
  const timeContextForChart = React.useCallback(
    (chartId) => state.playbackView === true
      ? memberTimeContexts[chartId] ?? null
      : null,
    [memberTimeContexts, state.playbackView],
  );

  React.useEffect(() => {
    const groupId = activeGroup?.id ?? null;
    if (state.activeGroupId !== groupId) {
      dispatch({ type: "setGroup", groupId });
    }
  }, [activeGroup, state.activeGroupId]);

  React.useEffect(() => {
    if (state.playing === true && !canAdvance) {
      dispatch({ type: "pause" });
    }
  }, [canAdvance, state.playing]);

  React.useEffect(() => createPlaybackTimer({
    playing,
    playbackView: state.playbackView,
    clockLength: clock.length,
    speed: state.speed,
    activeIndex,
    dispatch,
  }), [
    playing,
    state.playbackView,
    state.speed,
    activeGroup?.id,
    clock,
    activeIndex,
  ]);

  const value = React.useMemo(() => Object.freeze({
    activeEpochMs,
    activeGroup,
    activeGroupId: activeGroup?.id ?? null,
    activeScene,
    activeSceneId: activeScene?.id ?? null,
    activeIndex,
    availabilityVisible: state.availabilityVisible,
    charts,
    clock,
    connection: state.connection,
    dispatch,
    groups: validatedGroups,
    loadedData,
    matchingOverride: state.matchingOverride,
    participatingChartIds,
    placement: state.placement,
    playbackView: state.playbackView,
    playing,
    profiles,
    scenes,
    scope: state.scope,
    source: state.source,
    speed: state.speed,
    traceMode: state.traceMode,
    status: playbackStatus(activeGroup, clock, activeEpochMs),
    timeContext: state.playbackView === true
      && activeGroup
      && activeEpochMs !== null
      ? Object.freeze({ groupId: activeGroup.id, activeEpochMs })
      : null,
    timeContextForChart,
  }), [
    activeEpochMs,
    activeGroup,
    activeScene,
    activeIndex,
    charts,
    clock,
    loadedData,
    participatingChartIds,
    profiles,
    scenes,
    state.availabilityVisible,
    state.connection,
    state.matchingOverride,
    state.placement,
    state.playbackView,
    state.scope,
    state.source,
    state.traceMode,
    playing,
    state.speed,
    timeContextForChart,
    validatedGroups,
  ]);

  return React.createElement(PlaybackContext.Provider, { value }, children);
}

export function usePlayback() {
  const playback = React.useContext(PlaybackContext);
  if (playback === null) {
    throw new Error("usePlayback must be used within a PlaybackProvider.");
  }
  return playback;
}

export function useOptionalPlayback() {
  return React.useContext(PlaybackContext);
}

export function prefersReducedMotion(
  matchMedia = typeof window === "undefined" ? null : window.matchMedia?.bind(window),
) {
  return matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
}

export function createPlaybackTimer({
  playing,
  playbackView,
  clockLength,
  speed,
  activeIndex,
  dispatch,
  documentTarget = typeof document === "undefined" ? null : document,
  scheduler = typeof window === "undefined" ? globalThis : window,
}) {
  if (
    playing !== true
    || playbackView !== true
    || !Number.isInteger(clockLength)
    || clockLength <= 0
    || !Number.isInteger(activeIndex)
    || activeIndex >= clockLength - 1
    || !Number.isFinite(speed)
    || speed <= 0
    || typeof dispatch !== "function"
    || typeof scheduler?.setInterval !== "function"
  ) {
    return () => {};
  }
  if (documentTarget?.hidden === true) {
    dispatch({ type: "pause" });
    return () => {};
  }

  let intervalId = scheduler.setInterval(
    () => dispatch({ type: "tick", clockLength }),
    1_000 * speed,
  );
  const clearTimer = () => {
    if (intervalId === null) return;
    scheduler.clearInterval?.(intervalId);
    intervalId = null;
  };
  const handleVisibilityChange = () => {
    if (documentTarget?.hidden !== true) return;
    clearTimer();
    dispatch({ type: "pause" });
  };

  documentTarget?.addEventListener?.("visibilitychange", handleVisibilityChange);

  return () => {
    clearTimer();
    documentTarget?.removeEventListener?.(
      "visibilitychange",
      handleVisibilityChange,
    );
  };
}

export function buildMemberTimeContexts(group, activeEpochMs, {
  scene = null,
  sessionMatchingOverride = "authored",
  traceMode,
} = {}) {
  const contexts = Object.create(null);
  if (!group || !Number.isFinite(activeEpochMs)) return Object.freeze(contexts);
  for (const member of group.members) {
    const sceneMember = scene?.members?.find(({ chartId }) => chartId === member.chartId);
    const sourceMatching = sessionMatchingPolicy(sessionMatchingOverride)
      ?? sceneMember?.matching
      ?? member.matching
      ?? group.matching;
    const matching = Object.freeze({
      policy: sourceMatching?.policy ?? sourceMatching,
      ...(sourceMatching.toleranceMs === undefined
        ? {}
        : { toleranceMs: sourceMatching.toleranceMs }),
    });
    contexts[member.chartId] = Object.freeze({
      groupId: group.id,
      activeEpochMs,
      matching,
      ...(traceMode === undefined ? {} : { traceMode }),
      ...(scene ? { sceneId: scene.id } : {}),
    });
  }
  return Object.freeze(contexts);
}

export function dispatchPlaybackAction(
  baseDispatch,
  action,
  { groups = EMPTY_ARRAY, scenes = EMPTY_ARRAY, activeGroupId = null } = {},
) {
  if (typeof baseDispatch !== "function") {
    throw new TypeError("Playback dispatch must be a function.");
  }
  baseDispatch(action);
  if (action?.type === "setGroup") {
    if (action.groupId === activeGroupId) return;
    const selectedGroup = groups.find(({ id }) => id === action.groupId);
    if (!selectedGroup) return;
    baseDispatch({ type: "setSpeed", speed: selectedGroup.secondsPerFrame });
    return;
  }
  if (action?.type !== "setScene") return;
  const selectedScene = scenes.find(({ id }) => id === action.sceneId);
  const selectedGroup = groups.find(({ id }) => id === selectedScene?.groupId);
  if (!selectedScene || !selectedGroup) return;
  baseDispatch({
    type: "setSpeed",
    speed: selectedScene.secondsPerFrame ?? selectedGroup.secondsPerFrame,
  });
}

function initializePlaybackState({
  groups,
  scenes,
  charts,
  initialState,
  initialPosition,
  loadedData,
  profiles,
  timezone,
}) {
  const supplied = initialState && typeof initialState === "object"
    ? initialState
    : {};
  const hasSuppliedGroup = Object.hasOwn(supplied, "activeGroupId");
  const activeGroupId = hasSuppliedGroup
    ? supplied.activeGroupId
    : groups[0]?.id ?? null;
  const activeGroup = resolveActiveGroup(groups, activeGroupId);
  const activeScene = resolveActiveScene(scenes, supplied.activeSceneId);
  const groupClock = buildTimeGroupClock(activeGroup, {
    charts,
    loadedData,
    profiles,
    timezone,
  });
  const clock = activeScene ? buildScenePlaybackClock(activeScene, groupClock) : groupClock;
  const hasSuppliedIndex = Object.hasOwn(supplied, "activeIndex");
  const hasSuppliedSpeed = Object.hasOwn(supplied, "speed");
  return {
    ...initialPlaybackState,
    ...supplied,
    activeGroupId,
    activeSceneId: activeScene?.id ?? null,
    activeIndex: hasSuppliedIndex
      ? supplied.activeIndex
      : initialPosition === "latest" && clock.length > 0
        ? clock.length - 1
        : 0,
    speed: hasSuppliedSpeed
      ? supplied.speed
      : activeScene?.secondsPerFrame
        ?? activeGroup?.secondsPerFrame
        ?? initialPlaybackState.speed,
  };
}

function resolveActiveGroup(groups, groupId) {
  if (groupId !== null) {
    const selected = groups.find((group) => group.id === groupId);
    if (selected) return selected;
  }
  return groups[0] ?? null;
}

function resolveActiveScene(scenes, sceneId) {
  if (!sceneId || !Array.isArray(scenes)) return null;
  return scenes.find((scene) => scene?.id === sceneId) ?? null;
}

export function buildScenePlaybackClock(scene, groupClock) {
  if (!scene || !Array.isArray(groupClock)) return Object.freeze([]);
  const start = Date.parse(scene.period?.start);
  const end = Date.parse(scene.period?.end);
  const withinPeriod = groupClock.filter((epochMs) => (
    (!Number.isFinite(start) || epochMs >= start)
    && (!Number.isFinite(end) || epochMs <= end)
  ));
  if (scene.frames?.mode !== "source" || scene.frames.selection !== "selected") {
    return Object.freeze(withinPeriod);
  }
  const available = new Set(withinPeriod);
  return Object.freeze((scene.frames.selectedEpochs ?? []).filter((epochMs) => available.has(epochMs)));
}

function selectParticipatingMembers(group, scene, scope) {
  if (!group) return EMPTY_ARRAY;
  if (scene) {
    const selected = new Set((scene.members ?? []).map(({ chartId }) => chartId));
    return Object.freeze(group.members.filter(({ chartId }) => selected.has(chartId)));
  }
  if (scope === "group-only" || scope === "all-page") return group.members;
  return group.members;
}

function sessionMatchingPolicy(value) {
  return ({
    concurrent: { policy: "exact" },
    interpolate: { policy: "interpolate" },
    latest: { policy: "lastKnown" },
    closest: { policy: "nearest" },
  })[value] ?? null;
}

function playbackStatus(group, clock, activeEpochMs) {
  if (!group) return "No playback group is available";
  if (clock.length === 0) return `No playback times are available for ${group.name}`;
  return boundedStatus(
    `${group.name}: ${canonicalTime(activeEpochMs)}`,
  );
}

function canonicalTime(epochMs) {
  if (!Number.isFinite(epochMs)) return "No time selected";
  const iso = new Date(epochMs).toISOString();
  return iso.endsWith("T00:00:00.000Z") ? iso.slice(0, 10) : iso;
}

function boundedStatus(message) {
  return message.length <= MAX_STATUS_LENGTH
    ? message
    : `${message.slice(0, MAX_STATUS_LENGTH - 1)}…`;
}
