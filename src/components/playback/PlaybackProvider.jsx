import React from "react";

import {
  buildChronoGroupClock,
  validateChronoGroups,
} from "../../charting/time/chronoGroupModel.js";
import {
  initialPlaybackState,
  reducePlaybackState,
} from "../../charting/time/playbackReducer.js";
import {
  buildDefaultChronoLedger,
  buildSceneFrameLedger,
} from "../../charting/time/frameLedger.js";
import { buildFrameAvailabilityEvidence } from "./playbackAvailability.js";

const PlaybackContext = React.createContext(null);
const EMPTY_ARRAY = Object.freeze([]);
const MAX_STATUS_LENGTH = 240;

export function PlaybackProvider({
  groups = EMPTY_ARRAY,
  scenes = EMPTY_ARRAY,
  charts = EMPTY_ARRAY,
  pageCharts = null,
  loadedData = {},
  profiles = {},
  preferredGroupId = null,
  initialState,
  initialPosition = "earliest",
  timezone = "UTC",
  children,
}) {
  const playbackSafetyGatesRef = React.useRef(new Map());
  const playableScenes = React.useMemo(() => selectPlayableScenes(scenes), [scenes]);
  const activePageCharts = pageCharts ?? charts;
  const temporalContext = React.useMemo(() => ({
    charts,
    loadedData,
    profiles,
    timezone,
  }), [charts, loadedData, profiles, timezone]);
  const [state, baseDispatch] = React.useReducer(
    reducePlaybackState,
    {
      groups,
      scenes,
      charts,
      pageCharts: activePageCharts,
      initialState,
      initialPosition,
      loadedData,
      profiles,
      preferredGroupId,
      timezone,
    },
    initializePlaybackState,
  );
  const activeScene = React.useMemo(
    () => resolveActiveScene(playableScenes, state.activeSceneId),
    [playableScenes, state.activeSceneId],
  );
  const validatedGroups = React.useMemo(() => {
    if (state.playbackView !== true) return groups;
    const selectedGroup = resolveActiveGroup(
      groups,
      activeScene?.chronoGroupId ?? state.activeGroupId,
    );
    if (state.source?.kind !== "default" || activeScene || selectedGroup) {
      validateChronoGroups(selectedGroup ? [selectedGroup] : EMPTY_ARRAY, temporalContext);
    }
    return groups;
  }, [activeScene, groups, state.activeGroupId, state.playbackView, state.source?.kind, temporalContext]);
  const dispatch = React.useCallback(
    (action) => {
      if (
        ["play", "tick"].includes(action?.type)
        && [...playbackSafetyGatesRef.current.values()].some((allowed) => allowed !== true)
      ) {
        baseDispatch({ type: "pause" });
        return false;
      }
      dispatchPlaybackAction(baseDispatch, action, {
        groups: validatedGroups,
        scenes: playableScenes,
        activeGroupId: state.activeGroupId,
      });
      return true;
    },
    [baseDispatch, playableScenes, state.activeGroupId, validatedGroups],
  );
  const setPlaybackSafety = React.useCallback((owner, allowed) => {
    if (typeof owner !== "string" || owner.trim() === "") {
      throw new TypeError("Playback safety owner must be a non-empty string.");
    }
    if (allowed === true) playbackSafetyGatesRef.current.delete(owner);
    else playbackSafetyGatesRef.current.set(owner, false);
    if (allowed !== true) baseDispatch({ type: "pause" });
  }, [baseDispatch]);
  const releasePlaybackSafety = React.useCallback((owner) => {
    playbackSafetyGatesRef.current.delete(owner);
  }, []);
  React.useEffect(() => {
    if (activeScene || groups.length === 0) return;
    if (groups.some(({ id }) => id === state.activeGroupId)) return;
    const firstGroup = preferredGroupId
      ? groups.find(({ id }) => id === preferredGroupId)
      : groups[0];
    if (!firstGroup) return;
    dispatch({
      type: "setGroup",
      groupId: firstGroup.id,
      period: firstGroup.period,
    });
  }, [activeScene, dispatch, groups, preferredGroupId, state.activeGroupId]);
  const selectedGroup = React.useMemo(
    () => resolveActiveGroup(
      validatedGroups,
      activeScene?.chronoGroupId ?? state.activeGroupId,
    ),
    [activeScene, validatedGroups, state.activeGroupId],
  );
  const usingDefaultPage = (
    state.source?.kind === "default"
    && !activeScene
    && !selectedGroup
  );
  const defaultPagePlayback = React.useMemo(
    () => state.playbackView === true && usingDefaultPage
      ? buildDefaultPagePlayback(activePageCharts, temporalContext)
      : emptyDefaultPagePlayback(activePageCharts),
    [activePageCharts, state.playbackView, temporalContext, usingDefaultPage],
  );
  const activeGroup = usingDefaultPage ? defaultPagePlayback.group : selectedGroup;
  const groupClock = React.useMemo(
    () => state.playbackView !== true
      ? EMPTY_ARRAY
      : usingDefaultPage
      ? defaultPagePlayback.clock
      : buildChronoGroupClock(selectedGroup, temporalContext),
    [defaultPagePlayback, selectedGroup, state.playbackView, temporalContext, usingDefaultPage],
  );
  const clock = React.useMemo(
    () => activeScene
      ? buildScenePlaybackClock(activeScene, groupClock, {
          group: selectedGroup,
          temporalContext,
        })
      : groupClock,
    [activeScene, groupClock, selectedGroup, temporalContext],
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
    () => selectParticipatingMembers(activeGroup, activeScene, activePageCharts),
    [activeGroup, activePageCharts, activeScene],
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
        frameIndex: activeIndex,
        sessionMatchingOverride: state.matchingOverride,
        traceMode: state.traceMode,
      },
    ),
    [activeEpochMs, activeGroup, activeIndex, activeScene, participatingMembers, state.matchingOverride, state.traceMode],
  );
  const timeContextForChart = React.useCallback(
    (chartId) => state.playbackView === true
      ? memberTimeContexts[chartId] ?? null
      : null,
    [memberTimeContexts, state.playbackView],
  );
  const frameAvailability = React.useMemo(
    () => state.playbackView === true && state.availabilityVisible === true
      ? buildFrameAvailabilityEvidence({
          activeEpochMs,
          clock,
          group: activeGroup,
          members: participatingMembers,
          charts: activePageCharts,
          loadedData,
          profiles,
          contexts: memberTimeContexts,
          timezone,
        })
      : EMPTY_ARRAY,
    [activeEpochMs, activeGroup, activePageCharts, clock, loadedData, memberTimeContexts, participatingMembers, profiles, state.availabilityVisible, state.playbackView, timezone],
  );
  const frameAvailabilityByChartId = React.useMemo(
    () => Object.freeze(Object.fromEntries(frameAvailability.map((entry) => [entry.chartId, entry]))),
    [frameAvailability],
  );

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
    frameAvailability,
    frameAvailabilityByChartId,
    groups: validatedGroups,
    loadedData,
    matchingOverride: state.matchingOverride,
    participatingChartIds,
    placement: state.placement,
    playbackView: state.playbackView,
    playing,
    profiles,
    scenes: playableScenes,
    setPlaybackSafety,
    scope: state.scope,
    source: state.source,
    speed: state.speed,
    traceMode: state.traceMode,
    status: playbackStatus(activeGroup, clock, activeEpochMs),
    releasePlaybackSafety,
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
    frameAvailability,
    frameAvailabilityByChartId,
    loadedData,
    participatingChartIds,
    profiles,
    releasePlaybackSafety,
    playableScenes,
    setPlaybackSafety,
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
  frameIndex,
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
      ...(Number.isSafeInteger(frameIndex) ? { frameIndex } : {}),
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
  const selectedGroup = groups.find(({ id }) => id === selectedScene?.chronoGroupId);
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
  pageCharts,
  initialState,
  initialPosition,
  loadedData,
  profiles,
  preferredGroupId,
  timezone,
}) {
  scenes = selectPlayableScenes(scenes);
  const supplied = initialState && typeof initialState === "object"
    ? initialState
    : {};
  const hasSuppliedGroup = Object.hasOwn(supplied, "activeGroupId");
  const preferredGroup = preferredGroupId
    ? groups.find(({ id }) => id === preferredGroupId)
    : null;
  const activeGroupId = hasSuppliedGroup
    ? supplied.activeGroupId
    : preferredGroup?.id ?? (preferredGroupId ? null : groups[0]?.id ?? null);
  const activeScene = resolveActiveScene(scenes, supplied.activeSceneId);
  const source = supplied.source ?? (
    activeScene
      ? { kind: "scene", id: activeScene.id }
      : activeGroupId !== null
        ? { kind: "group", id: activeGroupId }
        : { kind: "default", id: null }
  );
  const temporalContext = {
    charts,
    loadedData,
    profiles,
    timezone,
  };
  const selectedGroup = resolveActiveGroup(groups, activeScene?.chronoGroupId ?? activeGroupId);
  const shouldBuildClock = supplied.playbackView === true;
  const defaultPagePlayback = shouldBuildClock
    ? buildDefaultPagePlayback(pageCharts ?? charts, temporalContext)
    : emptyDefaultPagePlayback(pageCharts ?? charts);
  const activeGroup = source.kind === "default" && !activeScene
    ? defaultPagePlayback.group
    : selectedGroup;
  const groupClock = !shouldBuildClock
    ? EMPTY_ARRAY
    : source.kind === "default" && !activeScene
    ? defaultPagePlayback.clock
    : buildChronoGroupClock(selectedGroup, temporalContext);
  const clock = activeScene
    ? buildScenePlaybackClock(activeScene, groupClock, {
        group: selectedGroup,
        temporalContext,
      })
    : groupClock;
  const hasSuppliedIndex = Object.hasOwn(supplied, "activeIndex");
  const hasSuppliedSpeed = Object.hasOwn(supplied, "speed");
  return {
    ...initialPlaybackState,
    ...supplied,
    source,
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

export function selectPlayableScenes(scenes = []) {
  return Object.freeze((Array.isArray(scenes) ? scenes : []).filter(
    (scene) => scene?.frames?.mode !== "unresolved",
  ));
}

export function buildScenePlaybackClock(scene, groupClock, options = {}) {
  if (!scene || !Array.isArray(groupClock)) return Object.freeze([]);
  if (scene.frames?.mode === "unresolved") return Object.freeze([]);
  const start = Date.parse(scene.period?.start);
  const end = Date.parse(scene.period?.end);
  const withinPeriod = (values) => values.filter((epochMs) => (
    (!Number.isFinite(start) || epochMs >= start)
    && (!Number.isFinite(end) || epochMs <= end)
  ));
  if (scene.frames?.mode === "calendar") {
    const ledger = buildSceneFrameLedger({
      scene: {
        period: { startEpochMs: start, endEpochMs: end },
        frameRule: {
          type: "calendar",
          interval: scene.frames.interval?.value,
          unit: scene.frames.interval?.unit,
        },
      },
      charts: [],
      timeZone: options.temporalContext?.timezone ?? "UTC",
    });
    return ledger.frames;
  }
  if (scene.frames?.mode !== "source") return Object.freeze([]);

  const sourceClock = buildSceneSourceClock(scene, groupClock, options);
  const availableFrames = withinPeriod(sourceClock);
  if (scene.frames.selection !== "selected") {
    return Object.freeze(availableFrames);
  }
  const available = new Set(availableFrames);
  return Object.freeze((scene.frames.selectedEpochs ?? []).filter((epochMs) => available.has(epochMs)));
}

function selectParticipatingMembers(group, scene, charts) {
  if (!group) return EMPTY_ARRAY;
  const activePageChartIds = new Set(charts.map(({ id }) => id));
  if (scene) {
    const selected = new Set((scene.members ?? []).map(({ chartId }) => chartId));
    return Object.freeze(group.members.filter(
      ({ chartId }) => selected.has(chartId) && activePageChartIds.has(chartId),
    ));
  }
  return Object.freeze(group.members.filter(({ chartId }) => activePageChartIds.has(chartId)));
}

export function buildDefaultPagePlayback(charts, temporalContext) {
  const members = [];
  const projectedCharts = [];
  for (const chart of charts) {
    const projection = buildPageChartClock(chart, temporalContext);
    members.push(Object.freeze({
      chartId: chart.id,
      ...(projection.timeRole ? { timeRole: projection.timeRole } : {}),
    }));
    if (projection.epochs.length === 0) continue;
    projectedCharts.push({
      id: chart.id,
      variables: [{
        observations: projection.epochs.map((epochMs) => ({ epochMs, value: true })),
      }],
    });
  }
  const projectedEpochs = projectedCharts.flatMap(({ variables }) => (
    variables[0].observations.map(({ epochMs }) => epochMs)
  ));
  const clock = projectedEpochs.length === 0
    ? EMPTY_ARRAY
    : buildDefaultChronoLedger({
        pageCharts: projectedCharts,
        period: {
          startEpochMs: Math.min(...projectedEpochs),
          endEpochMs: Math.max(...projectedEpochs),
        },
        timeZone: temporalContext.timezone,
      });
  return Object.freeze({
    clock,
    group: defaultPageGroup(charts, members),
  });
}

function emptyDefaultPagePlayback(charts) {
  return Object.freeze({
    clock: EMPTY_ARRAY,
    group: defaultPageGroup(charts),
  });
}

function defaultPageGroup(charts, members = null) {
  return Object.freeze({
    id: "default-page",
    name: "Default page timeline",
    matching: Object.freeze({ policy: "exact" }),
    members: Object.freeze(members ?? charts.map((chart) => Object.freeze({ chartId: chart.id }))),
    secondsPerFrame: 1,
  });
}

function buildPageChartClock(chart, temporalContext) {
  for (const timeRole of Object.keys(chart?.roles ?? {})) {
    try {
      const epochs = buildChronoGroupClock({
        id: `default-page-${chart.id}`,
        name: "Default page timeline",
        period: { start: "0001-01-01", end: "9999-12-31" },
        matching: { policy: "exact" },
        secondsPerFrame: 1,
        members: [{ chartId: chart.id, timeRole }],
      }, temporalContext);
      return Object.freeze({ epochs, timeRole });
    } catch {
      // A page chart may be static or the candidate role may be non-temporal.
    }
  }
  return Object.freeze({ epochs: EMPTY_ARRAY, timeRole: null });
}

function buildSceneSourceClock(scene, fallbackClock, { group, temporalContext } = {}) {
  const member = group?.members?.find(({ chartId }) => chartId === scene.frames?.chartId);
  if (!member || !temporalContext) return fallbackClock;
  return buildChronoGroupClock({ ...group, members: [member] }, temporalContext);
}

function sessionMatchingPolicy(value) {
  return ({
    concurrent: { policy: "exact" },
    interpolate: { policy: "interpolate" },
    latest: { policy: "lastKnown" },
    closest: { policy: "nearest", toleranceMs: Number.MAX_SAFE_INTEGER },
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
