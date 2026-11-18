import { INITIAL_TIME_CURSOR, cursorFrameIndex } from "./cursorModel.js";
import { initialPlaybackState } from "./playbackReducer.js";
import { buildChronoGroupClock, validateChronoGroups } from "./chronoGroupModel.js";
import { buildCursorClock, buildStorylineClock, storylineObservationClock, cursorMembers, selectCursorScopeCharts, resolveLiveEpochMs, buildCursorTimeContexts } from "./playbackPageScope.js";

export function legacyPlaybackScope({ state, requested, activePageId = null, groups = [], scenes = [] }) {
  if (!["all-page", "group-only"].includes(requested)) throw new Error("Playback scope must be all-page or group-only.");
  const sceneId = scenes.some(scene => scene.id === state.activeSceneId) ? state.activeSceneId : null;
  const groupId = groups.some(group => group.id === state.activeGroupId) ? state.activeGroupId : null;
  const id = sceneId ?? groupId;
  return requested === "group-only" && id ? { kind: "storyline", id } : { kind: "page", id: activePageId };
}

export function legacySeekEpoch(index, clock) {
  if (!Number.isInteger(index)) throw new TypeError("Playback seek index must be an integer.");
  return clock.length ? clock[Math.max(0, Math.min(clock.length - 1, index))] : null;
}

export function initializeCursorPlaybackState(options) {
  const supplied = options.initialState ?? {};
  const state = { ...initialPlaybackState, ...supplied, cursor: supplied.cursor ?? INITIAL_TIME_CURSOR };
  if (supplied.cursor && supplied.cursor !== INITIAL_TIME_CURSOR) return state;
  // Compatibility for the transition's explicit legacy fixture/session inputs.
  // Ordinary application entry starts Live on its current page.
  const scene = (options.scenes ?? []).find(scene => scene.id === supplied.activeSceneId && scene.frames?.mode !== "unresolved");
  const explicitGroup = supplied.source?.kind === "group" ? supplied.activeGroupId : undefined;
  const groupId = scene?.chronoGroupId ?? scene?.groupId ?? explicitGroup ?? (supplied.playbackView === true && supplied.sourcePreference !== "page"
    ? supplied.activeGroupId ?? options.preferredGroupId ?? options.groups?.[0]?.id : null);
  if (scene || groupId) {
    state.activeGroupId = groupId;
    state.activeSceneId = scene?.id ?? null;
    state.source = { kind: scene ? "scene" : "group", id: scene?.id ?? groupId };
    state.cursor = { ...INITIAL_TIME_CURSOR, scope: { kind: "storyline", id: scene?.id ?? groupId } };
    if (!Object.hasOwn(supplied, "scope")) state.scope = "group-only";
  } else {
    state.activeGroupId = null; state.activeSceneId = null;
    state.source = { kind: "default", id: null };
    state.sourcePreference = "page";
  }
  if (!Object.hasOwn(supplied, "speed")) {
    state.speed = scene?.secondsPerFrame ?? options.groups?.find(group => group.id === groupId)?.secondsPerFrame ?? 1;
    state.secondsPerFrame = state.speed;
  }
  if (supplied.playbackView === true) {
    const projection = deriveCursorPlayback({ ...options, state });
    const index = Number.isInteger(supplied.activeIndex) ? supplied.activeIndex
      : options.initialPosition === "latest" ? projection.clock.length - 1 : 0;
    const activeIndex = Math.max(0, Math.min(projection.clock.length - 1, index));
    state.cursor = { ...state.cursor, mode: "at", epochMs: projection.clock[activeIndex] ?? null };
    state.activeIndex = activeIndex; state.frameIndex = activeIndex;
  }
  return state;
}

/** Pure shared projection for View, Present, previews and accepted Audience state. */
export function deriveCursorPlayback({ state, charts = [], pageCharts = charts, groups = [], scenes = [],
  loadedData = {}, profiles = {}, timezone = "UTC", exerciseTime, activePageId = null } = {}) {
  const storedCursor = state.cursor ?? INITIAL_TIME_CURSOR;
  const pageChanged = storedCursor.scope.kind === "page" && activePageId !== null && storedCursor.scope.id !== activePageId;
  const cursor = pageChanged ? { ...storedCursor, scope: { kind: "page", id: activePageId } } : storedCursor;
  const activeScene = cursor.scope.kind === "storyline" ? scenes.find(scene => scene.id === cursor.scope.id) ?? null : null;
  const parentGroupId = activeScene?.chronoGroupId ?? activeScene?.groupId;
  const legacyGroup = parentGroupId
    ? groups.find(group => group.id === parentGroupId) ?? null
    : cursor.scope.kind === "storyline" && state.activeGroupId === cursor.scope.id
      ? groups.find(group => group.id === state.activeGroupId) ?? null : null;
  const scopeCharts = legacyGroup && !activeScene
    ? (legacyGroup.members ?? []).map(member => charts.find(chart => chart.id === member.chartId)).filter(Boolean)
    : selectCursorScopeCharts({ charts, pageCharts, storylines: scenes, scope: cursor.scope });
  const members = cursorMembers(scopeCharts, profiles, legacyGroup?.members ?? activeScene?.members ?? []);
  const temporalContext = { charts: scopeCharts, loadedData, profiles, timezone, members };
  if (legacyGroup) validateChronoGroups([legacyGroup], { charts, loadedData, profiles, timezone });
  const observations = legacyGroup && !activeScene
    ? buildChronoGroupClock(legacyGroup, { charts, loadedData, profiles, timezone })
    : storylineObservationClock({ storyline: activeScene, ...temporalContext });
  const clock = activeScene ? buildStorylineClock({ storyline: activeScene, ...temporalContext, window: cursor.window })
    : cursor.window ? Object.freeze(observations.filter(epoch => epoch >= Date.parse(cursor.window.start) && epoch <= Date.parse(cursor.window.end))) : observations;
  const liveEpochMs = resolveLiveEpochMs({ exerciseTime, clock: observations });
  const activeEpochMs = cursor.mode === "live" ? liveEpochMs : pageChanged
    ? clock.length && Number.isFinite(cursor.epochMs) ? clock[cursorFrameIndex(clock, cursor.epochMs)] : null
    : cursor.epochMs;
  const activeIndex = cursorFrameIndex(clock, activeEpochMs);
  const sourceLabel = activeScene?.name ?? legacyGroup?.name
    ?? (cursor.scope.kind === "storyline" ? "Unavailable Storyline" : cursor.scope.kind === "dashboard" ? "Whole dashboard" : "Whole page");
  const group = legacyGroup ?? Object.freeze({ id: activeScene?.id ?? `cursor-${cursor.scope.kind}`,
    name: sourceLabel, matching: Object.freeze({ policy: "exact" }), members, secondsPerFrame: state.speed,
    ...(clock.length ? { period: { start: new Date(clock[0]).toISOString(), end: new Date(clock.at(-1)).toISOString() } } : {}) });
  const contexts = buildCursorTimeContexts({ charts: scopeCharts, members, activeEpochMs, scope: cursor.scope, mode: cursor.mode,
    storyline: activeScene, legacyGroup, groups, sessionOverride: state.matchingOverride, nearestToleranceMs: state.nearestToleranceMs, traceMode: state.traceMode, frameIndex: activeIndex });
  const playing = state.playing === true && cursor.mode === "at" && activeEpochMs !== null && clock.some(epoch => epoch > activeEpochMs);
  const publicCursor = Object.freeze({ ...cursor, epochMs: cursor.mode === "at" ? activeEpochMs : null, scope: Object.freeze({ ...cursor.scope }),
    window: cursor.window && Object.freeze({ ...cursor.window }), playing, speed: state.speed,
    matchingOverride: state.matchingOverride, nearestToleranceMs: state.nearestToleranceMs ?? null, traceMode: state.traceMode, availabilityVisible: state.availabilityVisible });
  return Object.freeze({ cursor: publicCursor, clock, liveEpochMs, activeEpochMs, activeIndex, activeScene, activeGroup: group,
    members, scopeCharts, sourceLabel, contexts, playing, observationClock: observations,
  });
}
