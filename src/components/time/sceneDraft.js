import {
  normalizeSceneDefaults,
  validateScene,
} from "../../charting/time/sceneSchema.js";

export const SCENE_STAGES = Object.freeze(["details", "select", "arrange"]);

const PRESENT_LAYOUTS = Object.freeze({ 1: "single", 2: "vertical-divider", 3: "large-left", 4: "grid-2x2" });

export function createSceneDraft(scene, validationContext = {}) {
  const baseline = clone(scene);
  return {
    baseline,
    value: clone(baseline),
    validationContext,
    stage: "details",
    status: "clean",
    error: null,
    findings: [],
    selectedChartId: null,
    activeBoard: "scene",
    restoration: null,
    suspendedStatus: null,
    frameChoices: {
      calendar: baseline?.frames?.mode === "calendar" ? clone(baseline.frames) : { mode: "calendar", interval: { value: 1, unit: "day" } },
      source: baseline?.frames?.mode === "source" ? clone(baseline.frames) : null,
    },
  };
}

export function reduceSceneDraft(state, action) {
  switch (action?.type) {
    case "SET_STAGE":
      assertStage(action.stage);
      return { ...state, stage: action.stage, error: null };
    case "SET_NAME":
      return update(state, (value) => { value.name = String(action.value ?? ""); });
    case "SET_PAGE":
      return setScenePage(state, action.pageId);
    case "SET_CHRONO_GROUP":
      return setSceneChronoGroup(state, action.chronoGroupId);
    case "SET_SCOPE":
      return update(state, (value) => {
        if (action.pageId !== undefined) value.pageId = action.pageId;
        if (action.period !== undefined) value.period = clone(action.period);
      });
    case "SET_PERIOD":
      return setScenePeriod(state, action.start, action.end);
    case "SET_FRAMES":
      return update(state, (value) => { value.frames = clone(action.value); });
    case "SET_FRAME_MODE":
      return setFrameMode(state, action.mode);
    case "SET_CALENDAR_INTERVAL":
      return updateFrames(state, (frames) => {
        frames.mode = "calendar";
        delete frames.chartId;
        delete frames.selection;
        delete frames.selectedEpochs;
        frames.interval = {
          value: Number(action.value),
          unit: action.unit ?? frames.interval?.unit ?? "day",
        };
      });
    case "SET_FRAME_SOURCE":
      return updateFrames(state, (_frames, value) => {
        value.frames = { mode: "source", chartId: action.chartId, selection: "all" };
      });
    case "SET_FRAME_SELECTION":
      return updateFrames(state, (frames) => {
        frames.selection = action.selection;
        if (action.selection === "selected") frames.selectedEpochs = clone(action.selectedEpochs ?? frames.selectedEpochs ?? []);
        else delete frames.selectedEpochs;
      });
    case "SET_SECONDS_PER_FRAME":
      return update(state, (value) => {
        if (action.value === undefined || action.value === "") delete value.secondsPerFrame;
        else value.secondsPerFrame = Number(action.value);
      });
    case "SET_DEFAULT_MATCHING":
      return update(state, (value) => {
        if (action.matching === undefined || action.matching === "authored") delete value.defaultMatching;
        else value.defaultMatching = action.matching;
      });
    case "SET_DATE_POSITION":
      return update(state, (value) => {
        value.audience = { ...(value.audience ?? {}), datePosition: clone(action.value) };
      });
    case "SET_WIDTH":
      return updateMember(state, action.chartId, (member) => { member.width = Number(action.width); });
    case "SET_MATCHING":
      return updateMember(state, action.chartId, (member) => {
        if (action.matching === undefined || action.matching === "authored") delete member.matching;
        else member.matching = action.matching;
      });
    case "ADD_MEMBER":
      if (state.value.members.some(({ chartId }) => chartId === action.chartId)) return state;
      return update(state, (value) => {
        value.members.push({ chartId: action.chartId, width: action.width ?? 1 });
        if (value.members.length <= 4) {
          value.present.chartIds.push(action.chartId);
          value.present.layout = PRESENT_LAYOUTS[value.present.chartIds.length];
        }
      });
    case "REMOVE_MEMBER": {
      if (state.value.members.length === 1) {
        return withError(state, "SCENE_MEMBER_REQUIRED", "A Scene must retain at least one chart.");
      }
      return update(state, (value) => {
        value.members = value.members.filter(({ chartId }) => chartId !== action.chartId);
        value.present.chartIds = value.present.chartIds.filter((chartId) => chartId !== action.chartId);
        value.present.layout = PRESENT_LAYOUTS[value.present.chartIds.length];
        if (value.frames?.mode === "source" && value.frames.chartId === action.chartId) {
          value.frames = { mode: "source", chartId: value.members[0].chartId, selection: "all" };
        }
      });
    }
    case "TOGGLE_PRESENT":
      return update(state, (value) => {
        const included = value.present.chartIds.includes(action.chartId);
        if (included) value.present.chartIds = value.present.chartIds.filter((id) => id !== action.chartId);
        else if (value.present.chartIds.length < 4) value.present.chartIds.push(action.chartId);
        value.present.layout = PRESENT_LAYOUTS[value.present.chartIds.length];
      });
    case "SET_PRESENT_LAYOUT":
      return update(state, (value) => { value.present.layout = action.layout; });
    case "MOVE_CHART":
      return moveChart(state, action);
    case "SELECT_CHART":
      return { ...state, selectedChartId: action.chartId ?? null, activeBoard: action.board ?? state.activeBoard };
    case "SET_NEEDS_ATTENTION":
      return { ...state, findings: clone(action.findings ?? []), error: null };
    case "SAVE_REQUEST":
      return requestSave(state);
    case "SAVE_SUCCEEDED": {
      const committed = clone(action.savedValue ?? state.value);
      return {
        ...state,
        baseline: committed,
        value: clone(committed),
        status: "clean",
        error: null,
        findings: [],
      };
    }
    case "SAVE_FAILED":
      return {
        ...state,
        status: "error",
        error: {
          code: action.error?.code ?? "SCENE_SAVE_FAILED",
          message: action.error?.message ?? "The Scene could not be saved.",
          retryable: action.error?.retryable !== false,
        },
      };
    case "DISCARD":
      return {
        ...state,
        value: clone(state.baseline),
        status: "clean",
        error: null,
        findings: [],
        selectedChartId: null,
      };
    case "STAY":
      return { ...state, status: changed(state) ? "dirty" : "clean", error: null };
    case "SUSPEND":
      return {
        ...state,
        status: "suspended",
        suspendedStatus: state.status,
        restoration: clone(action.restoration ?? state.restoration),
      };
    case "RESUME":
      return {
        ...state,
        stage: state.restoration?.stage ?? state.stage,
        status: state.suspendedStatus ?? (changed(state) ? "dirty" : "clean"),
        suspendedStatus: null,
      };
    default:
      throw new Error(`Unknown Scene draft action: ${String(action?.type)}`);
  }
}

export function partitionSceneCharts(charts = [], members = []) {
  const selectedIds = new Set(members.map(({ chartId }) => chartId));
  return {
    selected: charts.filter((chart) => selectedIds.has(chart.id) && chart.needsAttention !== true),
    needsAttention: charts.filter((chart) => selectedIds.has(chart.id) && chart.needsAttention === true),
    available: charts.filter((chart) => !selectedIds.has(chart.id)),
  };
}

function requestSave(state) {
  if (state.findings.length > 0) {
    const first = state.findings[0];
    return {
      ...state,
      stage: first.stage === "arrange" ? "arrange" : first.stage === "details" ? "details" : "select",
      status: "error",
      error: { code: "SCENE_NEEDS_ATTENTION", message: first.message ?? "Repair the Scene before saving.", retryable: false },
    };
  }
  try {
    validateScene(normalizeSceneDefaults(state.value), state.validationContext);
    return { ...state, status: "saving", error: null };
  } catch (error) {
    const stage = /Present|width|layout|Audience/i.test(error.message)
      ? "arrange"
      : /member|frame source|observation/i.test(error.message)
        ? "select"
        : "details";
    return {
      ...state,
      stage,
      status: "error",
      error: { code: "SCENE_INVALID", message: error.message, retryable: false },
    };
  }
}

function moveChart(state, action) {
  const ids = action.board === "present"
    ? state.value.present.chartIds
    : state.value.members.map(({ chartId }) => chartId);
  const from = ids.indexOf(action.chartId);
  let to = Number.isInteger(action.targetIndex) ? action.targetIndex : from;
  if (action.direction === "earlier") to = from - 1;
  if (action.direction === "later") to = from + 1;
  if (action.direction === "first") to = 0;
  if (action.direction === "last") to = ids.length - 1;
  if (from < 0 || to === from || to < 0 || to >= ids.length) return state;
  return update(state, (value) => {
    if (action.board === "present") {
      const [moved] = value.present.chartIds.splice(from, 1);
      value.present.chartIds.splice(to, 0, moved);
      return;
    }
    const [moved] = value.members.splice(from, 1);
    value.members.splice(to, 0, moved);
  });
}

function setScenePage(state, pageId) {
  const currentGroup = findGroup(state, state.value.chronoGroupId);
  const currentGroupSupportsPage = currentGroup && eligibleGroupCharts(state, currentGroup, pageId).length > 0;
  if (currentGroupSupportsPage) {
    const pageState = update(state, (value) => { value.pageId = pageId; });
    return setSceneChronoGroup(pageState, currentGroup.id);
  }
  return update(state, (value) => {
    value.pageId = pageId;
    value.chronoGroupId = null;
    value.members = [];
    value.present = { chartIds: [], layout: PRESENT_LAYOUTS[0] };
    value.frames = { mode: "calendar", interval: { value: 1, unit: "day" } };
  });
}

function setSceneChronoGroup(state, chronoGroupId) {
  const group = findGroup(state, chronoGroupId);
  if (!group) return update(state, (value) => { value.chronoGroupId = chronoGroupId; });
  const eligible = eligibleGroupCharts(state, group, state.value.pageId);
  const currentWidths = new Map((state.value.members ?? []).map(({ chartId, width }) => [chartId, width]));
  const members = eligible.map(({ id }) => ({ chartId: id, width: currentWidths.get(id) ?? 1 }));
  return update(state, (value) => {
    value.chronoGroupId = chronoGroupId;
    value.period = scenePeriodFromGroup(group.period);
    value.members = members;
    value.present = {
      chartIds: members.slice(0, 4).map(({ chartId }) => chartId),
      layout: PRESENT_LAYOUTS[Math.min(members.length, 4)],
    };
    const sourceStillExists = members.some(({ chartId }) => chartId === value.frames?.chartId);
    if (value.frames?.mode === "source" && !sourceStillExists) {
      value.frames = members[0]
        ? { mode: "source", chartId: members[0].chartId, selection: "all" }
        : { mode: "calendar", interval: { value: 1, unit: "day" } };
    }
  });
}

function setScenePeriod(state, start, end) {
  const group = findGroup(state, state.value.chronoGroupId);
  const maximum = comparablePeriod(group?.period);
  const startEpochMs = Date.parse(`${start}T00:00:00.000Z`);
  const endEpochMs = Date.parse(`${end}T23:59:59.999Z`);
  if (!Number.isFinite(startEpochMs) || !Number.isFinite(endEpochMs) || endEpochMs < startEpochMs) {
    return withError(state, "SCENE_PERIOD_INVALID", "Choose a valid inclusive Scene period.");
  }
  if (maximum && (startEpochMs < maximum.start || endEpochMs > maximum.end)) {
    return withError(state, "SCENE_PERIOD_OUTSIDE_GROUP", "Scene period must remain inside the parent Chrono Group period.");
  }
  return update(state, (value) => {
    value.period = {
      start: `${start}T00:00:00.000Z`,
      end: `${end}T23:59:59.999Z`,
    };
  });
}

function setFrameMode(state, mode) {
  if (mode !== "calendar" && mode !== "source") throw new Error(`Unknown Scene frame mode: ${String(mode)}`);
  const frameChoices = { ...state.frameChoices, [state.value.frames?.mode ?? "calendar"]: clone(state.value.frames) };
  const fallbackSource = state.value.members?.[0]?.chartId
    ? { mode: "source", chartId: state.value.members[0].chartId, selection: "all" }
    : { mode: "source", chartId: null, selection: "all" };
  const nextFrames = clone(frameChoices[mode] ?? (mode === "calendar" ? { mode: "calendar", interval: { value: 1, unit: "day" } } : fallbackSource));
  frameChoices[mode] = clone(nextFrames);
  return { ...update(state, (value) => { value.frames = nextFrames; }), frameChoices };
}

function updateFrames(state, updater) {
  const next = update(state, (value) => {
    value.frames ??= { mode: "calendar", interval: { value: 1, unit: "day" } };
    updater(value.frames, value);
  });
  return {
    ...next,
    frameChoices: { ...state.frameChoices, [next.value.frames.mode]: clone(next.value.frames) },
  };
}

function findGroup(state, id) {
  return state.validationContext?.chronoGroups?.find((group) => group.id === id) ?? null;
}

function eligibleGroupCharts(state, group, pageId) {
  const groupIds = new Set(group.chartIds ?? group.members?.map(({ chartId }) => chartId) ?? []);
  return (state.validationContext?.charts ?? []).filter((chart) => (
    groupIds.has(chart.id) && (chart.pageId ?? chart.page?.id) === pageId
  ));
}

function scenePeriodFromGroup(period) {
  if (typeof period?.start === "string" && typeof period?.end === "string" && /^\d{4}-\d{2}-\d{2}$/.test(period.start) && /^\d{4}-\d{2}-\d{2}$/.test(period.end)) {
    return { start: `${period.start}T00:00:00.000Z`, end: `${period.end}T23:59:59.999Z` };
  }
  return clone(period);
}

function comparablePeriod(period) {
  if (!period) return null;
  const start = Number.isFinite(period.startEpochMs)
    ? period.startEpochMs
    : Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(period.start ?? "") ? `${period.start}T00:00:00.000Z` : period.start);
  const end = Number.isFinite(period.endEpochMs)
    ? period.endEpochMs
    : Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(period.end ?? "") ? `${period.end}T23:59:59.999Z` : period.end);
  return Number.isFinite(start) && Number.isFinite(end) ? { start, end } : null;
}

function updateMember(state, chartId, updater) {
  if (!state.value.members.some((member) => member.chartId === chartId)) {
    return withError(state, "SCENE_CHART_MISSING", "The selected Scene chart no longer exists.");
  }
  return update(state, (value) => updater(value.members.find((member) => member.chartId === chartId)));
}

function update(state, updater) {
  const value = clone(state.value);
  updater(value);
  return { ...state, value, status: "dirty", error: null };
}

function withError(state, code, message) {
  return { ...state, status: "error", error: { code, message, retryable: false } };
}

function assertStage(stage) {
  if (!SCENE_STAGES.includes(stage)) throw new Error(`Unknown Scene stage: ${String(stage)}`);
}

function changed(state) {
  return JSON.stringify(state.baseline) !== JSON.stringify(state.value);
}

function clone(value) {
  return value == null ? value : structuredClone(value);
}
