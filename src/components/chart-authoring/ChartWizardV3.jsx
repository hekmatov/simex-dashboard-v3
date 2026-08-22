import React from "react";
import {
  buildEditorFormModel,
  buildFormPreparationKey,
  buildWizardFormModel,
} from "../../charting/forms/formModel.js";
import {
  createWizardState,
  CHART_CREATION_STAGES,
  CHART_CREATION_STAGE_LABELS,
  finalizeWizardDraft,
  reduceWizardState,
} from "../../charting/forms/wizardDraft.js";
import {
  createManualDataTemplate,
  manualDataAllowed,
  validateManualData,
} from "../../charting/forms/manualData.js";
import {
  applyGeographyRoleSelection,
  applyGeographySourceSelection,
  geoJoinFieldOptions,
  validatedGeoSourceOptions,
} from "../../charting/forms/geographySource.js";
import { prepareChartData } from "../../charting/data/prepareChartData.js";
import { profileDataset } from "../../charting/data/profileDataset.js";
import { enforceRenderReadiness } from "../../charting/rendering/buildRenderModel.js";
import { getChartSchema } from "../../charting/schemas/chartSchemaRegistry.js";
import { validateTimeSyncGroups } from "../../charting/time/timeSyncModel.js";
import { parseCsvText } from "../../lib/loadCsv.js";
import ConfirmDialog from "../common/ConfirmDialog.jsx";
import { IconControl } from "../common/SimExIcon.js";
import { useModalFocus } from "../common/ModalFocusScope.jsx";
import ChartTypePicker from "./ChartTypePicker.jsx";
import DataRolesStep from "./DataRolesStep.jsx";
import DataSourceStep from "./DataSourceStep.jsx";
import StyleLayoutStep from "./StyleLayoutStep.jsx";
import { createSubmissionGate } from "../../lib/moderatorTransaction.js";
import { requestRenderProof } from "../../charting/forms/chartProof.js";
import {
  createChartCreateSnapshot,
  executeChartCreate,
} from "../../charting/forms/chartCreateController.js";

export const MAX_UPLOADED_CSV_BYTES = 2 * 1024 * 1024;
export const MAX_UPLOADED_CSV_ROWS = 50_000;
const noop = () => {};

const CREATION_STAGE_LABELS = Object.freeze(Object.fromEntries(
  CHART_CREATION_STAGES.map((stage, index) => [stage, CHART_CREATION_STAGE_LABELS[index]]),
));

const LEGACY_STEP_FOR_STAGE = Object.freeze({
  "chart-type": "type",
  "data-source": "source",
  "map-and-prepare-data": "roles",
  "configure-chart": "style",
  "review-and-create": "style",
});

export function createWizardCloseHandlers({
  isSubmitting = () => false,
  onRequestClose = noop,
  onConfirmClose = noop,
} = {}) {
  const run = (operation) => () => {
    if (isSubmitting()) return false;
    operation();
    return true;
  };
  return Object.freeze({
    requestClose: run(onRequestClose),
    confirmClose: run(onConfirmClose),
  });
}

/**
 * Schema-generated chart authoring flow.
 *
 * `existingCharts` is the authoritative dashboard chart collection used when
 * validating complete synchronized-playback groups. It is never mutated.
 */
export default function ChartWizardV3({
  open,
  dataSources,
  loadedData,
  datasetProfiles,
  geoDataSources,
  timeSyncGroups,
  existingCharts = [],
  destination = null,
  dashboardRevision = null,
  initialDraftState = null,
  suspendControllerRef = null,
  disabled = false,
  onClose,
  onDirtyChange = noop,
  onDraftStateChange = noop,
  onSuspendedChange = noop,
  onCreate,
}) {
  const safeDataSources = isRecord(dataSources) ? dataSources : {};
  const safeLoadedData = collectionOrEmpty(loadedData);
  const safeDatasetProfiles = collectionOrEmpty(datasetProfiles);
  const safeGeoDataSources = collectionOrEmpty(geoDataSources);
  const geoSources = validatedGeoSourceOptions(
    safeDataSources,
    safeGeoDataSources,
  );
  const safeGroups = Array.isArray(timeSyncGroups) ? timeSyncGroups : [];
  const safeExistingCharts = Array.isArray(existingCharts)
    ? existingCharts
    : [];
  const [wizard, setWizard] = React.useState(() => initialDraftState ?? createChartWizardState({
      loadedData: safeLoadedData,
      profiles: safeDatasetProfiles,
      timeSyncGroups: safeGroups,
      existingCharts: safeExistingCharts,
      destination,
      dashboardRevision,
    }));
  const [query, setQuery] = React.useState("");
  const [localRows, setLocalRows] = React.useState({});
  const [sourceKind, setSourceKind] = React.useState("");
  const [manualTable, setManualTable] = React.useState(null);
  const [manualErrors, setManualErrors] = React.useState([]);
  const [uploadError, setUploadError] = React.useState("");
  const [submissionError, setSubmissionError] = React.useState("");
  const transactionIdRef = React.useRef(null);
  const submissionGateRef = React.useRef(null);
  if (submissionGateRef.current === null) {
    submissionGateRef.current = createSubmissionGate();
  }
  const [submitting, setSubmitting] = React.useState(false);
  const [pendingSourceUi, setPendingSourceUi] = React.useState(null);
  const operationLocked = () => (
    disabled || submissionGateRef.current.isActive()
  );
  const closeHandlers = createWizardCloseHandlers({
    isSubmitting: operationLocked,
    onRequestClose: requestClose,
    onConfirmClose: confirmClose,
  });
  const wizardDialogRef = useModalFocus({
    open,
    initialFocusSelector: "[data-modal-initial-focus=\"true\"]",
    onEscape: () => closeHandlers.requestClose(),
  });
  React.useImperativeHandle(suspendControllerRef, () => ({
    suspend: requestClose,
  }));

  function requestClose() {
    if (operationLocked()) return false;
    const suspended = reduceWizardState(wizard, {
      type: "suspend",
      restoration: {
        stage: wizard.stage,
        focusId: `chart-stage-${wizard.stage}`,
        invokerId: "build-add-chart",
        scrollTop: wizardDialogRef.current?.scrollTop ?? 0,
        targetId: wizard.draft?.id ?? null,
      },
    });
    setWizard(suspended);
    onDraftStateChange(suspended);
    setSubmissionError("");
    onSuspendedChange(true);
    onClose?.();
    return true;
  }

  React.useEffect(() => {
    if (!open) return;
    setWizard((current) => {
      const resumed = current.suspension
        ? reduceWizardState(current, { type: "resume" })
        : current;
      return resumed.destination || !destination
        ? resumed
        : reduceWizardState(resumed, { type: "setDestination", destination });
    });
  }, [open, destination?.pageId, destination?.sectionId]);

  const dirty = isChartWizardStateDirty({
    open,
    wizard,
    sourceKind,
    manualTable,
    localRows,
  });
  React.useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);
  React.useEffect(() => {
    onDraftStateChange(wizard);
  }, [onDraftStateChange, wizard]);
  React.useEffect(() => (
    () => onDirtyChange(false)
  ), [onDirtyChange]);

  React.useEffect(() => {
    if (!open) return;
    const selectedStep = wizardDialogRef.current?.querySelector(
      "[data-modal-initial-focus=\"true\"]",
    );
    selectedStep?.focus?.({ preventScroll: true });
  }, [open, wizard.stage, wizardDialogRef]);

  const runtimeLoadedData = React.useMemo(
    () => mergeCollections(safeLoadedData, localRows),
    [safeLoadedData, localRows],
  );
  const rows = readEntry(runtimeLoadedData, wizard.draft?.sourceId) ?? [];
  const source = wizard.source
    ?? readEntry(safeDataSources, wizard.draft?.sourceId);
  const geoData = readEntry(
    safeGeoDataSources,
    wizard.draft?.presentation?.map?.geoSource,
  );
  const geoJoinFields = geoJoinFieldOptions(geoData);
  const authorMetadata = React.useMemo(
    () => source?.parsingMetadata ?? manualParsingMetadata(manualTable),
    [source?.parsingMetadata, manualTable],
  );
  const runtime = React.useMemo(() => createWizardPreparation({
      chart: wizard.draft,
      rows,
      geoData,
      authorMetadata,
    }), [wizard.draft, rows, geoData, authorMetadata]);
  const profiles = React.useMemo(() => {
    const cached = mergeCollections(safeDatasetProfiles, wizard.profiles);
    const sourceId = wizard.draft?.sourceId;
    return sourceId
      ? { ...cached, [sourceId]: runtime.profile }
      : cached;
  }, [safeDatasetProfiles, wizard.profiles, wizard.draft?.sourceId, runtime.profile]);

  if (!open) return null;
  const syncedWizard = {
    ...wizard,
    loadedData: runtimeLoadedData,
    profiles,
  };
  const form = buildWizardFormModel({
    draft: wizard.draft,
    profile: runtime.profile,
    prepared: runtime.prepared,
    timeSyncGroups: wizard.timeSyncGroups,
    geoSources,
    geoJoinFields,
  });
  const canCreate = form.canCreate
    && (sourceKind !== "manual" || manualErrors.length === 0);
  const editor = wizard.draft
    ? buildEditorFormModel({
        chart: wizard.draft,
        profile: runtime.profile,
        prepared: runtime.prepared,
        timeSyncGroups: wizard.timeSyncGroups,
        geoSources,
        geoJoinFields,
        includeCitation: false,
      })
    : { sections: [], valid: false };
  const activeLegacyStep = LEGACY_STEP_FOR_STAGE[wizard.stage] ?? "type";
  const active = form.steps.find(({ id }) => id === activeLegacyStep)
    ?? form.steps[0]
    ?? { prerequisites: [] };
  const activeStageIndex = CHART_CREATION_STAGES.indexOf(wizard.stage);
  const dataSection = editor.sections.find(({ id }) => id === "data") ?? null;
  const timeSyncField = editor.sections
    .flatMap(({ fields }) => fields)
    .find(({ id }) => id === "timeSync");
  const configurationSections = editor.sections
    .filter(({ id }) => id !== "data")
    .map((section) => ({
      ...section,
      fields: section.fields.filter(({ id }) => id !== "timeSync"),
    }))
    .filter(({ fields }) => fields.length > 0);
  const renderProof = requestRenderProof({
    draftRevision: runtime.prepared?.meta?.formPreparationKey ?? "unprepared",
    chart: wizard.draft,
    preparedData: runtime.prepared,
  });
  const placementProof = {
    status: wizard.destination?.pageId && wizard.destination?.sectionId
      ? "valid"
      : "invalid",
    orderedText: wizard.destination?.pageId && wizard.destination?.sectionId
      ? `Page ${wizard.destination.pageId}; section ${wizard.destination.sectionId}; append; standard width; standard height.`
      : "Choose a page and section before placement can be validated.",
  };
  const creationStageStatuses = deriveVisibleStageStatuses({
    wizard,
    form,
    placementProof,
    renderProof,
    canCreate,
  });

  const dispatch = (action) => {
    setWizard((current) => reduceWizardState({
      ...current,
      loadedData: runtimeLoadedData,
      profiles,
    }, action));
    setSubmissionError("");
  };
  const navigateCreationStage = (stage) => {
    setWizard((current) => {
      let next = reduceWizardState(current, { type: "setStage", stage });
      const legacyStep = LEGACY_STEP_FOR_STAGE[stage];
      if (legacyStep) next = reduceWizardState(next, { type: "navigate", step: legacyStep });
      return next;
    });
    setSubmissionError("");
  };
  const updatePath = (path, value) => dispatch({
    type: "updateChart",
    path,
    value,
  });
  const updateAuthoringPath = (path, value) => {
    if (
      path?.length === 3
      && path[0] === "presentation"
      && path[1] === "map"
      && path[2] === "geoSource"
    ) {
      if (!value) {
        updatePath(["presentation", "map"], undefined);
        return;
      }
      try {
        const selected = applyGeographySourceSelection(wizard.draft, {
          sourceId: value,
          geoData: readEntry(safeGeoDataSources, value),
          rows,
        });
        updatePath(["presentation", "map"], selected.presentation.map);
      } catch (error) {
        setSubmissionError(safeMessage(error));
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
        ...wizard.draft?.presentation?.map,
      };
      if (typeof value === "string" && value.trim()) {
        map.joinField = value;
      } else {
        delete map.joinField;
      }
      updatePath(["presentation", "map"], map);
      return;
    }
    if (
      path?.[0] === "roles"
      && wizard.draft
      && getChartSchema(wizard.draft.typeId).dataFamily === "geography"
    ) {
      setWizard((current) => {
        const updated = reduceWizardState({
          ...current,
          loadedData: runtimeLoadedData,
          profiles,
        }, {
          type: "updateChart",
          path,
          value,
        });
        const sourceId = updated.draft?.presentation?.map?.geoSource;
        return {
          ...updated,
          draft: applyGeographyRoleSelection(updated.draft, {
            geoData: readEntry(safeGeoDataSources, sourceId),
            rows,
          }),
        };
      });
      setSubmissionError("");
      return;
    }
    updatePath(path, value);
  };
  const applySourceUi = (nextUi) => {
    setSourceKind(nextUi.kind);
    setManualTable(nextUi.manualTable ?? null);
    setManualErrors(nextUi.manualErrors ?? []);
    setUploadError("");
    if (nextUi.localSourceId && Array.isArray(nextUi.localRows)) {
      setLocalRows((current) => ({
        ...current,
        [nextUi.localSourceId]: nextUi.localRows.map((row) => ({ ...row })),
      }));
    }
  };
  const requestSourceSelection = (action, nextUi) => {
    let next = reduceWizardState(syncedWizard, {
      type: "requestSourceChange",
      ...action,
    });
    if (next.confirmation === "changeSource") {
      setPendingSourceUi(structuredClone(nextUi));
    } else {
      if (Array.isArray(nextUi.manualColumns)) {
        next = assignManualRoles(
          next,
          getChartSchema(next.draft.typeId),
          nextUi.manualColumns,
        );
      }
      applySourceUi(nextUi);
      setPendingSourceUi(null);
    }
    setWizard(next);
    setSubmissionError("");
  };
  const selectExisting = (sourceId) => {
    if (!sourceId) return;
    const rows = readEntry(safeLoadedData, sourceId) ?? [];
    const sourceMetadata = readEntry(safeDataSources, sourceId);
    requestSourceSelection({
      sourceId,
      source: null,
      rows,
      profile: profileDataset(
        rows,
        sourceMetadata?.parsingMetadata ?? {},
      ),
    }, {
      kind: "existing",
      manualTable: null,
      manualErrors: [],
    });
  };
  const uploadCsv = async (file) => {
    if (!file) return;
    try {
      const parsed = await parseUploadedCsvFile(file, {
        ...safeDataSources,
        ...localRows,
      });
      requestSourceSelection({
        sourceId: parsed.sourceId,
        source: parsed.source,
        rows: parsed.rows,
        profile: parsed.profile,
      }, {
        kind: "upload",
        manualTable: null,
        manualErrors: [],
        localSourceId: parsed.sourceId,
        localRows: parsed.rows,
      });
    } catch (error) {
      setUploadError(safeMessage(error));
    }
  };
  const updateManual = (table, {
    schema = wizard.draft ? getChartSchema(wizard.draft.typeId) : null,
    currentWizard = wizard,
  } = {}) => {
    if (!schema || !manualDataAllowed(schema)) return;
    const validation = validateManualData(schema, table);
    const sourceId = `inline-${currentWizard.draft.id}`;
    const manualRows = table.rows.map((row) => ({ ...row }));
    const inlineSource = { kind: "inline", rows: manualRows };
    const profile = profileDataset(
      manualRows,
      manualParsingMetadata(table),
    );
    requestSourceSelection({
      sourceId,
      source: inlineSource,
      rows: manualRows,
      profile,
    }, {
      kind: "manual",
      manualTable: structuredClone(table),
      manualErrors: validation.errors,
      manualColumns: structuredClone(table.columns),
      localSourceId: sourceId,
      localRows: manualRows,
    });
  };
  const selectManual = () => {
    if (!wizard.draft) return;
    const schema = getChartSchema(wizard.draft.typeId);
    updateManual(createManualDataTemplate(schema), {
      schema,
      currentWizard: wizard,
    });
  };
  const changeMembership = (groupId, selected) => {
    if (!wizard.draft) return;
    const timeRole = timeSyncField?.timeRoles
      ?.find(({ field }) => typeof field === "string")?.value
      ?? timeSyncField?.timeRoles?.[0]?.value;
    try {
      const proposal = applyWizardMembership({
        chart: wizard.draft,
        groups: wizard.timeSyncGroups,
        groupId,
        selected,
        timeRole,
      });
      validateTimeSyncGroups(proposal.groups, {
        charts: chartsWithDraft(wizard.charts, proposal.chart),
        loadedData: runtimeLoadedData,
        profiles,
      });
      setWizard((current) => ({
        ...current,
        draft: proposal.chart,
        timeSyncGroups: proposal.groups,
        timeSyncGroupsProvided: true,
      }));
      setSubmissionError("");
    } catch (error) {
      setSubmissionError(safeMessage(error));
    }
  };
  const finish = async () => {
    if (!canCreate || disabled) return;
    return submissionGateRef.current.run(async () => {
      setSubmitting(true);
      try {
        const finalized = finalizeWizardDraft(syncedWizard);
        transactionIdRef.current ??= [
          "chart-create",
          finalized.chart.id,
          wizard.dashboardRevision ?? dashboardRevision ?? "session",
        ].join(":");
        const snapshot = createChartCreateSnapshot({
          transactionId: transactionIdRef.current,
          draftId: wizard.draftId ?? finalized.chart.id,
          finalized,
          destination: wizard.destination ?? destination,
          dashboardRevision: wizard.dashboardRevision ?? dashboardRevision,
          permissionRevision: "chart-create-current",
          schemaRevision: wizard.chartTypeRevision
            ?? getChartSchema(finalized.chart.typeId).version,
          source: {
            ...(source ?? {}),
            id: finalized.chart.sourceId,
            profileRevision: wizard.profileRevision
              ?? runtime.profile?.revision
              ?? "profile-current",
          },
          renderProof,
          placementProof,
          priorScrollAnchor: wizardDialogRef.current?.scrollTop ?? 0,
        });
        setWizard((current) => reduceWizardState(current, {
          type: "commitStarted",
          transactionId: transactionIdRef.current,
        }));
        const result = await executeChartCreate(snapshot, {
          persist: async (payload, reviewedPlacement) => {
            if (typeof onCreate !== "function") {
              throw new TypeError("Chart creation requires an onCreate callback.");
            }
            await onCreate(payload, reviewedPlacement);
            return { dashboardRevision: dashboardRevision ?? "session-current" };
          },
        });
        if (result.status === "validation-failed") {
          setWizard((current) => reduceWizardState(current, {
            type: "commitResult",
            result: { status: "failed", error: result.errors[0] },
          }));
          setSubmissionError(result.errors[0]?.message ?? "The reviewed chart changed before creation.");
        } else {
          setWizard((current) => reduceWizardState(current, {
            type: "commitResult",
            result,
          }));
          if (result.status === "committed") {
            setSubmissionError("");
            onSuspendedChange(false);
          } else if (result.status === "ambiguous") {
            setSubmissionError("Creation outcome is uncertain. Reconcile this transaction before retrying.");
          } else {
            setSubmissionError(result.error?.message ?? "The chart could not be created.");
          }
        }
      } catch (error) {
        setSubmissionError(safeMessage(error));
      } finally {
        setSubmitting(false);
      }
    });
  };
  function confirmClose() {
    if (operationLocked()) return;
    const closed = reduceWizardState(wizard, { type: "confirmClose" });
    setWizard(closed);
    onDraftStateChange(closed);
    if (closed.closed) {
      onSuspendedChange(false);
      if (typeof onClose === "function") onClose();
    }
  }

  return React.createElement(
    "div",
    {
      className: "chart-wizard-backdrop",
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "chart-wizard-title",
      "aria-busy": disabled || submitting ? "true" : undefined,
      inert: disabled || submitting ? "" : undefined,
      tabIndex: -1,
      ref: wizardDialogRef,
    },
    React.createElement(
      "section",
      { className: "chart-wizard chart-wizard-v3" },
      React.createElement(
        "header",
        { className: "chart-wizard-header" },
        React.createElement(
          "div",
          null,
          React.createElement("p", { className: "eyebrow" }, "Add new chart"),
          React.createElement(
            "h2",
            { id: "chart-wizard-title" },
            CREATION_STAGE_LABELS[wizard.stage],
          ),
        ),
        React.createElement(IconControl, {
          interactionId: "wizard.close-wizard",
          className: "secondary chart-wizard-close",
          disabled: disabled || submitting,
          onClick: closeHandlers.requestClose,
        }),
      ),
      React.createElement(
        "nav",
        {
          className: "chart-wizard-step-tabs",
          "aria-label": "Chart creation steps",
        },
        CHART_CREATION_STAGES.map((stage) => React.createElement("button", {
          key: stage,
          id: `chart-stage-${stage}`,
          type: "button",
          className: "chart-wizard-step-button",
          "data-modal-initial-focus":
            wizard.stage === stage ? "true" : undefined,
          "aria-current": wizard.stage === stage ? "step" : undefined,
          "aria-label": `${CREATION_STAGE_LABELS[stage]}. ${creationStageStatuses[stage]}.`,
          "data-status": creationStageStatuses[stage],
          tabIndex: wizard.stage === stage ? 0 : -1,
          disabled: disabled || submitting,
          onClick: () => navigateCreationStage(stage),
          onKeyDown: (event) => handleStageNavigationKey(event, stage, navigateCreationStage),
        }, React.createElement("span", null, CREATION_STAGE_LABELS[stage]), React.createElement("small", null, creationStageStatuses[stage]))),
      ),
      React.createElement(
        "div",
        { className: "chart-wizard-body" },
        wizard.stage === "destination"
          ? React.createElement(
              "section",
              { className: "chart-wizard-step chart-wizard-destination", "aria-labelledby": "chart-destination-heading" },
              React.createElement("h3", { id: "chart-destination-heading" }, "Choose destination and placement"),
              React.createElement("p", null, "Destination stays attached to this chart draft even if you inspect another page."),
              React.createElement(
                "dl",
                { className: "chart-destination-ledger" },
                React.createElement("div", null, React.createElement("dt", null, "Page"), React.createElement("dd", null, wizard.destination?.pageId ?? "Needs attention")),
                React.createElement("div", null, React.createElement("dt", null, "Section"), React.createElement("dd", null, wizard.destination?.sectionId ?? "Needs attention")),
                React.createElement("div", null, React.createElement("dt", null, "Insertion"), React.createElement("dd", null, wizard.destination?.position ?? "Append to section")),
                React.createElement("div", null, React.createElement("dt", null, "Panel preset"), React.createElement("dd", null, "Standard width · Standard height")),
              ),
              React.createElement("p", { className: "chart-proof-state", role: "status" }, placementProof.orderedText),
            )
          : null,
        wizard.stage === "chart-type"
          ? React.createElement(ChartTypePicker, {
              value: wizard.draft?.typeId ?? "",
              query,
              onQueryChange: setQuery,
              onChange: (typeId) => {
                setSourceKind("");
                setManualTable(null);
                setManualErrors([]);
                dispatch({
                  type: "selectType",
                  typeId,
                  chart: {
                    ...(wizard.draft
                      ? {}
                      : { id: newChartId(typeId) }),
                    title: "",
                  },
                });
                navigateCreationStage("data-source");
              },
            })
          : null,
        wizard.stage === "data-source"
          ? React.createElement(DataSourceStep, {
              dataSources: safeDataSources,
              loadedData: safeLoadedData,
              selectedSourceId: wizard.draft?.sourceId ?? "",
              selectedSource: source,
              selectedSourceKind: sourceKind,
              profile: runtime.profile,
              manualAllowed: wizard.draft
                ? manualDataAllowed(getChartSchema(wizard.draft.typeId))
                : false,
              manualTable,
              manualErrors,
              uploadError,
              geographyRequired: wizard.draft
                ? getChartSchema(wizard.draft.typeId).dataFamily === "geography"
                : false,
              geoSources,
              selectedGeoSourceId:
                wizard.draft?.presentation?.map?.geoSource ?? "",
              prerequisites: active.prerequisites,
              onSelectExisting: selectExisting,
              onUploadCsv: uploadCsv,
              onSelectManual: selectManual,
              onManualTableChange: updateManual,
              onGeoSourceChange: (value) => updateAuthoringPath(
                ["presentation", "map", "geoSource"],
                value,
              ),
              onRequestClear: () => dispatch({ type: "requestClearSource" }),
            })
          : null,
        wizard.stage === "map-and-prepare-data"
          ? React.createElement(DataRolesStep, {
              section: dataSection,
              prerequisites: active.prerequisites,
              columns: runtime.profile?.columns ?? [],
              chart: wizard.draft,
              profile: runtime.profile,
              diagnostics: runtime.prepared?.diagnostics ?? [],
              diagnosticNamespace: wizard.draft?.id,
              onChange: updateAuthoringPath,
            })
          : null,
        wizard.stage === "map-and-prepare-data" && wizard.draft
          ? React.createElement(ChartTimeMemberships, {
              chart: wizard.draft,
              groups: wizard.timeSyncGroups,
              timeRole: timeSyncField?.timeRoles?.find(({ field }) => typeof field === "string")?.value
                ?? timeSyncField?.timeRoles?.[0]?.value,
              onChange: changeMembership,
            })
          : null,
        wizard.stage === "configure-chart"
          ? React.createElement(StyleLayoutStep, {
              chart: wizard.draft,
              rows,
              geoData,
              profile: runtime.profile,
              prepared: runtime.prepared,
              sections: configurationSections,
              prerequisites: active.prerequisites,
              columns: runtime.profile?.columns ?? [],
              charts: chartsWithDraft(wizard.charts, wizard.draft),
              loadedData: runtimeLoadedData,
              profiles,
              onChange: updatePath,
              onMembershipChange: changeMembership,
              onGroupsChange: (nextGroups) => dispatch({
                type: "updateTimeSyncGroups",
                value: nextGroups,
              }),
              onValidationError: (error) => setSubmissionError(safeMessage(error)),
            })
          : null,
        wizard.stage === "review-and-create"
          ? React.createElement(ChartCreationReview, {
              wizard,
              source,
              renderProof,
              placementProof,
              canCreate,
            })
          : null,
        submissionError
          ? React.createElement(
              "p",
              { className: "wizard-error", role: "alert" },
              submissionError,
            )
          : null,
      ),
      React.createElement(
        "footer",
        { className: "chart-wizard-footer" },
        React.createElement(
          "span",
          { role: "status" },
          `${CREATION_STAGE_LABELS[wizard.stage]}: ${creationStageStatuses[wizard.stage]}`,
        ),
        React.createElement(
          "div",
          { className: "chart-wizard-footer-actions" },
          React.createElement(IconControl, {
            interactionId: "collection.previous-page",
            ariaLabel: "Previous step",
            tooltip: "Previous step",
            disabled: disabled || submitting || activeStageIndex <= 0,
            onClick: () => navigateCreationStage(CHART_CREATION_STAGES[activeStageIndex - 1]),
          }),
          React.createElement(IconControl, {
            interactionId: "collection.next-page",
            ariaLabel: "Next step",
            tooltip: "Next step",
            disabled: disabled || submitting || activeStageIndex >= CHART_CREATION_STAGES.length - 1,
            onClick: () => navigateCreationStage(CHART_CREATION_STAGES[activeStageIndex + 1]),
          }),
          React.createElement(
            "button",
            {
              type: "button",
              className: "secondary chart-wizard-discard",
              disabled: disabled || submitting,
              onClick: () => dispatch({ type: "requestClose" }),
            },
            "Discard chart draft",
          ),
          wizard.stage === "review-and-create"
            ? React.createElement(IconControl, {
                interactionId: "wizard.create-chart",
                ariaLabel: submitting ? "Creating chart" : "Create chart",
                tooltip: submitting ? "Creating chart" : "Create chart",
                disabled: disabled || !canCreate || submitting
                  || placementProof.status !== "valid"
                  || renderProof.status !== "valid",
                onClick: finish,
              })
            : null,
        ),
      ),
    ),
    React.createElement(ConfirmDialog, {
      open: wizard.confirmation === "discardChart",
      title: "Discard chart?",
      message: "Your unfinished chart and its settings will be lost.",
      confirmLabel: "Discard",
      cancelLabel: "Continue editing",
      onConfirm: confirmClose,
      onCancel: () => {
        if (!operationLocked()) dispatch({ type: "cancelConfirmation" });
      },
      disabled: disabled || submitting,
    }),
    React.createElement(ConfirmDialog, {
      open: wizard.confirmation === "clearSource",
      title: "Remove data source?",
      message: "Assigned data roles will also be cleared.",
      confirmLabel: "Remove source",
      cancelLabel: "Keep source",
      onConfirm: () => {
        if (operationLocked()) return;
        dispatch({ type: "confirmClearSource" });
        setSourceKind("");
        setManualTable(null);
        setManualErrors([]);
      },
      onCancel: () => {
        if (!operationLocked()) dispatch({ type: "cancelConfirmation" });
      },
      disabled: disabled || submitting,
    }),
    React.createElement(ConfirmDialog, {
      open: wizard.confirmation === "changeSource",
      title: "Change data source?",
      message: wizard.pendingSourceChange?.message
        ?? "The current data mappings are not compatible with this source.",
      confirmLabel: "Change source",
      cancelLabel: "Keep current source",
      onConfirm: () => {
        if (operationLocked()) return;
        let next = reduceWizardState(wizard, {
          type: "confirmSourceChange",
        });
        if (Array.isArray(pendingSourceUi?.manualColumns)) {
          next = assignManualRoles(
            next,
            getChartSchema(next.draft.typeId),
            pendingSourceUi.manualColumns,
          );
        }
        setWizard(next);
        if (pendingSourceUi) applySourceUi(pendingSourceUi);
        setPendingSourceUi(null);
      },
      onCancel: () => {
        if (operationLocked()) return;
        dispatch({ type: "cancelConfirmation" });
        setPendingSourceUi(null);
      },
      disabled: disabled || submitting,
    }),
  );
}

function ChartTimeMemberships({ chart, groups = [], timeRole, onChange = noop }) {
  if (!Array.isArray(groups) || groups.length === 0) {
    return React.createElement(
      "section",
      { className: "chart-time-memberships", "aria-labelledby": "chart-time-memberships-title" },
      React.createElement("h3", { id: "chart-time-memberships-title" }, "Time Group memberships"),
      React.createElement("p", null, "No saved Time Groups are available. Create or repair groups in Time Group Studio."),
    );
  }
  return React.createElement(
    "section",
    { className: "chart-time-memberships", "aria-labelledby": "chart-time-memberships-title" },
    React.createElement("h3", { id: "chart-time-memberships-title" }, "Time Group memberships"),
    React.createElement("p", null, "Select zero or multiple memberships. Matching and fallback policy remain owned by Time Group Studio."),
    React.createElement(
      "div",
      { className: "chart-time-membership-list" },
      groups.map((group) => {
        const selected = group.members?.some(({ chartId }) => chartId === chart.id) ?? false;
        return React.createElement(
          "label",
          { key: group.id, className: "chart-time-membership-option" },
          React.createElement("input", {
            type: "checkbox",
            checked: selected,
            disabled: !timeRole,
            onChange: (event) => onChange(group.id, event.target.checked),
          }),
          React.createElement("span", null, group.label ?? group.name ?? group.id),
          React.createElement("small", null, selected ? `Uses ${timeRole}` : "Not selected"),
        );
      }),
    ),
  );
}

function ChartCreationReview({
  wizard,
  source,
  renderProof,
  placementProof,
  canCreate,
}) {
  const memberships = (wizard.timeSyncGroups ?? []).filter((group) => (
    group.members?.some(({ chartId }) => chartId === wizard.draft?.id)
  ));
  const mappingCount = Object.keys(wizard.draft?.roles ?? {}).length;
  const transformCount = (wizard.draft?.transformations?.filters?.length ?? 0)
    + (wizard.draft?.transformations?.grouping?.length ?? 0);
  return React.createElement(
    "section",
    { className: "chart-creation-review", "aria-labelledby": "chart-creation-review-title" },
    React.createElement("h3", { id: "chart-creation-review-title" }, "Review and create"),
    React.createElement("p", null, "Review every persisted value and both independent validations before creating the chart."),
    React.createElement(
      "dl",
      { className: "chart-review-ledger" },
      reviewEntry("Destination", placementProof.orderedText),
      reviewEntry("Chart type", wizard.draft?.typeId ?? "Needs attention"),
      reviewEntry("Schema revision", wizard.chartTypeRevision ?? wizard.draft?.version ?? "Current V3 registry"),
      reviewEntry("Data source", wizard.draft?.sourceId ?? "Needs attention"),
      reviewEntry("Provenance", source?.provenance?.label ?? source?.kind ?? "Saved dashboard source"),
      reviewEntry("Mapping", `${mappingCount} assigned roles`),
      reviewEntry("Preparation", `${transformCount} configured transforms`),
      reviewEntry("Configuration", wizard.draft?.title?.trim() || "Title needs attention"),
      reviewEntry("Canonical render proof", `${renderProof.status}; ${renderProof.rendererReadyCount} renderer-ready outputs`),
      reviewEntry("Placement proof", placementProof.status),
      reviewEntry("Time Group memberships", memberships.length > 0
        ? memberships.map((group) => group.label ?? group.name ?? group.id).join(", ")
        : "None"),
      reviewEntry("Companion proposals", wizard.companions?.length
        ? `${wizard.companions.length} referenced proposals`
        : "None"),
    ),
    !canCreate || renderProof.status !== "valid" || placementProof.status !== "valid"
      ? React.createElement("p", { className: "wizard-error", role: "alert" }, "Creation is not ready. Use the owning stage to repair the current issue.")
      : React.createElement("p", { className: "chart-proof-state", role: "status" }, "All current values and both proofs are ready."),
  );
}

function reviewEntry(label, value) {
  return React.createElement(
    "div",
    { key: label },
    React.createElement("dt", null, label),
    React.createElement("dd", null, value),
  );
}

function deriveVisibleStageStatuses({
  wizard,
  form,
  placementProof,
  renderProof,
  canCreate,
}) {
  const legacyComplete = Object.fromEntries(
    form.steps.map(({ id, complete }) => [id, Boolean(complete)]),
  );
  const complete = {
    destination: placementProof.status === "valid",
    "chart-type": Boolean(wizard.draft?.typeId),
    "data-source": legacyComplete.source === true,
    "map-and-prepare-data": legacyComplete.roles === true,
    "configure-chart": legacyComplete.style === true && renderProof.status === "valid",
    "review-and-create": canCreate
      && placementProof.status === "valid"
      && renderProof.status === "valid",
  };
  const prerequisites = {
    destination: true,
    "chart-type": complete.destination,
    "data-source": complete["chart-type"],
    "map-and-prepare-data": complete["data-source"],
    "configure-chart": complete["map-and-prepare-data"],
    "review-and-create": complete["configure-chart"],
  };
  return Object.fromEntries(CHART_CREATION_STAGES.map((stage) => [
    stage,
    complete[stage]
      ? "Complete"
      : !prerequisites[stage]
        ? "Waiting on prerequisite"
        : wizard.errors?.some((error) => error.stage === stage)
          ? "Needs attention"
          : wizard.stage === stage
            ? "In progress"
            : "Not started",
  ]));
}

function handleStageNavigationKey(event, stage) {
  const index = CHART_CREATION_STAGES.indexOf(stage);
  let targetIndex = null;
  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
    targetIndex = (index + 1) % CHART_CREATION_STAGES.length;
  } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
    targetIndex = (index - 1 + CHART_CREATION_STAGES.length) % CHART_CREATION_STAGES.length;
  } else if (event.key === "Home") {
    targetIndex = 0;
  } else if (event.key === "End") {
    targetIndex = CHART_CREATION_STAGES.length - 1;
  }
  if (targetIndex === null) return;
  event.preventDefault();
  event.currentTarget.parentElement
    ?.querySelector(`#chart-stage-${CHART_CREATION_STAGES[targetIndex]}`)
    ?.focus();
}

export function isChartWizardStateDirty({
  open = false,
  wizard,
  sourceKind = "",
  manualTable = null,
  localRows = {},
} = {}) {
  if (!open || wizard?.closed) return false;
  return Boolean(
    wizard?.draft
    || wizard?.source
    || sourceKind
    || manualTable
    || Object.keys(localRows ?? {}).length > 0
  );
}

export function createWizardPreparation({
  chart,
  rows = [],
  geoData,
  authorMetadata = {},
} = {}) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const profile = profileDataset(
    safeRows,
    isRecord(authorMetadata) ? authorMetadata : {},
  );
  if (!chart) return { profile, prepared: null };
  try {
    const prepared = enforceRenderReadiness({
      chart,
      prepared: prepareChartData({
        chart,
        rows: safeRows,
        datasetProfile: profile,
        geoData,
      }),
    });
    return {
      profile,
      prepared: {
        ...prepared,
        meta: {
          ...prepared.meta,
          formPreparationKey: buildFormPreparationKey({ chart, profile }),
        },
      },
    };
  } catch (error) {
    return {
      profile,
      prepared: {
        status: "invalid",
        marks: [],
        diagnostics: [{ message: safeMessage(error) }],
        meta: {
          renderableMarkCount: 0,
          formPreparationKey: buildFormPreparationKey({ chart, profile }),
        },
      },
    };
  }
}

export function applyWizardMembership({
  chart,
  groups,
  groupId,
  selected = groupId !== null,
  timeRole,
} = {}) {
  if (!chart || typeof chart !== "object") {
    throw new TypeError("A chart is required for time synchronization.");
  }
  if (!Array.isArray(groups)) {
    throw new TypeError("Time synchronization groups must be an array.");
  }
  if (groupId !== null && (
    typeof groupId !== "string" || groupId.trim() === ""
  )) {
    throw new Error("Time synchronization group id is invalid.");
  }
  if (groupId !== null && (
    typeof timeRole !== "string" || timeRole.trim() === ""
  )) {
    throw new Error("Choose a temporal data role before synchronizing this chart.");
  }
  if (typeof selected !== "boolean") {
    throw new TypeError("Time synchronization membership selection must be boolean.");
  }
  const nextGroups = structuredClone(groups);
  if (groupId === null) {
    for (const group of nextGroups) {
      group.members = Array.isArray(group.members)
        ? group.members.filter(({ chartId }) => chartId !== chart.id)
        : [];
    }
  } else {
    const target = nextGroups.find(({ id }) => id === groupId);
    if (!target) {
      throw new Error(`Unknown time synchronization group "${groupId}".`);
    }
    const members = Array.isArray(target.members) ? target.members : [];
    const previousMember = members.find(({ chartId }) => chartId === chart.id);
    target.members = members.filter(({ chartId }) => chartId !== chart.id);
    if (selected) {
      target.members.push({
        chartId: chart.id,
        timeRole,
        ...(previousMember?.matching
          ? { matching: structuredClone(previousMember.matching) }
          : {}),
      });
    }
  }
  return {
    chart: {
      ...structuredClone(chart),
      interaction: {
        ...structuredClone(chart.interaction ?? {}),
        timeSync: null,
      },
    },
    groups: nextGroups,
  };
}

export function submitWizardDraft(state, onCreate) {
  const result = finalizeWizardDraft(state);
  if (typeof onCreate !== "function") {
    throw new TypeError("Chart creation requires an onCreate callback.");
  }
  const creation = onCreate(result);
  return creation && typeof creation.then === "function"
    ? creation.then(() => result)
    : result;
}

export async function parseUploadedCsvFile(file, existingSources = {}) {
  if (!file || typeof file.text !== "function") {
    throw new TypeError("Choose a CSV file to upload.");
  }
  const fileName = typeof file.name === "string" && file.name.trim()
    ? file.name.trim()
    : "uploaded.csv";
  if (
    Number.isFinite(file.size)
    && file.size > MAX_UPLOADED_CSV_BYTES
  ) {
    throw new Error(
      `CSV upload is too large. The maximum file size is ${MAX_UPLOADED_CSV_BYTES} bytes.`,
    );
  }
  const csvText = await file.text();
  if (new TextEncoder().encode(csvText).byteLength > MAX_UPLOADED_CSV_BYTES) {
    throw new Error(
      `CSV upload is too large. The maximum file size is ${MAX_UPLOADED_CSV_BYTES} bytes.`,
    );
  }
  const rows = parseCsvText(csvText, fileName);
  if (rows.length > MAX_UPLOADED_CSV_ROWS) {
    throw new Error(
      `CSV upload has too many rows. The maximum is ${MAX_UPLOADED_CSV_ROWS}.`,
    );
  }
  const sourceId = uniqueSourceId(fileName, isRecord(existingSources)
    ? existingSources
    : {});
  return {
    sourceId,
    source: {
      kind: "dataset",
      type: "uploadedCsv",
      fileName,
      csvText,
    },
    rows,
    profile: profileDataset(rows),
  };
}

export function createChartWizardState({
  loadedData,
  profiles = {},
  timeSyncGroups,
  existingCharts = [],
  destination = null,
  dashboardRevision = null,
}) {
  return createWizardState({
    loadedData,
    profiles,
    timeSyncGroups,
    charts: existingCharts,
    destination,
    dashboardRevision,
  });
}

function assignManualRoles(state, schema, columns) {
  let next = state;
  for (const role of schema.roles) {
    const matches = columns.filter(({ roleId }) => roleId === role.id);
    if (matches.length === 0) continue;
    const bindings = matches.map(({ fieldId, expectedType }) => ({
      field: fieldId,
      ...(expectedType === "temporal"
        ? { interpretation: "temporal" }
        : {}),
    }));
    next = reduceWizardState(next, {
      type: "updateRole",
      roleId: role.id,
      value: role.max === null || role.max > 1 ? bindings : bindings[0],
    });
  }
  return next;
}

function manualParsingMetadata(table) {
  if (!Array.isArray(table?.columns)) return {};
  return Object.fromEntries(table.columns.map((column) => [
    column.fieldId,
    {
      interpretation: {
        number: "number",
        temporal: "temporal",
        boolean: "boolean",
        geographic: "geographic",
      }[column.expectedType] ?? "category",
    },
  ]));
}

function mergeCollections(base, additions) {
  return {
    ...(base instanceof Map
      ? Object.fromEntries(base)
      : isRecord(base)
        ? base
        : {}),
    ...(additions instanceof Map
      ? Object.fromEntries(additions)
      : isRecord(additions)
        ? additions
        : {}),
  };
}

function collectionOrEmpty(value) {
  return value instanceof Map || isRecord(value) ? value : {};
}

function chartsWithDraft(charts, draft) {
  const result = Array.isArray(charts)
    ? charts.filter(({ id }) => id !== draft?.id)
    : [];
  if (draft) result.push(draft);
  return result;
}

function uniqueSourceId(fileName, existing) {
  const base = String(fileName)
    .replace(/\.[^.]+$/, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    || "uploaded";
  let candidate = `upload-${base}`;
  let suffix = 2;
  while (Object.hasOwn(existing, candidate)) {
    candidate = `upload-${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

function newChartId(typeId) {
  return `chart-${typeId}-${Date.now().toString(36)}`;
}

function readEntry(collection, key) {
  if (collection instanceof Map) return collection.get(key);
  return isRecord(collection) ? collection[key] : undefined;
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
