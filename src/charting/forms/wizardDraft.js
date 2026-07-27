import {
  createChartDraft,
  normalizeChartInstance,
  validateChartInstance,
} from "../config/chartConfigV3.js";
import {
  canonicalColumnType,
  resolveEffectiveBinding,
} from "../data/bindings.js";
import { getChartSchema } from "../schemas/chartSchemaRegistry.js";
import { validateTimeSyncGroups } from "../time/timeSyncModel.js";

export const WIZARD_STEPS = Object.freeze([
  "type",
  "source",
  "roles",
  "style",
]);

const DANGEROUS_PATH_SEGMENTS = new Set([
  "__proto__",
  "prototype",
  "constructor",
]);

export function createWizardState(options = {}) {
  if (!isRecord(options)) {
    throw new TypeError("Wizard state options must be an object.");
  }
  return {
    activeStep: WIZARD_STEPS.includes(options.activeStep)
      ? options.activeStep
      : "type",
    draft: options.draft ? structuredClone(options.draft) : null,
    source: options.source === undefined
      ? null
      : structuredClone(options.source),
    timeSyncGroups: structuredClone(options.timeSyncGroups ?? []),
    timeSyncGroupsProvided: Object.hasOwn(options, "timeSyncGroups"),
    charts: normalizeExistingCharts(options.charts ?? []),
    loadedData: options.loadedData ?? {},
    profiles: options.profiles ?? {},
    confirmation: null,
    pendingSourceChange: null,
    closed: false,
  };
}

export function reduceWizardState(state, action) {
  assertState(state);
  if (!isRecord(action) || typeof action.type !== "string") {
    throw new TypeError("Wizard actions require a type.");
  }

  switch (action.type) {
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
    case "updateTimeSyncGroup":
      return updateTimeSyncGroup(state, action);
    case "updateTimeSyncGroups":
      return updateTimeSyncGroups(state, action);
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
  const chart = normalizeChartInstance(state.draft);
  validateChartInstance(chart, {
    columnTypes: profileColumnMap(profileForChart(state.profiles, chart)),
  });

  const result = { chart };
  if (state.source !== null && state.source !== undefined) {
    result.source = structuredClone(state.source);
  }
  if (state.timeSyncGroupsProvided || state.timeSyncGroups.length > 0) {
    validateProposedGroups(state, state.timeSyncGroups, chart);
    result.timeSyncGroups = structuredClone(state.timeSyncGroups);
  }
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
  const groups = previousDraftId
    ? removeChartFromGroups(state.timeSyncGroups, previousDraftId)
    : state.timeSyncGroups;
  return {
    ...state,
    draft: createChartDraft(action.typeId, {
      ...overrides,
      ...(draftId ? { id: draftId } : {}),
    }),
    source: null,
    timeSyncGroups: groups,
    timeSyncGroupsProvided: state.timeSyncGroupsProvided
      || groups !== state.timeSyncGroups,
    confirmation: null,
    pendingSourceChange: null,
    closed: false,
  };
}

function selectSource(state, action) {
  const draft = requireDraft(state);
  if (typeof action.sourceId !== "string" || action.sourceId.trim() === "") {
    throw new Error("A data source id is required.");
  }
  return {
    ...state,
    draft: {
      ...draft,
      sourceId: action.sourceId,
    },
    source: action.source === undefined
      ? state.source
      : structuredClone(action.source),
    confirmation: null,
    pendingSourceChange: null,
  };
}

function requestSourceChange(state, action) {
  const draft = requireDraft(state);
  requiredString(action.sourceId, "Data source id");
  const change = sourceChange(action);
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
  const groupIndex = state.timeSyncGroups
    .findIndex(({ id }) => id === target.groupId);
  if (groupIndex < 0) {
    throw new Error(
      `Unknown time synchronization group "${target.groupId}".`,
    );
  }
  const group = state.timeSyncGroups[groupIndex];
  const memberIndex = group.members
    .findIndex(({ chartId }) => chartId === target.chartId);
  if (memberIndex < 0) {
    throw new Error(
      `Unknown member chart "${target.chartId}" in time synchronization group "${target.groupId}".`,
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
  const groups = state.timeSyncGroups.map((value, index) => (
    index === groupIndex ? { ...group, members } : value
  ));
  validateProposedGroups(state, groups);
  return {
    ...state,
    timeSyncGroups: groups,
    timeSyncGroupsProvided: true,
  };
}

function updateTimeSyncGroup(state, action) {
  const target = semanticTarget(action.target, "group");
  if (target.property !== "matching") {
    throw new Error(
      `Unsupported time synchronization group property "${target.property}".`,
    );
  }
  const groupIndex = state.timeSyncGroups
    .findIndex(({ id }) => id === target.groupId);
  if (groupIndex < 0) {
    throw new Error(
      `Unknown time synchronization group "${target.groupId}".`,
    );
  }
  const groups = state.timeSyncGroups.map((group, index) => (
    index === groupIndex
      ? { ...group, [target.property]: structuredClone(action.value) }
      : group
  ));
  validateProposedGroups(state, groups);
  return {
    ...state,
    timeSyncGroups: groups,
    timeSyncGroupsProvided: true,
  };
}

function updateTimeSyncGroups(state, action) {
  if (!Array.isArray(action.value)) {
    throw new TypeError("Time synchronization group updates must be an array.");
  }
  const groups = structuredClone(action.value);
  validateProposedGroups(state, groups);
  return {
    ...state,
    timeSyncGroups: groups,
    timeSyncGroupsProvided: true,
  };
}

function confirmClearSource(state) {
  if (state.confirmation !== "clearSource") return state;
  const draft = requireDraft(state);
  return {
    ...state,
    draft: {
      ...draft,
      sourceId: null,
      roles: {},
    },
    source: null,
    confirmation: null,
    pendingSourceChange: null,
  };
}

function validateProposedGroups(state, groups, draft = state.draft) {
  validateTimeSyncGroups(groups.filter(groupRequiresValidation), {
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
  const next = groups.map((group) => {
    const members = Array.isArray(group.members)
      ? group.members.filter((member) => member.chartId !== chartId)
      : [];
    if (members.length === (group.members?.length ?? 0)) return group;
    changed = true;
    return { ...group, members };
  });
  return changed ? next : groups;
}

function groupRequiresValidation(group) {
  return !Array.isArray(group?.members) || group.members.length > 0;
}

function sourceChange(action) {
  return {
    sourceId: action.sourceId,
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
  const draft = requireDraft(state);
  const transformations = clearMappings
    ? {
        ...draft.transformations,
        filters: [],
        grouping: null,
      }
    : draft.transformations;
  return {
    ...state,
    draft: {
      ...draft,
      sourceId: change.sourceId,
      roles: clearMappings ? {} : draft.roles,
      transformations,
    },
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
  };
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
        !role.accepts.includes("any")
        && !role.accepts.includes(effectiveType)
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
  requiredString(target.groupId, "Time synchronization group id");
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
  for (let index = 0; index < path.length - 1; index += 1) {
    const segment = path[index];
    const currentValue = current?.[segment];
    const child = Array.isArray(currentValue)
      ? [...currentValue]
      : isRecord(currentValue)
        ? { ...currentValue }
        : {};
    next[segment] = child;
    next = child;
    current = currentValue;
  }
  next[path.at(-1)] = structuredClone(value);
  return root;
}

function requireDraft(state) {
  if (!state.draft) {
    throw new Error("Choose a chart type before editing the chart.");
  }
  return state.draft;
}

function assertState(state) {
  if (!isRecord(state) || !Array.isArray(state.timeSyncGroups)) {
    throw new TypeError("Wizard state is invalid.");
  }
}

function requiredString(value, description) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${description} is required.`);
  }
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
