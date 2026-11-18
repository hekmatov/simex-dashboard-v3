import { getChartSchema } from "../schemas/chartSchemaRegistry.js";
import { assertChronoGroupMemberEligible, validateEffectiveTimeSyncMatching } from "./chronoGroupModel.js";
import { collectTemporalAvailability, validateIanaTimezone } from "./temporalAvailability.js";
import { validateCursorScope, validateCursorWindow, validateExerciseTime } from "./cursorModel.js";
import { sceneMatchingPolicy } from "./sceneMatching.js";
import { buildSceneFrameLedger } from "./frameLedger.js";
import { isCalendarUnionPeriod, validateCalendarUnionPeriod } from "./sceneSchema.js";

export function chartsForPlaybackPage(dashboard, activePageId) {
  const pages = Array.isArray(dashboard?.pages) ? dashboard.pages : [];
  const page = activePageId === null || activePageId === undefined
    ? pages[0]
    : pages.find(({ id }) => id === activePageId);
  if (!page) return [];
  return (page.sections ?? []).flatMap((section) => (
    (section.panels ?? []).map((panel) => panel.chart ?? panel)
  ));
}

export function createPlaybackChartCollectionSelector() {
  let pages = null;
  let activePageId = Symbol("uninitialized-page");
  let charts = [];
  let pageCharts = [];

  return (dashboard, nextActivePageId) => {
    const nextPages = Array.isArray(dashboard?.pages) ? dashboard.pages : [];
    if (nextPages !== pages) {
      pages = nextPages;
      charts = nextPages.flatMap((page) => (
        (page.sections ?? []).flatMap((section) => (
          (section.panels ?? []).map((panel) => panel.chart ?? panel)
        ))
      ));
      activePageId = Symbol("pages-changed");
    }
    if (nextActivePageId !== activePageId) {
      activePageId = nextActivePageId;
      pageCharts = chartsForPlaybackPage({ pages }, nextActivePageId);
    }
    return { charts, pageCharts };
  };
}


export function selectCursorScopeCharts({ charts = [], pageCharts = [], storylines = [], scope }) {
  validateCursorScope(scope);
  if (scope.kind === "dashboard") return charts;
  if (scope.kind === "page") return pageCharts;
  const storyline = storylines.find(candidate => candidate.id === scope.id);
  const byId = new Map(charts.map(chart => [chart.id, chart]));
  return (storyline?.members ?? []).map(member => byId.get(member.chartId)).filter(Boolean);
}

export function cursorMembers(charts, profiles = {}, declaredMembers = []) {
  const members = [];
  for (const chart of charts) {
    let schema;
    try { schema = getChartSchema(chart.typeId); } catch { continue; }
    const declaredRole = declaredMembers.find(member => member.chartId === chart.id)?.timeRole;
    for (const role of schema.roles.filter(role => declaredRole ? role.id === declaredRole : role.accepts.includes("temporal"))) {
      try {
        assertChronoGroupMemberEligible({ chart, timeRole: role.id, profiles });
        members.push(Object.freeze({ chartId: chart.id, timeRole: role.id }));
        break;
      } catch { /* Static, Collection and non-temporal bindings never add clock frames. */ }
    }
  }
  return Object.freeze(members);
}

export function buildCursorClock({ charts = [], loadedData = {}, profiles = {}, timezone = "UTC", window = null, members = null, calendarPeriod = null } = {}) {
  validateCursorWindow(window);
  if (calendarPeriod) validateCalendarUnionPeriod(calendarPeriod);
  validateIanaTimezone(timezone);
  const byId = new Map(charts.map(chart => [chart.id, chart]));
  const epochs = new Set();
  const start = window ? Date.parse(window.start) : -Infinity;
  const end = window ? Date.parse(window.end) : Infinity;
  for (const member of members ?? cursorMembers(charts, profiles)) {
    const chart = byId.get(member.chartId);
    if (!chart) throw new Error(`Time cursor member chart "${member.chartId}" does not exist.`);
    assertChronoGroupMemberEligible({ chart, timeRole: member.timeRole, profiles });
    const entry = readEntry(profiles, chart.sourceId);
    const profile = entry?.datasetProfile ?? entry?.profile ?? entry;
    const rows = readEntry(loadedData, chart.sourceId) ?? [];
    for (const epoch of collectTemporalAvailability({ chart, member, rows, profile, timezone,
      period: calendarPeriod ?? { start: "0001-01-01", end: "9999-12-31" } })) {
      if (epoch >= start && epoch <= end) epochs.add(epoch);
    }
  }
  return Object.freeze([...epochs].sort((left, right) => left - right));
}

export function resolveLiveEpochMs({ exerciseTime, clock = [] } = {}) {
  if (exerciseTime !== undefined) return Date.parse(validateExerciseTime(exerciseTime));
  return clock.at(-1) ?? null;
}

export function storylineObservationClock({ storyline, ...context }) {
  return buildCursorClock({ ...context, ...(isCalendarUnionPeriod(storyline)
    ? { calendarPeriod: storyline.period } : { window: storyline?.period ?? null }) });
}

export function buildStorylineClock({ storyline, charts = [], loadedData = {}, profiles = {}, timezone = "UTC", window = null, members: declaredMembers = null } = {}) {
  if (!storyline || storyline.frames?.mode === "unresolved") return Object.freeze([]);
  validateCursorWindow(window);
  const byId = new Map(charts.map(chart => [chart.id, chart]));
  const selectedCharts = (storyline.members ?? []).map(member => byId.get(member.chartId)).filter(Boolean);
  const members = cursorMembers(selectedCharts, profiles, declaredMembers ?? storyline.members);
  if (!members.length) return Object.freeze([]);
  const observations = storylineObservationClock({ storyline, charts: selectedCharts, members, loadedData, profiles, timezone });
  if (isCalendarUnionPeriod(storyline)) return Object.freeze(observations.filter(epoch => !window
    || epoch >= Date.parse(window.start) && epoch <= Date.parse(window.end)));
  const authored = storyline.period ?? (observations.length ? {
    start: new Date(observations[0]).toISOString(), end: new Date(observations.at(-1)).toISOString(),
  } : null);
  if (!authored) return Object.freeze([]);
  validateCursorWindow(authored);
  const startEpochMs = Math.max(Date.parse(authored.start), window ? Date.parse(window.start) : -Infinity);
  const endEpochMs = Math.min(Date.parse(authored.end), window ? Date.parse(window.end) : Infinity);
  if (startEpochMs > endEpochMs) return Object.freeze([]);
  if (storyline.frames?.mode === "calendar") {
    const frames = buildSceneFrameLedger({ scene: { period: { startEpochMs: Date.parse(authored.start), endEpochMs: Date.parse(authored.end) },
      frameRule: { type: "calendar", interval: storyline.frames.interval?.value, unit: storyline.frames.interval?.unit } },
      charts: [], timeZone: timezone }).frames;
    return Object.freeze(frames.filter(epoch => epoch >= startEpochMs && epoch <= endEpochMs));
  }
  const sourceMembers = members.filter(member => member.chartId === storyline.frames?.chartId);
  const available = storyline.frames?.mode === "source"
    ? buildCursorClock({ charts: selectedCharts, members: sourceMembers, loadedData, profiles, timezone }) : observations;
  const selected = storyline.frames?.selection === "selected" ? new Set(storyline.frames.selectedEpochs ?? []) : null;
  return Object.freeze(available.filter(epoch => epoch >= startEpochMs && epoch <= endEpochMs && (!selected || selected.has(epoch))));
}

/** Legacy inherited policies act as member overrides during the additive release. */
export function resolveCursorMatching({ chart, member, sceneDefault, inheritedMatching, chartDefaultMatching, sessionOverride = "authored", nearestToleranceMs = null } = {}) {
  const chartDefault = chart?.interaction?.timeSync?.matching ?? chartDefaultMatching ?? { policy: "exact" };
  const authored = member?.matching ?? sceneDefault ?? inheritedMatching ?? chartDefault;
  const session = {
    concurrent: { policy: "exact" }, latest: { policy: "lastKnown" },
    interpolate: { policy: "interpolate" }, closest: { policy: "nearest", toleranceMs: nearestToleranceMs },
  };
  if (sessionOverride !== "authored" && !Object.hasOwn(session, sessionOverride)) throw new Error("Time cursor matching override is invalid.");
  if (sessionOverride === "closest" && (!Number.isFinite(nearestToleranceMs) || nearestToleranceMs < 0)) return Object.freeze({ policy: "nearest" });
  let matching = sessionOverride === "authored" ? authored : session[sessionOverride];
  if (typeof matching === "string") {
    const policy = sceneMatchingPolicy(matching);
    const inheritedTolerance = inheritedMatching?.policy === "nearest" ? inheritedMatching.toleranceMs
      : chartDefault.policy === "nearest" ? chartDefault.toleranceMs : undefined;
    matching = { policy, ...(policy === "nearest" && inheritedTolerance !== undefined ? { toleranceMs: inheritedTolerance } : {}) };
    // The accepted transition allowed label-only nearest settings. Its old
    // renderer reported invalid-time-matching when no bound was authored.
    // Preserve that repairable chart diagnostic instead of crashing the provider
    // or inventing a zero/unlimited tolerance with different data semantics.
    if (policy === "nearest" && inheritedTolerance === undefined) return Object.freeze(matching);
  }
  validateEffectiveTimeSyncMatching(matching, "Time cursor chart");
  return Object.freeze({ ...matching });
}

export function buildCursorTimeContexts({ charts = [], members = [], activeEpochMs, scope, mode = "at", storyline = null,
  legacyGroup = null, groups = [], sessionOverride = "authored", nearestToleranceMs = null, traceMode = "reveal", frameIndex } = {}) {
  const contexts = Object.create(null);
  if (!Number.isFinite(activeEpochMs)) return Object.freeze(contexts);
  validateCursorScope(scope);
  const byId = new Map(charts.map(chart => [chart.id, chart]));
  for (const member of members) {
    const chart = byId.get(member.chartId);
    if (!chart) continue;
    const storylineMember = storyline?.members?.find(candidate => candidate.chartId === member.chartId);
    const legacyMember = legacyGroup?.members?.find(candidate => candidate.chartId === member.chartId);
    const matching = resolveCursorMatching({ chart, member: storylineMember,
      sceneDefault: storyline?.defaultMatching, inheritedMatching: legacyMember?.matching ?? legacyGroup?.matching,
      chartDefaultMatching: unambiguousLegacyChartMatching(chart.id, groups),
      sessionOverride, nearestToleranceMs });
    contexts[member.chartId] = Object.freeze({ kind: "cursor", mode, scope: Object.freeze({ ...scope }),
      activeEpochMs, matching, traceMode,
      ...(Number.isSafeInteger(frameIndex) ? { frameIndex } : {}),
      ...(legacyGroup ? { groupId: legacyGroup.id } : {}),
      ...(storyline ? { sceneId: storyline.id } : {}) });
  }
  return Object.freeze(contexts);
}

export function unambiguousLegacyChartMatching(chartId, groups = []) {
  const policies = groups.flatMap(group => (group.members ?? []).filter(member => member.chartId === chartId)
    .map(member => member.matching ?? group.matching));
  if (!policies.length) return undefined;
  const first = policies[0];
  return policies.every(policy => policy?.policy === first?.policy && policy?.toleranceMs === first?.toleranceMs)
    ? first : undefined;
}

function readEntry(collection, key) { return collection instanceof Map ? collection.get(key) : collection?.[key]; }
