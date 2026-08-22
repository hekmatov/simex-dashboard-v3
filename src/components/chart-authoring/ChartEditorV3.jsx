import React from "react";

import {
  normalizeChartInstance,
  validateChartInstance,
} from "../../charting/config/chartConfigV3.js";
import {
  legacySizeForFootprint,
  resolveChartFootprint,
} from "../chartPanelLayout.js";
import ChartFootprintPicker from "./ChartFootprintPicker.jsx";
import { prepareChartData } from "../../charting/data/prepareChartData.js";
import { profileDataset } from "../../charting/data/profileDataset.js";
import { enforceRenderReadiness } from "../../charting/rendering/buildRenderModel.js";
import {
  buildEditorFormModel,
  buildFormPreparationKey,
} from "../../charting/forms/formModel.js";
import {
  applyGeographyRoleSelection,
  applyGeographySourceSelection,
  geoJoinFieldOptions,
  validatedGeoSourceOptions,
} from "../../charting/forms/geographySource.js";
import {
  applyChartConversion,
  planChartConversion,
} from "../../charting/forms/chartConversion.js";
import {
  getChartSchema,
  listChartSchemas,
} from "../../charting/schemas/chartSchemaRegistry.js";
import { validateTimeSyncGroups } from "../../charting/time/timeSyncModel.js";
import { validateGeoJson } from "../../lib/loadDashboard.js";
import ChartConversionDialog from "./ChartConversionDialog.jsx";
import ChartEditorModal from "./ChartEditorModal.jsx";
import ChartPreview from "./ChartPreview.jsx";
import ContextualTabs from "./ContextualTabs.jsx";
import EditSessionActions from "./EditSessionActions.jsx";
import { createSubmissionGate } from "../../lib/moderatorTransaction.js";
import { compileAuthoredChartRuntimeArtifact } from "../../charting/runtime/authoredChartRuntimeArtifact.js";

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
      return requestEditorConversion(state, action.targetTypeId, context);
    case "updateConversionRole":
      return updateConversionRole(state, action, context);
    case "updateConversionPlayback":
      return updateConversionPlayback(state, action);
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

export function isChartEditorStateDirty(state) {
  assertEditorState(state);
  return stableSerialize({
    chart: state.draft,
    timeSyncGroups: state.timeSyncGroups,
  }) !== stableSerialize({
    chart: state.savedChart,
    timeSyncGroups: state.savedTimeSyncGroups,
  });
}

export const chartEditorStateIsDirty = isChartEditorStateDirty;

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
  geoData = null,
  geoDataSources = {},
  dataSources = {},
  profile: providedProfile,
  prepared: providedPrepared,
  loadedData = {},
  profiles = {},
  parsingMetadata = {},
  timezone = "UTC",
  disabled = false,
  surface = "dialog",
  onSave = noop,
  onReset = noop,
  onCancel = noop,
  onDirtyChange = noop,
  onRemove,
  onApplyCitationToSourceCharts,
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
  const submissionGateRef = React.useRef(null);
  if (submissionGateRef.current === null) {
    submissionGateRef.current = createSubmissionGate();
  }
  const [submitting, setSubmitting] = React.useState(false);
  React.useEffect(() => {
    setState((current) => rebaseChartEditorState(current, {
      chart,
      timeSyncGroups,
      revision: savedRevision,
    }));
  }, [incomingKey]);
  const dirty = isChartEditorStateDirty(state);
  React.useEffect(() => {
    onDirtyChange(dirty);
    return () => onDirtyChange(false);
  }, [dirty, onDirtyChange]);

  const safeRows = Array.isArray(rows) ? rows : [];
  const geoSources = validatedGeoSourceOptions(
    dataSources,
    geoDataSources,
  );
  const draftGeoSourceId = state.draft.presentation?.map?.geoSource;
  const selectedGeoData = readEntry(geoDataSources, draftGeoSourceId)
    ?? (
      draftGeoSourceId === chart.presentation?.map?.geoSource
        ? geoData
        : null
    );
  const geoJoinFields = geoJoinFieldOptions(selectedGeoData);
  const profile = providedProfile ?? profileDataset(safeRows, parsingMetadata);
  const preparationKey = buildFormPreparationKey({
    chart: state.draft,
    profile,
  });
  const prepared = React.useMemo(() => (
    preparationKey !== null
      && providedPrepared?.meta?.formPreparationKey === preparationKey
      ? providedPrepared
      : createEditorPreparation({
          chart: state.draft,
          rows: safeRows,
          profile,
          geoData: selectedGeoData,
        })
  ), [
    preparationKey,
    providedPrepared,
    state.draft,
    safeRows,
    profile,
    selectedGeoData,
  ]);
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
    geoSources,
    geoJoinFields,
  });
  const allCharts = chartsWithDraft(existingCharts, state.draft);
  const timeSyncField = model.sections
    .flatMap(({ fields }) => fields)
    .find(({ id }) => id === "timeSync");
  const editorUpdateContext = {
    existingCharts,
    loadedData: runtimeLoadedData,
    profiles: runtimeProfiles,
    profile,
  };
  const dispatch = (action) => setState((current) => {
    try {
      return reduceChartEditorState(
        current,
        action,
        editorUpdateContext,
      );
    } catch (error) {
      return {
        ...current,
        error: safeMessage(error),
      };
    }
  });
  const changeMembership = (groupId, selected) => {
    const timeRole = timeSyncField?.timeRoles?.[0]?.value;
    dispatch({
      type: "updateTimeSyncMembership",
      groupId,
      selected,
      timeRole,
    });
  };
  const updateChartPath = (path, value) => {
    if (
      path?.length === 3
      && path[0] === "presentation"
      && path[1] === "map"
      && path[2] === "geoSource"
    ) {
      if (!value) {
        dispatch({
          type: "updateChart",
          path: ["presentation", "map"],
          value: undefined,
        });
        return;
      }
      try {
        const selected = applyGeographySourceSelection(state.draft, {
          sourceId: value,
          geoData: readEntry(geoDataSources, value),
          rows: safeRows,
        });
        dispatch({
          type: "updateChart",
          path: ["presentation", "map"],
          value: selected.presentation.map,
        });
      } catch (error) {
        setState((current) => ({
          ...current,
          error: safeMessage(error),
        }));
      }
      return;
    }
    if (
      path?.length === 3
      && path[0] === "presentation"
      && path[1] === "map"
      && path[2] === "joinField"
    ) {
      const map = {
        ...state.draft?.presentation?.map,
      };
      if (typeof value === "string" && value.trim()) {
        map.joinField = value;
      } else {
        delete map.joinField;
      }
      dispatch({
        type: "updateChart",
        path: ["presentation", "map"],
        value: map,
      });
      return;
    }
    if (
      path?.[0] === "roles"
      && getChartSchema(state.draft.typeId).dataFamily === "geography"
    ) {
      setState((current) => {
        try {
          const updated = reduceChartEditorState(current, {
            type: "updateChart",
            path,
            value,
          }, editorUpdateContext);
          const sourceId = updated.draft.presentation?.map?.geoSource;
          return {
            ...updated,
            draft: applyGeographyRoleSelection(updated.draft, {
              geoData: readEntry(geoDataSources, sourceId),
              rows: safeRows,
            }),
          };
        } catch (error) {
          return {
            ...current,
            error: safeMessage(error),
          };
        }
      });
      return;
    }
    dispatch({
      type: "updateChart",
      path,
      value,
    });
  };
  const submit = async (event) => {
    event?.preventDefault?.();
    if (disabled) return undefined;
    return submissionGateRef.current.run(async () => {
      setSubmitting(true);
      try {
        const saved = saveChartEditorState(state, {
          existingCharts,
          loadedData: runtimeLoadedData,
          profiles: runtimeProfiles,
          profile,
        });
        const payload = {
          ...saved,
          runtimeArtifact: compileAuthoredChartRuntimeArtifact({
            chart: saved.chart,
            prepared,
            source: readEntry(dataSources, saved.chart.sourceId)
              ?? { id: saved.chart.sourceId },
            profile,
            geoSource: readEntry(
              dataSources,
              saved.chart.presentation?.map?.geoSource,
            ),
            timeSyncGroups: saved.timeSyncGroups ?? state.timeSyncGroups,
            rows: safeRows,
            timezone,
          }),
        };
        await onSave(payload);
        setState((current) => acceptEditorSave(current, payload));
      } catch (error) {
        setState((current) => ({
          ...current,
          error: safeMessage(error),
        }));
      } finally {
        setSubmitting(false);
      }
    });
  };
  const dismissEditor = () => {
    if (disabled || submissionGateRef.current.isActive()) return;
    onCancel();
  };
  const confirmReset = () => {
    if (disabled || submissionGateRef.current.isActive()) return;
    setState((current) => reduceChartEditorState(
      reduceChartEditorState(current, { type: "confirmReset" }),
      { type: "cancelConfirmation" },
    ));
    onReset();
  };

  const content = React.createElement(
      "aside",
      {
        className: "chart-editor-v3",
        "aria-labelledby": "chart-editor-title",
        "aria-busy": disabled || submitting ? "true" : undefined,
        inert: disabled || submitting ? "" : undefined,
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
                disabled: disabled || submitting,
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
          React.createElement(ChartFootprintPicker, {
            value: resolveChartFootprint(state.draft.layout),
            disabled: disabled || submitting,
            onChange: ({ columns, rows }) => updateChartPath(
              ["layout"],
              {
                ...(state.draft.layout ?? {}),
                size: legacySizeForFootprint({ columns, rows }),
                width: columns,
                height: rows,
              },
            ),
          }),
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
              geoData: selectedGeoData,
              datasetProfile: profile,
              prepared,
              diagnosticNamespace: state.draft.id,
            }),
          ),
          React.createElement(ContextualTabs, {
            sections: model.sections,
            activeTabId: state.activeTabId,
            onSelect: (tabId) => dispatch({ type: "selectTab", tabId }),
            onChange: updateChartPath,
            chart: state.draft,
            charts: allCharts,
            columns: profile?.columns ?? [],
            profile,
            diagnostics: prepared?.diagnostics ?? [],
            diagnosticNamespace: state.draft.id,
            loadedData: runtimeLoadedData,
            profiles: runtimeProfiles,
            dataSources,
            onApplyCitationToSourceCharts,
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
          submitting,
          disabled,
          resetConfirmationOpen: state.confirmation === "reset",
          onRequestReset: () => dispatch({ type: "requestReset" }),
          onConfirmReset: confirmReset,
          onCancelReset: () => dispatch({ type: "cancelConfirmation" }),
          onSave: submit,
          onCancel: dismissEditor,
          onRemove,
        }),
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
        onPlaybackSelection: (selection) => dispatch({
          type: "updateConversionPlayback",
          selection,
        }),
        onConfirm: () => dispatch({ type: "applyConversion" }),
        onCancel: () => dispatch({ type: "cancelConversion" }),
      }),
  );
  return surface === "inspector"
    ? React.createElement("div", { className: "chart-editor-inspector" }, content)
    : React.createElement(ChartEditorModal, { onClose: dismissEditor }, content);
}

export function SelectedChartEditor({
  panel,
  dashboard = {},
  savedRevision,
  profiles: suppliedProfiles,
  onSave,
  onReset,
  onCancel,
  onRemove,
} = {}) {
  if (panel?.configVersion !== 3 || typeof panel.typeId !== "string") {
    throw new Error("The live editor accepts only version 3 charts.");
  }
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
  const geoSourceId = panel.presentation?.map?.geoSource;
  const geoDataSources = validatedEditorGeoDataSources(
    dataSources,
    loadedData,
  );
  const geoData = readEntry(geoDataSources, geoSourceId) ?? null;
  const charts = chartPanels(dashboard);
  return React.createElement(ChartEditorV3, {
    chart: panel,
    timeSyncGroups: dashboard.timeSyncGroups ?? [],
    savedRevision,
    existingCharts: charts,
    rows: Array.isArray(rows) ? rows : [],
    geoData,
    geoDataSources,
    dataSources,
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

function validatedEditorGeoDataSources(dataSources, loadedData) {
  const result = Object.create(null);
  for (const [sourceId, source] of collectionEntries(dataSources)) {
    if (source?.kind !== "geojson") continue;
    const candidate = readEntry(loadedData, sourceId);
    try {
      validateGeoJson(candidate, `Data source "${sourceId}" GeoJSON`);
      result[sourceId] = candidate;
    } catch {
      // Invalid geography never reaches the editor selector or preview.
    }
  }
  return result;
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
  const selected = action.selected ?? groupId !== null;
  if (typeof selected !== "boolean") {
    throw new TypeError("Time synchronization membership selection must be boolean.");
  }
  let nextGroups = structuredClone(state.timeSyncGroups);
  if (groupId === null) {
    for (const group of nextGroups) {
      const members = Array.isArray(group.members) ? group.members : [];
      group.members = members.filter(({ chartId }) => chartId !== state.draft.id);
    }
  } else {
    const target = nextGroups.find(({ id }) => id === groupId);
    if (!target) {
      throw new Error(`Unknown time synchronization group "${groupId}".`);
    }
    const members = Array.isArray(target.members) ? target.members : [];
    const previousMember = members.find(
      ({ chartId }) => chartId === state.draft.id
    );
    target.members = members.filter(({ chartId }) => chartId !== state.draft.id);
    const timeRole = requiredString(
      action.timeRole,
      "Time synchronization temporal role",
    );
    if (selected) {
      target.members.push({
        chartId: state.draft.id,
        timeRole,
        ...(previousMember?.matching
          ? { matching: structuredClone(previousMember.matching) }
          : {}),
      });
    }
  }
  const chart = setAtPath(
    state.draft,
    ["interaction", "timeSync"],
    null,
  );
  validateEditorGroups(chart, nextGroups, context);
  return {
    ...state,
    draft: chart,
    timeSyncGroups: nextGroups,
    error: "",
  };
}

function requestEditorConversion(state, targetTypeId, context) {
  const target = requiredString(targetTypeId, "Target chart type");
  const targetSchema = getChartSchema(target);
  if (target === state.draft.typeId) return state;
  const plan = planChartConversion(state.draft, target);
  const roleAssignments = {};
  const roleFields = conversionRoleFields({
    chart: state.draft,
    groups: state.timeSyncGroups,
    targetSchema,
    plan,
  });
  const playback = conversionPlaybackState({
    chart: state.draft,
    groups: state.timeSyncGroups,
    targetSchema,
    plan,
    roleAssignments,
    profile: conversionProfile(context, state.draft.sourceId),
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
        playback,
      }),
      playback,
    },
    error: "",
  };
}

function updateConversionRole(state, action, context) {
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
  const playback = conversionPlaybackState({
    chart: state.draft,
    groups: state.timeSyncGroups,
    targetSchema,
    plan,
    roleAssignments,
    profile: conversionProfile(context, state.draft.sourceId),
    previousPlayback: state.conversion.playback,
  });
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
        playback,
      }),
      playback,
    },
    error: "",
  };
}

function updateConversionPlayback(state, action) {
  if (!state.conversion?.playback) return state;
  const selection = normalizePlaybackSelection(
    action.selection,
    state.conversion.playback,
  );
  const playback = {
    ...state.conversion.playback,
    selection,
  };
  const targetSchema = getChartSchema(state.conversion.targetTypeId);
  return {
    ...state,
    conversion: {
      ...state.conversion,
      playback,
      timeSyncConsequence: conversionTimeSyncConsequence({
        chart: state.draft,
        groups: state.timeSyncGroups,
        targetSchema,
        playback,
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
    if (
      state.conversion.timeSyncConsequence?.kind === "ambiguous"
      || (
        state.conversion.playback?.selectable
        && state.conversion.playback.options.length > 0
        && !state.conversion.playback.selection
      )
    ) {
      throw new Error(
        "Choose a playback time role or remove the chart from synchronized playback.",
      );
    }
    let converted = applyChartConversion(
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
    const consequence = state.conversion.timeSyncConsequence;
    if (
      consequence?.kind === "remove"
      && converted.interaction?.timeSync !== null
    ) {
      converted = normalizeChartInstance(setAtPath(
        converted,
        ["interaction", "timeSync"],
        null,
      ));
    }
    validateChartInstance(converted, {
      columnTypes: profileColumnMap(
        context.profile ?? readEntry(context.profiles, converted.sourceId),
      ),
    });
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
    const message = /required data roles|playback time role/i.test(detail)
      ? detail
      : `Check the required data roles. ${detail}`;
    return {
      ...state,
      error: safeMessage(new Error(message)),
    };
  }
}

function conversionRoleFields({ chart, groups, targetSchema, plan }) {
  const fields = [...plan.requiredRoles];
  if (
    findChartTimeSyncMember(groups, chart.id)
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
  playback,
}) {
  const member = findChartTimeSyncMember(groups, chart.id);
  if (!member) return null;
  if (
    !targetSchema.capabilities.timeSync
    || playback?.selection?.mode === "remove"
  ) {
    return {
      kind: "remove",
      fromRole: member.timeRole,
      ...(playback?.selection?.explicit ? { intentional: true } : {}),
    };
  }
  if (!playback || playback.options.length === 0) {
    return {
      kind: "remove",
      fromRole: member.timeRole,
    };
  }
  if (!playback.selection) {
    return {
      kind: "ambiguous",
      fromRole: member.timeRole,
    };
  }
  const target = playback.options.find(
    ({ roleId }) => roleId === playback.selection.roleId,
  );
  if (!target) {
    return {
      kind: "ambiguous",
      fromRole: member.timeRole,
    };
  }
  return {
    kind: target.roleId === member.timeRole ? "preserve" : "remap",
    fromRole: member.timeRole,
    toRole: target.roleId,
    targetLabel: target.label,
  };
}

function conversionPlaybackState({
  chart,
  groups,
  targetSchema,
  plan,
  roleAssignments,
  profile,
  previousPlayback,
}) {
  const synchronized = Boolean(findChartTimeSyncMember(groups, chart.id));
  if (!synchronized) return null;
  const selectable = targetSchema.capabilities.timeSync;
  const effectiveRoles = effectiveConversionRoles(
    plan.preservedRoles,
    roleAssignments,
  );
  const requiredRoleIds = new Set(
    plan.requiredRoles.map(({ id }) => id),
  );
  const options = selectable
    ? targetSchema.roles.flatMap((role) => (
        role.accepts.includes("temporal")
        && !requiredRoleIds.has(role.id)
        && temporalRoleAssigned(effectiveRoles[role.id], role, profile)
          ? [{ roleId: role.id, label: role.label }]
          : []
      ))
    : [];
  let selection = null;
  const previous = previousPlayback?.selection;
  if (!selectable || options.length === 0) {
    selection = { mode: "remove", explicit: false };
  } else if (
    previous?.mode === "remove"
    && previous.explicit === true
  ) {
    selection = previous;
  } else if (
    previous?.mode === "role"
    && previous.explicit === true
    && options.some(({ roleId }) => roleId === previous.roleId)
  ) {
    selection = previous;
  } else if (options.length === 1) {
    selection = {
      mode: "role",
      roleId: options[0].roleId,
      explicit: false,
    };
  }
  return {
    selectable,
    options,
    selection,
  };
}

function normalizePlaybackSelection(selection, playback) {
  if (selection === null && playback.options.length > 1) return null;
  if (!isRecord(selection) || typeof selection.mode !== "string") {
    throw new Error("A playback time role choice is required.");
  }
  if (selection.mode === "remove") {
    if (!playback.selectable || playback.options.length === 0) {
      throw new Error("Synchronized playback removal is not selectable here.");
    }
    return { mode: "remove", explicit: true };
  }
  if (selection.mode !== "role") {
    throw new Error("Unknown synchronized playback choice.");
  }
  const roleId = requiredString(selection.roleId, "Playback time role");
  if (!playback.options.some((option) => option.roleId === roleId)) {
    throw new Error(
      `Playback time role "${roleId}" is not eligible for the current data roles.`,
    );
  }
  return {
    mode: "role",
    roleId,
    explicit: true,
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

function temporalRoleAssigned(assignment, role, profileEntry) {
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
    && profileAllowsTemporalField(profileEntry, binding.field)
  ));
}

function profileAllowsTemporalField(profileEntry, field) {
  const profile = profileEntry?.datasetProfile
    ?? profileEntry?.profile
    ?? profileEntry;
  if (!Array.isArray(profile?.columns)) return true;
  const columns = profile.columns.filter((column) => column?.name === field);
  return columns.length === 1 && columns[0].type === "temporal";
}

function conversionProfile(context, sourceId) {
  return context?.profile ?? readEntry(context?.profiles, sourceId);
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

function createEditorPreparation({ chart, rows, profile, geoData }) {
  try {
    const prepared = enforceRenderReadiness({
      chart,
      prepared: prepareChartData({
        chart,
        rows,
        datasetProfile: profile,
        geoData,
      }),
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
