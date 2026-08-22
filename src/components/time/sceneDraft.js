import {
  normalizeSceneDefaults,
  validateScene,
} from "../../charting/time/sceneSchema.js";

export const SCENE_STAGES = Object.freeze(["select", "arrange"]);

const PRESENT_LAYOUTS = Object.freeze({ 1: "single", 2: "split", 3: "trio", 4: "quad" });

export function createSceneDraft(scene, validationContext = {}) {
  const baseline = clone(scene);
  return {
    baseline,
    value: clone(baseline),
    validationContext,
    stage: "select",
    status: "clean",
    error: null,
    findings: [],
    selectedChartId: null,
    activeBoard: "scene",
    restoration: null,
    suspendedStatus: null,
  };
}

export function reduceSceneDraft(state, action) {
  switch (action?.type) {
    case "SET_STAGE":
      assertStage(action.stage);
      return { ...state, stage: action.stage, error: null };
    case "SET_NAME":
      return update(state, (value) => { value.name = String(action.value ?? ""); });
    case "SET_CHRONO_GROUP":
      return update(state, (value) => { value.chronoGroupId = action.chronoGroupId; });
    case "SET_SCOPE":
      return update(state, (value) => {
        if (action.pageId !== undefined) value.pageId = action.pageId;
        if (action.period !== undefined) value.period = clone(action.period);
      });
    case "SET_FRAMES":
      return update(state, (value) => { value.frames = clone(action.value); });
    case "SET_SECONDS_PER_FRAME":
      return update(state, (value) => {
        if (action.value === undefined || action.value === "") delete value.secondsPerFrame;
        else value.secondsPerFrame = Number(action.value);
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
      stage: first.stage === "arrange" ? "arrange" : "select",
      status: "error",
      error: { code: "SCENE_NEEDS_ATTENTION", message: first.message ?? "Repair the Scene before saving.", retryable: false },
    };
  }
  try {
    validateScene(normalizeSceneDefaults(state.value), state.validationContext);
    return { ...state, status: "saving", error: null };
  } catch (error) {
    const stage = /member|Present|width|layout|Audience|secondsPerFrame|matching/i.test(error.message)
      ? "arrange"
      : "select";
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
  const offset = action.direction === "earlier" ? -1 : action.direction === "later" ? 1 : 0;
  const to = from + offset;
  if (from < 0 || !offset || to < 0 || to >= ids.length) return state;
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
