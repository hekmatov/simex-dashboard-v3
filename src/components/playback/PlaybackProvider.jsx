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

  React.useEffect(() => {
    const groupId = activeGroup?.id ?? null;
    if (state.activeGroupId !== groupId) {
      dispatch({ type: "setGroup", groupId });
    }
  }, [activeGroup, state.activeGroupId]);

  React.useEffect(() => createPlaybackTimer({
    playing: state.playing,
    playbackView: state.playbackView,
    clockLength: clock.length,
    speed: state.speed,
    activeIndex,
    dispatch,
  }), [
    state.playing,
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
    playing: state.playing,
    profiles,
    speed: state.speed,
    status: playbackStatus(activeGroup, clock, activeEpochMs),
    timeContext: activeGroup && activeEpochMs !== null
      ? Object.freeze({ groupId: activeGroup.id, activeEpochMs })
      : null,
  }), [
    activeEpochMs,
    activeGroup,
    activeIndex,
    charts,
    clock,
    loadedData,
    profiles,
    state.playbackView,
    state.playing,
    state.speed,
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
    || documentTarget?.hidden === true
  ) {
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
