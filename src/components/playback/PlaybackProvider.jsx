import React from "react";

import {
  buildChronoGroupClock,
} from "../../charting/time/chronoGroupModel.js";
import {
  reducePlaybackState,
} from "../../charting/time/playbackReducer.js";
import {
  buildDefaultChronoLedger,
  buildSceneFrameLedger,
} from "../../charting/time/frameLedger.js";
import { buildFrameAvailabilityEvidence } from "./playbackAvailability.js";
import { deriveCursorPlayback, initializeCursorPlaybackState, legacyPlaybackScope, legacySeekEpoch } from "../../charting/time/cursorProviderModel.js";
import { resolveCursorMatching } from "../../charting/time/playbackPageScope.js";

const PlaybackContext = React.createContext(null);
const EMPTY_ARRAY = Object.freeze([]);

export function PlaybackProvider({
  groups = EMPTY_ARRAY, scenes = EMPTY_ARRAY, charts = EMPTY_ARRAY, pageCharts = null,
  loadedData = {}, profiles = {}, preferredGroupId = null, initialState,
  initialPosition = "earliest", timezone = "UTC", exerciseTime, activePageId = null, children,
}) {
  const playbackSafetyGatesRef = React.useRef(new Map());
  const playbackActionGuardsRef = React.useRef(new Map());
  const playableScenes = React.useMemo(() => selectPlayableScenes(scenes), [scenes]);
  const activePageCharts = pageCharts ?? charts;
  const options = React.useMemo(() => ({ groups, scenes: playableScenes, charts, pageCharts: activePageCharts,
    loadedData, profiles, timezone, exerciseTime, activePageId, preferredGroupId, initialState, initialPosition }),
    [groups, playableScenes, charts, activePageCharts, loadedData, profiles, timezone, exerciseTime, activePageId, preferredGroupId, initialState, initialPosition]);
  const [state, baseDispatch] = React.useReducer(reducePlaybackState, options, initializeCursorPlaybackState);
  const projection = React.useMemo(() => deriveCursorPlayback({ ...options, state }), [options, state]);
  const { cursor, clock, liveEpochMs, activeEpochMs, activeIndex, activeScene, activeGroup,
    members, scopeCharts, sourceLabel, contexts, playing } = projection;
  const currentRef = React.useRef({ state, projection, options });
  currentRef.current = { state, projection, options };
  const dispatch = React.useCallback((action) => {
    const current = currentRef.current;
    const { state, projection, options } = current;
    const send = value => {
      current.state = reducePlaybackState(current.state, value);
      baseDispatch(value);
    };
    const refresh = () => { current.projection = deriveCursorPlayback({ ...options, state: current.state }); };
    if (["play", "tick", "cursorPlay", "cursorTick"].includes(action?.type)
      && [...playbackSafetyGatesRef.current.values()].some(allowed => allowed !== true)) {
      send({ type: "pause" }); refresh(); return false;
    }
    if (action?.fromPresentationSession !== true) {
      for (const guard of playbackActionGuardsRef.current.values()) {
        if (guard(action) === false) { send({ type: "pause" }); refresh(); return false; }
      }
    }
    const derived = { clock: projection.clock, liveEpochMs: projection.liveEpochMs };
    if (action?.type === "restoreAcceptedTime") {
      const id = action.time?.scope?.kind === "storyline" ? action.time.scope.id : null;
      const scene = options.scenes.find(value => value.id === id);
      const group = options.groups.find(value => value.id === (scene?.chronoGroupId ?? (!scene ? id : null)));
      send({ ...action, sceneId: scene?.id ?? null, groupId: group?.id ?? null }); refresh(); return true;
    }
    if (action?.type === "closeView") {
      send(action);
      if ((action.owner === undefined || action.owner === "page-time") && current.state.playbackView !== true) send({ type: "cursorLive" });
      refresh(); return true;
    }
    if (["setGroup", "setScene"].includes(action?.type)) {
      const next = reducePlaybackState(state, action);
      const scope = action.type === "setScene" && action.sceneId !== null
        ? { kind: "storyline", id: action.sceneId }
        : action.type === "setGroup" && action.groupId !== null
          ? { kind: "storyline", id: action.groupId } : { kind: "page", id: options.activePageId ?? null };
      const nextProjection = deriveCursorPlayback({ ...options, state: { ...next, cursor: { ...state.cursor, scope } } });
      send(action);
      send({ type: "cursorScope", scope, clock: nextProjection.clock });
      const scene = nextProjection.activeScene;
      const group = options.groups.find(group => group.id === (scene?.chronoGroupId ?? action.groupId));
      send({ type: "setSpeed", speed: scene?.secondsPerFrame ?? group?.secondsPerFrame ?? 1 });
      refresh(); return true;
    }
    if (action?.type === "setScope") {
      const scope = legacyPlaybackScope({ state, requested: action.scope, activePageId: options.activePageId,
        groups: options.groups, scenes: options.scenes });
      const nextProjection = deriveCursorPlayback({ ...options, state: { ...state, cursor: { ...state.cursor, scope } } });
      send({ ...action, scope: scope.kind === "page" ? "all-page" : "group-only" });
      send({ type: "cursorScope", scope, clock: nextProjection.clock }); refresh(); return true;
    }
    if (action?.type === "cursorScope") {
      const scope = action.scope.kind === "page" ? { ...action.scope, id: options.activePageId ?? action.scope.id } : action.scope;
      const next = { ...state, activeGroupId: null, activeSceneId: scope.kind === "storyline" ? scope.id : null,
        cursor: { ...state.cursor, scope } };
      const nextProjection = deriveCursorPlayback({ ...options, state: next });
      send({ type: "setGroup", groupId: null });
      if (next.activeSceneId) send({ type: "setScene", sceneId: next.activeSceneId });
      send({ ...action, scope, clock: nextProjection.clock }); refresh(); return true;
    }
    const type = { play: "cursorPlay", tick: "cursorTick", previous: "cursorStep", next: "cursorStep", seek: "cursorSeek", end: "cursorSeek" }[action?.type];
    if (type) {
      const seekEpoch = action.type === "seek" ? legacySeekEpoch(action.index, projection.clock) : undefined;
      if ((action.type === "seek" || action.type === "end") && projection.clock.length === 0) {
        send({ type: "cursorReconcile", ...derived }); refresh(); return true;
      }
      send({ ...action, ...derived, type,
        ...(action.type === "previous" ? { direction: -1 } : action.type === "next" ? { direction: 1 } : {}),
        ...(action.type === "seek" ? { epochMs: seekEpoch } : action.type === "end" ? { epochMs: projection.clock.at(-1) } : {}) });
      refresh(); return true;
    }
    if (action?.type?.startsWith("cursor")) send({ ...derived, ...action });
    else send(action);
    refresh(); return true;
  }, []);
  const setPlaybackSafety = React.useCallback((owner, allowed) => {
    if (typeof owner !== "string" || !owner.trim()) throw new TypeError("Playback safety owner must be a non-empty string.");
    if (allowed === true) playbackSafetyGatesRef.current.delete(owner);
    else playbackSafetyGatesRef.current.set(owner, false);
    if (allowed !== true) baseDispatch({ type: "pause" });
  }, []);
  const releasePlaybackSafety = React.useCallback(owner => playbackSafetyGatesRef.current.delete(owner), []);
  const setPlaybackActionGuard = React.useCallback((owner, guard) => {
    if (typeof owner !== "string" || !owner.trim() || typeof guard !== "function") throw new TypeError("Playback action guard requires an owner and function.");
    playbackActionGuardsRef.current.set(owner, guard);
  }, []);
  const releasePlaybackActionGuard = React.useCallback(owner => playbackActionGuardsRef.current.delete(owner), []);
  React.useEffect(() => {
    if (state.cursor.mode === "at") baseDispatch({ type: "cursorReconcile", clock, liveEpochMs });
  }, [clock, liveEpochMs, state.cursor.mode]);
  React.useEffect(() => {
    const scope = currentRef.current.state.cursor.scope;
    if (scope.kind !== "page" || scope.id === activePageId) return;
    dispatch({ type: "cursorScope", scope: { kind: "page", id: activePageId } });
  }, [activePageId, dispatch]);
  React.useEffect(() => createPlaybackTimer({ playing, playbackView: true, clockLength: clock.length,
    speed: state.speed, activeIndex: playing ? Math.max(0, clock.findIndex(epoch => epoch > activeEpochMs) - 1) : activeIndex, dispatch }), [playing, state.speed, clock, activeIndex, activeEpochMs, dispatch]);
  const frameAvailability = React.useMemo(() => state.availabilityVisible
    ? buildFrameAvailabilityEvidence({ activeEpochMs, clock, group: activeGroup, members, charts: scopeCharts,
        loadedData, profiles, contexts, timezone }) : EMPTY_ARRAY,
    [state.availabilityVisible, activeEpochMs, clock, activeGroup, members, scopeCharts, loadedData, profiles, contexts, timezone]);
  const value = React.useMemo(() => Object.freeze({
    ...projection, charts, groups, scenes: playableScenes, loadedData, profiles, dispatch, exerciseTime: exerciseTime ?? null,
    activeGroupId: state.activeGroupId ?? (activeScene?.chronoGroupId ?? null), activeSceneId: activeScene?.id ?? null,
    participatingChartIds: Object.freeze(members.map(member => member.chartId)),
    availabilityVisible: state.availabilityVisible, frameAvailability,
    frameAvailabilityByChartId: Object.freeze(Object.fromEntries(frameAvailability.map(entry => [entry.chartId, entry]))),
    connection: state.connection, matchingOverride: state.matchingOverride, nearestToleranceMs: state.nearestToleranceMs ?? null, placement: state.placement,
    playbackView: state.playbackView, scope: state.scope, source: state.source, sourcePreference: state.sourcePreference,
    speed: state.speed, traceMode: state.traceMode, setPlaybackSafety, releasePlaybackSafety, setPlaybackActionGuard, releasePlaybackActionGuard,
    status: clock.length ? `${sourceLabel}: ${canonicalTime(activeEpochMs)}` : `No playback times are available for ${sourceLabel}`,
    timeContext: Number.isFinite(activeEpochMs) ? Object.freeze({ kind: "cursor", groupId: activeGroup.id, activeEpochMs, scope: cursor.scope, mode: cursor.mode }) : null,
    timeContextForChart: chartId => contexts[chartId] ?? null,
  }), [projection, charts, groups, playableScenes, loadedData, profiles, dispatch, state, members, frameAvailability, setPlaybackSafety, releasePlaybackSafety, setPlaybackActionGuard, releasePlaybackActionGuard]);
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
  charts = EMPTY_ARRAY,
  frameIndex,
  sessionMatchingOverride = "authored",
  sessionNearestToleranceMs = null,
  traceMode,
} = {}) {
  const contexts = Object.create(null);
  if (!group || !Number.isFinite(activeEpochMs)) return Object.freeze(contexts);
  for (const member of group.members) {
    const sceneMember = scene?.members?.find(({ chartId }) => chartId === member.chartId);
    const matching = resolveCursorMatching({ chart: charts.find(chart => chart.id === member.chartId),
      member: sceneMember, sceneDefault: scene?.defaultMatching,
      inheritedMatching: member.matching ?? group.matching, sessionOverride: sessionMatchingOverride, nearestToleranceMs: sessionNearestToleranceMs });
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
  { groups = EMPTY_ARRAY, scenes = EMPTY_ARRAY, activeGroupId = null, defaultPageClock = null } = {},
) {
  if (typeof baseDispatch !== "function") {
    throw new TypeError("Playback dispatch must be a function.");
  }
  baseDispatch(action);
  if (action?.type === "setGroup") {
    if (action.groupId === null && defaultPageClock) {
      baseDispatch({ type: "seek", index: Math.max(0, defaultPageClock.length - 1), clockLength: defaultPageClock.length });
      return;
    }
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

export function buildDefaultPagePlayback(charts, temporalContext) {
  const members = [];
  const projectedCharts = [];
  for (const chart of charts) {
    const projection = buildPageChartClock(chart, temporalContext);
    if (!projection.timeRole || projection.epochs.length === 0) continue;
    members.push(Object.freeze({
      chartId: chart.id,
      ...(projection.timeRole ? { timeRole: projection.timeRole } : {}),
    }));
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
    matching: Object.freeze({ policy: "lastKnown" }),
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

function canonicalTime(epochMs) {
  if (!Number.isFinite(epochMs)) return "No time selected";
  const iso = new Date(epochMs).toISOString();
  return iso.endsWith("T00:00:00.000Z") ? iso.slice(0, 10) : iso;
}
