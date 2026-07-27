import React from "react";

import {
  normalizeChartInstance,
  validateChartInstance,
} from "../../charting/config/chartConfigV3.js";
import { prepareChartData } from "../../charting/data/prepareChartData.js";
import { profileDataset } from "../../charting/data/profileDataset.js";
import {
  buildEditorFormModel,
  buildFormPreparationKey,
} from "../../charting/forms/formModel.js";
import {
  applyChartConversion,
  planChartConversion,
} from "../../charting/forms/chartConversion.js";
import {
  getChartSchema,
  listChartSchemas,
} from "../../charting/schemas/chartSchemaRegistry.js";
import { validateTimeSyncGroups } from "../../charting/time/timeSyncModel.js";
import ChartConversionDialog from "./ChartConversionDialog.jsx";
import ChartPreview from "./ChartPreview.jsx";
import ContextualTabs from "./ContextualTabs.jsx";
import EditSessionActions from "./EditSessionActions.jsx";

const DANGEROUS_PATH_SEGMENTS = new Set([
  "__proto__",
  "prototype",
  "constructor",
]);

export function createChartEditorState({
  chart,
  timeSyncGroups = [],
  revision,
} = {}) {
  const savedChart = normalizeChartInstance(chart);
  const savedGroups = cloneGroups(timeSyncGroups);
  return {
    authorityKey: editorAuthorityKey({
      chart: savedChart,
      timeSyncGroups: savedGroups,
      revision,
    }),
    revision,
    savedChart,
    savedTimeSyncGroups: savedGroups,
    draft: structuredClone(savedChart),
    timeSyncGroups: structuredClone(savedGroups),
    activeTabId: savedChart.title.trim() ? "data" : "appearance",
    confirmation: null,
    conversion: null,
    error: "",
    previewRevision: 0,
  };
}

export function rebaseChartEditorState(state, saved) {
  assertEditorState(state);
  const nextKey = editorAuthorityKey(saved);
  return nextKey === state.authorityKey
    ? state
    : createChartEditorState(saved);
}

export function reduceChartEditorState(state, action, context = {}) {
  assertEditorState(state);
  if (!action || typeof action !== "object" || typeof action.type !== "string") {
    throw new TypeError("Chart editor actions require a type.");
  }
  switch (action.type) {
    case "selectTab":
      return {
        ...state,
        activeTabId: requiredString(action.tabId, "Editor tab"),
      };
    case "updateChart":
      return {
        ...state,
        draft: setAtPath(state.draft, action.path, action.value),
        error: "",
      };
    case "updateTimeSyncGroups":
      return updateEditorGroups(state, action.value, context);
    case "updateTimeSyncMembership":
      return updateEditorMembership(state, action, context);
    case "requestReset":
      return { ...state, confirmation: "reset" };
    case "confirmReset":
      return state.confirmation === "reset"
        ? {
            ...state,
            draft: structuredClone(state.savedChart),
            timeSyncGroups: structuredClone(state.savedTimeSyncGroups),
            activeTabId: state.savedChart.title.trim() ? "data" : "appearance",
            confirmation: null,
            conversion: null,
            error: "",
            previewRevision: state.previewRevision + 1,
          }
        : state;
    case "cancelConfirmation":
      return { ...state, confirmation: null };
    case "requestConversion":
      return requestEditorConversion(state, action.targetTypeId);
    case "updateConversionRole":
      return updateConversionRole(state, action);
    case "cancelConversion":
      return { ...state, conversion: null, error: "" };
    case "applyConversion":
      return applyEditorConversion(state, context);
    default:
      throw new Error(`Unknown chart editor action "${action.type}".`);
  }
}

export function saveChartEditorState(state, context = {}) {
  assertEditorState(state);
  const chart = normalizeChartInstance(state.draft);
  validateChartInstance(chart, {
    columnTypes: profileColumnMap(
      context.profile ?? readEntry(context.profiles, chart.sourceId),
    ),
  });
  const charts = chartsWithDraft(context.existingCharts, chart);
  validateTimeSyncGroups(state.timeSyncGroups, {
    charts,
    loadedData: context.loadedData ?? {},
    profiles: context.profiles ?? {},
  });
  return {
    chart: structuredClone(chart),
    timeSyncGroups: structuredClone(state.timeSyncGroups),
  };
}

export function acceptEditorSave(state, payload) {
  assertEditorState(state);
  const savedChart = normalizeChartInstance(payload?.chart);
  const savedGroups = cloneGroups(payload?.timeSyncGroups ?? []);
  return {
    ...state,
    savedChart,
    savedTimeSyncGroups: savedGroups,
    draft: structuredClone(savedChart),
    timeSyncGroups: structuredClone(savedGroups),
    confirmation: null,
    conversion: null,
    error: "",
  };
}

export function buildDashboardEditorProfiles({
  loadedData = {},
  dataSources = {},
  suppliedProfiles = {},
} = {}) {
  const profiles = Object.create(null);
  for (const [sourceId, profile] of collectionEntries(suppliedProfiles)) {
    if (profile !== undefined && profile !== null) {
      profiles[sourceId] = profile;
    }
  }
  for (const [sourceId, rows] of collectionEntries(loadedData)) {
    if (
      Object.hasOwn(profiles, sourceId)
      || !Array.isArray(rows)
    ) {
      continue;
    }
    const source = readEntry(dataSources, sourceId);
    profiles[sourceId] = profileDataset(
      rows,
      isRecord(source) ? source.parsingMetadata ?? {} : {},
    );
  }
  return profiles;
}

export function selectAuthoritativeEditorPanel(savedPanel, legacyDraft) {
  return savedPanel?.configVersion === 3
    && typeof savedPanel.typeId === "string"
    ? savedPanel
    : legacyDraft ?? savedPanel;
}

export function applyChartEditorSave(dashboard, {
  chart,
  timeSyncGroups = [],
} = {}) {
  if (!isRecord(dashboard)) {
    throw new TypeError("A dashboard is required to save a chart.");
  }
  const savedChart = normalizeChartInstance(chart);
  const nextDashboard = structuredClone(dashboard);
  let replaced = false;
  nextDashboard.pages = (nextDashboard.pages ?? []).map((page) => ({
    ...page,
    sections: (page.sections ?? []).map((section) => ({
      ...section,
      panels: (section.panels ?? []).map((panel) => {
        if (panel?.id !== savedChart.id) return panel;
        replaced = true;
        return structuredClone(savedChart);
      }),
    })),
  }));
  if (!replaced) {
    throw new Error(`Chart "${savedChart.id}" does not exist in the dashboard.`);
  }
  nextDashboard.timeSyncGroups = cloneGroups(timeSyncGroups);
  return nextDashboard;
}

export function editorAuthorityKey({
  chart,
  timeSyncGroups = [],
  revision,
} = {}) {
  const normalized = normalizeChartInstance(chart);
  if (revision !== undefined && revision !== null) {
    return `chart-editor:${normalized.id}:revision:${String(revision)}`;
  }
  return `chart-editor:${normalized.id}:snapshot:${stableSerialize({
    chart: normalized,
    timeSyncGroups: cloneGroups(timeSyncGroups),
  })}`;
}

export default function ChartEditorV3({
  chart,
  timeSyncGroups = [],
  savedRevision,
  existingCharts = [],
  rows = [],
  profile: providedProfile,
  prepared: providedPrepared,
  loadedData = {},
  profiles = {},
  parsingMetadata = {},
  onSave = noop,
  onReset = noop,
  onCancel = noop,
  onRemove,
} = {}) {
  const incomingKey = editorAuthorityKey({
    chart,
    timeSyncGroups,
    revision: savedRevision,
  });
  const [state, setState] = React.useState(() => createChartEditorState({
    chart,
    timeSyncGroups,
    revision: savedRevision,
  }));
  React.useEffect(() => {
    setState((current) => rebaseChartEditorState(current, {
      chart,
      timeSyncGroups,
      revision: savedRevision,
    }));
  }, [incomingKey]);

  const safeRows = Array.isArray(rows) ? rows : [];
  const profile = providedProfile ?? profileDataset(safeRows, parsingMetadata);
  const preparationKey = buildFormPreparationKey({
    chart: state.draft,
    profile,
  });
  const prepared = preparationKey !== null
    && providedPrepared?.meta?.formPreparationKey === preparationKey
    ? providedPrepared
    : createEditorPreparation({
        chart: state.draft,
        rows: safeRows,
        profile,
      });
  const runtimeLoadedData = collectionWithEntry(
    loadedData,
    state.draft.sourceId,
    safeRows,
  );
  const runtimeProfiles = collectionWithEntry(
    profiles,
    state.draft.sourceId,
    profile,
  );
  const model = buildEditorFormModel({
    chart: state.draft,
    profile,
    prepared,
    timeSyncGroups: state.timeSyncGroups,
  });
  const allCharts = chartsWithDraft(existingCharts, state.draft);
  const timeSyncField = model.sections
    .flatMap(({ fields }) => fields)
    .find(({ id }) => id === "timeSync");
  const dispatch = (action) => setState((current) => {
    try {
      return reduceChartEditorState(
        current,
        action,
        {
          existingCharts,
          loadedData: runtimeLoadedData,
          profiles: runtimeProfiles,
          profile,
        },
      );
    } catch (error) {
      return {
        ...current,
        error: safeMessage(error),
      };
    }
  });
  const changeMembership = (groupId) => {
    const timeRole = timeSyncField?.timeRoles?.[0]?.value;
    dispatch({
      type: "updateTimeSyncMembership",
      groupId,
      timeRole,
    });
  };
  const submit = (event) => {
    event?.preventDefault?.();
    try {
      const payload = saveChartEditorState(state, {
        existingCharts,
        loadedData: runtimeLoadedData,
        profiles: runtimeProfiles,
        profile,
      });
      onSave(payload);
      setState((current) => acceptEditorSave(current, payload));
    } catch (error) {
      setState((current) => ({
        ...current,
        error: safeMessage(error),
      }));
    }
  };
  const confirmReset = () => {
    setState((current) => reduceChartEditorState(
      reduceChartEditorState(current, { type: "confirmReset" }),
      { type: "cancelConfirmation" },
    ));
    onReset();
  };

  return React.createElement(
    "aside",
    {
      className: "chart-editor-v3",
      "aria-labelledby": "chart-editor-title",
    },
    React.createElement(
      "form",
      { onSubmit: submit },
      React.createElement(
        "header",
        { className: "chart-editor-header" },
        React.createElement(
          "div",
          null,
          React.createElement("p", { className: "eyebrow" }, "Chart editor"),
          React.createElement(
            "h2",
            { id: "chart-editor-title" },
            state.draft.title || "Untitled chart",
          ),
        ),
        React.createElement(
          "label",
          { className: "chart-editor-type-select" },
          React.createElement("span", null, "Chart type"),
          React.createElement(
            "select",
            {
              value: state.draft.typeId,
              onChange: (event) => {
                if (event.target.value !== state.draft.typeId) {
                  dispatch({
                    type: "requestConversion",
                    targetTypeId: event.target.value,
                  });
                }
              },
            },
            listChartSchemas().map((schema) => React.createElement(
              "option",
              { key: schema.typeId, value: schema.typeId },
              schema.label,
            )),
          ),
        ),
      ),
      React.createElement(
        "div",
        { className: "chart-editor-layout" },
        React.createElement(
          "div",
          { className: "chart-editor-preview" },
          React.createElement(ChartPreview, {
            key: `${state.draft.id}:${state.previewRevision}`,
            chart: state.draft,
            rows: safeRows,
            datasetProfile: profile,
            diagnosticNamespace: state.draft.id,
          }),
        ),
        React.createElement(ContextualTabs, {
          sections: model.sections,
          activeTabId: state.activeTabId,
          onSelect: (tabId) => dispatch({ type: "selectTab", tabId }),
          onChange: (path, value) => dispatch({
            type: "updateChart",
            path,
            value,
          }),
          chart: state.draft,
          charts: allCharts,
          columns: profile?.columns ?? [],
          profile,
          diagnostics: prepared?.diagnostics ?? [],
          diagnosticNamespace: state.draft.id,
          loadedData: runtimeLoadedData,
          profiles: runtimeProfiles,
          onMembershipChange: changeMembership,
          onGroupsChange: (value) => dispatch({
            type: "updateTimeSyncGroups",
            value,
          }),
          onValidationError: (error) => setState((current) => ({
            ...current,
            error: safeMessage(error),
          })),
        }),
      ),
      state.error && !state.conversion
        ? React.createElement(
            "p",
            { className: "wizard-error chart-editor-error", role: "alert" },
            state.error,
          )
        : null,
      React.createElement(EditSessionActions, {
        valid: model.valid,
        resetConfirmationOpen: state.confirmation === "reset",
        onRequestReset: () => dispatch({ type: "requestReset" }),
        onConfirmReset: confirmReset,
        onCancelReset: () => dispatch({ type: "cancelConfirmation" }),
        onCancel,
      }),
      typeof onRemove === "function"
        ? React.createElement(
            "button",
            {
              type: "button",
              className: "danger chart-editor-remove",
              onClick: onRemove,
            },
            "Remove chart",
          )
        : null,
    ),
    React.createElement(ChartConversionDialog, {
      conversion: state.conversion,
      error: state.conversion ? state.error : "",
      columns: profile?.columns ?? [],
      onRoleAssignment: (roleId, value) => dispatch({
        type: "updateConversionRole",
        roleId,
        value,
      }),
      onConfirm: () => dispatch({ type: "applyConversion" }),
      onCancel: () => dispatch({ type: "cancelConversion" }),
    }),
  );
}

export function SelectedChartEditor({
  panel,
  dashboard = {},
  savedRevision,
  profiles: suppliedProfiles,
  globalPanelColors,
  onSave,
  onReset,
  onCancel,
  onRemove,
  onLegacyChange,
  LegacyEditor = null,
} = {}) {
  if (panel?.configVersion === 3 && typeof panel.typeId === "string") {
    const loadedData = dashboard.loadedData ?? {};
    const rows = readEntry(loadedData, panel.sourceId);
    const dataSources = dashboard.dataSources ?? {};
    const source = readEntry(dataSources, panel.sourceId);
    const runtimeProfiles = buildDashboardEditorProfiles({
      loadedData,
      dataSources,
      suppliedProfiles: suppliedProfiles ?? dashboard.profiles ?? {},
    });
    const profile = readEntry(runtimeProfiles, panel.sourceId);
    const charts = chartPanels(dashboard).filter(
      (chart) => chart?.configVersion === 3,
    );
    return React.createElement(ChartEditorV3, {
      chart: panel,
      timeSyncGroups: dashboard.timeSyncGroups ?? [],
      savedRevision,
      existingCharts: charts,
      rows: Array.isArray(rows) ? rows : [],
      profile,
      loadedData,
      profiles: runtimeProfiles,
      parsingMetadata: isRecord(source) ? source.parsingMetadata ?? {} : {},
      onSave,
      onReset,
      onCancel,
      onRemove,
    });
  }
  const rows = readEntry(dashboard.loadedData ?? {}, panel?.dataSource);
  return React.createElement(
    "div",
    { className: "chart-settings-panel-v2", "data-editor-version": "2" },
    typeof LegacyEditor === "function"
      ? React.createElement(LegacyEditor, {
          panel,
          dataSources: dashboard.dataSources,
          dataColumns: Array.isArray(rows) ? Object.keys(rows[0] ?? {}) : [],
          dataRows: Array.isArray(rows) ? rows : [],
          globalPanelColors,
          onSave,
          onCancel,
          onRemove,
          onChange: onLegacyChange,
        })
      : null,
  );
}

function updateEditorGroups(state, value, context) {
  const groups = cloneGroups(value);
  validateEditorGroups(state.draft, groups, context);
  return {
    ...state,
    timeSyncGroups: groups,
    error: "",
  };
}

function updateEditorMembership(state, action, context) {
  const groupId = action.groupId === null ? null : requiredString(
    action.groupId,
    "Time synchronization group",
  );
  const groups = structuredClone(state.timeSyncGroups);
  let previousMember = null;
  for (const group of groups) {
    const members = Array.isArray(group.members) ? group.members : [];
    previousMember ??= members.find(({ chartId }) => chartId === state.draft.id);
    group.members = members.filter(({ chartId }) => chartId !== state.draft.id);
  }
  let nextGroups = groups;
  if (groupId !== null) {
    const target = nextGroups.find(({ id }) => id === groupId);
    if (!target) {
      throw new Error(`Unknown time synchronization group "${groupId}".`);
    }
    const timeRole = requiredString(
      action.timeRole,
      "Time synchronization temporal role",
    );
    target.members.push({
      chartId: state.draft.id,
      timeRole,
      ...(previousMember?.matching
        ? { matching: structuredClone(previousMember.matching) }
        : {}),
    });
  }
  nextGroups = nextGroups.filter(({ members }) => members.length > 0);
  const chart = setAtPath(
    state.draft,
    ["interaction", "timeSync"],
    groupId === null ? null : { groupId },
  );
  validateEditorGroups(chart, nextGroups, context);
  return {
    ...state,
    draft: chart,
    timeSyncGroups: nextGroups,
    error: "",
  };
}

function requestEditorConversion(state, targetTypeId) {
  const target = requiredString(targetTypeId, "Target chart type");
  const targetSchema = getChartSchema(target);
  if (target === state.draft.typeId) return state;
  const plan = planChartConversion(state.draft, target);
  const roleAssignments = {};
  const roleFields = conversionRoleFields({
    chart: state.draft,
    targetSchema,
    plan,
  });
  return {
    ...state,
    conversion: {
      targetTypeId: target,
      plan,
      roleAssignments,
      roleFields,
      timeSyncConsequence: conversionTimeSyncConsequence({
        chart: state.draft,
        groups: state.timeSyncGroups,
        targetSchema,
        plan,
        roleAssignments,
      }),
    },
    error: "",
  };
}

function updateConversionRole(state, action) {
  if (!state.conversion) return state;
  const roleId = requiredString(action.roleId, "Conversion role");
  const roleAssignments = {
    ...state.conversion.roleAssignments,
    [roleId]: structuredClone(action.value),
  };
  const plan = planChartConversion(
    state.draft,
    state.conversion.targetTypeId,
    roleAssignments,
  );
  const targetSchema = getChartSchema(state.conversion.targetTypeId);
  return {
    ...state,
    conversion: {
      ...state.conversion,
      roleAssignments,
      plan,
      timeSyncConsequence: conversionTimeSyncConsequence({
        chart: state.draft,
        groups: state.timeSyncGroups,
        targetSchema,
        plan,
        roleAssignments,
      }),
    },
    error: "",
  };
}

function applyEditorConversion(state, context) {
  if (!state.conversion) return state;
  try {
    if (state.conversion.plan.requiredRoles.length > 0) {
      throw new Error(
        "Complete the required data roles before applying this chart type change.",
      );
    }
    if (state.conversion.timeSyncConsequence?.kind === "ambiguous") {
      throw new Error(
        "Choose one temporal data role before preserving synchronized playback.",
      );
    }
    const converted = applyChartConversion(
      state.draft,
      state.conversion.targetTypeId,
      state.conversion.roleAssignments,
    );
    if (
      converted === state.draft
      || converted.typeId !== state.conversion.targetTypeId
    ) {
      throw new Error(
        "Check the required data roles before applying this chart type change.",
      );
    }
    validateChartInstance(converted, {
      columnTypes: profileColumnMap(
        context.profile ?? readEntry(context.profiles, converted.sourceId),
      ),
    });
    const consequence = state.conversion.timeSyncConsequence;
    const groups = consequence?.kind === "remove"
      ? removeChartFromGroups(state.timeSyncGroups, converted.id)
      : remapChartTimeRole(
          state.timeSyncGroups,
          converted.id,
          consequence?.toRole,
        );
    validateEditorGroups(converted, groups, context);
    return {
      ...state,
      draft: converted,
      timeSyncGroups: groups,
      activeTabId: "data",
      conversion: null,
      error: "",
      previewRevision: state.previewRevision + 1,
    };
  } catch (error) {
    const detail = safeMessage(error);
    const message = /required data roles/i.test(detail)
      ? detail
      : `Check the required data roles. ${detail}`;
    return {
      ...state,
      error: safeMessage(new Error(message)),
    };
  }
}

function conversionRoleFields({ chart, targetSchema, plan }) {
  const fields = [...plan.requiredRoles];
  if (
    chart.interaction?.timeSync
    && targetSchema.capabilities.timeSync
  ) {
    const existingIds = new Set(fields.map(({ id }) => id));
    for (const role of targetSchema.roles) {
      if (
        role.accepts.includes("temporal")
        && !existingIds.has(role.id)
        && !temporalRoleAssigned(plan.preservedRoles?.[role.id], role)
      ) {
        fields.push(role);
        existingIds.add(role.id);
      }
    }
  }
  return structuredClone(fields);
}

function conversionTimeSyncConsequence({
  chart,
  groups,
  targetSchema,
  plan,
  roleAssignments,
}) {
  const member = findChartTimeSyncMember(groups, chart.id);
  if (!chart.interaction?.timeSync || !member) return null;
  if (!targetSchema.capabilities.timeSync) {
    return {
      kind: "remove",
      fromRole: member.timeRole,
    };
  }
  const effectiveRoles = effectiveConversionRoles(
    plan.preservedRoles,
    roleAssignments,
  );
  const assignedTemporalRoles = targetSchema.roles.filter((role) => (
    role.accepts.includes("temporal")
    && temporalRoleAssigned(effectiveRoles[role.id], role)
  ));
  if (assignedTemporalRoles.length === 0) {
    return {
      kind: "remove",
      fromRole: member.timeRole,
    };
  }
  if (assignedTemporalRoles.length > 1) {
    return {
      kind: "ambiguous",
      fromRole: member.timeRole,
    };
  }
  const target = assignedTemporalRoles[0];
  return {
    kind: target.id === member.timeRole ? "preserve" : "remap",
    fromRole: member.timeRole,
    toRole: target.id,
    targetLabel: target.label,
  };
}

function effectiveConversionRoles(preservedRoles, roleAssignments) {
  const roles = structuredClone(preservedRoles ?? {});
  for (const [roleId, assignment] of Object.entries(roleAssignments ?? {})) {
    if (assignment === null || assignment === undefined) {
      delete roles[roleId];
    } else {
      roles[roleId] = structuredClone(assignment);
    }
  }
  return roles;
}

function temporalRoleAssigned(assignment, role) {
  const bindings = Array.isArray(assignment)
    ? assignment
    : assignment ? [assignment] : [];
  return bindings.length > 0 && bindings.every((binding) => (
    isRecord(binding)
    && typeof binding.field === "string"
    && binding.field.trim() !== ""
    && (
      binding.interpretation === "temporal"
      || (
        binding.interpretation === undefined
        && role.accepts.length === 1
        && role.accepts[0] === "temporal"
      )
    )
  ));
}

function findChartTimeSyncMember(groups, chartId) {
  for (const group of Array.isArray(groups) ? groups : []) {
    const member = Array.isArray(group?.members)
      ? group.members.find((candidate) => candidate?.chartId === chartId)
      : null;
    if (member) return member;
  }
  return null;
}

function remapChartTimeRole(groups, chartId, timeRole) {
  const result = structuredClone(groups);
  if (!timeRole) return result;
  for (const group of result) {
    const member = Array.isArray(group.members)
      ? group.members.find((candidate) => candidate.chartId === chartId)
      : null;
    if (member) member.timeRole = timeRole;
  }
  return result;
}

function validateEditorGroups(chart, groups, context) {
  validateTimeSyncGroups(groups, {
    charts: chartsWithDraft(context.existingCharts, chart),
    loadedData: context.loadedData ?? {},
    profiles: context.profiles ?? {},
  });
}

function chartsWithDraft(charts, draft) {
  const result = Array.isArray(charts)
    ? charts.filter((chart) => chart?.id !== draft.id)
    : [];
  result.push(draft);
  return result;
}

function chartPanels(dashboard) {
  return (dashboard?.pages ?? []).flatMap((page) =>
    (page.sections ?? []).flatMap((section) => section.panels ?? []),
  );
}

function removeChartFromGroups(groups, chartId) {
  return structuredClone(groups).flatMap((group) => {
    const members = Array.isArray(group.members)
      ? group.members.filter((member) => member.chartId !== chartId)
      : [];
    return members.length > 0 ? [{ ...group, members }] : [];
  });
}

function createEditorPreparation({ chart, rows, profile }) {
  try {
    const prepared = prepareChartData({
      chart,
      rows,
      datasetProfile: profile,
    });
    return {
      ...prepared,
      meta: {
        ...prepared.meta,
        formPreparationKey: buildFormPreparationKey({ chart, profile }),
      },
    };
  } catch (error) {
    return {
      status: "invalid",
      marks: [],
      diagnostics: [{ message: safeMessage(error) }],
      meta: {
        renderableMarkCount: 0,
        formPreparationKey: buildFormPreparationKey({ chart, profile }),
      },
    };
  }
}

function profileColumnMap(profileEntry) {
  const profile = profileEntry?.datasetProfile
    ?? profileEntry?.profile
    ?? profileEntry;
  if (!Array.isArray(profile?.columns)) return undefined;
  return new Map(profile.columns.map((column) => [column.name, column]));
}

function collectionWithEntry(collection, key, value) {
  if (collection instanceof Map) {
    const next = new Map(collection);
    next.set(key, value);
    return next;
  }
  return {
    ...(isRecord(collection) ? collection : {}),
    [key]: value,
  };
}

function collectionEntries(collection) {
  if (collection instanceof Map) return [...collection.entries()];
  return isRecord(collection) ? Object.entries(collection) : [];
}

function readEntry(collection, key) {
  if (collection instanceof Map) return collection.get(key);
  return isRecord(collection) ? collection[key] : undefined;
}

function cloneGroups(groups) {
  if (!Array.isArray(groups)) {
    throw new TypeError("Time synchronization groups must be an array.");
  }
  return structuredClone(groups);
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

function stableSerialize(value, ancestors = new Set()) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (ancestors.has(value)) {
    throw new TypeError("Saved editor state cannot contain circular data.");
  }
  ancestors.add(value);
  const output = Array.isArray(value)
    ? `[${value.map((entry) => stableSerialize(entry, ancestors)).join(",")}]`
    : `{${Object.keys(value).sort().map((key) => (
        `${JSON.stringify(key)}:${stableSerialize(value[key], ancestors)}`
      )).join(",")}}`;
  ancestors.delete(value);
  return output;
}

function requiredString(value, description) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${description} is required.`);
  }
  return value;
}

function assertEditorState(state) {
  if (
    !state
    || typeof state !== "object"
    || !state.draft
    || !state.savedChart
    || !Array.isArray(state.timeSyncGroups)
    || !Array.isArray(state.savedTimeSyncGroups)
  ) {
    throw new TypeError("Chart editor state is invalid.");
  }
}

function safeMessage(error) {
  const message = typeof error?.message === "string"
    ? error.message
    : "The chart could not be updated.";
  return message.length <= 240 ? message : `${message.slice(0, 239)}…`;
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function noop() {}
