import { buildDefaultChronoLedger } from "../../charting/time/frameLedger.js";
import {
  MATCHING_POLICY_LABELS,
  resolveMatchingPolicy,
} from "../../charting/time/temporalMatch.js";
import { deriveGroupPeriodChangeConsequence } from "../../charting/time/temporalNeedsAttention.js";
import { validateIanaTimeZone } from "../../charting/time/temporalSchema.js";

export const CHRONO_GROUP_STAGES = Object.freeze(["period", "charts", "defaults", "review"]);

export function deriveChronoGroupStageStates(state) {
  const result = {};
  let waiting = false;
  for (const stage of CHRONO_GROUP_STAGES) {
    if (waiting) {
      result[stage] = "waiting";
      continue;
    }
    const validation = validateChronoGroupStage(state, stage);
    if (!validation) {
      result[stage] = "complete";
      continue;
    }
    result[stage] = validation.code === "CHART_REQUIRED" ? "in-progress" : "needs-attention";
    waiting = true;
  }
  return result;
}

const ALLOWED_FALLBACKS = new Set([
  MATCHING_POLICY_LABELS.CONCURRENT_ONLY,
  MATCHING_POLICY_LABELS.SNAP_TO_LATEST,
  MATCHING_POLICY_LABELS.SNAP_TO_CLOSEST,
]);

export function createChronoGroupDraft({
  group = {},
  chronoGroups = [],
  charts = [],
  scenes = [],
  timeZone = "UTC",
  initialStage = "period",
} = {}) {
  assertStage(initialStage);
  const baseline = normalizeSavedGroup(group);
  const value = clone(baseline);
  return {
    baseline,
    value,
    chronoGroups: clone(chronoGroups),
    charts: clone(charts),
    scenes: clone(scenes),
    timeZone,
    stage: initialStage,
    status: "clean",
    error: null,
    availabilityRows: availabilityFor(value, charts, timeZone),
    sceneConsequences: [],
    restoration: null,
    suspendedStatus: null,
  };
}

export function reduceChronoGroupDraft(state, action) {
  switch (action?.type) {
    case "SET_PERIOD": {
      const value = { ...state.value, period: clone(action.period) };
      if (!validPeriod(value.period)) {
        return changed(state, value, {
          sceneConsequences: state.sceneConsequences,
        });
      }
      const consequence = deriveGroupPeriodChangeConsequence({
        groupId: value.id,
        nextPeriod: value.period,
        scenes: state.scenes,
      });
      const priorResolutions = new Map(
        state.sceneConsequences.map(({ sceneId, resolution }) => [sceneId, resolution]),
      );
      return changed(state, value, {
        sceneConsequences: consequence.affectedSceneIds.map((sceneId) => ({
          sceneId,
          resolution: priorResolutions.get(sceneId) ?? null,
        })),
      });
    }
    case "TOGGLE_CHART": {
      const selected = new Set(state.value.chartIds);
      if (action.selected === false || (action.selected === undefined && selected.has(action.chartId))) {
        selected.delete(action.chartId);
      } else {
        selected.add(action.chartId);
      }
      const memberFallbacks = { ...state.value.memberFallbacks };
      if (!selected.has(action.chartId)) delete memberFallbacks[action.chartId];
      return changed(state, {
        ...state.value,
        chartIds: [...selected],
        memberFallbacks,
      });
    }
    case "SET_DEFAULT_MATCHING":
      return changed(state, { ...state.value, defaultMatching: action.policy });
    case "SET_MEMBER_FALLBACK": {
      const memberFallbacks = { ...state.value.memberFallbacks };
      if (action.policy === undefined || action.policy === null || action.policy === "") {
        delete memberFallbacks[action.chartId];
      } else {
        memberFallbacks[action.chartId] = action.policy;
      }
      return changed(state, { ...state.value, memberFallbacks });
    }
    case "SET_SECONDS_PER_FRAME":
      return changed(state, { ...state.value, secondsPerFrame: action.secondsPerFrame });
    case "SET_NAME":
      return changed(state, { ...state.value, name: action.name });
    case "GO_TO_STAGE": {
      assertStage(action.stage);
      const currentIndex = CHRONO_GROUP_STAGES.indexOf(state.stage);
      const targetIndex = CHRONO_GROUP_STAGES.indexOf(action.stage);
      if (targetIndex > currentIndex) {
        for (let index = 0; index < targetIndex; index += 1) {
          const validation = validateChronoGroupStage(state, CHRONO_GROUP_STAGES[index]);
          if (validation) return withError({ ...state, stage: CHRONO_GROUP_STAGES[index] }, validation);
        }
      }
      return { ...state, stage: action.stage, error: null };
    }
    case "NEXT_STAGE": {
      const validation = validateChronoGroupStage(state, state.stage);
      if (validation) return withError(state, validation);
      const index = CHRONO_GROUP_STAGES.indexOf(state.stage);
      return {
        ...state,
        stage: CHRONO_GROUP_STAGES[Math.min(index + 1, CHRONO_GROUP_STAGES.length - 1)],
        error: null,
      };
    }
    case "PREVIOUS_STAGE": {
      const index = CHRONO_GROUP_STAGES.indexOf(state.stage);
      return {
        ...state,
        stage: CHRONO_GROUP_STAGES[Math.max(index - 1, 0)],
        error: null,
      };
    }
    case "RESOLVE_SCENE_CONSEQUENCE": {
      if (action.resolution !== "edit" && action.resolution !== "clamp") {
        throw new Error('Scene consequence resolution must be "edit" or "clamp".');
      }
      if (!state.sceneConsequences.some(({ sceneId }) => sceneId === action.sceneId)) {
        return withError(state, issue(
          "SCENE_CONSEQUENCE_NOT_FOUND",
          `Scene "${action.sceneId}" is not affected by the period change.`,
        ));
      }
      return {
        ...state,
        status: "dirty",
        error: null,
        sceneConsequences: state.sceneConsequences.map((entry) => (
          entry.sceneId === action.sceneId
            ? { ...entry, resolution: action.resolution }
            : entry
        )),
      };
    }
    case "SAVE_REQUEST": {
      const validation = validateChronoGroupDraft(state);
      return validation
        ? withError(state, validation)
        : { ...state, status: "saving", error: null };
    }
    case "SAVE_SUCCEEDED": {
      const baseline = normalizeSavedGroup(action.savedValue ?? toSavedChronoGroup(state));
      const value = clone(baseline);
      return {
        ...state,
        baseline,
        value,
        status: "clean",
        error: null,
        sceneConsequences: [],
        availabilityRows: availabilityFor(value, state.charts, state.timeZone),
      };
    }
    case "SAVE_FAILED":
      return withError(state, normalizeSaveError(action.error));
    case "DISCARD": {
      const value = clone(state.baseline);
      return {
        ...state,
        value,
        status: "clean",
        error: null,
        sceneConsequences: [],
        availabilityRows: availabilityFor(value, state.charts, state.timeZone),
      };
    }
    case "SUSPEND":
      return {
        ...state,
        status: "suspended",
        suspendedStatus: state.status,
        ownerActivity: "suspended",
        restoration: clone(action.restoration ?? state.restoration),
      };
    case "RESUME":
      return {
        ...state,
        stage: state.restoration?.stage ?? state.stage,
        status: state.suspendedStatus ?? (draftChanged(state) ? "dirty" : "clean"),
        suspendedStatus: null,
        ownerActivity: "active",
      };
    default:
      throw new Error(`Unknown Chrono Group draft action: ${String(action?.type)}`);
  }
}

export function validateChronoGroupStage(state, stage = state?.stage) {
  assertStage(stage);
  const value = state?.value ?? {};
  if (stage === "period") {
    if (typeof value.name !== "string" || value.name.trim() === "") {
      return issue("NAME_REQUIRED", "Enter a unique Chrono Group name.", "chrono-group-name");
    }
    const normalizedName = value.name.trim().toLocaleLowerCase();
    if ((state.chronoGroups ?? []).some((group) => (
      group.id !== value.id
      && String(group.name ?? "").trim().toLocaleLowerCase() === normalizedName
    ))) {
      return issue("NAME_NOT_UNIQUE", "Enter a unique Chrono Group name.", "chrono-group-name");
    }
    if (!validPeriod(value.period)) {
      return issue("PERIOD_REQUIRED", "Choose a valid inclusive start and end period.", "period-start");
    }
    try {
      validateIanaTimeZone(state.timeZone);
    } catch (error) {
      return issue("TIME_ZONE_INVALID", error.message, "period-start");
    }
    return null;
  }

  if (stage === "charts") {
    if (!Array.isArray(value.chartIds) || value.chartIds.length === 0) {
      return issue("CHART_REQUIRED", "Select at least one chart.", "chrono-group-chart-list");
    }
    const attention = state.availabilityRows.find(({ selected, needsAttention }) => (
      selected && needsAttention
    ));
    if (attention) {
      return issue(
        "MEMBER_NEEDS_ATTENTION",
        `${attention.label} has no observations in the selected period.`,
        `chrono-group-chart-${attention.chartId}`,
      );
    }
    return null;
  }

  if (stage === "defaults") {
    try {
      resolveMatchingPolicy({ groupDefault: value.defaultMatching });
    } catch (error) {
      return issue("MATCHING_POLICY_INVALID", error.message, "chrono-group-default-matching");
    }
    if (value.defaultMatching === MATCHING_POLICY_LABELS.INTERPOLATE) {
      for (const chartId of value.chartIds ?? []) {
        const chart = state.charts.find(({ id }) => id === chartId);
        if (chart?.interpolationAllowed === true) continue;
        if (!ALLOWED_FALLBACKS.has(value.memberFallbacks?.[chartId])) {
          return issue(
            "MEMBER_FALLBACK_REQUIRED",
            `${chart?.label ?? chartId} needs a supported member fallback.`,
            `chrono-group-fallback-${chartId}`,
          );
        }
      }
    }
    if (!Number.isFinite(value.secondsPerFrame) || value.secondsPerFrame <= 0) {
      return issue(
        "CADENCE_INVALID",
        "Seconds per frame must be positive and finite.",
        "chrono-group-seconds-per-frame",
      );
    }
    return null;
  }

  const unresolved = state.sceneConsequences.find(({ resolution }) => resolution === null);
  if (unresolved) {
    return issue(
      "SCENE_CONSEQUENCE_REQUIRED",
      `Choose Edit or Clamp for Scene "${unresolved.sceneId}".`,
      `chrono-group-scene-${unresolved.sceneId}`,
    );
  }
  return null;
}

export function validateChronoGroupDraft(state) {
  for (const stage of CHRONO_GROUP_STAGES) {
    const validation = validateChronoGroupStage(state, stage);
    if (validation) return { ...validation, stage };
  }
  return null;
}

export function toSavedChronoGroup(stateOrValue) {
  const value = stateOrValue?.value ?? stateOrValue ?? {};
  return {
    id: value.id,
    name: String(value.name ?? "").trim(),
    period: clone(value.period),
    chartIds: clone(value.chartIds ?? []),
    defaultMatching: value.defaultMatching,
    memberFallbacks: clone(value.memberFallbacks ?? {}),
    secondsPerFrame: value.secondsPerFrame,
  };
}

export function buildChronoGroupReview(state) {
  const selectedIds = new Set(state?.value?.chartIds ?? []);
  const selectedCharts = (state?.charts ?? []).filter(({ id }) => selectedIds.has(id));
  const rowsById = new Map((state?.availabilityRows ?? []).map((row) => [row.chartId, row]));
  const affectedPages = [...new Set(selectedCharts.map((chart) => (
    chart.pageLabel ?? chart.pageId ?? "Unknown page"
  )))];
  const frameCount = validPeriod(state?.value?.period)
    ? buildDefaultChronoLedger({
      pageCharts: selectedCharts,
      period: state.value.period,
      timeZone: state.timeZone,
    }).length
    : 0;
  const members = selectedCharts.map((chart) => {
    const observationCount = rowsById.get(chart.id)?.variables?.reduce((sum, variable) => (
      sum + variable.inPeriodCount
    ), 0) ?? 0;
    return {
      chartId: chart.id,
      label: chart.label ?? chart.title ?? chart.id,
      observationCount,
      repairStage: observationCount === 0 ? "charts" : null,
    };
  });
  return {
    affectedPages,
    frameCount,
    members,
    gaps: members.filter(({ observationCount }) => observationCount === 0),
    sceneConsequences: clone(state?.sceneConsequences ?? []),
  };
}

export function deriveAvailabilityRows({
  charts = [],
  period,
  selectedChartIds = [],
  timeZone = "UTC",
} = {}) {
  if (!Array.isArray(charts) || !Array.isArray(selectedChartIds)) {
    throw new TypeError("Availability charts and selectedChartIds must be arrays.");
  }
  if (!validPeriod(period)) return [];
  const selectedOrder = new Map(selectedChartIds.map((chartId, index) => [chartId, index]));
  const rows = charts.map((chart, chartIndex) => {
    const variables = (chart.variables ?? []).map((variable) => variableAvailability(variable, period));
    const inPeriodCount = buildDefaultChronoLedger({
      pageCharts: [chart],
      period,
      timeZone,
    }).length;
    const selected = selectedOrder.has(chart.id);
    const needsAttention = selected && inPeriodCount === 0;
    return {
      chartId: chart.id,
      label: chart.label ?? chart.title ?? chart.id,
      pageId: chart.pageId ?? null,
      pageLabel: chart.pageLabel ?? chart.pageId ?? "Unknown page",
      sectionLabel: chart.sectionLabel ?? chart.sectionId ?? "Unknown section",
      otherGroupNames: clone(chart.otherGroupNames ?? []),
      periodStartEpochMs: period.startEpochMs,
      periodEndEpochMs: period.endEpochMs,
      selected,
      needsAttention,
      statusText: needsAttention
        ? "Needs attention — no observations in period"
        : `${inPeriodCount} ${inPeriodCount === 1 ? "observation" : "observations"} in period`,
      variables,
      variableCount: variables.length,
      fullRangeStartEpochMs: firstFinite(variables.map(({ earliestEpochMs }) => earliestEpochMs)),
      fullRangeEndEpochMs: lastFinite(variables.map(({ latestEpochMs }) => latestEpochMs)),
      note: chart.note ?? "Saved transformations and filters applied",
      sortIndex: selected ? selectedOrder.get(chart.id) : selectedChartIds.length + chartIndex,
      inPeriodCount,
    };
  }).filter(({ selected, inPeriodCount }) => selected || inPeriodCount > 0);

  rows.sort((left, right) => left.sortIndex - right.sortIndex);
  return rows.map(({ sortIndex, inPeriodCount, ...row }) => row);
}

function firstFinite(values) {
  const finite = values.filter(Number.isFinite);
  return finite.length > 0 ? Math.min(...finite) : null;
}

function lastFinite(values) {
  const finite = values.filter(Number.isFinite);
  return finite.length > 0 ? Math.max(...finite) : null;
}

export function groupAvailabilityRows(rows = []) {
  return {
    selected: rows.filter((row) => row.selected && !row.needsAttention),
    needsAttention: rows.filter((row) => row.needsAttention),
    available: rows.filter((row) => !row.selected && !row.needsAttention),
  };
}

function changed(state, value, additions = {}) {
  return {
    ...state,
    ...additions,
    value,
    status: "dirty",
    error: null,
    availabilityRows: availabilityFor(value, state.charts, state.timeZone),
  };
}

function availabilityFor(value, charts, timeZone) {
  return deriveAvailabilityRows({
    charts,
    period: value.period,
    selectedChartIds: value.chartIds,
    timeZone,
  });
}

function variableAvailability(variable, period) {
  const allEpochs = [...new Set((variable?.observations ?? [])
    .filter((observation) => (
      Number.isFinite(observation?.epochMs)
      && observation.value !== null
      && observation.value !== undefined
      && observation.available !== false
    ))
    .map(({ epochMs }) => epochMs))]
    .sort((left, right) => left - right);
  const ticks = allEpochs.filter((epochMs) => (
    epochMs >= period.startEpochMs && epochMs <= period.endEpochMs
  ));
  return {
    variableId: variable?.id,
    label: variable?.label ?? variable?.id,
    earliestEpochMs: allEpochs[0] ?? null,
    latestEpochMs: allEpochs.at(-1) ?? null,
    inPeriodCount: ticks.length,
    ticks,
  };
}

function normalizeSavedGroup(group) {
  return {
    id: group.id,
    name: group.name ?? "",
    period: clone(group.period ?? null),
    chartIds: clone(group.chartIds ?? []),
    defaultMatching: group.defaultMatching ?? MATCHING_POLICY_LABELS.CONCURRENT_ONLY,
    memberFallbacks: clone(group.memberFallbacks ?? {}),
    secondsPerFrame: group.secondsPerFrame ?? 1,
  };
}

function validPeriod(period) {
  return Boolean(
    period
    && Number.isFinite(period.startEpochMs)
    && Number.isFinite(period.endEpochMs)
    && period.endEpochMs >= period.startEpochMs,
  );
}

function assertStage(stage) {
  if (!CHRONO_GROUP_STAGES.includes(stage)) {
    throw new Error(`Unknown Chrono Group stage: ${String(stage)}`);
  }
}

function draftChanged(state) {
  return JSON.stringify(state.value) !== JSON.stringify(state.baseline)
    || state.sceneConsequences.length > 0;
}

function issue(code, message, focusId = null) {
  return { code, message, focusId, retryable: false };
}

function normalizeSaveError(error) {
  return {
    code: error?.code ?? "CHRONO_GROUP_SAVE_FAILED",
    message: error?.message ?? "The Chrono Group could not be saved.",
    focusId: error?.focusId ?? null,
    retryable: error?.retryable !== false,
  };
}

function withError(state, error) {
  return { ...state, status: "error", error };
}

function clone(value) {
  return value == null ? value : structuredClone(value);
}
