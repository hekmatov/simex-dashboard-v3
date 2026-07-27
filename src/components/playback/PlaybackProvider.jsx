import React from "react";

import {
  buildPrimaryClock,
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
  charts = EMPTY_ARRAY,
  loadedData = {},
  profiles = {},
  initialState,
  children,
}) {
  const validatedGroups = React.useMemo(() => {
    validateTimeSyncGroups(groups, { charts, loadedData, profiles });
    return groups;
  }, [groups, charts, loadedData, profiles]);
  const [state, dispatch] = React.useReducer(
    reducePlaybackState,
    { groups: validatedGroups, initialState },
    initializePlaybackState,
  );
  const activeGroup = React.useMemo(
    () => resolveActiveGroup(validatedGroups, state.activeGroupId),
    [validatedGroups, state.activeGroupId],
  );
  const clock = React.useMemo(
    () => buildPrimaryClock(activeGroup, loadedData, profiles),
    [activeGroup, loadedData, profiles],
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
  const memberTimeContexts = React.useMemo(
    () => buildMemberTimeContexts(activeGroup, activeEpochMs),
    [activeGroup, activeEpochMs],
  );
  const timeContextForChart = React.useCallback(
    (chartId) => memberTimeContexts[chartId] ?? null,
    [memberTimeContexts],
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
    activeIndex,
    charts,
    clock,
    dispatch,
    groups: validatedGroups,
    loadedData,
    playbackView: state.playbackView,
    playing,
    profiles,
    speed: state.speed,
    status: playbackStatus(activeGroup, clock, activeEpochMs),
    timeContext: activeGroup && activeEpochMs !== null
      ? Object.freeze({ groupId: activeGroup.id, activeEpochMs })
      : null,
    timeContextForChart,
  }), [
    activeEpochMs,
    activeGroup,
    activeIndex,
    charts,
    clock,
    loadedData,
    profiles,
    state.playbackView,
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
    || ![1, 2, 3].includes(speed)
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
    1_000 / speed,
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

function buildMemberTimeContexts(group, activeEpochMs) {
  const contexts = Object.create(null);
  if (!group || !Number.isFinite(activeEpochMs)) return Object.freeze(contexts);
  for (const member of group.members) {
    const sourceMatching = member.matching ?? group.matching;
    const matching = Object.freeze({
      policy: sourceMatching.policy,
      ...(sourceMatching.toleranceMs === undefined
        ? {}
        : { toleranceMs: sourceMatching.toleranceMs }),
    });
    contexts[member.chartId] = Object.freeze({
      groupId: group.id,
      activeEpochMs,
      matching,
    });
  }
  return Object.freeze(contexts);
}

function initializePlaybackState({ groups, initialState }) {
  const supplied = initialState && typeof initialState === "object"
    ? initialState
    : {};
  const hasSuppliedGroup = Object.hasOwn(supplied, "activeGroupId");
  return {
    ...initialPlaybackState,
    ...supplied,
    activeGroupId: hasSuppliedGroup
      ? supplied.activeGroupId
      : groups[0]?.id ?? null,
  };
}

function resolveActiveGroup(groups, groupId) {
  if (groupId !== null) {
    const selected = groups.find((group) => group.id === groupId);
    if (selected) return selected;
  }
  return groups[0] ?? null;
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
