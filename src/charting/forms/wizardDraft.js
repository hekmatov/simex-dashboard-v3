import {
  createChartDraft,
  normalizeChartInstance,
  validateChartInstance,
} from "../config/chartConfigV3.js";
import {
  canonicalColumnType,
  resolveBindingValue,
  resolveEffectiveBinding,
} from "../data/bindings.js";
import { parseTemporalValue } from "../data/temporal.js";
import { getChartSchema } from "../schemas/chartSchemaRegistry.js";
import { validateChronoGroups } from "../time/chronoGroupModel.js";

export const WIZARD_STEPS = Object.freeze([
  "source",
  "type",
  "roles",
  "style",
]);

export const CHART_CREATION_STAGES = Object.freeze([
  "destination",
  "data-source",
  "chart-type",
  "map-and-prepare-data",
  "configure-chart",
  "review-and-create",
]);

export const CHART_CREATION_STAGE_LABELS = Object.freeze([
  "Destination",
  "Data source",
  "Chart type",
  "Map and prepare",
  "Configure",
  "Review",
]);

const CHART_CREATION_STATUSES = new Set([
  "editing",
  "validating",
  "committing",
  "failed",
  "ambiguous",
  "committed",
]);

const DANGEROUS_PATH_SEGMENTS = new Set([
  "__proto__",
  "prototype",
  "constructor",
]);
const finalizedWizardResults = new WeakSet();

export function isFinalizedWizardResult(value) {
  return Boolean(value && typeof value === "object" && finalizedWizardResults.has(value));
}

export function createWizardState(options = {}) {
  if (!isRecord(options)) {
    throw new TypeError("Wizard state options must be an object.");
  }
  const sourceSelection = initialSourceSelection(options);
  const state = {
    draftId: options.draftId ?? options.draft?.id ?? null,
    stage: CHART_CREATION_STAGES.includes(options.stage)
      ? options.stage
      : "destination",
    status: CHART_CREATION_STATUSES.has(options.status)
      ? options.status
      : "editing",
    destination: cloneOptional(options.destination),
    chartTypeId: options.chartTypeId ?? options.draft?.typeId ?? null,
    profileRevision: options.profileRevision ?? null,
    mapping: cloneOptional(options.mapping),
    preparation: cloneOptional(options.preparation),
    configuration: cloneOptional(options.configuration),
    companions: structuredClone(options.companions ?? []),
    renderProofRevision: options.renderProofRevision ?? null,
    placementProofRevision: options.placementProofRevision ?? null,
    dashboardRevision: options.dashboardRevision ?? null,
    errors: structuredClone(options.errors ?? []),
    suspension: cloneOptional(options.suspension),
    handoff: cloneOptional(options.handoff),
    discarded: options.discarded === true,
    activeStep: WIZARD_STEPS.includes(options.activeStep)
      ? options.activeStep
      : "source",
    draft: options.draft ? structuredClone(options.draft) : null,
    sourceSelection,
    source: options.source === undefined
      ? cloneOptional(sourceSelection?.source)
      : structuredClone(options.source),
    chronoGroups: structuredClone(options.chronoGroups ?? []),
    chronoGroupsProvided: Object.hasOwn(options, "chronoGroups"),
    charts: normalizeExistingCharts(options.charts ?? []),
    loadedData: options.loadedData ?? {},
    profiles: options.profiles ?? {},
    confirmation: null,
    pendingSourceChange: null,
    closed: false,
  };
  return withStageStatuses(state);
}

export function reduceWizardState(state, action) {
  assertState(state);
  if (!isRecord(action) || typeof action.type !== "string") {
    throw new TypeError("Wizard actions require a type.");
  }
  if (state.status === "ambiguous" && action.type !== "reconciled") {
    return state;
  }
  if (state.status === "committed") return state;
  if (state.status === "committing" && action.type !== "commitResult") {
    return state;
  }

  switch (action.type) {
    case "start":
      requiredString(action.draftId, "Chart draft id");
      return chartState(state, {
        draftId: action.draftId,
        dashboardRevision: action.dashboardRevision ?? state.dashboardRevision,
        status: "editing",
        discarded: false,
      });
    case "suspend": {
      const restoration = normalizeRestoration(action.restoration, state.stage);
      return chartState(state, {
        suspension: {
          reason: "in-app",
          restoration,
          resumeFocusId: resolveResumeFocus(state, restoration),
        },
      });
    }
    case "resume": {
      const restoration = state.suspension?.restoration;
      return chartState(state, {
        stage: CHART_CREATION_STAGES.includes(restoration?.stage)
          ? restoration.stage
          : state.stage,
        suspension: state.suspension
          ? { ...state.suspension, resumed: true }
          : null,
      });
    }
    case "setDestination":
      return chartState(state, {
        destination: cloneOptional(action.destination),
        status: "editing",
        discarded: false,
      });
    case "setChartType":
      requiredString(action.chartTypeId, "Chart type id");
      return chartState(state, {
        chartTypeId: action.chartTypeId,
        chartTypeRevision: action.schemaRevision ?? null,
        status: "editing",
        discarded: false,
      });
    case "setSource":
      return chartState(state, {
        source: cloneOptional(action.source),
        profileRevision: null,
        status: "editing",
        discarded: false,
      });
    case "profileSucceeded":
      return chartState(state, {
        profileRevision: action.profile?.revision ?? null,
        status: "editing",
        errors: withoutErrorCode(state.errors, "PROFILE_DRIFT"),
      });
    case "profileDrifted":
      return chartState(state, {
        status: "failed",
        errors: [{
          code: "PROFILE_DRIFT",
          stage: "data-source",
          currentRevision: action.currentRevision,
          focusId: "chart-draft-data-source",
        }],
      });
    case "setMapping":
      return chartState(state, {
        mapping: cloneOptional(action.mapping),
        status: "editing",
        discarded: false,
      });
    case "setPreparation":
      return chartState(state, {
        preparation: cloneOptional(action.preparation),
        status: "editing",
        discarded: false,
      });
    case "setConfiguration":
      return chartState(state, {
        configuration: cloneOptional(action.configuration),
        status: "editing",
        discarded: false,
      });
    case "setCompanionOutcome":
      return chartState(state, {
        companions: replaceCompanionOutcome(state.companions, action.outcome),
        status: "editing",
        discarded: false,
      });
    case "reviseRenderProof":
      return chartState(state, {
        renderProofRevision: action.proof?.revision ?? null,
        status: "editing",
      });
    case "revisePlacementProof":
      return chartState(state, {
        placementProofRevision: action.proof?.revision ?? null,
        status: "editing",
      });
    case "setStage":
      assertChartCreationStage(action.stage);
      return chartState(state, { stage: action.stage });
    case "back": {
      const index = CHART_CREATION_STAGES.indexOf(state.stage);
      return index <= 0
        ? state
        : chartState(state, { stage: CHART_CREATION_STAGES[index - 1] });
    }
    case "revalidate":
      return chartState(state, {
        status: action.result?.ok === true ? "editing" : "failed",
        errors: structuredClone(action.result?.errors ?? []),
      });
    case "commitStarted":
      requiredString(action.transactionId, "Chart creation transaction id");
      return chartState(state, {
        status: "committing",
        errors: [],
        handoff: {
          ...(state.handoff ?? {}),
          transactionId: action.transactionId,
        },
      });
    case "commitResult":
      return applyCommitResult(state, action.result);
    case "reconciled":
      return applyReconciliation(state, action.result);
    case "discard":
      return discardSessionDraft(state);
    case "navigate":
      return navigate(state, action.step);
    case "selectType":
      return selectType(state, action);
    case "selectSource":
      return selectSource(state, action);
    case "requestSourceChange":
      return requestSourceChange(state, action);
    case "confirmSourceChange":
      return confirmSourceChange(state);
    case "updateRole":
      return updateRole(state, action);
    case "updateChart":
      return updateChart(state, action);
    case "updatePresentation":
      return updatePresentation(state, action);
    case "updateTimeSyncMembership":
      return updateTimeSyncMembership(state, action);
    case "updateTimeSyncMember":
      return updateTimeSyncMember(state, action);
    case "updateChronoGroup":
      return updateChronoGroup(state, action);
    case "updateChronoGroups":
      return updateChronoGroups(state, action);
    case "requestClearSource":
      return { ...state, confirmation: "clearSource" };
    case "confirmClearSource":
      return confirmClearSource(state);
    case "requestClose":
      return { ...state, confirmation: "discardChart" };
    case "confirmClose":
      return state.confirmation === "discardChart"
        ? { ...state, confirmation: null, closed: true }
        : state;
    case "cancelConfirmation":
      return {
        ...state,
        confirmation: null,
        pendingSourceChange: null,
      };
    default:
      throw new Error(`Unknown wizard action "${action.type}".`);
  }
}

export function finalizeWizardDraft(state) {
  assertState(state);
  if (!state.draft) {
    throw new Error("Choose a chart type before creating the chart.");
  }
  const profile = profileForChart(state.profiles, state.draft);
  const chart = materializeTemporalXAxisSemantics(
    normalizeChartInstance(state.draft),
    profile,
  );
  validateChartInstance(chart, {
    columnTypes: profileColumnMap(profile),
  });

  const result = { chart };
  if (state.source !== null && state.source !== undefined) {
    result.source = structuredClone(state.source);
  }
  if (state.chronoGroupsProvided || state.chronoGroups.length > 0) {
    validateProposedGroups(state, state.chronoGroups, chart);
    result.chronoGroups = structuredClone(state.chronoGroups);
  }
  finalizedWizardResults.add(result);
  return result;
}

function materializeTemporalXAxisSemantics(chart, profileEntry) {
  const xAxis = chart.presentation?.axes?.x;
  if (xAxis?.labelPreset === "adaptive") {
    delete xAxis.labelPreset;
    if (Object.keys(xAxis).length === 0) delete chart.presentation.axes.x;
    if (Object.keys(chart.presentation.axes).length === 0) delete chart.presentation.axes;
  }
  if (xAxis?.hoverLabelPreset === "auto") {
    delete xAxis.hoverLabelPreset;
    if (Object.keys(xAxis).length === 0) delete chart.presentation.axes.x;
    if (Object.keys(chart.presentation.axes).length === 0) delete chart.presentation.axes;
  }
  if (!hasTemporalXAxisSemantics(xAxis)) return chart;
  const binding = chart.roles?.observation;
  if (!isRecord(binding) || binding.interpretation !== undefined) return chart;
  const column = profileColumnMap(profileEntry)?.get(binding.field);
  if (resolveEffectiveBinding(binding, column).type === "temporal") {
    chart.roles.observation = {
      ...binding,
      interpretation: "temporal",
    };
  }
  return chart;
}

function hasTemporalXAxisSemantics(xAxis) {
  if (!isRecord(xAxis)) return false;
  return nonEmptyString(xAxis.labelPreset)
    || nonEmptyString(xAxis.hoverLabelPreset)
    || nonEmptyString(xAxis.tickFrequency?.unit)
    || [xAxis.min, xAxis.max].some((value) => typeof value === "string");
}

export function deriveChartCreationStageStatuses(state) {
  const errorsByStage = new Set(
    (state.errors ?? []).map(({ stage }) => stage).filter(Boolean),
  );
  const result = {};
  const destinationComplete = meaningfulValue(state.destination);
  result.destination = stageStatus(state, "destination", {
    complete: destinationComplete,
    waiting: false,
    needsAttention: errorsByStage.has("destination"),
  });

  const selectedSourceId = state.sourceSelection?.sourceId ?? state.draft?.sourceId;
  const selectedProfile = state.sourceSelection?.profile
    ?? collectionEntry(state.profiles, selectedSourceId);
  const sourceComplete = destinationComplete
    && meaningfulValue(selectedSourceId)
    && meaningfulValue(selectedProfile);
  result["data-source"] = stageStatus(state, "data-source", {
    complete: sourceComplete,
    waiting: !destinationComplete,
    needsAttention: errorsByStage.has("data-source"),
  });

  const chartTypeComplete = sourceComplete && meaningfulValue(state.chartTypeId);
  result["chart-type"] = stageStatus(state, "chart-type", {
    complete: chartTypeComplete,
    waiting: !sourceComplete,
    needsAttention: errorsByStage.has("chart-type"),
  });

  const mappingComplete = chartTypeComplete
    && meaningfulValue(state.mapping)
    && meaningfulValue(state.preparation);
  result["map-and-prepare-data"] = stageStatus(state, "map-and-prepare-data", {
    complete: mappingComplete,
    waiting: !chartTypeComplete,
    needsAttention: errorsByStage.has("map-and-prepare-data"),
  });

  const configurationComplete = mappingComplete && meaningfulValue(state.configuration);
  result["configure-chart"] = stageStatus(state, "configure-chart", {
    complete: configurationComplete,
    waiting: !mappingComplete,
    needsAttention: errorsByStage.has("configure-chart"),
  });

  result["review-and-create"] = stageStatus(state, "review-and-create", {
    complete: state.status === "committed",
    waiting: !configurationComplete,
    needsAttention: errorsByStage.has("review-and-create")
      || state.status === "ambiguous",
  });
  return result;
}

function navigate(state, step) {
  if (!WIZARD_STEPS.includes(step)) {
    throw new Error(`Unknown wizard step "${step}".`);
  }
  return { ...state, activeStep: step };
}

function selectType(state, action) {
  if (typeof action.typeId !== "string" || action.typeId.trim() === "") {
    throw new Error("A chart type is required.");
  }
  getChartSchema(action.typeId);
  const overrides = isRecord(action.chart) ? action.chart : {};
  const previousDraftId = state.draft?.id ?? null;
  const draftId = overrides.id ?? previousDraftId;
  const sourceSelection = state.sourceSelection
    ?? selectionFromDraftState(state);
  const sourceId = sourceSelection?.sourceId ?? null;
  const groups = previousDraftId
    ? removeChartFromGroups(state.chronoGroups, previousDraftId)
    : state.chronoGroups;
  return withStageStatuses({
    ...state,
    activeStep: sourceId ? "roles" : "source",
    stage: sourceId ? "map-and-prepare-data" : "data-source",
    chartTypeId: action.typeId,
    chartTypeRevision: action.schemaRevision ?? state.chartTypeRevision ?? null,
    discarded: false,
    draft: createChartDraft(action.typeId, {
      ...overrides,
      ...(draftId ? { id: draftId } : {}),
      ...(sourceId ? { sourceId } : {}),
    }),
    sourceSelection,
    source: sourceSelection?.source ?? state.source,
    chronoGroups: groups,
    chronoGroupsProvided: state.chronoGroupsProvided
      || groups !== state.chronoGroups,
    confirmation: null,
    pendingSourceChange: null,
    closed: false,
  });
}

function selectSource(state, action) {
  if (typeof action.sourceId !== "string" || action.sourceId.trim() === "") {
    throw new Error("A data source id is required.");
  }
  return applySourceChange(state, sourceChange(action), { clearMappings: false });
}

function requestSourceChange(state, action) {
  requiredString(action.sourceId, "Data source id");
  const change = sourceChange(action);
  const draft = state.draft;
  if (!draft) {
    return applySourceChange(state, change, { clearMappings: false });
  }
  if (
    action.sourceId === draft.sourceId
    || !hasSourceMappings(draft)
    || sourceMappingsAreCompatible(draft, change.profile)
  ) {
    return applySourceChange(state, change, { clearMappings: false });
  }
  const roleCount = assignedRoleCount(draft);
  const filterCount = assignedFilterCount(draft);
  return {
    ...state,
    confirmation: "changeSource",
    pendingSourceChange: {
      ...change,
      message: [
        `Changing this source will clear ${roleCount} data ${
          roleCount === 1 ? "role" : "roles"
        }`,
        `and ${filterCount} ${filterCount === 1 ? "filter" : "filters"}`,
        "because their columns are not compatible with the new data.",
      ].join(" "),
    },
  };
}

function confirmSourceChange(state) {
  if (
    state.confirmation !== "changeSource"
    || !isRecord(state.pendingSourceChange)
  ) {
    return state;
  }
  return applySourceChange(state, state.pendingSourceChange, {
    clearMappings: true,
  });
}

function updateRole(state, action) {
  const draft = requireDraft(state);
  const schema = getChartSchema(draft.typeId);
  if (!schema.roles.some(({ id }) => id === action.roleId)) {
    throw new Error(
      `Unknown role "${action.roleId}" for chart type "${draft.typeId}".`,
    );
  }
  const roles = { ...draft.roles };
  if (action.value === undefined || action.value === null) {
    delete roles[action.roleId];
  } else {
    roles[action.roleId] = structuredClone(action.value);
  }
  return {
    ...state,
    draft: {
      ...draft,
      roles,
    },
  };
}

function updateChart(state, action) {
  const draft = requireDraft(state);
  return {
    ...state,
    draft: setAtPath(draft, action.path, action.value),
  };
}

function updatePresentation(state, action) {
  const path = Array.isArray(action.path)
    && action.path[0] === "presentation"
    ? action.path
    : ["presentation", ...(action.path ?? [])];
  return updateChart(state, { ...action, path });
}

function updateTimeSyncMembership(state, action) {
  const value = action.groupId === null
    ? null
    : { groupId: action.groupId };
  return updateChart(state, {
    type: "updateChart",
    path: ["interaction", "timeSync"],
    value,
  });
}

function updateTimeSyncMember(state, action) {
  const target = semanticTarget(action.target, "member");
  if (target.property !== "matching") {
    throw new Error(
      `Unsupported time synchronization member property "${target.property}".`,
    );
  }
  const groupIndex = state.chronoGroups
    .findIndex(({ id }) => id === target.groupId);
  if (groupIndex < 0) {
    throw new Error(
      `Unknown Chrono Group "${target.groupId}".`,
    );
  }
  const group = state.chronoGroups[groupIndex];
  const memberIndex = group.members
    .findIndex(({ chartId }) => chartId === target.chartId);
  if (memberIndex < 0) {
    throw new Error(
      `Unknown member chart "${target.chartId}" in Chrono Group "${target.groupId}".`,
    );
  }

  const member = { ...group.members[memberIndex] };
  if (action.value === undefined) {
    delete member[target.property];
  } else {
    member[target.property] = structuredClone(action.value);
  }
  const members = group.members.map((value, index) => (
    index === memberIndex ? member : value
  ));
  const groups = state.chronoGroups.map((value, index) => (
    index === groupIndex ? { ...group, members } : value
  ));
  validateProposedGroups(state, groups);
  return {
    ...state,
    chronoGroups: groups,
    chronoGroupsProvided: true,
  };
}

function updateChronoGroup(state, action) {
  const target = semanticTarget(action.target, "group");
  if (target.property !== "matching") {
    throw new Error(
      `Unsupported Chrono Group property "${target.property}".`,
    );
  }
  const groupIndex = state.chronoGroups
    .findIndex(({ id }) => id === target.groupId);
  if (groupIndex < 0) {
    throw new Error(
      `Unknown Chrono Group "${target.groupId}".`,
    );
  }
  const groups = state.chronoGroups.map((group, index) => (
    index === groupIndex
      ? { ...group, [target.property]: structuredClone(action.value) }
      : group
  ));
  validateProposedGroups(state, groups);
  return {
    ...state,
    chronoGroups: groups,
    chronoGroupsProvided: true,
  };
}

function updateChronoGroups(state, action) {
  if (!Array.isArray(action.value)) {
    throw new TypeError("Chrono Group updates must be an array.");
  }
  const groups = structuredClone(action.value);
  validateProposedGroups(state, groups);
  return {
    ...state,
    chronoGroups: groups,
    chronoGroupsProvided: true,
  };
}

function confirmClearSource(state) {
  if (state.confirmation !== "clearSource") return state;
  const draft = state.draft;
  return withStageStatuses({
    ...state,
    draft: draft
      ? {
          ...draft,
          sourceId: null,
          roles: {},
        }
      : null,
    sourceSelection: null,
    source: null,
    confirmation: null,
    pendingSourceChange: null,
  });
}

function validateProposedGroups(state, groups, draft = state.draft) {
  validateChronoGroups(groups, {
    charts: chartsForValidation(state.charts, draft),
    loadedData: state.loadedData,
    profiles: state.profiles,
  });
}

function chartsForValidation(charts, draft) {
  const result = normalizeExistingCharts(charts)
    .filter(({ id }) => id !== draft?.id);
  if (draft) result.push(normalizeChartInstance(draft));
  return result;
}

function normalizeExistingCharts(charts) {
  if (!Array.isArray(charts)) return [];
  const byId = new Map();
  for (const chart of charts) {
    const normalized = normalizeChartInstance(chart);
    byId.set(normalized.id, normalized);
  }
  return [...byId.values()];
}

function removeChartFromGroups(groups, chartId) {
  let changed = false;
  const next = groups.flatMap((group) => {
    const members = Array.isArray(group.members)
      ? group.members.filter((member) => member.chartId !== chartId)
      : [];
    if (members.length === (group.members?.length ?? 0)) return [group];
    changed = true;
    return members.length > 0 ? [{ ...group, members }] : [];
  });
  return changed ? next : groups;
}

function sourceChange(action) {
  return {
    sourceId: action.sourceId,
    kind: nonEmptyString(action.kind) ? action.kind : null,
    source: action.source === undefined
      ? undefined
      : structuredClone(action.source),
    rows: action.rows === undefined
      ? undefined
      : structuredClone(action.rows),
    profile: action.profile === undefined
      ? undefined
      : structuredClone(action.profile),
  };
}

function applySourceChange(state, change, { clearMappings }) {
  const draft = state.draft;
  const transformations = clearMappings && draft
    ? {
        ...draft.transformations,
        filters: [],
        grouping: null,
      }
    : draft?.transformations;
  const sourceSelection = selectionFromChange(state, change);
  return withStageStatuses({
    ...state,
    draft: draft
      ? {
          ...draft,
          sourceId: change.sourceId,
          roles: clearMappings ? {} : draft.roles,
          transformations,
        }
      : null,
    sourceSelection,
    source: change.source === undefined
      ? state.source
      : structuredClone(change.source),
    loadedData: change.rows === undefined
      ? state.loadedData
      : collectionWithEntry(state.loadedData, change.sourceId, change.rows),
    profiles: change.profile === undefined
      ? state.profiles
      : collectionWithEntry(state.profiles, change.sourceId, change.profile),
    confirmation: null,
    pendingSourceChange: null,
  });
}

function sourceMappingsAreCompatible(draft, profile) {
  if (!Array.isArray(profile?.columns)) return false;
  const schema = getChartSchema(draft.typeId);
  const columns = new Map(profile.columns.map((column) => [
    column.name,
    column,
  ]));
  for (const role of schema.roles) {
    const value = draft.roles?.[role.id];
    const bindings = Array.isArray(value)
      ? value
      : value ? [value] : [];
    for (const binding of bindings) {
      const column = columns.get(binding?.field);
      if (!column) return false;
      const effectiveType = resolveEffectiveBinding(binding, column).type
        ?? canonicalColumnType(column.type);
      if (
        !bindingHasCompatibleProfileEvidence(binding, column, effectiveType)
        || (
          !role.accepts.includes("any")
          && !role.accepts.includes(effectiveType)
        )
      ) {
        return false;
      }
    }
  }
  for (const filter of draft.transformations?.filters ?? []) {
    if (!columns.has(filter?.field)) return false;
  }
  for (const field of draft.transformations?.grouping ?? []) {
    if (!columns.has(field)) return false;
  }
  return true;
}

function bindingHasCompatibleProfileEvidence(binding, column, effectiveType) {
  if (!["temporal", "number", "boolean"].includes(effectiveType)) return true;
  const values = presentProfileEvidence(column);
  if (
    values.length > 0
    && !values.every((value) => resolveBindingValue(value, binding, column).ok)
  ) {
    return false;
  }
  return effectiveType !== "temporal"
    || hasCanonicalTemporalProfileEvidence(column.temporal);
}

function presentProfileEvidence(column) {
  const values = Array.isArray(column.values)
    ? column.values
    : Array.isArray(column.examples)
      ? column.examples
      : [];
  return values.filter((value) => (
    value !== null
    && value !== undefined
    && !(typeof value === "string" && value.trim() === "")
  ));
}

function hasCanonicalTemporalProfileEvidence(temporal) {
  if (
    !isRecord(temporal)
    || !Array.isArray(temporal.values)
    || temporal.values.length === 0
    || !Array.isArray(temporal.diagnostics)
    || temporal.diagnostics.length > 0
  ) {
    return false;
  }
  let hasCanonicalValue = false;
  for (const value of temporal.values) {
    if (value === null) continue;
    if (typeof value !== "string" || value === "") return false;
    const parsed = parseTemporalValue(value);
    if (!parsed.ok || parsed.canonical !== value) return false;
    hasCanonicalValue = true;
  }
  return hasCanonicalValue;
}

function hasSourceMappings(draft) {
  return assignedRoleCount(draft) > 0
    || assignedFilterCount(draft) > 0
    || (draft.transformations?.grouping?.length ?? 0) > 0;
}

function assignedRoleCount(draft) {
  return Object.values(draft.roles ?? {}).reduce((total, value) => (
    total + (Array.isArray(value) ? value.length : value ? 1 : 0)
  ), 0);
}

function assignedFilterCount(draft) {
  return Array.isArray(draft.transformations?.filters)
    ? draft.transformations.filters.length
    : 0;
}

function initialSourceSelection(options) {
  const explicit = options.sourceSelection;
  const sourceId = explicit?.sourceId ?? options.draft?.sourceId;
  if (!nonEmptyString(sourceId)) return null;
  const source = Object.hasOwn(explicit ?? {}, "source")
    ? explicit.source
    : options.source;
  const rows = Object.hasOwn(explicit ?? {}, "rows")
    ? explicit.rows
    : collectionEntry(options.loadedData, sourceId);
  const profile = Object.hasOwn(explicit ?? {}, "profile")
    ? explicit.profile
    : collectionEntry(options.profiles, sourceId);
  return {
    sourceId,
    source: cloneOptional(source),
    profile: cloneOptional(profile),
    rows: structuredClone(Array.isArray(rows) ? rows : []),
    kind: nonEmptyString(explicit?.kind)
      ? explicit.kind
      : inferSourceKind(source),
  };
}

function selectionFromDraftState(state) {
  const sourceId = state.draft?.sourceId;
  if (!nonEmptyString(sourceId)) return null;
  return {
    sourceId,
    source: cloneOptional(state.source),
    profile: cloneOptional(collectionEntry(state.profiles, sourceId)),
    rows: structuredClone(collectionEntry(state.loadedData, sourceId) ?? []),
    kind: inferSourceKind(state.source),
  };
}

function selectionFromChange(state, change) {
  const current = state.sourceSelection?.sourceId === change.sourceId
    ? state.sourceSelection
    : null;
  const source = change.source === undefined
    ? current?.source ?? state.source
    : change.source;
  const rows = change.rows === undefined
    ? current?.rows ?? collectionEntry(state.loadedData, change.sourceId) ?? []
    : change.rows;
  const profile = change.profile === undefined
    ? current?.profile ?? collectionEntry(state.profiles, change.sourceId) ?? null
    : change.profile;
  return {
    sourceId: change.sourceId,
    source: cloneOptional(source),
    profile: cloneOptional(profile),
    rows: structuredClone(Array.isArray(rows) ? rows : []),
    kind: nonEmptyString(change.kind)
      ? change.kind
      : nonEmptyString(current?.kind)
        ? current.kind
        : inferSourceKind(source),
  };
}

function inferSourceKind(source) {
  if (source?.kind === "inline") return "manual";
  if (source?.type === "uploadedCsv") return "upload";
  return "existing";
}

function collectionEntry(collection, key) {
  if (!nonEmptyString(key)) return undefined;
  if (collection instanceof Map) return collection.get(key);
  return isRecord(collection) ? collection[key] : undefined;
}

function collectionWithEntry(collection, key, value) {
  const clonedValue = structuredClone(value);
  if (collection instanceof Map) {
    const next = new Map(collection);
    next.set(key, clonedValue);
    return next;
  }
  return {
    ...(isRecord(collection) ? collection : {}),
    [key]: clonedValue,
  };
}

function profileForChart(profiles, chart) {
  if (profiles instanceof Map) return profiles.get(chart.sourceId);
  return isRecord(profiles) ? profiles[chart.sourceId] : undefined;
}

function profileColumnMap(profileEntry) {
  const profile = profileEntry?.datasetProfile
    ?? profileEntry?.profile
    ?? profileEntry;
  if (!Array.isArray(profile?.columns)) return undefined;
  return new Map(profile.columns.map((column) => [column.name, column]));
}

function semanticTarget(target, kind) {
  if (!isRecord(target)) {
    throw new TypeError(
      `Time synchronization ${kind} updates require a semantic target.`,
    );
  }
  requiredString(target.groupId, "Chrono Group id");
  requiredString(target.property, "Time synchronization target property");
  if (kind === "member") {
    requiredString(target.chartId, "Time synchronization member chart id");
  }
  return target;
}

function setAtPath(object, path, value) {
  if (!Array.isArray(path) || path.length === 0) {
    throw new Error("Chart updates require a non-empty path.");
  }
  for (const segment of path) {
    if (
      (typeof segment !== "string" && !Number.isInteger(segment))
      || DANGEROUS_PATH_SEGMENTS.has(segment)
    ) {
      throw new Error(`Unsafe chart update path segment "${segment}".`);
    }
  }
  const root = Array.isArray(object) ? [...object] : { ...object };
  let next = root;
  let current = object;
  const ancestors = [];
  for (let index = 0; index < path.length - 1; index += 1) {
    const segment = path[index];
    const currentValue = current?.[segment];
    const child = Array.isArray(currentValue)
      ? [...currentValue]
        : isRecord(currentValue)
          ? { ...currentValue }
          : {};
    next[segment] = child;
    ancestors.push({ parent: next, key: segment, child });
    next = child;
    current = currentValue;
  }
  if (value === undefined) {
    delete next[path.at(-1)];
    for (let index = ancestors.length - 1; index >= 0; index -= 1) {
      const { parent, key, child } = ancestors[index];
      if (!isRecord(child) || Object.keys(child).length > 0) break;
      delete parent[key];
    }
  } else {
    next[path.at(-1)] = structuredClone(value);
  }
  return root;
}

function requireDraft(state) {
  if (!state.draft) {
    throw new Error("Choose a chart type before editing the chart.");
  }
  return state.draft;
}

function assertState(state) {
  if (!isRecord(state) || !Array.isArray(state.chronoGroups)) {
    throw new TypeError("Wizard state is invalid.");
  }
}

function requiredString(value, description) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${description} is required.`);
  }
}

function chartState(state, patch) {
  return withStageStatuses({ ...state, ...patch });
}

function withStageStatuses(state) {
  return {
    ...state,
    stageStatuses: deriveChartCreationStageStatuses(state),
  };
}

function stageStatus(state, stage, { complete, waiting, needsAttention }) {
  if (needsAttention) return "Needs attention";
  if (waiting) return "Waiting on prerequisite";
  if (complete) return "Complete";
  return state.stage === stage ? "In progress" : "Not started";
}

function assertChartCreationStage(stage) {
  if (!CHART_CREATION_STAGES.includes(stage)) {
    throw new Error(`Unknown chart creation stage "${stage}".`);
  }
}

function normalizeRestoration(restoration, fallbackStage) {
  const value = isRecord(restoration) ? restoration : {};
  return {
    stage: CHART_CREATION_STAGES.includes(value.stage) ? value.stage : fallbackStage,
    focusId: nonEmptyString(value.focusId) ? value.focusId : null,
    invokerId: nonEmptyString(value.invokerId) ? value.invokerId : null,
    scrollTop: Number.isFinite(value.scrollTop) ? value.scrollTop : 0,
    targetId: nonEmptyString(value.targetId) ? value.targetId : null,
  };
}

function resolveResumeFocus(state, restoration) {
  if (restoration.focusId) return restoration.focusId;
  const issueFocus = (state.errors ?? []).find(({ focusId }) => nonEmptyString(focusId))?.focusId;
  return issueFocus ?? firstMeaningfulControl(restoration.stage);
}

function firstMeaningfulControl(stage) {
  return {
    destination: "chart-draft-destination",
    "chart-type": "chart-draft-chart-type",
    "data-source": "chart-draft-data-source",
    "map-and-prepare-data": "chart-draft-mapping",
    "configure-chart": "chart-draft-configuration",
    "review-and-create": "chart-draft-review",
  }[stage];
}

function replaceCompanionOutcome(companions, outcome) {
  if (!isRecord(outcome)) {
    throw new TypeError("A chart companion outcome must be an object.");
  }
  const identity = outcome.id ?? outcome.kind ?? null;
  if (!identity) return [...companions, structuredClone(outcome)];
  const index = companions.findIndex((entry) => (
    (entry.id ?? entry.kind) === identity
  ));
  if (index < 0) return [...companions, structuredClone(outcome)];
  return companions.map((entry, entryIndex) => (
    entryIndex === index ? structuredClone(outcome) : entry
  ));
}

function applyCommitResult(state, result) {
  if (state.status !== "committing") return state;
  const outcome = result?.status;
  if (outcome === "committed") {
    return chartState(state, {
      status: "committed",
      errors: [],
      handoff: { ...(state.handoff ?? {}), ...structuredClone(result) },
    });
  }
  if (outcome === "ambiguous") {
    return chartState(state, {
      status: "ambiguous",
      errors: [{
        code: "COMMIT_OUTCOME_AMBIGUOUS",
        stage: "review-and-create",
        message: result?.message ?? "The durable chart outcome is still being determined.",
      }],
      handoff: { ...(state.handoff ?? {}), ...structuredClone(result) },
    });
  }
  return chartState(state, {
    status: "failed",
    errors: structuredClone(result?.errors ?? [{
      code: "CHART_COMMIT_FAILED",
      stage: "review-and-create",
      message: result?.message ?? "The chart could not be created.",
    }]),
    handoff: { ...(state.handoff ?? {}), ...structuredClone(result ?? {}) },
  });
}

function applyReconciliation(state, result) {
  if (state.status !== "ambiguous") return state;
  if (result?.status === "committed") {
    return chartState(state, {
      status: "committed",
      errors: [],
      handoff: { ...(state.handoff ?? {}), ...structuredClone(result) },
    });
  }
  return chartState(state, {
    status: "failed",
    errors: structuredClone(result?.errors ?? [{
      code: "CHART_COMMIT_NOT_FOUND",
      stage: "review-and-create",
      message: result?.message ?? "No committed chart was found; the draft is retained.",
    }]),
    handoff: { ...(state.handoff ?? {}), ...structuredClone(result ?? {}) },
  });
}

function discardSessionDraft(state) {
  return withStageStatuses({
    ...state,
    draftId: null,
    stage: "destination",
    status: "editing",
    destination: null,
    chartTypeId: null,
    chartTypeRevision: null,
    sourceSelection: null,
    source: null,
    profileRevision: null,
    mapping: null,
    preparation: null,
    configuration: null,
    companions: [],
    renderProofRevision: null,
    placementProofRevision: null,
    errors: [],
    suspension: null,
    handoff: null,
    discarded: true,
    draft: null,
    confirmation: null,
    pendingSourceChange: null,
    closed: true,
  });
}

function withoutErrorCode(errors, code) {
  return (errors ?? []).filter((error) => error.code !== code);
}

function meaningfulValue(value) {
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  if (isRecord(value)) return Object.keys(value).length > 0;
  return true;
}

function cloneOptional(value) {
  return value === undefined || value === null ? null : structuredClone(value);
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
