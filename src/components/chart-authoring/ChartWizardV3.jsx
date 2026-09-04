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
import { validateChronoGroups } from "../../charting/time/chronoGroupModel.js";
import { parseCsvText } from "../../lib/loadCsv.js";
import ConfirmDialog from "../common/ConfirmDialog.jsx";
import { IconControl } from "../common/SimExIcon.js";
import { useModalFocus } from "../common/ModalFocusScope.jsx";
import ChartTypePicker from "./ChartTypePicker.jsx";
import DataRolesStep from "./DataRolesStep.jsx";
import DataSourceStep from "./DataSourceStep.jsx";
import StyleLayoutStep from "./StyleLayoutStep.jsx";
import ChartPreview from "./ChartPreview.jsx";
import { createSubmissionGate } from "../../lib/moderatorTransaction.js";
import { requestRenderProof } from "../../charting/forms/chartProof.js";
import {
  createChartCreateSnapshot,
  executeChartCreate,
} from "../../charting/forms/chartCreateController.js";
import { resolveDestination } from "../../charting/forms/chartDestination.js";
import { planIdentityPlacement } from "../../charting/forms/chartPlacement.js";
import { deriveChartCreationIssues } from "../../charting/forms/chartCreationIssues.js";
import { compileAuthoredChartRuntimeArtifact } from "../../charting/runtime/authoredChartRuntimeArtifact.js";
import {
  FOOTPRINT_ROW_HEIGHTS,
  legacySizeForFootprint,
  resolveChartFootprint,
} from "../chartPanelLayout.js";
import { buildCsvContentDraft } from "../../content-library/sourceEntrySchema.js";
import { buildGeoJsonContentDraft } from "../../content-library/contentDraftTransaction.js";
import { validateGeoJson as validateManagedGeoJson } from "../../lib/geoJsonValidation.js";
import { projectChartCreateOwner } from "../../charting/forms/chartDraftSession.js";
import { scheduleAfterPaint } from "../../lib/scheduleAfterPaint.js";

export const MAX_UPLOADED_CSV_BYTES = 2 * 1024 * 1024;
export const MAX_UPLOADED_CSV_ROWS = 50_000;

export async function parseUploadedGeoJsonFile(file, existingSources = {}) {
  if (!file || typeof file.text !== "function") throw new TypeError("Choose a GeoJSON file to upload.");
  const fileName = typeof file.name === "string" && file.name.trim() ? file.name.trim() : "uploaded.geojson";
  const text = await file.text();
  const validation = validateManagedGeoJson(text, { includeDiagnostics: true });
  if (validation.schema.ok !== true) throw new Error(validation.schema.errors[0]?.message ?? "GeoJSON could not be validated.");
  if (validation.admission.status === "rejected") {
    throw new Error(`GeoJSON exceeds the ${validation.admission.violations.join(", ")} admission limit.`);
  }
  const geoJson = JSON.parse(text);
  const sourceId = uniqueSourceId(fileName, isRecord(existingSources) ? existingSources : {});
  return {
    sourceId,
    source: { kind: "dataset", type: "uploadedGeoJson", fileName, geoJson, provenance: { label: uploadedGeoJsonDisplayName(fileName) } },
    geoJson,
    validation,
  };
}

export async function discardStagedGeoJsonDraft(draftRef, onDiscard, reason) {
  const staged = draftRef?.current;
  if (!staged) return false;
  draftRef.current = null;
  if (typeof onDiscard === "function") await onDiscard(staged.draftId, reason);
  return true;
}

export function clearStagedGeoJsonSelection(wizard, sourceId) {
  const next = structuredClone(wizard);
  if (!sourceId || next?.draft?.presentation?.map?.geoSource !== sourceId) return next;
  delete next.draft.presentation.map;
  return next;
}

export function shouldCommitActiveGeoDraft(activeGeoDraft, selectedGeoSourceId) {
  return Boolean(
    selectedGeoSourceId
    && activeGeoDraft?.candidate?.sourceId === selectedGeoSourceId
  );
}

export function createChartCsvDraftLifecycle({
  stageDraft,
  updateDraft,
  commitDraft,
  discardDraft,
} = {}) {
  if (typeof stageDraft !== "function" || typeof updateDraft !== "function"
    || typeof commitDraft !== "function" || typeof discardDraft !== "function") {
    throw new TypeError("Chart CSV draft lifecycle requires stage, update, commit, and discard authorities.");
  }
  let active = null;
  let pending = null;
  let disposed = false;
  let queue = Promise.resolve();
  const run = (operation) => {
    const result = queue.then(operation, operation);
    queue = result.catch(() => undefined);
    return result;
  };
  const discardSlot = async (slot, reason) => {
    if (slot?.kind === "upload") await discardDraft(slot.draftId, reason);
  };
  const assertNotDisposed = () => {
    if (disposed) throw new Error("Chart CSV draft lifecycle is disposed.");
  };
  const discardSlots = async (reason) => {
    await discardSlot(pending, reason);
    pending = null;
    await discardSlot(active, reason);
    active = null;
    return snapshot();
  };
  const snapshot = () => Object.freeze({
    activeDraftId: active?.draftId ?? null,
    activeSourceId: active?.candidate?.sourceId ?? null,
    pendingDraftId: pending?.draftId ?? null,
    pendingSourceId: pending?.candidate?.sourceId ?? null,
    pendingKind: pending?.kind ?? null,
  });
  return Object.freeze({
    snapshot,
    stagePendingUpload(input, candidate) {
      return run(async () => {
        assertNotDisposed();
        if (!input?.draftId || candidate?.sourceId !== input?.entry?.sourceId) {
          throw new Error("Pending chart CSV authority must match its staged source identity.");
        }
        await discardSlot(pending, "chart-csv-pending-replaced");
        pending = null;
        const { buildCandidate: _buildCandidate, entry: _entry, source: _source, profile: _profile, ...draft } = input;
        const staged = stageDraft(draft);
        pending = {
          kind: "upload",
          draftId: staged?.draftId ?? draft.draftId,
          candidate: structuredClone(candidate),
        };
        return snapshot();
      });
    },
    setPendingNonUpload(kind = "non-upload") {
      return run(async () => {
        assertNotDisposed();
        await discardSlot(pending, "chart-csv-pending-replaced");
        pending = null;
        pending = { kind: String(kind || "non-upload"), draftId: null, candidate: null };
        return snapshot();
      });
    },
    adoptPending(reason = "chart-csv-source-confirmed") {
      return run(async () => {
        assertNotDisposed();
        if (!pending) throw new Error("A pending chart source authority is required.");
        await discardSlot(active, reason);
        active = pending.kind === "upload" ? pending : null;
        pending = null;
        return snapshot();
      });
    },
    keepCurrent(reason = "chart-csv-source-cancelled") {
      return run(async () => {
        await discardSlot(pending, reason);
        pending = null;
        return snapshot();
      });
    },
    activeCandidate(sourceId) {
      if (!active?.candidate || active.candidate.sourceId !== sourceId) {
        throw new Error(`Active chart CSV authority does not match selected source "${String(sourceId)}".`);
      }
      return structuredClone(active.candidate);
    },
    completeActive(sourceId, input) {
      return run(async () => {
        assertNotDisposed();
        if (pending) throw new Error("A pending source change must be resolved before chart creation.");
        if (!active?.candidate || active.candidate.sourceId !== sourceId
          || input?.draftId !== active.draftId || input?.entry?.sourceId !== sourceId) {
          throw new Error(`Active chart CSV authority does not match selected source "${String(sourceId)}".`);
        }
        updateDraft(active.draftId, { payload: input.payload, sourceIds: input.sourceIds });
        try {
          const result = await commitDraft(active.draftId, input.buildCandidate);
          active = null;
          return result;
        } catch (error) {
          active = null;
          throw error;
        }
      });
    },
    discardAll(reason = "chart-csv-discarded") {
      return run(() => discardSlots(reason));
    },
    dispose(reason = "chart-csv-unmount") {
      disposed = true;
      return run(() => discardSlots(reason));
    },
  });
}
const noop = () => {};
const ChartFootprintPicker = React.lazy(() => import("./ChartFootprintPicker.jsx"));

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

const PLACEMENT_PRESETS = Object.freeze({
  columns: 4,
  widths: Object.freeze([1, 2, 3, 4].map((columns) => Object.freeze({
    id: `width-${columns}`,
    label: `${columns}-column width`,
    columns,
    default: columns === 2,
  }))),
  heights: Object.freeze(FOOTPRINT_ROW_HEIGHTS.filter((rows) => rows <= 2).map((rows) => Object.freeze({
    id: `height-${rows}`,
    label: `${Math.round(rows * 100)}% of a row`,
    rows,
    default: rows === 1,
  }))),
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

export function discardConfirmationRequired({ editMode = false, editDirty = false } = {}) {
  return !editMode || editDirty;
}

export function placementMoveSource({ placementId, destination } = {}) {
  if (
    typeof placementId !== "string" || placementId.trim() === ""
    || typeof destination?.pageId !== "string" || destination.pageId.trim() === ""
    || typeof destination?.sectionId !== "string" || destination.sectionId.trim() === ""
  ) return null;
  return {
    kind: "panel",
    pageId: destination.pageId,
    sectionId: destination.sectionId,
    placementId,
  };
}

export function chartEditDraftIdentity({ draft = null, chronoGroups = [] } = {}) {
  return stableIdentity({ draft, chronoGroups });
}

export function chartDestinationForType(destination, typeId) {
  return destination;
}

export function createEditModePendingRuntime({
  chart,
  profile = null,
  deferredPreparation = null,
  rows,
  geoData,
  authorMetadata,
} = {}) {
  const formPreparationKey = buildFormPreparationKey({ chart, profile });
  const previousPrepared = deferredPreparation?.runtime?.prepared ?? null;
  const dataIdentitiesMatch = deferredPreparation?.rows === rows
    && deferredPreparation?.geoData === geoData
    && deferredPreparation?.authorMetadata === authorMetadata;
  return {
    status: "pending",
    profile,
    prepared: formPreparationKey !== null
      && dataIdentitiesMatch
      && previousPrepared?.meta?.formPreparationKey === formPreparationKey
      ? previousPrepared
      : null,
  };
}

/**
 * Schema-generated chart authoring flow.
 *
 * `existingCharts` is the authoritative dashboard chart collection used when
 * validating complete synchronized-playback groups. It is never mutated.
 */
export default function ChartWizardV3({
  mode = "create",
  open,
  dataSources,
  loadedData,
  datasetProfiles,
  geoDataSources,
  chronoGroups,
  existingCharts = [],
  destination = null,
  dashboard = null,
  dashboardRevision = null,
  editSession = null,
  editDirty = false,
  initialDraftState = null,
  suspendControllerRef = null,
  disabled = false,
  contentDraftCoordinator = null,
  onContentDraftStage,
  onContentDraftCommit,
  onContentDraftDiscard,
  onClose,
  onDirtyChange = noop,
  onDraftStateChange = noop,
  onEditDraftChange = noop,
  onOwnerChange = noop,
  onRestorationChange = noop,
  onSuspendedChange = noop,
  onSaveChanges,
  onMovePlacement = noop,
  onDiscardChanges = noop,
  onCommitSuccess = noop,
  onCreate,
}) {
  const editMode = mode === "edit";
  const safeDataSources = isRecord(dataSources) ? dataSources : {};
  const safeLoadedData = collectionOrEmpty(loadedData);
  const safeDatasetProfiles = collectionOrEmpty(datasetProfiles);
  const safeGeoDataSources = collectionOrEmpty(geoDataSources);
  const safeGroups = Array.isArray(chronoGroups) ? chronoGroups : [];
  const safeExistingCharts = Array.isArray(existingCharts)
    ? existingCharts
    : [];
  const [wizard, setWizard] = React.useState(() => initialDraftState ?? (
    editMode
      ? createChartWizardEditState({
          session: editSession,
          loadedData: safeLoadedData,
          profiles: safeDatasetProfiles,
          chronoGroups: safeGroups,
          existingCharts: safeExistingCharts,
          destination,
          dashboardRevision,
          source: readEntry(safeDataSources, editSession?.draft?.sourceId),
        })
      : createChartWizardState({
          loadedData: safeLoadedData,
          profiles: safeDatasetProfiles,
          chronoGroups: safeGroups,
          existingCharts: safeExistingCharts,
          destination,
          dashboardRevision,
        })
  ));
  const editAuthorityIdentity = editMode ? chartEditDraftIdentity({
    draft: editSession?.savedChart ?? editSession?.draft,
    chronoGroups: editSession?.savedChronoGroups ?? editSession?.chronoGroups,
  }) : "create";
  const emittedEditIdentityRef = React.useRef(null);
  if (emittedEditIdentityRef.current?.authority !== editAuthorityIdentity) {
    emittedEditIdentityRef.current = {
      authority: editAuthorityIdentity,
      identity: editMode ? chartEditDraftIdentity({
        draft: editSession?.draft,
        chronoGroups: editSession?.chronoGroups,
      }) : null,
    };
  }
  const [query, setQuery] = React.useState("");
  const [localRows, setLocalRows] = React.useState({});
  const [sourceKind, setSourceKind] = React.useState(
    initialDraftState?.sourceSelection?.kind ?? "",
  );
  const [manualTable, setManualTable] = React.useState(null);
  const [manualErrors, setManualErrors] = React.useState([]);
  const [uploadError, setUploadError] = React.useState("");
  const [geoUploadError, setGeoUploadError] = React.useState("");
  const [localGeoData, setLocalGeoData] = React.useState({});
  const [localGeoDescriptors, setLocalGeoDescriptors] = React.useState({});
  const geoDraftRef = React.useRef(null);
  const effectiveGeoDataSources = mergeCollections(safeGeoDataSources, localGeoData);
  const effectiveDataSources = mergeCollections(safeDataSources, localGeoDescriptors);
  const stagedGeoEntry = geoDraftRef.current?.sourceEntry;
  const durableGeoSourceEntries = dashboard?.contentLibrary?.sourceEntries;
  const effectiveGeoSourceEntries = durableGeoSourceEntries === undefined && !stagedGeoEntry
    ? undefined
    : mergeCollections(
        durableGeoSourceEntries,
        stagedGeoEntry ? { [stagedGeoEntry.sourceId]: stagedGeoEntry } : {},
      );
  const geoSources = validatedGeoSourceOptions(
    effectiveDataSources,
    effectiveGeoDataSources,
    effectiveGeoSourceEntries,
  );
  const [submissionError, setSubmissionError] = React.useState("");
  const transactionIdRef = React.useRef(null);
  const csvDraftAuthoritiesRef = React.useRef(null);
  csvDraftAuthoritiesRef.current = {
    stageDraft: onContentDraftStage,
    updateDraft: contentDraftCoordinator?.updateDraft,
    commitDraft: onContentDraftCommit,
    discardDraft: onContentDraftDiscard,
  };
  const csvDraftLifecycleRef = React.useRef(null);
  if (csvDraftLifecycleRef.current === null) {
    csvDraftLifecycleRef.current = createChartCsvDraftLifecycle({
      stageDraft(draft) {
        const authority = csvDraftAuthoritiesRef.current?.stageDraft;
        if (typeof authority !== "function") throw new Error("Chart CSV staging authority is unavailable.");
        return authority(draft);
      },
      updateDraft(draftId, patch) {
        const authority = csvDraftAuthoritiesRef.current?.updateDraft;
        if (typeof authority !== "function") throw new Error("Chart CSV update authority is unavailable.");
        return authority(draftId, patch);
      },
      commitDraft(draftId, buildCandidate) {
        const authority = csvDraftAuthoritiesRef.current?.commitDraft;
        if (typeof authority !== "function") throw new Error("Chart CSV commit authority is unavailable.");
        return authority(draftId, buildCandidate);
      },
      discardDraft(draftId, reason) {
        const authority = csvDraftAuthoritiesRef.current?.discardDraft;
        if (typeof authority !== "function") throw new Error("Chart CSV discard authority is unavailable.");
        return authority(draftId, reason);
      },
    });
  }
  const csvDraftLifecycle = csvDraftLifecycleRef.current;
  const csvDraftLifecycleGenerationRef = React.useRef(0);
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
  const wizardBodyRef = React.useRef(null);
  const lastRestorableFocusIdRef = React.useRef(null);
  React.useImperativeHandle(suspendControllerRef, () => ({
    suspend: requestClose,
  }));

  function requestClose() {
    if (operationLocked()) return false;
    const activeElement = typeof document === "undefined" ? null : document.activeElement;
    const focused = wizardDialogRef.current?.contains?.(activeElement)
      && !activeElement?.closest?.(".chart-wizard-close")
      ? activeElement
      : null;
    const restoration = {
      stage: wizard.stage,
      focusId: focused?.id
        || lastRestorableFocusIdRef.current
        || `chart-stage-${wizard.stage}`,
      invokerId: editMode ? `edit-${editSession?.placementId}` : "build-add-chart",
      scrollTop: wizardBodyRef.current?.scrollTop ?? 0,
      targetId: editMode ? editSession?.placementId : wizard.draft?.id ?? null,
    };
    const suspended = reduceWizardState(wizard, {
      type: "suspend",
      restoration,
    });
    setWizard(suspended);
    onDraftStateChange(suspended);
    setSubmissionError("");
    onSuspendedChange(true, { surface: editMode ? "full" : "create", ...restoration });
    onClose?.();
    return true;
  }

  React.useEffect(() => {
    if (!open) return;
    setWizard((current) => {
      if (current.closed) {
        return editMode
          ? createChartWizardEditState({
              session: editSession,
              loadedData: safeLoadedData,
              profiles: safeDatasetProfiles,
              chronoGroups: safeGroups,
              existingCharts: safeExistingCharts,
              destination,
              dashboardRevision,
              source: readEntry(safeDataSources, editSession?.draft?.sourceId),
            })
          : createChartWizardState({
              loadedData: safeLoadedData,
              profiles: safeDatasetProfiles,
              chronoGroups: safeGroups,
              existingCharts: safeExistingCharts,
              destination,
              dashboardRevision,
            });
      }
      const resumed = current.suspension
        ? reduceWizardState(current, { type: "resume" })
        : current;
      return resumed.destination || !destination
        ? resumed
        : reduceWizardState(resumed, { type: "setDestination", destination });
    });
  }, [open, destination?.pageId, destination?.sectionId, editMode, editSession?.placementId]);

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
  React.useEffect(() => {
    if (!editMode || !wizard.draft) return;
    const identity = chartEditDraftIdentity({
      draft: wizard.draft,
      chronoGroups: wizard.chronoGroups,
    });
    if (identity === emittedEditIdentityRef.current?.identity) return;
    emittedEditIdentityRef.current.identity = identity;
    onEditDraftChange({
      draft: structuredClone(wizard.draft),
      chronoGroups: structuredClone(wizard.chronoGroups),
    });
  }, [editMode, onEditDraftChange, wizard.draft, wizard.chronoGroups]);
  React.useEffect(() => (
    () => onDirtyChange(false)
  ), [onDirtyChange]);
  React.useEffect(() => {
    const generation = ++csvDraftLifecycleGenerationRef.current;
    return () => queueMicrotask(() => {
      if (csvDraftLifecycleGenerationRef.current === generation) {
        void csvDraftLifecycle.dispose("chart-csv-unmount");
      }
    });
  }, [csvDraftLifecycle]);
  React.useEffect(() => () => {
    void discardStagedGeoJsonDraft(geoDraftRef, onContentDraftDiscard, "chart-geojson-unmount");
  }, [onContentDraftDiscard]);

  function clearUploadedCsvUi(sourceId) {
    setSourceKind("");
    setManualTable(null);
    setManualErrors([]);
    setPendingSourceUi(null);
    if (sourceId) {
      setLocalRows((current) => {
        const next = { ...current };
        delete next[sourceId];
        return next;
      });
    }
  }

  function clearUploadedGeoJsonUi(sourceId) {
    setGeoUploadError("");
    if (!sourceId) return;
    setLocalGeoData((current) => {
      const next = { ...current };
      delete next[sourceId];
      return next;
    });
    setLocalGeoDescriptors((current) => {
      const next = { ...current };
      delete next[sourceId];
      return next;
    });
  }

  React.useEffect(() => {
    if (!open) return;
    const restoration = wizard.suspension?.resumed
      ? wizard.suspension.restoration
      : null;
    if (restoration) {
      if (wizardBodyRef.current && Number.isFinite(restoration.scrollTop)) {
        wizardBodyRef.current.scrollTop = restoration.scrollTop;
      }
      const restored = restoration.focusId
        ? document.getElementById(restoration.focusId)
        : null;
      if (restored && wizardDialogRef.current?.contains(restored)) {
        restored.focus({ preventScroll: true });
        return;
      }
    }
    const selectedStep = wizardDialogRef.current?.querySelector(
      "[data-modal-initial-focus=\"true\"]",
    );
    selectedStep?.focus?.({ preventScroll: true });
  }, [open, wizard.stage, wizard.suspension, wizardDialogRef]);

  const runtimeLoadedData = React.useMemo(
    () => mergeCollections(safeLoadedData, localRows),
    [safeLoadedData, localRows],
  );
  const selectedSourceId = wizard.sourceSelection?.sourceId
    ?? wizard.draft?.sourceId
    ?? "";
  const rows = readEntry(runtimeLoadedData, selectedSourceId)
    ?? wizard.sourceSelection?.rows
    ?? [];
  const source = wizard.sourceSelection?.source
    ?? wizard.source
    ?? readEntry(effectiveDataSources, selectedSourceId);
  const geoData = readEntry(
    effectiveGeoDataSources,
    wizard.draft?.presentation?.map?.geoSource,
  );
  const geoJoinFields = geoJoinFieldOptions(geoData);
  const authorMetadata = React.useMemo(
    () => source?.parsingMetadata ?? manualParsingMetadata(manualTable),
    [source?.parsingMetadata, manualTable],
  );
  const cachedProfile = selectedSourceId
    ? wizard.sourceSelection?.profile
      ?? readEntry(wizard.profiles, selectedSourceId)
      ?? readEntry(safeDatasetProfiles, selectedSourceId)
      ?? null
    : null;
  const synchronousRuntime = React.useMemo(() => editMode ? null : {
    status: "ready",
    ...createWizardPreparation({
      chart: wizard.draft,
      rows,
      geoData,
      authorMetadata,
    }),
  }, [editMode, wizard.draft, rows, geoData, authorMetadata]);
  const [deferredPreparation, setDeferredPreparation] = React.useState(null);
  React.useEffect(() => {
    if (!editMode) return undefined;
    const chart = wizard.draft;
    return scheduleAfterPaint(() => {
      setDeferredPreparation({
        chart,
        rows,
        geoData,
        authorMetadata,
        runtime: {
          status: "ready",
          ...createWizardPreparation({ chart, rows, geoData, authorMetadata }),
        },
      });
    });
  }, [editMode, wizard.draft, rows, geoData, authorMetadata]);
  const deferredPreparationCurrent = deferredPreparation?.chart === wizard.draft
    && deferredPreparation?.rows === rows
    && deferredPreparation?.geoData === geoData
    && deferredPreparation?.authorMetadata === authorMetadata;
  const runtime = editMode
    ? deferredPreparationCurrent
      ? deferredPreparation.runtime
      : createEditModePendingRuntime({
          chart: wizard.draft,
          profile: cachedProfile,
          deferredPreparation,
          rows,
          geoData,
          authorMetadata,
        })
    : synchronousRuntime;
  const profiles = React.useMemo(() => {
    const cached = mergeCollections(safeDatasetProfiles, wizard.profiles);
    const selectedProfile = wizard.sourceSelection?.profile ?? runtime.profile;
    return selectedSourceId
      ? { ...cached, [selectedSourceId]: selectedProfile }
      : cached;
  }, [safeDatasetProfiles, wizard.profiles, wizard.sourceSelection?.profile, selectedSourceId, runtime.profile]);
  const sourceProfile = selectedSourceId
    ? wizard.sourceSelection?.profile ?? runtime.profile
    : null;

  const syncedWizard = {
    ...wizard,
    loadedData: runtimeLoadedData,
    profiles,
  };
  const form = buildWizardFormModel({
    draft: wizard.draft,
    sourceSelection: wizard.sourceSelection,
    profile: sourceProfile,
    prepared: runtime.prepared,
    chronoGroups: wizard.chronoGroups,
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
        chronoGroups: wizard.chronoGroups,
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
  const destinationChoices = editableDestinationChoices(dashboard, wizard.destination);
  const reviewedDestination = chartDestinationForType(
    wizard.destination ?? destination,
    wizard.draft?.typeId,
  );
  const destinationFootprint = reviewedDestination?.footprint
    ?? resolveChartFootprint(wizard.draft?.layout);
  const destinationResolution = hasDashboardPages(dashboard)
    ? resolveDestination(wizard.destination ?? {}, dashboard)
    : null;
  const placementProof = editMode
    ? {
        ...legacyPlacementProof(wizard.destination ?? destination, destinationFootprint),
        revision: `chart-edit:${editSession?.placementId ?? "unknown"}`,
      }
    : destinationResolution
      ? planIdentityPlacement({
        destination: destinationResolution,
        anchorChartId: wizard.destination?.anchorId ?? null,
        position: wizard.destination?.relation ?? wizard.destination?.position ?? "append",
        chartId: wizard.draft?.id ?? wizard.draftId ?? "new_chart",
        presets: {
          ...PLACEMENT_PRESETS,
          selectedWidth: `width-${destinationFootprint.columns}`,
          selectedHeight: `height-${destinationFootprint.rows}`,
        },
        }, dashboard)
      : legacyPlacementProof(wizard.destination, destinationFootprint);
  const creationStageStatuses = deriveVisibleStageStatuses({
    wizard,
    form,
    placementProof,
    renderProof,
    canCreate,
  });
  const retainableCreation = !editMode
    && canCreate
    && placementProof.status === "valid"
    && renderProof.status === "valid";
  React.useEffect(() => {
    if (editMode || !open) return;
    if (!retainableCreation) {
      onOwnerChange(null);
      return;
    }
    const draftId = wizard.draftId ?? wizard.draft?.id;
    if (!draftId) {
      onOwnerChange(null);
      return;
    }
    if (!wizard.draftId) {
      setWizard((current) => reduceWizardState(current, {
        type: "start",
        draftId,
        dashboardRevision: current.dashboardRevision ?? dashboardRevision,
      }));
      return;
    }
    onOwnerChange(projectChartCreateOwner(wizard, {
      retainable: true,
      activity: "active",
    }));
  }, [
    dashboardRevision,
    editMode,
    onOwnerChange,
    open,
    retainableCreation,
    wizard,
  ]);

  if (!open) return null;

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
  const updatePath = (path, value) => {
    dispatch({
      type: "updateChart",
      path,
      value,
    });
    setSubmissionError("");
  };
  const updateDestination = (patch) => {
    setWizard((current) => {
      const nextDestination = { ...(current.destination ?? {}), ...patch };
      let next = reduceWizardState(current, {
        type: "setDestination",
        destination: nextDestination,
      });
      if (patch.footprint && next.draft) {
        const { columns, rows } = patch.footprint;
        next = reduceWizardState(next, {
          type: "updateChart",
          path: ["layout"],
          value: {
            ...(next.draft.layout ?? {}),
            size: legacySizeForFootprint({ columns, rows }),
            width: columns,
            height: rows,
          },
        });
      }
      return next;
    });
    setSubmissionError("");
  };
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
          geoData: readEntry(effectiveGeoDataSources, value),
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
            geoData: readEntry(effectiveGeoDataSources, sourceId),
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
  const requestSourceSelection = async (action, nextUi, upload = null) => {
    if (upload) {
      await csvDraftLifecycle.stagePendingUpload(upload.input, upload.candidate);
    } else {
      await csvDraftLifecycle.setPendingNonUpload(nextUi.kind);
    }
    let next = reduceWizardState(syncedWizard, {
      type: "requestSourceChange",
      kind: nextUi.kind,
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
      await csvDraftLifecycle.adoptPending("chart-csv-source-changed");
      applySourceUi(nextUi);
      setPendingSourceUi(null);
    }
    setWizard(next);
    setSubmissionError("");
  };
  const selectExisting = async (sourceId) => {
    if (!sourceId) return;
    const rows = readEntry(safeLoadedData, sourceId) ?? [];
    const sourceMetadata = readEntry(safeDataSources, sourceId);
    try {
      await requestSourceSelection({
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
    } catch (error) {
      await csvDraftLifecycle.keepCurrent("chart-csv-existing-selection-failed");
      setSubmissionError(safeMessage(error));
    }
  };
  const uploadCsv = async (file) => {
    if (!file) return;
    try {
      const parsed = await parseUploadedCsvFile(file, {
        ...safeDataSources,
        ...localRows,
      });
      const input = buildCsvContentDraft({
        owner: "chart",
        sourceId: parsed.sourceId,
        source: parsed.source,
        profile: parsed.profile,
        displayName: uploadedCsvDisplayName(parsed.source.fileName),
      });
      await requestSourceSelection({
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
      }, { input, candidate: parsed });
    } catch (error) {
      await csvDraftLifecycle.keepCurrent("chart-csv-upload-selection-failed");
      setUploadError(safeMessage(error));
    }
  };
  const updateManual = async (table, {
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
    await requestSourceSelection({
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
  const selectManual = async () => {
    if (!wizard.draft) return;
    const schema = getChartSchema(wizard.draft.typeId);
    try {
      await updateManual(createManualDataTemplate(schema), {
        schema,
        currentWizard: wizard,
      });
    } catch (error) {
      await csvDraftLifecycle.keepCurrent("chart-csv-manual-selection-failed");
      setSubmissionError(safeMessage(error));
    }
  };
  const discardGeoDraft = async (reason) => {
    await discardStagedGeoJsonDraft(geoDraftRef, onContentDraftDiscard, reason);
  };
  const uploadGeoJson = async (file) => {
    if (!file) return;
    setGeoUploadError("");
    try {
      await discardGeoDraft("chart-geojson-replaced");
      const parsed = await parseUploadedGeoJsonFile(file, effectiveDataSources);
      const input = buildGeoJsonContentDraft({
        owner: "chart", sourceId: parsed.sourceId, fileName: parsed.source.fileName,
        geoJson: parsed.geoJson, validation: parsed.validation,
        displayName: uploadedGeoJsonDisplayName(parsed.source.fileName),
      });
      const staged = onContentDraftStage?.(input);
      if (!staged && typeof onContentDraftStage !== "function") throw new Error("Chart GeoJSON staging authority is unavailable.");
      geoDraftRef.current = {
        draftId: staged?.draftId ?? input.draftId,
        candidate: parsed,
        sourceEntry: input.payload.entry,
      };
      setLocalGeoData((current) => ({ ...current, [parsed.sourceId]: parsed.geoJson }));
      setLocalGeoDescriptors((current) => ({ ...current, [parsed.sourceId]: parsed.source }));
      setWizard((current) => {
        const selected = applyGeographySourceSelection(current.draft, {
          sourceId: parsed.sourceId,
          geoData: parsed.geoJson,
          rows,
        });
        return reduceWizardState(current, {
          type: "updateChart",
          path: ["presentation", "map"],
          value: selected.presentation.map,
        });
      });
    } catch (error) {
      await discardGeoDraft("chart-geojson-upload-failed");
      setGeoUploadError(safeMessage(error));
    }
  };
  const selectGeoSource = async (value) => {
    const stagedSourceId = geoDraftRef.current?.candidate?.sourceId;
    if (stagedSourceId && stagedSourceId !== value) {
      await discardGeoDraft("chart-geojson-selection-changed");
      clearUploadedGeoJsonUi(stagedSourceId);
    }
    updateAuthoringPath(["presentation", "map", "geoSource"], value);
  };
  const confirmPendingSource = async () => {
    if (operationLocked()) return;
    try {
      await csvDraftLifecycle.adoptPending("chart-csv-source-confirmed");
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
      setSubmissionError("");
    } catch (error) {
      setSubmissionError(safeMessage(error));
    }
  };
  const keepCurrentSource = async () => {
    if (operationLocked()) return;
    try {
      await csvDraftLifecycle.keepCurrent("chart-csv-source-cancelled");
      dispatch({ type: "cancelConfirmation" });
      setPendingSourceUi(null);
      setSubmissionError("");
    } catch (error) {
      setSubmissionError(safeMessage(error));
    }
  };
  const resetCurrentSource = async () => {
    if (operationLocked()) return;
    try {
      await csvDraftLifecycle.discardAll("chart-csv-source-reset");
      dispatch({ type: "confirmClearSource" });
      clearUploadedCsvUi(selectedSourceId);
      setSubmissionError("");
    } catch (error) {
      setSubmissionError(safeMessage(error));
    }
  };
  const changeMembership = (groupId, selected) => {
    if (!wizard.draft) return;
    const timeRole = timeSyncField?.timeRoles
      ?.find(({ field }) => typeof field === "string")?.value
      ?? timeSyncField?.timeRoles?.[0]?.value;
    try {
      const proposal = applyWizardMembership({
        chart: wizard.draft,
        groups: wizard.chronoGroups,
        groupId,
        selected,
        timeRole,
      });
      validateChronoGroups(proposal.groups, {
        charts: chartsWithDraft(wizard.charts, proposal.chart),
        loadedData: runtimeLoadedData,
        profiles,
      });
      setWizard((current) => ({
        ...current,
        draft: proposal.chart,
        chronoGroups: proposal.groups,
        chronoGroupsProvided: true,
      }));
      setSubmissionError("");
    } catch (error) {
      setSubmissionError(safeMessage(error));
    }
  };
  const finish = async () => {
    if (!canCreate || disabled || (editMode && !editDirty)) return;
    return submissionGateRef.current.run(async () => {
      setSubmitting(true);
      try {
        const finalized = finalizeWizardDraft(syncedWizard);
        const runtimeArtifact = compileAuthoredChartRuntimeArtifact({
          chart: finalized.chart,
          prepared: runtime.prepared,
          source: finalized.source ?? source ?? { id: finalized.chart.sourceId },
          profile: runtime.profile,
          geoSource: readEntry(
            effectiveDataSources,
            finalized.chart.presentation?.map?.geoSource,
          ),
          chronoGroups: finalized.chronoGroups ?? wizard.chronoGroups,
          rows,
          timezone: dashboard?.timezone ?? "UTC",
        });
        const finalizedWithRuntime = { ...finalized, runtimeArtifact };
        if (editMode) {
          const result = await routeChartWizardCommit({
            mode,
            payload: buildChartWizardEditCommitPayload({
              placementId: editSession?.placementId,
              finalized,
              runtimeArtifact,
            }),
            reviewedPlacement: reviewedDestination,
            onSaveChanges,
            onCreate,
          });
          if (result === null) {
            setSubmissionError("The chart could not be saved. Retry when the persistence issue is resolved.");
          } else {
            setSubmissionError("");
          }
          return result;
        }
        transactionIdRef.current ??= [
          "chart-create",
          finalized.chart.id,
          wizard.dashboardRevision ?? dashboardRevision ?? "session",
        ].join(":");
        const snapshot = createChartCreateSnapshot({
          transactionId: transactionIdRef.current,
          draftId: wizard.draftId ?? finalized.chart.id,
          finalized: finalizedWithRuntime,
          destination: reviewedDestination,
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
          priorScrollAnchor: wizardBodyRef.current?.scrollTop ?? 0,
        });
        let committedManagedGeoJson = false;
        setWizard((current) => reduceWizardState(current, {
          type: "commitStarted",
          transactionId: transactionIdRef.current,
        }));
        const result = await executeChartCreate(snapshot, {
          persist: async (payload, reviewedPlacement) => {
            const activeGeoDraft = geoDraftRef.current;
            const selectedGeoSourceId = finalized.chart.presentation?.map?.geoSource;
            if (shouldCommitActiveGeoDraft(activeGeoDraft, selectedGeoSourceId)) {
              if (typeof onContentDraftCommit !== "function") {
                throw new Error("Chart GeoJSON commit authority is unavailable.");
              }
              const geoInput = buildGeoJsonContentDraft({
                owner: "chart",
                sourceId: activeGeoDraft.candidate.sourceId,
                fileName: activeGeoDraft.candidate.source.fileName,
                geoJson: activeGeoDraft.candidate.geoJson,
                validation: activeGeoDraft.candidate.validation,
                displayName: uploadedGeoJsonDisplayName(activeGeoDraft.candidate.source.fileName),
                finalized,
                destination: reviewedPlacement,
              });
              contentDraftCoordinator?.updateDraft?.(activeGeoDraft.draftId, {
                payload: geoInput.payload,
                sourceIds: geoInput.sourceIds,
              });
              let buildCandidate = geoInput.buildCandidate;
              if (sourceKind === "upload") {
                const csvCandidate = csvDraftLifecycle.activeCandidate(finalized.chart.sourceId);
                const csvInput = buildCsvContentDraft({
                  owner: "manager",
                  sourceId: csvCandidate.sourceId,
                  source: csvCandidate.source,
                  profile: csvCandidate.profile,
                  displayName: uploadedCsvDisplayName(csvCandidate.source.fileName),
                });
                buildCandidate = ({ dashboard: currentDashboard, draft }) => {
                  const withCsv = csvInput.buildCandidate({ dashboard: currentDashboard }).dashboard;
                  return geoInput.buildCandidate({ dashboard: withCsv, draft });
                };
              }
              await onContentDraftCommit(activeGeoDraft.draftId, buildCandidate);
              geoDraftRef.current = null;
              committedManagedGeoJson = true;
              if (sourceKind === "upload") {
                await csvDraftLifecycle.discardAll("chart-csv-committed-with-geojson");
              }
              return { dashboardRevision: dashboardRevision ?? "session-current" };
            }
            if (sourceKind === "upload") {
              const candidate = csvDraftLifecycle.activeCandidate(finalized.chart.sourceId);
              const input = buildCsvContentDraft({
                owner: "chart",
                sourceId: candidate.sourceId,
                source: candidate.source,
                profile: candidate.profile,
                displayName: uploadedCsvDisplayName(candidate.source.fileName),
                finalized,
                destination: reviewedPlacement,
              });
              await csvDraftLifecycle.completeActive(finalized.chart.sourceId, input);
              return { dashboardRevision: dashboardRevision ?? "session-current" };
            }
            await routeChartWizardCommit({
              mode,
              payload,
              reviewedPlacement,
              onSaveChanges,
              onCreate,
            });
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
            resolveChartCreationOwnerCommit(result, {
              onOwnerChange,
              onCommitSuccess,
            });
            setSubmissionError("");
            onSuspendedChange(false);
            if (sourceKind === "upload" || committedManagedGeoJson) onClose?.();
          } else if (result.status === "ambiguous") {
            setSubmissionError("Creation outcome is uncertain. Reconcile this transaction before retrying.");
          } else {
            setSubmissionError(result.error?.message ?? "The chart could not be created.");
          }
        }
      } catch (error) {
        if (sourceKind === "upload") {
          await csvDraftLifecycle.discardAll("chart-csv-validation-or-persistence-failure");
          setWizard((current) => clearSelectedSource(current));
          clearUploadedCsvUi(selectedSourceId);
        }
        await discardGeoDraft("chart-geojson-validation-or-persistence-failure");
        setSubmissionError(safeMessage(error));
      } finally {
        setSubmitting(false);
      }
    });
  };
  function confirmClose() {
    if (operationLocked()) return;
    void csvDraftLifecycle.discardAll("chart-csv-cancel");
    void discardGeoDraft("chart-geojson-cancel");
    const closed = reduceWizardState(wizard, { type: "confirmClose" });
    finishDiscard(closed);
  }

  function finishDiscard(closed) {
    setWizard(closed);
    onDraftStateChange(closed);
    if (closed.closed) {
      onSuspendedChange(false);
      onDiscardChanges();
      if (typeof onClose === "function") onClose();
    }
  }

  function requestDiscard() {
    if (operationLocked()) return false;
    if (discardConfirmationRequired({ editMode, editDirty })) {
      dispatch({ type: "requestClose" });
      return true;
    }
    void csvDraftLifecycle.discardAll("chart-csv-cancel");
    void discardGeoDraft("chart-geojson-cancel");
    finishDiscard({ ...wizard, confirmation: null, closed: true });
    return true;
  }

  return React.createElement(
    "div",
    {
      className: "chart-wizard-backdrop dashboard-dialog-backdrop",
    },
    React.createElement(
      "section",
      {
        className: "chart-wizard chart-wizard-v3 dashboard-dialog dashboard-dialog--wizard dashboard-dialog--wide dashboard-authoring-shell",
        role: "dialog",
        "aria-modal": "true",
        "aria-labelledby": "chart-wizard-title",
        "data-chart-owner-id": editMode
          ? `chart-edit:${editSession?.placementId ?? "unknown"}`
          : wizard.draftId ? `chart-create:${wizard.draftId}` : undefined,
        "data-chart-draft-id": wizard.draft?.id,
        "data-preparation-status": runtime.status,
        "aria-busy": disabled || submitting ? "true" : undefined,
        inert: disabled || submitting ? true : undefined,
        tabIndex: -1,
        ref: wizardDialogRef,
        onFocusCapture: (event) => {
          const target = event.target;
          if (target?.id && !target.closest?.(".chart-wizard-close")) {
            lastRestorableFocusIdRef.current = target.id;
            onRestorationChange({
              surface: editMode ? "full" : "create",
              focusId: target.id,
              scrollTop: wizardBodyRef.current?.scrollTop ?? 0,
              targetId: editMode ? editSession?.placementId : wizard.draft?.id ?? null,
            });
          }
        },
      },
      React.createElement(
        "header",
        { className: "chart-wizard-header dashboard-dialog__header" },
        React.createElement(
          "div",
          null,
          React.createElement(
            "h2",
            { id: "chart-wizard-title" },
            editMode ? "Edit chart" : "Add new chart",
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
          className: "chart-wizard-step-tabs dashboard-dialog__progress",
          "aria-label": editMode ? "Chart editing steps" : "Chart creation steps",
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
        {
          className: "chart-wizard-workbench dashboard-authoring-body",
          "data-chart-wizard-stage": wizard.stage,
        },
        React.createElement(
          "div",
          { className: "chart-wizard-body dashboard-dialog__body", ref: wizardBodyRef },
        wizard.stage === "destination"
          ? React.createElement(
              "section",
              { className: "chart-wizard-step chart-wizard-destination", "aria-labelledby": "chart-destination-heading" },
              React.createElement("h3", { id: "chart-destination-heading" }, "Choose destination and placement"),
              React.createElement("p", null, "Destination stays attached to this chart draft even if you inspect another page."),
              editMode ? React.createElement("button", {
                type: "button",
                className: "secondary",
                disabled: disabled || submitting || !placementMoveSource({ placementId: editSession?.placementId, destination: wizard.destination ?? destination }),
                onClick: () => onMovePlacement(placementMoveSource({ placementId: editSession?.placementId, destination: wizard.destination ?? destination })),
              }, "Move placement…") : null,
              React.createElement(
                "div",
                { className: "chart-destination-controls" },
                React.createElement(
                  "label",
                  null,
                  "Destination page",
                  React.createElement(
                    "select",
                    {
                      value: wizard.destination?.pageId ?? "",
                      disabled: disabled || submitting || editMode,
                      onChange: (event) => {
                        const page = destinationChoices.pages.find(({ id }) => id === event.target.value);
                        const section = page?.sections?.[0] ?? null;
                        updateDestination({
                          pageId: page?.id ?? event.target.value,
                          sectionId: section?.id ?? null,
                          relation: "append",
                          position: "append",
                          anchorId: null,
                        });
                      },
                    },
                    destinationChoices.pages.map((page) => React.createElement(
                      "option",
                      { key: page.id, value: page.id },
                      page.label,
                    )),
                  ),
                ),
                React.createElement(
                  "label",
                  null,
                  "Destination section",
                  React.createElement(
                    "select",
                    {
                      value: wizard.destination?.sectionId ?? "",
                      disabled: disabled || submitting || editMode,
                      onChange: (event) => updateDestination({
                        sectionId: event.target.value,
                        relation: "append",
                        position: "append",
                        anchorId: null,
                      }),
                    },
                    destinationChoices.sections.map((section) => React.createElement(
                      "option",
                      { key: section.id, value: section.id },
                      section.label,
                    )),
                  ),
                ),
                React.createElement(
                  "label",
                  null,
                  "Insertion",
                  React.createElement(
                    "select",
                    {
                      value: wizard.destination?.relation ?? wizard.destination?.position ?? "append",
                      disabled: disabled || submitting || editMode,
                      onChange: (event) => updateDestination({
                        relation: event.target.value,
                        position: event.target.value,
                        anchorId: event.target.value === "append"
                          ? null
                          : wizard.destination?.anchorId ?? destinationChoices.anchors[0]?.id ?? null,
                      }),
                    },
                    React.createElement("option", { value: "append" }, "Append to section"),
                    React.createElement("option", { value: "before" }, "Before a chart"),
                    React.createElement("option", { value: "after" }, "After a chart"),
                  ),
                ),
                React.createElement(
                  "label",
                  null,
                  "Placement anchor",
                  React.createElement(
                    "select",
                    {
                      value: wizard.destination?.anchorId ?? destinationChoices.anchors[0]?.id ?? "",
                      disabled: disabled || submitting || editMode
                        || (wizard.destination?.relation ?? wizard.destination?.position ?? "append") === "append",
                      onChange: (event) => updateDestination({ anchorId: event.target.value }),
                    },
                    destinationChoices.anchors.length === 0
                      ? React.createElement("option", { value: "" }, "No charts in this section")
                      : destinationChoices.anchors.map((anchor) => React.createElement(
                          "option",
                          { key: anchor.id, value: anchor.id },
                          anchor.label,
                        )),
                  ),
                ),
              ),
              React.createElement(
                React.Suspense,
                { fallback: React.createElement("p", { role: "status" }, "Loading chart size options…") },
                React.createElement(ChartFootprintPicker, {
                  value: destinationFootprint,
                  disabled: disabled || submitting,
                  onChange: (footprint) => updateDestination({ footprint }),
                }),
              ),
              React.createElement("span", { className: "visually-hidden" }, placementProof.orderedText),
            )
          : null,
        wizard.stage === "chart-type"
          ? React.createElement(ChartTypePicker, {
              value: wizard.draft?.typeId ?? "",
              query,
              sourceProfile,
              onQueryChange: setQuery,
              onChange: (typeId) => {
                dispatch({
                  type: "selectType",
                  typeId,
                  chart: {
                    title: "",
                    layout: {
                      ...(wizard.draft?.layout ?? {}),
                      size: legacySizeForFootprint(destinationFootprint),
                      width: destinationFootprint.columns,
                      height: destinationFootprint.rows,
                    },
                  },
                });
              },
            })
          : null,
        wizard.stage === "data-source"
          ? React.createElement(DataSourceStep, {
              dashboard,
              dataSources: effectiveDataSources,
              loadedData: safeLoadedData,
              selectedSourceId,
              selectedSource: source,
              selectedSourceKind: sourceKind || wizard.sourceSelection?.kind || "",
              profile: sourceProfile,
              allowSourceCreation: !editMode,
              manualAllowed: wizard.draft
                ? manualDataAllowed(getChartSchema(wizard.draft.typeId))
                : false,
              manualTable,
              manualErrors,
              uploadError,
              geoUploadError,
              geographyRequired: wizard.draft
                ? getChartSchema(wizard.draft.typeId).dataFamily === "geography"
                : false,
              geoSources,
              selectedGeoSourceId:
                wizard.draft?.presentation?.map?.geoSource ?? "",
              prerequisites: active.prerequisites,
              onSelectExisting: selectExisting,
              onUploadCsv: uploadCsv,
              onUploadGeoJson: uploadGeoJson,
              onSelectManual: selectManual,
              onManualTableChange: updateManual,
              onGeoSourceChange: (value) => void selectGeoSource(value),
              onRequestClear: () => dispatch({ type: "requestClearSource" }),
            })
          : null,
        wizard.stage === "map-and-prepare-data"
          ? React.createElement(DataRolesStep, {
              section: dataSection,
              prerequisites: active.prerequisites,
               columns: runtime.profile?.columns ?? [],
               rows,
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
              groups: wizard.chronoGroups,
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
              showPreview: false,
              onChange: updatePath,
              onMembershipChange: changeMembership,
              onGroupsChange: (nextGroups) => dispatch({
                type: "updateChronoGroups",
                value: nextGroups,
              }),
              onValidationError: (error) => setSubmissionError(safeMessage(error)),
            })
          : null,
        wizard.stage === "review-and-create"
          ? React.createElement(ChartCreationReview, {
              wizard,
              source,
              form,
              renderProof,
              placementProof,
              canCreate,
              onRepair: navigateCreationStage,
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
        React.createElement(ChartCreationProofDeck, {
          dashboard,
          chart: wizard.draft,
          rows,
          geoData,
          profile: runtime.profile,
          prepared: runtime.prepared,
          renderProof,
          placementProof,
        }),
      ),
      React.createElement(
        "footer",
        { className: "chart-wizard-footer dashboard-dialog__footer" },
        React.createElement(
          "span",
          { role: "status" },
          `${CREATION_STAGE_LABELS[wizard.stage]}: ${creationStageStatuses[wizard.stage]}`,
        ),
        React.createElement(
          "div",
          { className: "chart-wizard-footer-actions dashboard-dialog__actions" },
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
              onClick: requestDiscard,
            },
            editMode ? "Discard changes" : "Discard chart draft",
          ),
          React.createElement(
            "div",
            { "data-footer-slot": "primary" },
            React.createElement(IconControl, {
                interactionId: editMode ? "editor.save-changes" : "wizard.create-chart",
                className: "simex-prominent-control",
                ariaLabel: submitting
                  ? editMode ? "Saving changes" : "Creating chart"
                  : editMode ? "Save changes" : "Create chart",
                tooltip: submitting
                  ? editMode ? "Saving changes" : "Creating chart"
                  : editMode ? "Save changes" : "Create chart",
                disabled: disabled || !canCreate || submitting
                  || (editMode && !editDirty)
                  || placementProof.status !== "valid"
                  || renderProof.status !== "valid",
                onClick: finish,
              }),
          ),
        ),
      ),
    ),
    React.createElement(ConfirmDialog, {
      open: wizard.confirmation === "discardChart",
      title: editMode ? "Discard changes?" : "Discard chart?",
      message: editMode
        ? "Your unsaved chart changes will be lost."
        : "Your unfinished chart and its settings will be lost.",
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
      title: "Reset data source selection?",
      message: "This clears the current selection and assigned data roles. It does not delete the CSV from the dashboard.",
      confirmLabel: "Reset selection",
      cancelLabel: "Keep selection",
      onConfirm: () => void resetCurrentSource(),
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
      onConfirm: () => void confirmPendingSource(),
      onCancel: () => void keepCurrentSource(),
      disabled: disabled || submitting,
    }),
  );
}

function ChartTimeMemberships({ chart, groups = [], timeRole, onChange = noop }) {
  if (!Array.isArray(groups) || groups.length === 0) {
    return React.createElement(
      "section",
      { className: "chart-time-memberships", "aria-labelledby": "chart-time-memberships-title" },
      React.createElement("h3", { id: "chart-time-memberships-title" }, "Chrono Group memberships"),
      React.createElement("p", null, "No saved Chrono Groups are available. Create or repair groups in Chrono Studio."),
    );
  }
  return React.createElement(
    "section",
    { className: "chart-time-memberships", "aria-labelledby": "chart-time-memberships-title" },
    React.createElement("h3", { id: "chart-time-memberships-title" }, "Chrono Group memberships"),
    React.createElement("p", null, "Select zero or multiple memberships. Matching and fallback policy remain owned by Chrono Studio."),
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

export function ChartCreationProofDeck({
  dashboard = {},
  chart = null,
  rows = [],
  geoData = null,
  profile = null,
  prepared = null,
  renderProof = {},
  placementProof = {},
}) {
  const chartLabels = new Map((dashboard?.pages ?? []).flatMap((page) => (
    (page.sections ?? []).flatMap((section) => (
      (section.panels ?? []).map((placement) => {
        const placedChart = placement.chart ?? placement;
        return [placedChart.id, placedChart.title ?? placedChart.id];
      })
    ))
  )));
  if (chart?.id) chartLabels.set(chart.id, chart.title?.trim() || "Untitled chart");
  const renderReady = renderProof.status === "valid" && chart;
  const placementEntries = Array.isArray(placementProof.projection)
    ? placementProof.projection
    : [];

  return React.createElement(
    "aside",
    {
      className: "chart-creation-proof-deck",
      "aria-label": "Chart creation proofs",
      "data-chart-proof-deck": "persistent",
    },
    React.createElement(
      "article",
      {
        className: "chart-creation-proof chart-creation-render-proof",
        "aria-label": "Canonical render proof",
        "data-proof-status": renderProof.status ?? "awaiting",
        "data-proof-revision": renderProof.revision ?? "awaiting",
      },
      proofHeading("Canonical render", renderProof.status, renderProof.revision),
      renderReady
        ? React.createElement(ChartPreview, {
            chart,
            rows,
            geoData,
            datasetProfile: profile,
            prepared,
            diagnosticNamespace: chart.id,
          })
        : proofMessages(
            renderProof.errors,
            chart ? "Canonical render is awaiting renderer-ready data." : "Choose a chart type to begin the canonical render.",
          ),
    ),
    React.createElement(
      "article",
      {
        className: "chart-creation-proof chart-creation-placement-proof",
        "aria-label": "Placement proof",
        "data-proof-status": placementProof.status ?? "awaiting",
        "data-proof-revision": placementProof.revision ?? "awaiting",
      },
      proofHeading("Placement projection", placementProof.status, placementProof.revision),
      placementEntries.length > 0
        ? React.createElement(
            "ol",
            { className: "chart-placement-proof-order", "aria-label": "Projected chart order" },
            placementEntries.map((entry, index) => React.createElement(
              "li",
              {
                key: `${entry.chartId}-${index}`,
                className: entry.draft ? "draft" : undefined,
                "data-projected-chart-id": entry.chartId,
              },
              React.createElement("span", null, chartLabels.get(entry.chartId) ?? entry.chartId),
              entry.draft ? React.createElement("small", null, "Draft chart") : null,
            )),
          )
        : proofMessages(placementProof.errors, "Choose a valid destination to project placement."),
      React.createElement("p", { className: "chart-placement-proof-text" }, placementProof.orderedText ?? "Placement is awaiting a destination."),
    ),
  );
}

function proofHeading(label, status = "awaiting", revision = "awaiting") {
  return React.createElement(
    "header",
    null,
    React.createElement("div", null,
      React.createElement("p", { className: "chart-proof-eyebrow" }, label),
      React.createElement("strong", null, proofStatusLabel(status)),
    ),
    React.createElement("small", { title: revision ?? "awaiting" }, `Revision ${revision ?? "awaiting"}`),
  );
}

function proofMessages(errors, fallback) {
  const messages = Array.isArray(errors) && errors.length > 0
    ? errors.map((error) => error?.message).filter(Boolean)
    : [fallback];
  return React.createElement(
    "div",
    { className: "chart-proof-state", role: "status" },
    messages.length === 1
      ? React.createElement("p", null, messages[0])
      : React.createElement("ul", null, messages.map((message) => React.createElement("li", { key: message }, message))),
  );
}

function proofStatusLabel(status) {
  if (status === "valid") return "Current";
  if (status === "stale") return "Last good · stale";
  if (status === "error") return "Failed";
  if (status === "invalid") return "Needs attention";
  return "Awaiting input";
}

function ChartCreationReview({
  wizard,
  source,
  form,
  renderProof,
  placementProof,
  canCreate,
  onRepair = noop,
}) {
  const memberships = (wizard.chronoGroups ?? []).filter((group) => (
    group.members?.some(({ chartId }) => chartId === wizard.draft?.id)
  ));
  const mappingCount = Object.keys(wizard.draft?.roles ?? {}).length;
  const transformCount = (wizard.draft?.transformations?.filters?.length ?? 0)
    + (wizard.draft?.transformations?.grouping?.length ?? 0);
  const issues = deriveChartCreationIssues({
    wizard,
    form,
    placementProof,
    renderProof,
  });
  const notReady = issues.length > 0
    || !canCreate
    || renderProof.status !== "valid"
    || placementProof.status !== "valid";
  const issueSummary = notReady
    ? React.createElement(
        "section",
        { className: "chart-creation-issues", role: "alert", "aria-label": "Chart creation issues" },
        React.createElement("p", null, "Creation is not ready. Resolve the following current issues:"),
        React.createElement(
          "ul",
          null,
          issues.map((issue) => React.createElement(
            "li",
            { key: `${issue.stage}:${issue.message}` },
            React.createElement("span", null, `${issue.message} `),
            React.createElement(
              "button",
              { type: "button", className: "chart-creation-repair-link", onClick: () => onRepair(issue.stage) },
              issue.stageLabel,
            ),
          )),
        ),
      )
    : null;
  return React.createElement(
    "section",
    { className: "chart-creation-review", "aria-label": "Chart creation review" },
    React.createElement("p", null, "Review every persisted value and both independent validations before creating the chart."),
    issueSummary,
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
      reviewEntry("Chrono Group memberships", memberships.length > 0
        ? memberships.map((group) => group.label ?? group.name ?? group.id).join(", ")
        : "None"),
      reviewEntry("Companion proposals", wizard.companions?.length
        ? `${wizard.companions.length} referenced proposals`
        : "None"),
    ),
    notReady
      ? null
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
    "data-source": legacyComplete.source === true,
    "chart-type": Boolean(wizard.draft?.typeId),
    "map-and-prepare-data": legacyComplete.roles === true,
    "configure-chart": legacyComplete.style === true && renderProof.status === "valid",
    "review-and-create": canCreate
      && placementProof.status === "valid"
      && renderProof.status === "valid",
  };
  const prerequisites = {
    destination: true,
    "data-source": complete.destination,
    "chart-type": complete["data-source"],
    "map-and-prepare-data": complete["chart-type"],
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
    || wizard?.sourceSelection
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
    throw new TypeError("Chrono Groups must be an array.");
  }
  if (groupId !== null && (
    typeof groupId !== "string" || groupId.trim() === ""
  )) {
    throw new Error("Chrono Group id is invalid.");
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
      throw new Error(`Unknown Chrono Group "${groupId}".`);
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

export function routeChartWizardCommit({
  mode = "create",
  payload,
  reviewedPlacement,
  onSaveChanges,
  onCreate,
} = {}) {
  if (mode === "edit") {
    if (typeof onSaveChanges !== "function") {
      throw new TypeError("Chart edit mode requires an onSaveChanges callback.");
    }
    return onSaveChanges(payload);
  }
  if (typeof onCreate !== "function") {
    throw new TypeError("Chart creation requires an onCreate callback.");
  }
  return onCreate(payload, reviewedPlacement);
}

export function resolveChartCreationOwnerCommit(result, {
  onOwnerChange = noop,
  onCommitSuccess = noop,
} = {}) {
  if (result?.status !== "committed") return false;
  onOwnerChange(null);
  onCommitSuccess(result);
  return true;
}

export function buildChartWizardEditCommitPayload({
  placementId,
  finalized,
  runtimeArtifact,
} = {}) {
  if (!isRecord(finalized?.chart)) {
    throw new TypeError("A finalized chart is required for chart edit Save.");
  }
  return {
    placementId,
    chart: finalized.chart,
    ...(Object.hasOwn(finalized, "chronoGroups")
      ? { chronoGroups: finalized.chronoGroups }
      : {}),
    ...(runtimeArtifact === undefined ? {} : { runtimeArtifact }),
  };
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

function uploadedCsvDisplayName(fileName) {
  return String(fileName ?? "Uploaded CSV")
    .replace(/\.csv$/i, "")
    .replace(/[-_]+/g, " ")
    .trim() || "Uploaded CSV";
}

function uploadedGeoJsonDisplayName(fileName) {
  return String(fileName ?? "Uploaded GeoJSON")
    .replace(/\.geojson$/i, "")
    .replace(/[-_]+/g, " ")
    .trim() || "Uploaded GeoJSON";
}

function clearSelectedSource(wizard) {
  if (!wizard?.sourceSelection?.sourceId && !wizard?.draft?.sourceId) return wizard;
  return reduceWizardState({ ...wizard, confirmation: "clearSource" }, {
    type: "confirmClearSource",
  });
}

export function createChartWizardState({
  loadedData,
  profiles = {},
  chronoGroups,
  existingCharts = [],
  destination = null,
  dashboardRevision = null,
  draftId = null,
  draft = null,
  source = null,
  sourceSelection = null,
  stage = null,
}) {
  return createWizardState({
    loadedData,
    profiles,
    chronoGroups,
    charts: existingCharts,
    destination,
    dashboardRevision,
    draftId,
    draft,
    source,
    sourceSelection,
    stage,
  });
}

export function createChartWizardEditState({
  session,
  loadedData,
  profiles = {},
  chronoGroups,
  existingCharts = [],
  destination = null,
  dashboardRevision = null,
  source = null,
  stage = null,
} = {}) {
  if (
    session?.owner?.kind !== "chart-edit"
    || session.owner.scopeId !== session.placementId
    || !session.draft
  ) {
    throw new TypeError("Chart wizard edit mode requires one chart-edit session owner.");
  }
  const sourceId = session.draft.sourceId;
  const rows = readEntry(loadedData, sourceId) ?? [];
  const profile = readEntry(profiles, sourceId) ?? profileDataset(rows);
  return createChartWizardState({
    loadedData,
    profiles: sourceId ? { ...profiles, [sourceId]: profile } : profiles,
    chronoGroups: session.chronoGroups ?? chronoGroups,
    existingCharts,
    destination,
    dashboardRevision,
    draftId: `chart-edit:${session.placementId}`,
    draft: session.draft,
    source,
    sourceSelection: sourceId ? { sourceId, source, rows, profile } : null,
    stage,
  });
}

function hasDashboardPages(dashboard) {
  return Array.isArray(dashboard?.pages);
}

function editableDestinationChoices(dashboard, current = {}) {
  const pages = hasDashboardPages(dashboard)
    ? dashboard.pages.flatMap((page) => {
        const sections = (page?.sections ?? []).flatMap((section) => (
          resolveDestination({ pageId: page.id, sectionId: section.id }, dashboard).status === "valid"
            ? [{
                id: section.id,
                label: section.title ?? section.label ?? section.id,
                anchors: (section.panels ?? []).flatMap((panel) => {
                  const chart = panel?.chart ?? panel;
                  return chart?.id
                    ? [{ id: chart.id, label: chart.title ?? chart.id }]
                    : [];
                }),
              }]
            : []
        ));
        return sections.length > 0
          ? [{ id: page.id, label: page.label ?? page.title ?? page.id, sections }]
          : [];
      })
    : [];

  if (!pages.some(({ id }) => id === current?.pageId) && current?.pageId) {
    pages.push({
      id: current.pageId,
      label: current.pageId,
      sections: current.sectionId
        ? [{ id: current.sectionId, label: current.sectionId, anchors: [] }]
        : [],
    });
  }
  const selectedPage = pages.find(({ id }) => id === current?.pageId) ?? pages[0] ?? null;
  const sections = selectedPage?.sections ?? [];
  if (!sections.some(({ id }) => id === current?.sectionId) && current?.sectionId) {
    sections.push({ id: current.sectionId, label: current.sectionId, anchors: [] });
  }
  const selectedSection = sections.find(({ id }) => id === current?.sectionId) ?? sections[0] ?? null;
  return { pages, sections, anchors: selectedSection?.anchors ?? [] };
}

function legacyPlacementProof(destination, footprint) {
  const valid = Boolean(destination?.pageId && destination?.sectionId);
  const relation = destination?.relation ?? destination?.position ?? "append";
  return {
    status: valid ? "valid" : "invalid",
    revision: valid
      ? `legacy:${destination.pageId}:${destination.sectionId}:${relation}:${footprint.columns}x${footprint.rows}`
      : null,
    errors: valid ? [] : [{ message: "Choose a page and section before placement can be validated." }],
    orderedText: valid
      ? `Page ${destination.pageId}; section ${destination.sectionId}; ${relation}; ${footprint.columns} columns by ${footprint.rows} rows.`
      : "Choose a page and section before placement can be validated.",
  };
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

function readEntry(collection, key) {
  if (collection instanceof Map) return collection.get(key);
  return isRecord(collection) ? collection[key] : undefined;
}

function stableIdentity(value, ancestors = new Set()) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (ancestors.has(value)) throw new TypeError("Chart edit drafts cannot contain circular data.");
  ancestors.add(value);
  const result = Array.isArray(value)
    ? `[${value.map((entry) => stableIdentity(entry, ancestors)).join(",")}]`
    : `{${Object.keys(value).sort().map((key) => (
        `${JSON.stringify(key)}:${stableIdentity(value[key], ancestors)}`
      )).join(",")}}`;
  ancestors.delete(value);
  return result;
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
