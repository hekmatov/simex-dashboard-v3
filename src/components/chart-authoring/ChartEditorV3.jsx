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
  const dispatch = (action) => setState((current) => reduceChartEditorState(
    current,
    action,
    {
      existingCharts,
      loadedData: runtimeLoadedData,
      profiles: runtimeProfiles,
      profile,
    },
  ));
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
      state.error
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
    const profile = profileDataset(
      Array.isArray(rows) ? rows : [],
      isRecord(source) ? source.parsingMetadata ?? {} : {},
    );
    const charts = chartPanels(dashboard).filter(
      (chart) => chart?.configVersion === 3,
    );
    const runtimeProfiles = Object.fromEntries(
      charts.flatMap((candidate) => {
        const candidateRows = readEntry(loadedData, candidate.sourceId);
        if (!Array.isArray(candidateRows)) return [];
        const candidateSource = readEntry(dataSources, candidate.sourceId);
        return [[
          candidate.sourceId,
          profileDataset(
            candidateRows,
            isRecord(candidateSource)
              ? candidateSource.parsingMetadata ?? {}
              : {},
          ),
        ]];
      }),
    );
    runtimeProfiles[panel.sourceId] = profile;
    return React.createElement(ChartEditorV3, {
      chart: panel,
      timeSyncGroups: dashboard.timeSyncGroups ?? [],
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
  getChartSchema(target);
  if (target === state.draft.typeId) return state;
  const plan = planChartConversion(state.draft, target);
  return {
    ...state,
    conversion: {
      targetTypeId: target,
      plan,
      roleAssignments: {},
      roleFields: structuredClone(plan.requiredRoles),
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
  return {
    ...state,
    conversion: {
      ...state.conversion,
      roleAssignments,
      plan,
    },
    error: "",
  };
}

function applyEditorConversion(state, context) {
  if (!state.conversion) return state;
  if (state.conversion.plan.requiredRoles.length > 0) {
    return {
      ...state,
      error: "Complete the required data roles before applying this chart type change.",
    };
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
    return {
      ...state,
      error: "The chart type change could not be applied to the selected data roles.",
    };
  }
  validateChartInstance(converted, {
    columnTypes: profileColumnMap(
      context.profile ?? readEntry(context.profiles, converted.sourceId),
    ),
  });
  const removesTimeSync = state.conversion.plan.removedSettings.some(
    ({ path }) => path === "interaction.timeSync",
  );
  const groups = removesTimeSync
    ? removeChartFromGroups(state.timeSyncGroups, converted.id)
    : structuredClone(state.timeSyncGroups);
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
