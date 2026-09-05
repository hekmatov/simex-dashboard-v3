import React from "react";

import { overlayRuntimeContentHealth } from "../content-library/contentHealth.js";
import { useOperationStatusActions } from "./app-shell/OperationStatusProvider.jsx";
import {
  beginDashboardContentOperation,
  reportDashboardContentActivity,
  runDashboardContentOperation,
} from "../lib/dashboardContentActivity.js";
import ChartEditorV3 from "./chart-authoring/ChartEditorV3.jsx";
import ChartQuickEditor from "./chart-authoring/ChartQuickEditor.jsx";
import ChartWizardV3 from "./chart-authoring/ChartWizardV3.jsx";
import StaticContentEditor, { StaticContentQuickEditor } from "./static-content/StaticContentEditor.jsx";
import StaticContentWizard, { cleanupImageDraftAssets } from "./static-content/StaticContentWizard.jsx";
import BuildWorkspace from "./build/BuildWorkspace.jsx";
import BuildMoveDialog from "./build/BuildMoveDialog.jsx";
import BuildMoveConfirmationDialog from "./build/BuildMoveConfirmationDialog.jsx";
import DashboardPackageExportDialog from "./build/DashboardPackageExportDialog.jsx";
import DeleteDashboardContentDialog from "./build/DeleteDashboardContentDialog.jsx";
import {
  activeLocalAuthoringDrafts,
  buildLeaveBlockReason,
  createBuildDirtyState,
  hasActiveContentRetainers,
  hasActiveLocalAuthoringDrafts,
  hasEditingLocalAuthoringDrafts,
  hasUnsavedAuthoredContent,
} from "./build/buildDirtyState.js";
import { reconcileBuildSelection } from "./build/buildSelectionModel.js";
import {
  addBuildLayoutPage,
  addBuildLayoutSection,
  beginBuildLayoutSave,
  completeBuildLayoutSave,
  createBuildLayoutDraft,
  failBuildLayoutSave,
  mergeBuildLayoutPage,
  mergeBuildLayoutSection,
  moveBuildLayoutSection,
  removeBuildLayoutPage,
  removeBuildLayoutSection,
  renameBuildLayoutPage,
  renameBuildLayoutPanel,
  renameBuildLayoutSection,
  reorderBuildLayoutPage,
  reorderBuildLayoutSection,
} from "./build/buildLayoutDraft.js";
import { analyzeBuildLayoutMove, applyBuildLayoutMove } from "./build/buildLayoutMove.js";
import {
  BUILD_LAYOUT_MOVE_MIME,
  canonicalMove,
  createBuildMoveDragSession,
  encodeBuildMovePayload,
} from "./build/buildTreeInteraction.js";

import ColorField from "./ColorField.jsx";
import ConfirmDialog from "./common/ConfirmDialog.jsx";
import { IconControl, IconSummary, SimExIcon } from "./common/SimExIcon.js";
import DeviceLayoutControl from "./DeviceLayoutControl.jsx";
import { useDashboardCanvasActions } from "./dashboard/dashboardCanvasActions.js";
import FullscreenDisplay from "./FullscreenDisplay.jsx";
import ChartPanel from "./ChartPanel.jsx";
import LayoutGrid from "./LayoutGrid.jsx";
import LandingPage, { hasLandingPresentation } from "./LandingPage.jsx";
import PlaybackSurface from "./playback/PlaybackSurface.jsx";
import { usePlayback } from "./playback/PlaybackProvider.jsx";
import PresentWorkspace from "./presentation/PresentWorkspace.jsx";
import usePresentationRuntime from "./presentation/usePresentationRuntime.js";
import {
  applyScenePresentTransition,
  presentationSceneTransitionReady,
} from "./time/scenePresentTransition.js";
import DashboardModeWorkspace from "./dashboard/DashboardModeWorkspace.jsx";
import {
  configuredCharts,
  findPanelPlacement,
} from "../lib/dashboardSelectors.js";
import { createDebouncedDashboardEdits } from "../lib/dashboardCommitController.js";
import { createDashboardReplacementRendererState } from "../lib/dashboardPackageImportTransaction.js";
import { buildPresentableItemIndex } from "../static-content/staticPanelCapabilities.js";
import { collectDashboardPackageExportIssues } from "../lib/dashboardPackageExport.js";
import { summarizeDashboardContent } from "../lib/dashboardContentReset.js";
import { validateGeoJson } from "../lib/loadDashboard.js";
import {
  createSubmissionGate,
  runModeratorTransaction,
} from "../lib/moderatorTransaction.js";
import {
  ICON_TOKENS,
  deriveIconAccentVariants,
} from "../iconography/iconCatalog.js";
import {
  createChartDraftSessionStore,
  isMeaningfulChartDraft,
} from "../charting/forms/chartDraftSession.js";
import {
  createChartEditSession,
  dismissChartEditSession,
  hasRetainableChartEditWork,
  isChartEditSessionDirty,
  materializeChartEditSessionSave,
  prepareActiveQuickChartEditRemoval,
  prepareChartEditSessionRetry,
  prepareChartEditSessionSave,
  projectChartEditSessionOwner,
  projectChartEditSessionDashboard,
  createdPlacementIdFromCommittedDashboard,
  rebaseChartPersistenceIntoLayoutDraft,
  resolveChartCreationPersistenceTarget,
  reduceChartEditSession,
  runPrioritizedChartSave,
} from "../charting/forms/chartEditSession.js";
import { installChartDraftUnloadGuard } from "../charting/forms/chartDraftUnloadGuard.js";
import { isGeoJsonDescriptor } from "../data/sourceRequest.js";
import { getChartSchema } from "../charting/schemas/chartSchemaRegistry.js";
import { prepareStaticPanelTransaction } from "../static-content/staticPanelTransaction.js";
import {
  createStaticContentDraft,
  isStaticContentDraftDirty,
  projectStaticContentDraftOwner,
  reduceStaticContentDraft,
} from "../static-content/forms/staticContentDraft.js";
import { browserAuthoredAssetStore, resolveBrowserAuthoredAsset } from "../static-content/assets/browserAuthoredAssetRuntime.js";
import { buildContentDependencyGraph } from "../content-library/contentDependencyGraph.js";
import { prepareContentDeletion, commitContentDeletion, createContentDeletionAdapters } from "../content-library/contentDeletionTransaction.js";
import { classifyManagedSource } from "../content-library/sourceEntrySchema.js";

const SCENARIO_DIRTY_BLOCK_REASON =
  "Save or discard changes to Scenario before leaving this edit. Stay in Build to continue editing.";
const CHART_WIZARD_TAKEOVER_BLOCK_REASON =
  "Resume or reset the chart changes before resuming the new chart draft.";

function createExternalDirtyState() {
  return { chronoGroup: false, scene: false, scenario: false, dashboardMetadata: false };
}

export async function completeFinishBuildTransition({ requestMode, status }) {
  try {
    const outcome = await requestMode("view");
    if (outcome?.ok !== true || outcome.mode !== "view") {
      throw new Error(outcome?.reason ?? "Build could not be finished.");
    }
    status.succeed("Build finished.");
    return outcome;
  } catch (error) {
    status.fail(error);
    throw error;
  }
}

const DashboardRenderer = React.forwardRef(function DashboardRenderer({
  dashboard,
  contentDraftCoordinator = null,
  viewOnly = false,
  mode,
  activePageId,
  onActivePageChange,
  onModeRequest,
  onBuildDraftLockChange,
  onBuildStructureProjectionChange,
  onInlineRenameDirtyChange,
  onComparisonSelectionChange,
  onCommitPendingConfiguration,
  displayState,
  onDisplayAction,
  companionStatusLabel,
  deviceLayout,
  onDeviceLayoutChange,
  onPageAdd,
  onPageRemove,
  onPageChange,
  onPageReorder,
  onStructureChange,
  onSaveSceneDatePosition,
  onDashboardChange,
  onBackgroundPersistenceError,
  onApplyPendingEdits,
  onPanelEditCommit,
  onPanelEditCancel,
  onSectionChange,
  onSectionReorder,
  onSectionInsert,
  onChartCreate,
  onChartSave,
  onStaticPanelCommit,
  onApplyCitationToSourceCharts,
  onPanelRemove,
  onPanelReorder,
  onImportConfig,
  onExportConfig,
  onOpenBuildPanel,
  onResolveScenarioDraft,
  onResetEditSession,
  onDeleteDashboardContent,
  onOpenDashboardLook,
  buildPanelOpen = false,
  onCloseBuildPanel,
  operationError = "",
  themeProjection,
}, ref) {
  const { beginOperation, reportActivity } = useOperationStatusActions();
  const reportContentActivity = React.useCallback(
    (actionId, options) => reportDashboardContentActivity(
      reportActivity,
      actionId,
      options,
    ),
    [reportActivity],
  );
  const beginContentOperation = React.useCallback(
    (actionId, options) => beginDashboardContentOperation(
      beginOperation,
      actionId,
      options,
    ),
    [beginOperation],
  );
  const playback = usePlayback();
  const buildMode = mode === "build";
  const editMode = buildMode;
  const [selectedPanelId, setSelectedPanelId] = React.useState(null);
  const [buildSelection, setBuildSelection] = React.useState(null);
  const [chartEditorPlacementId, setChartEditorPlacementId] = React.useState(null);
  const [chartEditorVisible, setChartEditorVisible] = React.useState(false);
  const [chartEditorDirty, setChartEditorDirty] = React.useState(false);
  const [chartEditSession, setChartEditSession] = React.useState(null);
  const [chartWizardDirty, setChartWizardDirty] = React.useState(false);
  const [chartCreateOwner, setChartCreateOwner] = React.useState(null);
  const [chartWizardSuspended, setChartWizardSuspended] = React.useState(false);
  const [chartWizardSuspendedTarget, setChartWizardSuspendedTarget] = React.useState(null);
  const [staticWizardTarget, setStaticWizardTarget] = React.useState(null);
  const [staticContentDraft, setStaticContentDraft] = React.useState(null);
  const [staticContentDirty, setStaticContentDirty] = React.useState(false);
  const [staticContentRestoration, setStaticContentRestoration] = React.useState(null);
  const [staticContentEditorSurface, setStaticContentEditorSurface] = React.useState("quick");
  const staticWizardInvokerRef = React.useRef(null);
  const quickChartRestorationFrameRef = React.useRef(0);
  const [localAuthoringDrafts, setLocalAuthoringDrafts] = React.useState({});
  const [contentDraftRetainers, setContentDraftRetainers] = React.useState(() => (
    contentDraftCoordinator?.getActiveRetainers?.() ?? null
  ));
  const [chartDraftSessionRevision, setChartDraftSessionRevision] = React.useState(0);
  const [chartWizardSessionEpoch, setChartWizardSessionEpoch] = React.useState(0);
  const chartWizardSessionEpochRef = React.useRef(chartWizardSessionEpoch);
  const [inlineRenameDirty, setInlineRenameDirty] = React.useState(false);
  const [packageImportConfirmation, setPackageImportConfirmation] = React.useState(false);
  const [packageExportIssues, setPackageExportIssues] = React.useState([]);
  const [deleteContentConfirmation, setDeleteContentConfirmation] = React.useState(false);
  const [externalDirty, setExternalDirty] = React.useState(createExternalDirtyState);
  const externalDirtyRef = React.useRef(externalDirty);
  React.useEffect(() => {
    if (!contentDraftCoordinator) {
      setContentDraftRetainers(null);
      return undefined;
    }
    setContentDraftRetainers(contentDraftCoordinator.getActiveRetainers());
    return contentDraftCoordinator.subscribe(setContentDraftRetainers);
  }, [contentDraftCoordinator]);
  const onContentDraftStage = React.useCallback(
    (input) => {
      const staged = contentDraftCoordinator?.stageDraft(input);
      if (staged) {
        reportContentActivity("source.draft.created", {
          subject: input?.displayName ?? input?.sourceId ?? input?.draftId,
          key: `content:source.draft:${staged.draftId ?? input?.draftId ?? "active"}`,
        });
      }
      return staged;
    },
    [contentDraftCoordinator, reportContentActivity],
  );
  const onContentDraftCommit = React.useCallback(
    async (draftId, buildCandidate, {
      operationKey = "source-content-save",
      operationLabel = "Saving source content",
      successMessage = "Source content saved.",
    } = {}) => {
      if (!contentDraftCoordinator) return undefined;
      const status = beginOperation({
        key: operationKey,
        label: operationLabel,
        priority: true,
      });
      try {
        await status.beforeWork();
        await pendingEditsRef.current?.flush();
        const result = await contentDraftCoordinator.commitDraft(draftId, { buildCandidate });
        status.succeed(successMessage);
        return result;
      } catch (error) {
        status.fail(error);
        throw error;
      }
    },
    [beginOperation, contentDraftCoordinator],
  );
  const onContentDraftDiscard = React.useCallback(
    (draftId, reason) => {
      if (!contentDraftCoordinator) return undefined;
      const active = contentDraftCoordinator.getActiveRetainers().records
        .some((record) => record.ownerId === draftId && record.status !== "active");
      if (!active) return false;
      const discarded = contentDraftCoordinator.discardDraft(draftId, { reason });
      void Promise.resolve(discarded).then(() => {
        reportContentActivity("source.draft.discarded", {
          subject: draftId,
          key: `content:source.draft:${draftId}`,
        });
      }, () => undefined);
      return discarded;
    },
    [contentDraftCoordinator, reportContentActivity],
  );
  const [pendingBuildSelection, setPendingBuildSelection] = React.useState(null);
  const [pendingStaticBuildSelection, setPendingStaticBuildSelection] = React.useState(null);
  const [buildRevealRequest, setBuildRevealRequest] = React.useState(null);
  const [buildTreeResetGeneration, setBuildTreeResetGeneration] = React.useState(0);
  const [buildSelectionError, setBuildSelectionError] = React.useState("");
  const [focusInspectorLabelKey, setFocusInspectorLabelKey] = React.useState(0);
  const [draggingPanelId, setDraggingPanelId] = React.useState(null);
  const [dragOverPanelId, setDragOverPanelId] = React.useState(null);
  const panelDragSessionRef = React.useRef(null);
  if (!panelDragSessionRef.current) panelDragSessionRef.current = createBuildMoveDragSession();
  const [moveDialogRequest, setMoveDialogRequest] = React.useState(null);
  const [moveConfirmation, setMoveConfirmation] = React.useState(null);
  const [multiSelectMode, setMultiSelectMode] = React.useState(false);
  const [multiPanelIds, setMultiPanelIds] = React.useState([]);
  const multiPanelIdsRef = React.useRef(multiPanelIds);
  multiPanelIdsRef.current = multiPanelIds;
  const dashboardStateRef = React.useRef(dashboard);
  dashboardStateRef.current = dashboard;
  const buildRevealRequestIdRef = React.useRef(0);
  const buildRevealResolversRef = React.useRef(new Map());
  const appliedBuildRevealIdRef = React.useRef(0);
  const sectionReorderPendingRef = React.useRef(false);
  const importInputRef = React.useRef(null);
  const chartWizardControllerRef = React.useRef(null);
  const chartDraftSessionStoreRef = React.useRef(null);
  if (chartDraftSessionStoreRef.current === null) {
    chartDraftSessionStoreRef.current = createChartDraftSessionStore();
  }
  const chartDraftSessionStore = chartDraftSessionStoreRef.current;
  const chartDraftSessionKey = String(dashboard.id ?? "active-dashboard");
  const [chartWizardTarget, setChartWizardTarget] = React.useState(null);
  const [chartEditBaseline, setChartEditBaseline] = React.useState(null);
  const [dashboardDraft, setDashboardDraft] = React.useState(() => dashboardTextDraftFromDashboard(dashboard));
  const [pageDrafts, setPageDrafts] = React.useState({});
  const [sectionDrafts, setSectionDrafts] = React.useState({});
  const [buildLayoutDraft, setBuildLayoutDraft] = React.useState(null);
  const buildLayoutDraftRef = React.useRef(null);
  React.useEffect(() => {
    buildLayoutDraftRef.current = buildLayoutDraft;
  }, [buildLayoutDraft]);
  React.useEffect(() => {
    if (!buildLayoutDraftRef.current || !["dirty", "error"].includes(buildLayoutDraftRef.current.status)) return;
    const activity = buildPanelOpen ? "active" : "suspended";
    if (buildLayoutDraftRef.current.activity === activity) return;
    const next = { ...buildLayoutDraftRef.current, activity };
    buildLayoutDraftRef.current = next;
    setBuildLayoutDraft(next);
  }, [buildPanelOpen]);
  const pendingEditCallbacksRef = React.useRef(null);
  pendingEditCallbacksRef.current = {
    onApplyPendingEdits,
    onDashboardChange,
    onPageChange,
    onSectionChange,
    onBackgroundPersistenceError,
  };
  const pendingEditsRef = React.useRef(null);
  if (pendingEditsRef.current === null) {
    pendingEditsRef.current = createDebouncedDashboardEdits({
      delay: 650,
      scheduler: typeof window === "undefined" ? globalThis : window,
      onCommit: (edits) => commitPendingDashboardEdits(
        edits,
        pendingEditCallbacksRef.current,
      ),
      onError: (error) => {
        pendingEditCallbacksRef.current.onBackgroundPersistenceError?.(error);
      },
    });
  }
  const pendingEdits = pendingEditsRef.current;
  const [resetEditSessionConfirmation, setResetEditSessionConfirmation] =
    React.useState(false);
  const [pendingRemovalPanelId, setPendingRemovalPanelId] = React.useState(null);
  const [pendingRemovalPageId, setPendingRemovalPageId] = React.useState(null);
  const moderatorOperationGateRef = React.useRef(null);
  if (moderatorOperationGateRef.current === null) {
    moderatorOperationGateRef.current = createSubmissionGate();
  }
  const [moderatorOperation, setModeratorOperation] = React.useState({
    kind: null,
    errorKind: null,
    error: "",
  });
  const [multiSelectNotice, setMultiSelectNotice] = React.useState(null);
  const buildWorkspaceSelectionRef = React.useRef(null);
  const buildWorkspaceExportResolutionRef = React.useRef(null);
  const requestBuildSelectionRef = React.useRef(null);
  const [appliedScenePresentSignature, setAppliedScenePresentSignature] = React.useState(null);

  const workingDashboard = editMode && buildLayoutDraft?.value
    ? buildLayoutDraft.value
    : dashboard;
  const quickChartEditDirty = Boolean(
    chartEditSession && hasRetainableChartEditWork(chartEditSession),
  );
  const chartEditOwner = chartEditSession
    ? projectChartEditSessionOwner(chartEditSession)
    : null;
  const chartOwnerSlots = [chartEditOwner, chartCreateOwner]
    .filter(Boolean)
    .map((owner) => ({ ...owner, draftId: owner.id }));
  const chartOwnerSlot = chartOwnerSlots[0] ?? null;
  const renderingDashboard = React.useMemo(
    () => chartEditSession
      ? projectChartEditSessionDashboard(workingDashboard, chartEditSession)
      : workingDashboard,
    [chartEditSession, workingDashboard],
  );

  React.useEffect(() => {
    onBuildStructureProjectionChange?.(editMode ? workingDashboard : null);
  }, [editMode, onBuildStructureProjectionChange, workingDashboard]);
  const activePage =
    workingDashboard.pages.find((page) => page.id === activePageId) ?? workingDashboard.pages[0];
  const renderingActivePage =
    renderingDashboard.pages.find((page) => page.id === activePageId) ?? renderingDashboard.pages[0];
  const presentableItemIndex = React.useMemo(
    () => buildPresentableItemIndex(dashboard),
    [dashboard],
  );
  const presentationRuntime = usePresentationRuntime(presentableItemIndex, {
    enabled: mode === "present",
    playback,
    onSaveSceneDatePosition: saveSceneDatePosition,
  });
  const presentationCompositionReady = presentationSceneTransitionReady(
    appliedScenePresentSignature,
    playback.activeScene,
    { enabled: mode === "present" },
  );
  React.useEffect(() => {
    applyScenePresentTransition(
      appliedScenePresentSignature,
      playback.activeScene,
      {
        enabled: mode === "present",
        onDisplayAction: presentationRuntime.onDisplayAction,
        onTransitionApplied: setAppliedScenePresentSignature,
      },
    );
  }, [
    appliedScenePresentSignature,
    mode,
    playback.activeScene,
    presentationRuntime.onDisplayAction,
  ]);
  const landingActive = hasLandingPresentation(activePage);
  const selectedPlacement = findPanelPlacement(workingDashboard, chartEditorPlacementId);
  const selectedPanel = selectedPlacement?.chart ?? null;
  const selectedPanelIsStatic = selectedPanel
    ? getChartSchema(selectedPanel.typeId).authoringWorkflow === "static"
    : false;
  const staticContentActive = staticContentDraft?.mode === "edit"
    ? Boolean(selectedPanelIsStatic && chartEditorVisible)
    : Boolean(staticWizardTarget);
  const staticContentOwner = projectStaticContentDraftOwner({
    draft: staticContentDraft,
    dirty: staticContentDirty,
    active: staticContentActive,
    placementId: staticContentDraft?.mode === "edit" ? chartEditorPlacementId : null,
    status: staticContentDraft?.status === "failed"
      ? "error"
      : staticContentDraft?.status === "committing" ? "saving" : "dirty",
    surface: staticContentRestoration?.surface
      ?? (staticContentDraft?.contentTypeId === "image" ? "image" : "composer"),
    focusId: staticContentRestoration?.focusId ?? null,
    scrollTop: staticContentRestoration?.scrollTop ?? 0,
  });
  const chartAuthoringActive = Boolean(
    chartWizardTarget
      || staticWizardTarget
      || (editMode && selectedPanel && (
        selectedPanelIsStatic
          ? chartEditorVisible
          : quickChartEditDirty
      )),
  );
  const localAuthoringDirty = hasActiveLocalAuthoringDrafts(localAuthoringDrafts);
  const localAuthoringEditing = hasEditingLocalAuthoringDrafts(localAuthoringDrafts);
  const buildDraftLocked = Boolean(
    quickChartEditDirty || chartEditorDirty || staticContentDirty || localAuthoringEditing,
  );
  const selectedEditorDirty = Boolean(
    quickChartEditDirty || chartEditorDirty || staticContentDirty,
  );
  const moderatorMutationLocked = moderatorOperation.kind !== null;
  const layoutMutationLocked = moderatorMutationLocked || buildLayoutDraft?.status === "saving";
  const layoutDraftDirty = ["dirty", "saving", "error", "suspended"].includes(buildLayoutDraft?.status);
  const localDraftKeys = new Set(
    activeLocalAuthoringDrafts(localAuthoringDrafts).map(({ key }) => key),
  );
  const authoredDirtyState = {
    ...createBuildDirtyState(),
    chartEditor: chartEditOwner ? false : chartEditorDirty,
    chartWizard: false,
    staticContent: staticContentOwner ? false : staticContentDirty,
    structure: layoutDraftDirty,
    scenario: localDraftKeys.has("scenario") || externalDirty.scenario,
    inlineRename: false,
    configuration: pendingEdits.hasPending(),
    pendingContent: hasActiveContentRetainers(contentDraftRetainers),
    chronoGroup: localDraftKeys.has("chronoGroup") || externalDirty.chronoGroup,
    scene: localDraftKeys.has("scene") || externalDirty.scene,
    dashboardMetadata: externalDirty.dashboardMetadata,
  };
  const authoredDirty = hasUnsavedAuthoredContent(authoredDirtyState);
  const globalPanelColors = React.useMemo(() => resolveGlobalPanelColors(dashboard), [dashboard.globalStyles]);
  const accessibilityEnabled = false;
  const iconAccent = dashboard.globalStyles?.iconAccent ?? ICON_TOKENS.accentBase;
  const iconAccentVariants = React.useMemo(
    () => deriveIconAccentVariants(iconAccent),
    [iconAccent],
  );
  const iconLanguageStyles = React.useMemo(() => ({
    "--simex-icon-base": "var(--simex-text-strong)",
    "--simex-icon-accent": iconAccentVariants.base,
    "--simex-icon-accent-on-light": iconAccentVariants.onLight,
    "--simex-icon-accent-on-dark": iconAccentVariants.onDark,
    "--simex-icon-danger": ICON_TOKENS.danger,
    "--simex-icon-selected": ICON_TOKENS.success,
  }), [iconAccentVariants]);
  const geoDataSources = React.useMemo(
    () => validatedGeoDataSources(dashboard),
    [dashboard.dataSources, dashboard.loadedData],
  );
  const setAuthoredDirtyFlag = React.useCallback((key, dirty) => {
    if (!["chronoGroup", "scene", "scenario", "dashboardMetadata"].includes(key)) return false;
    const next = { ...externalDirtyRef.current, [key]: dirty === true };
    externalDirtyRef.current = next;
    setExternalDirty(next);
    return true;
  }, []);

  const resetExternalDirty = React.useCallback(() => {
    const next = createExternalDirtyState();
    externalDirtyRef.current = next;
    setExternalDirty(next);
  }, []);

  const handleLocalDraftsChange = React.useCallback((drafts) => {
    setLocalAuthoringDrafts(drafts ?? {});
  }, []);

  const handleChartDraftStateChange = React.useCallback((state) => {
    if (chartWizardSessionEpoch !== chartWizardSessionEpochRef.current) return;
    if (!isMeaningfulChartDraft(state)) {
      chartDraftSessionStore.clear(chartDraftSessionKey);
    } else if (chartDraftSessionStore.get(chartDraftSessionKey)) {
      chartDraftSessionStore.replace(chartDraftSessionKey, state);
    } else {
      chartDraftSessionStore.start(chartDraftSessionKey, state);
    }
    setChartWizardDirty(isMeaningfulChartDraft(state));
    setChartDraftSessionRevision((current) => current + 1);
  }, [chartDraftSessionKey, chartDraftSessionStore, chartWizardSessionEpoch]);

  const handleChartCreateOwnerChange = React.useCallback((owner) => {
    setChartCreateOwner((current) => (
      owner && current?.id === owner.id && !owner.restoration
        ? { ...owner, restoration: current.restoration }
        : owner
    ));
  }, []);

  React.useImperativeHandle(ref, () => ({
    setAuthoredDirtyFlag,
    async prepareForPackageImport() {
      if (externalDirtyRef.current.scenario) throw new Error(SCENARIO_DIRTY_BLOCK_REASON);
      await pendingEdits.flush();
      await onCommitPendingConfiguration?.();
    },
    async prepareForOnlineDashboardRestore() {
      pendingEdits.cancel();
    },
    resetAfterDashboardReplacement(replacementDashboard) {
      const rebasedDrafts = createDashboardReplacementRendererState(
        replacementDashboard,
        { buildLayoutDraft: buildLayoutDraftRef.current },
      );
      pendingEdits.cancel();
      for (const resolve of buildRevealResolversRef.current.values()) resolve(false);
      buildRevealResolversRef.current.clear();
      buildRevealRequestIdRef.current += 1;
      appliedBuildRevealIdRef.current = 0;
      setDashboardDraft(rebasedDrafts.dashboardDraft);
      setPageDrafts(rebasedDrafts.pageDrafts);
      setSectionDrafts(rebasedDrafts.sectionDrafts);
      buildLayoutDraftRef.current = rebasedDrafts.buildLayoutDraft;
      setBuildLayoutDraft(rebasedDrafts.buildLayoutDraft);
      setChartEditorPlacementId(null);
      setChartEditorVisible(false);
      setChartEditBaseline(null);
      setChartEditorDirty(false);
      setChartEditSession(null);
      setChartWizardTarget(null);
      setChartWizardDirty(false);
      setChartCreateOwner(null);
      chartDraftSessionStore.clear(chartDraftSessionKey);
      setChartWizardSuspended(false);
      setChartWizardSuspendedTarget(null);
      setStaticWizardTarget(null);
      setStaticContentDraft(null);
      setStaticContentDirty(false);
      setChartDraftSessionRevision((current) => current + 1);
      const nextSessionEpoch = chartWizardSessionEpochRef.current + 1;
      chartWizardSessionEpochRef.current = nextSessionEpoch;
      setChartWizardSessionEpoch(nextSessionEpoch);
      setLocalAuthoringDrafts({});
      setInlineRenameDirty(false);
      resetExternalDirty();
      onInlineRenameDirtyChange?.(false);
      setBuildSelection(null);
      setPendingBuildSelection(null);
      setBuildRevealRequest(null);
      setBuildSelectionError("");
      setPackageImportConfirmation(false);
      setBuildTreeResetGeneration((current) => current + 1);
    },
    requestCompareCharts() {
      if (buildMode || multiSelectMode) return;
      startMultiFullscreenSelection();
    },
    requestAddPage(name) {
      if (!buildMode || chartAuthoringActive) return;
      releaseCleanQuickChartEditSession();
      addBuildPage(name);
    },
    requestBuildPageReorder(pageId, targetIndex) {
      if (!buildMode || chartAuthoringActive) return;
      releaseCleanQuickChartEditSession();
      reorderBuildPage(pageId, targetIndex);
    },
    requestBuildPageCommand(command) {
      if (!buildMode || chartAuthoringActive) return;
      releaseCleanQuickChartEditSession();
      applyBuildStructureCommand(command);
    },
    requestChronoGroupAuthoring() {
      if (!buildMode || chartAuthoringActive) return;
      const group = dashboardStateRef.current.chronoGroups?.[0];
      if (!group) return;
      releaseCleanQuickChartEditSession();
      const selection = { kind: "chronoGroup", chronoGroupId: group.id };
      const activate = buildWorkspaceSelectionRef.current ?? requestBuildSelectionRef.current;
      void activate?.(selection, { intent: "activate" });
    },
    requestDashboardPackageImport() {
      requestDashboardPackageImport();
    },
    requestDashboardPackageExport() {
      void exportDashboardPackage();
    },
    requestDiscardBuildChanges() {
      requestResetEditSession();
    },
    requestDeleteDashboardContent() {
      openDeleteDashboardContentConfirmation();
    },
    async prepareToLeaveBuild(destination = "mode") {
      if (!buildMode) return { ok: true };
      if (buildDraftLocked) {
        return {
          ok: false,
          reason: buildLeaveBlockReason(localAuthoringDrafts) || (destination === "page"
            ? "Finish or cancel the open chart editor before changing Page."
            : "Finish or cancel the open chart editor before leaving Build."),
        };
      }
      if (destination === "mode" && localAuthoringDirty) {
        return {
          ok: false,
          reason: buildLeaveBlockReason(localAuthoringDrafts),
        };
      }
      if (destination === "mode" && externalDirtyRef.current.scenario) {
        return {
          ok: false,
          reason: SCENARIO_DIRTY_BLOCK_REASON,
        };
      }
      if (chartWizardTarget) {
        const suspended = chartWizardControllerRef.current?.suspend?.();
        if (suspended === false) {
          return {
            ok: false,
            reason: "Wait for the current chart operation to finish before leaving Build.",
          };
        }
        if (suspended === undefined && chartWizardControllerRef.current === null) {
          setChartWizardTarget(null);
        }
      }
      const pendingLayoutDraft = buildLayoutDraftRef.current;
      if (["dirty", "error", "suspended"].includes(pendingLayoutDraft?.status)) {
        const saving = beginBuildLayoutSave(pendingLayoutDraft);
        buildLayoutDraftRef.current = saving;
        setBuildLayoutDraft(saving);
        try {
          await onStructureChange?.({
            pages: saving.value.pages,
            chronoGroups: saving.value.chronoGroups ?? dashboard.chronoGroups ?? [],
            scenes: saving.value.scenes ?? dashboard.scenes ?? [],
          });
          const completed = completeBuildLayoutSave(buildLayoutDraftRef.current, saving);
          buildLayoutDraftRef.current = completed;
          setBuildLayoutDraft(completed);
        } catch (error) {
          const failed = failBuildLayoutSave(buildLayoutDraftRef.current, saving, {
            code: error?.name === "QuotaExceededError" ? "QUOTA_EXHAUSTED" : "LAYOUT_SAVE_FAILED",
            message: error?.message ?? "Layout changes could not be saved.",
            retryable: true,
          });
          buildLayoutDraftRef.current = failed;
          setBuildLayoutDraft(failed);
          return {
            ok: false,
            reason: failed.error?.message ?? "Layout changes could not be saved.",
          };
        }
      }
      await pendingEdits.flush();
      await onCommitPendingConfiguration?.();
      return { ok: true };
    },
  }), [buildMode, buildDraftLocked, chartAuthoringActive, chartDraftSessionKey,
    chartDraftSessionStore, chartEditorDirty, chartWizardDirty, chartWizardTarget,
    chartEditSession, externalDirty, inlineRenameDirty, layoutDraftDirty, localAuthoringDrafts,
    moderatorOperation.kind, multiSelectMode, onCommitPendingConfiguration,
    onExportConfig, onInlineRenameDirtyChange, pendingEdits, resetExternalDirty,
    setAuthoredDirtyFlag]);

  React.useEffect(() => {
    onComparisonSelectionChange?.(multiSelectMode);
  }, [multiSelectMode, onComparisonSelectionChange]);

  React.useEffect(() => () => {
    onComparisonSelectionChange?.(false);
  }, [onComparisonSelectionChange]);

  React.useEffect(() => {
    if (!editMode) {
      setSelectedPanelId(null);
      setChartEditorPlacementId(null);
      setChartEditorVisible(false);
      setChartEditorDirty(false);
      setChartEditSession(null);
      setChartEditBaseline(null);
    }
  }, [editMode]);

  React.useEffect(() => {
    onBuildDraftLockChange?.(buildMode && buildDraftLocked);
  }, [buildMode, buildDraftLocked, onBuildDraftLockChange]);

  React.useEffect(() => () => {
    onBuildDraftLockChange?.(false);
  }, [onBuildDraftLockChange]);

  React.useEffect(() => () => pendingEdits.cancel(), [pendingEdits]);
  React.useEffect(() => installChartDraftUnloadGuard({
    getDraft: () => chartDraftSessionStore.get(chartDraftSessionKey),
    hasOtherMeaningfulDraft: () => localAuthoringDirty,
    window,
  }), [chartDraftSessionKey, chartDraftSessionRevision, chartDraftSessionStore, localAuthoringDirty]);
  React.useEffect(() => () => {
    for (const resolve of buildRevealResolversRef.current.values()) resolve(false);
    buildRevealResolversRef.current.clear();
  }, []);

  React.useEffect(() => {
    if (!multiSelectMode) return undefined;
    const cancelOnEscape = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setMultiSelectMode(false);
      multiPanelIdsRef.current = [];
      setMultiPanelIds([]);
      setMultiSelectNotice(null);
    };
    window.addEventListener("keydown", cancelOnEscape);
    return () => window.removeEventListener("keydown", cancelOnEscape);
  }, [multiSelectMode]);

  React.useEffect(() => {
    if (!multiSelectNotice) return undefined;
    const timeoutId = window.setTimeout(
      () => setMultiSelectNotice(null),
      2400,
    );
    return () => window.clearTimeout(timeoutId);
  }, [multiSelectNotice]);

  React.useEffect(() => {
    setDashboardDraft(dashboardTextDraftFromDashboard(dashboard));
  }, [dashboard.programLabel, dashboard.scenarioLabel, dashboard.lastUpdated]);

  React.useEffect(() => {
    if (pendingBuildSelection) return;
    setBuildSelection((current) => reconcileBuildSelection(
      current,
      dashboard,
      activePage?.id,
    ));
  }, [dashboard, activePage?.id, pendingBuildSelection]);

  React.useEffect(() => {
    if (
      !pendingBuildSelection
      || pendingBuildSelection.selection.pageId !== activePage?.id
      || appliedBuildRevealIdRef.current === pendingBuildSelection.requestId
    ) return;
    appliedBuildRevealIdRef.current = pendingBuildSelection.requestId;
    const { requestId, selection } = pendingBuildSelection;
    setBuildRevealRequest({
      id: requestId,
      selection,
      behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ? "auto" : "smooth",
    });
  }, [activePage?.id, pendingBuildSelection]);

  function navigateToPage(pageId) {
    if (moderatorOperationGateRef.current.isActive()) return;
    if (!(dashboard.pages ?? []).some((page) => page.id === pageId)) {
      return;
    }
    onActivePageChange(pageId);
    setSelectedPanelId(null);
  }

  function removePanel(panelId) {
    if (moderatorOperationGateRef.current.isActive()) return;
    clearModeratorError("remove-chart");
    setPendingRemovalPanelId(panelId);
  }

  function performModeratorOperation(kind, transaction, { onError, status = null } = {}) {
    return moderatorOperationGateRef.current.run(async () => {
      try {
        await status?.beforeWork();
        setModeratorOperation({ kind, errorKind: null, error: "" });
        const result = await transaction();
        setModeratorOperation({ kind: null, errorKind: null, error: "" });
        return result;
      } catch (error) {
        onError?.(error);
        setModeratorOperation({
          kind: null,
          errorKind: kind,
          error: boundedModeratorMessage(error),
        });
        return null;
      }
    });
  }

  function clearModeratorError(kind) {
    setModeratorOperation((current) => (
      kind && current.errorKind !== kind
        ? current
        : { ...current, errorKind: null, error: "" }
    ));
  }

  function flushPendingEditsInBackground() {
    void pendingEdits.flushInBackground();
  }

  function handleInlineRenameDirtyChange(dirty) {
    // Incomplete rename input is local UI state. The layout owner is acquired
    // only after a valid semantic rename is staged.
    setInlineRenameDirty(false);
    onInlineRenameDirtyChange?.(false);
  }

  function requestDashboardPackageImport() {
    if (moderatorOperationGateRef.current.isActive()) return;
    setBuildSelectionError("");
    if (externalDirty.scenario) {
      setBuildSelectionError(SCENARIO_DIRTY_BLOCK_REASON);
      onResolveScenarioDraft?.();
      return;
    }
    if (authoredDirty) {
      setPackageImportConfirmation(true);
      return;
    }
    importInputRef.current?.click();
  }

  function requestResetEditSession() {
    if (moderatorOperationGateRef.current.isActive()) return;
    clearModeratorError("reset-session");
    if (externalDirtyRef.current.scenario) {
      setBuildSelectionError(SCENARIO_DIRTY_BLOCK_REASON);
      onResolveScenarioDraft?.();
      return;
    }
    setResetEditSessionConfirmation(true);
  }

  function openDeleteDashboardContentConfirmation() {
    if (moderatorOperationGateRef.current.isActive()) return;
    clearModeratorError("delete-dashboard-content");
    setDeleteContentConfirmation(true);
  }

  function confirmDashboardPackageImport() {
    setPackageImportConfirmation(false);
    importInputRef.current?.click();
  }

  async function exportDashboardPackage() {
    if (moderatorOperationGateRef.current.isActive()) return;
    setBuildSelectionError("");
    const issues = collectCurrentPackageExportIssues();
    if (issues.length > 0) {
      setPackageExportIssues(issues);
      return;
    }
    try {
      if (pendingEdits.hasPending()) {
        await pendingEdits.flush();
        await onCommitPendingConfiguration?.();
      }
      const snapshot = dashboardWithCurrentDrafts();
      await onExportConfig(snapshot);
    } catch (error) {
      setBuildSelectionError(boundedModeratorMessage(error));
    }
  }

  function collectCurrentPackageExportIssues() {
    return collectDashboardPackageExportIssues({
      chartEditor: quickChartEditDirty || chartEditorDirty,
      chartWizard: chartWizardDirty || isMeaningfulChartDraft(
        chartDraftSessionStore.get(chartDraftSessionKey),
      ),
      layout: layoutDraftDirty,
      structure: localDraftKeys.has("structure"),
      scenario: localDraftKeys.has("scenario") || externalDirty.scenario,
      chronoGroup: localDraftKeys.has("chronoGroup") || externalDirty.chronoGroup,
      scene: localDraftKeys.has("scene") || externalDirty.scene,
      inlineRename: inlineRenameDirty,
      operation: moderatorOperation.kind !== null,
    });
  }

  function resolvePackageExportIssue(issueId) {
    setPackageExportIssues([]);
    if (issueId === "chart-editor") {
      if (!resumeQuickChartEditSession()) {
        setChartEditorVisible(Boolean(chartEditorPlacementId));
      }
      return;
    }
    if (issueId === "chart-wizard") {
      resumeSuspendedChartWizardWithTakeover();
      return;
    }
    if (["chrono-group", "scene"].includes(issueId)) {
      buildWorkspaceExportResolutionRef.current?.resolve?.(issueId);
      return;
    }
    if (issueId === "scenario") {
      onResolveScenarioDraft?.();
      return;
    }
    if (issueId === "layout") {
      document.querySelector('[data-pending-work-kind="layout"]')?.scrollIntoView({
        block: "nearest",
        behavior: "auto",
      });
      document.querySelector('[data-pending-work-kind="layout"] button:not(:disabled)')?.focus();
      return;
    }
    if (issueId === "inline-rename") {
      resumeInlineRenameWork();
    }
  }

  function resumeSuspendedChartWizardWithTakeover() {
    if (chartWizardTarget || !chartWizardSuspended || !chartWizardSuspendedTarget) return false;
    if (moderatorOperationGateRef.current.isActive()) return true;
    if (quickChartEditDirty) {
      setBuildSelectionError(CHART_WIZARD_TAKEOVER_BLOCK_REASON);
      return true;
    }
    if (chartAuthoringActive) return true;
    releaseCleanQuickChartEditSession();
    setBuildSelectionError("");
    setChartWizardTarget(chartWizardSuspendedTarget);
    setChartWizardSuspended(false);
    setChartCreateOwner((current) => current ? {
      ...current,
      activity: "active",
      activation: "focus",
    } : current);
    reportContentActivity("chart.draft.resumed", {
      subject: chartWizardSuspendedTarget?.sectionId,
      key: "content:chart.draft:create",
    });
    return true;
  }

  function resumeChartWizardWork() {
    if (resumeSuspendedChartWizardWithTakeover()) return;
    openChartWizard();
  }

  function resumeStaticContentWork() {
    if (staticContentDraft?.mode === "edit" && chartEditorPlacementId) {
      setChartEditorVisible(true);
      restoreStaticContentOwnerFocus();
      return;
    }
    if (staticContentDraft?.mode === "create") {
      setStaticWizardTarget(staticContentDraft.destination);
      restoreStaticContentOwnerFocus();
      return;
    }
    if (!staticWizardTarget) openStaticContentWizard();
    reportContentActivity("static.draft.resumed", {
      subject: staticContentDraft?.title ?? staticContentDraft?.mode,
      key: "content:static.draft:active",
    });
  }

  function restoreStaticContentOwnerFocus() {
    if (typeof window === "undefined") return false;
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      const root = document.querySelector(".static-content-dialog");
      const body = root?.querySelector(".static-content-dialog__body");
      if (body && Number.isFinite(staticContentRestoration?.scrollTop)) {
        body.scrollTop = staticContentRestoration.scrollTop;
      }
      const restored = staticContentRestoration?.focusId
        ? document.getElementById(staticContentRestoration.focusId)
        : null;
      const surface = staticContentRestoration?.surface ?? "composer";
      const surfaceTarget = surface === "advanced"
        ? root?.querySelector("#static-qmd-source")
        : surface === "preview"
          ? root?.querySelector('[data-free-text-pane="preview"] button, [data-free-text-pane="preview"] [tabindex="0"]')
          : surface === "image"
            ? root?.querySelector("[data-image-media-id] input:not(:disabled), [data-image-media-id] button:not(:disabled)")
            : root?.querySelector("#portable-qmd-composer-surface");
      const target = restored && root?.contains(restored)
        ? restored
        : surfaceTarget ?? root?.querySelector('[data-static-initial-focus="true"], input:not(:disabled), select:not(:disabled), button:not(:disabled)');
      target?.focus?.({ preventScroll: true });
    }));
    return true;
  }

  function suspendStaticContentOwner({ draft, restoration } = {}) {
    if (draft) setStaticContentDraft(draft);
    setStaticContentRestoration(restoration ?? null);
    if ((draft ?? staticContentDraft)?.mode === "edit") setChartEditorVisible(false);
    else setStaticWizardTarget(null);
    const invoker = staticWizardInvokerRef.current;
    window.requestAnimationFrame(() => invoker?.isConnected && invoker.focus({ preventScroll: true }));
    reportContentActivity("static.draft.suspended", {
      subject: (draft ?? staticContentDraft)?.title ?? (draft ?? staticContentDraft)?.mode,
      key: "content:static.draft:active",
    });
  }

  function discardStaticContentOwner() {
    cleanupImageDraftAssets(staticContentDraft, dashboardStateRef.current);
    if (staticContentDraft?.mode === "edit") {
      setChartEditorVisible(false);
      setChartEditorPlacementId(null);
    } else {
      setStaticWizardTarget(null);
    }
    setStaticContentDraft(null);
    setStaticContentDirty(false);
    setStaticContentRestoration(null);
    restoreStaticWizardFocus();
    reportContentActivity("static.draft.discarded", {
      subject: staticContentDraft?.title ?? staticContentDraft?.mode,
      key: "content:static.draft:active",
    });
    return true;
  }

  function resumeInlineRenameWork() {
    onOpenBuildPanel?.();
    window.requestAnimationFrame(() => {
      document.querySelector('#dashboard-map-panel input[type="text"]')?.focus();
    });
  }

  function persistChartRemovalRequest(removalRequest) {
    const removalPlacementId = removalRequest.intent.placementId;
    const layoutDraftId = buildLayoutDraftRef.current?.draftId ?? null;
    const subject = removalRequest.session?.draft?.title ?? removalPlacementId;
    const status = beginContentOperation("chart.deleted", {
      subject,
      workingLabel: `Deleting Chart “${subject}”`,
      key: "chart-remove",
    });
    setChartEditSession(removalRequest.session);
    return performModeratorOperation("remove-chart", async () => {
      await pendingEdits.flush();
      const committed = await onPanelRemove(removalPlacementId, { reportStatus: false });
      if (layoutDraftId) {
        setBuildLayoutDraft((current) => (
          current?.draftId === layoutDraftId
            ? rebaseChartPersistenceIntoLayoutDraft({
                layoutDraft: current,
                committedDashboard: committed,
                intent: removalRequest.intent,
              })
            : current
        ));
      }
      setChartEditBaseline(null);
      setChartEditSession(null);
      setChartEditorVisible(false);
      setChartEditorPlacementId((current) => (current === removalPlacementId ? null : current));
      setSelectedPanelId((current) => (current === removalPlacementId ? null : current));
      setPendingRemovalPanelId(null);
      status.succeed();
    }, {
      status,
      onError(error) {
        status.fail(error);
        setChartEditSession((current) => (
          current?.placementId === removalRequest.intent.placementId
          && current.status === "saving"
            ? reduceChartEditSession(current, {
                type: "PERSISTENCE_FAILED",
                error,
              })
            : current
        ));
      },
    });
  }

  function retryChartEditOperation() {
    if (
      moderatorOperationGateRef.current.isActive()
      || chartEditSession?.pendingOperation?.kind !== "remove"
    ) return Promise.resolve(null);
    return persistChartRemovalRequest(
      prepareChartEditSessionRetry(chartEditSession),
    );
  }

  function confirmPanelRemoval() {
    const panelId = pendingRemovalPanelId;
    if (panelId === null || moderatorOperationGateRef.current.isActive()) return;
    const removalRequest = prepareActiveQuickChartEditRemoval(
      chartEditSession,
      panelId,
    );
    if (!removalRequest) {
      const subject = selectedPanel?.title ?? panelId;
      const status = beginContentOperation("chart.deleted", {
        subject,
        workingLabel: `Deleting Chart “${subject}”`,
        key: "chart-remove",
      });
      void performModeratorOperation("remove-chart", async () => {
        await pendingEdits.flush();
        await onPanelRemove(panelId, { reportStatus: false });
        setChartEditBaseline(null);
        setChartEditSession(null);
        setChartEditorVisible(false);
        setChartEditorPlacementId((current) => (current === panelId ? null : current));
        setSelectedPanelId((current) => (current === panelId ? null : current));
        setPendingRemovalPanelId(null);
        status.succeed();
      }, {
        status,
        onError(error) {
          status.fail(error);
        },
      });
      return;
    }

    void persistChartRemovalRequest(removalRequest);
  }

  function cancelPanelRemoval() {
    if (moderatorOperationGateRef.current.isActive()) return;
    setPendingRemovalPanelId(null);
    clearModeratorError("remove-chart");
  }

  function handlePanelDragStart(event, source) {
    if (moderatorOperationGateRef.current.isActive()) {
      event.preventDefault();
      return;
    }
    panelDragSessionRef.current.start(source);
    setDraggingPanelId(source.placementId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(BUILD_LAYOUT_MOVE_MIME, encodeBuildMovePayload(source));
    const panel = event.currentTarget.closest("article");
    if (panel) event.dataTransfer.setDragImage(panel, Math.min(event.clientX - panel.getBoundingClientRect().left, panel.clientWidth / 2), 24);
  }

  function handlePanelDragOver(event, target) {
    if (
      moderatorOperationGateRef.current.isActive()
      || !editMode
      || !panelDragSessionRef.current.current()
    ) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (panelDragSessionRef.current.current().placementId === target.placementId) {
      setDragOverPanelId(null);
      return;
    }
    setDragOverPanelId(target.placementId ?? `${target.sectionId}:${target.edge}`);
  }

  function handlePanelDrop(event, target) {
    event.preventDefault();
    if (moderatorOperationGateRef.current.isActive()) return;
    const source = panelDragSessionRef.current.resolve(event.dataTransfer.getData(BUILD_LAYOUT_MOVE_MIME));
    const move = canonicalMove(source, resolvePanelDropTarget(target));
    if (move) stageBuildLayoutMove(move, event.currentTarget);
    clearDragState();
  }

  function resolvePanelDropTarget(target) {
    if (Number.isInteger(target?.index)) return target;
    const currentDashboard = buildLayoutDraftRef.current?.value ?? workingDashboard;
    const page = currentDashboard.pages?.find(({ id }) => id === target?.pageId);
    const section = page?.sections?.find(({ id }) => id === target?.sectionId);
    const placementIndex = section?.panels?.findIndex(({ id }) => id === target?.placementId) ?? -1;
    if (placementIndex < 0) return target;
    return {
      ...target,
      index: placementIndex + (target.edge === "after" ? 1 : 0),
    };
  }

  function requestPanelMove(source, label, invoker) {
    setMoveDialogRequest({ source, label, invoker });
  }

  function stageBuildLayoutMove(move, invoker = null) {
    if (!move || moderatorOperationGateRef.current.isActive() || buildLayoutDraftRef.current?.status === "saving") return false;
    const current = buildLayoutDraftRef.current ?? createBuildLayoutDraft(dashboardStateRef.current);
    const analysis = analyzeBuildLayoutMove(current, move);
    if (analysis.status !== "ready") return false;
    if (analysis.requiresConfirmation) {
      setMoveConfirmation({ analysis, invoker });
      return true;
    }
    const next = applyBuildLayoutMove(current, analysis, { confirmed: true });
    buildLayoutDraftRef.current = next;
    setBuildLayoutDraft(next);
    focusMovedLayoutTarget(analysis.targetId);
    reportContentActivity("panel.moved", {
      subject: analysis.move?.source?.label ?? analysis.move?.source?.placementId,
      key: `content:panel.move:${analysis.move?.source?.placementId ?? "active"}`,
    });
    return true;
  }

  function confirmBuildLayoutMove() {
    const pending = moveConfirmation;
    if (!pending || buildLayoutDraftRef.current?.status === "saving") return;
    const current = buildLayoutDraftRef.current ?? createBuildLayoutDraft(dashboardStateRef.current);
    const latest = analyzeBuildLayoutMove(current, pending.analysis.move);
    if (latest.status !== "ready") {
      setMoveConfirmation(null);
      return;
    }
    const next = applyBuildLayoutMove(current, latest, { confirmed: true });
    buildLayoutDraftRef.current = next;
    setBuildLayoutDraft(next);
    setMoveConfirmation(null);
    focusMovedLayoutTarget(latest.targetId);
    reportContentActivity("panel.moved", {
      subject: latest.move?.source?.label ?? latest.move?.source?.placementId,
      key: `content:panel.move:${latest.move?.source?.placementId ?? "active"}`,
    });
  }

  function focusMovedLayoutTarget(targetId) {
    if (!targetId || typeof document === "undefined") return;
    requestAnimationFrame(() => {
      const escaped = globalThis.CSS?.escape ? CSS.escape(targetId) : targetId.replaceAll('"', '\\"');
      document.querySelector(`[data-build-placement-id="${escaped}"]`)?.focus?.();
      document.querySelector(`[data-build-node-id="${escaped}"]`)?.focus?.();
    });
  }

  function focusLayoutOwner() {
    if (!buildPanelOpen) return resumeLayoutOwner();
    focusLayoutMapTarget(buildLayoutDraftRef.current?.targetId);
    return true;
  }

  function resumeLayoutOwner() {
    onOpenBuildPanel?.();
    requestAnimationFrame(() => {
      document.querySelector('[data-dashboard-map-region-control="structure"]')?.click?.();
      requestAnimationFrame(() => focusLayoutMapTarget(buildLayoutDraftRef.current?.targetId));
    });
    return true;
  }

  function focusLayoutMapTarget(targetId) {
    if (!targetId || typeof document === "undefined") return;
    const nodes = [...document.querySelectorAll("[data-build-node-id]")];
    const node = nodes.find((element) => element.dataset.buildNodeId === targetId);
    node?.scrollIntoView?.({ block: "nearest" });
    node?.focus?.();
  }

  function clearDragState() {
    panelDragSessionRef.current.clear();
    setDraggingPanelId(null);
    setDragOverPanelId(null);
  }

  const startMultiFullscreenSelection = React.useCallback((panelId) => {
    const initialPanelIds = panelId ? [panelId] : [];
    setMultiSelectMode(true);
    multiPanelIdsRef.current = initialPanelIds;
    setMultiPanelIds(initialPanelIds);
    setMultiSelectNotice(null);
  }, []);

  const toggleMultiPanel = React.useCallback((panelId) => {
    const current = multiPanelIdsRef.current;
    if (current.includes(panelId)) {
      const next = current.filter((id) => id !== panelId);
      multiPanelIdsRef.current = next;
      setMultiPanelIds(next);
      return;
    }
    if (current.length >= 4) {
      setMultiSelectNotice({
        id: Date.now(),
        message: "Maximum 4 charts allowed",
      });
      return;
    }
    const next = [...current, panelId];
    multiPanelIdsRef.current = next;
    setMultiPanelIds(next);
  }, []);

  function openMultiFullscreen() {
    if (multiPanelIds.length < 2) {
      return;
    }
    onDisplayAction({ type: "manual_set", chart_ids: multiPanelIds });
    setMultiSelectMode(false);
    multiPanelIdsRef.current = [];
    setMultiPanelIds([]);
    setMultiSelectNotice(null);
  }

  function cancelMultiSelection() {
    setMultiSelectMode(false);
    multiPanelIdsRef.current = [];
    setMultiPanelIds([]);
    setMultiSelectNotice(null);
  }

  function addBuildPage(value) {
    const label = String(value ?? "").trim();
    if (!label || moderatorOperationGateRef.current.isActive() || buildLayoutDraftRef.current?.status === "saving") return false;
    const currentDraft = buildLayoutDraftRef.current
      ?? buildLayoutDraft
      ?? createBuildLayoutDraft(dashboard);
    const pageId = uniquePageId(currentDraft.value, label);
    const nextDraft = addBuildLayoutPage(
      currentDraft,
      {
        id: pageId,
        label,
        title: label,
        description: "New dashboard page.",
        sections: [
          {
            id: `${pageId}_section`,
            title: "New section",
            description: "New dashboard section.",
            panels: [],
          },
        ],
      },
    );
    buildLayoutDraftRef.current = nextDraft;
    setBuildLayoutDraft(nextDraft);
    onActivePageChange(pageId);
    setBuildSelection({ kind: "page", pageId });
    requestAnimationFrame(() => focusMovedLayoutTarget(pageId));
    reportContentActivity("page.created", { subject: label, key: `content:page:${pageId}` });
    return true;
  }

  function reorderBuildPage(pageId, targetIndex) {
    if (moderatorOperationGateRef.current.isActive() || buildLayoutDraftRef.current?.status === "saving") return;
    const current = buildLayoutDraftRef.current ?? createBuildLayoutDraft(dashboardStateRef.current);
    const next = reorderBuildLayoutPage(current, pageId, targetIndex);
    buildLayoutDraftRef.current = next;
    setBuildLayoutDraft(next);
    setBuildSelection({ kind: "page", pageId });
    reportContentActivity("page.reordered", {
      subject: pageId,
      detail: `Moved to position ${targetIndex + 1}.`,
      key: `content:page:${pageId}:order`,
    });
  }

  function reorderBuildSection(sectionId, targetIndex) {
    if (
      sectionReorderPendingRef.current
      || moderatorOperationGateRef.current.isActive()
      || buildLayoutDraftRef.current?.status === "saving"
      || !activePage
    ) return;
    const pageId = activePage.id;
    const section = activePage.sections?.find(({ id }) => id === sectionId);
    const subject = section?.title?.trim() || sectionId;
    const status = beginContentOperation("section.reordered", {
      subject,
      detail: `Moved to position ${targetIndex + 1}.`,
      workingLabel: subject ? `Reordering Section “${subject}”` : "Reordering Section",
      key: `content:section:${sectionId}:order`,
    });
    sectionReorderPendingRef.current = true;
    void runDashboardContentOperation(status, () => {
      const current = buildLayoutDraftRef.current ?? createBuildLayoutDraft(dashboardStateRef.current);
      const next = reorderBuildLayoutSection(current, pageId, sectionId, targetIndex);
      buildLayoutDraftRef.current = next;
      setBuildLayoutDraft(next);
      return next;
    }).catch(() => undefined).finally(() => {
      sectionReorderPendingRef.current = false;
    });
  }

  function applyBuildStructureCommand(command) {
    if (!command || moderatorOperationGateRef.current.isActive() || buildLayoutDraftRef.current?.status === "saving") return;
    const draft = buildLayoutDraftRef.current ?? createBuildLayoutDraft(dashboardStateRef.current);
    const next = (() => {
      switch (command.type) {
        case "rename-page":
          return renameBuildLayoutPage(draft, command.pageId, command.label);
        case "merge-page":
          return mergeBuildLayoutPage(draft, command.pageId, command.targetPageId);
        case "remove-page":
          return removeBuildLayoutPage(draft, command.pageId, command);
        case "rename-section":
          return renameBuildLayoutSection(draft, command.pageId, command.sectionId, command.title);
        case "move-section":
          return moveBuildLayoutSection(draft, command.pageId, command.sectionId, command.targetPageId, command.placement);
        case "merge-section":
          return mergeBuildLayoutSection(draft, command.pageId, command.sectionId, command.targetSectionId);
        case "remove-section":
          return removeBuildLayoutSection(draft, command.pageId, command.sectionId, command);
        default:
          return draft;
      }
    })();
    buildLayoutDraftRef.current = next;
    setBuildLayoutDraft(next);
    const activityId = command.type.includes("page")
      ? (["merge-page", "remove-page"].includes(command.type) ? "page.deleted" : "page.updated")
      : (["merge-section", "remove-section"].includes(command.type)
          ? "section.deleted"
          : command.type === "move-section" ? "section.reordered" : "section.updated");
    const subject = command.label ?? command.title ?? command.pageId ?? command.sectionId;
    reportContentActivity(activityId, {
      subject,
      key: `content:${command.type}:${command.pageId ?? "page"}:${command.sectionId ?? "section"}`,
    });
    if (["merge-page", "remove-page"].includes(command.type) && command.pageId === activePageId) {
      const nextPageId = command.targetPageId
        ?? workingDashboard.pages.find(({ id, landing }) => id !== command.pageId && !landing)?.id
        ?? workingDashboard.pages.find(({ id }) => id !== command.pageId)?.id;
      if (nextPageId) onActivePageChange(nextPageId);
    }
  }

  function saveBuildLayoutChanges() {
    const current = buildLayoutDraftRef.current ?? buildLayoutDraft;
    if (!current || !layoutDraftDirty || current.status === "saving") return;
    const status = beginOperation({
      key: "layout-save",
      label: "Saving layout changes",
      priority: true,
    });
    const saving = beginBuildLayoutSave(current);
    buildLayoutDraftRef.current = saving;
    setBuildLayoutDraft(saving);
    void status.beforeWork()
      .then(() => onStructureChange?.({
        pages: saving.value.pages,
        chronoGroups: saving.value.chronoGroups ?? dashboard.chronoGroups ?? [],
        scenes: saving.value.scenes ?? dashboard.scenes ?? [],
      }))
      .then(() => {
        setBuildLayoutDraft((latest) => {
          const completed = completeBuildLayoutSave(latest ?? buildLayoutDraftRef.current, saving);
          buildLayoutDraftRef.current = completed;
          return completed;
        });
        status.succeed("Layout changes saved.");
      })
      .catch((error) => {
        status.fail(error);
        setBuildLayoutDraft((latest) => {
          const failed = failBuildLayoutSave(latest ?? buildLayoutDraftRef.current, saving, {
            code: error?.name === "QuotaExceededError" ? "QUOTA_EXHAUSTED" : "LAYOUT_SAVE_FAILED",
            message: error?.message ?? "Layout changes could not be saved.",
            retryable: true,
          });
          buildLayoutDraftRef.current = failed;
          return failed;
        });
      });
  }

  function discardBuildLayoutChanges() {
    if (buildLayoutDraft?.status === "saving") return;
    buildLayoutDraftRef.current = null;
    setBuildLayoutDraft(null);
    reportContentActivity("layout.discarded", { key: "content:layout:draft" });
  }

  function captureQuickChartEditRestoration(surface = "quick") {
    if (typeof document === "undefined") {
      return { surface, focusId: null, scrollTop: 0 };
    }
    const root = findQuickChartEditRoot(chartEditSession?.placementId);
    const scroller = root?.closest(".unit-orbit-scroll");
    let focusTarget = root?.contains(document.activeElement)
      ? document.activeElement
      : null;
    if (focusTarget?.closest?.(".settings-color-popover")) {
      focusTarget = focusTarget
        .closest("[data-color-field]")
        ?.querySelector("input[id], button[id]") ?? null;
    }
    return {
      surface,
      focusId: focusTarget?.id || null,
      scrollTop: scroller?.scrollTop ?? 0,
    };
  }

  function findQuickChartEditRoot(placementId) {
    if (typeof document === "undefined" || !placementId) return null;
    return [...document.querySelectorAll("[data-chart-quick-placement-id]")]
      .find((element) => element.dataset.chartQuickPlacementId === placementId) ?? null;
  }

  function findChartOwnerRoot(ownerId) {
    if (typeof document === "undefined" || !ownerId) return null;
    return [...document.querySelectorAll("[data-chart-owner-id]")]
      .find((element) => element.dataset.chartOwnerId === ownerId) ?? null;
  }

  function cancelQuickChartEditRestoration() {
    if (typeof window === "undefined" || !quickChartRestorationFrameRef.current) return;
    window.cancelAnimationFrame(quickChartRestorationFrameRef.current);
    quickChartRestorationFrameRef.current = 0;
  }

  function releaseCleanQuickChartEditSession() {
    if (
      chartEditSession?.activeSurface !== "quick"
      || hasRetainableChartEditWork(chartEditSession)
    ) return false;
    cancelQuickChartEditRestoration();
    setChartEditSession(null);
    setChartEditorPlacementId(null);
    setChartEditorVisible(false);
    setChartEditBaseline(null);
    setChartEditorDirty(false);
    return true;
  }

  function restoreQuickChartEditSession(restoration, placementId) {
    if (!restoration || typeof window === "undefined") return;
    cancelQuickChartEditRestoration();
    let attempts = 0;
    const restore = () => {
      attempts += 1;
      const root = findQuickChartEditRoot(placementId);
      const orbit = root?.closest(".unit-orbit");
      const scroller = root?.closest(".unit-orbit-scroll");
      if (root && orbit && !orbit.hidden && scroller && root.contains(document.activeElement)) {
        scroller.scrollTop = Number.isFinite(restoration.scrollTop)
          ? restoration.scrollTop
          : 0;
        const focusTarget = restoration.focusId
          ? document.getElementById(restoration.focusId)
          : null;
        if (focusTarget && root.contains(focusTarget)) {
          focusTarget.focus({ preventScroll: true });
        }
        quickChartRestorationFrameRef.current = 0;
        return;
      }
      if (attempts >= 12) {
        quickChartRestorationFrameRef.current = 0;
        return;
      }
      quickChartRestorationFrameRef.current = window.requestAnimationFrame(restore);
    };
    quickChartRestorationFrameRef.current = window.requestAnimationFrame(restore);
  }

  function changeQuickChartDraft(draft) {
    setChartEditSession((current) => current
      ? reduceChartEditSession(current, {
          type: "CHANGE",
          surface: "quick",
          draft,
        })
      : current);
  }

  function changeStaticQuickDraft(draft) {
    setStaticContentDraft(draft);
    setStaticContentDirty(isStaticContentDraftDirty(draft));
  }

  function resetStaticQuickDraft() {
    setStaticContentDraft((current) => {
      if (!current) return current;
      const reset = reduceStaticContentDraft(current, { type: "reset" });
      setStaticContentDirty(false);
      return reset;
    });
  }

  function openFullStaticContentEditor() {
    if (moderatorOperationGateRef.current.isActive()) return;
    setStaticContentEditorSurface("full");
    setChartEditorVisible(true);
  }

  async function saveStaticQuickDraft() {
    if (
      moderatorOperationGateRef.current.isActive()
      || !staticContentDraft
      || !selectedPlacement
      || !isStaticContentDraftDirty(staticContentDraft)
    ) return;
    const activeDraft = staticContentDraft;
    const subject = activeDraft.panel?.title?.trim() || selectedPlacement.panelId;
    const status = beginContentOperation("static.saved", {
      subject,
      workingLabel: `Saving Dashboard Content “${subject}”`,
      key: "static-content-save",
    });
    try {
      await status.beforeWork();
      await pendingEdits.flush();
      const prepared = prepareStaticPanelTransaction({
        dashboard: dashboardStateRef.current,
        operation: "update",
        panelId: selectedPlacement.panelId,
        panel: activeDraft.panel,
        placement: activeDraft.placement,
        mediaItem: activeDraft.mediaItem,
        assets: activeDraft.assets,
        stagedAssetIds: [],
      });
      await onStaticPanelCommit(prepared, { reportStatus: false });
      setChartEditorVisible(false);
      setChartEditorPlacementId(null);
      setStaticContentDraft(null);
      setStaticContentDirty(false);
      setStaticContentRestoration(null);
      setStaticContentEditorSurface("quick");
      status.succeed();
    } catch (error) {
      status.fail(error);
      throw error;
    }
  }

  const changeFullChartDraft = React.useCallback(({ draft, chronoGroups, placementMove }) => {
    setChartEditSession((current) => current && current.status !== "saving"
      ? reduceChartEditSession(current, {
          type: "CHANGE",
          surface: "full",
          draft,
          chronoGroups,
          placementMove,
        })
      : current);
  }, []);

  const recordFullChartRestoration = React.useCallback((restoration) => {
    setChartEditSession((current) => current?.activeSurface === "full"
      ? reduceChartEditSession(current, {
          type: "OPEN",
          surface: "full",
          restoration,
        })
      : current);
  }, []);

  const recordChartCreateRestoration = React.useCallback((restoration) => {
    setChartCreateOwner((current) => current
      ? { ...current, restoration: structuredClone(restoration) }
      : current);
  }, []);

  function openFullChartEditor() {
    if (moderatorOperationGateRef.current.isActive()) return;
    setChartEditSession((current) => current
      ? reduceChartEditSession(current, {
          type: "OPEN",
          surface: "full",
          restoration: {
            surface: "full",
            focusId: "chart-stage-destination",
            scrollTop: 0,
          },
        })
      : current);
    setChartEditorVisible(false);
  }

  function resetQuickChartDraft() {
    setChartEditSession((current) => current
      ? reduceChartEditSession(current, { type: "RESET" })
      : current);
    reportContentActivity("chart.draft.reset", {
      subject: chartEditSession?.draft?.title ?? chartEditSession?.placementId,
      key: `content:chart.draft:${chartEditSession?.placementId ?? "active"}`,
    });
  }

  function saveChartEditSession(fullValue = null) {
    if (
      moderatorOperationGateRef.current.isActive()
      || typeof onChartSave !== "function"
      || !chartEditSession
    ) return Promise.resolve(null);

    const activeSession = chartEditSession;
    const status = beginContentOperation("chart.saved", {
      subject: activeSession.draft?.title ?? activeSession.placementId,
      workingLabel: `Saving Chart “${activeSession.draft?.title ?? activeSession.placementId}”`,
      key: "chart-save",
    });
    const layoutDraftId = buildLayoutDraftRef.current?.draftId ?? null;
    let preparedRequest = null;
    return performModeratorOperation("save-chart", () => runPrioritizedChartSave({
      status,
      presentationReady: true,
      prepare() {
        const session = fullValue?.chart && activeSession.activeSurface === "full"
          ? reduceChartEditSession(activeSession, {
              type: "CHANGE",
              surface: "full",
              draft: fullValue.chart,
              ...(Object.hasOwn(fullValue, "chronoGroups")
                ? { chronoGroups: fullValue.chronoGroups }
                : {}),
              ...(Object.hasOwn(fullValue, "placementMove")
                ? { placementMove: fullValue.placementMove }
                : {}),
            })
          : activeSession;
        return prepareChartEditSessionSave(session, {
          runtimeArtifact: fullValue?.runtimeArtifact,
        });
      },
      onPrepared(request) {
        preparedRequest = request;
        setChartEditSession(request.session);
      },
      flush: () => pendingEdits.flush(),
      materialize: (request) => materializeChartEditSessionSave(
        request.intent,
        dashboardStateRef.current.chronoGroups ?? [],
      ),
      persist: (payload, options) => onChartSave(payload, options),
      commit({ request, committed }) {
        if (layoutDraftId) {
          setBuildLayoutDraft((current) => (
            current?.draftId === layoutDraftId
              ? rebaseChartPersistenceIntoLayoutDraft({
                  layoutDraft: current,
                  committedDashboard: committed,
                  intent: request.intent,
                })
              : current
          ));
        }
        setChartEditBaseline(null);
        setChartEditSession(null);
        setChartEditorVisible(false);
        setChartEditorPlacementId(null);
        setChartEditorDirty(false);
      },
    }), {
      status,
      onError(error) {
        const placementId = preparedRequest?.intent?.placementId;
        if (!placementId) return;
        setChartEditSession((current) => (
          current?.placementId === placementId
          && current.status === "saving"
            ? reduceChartEditSession(current, {
                type: "PERSISTENCE_FAILED",
                error,
              })
            : current
        ));
      },
    });
  }

  function resumeQuickChartEditSession() {
    if (!chartEditSession) return false;
    const resumed = reduceChartEditSession(chartEditSession, { type: "RESUME" });
    setChartEditSession(resumed);
    setChartEditorVisible(resumed.activeSurface === "quick");
    if (resumed.activeSurface === "quick") {
      restoreQuickChartEditSession(resumed.restoration, resumed.placementId);
    }
    reportContentActivity("chart.draft.resumed", {
      subject: resumed.draft?.title ?? resumed.placementId,
      key: `content:chart.draft:${resumed.placementId}`,
    });
    return true;
  }

  function suspendFullChartEditSession(restoration) {
    if (moderatorOperationGateRef.current.isActive()) return false;
    const next = dismissChartEditSession(chartEditSession, {
      surface: "full",
      restoration: { surface: "full", ...restoration },
    });
    setChartEditSession(next);
    setChartEditorVisible(false);
    if (next === null) {
      setChartEditorPlacementId(null);
      setChartEditBaseline(null);
      setChartEditorDirty(false);
    }
    if (next !== null) reportContentActivity("chart.draft.suspended", {
      subject: next.draft?.title ?? next.placementId,
      key: `content:chart.draft:${next.placementId}`,
    });
    return true;
  }

  function discardChartEditOwner() {
    if (moderatorOperationGateRef.current.isActive()) return false;
    cancelQuickChartEditRestoration();
    setChartEditSession(null);
    setChartEditorVisible(false);
    setChartEditorPlacementId(null);
    setChartEditBaseline(null);
    setChartEditorDirty(false);
    reportContentActivity("chart.draft.discarded", {
      subject: chartEditSession?.draft?.title ?? chartEditSession?.placementId,
      key: `content:chart.draft:${chartEditSession?.placementId ?? "active"}`,
    });
    return true;
  }

  function focusChartEditOwner() {
    if (!chartEditSession?.activeSurface || typeof window === "undefined") return false;
    const ownerId = `chart-edit:${chartEditSession.placementId}`;
    window.requestAnimationFrame(() => {
      const root = findChartOwnerRoot(ownerId)
        ?? findQuickChartEditRoot(chartEditSession.placementId);
      const restored = chartEditSession.restoration?.focusId
        ? document.getElementById(chartEditSession.restoration.focusId)
        : null;
      const surfaceInitial = chartEditSession.activeSurface === "quick"
        ? root?.querySelector("#chart-field-title")
        : root?.querySelector("[data-modal-initial-focus=\"true\"]");
      const target = restored && root?.contains(restored)
        ? restored
        : surfaceInitial ?? root?.querySelector(
            "input:not(:disabled), select:not(:disabled), button:not(:disabled)",
          );
      target?.focus?.({ preventScroll: true });
      root?.scrollIntoView?.({ block: "nearest", behavior: "auto" });
    });
    return true;
  }

  function focusChartCreateOwner() {
    if (!chartCreateOwner || typeof window === "undefined") return false;
    window.requestAnimationFrame(() => {
      const root = findChartOwnerRoot(chartCreateOwner.id);
      const restored = chartCreateOwner.restoration?.focusId
        ? document.getElementById(chartCreateOwner.restoration.focusId)
        : null;
      const target = restored && root?.contains(restored)
        ? restored
        : root?.querySelector("[data-modal-initial-focus=\"true\"], button:not(:disabled)");
      target?.focus?.({ preventScroll: true });
    });
    return true;
  }

  function saveSelectedChartV3(payload) {
    if (moderatorOperationGateRef.current.isActive()) {
      return Promise.reject(new Error("Wait for the current dashboard operation to finish."));
    }
    return runModeratorTransaction({
      flush: () => pendingEdits.flush(),
      commit: () => onChartSave(payload),
      onCommitted: () => {
        setChartEditBaseline(null);
        setChartEditSession(null);
        setChartEditorVisible(false);
        setChartEditorPlacementId(null);
        setChartEditorDirty(false);
      },
    });
  }

  function cancelSelectedPanel() {
    if (moderatorOperationGateRef.current.isActive()) return;
    pendingEdits.cancel();
    if (chartEditBaseline && !selectedPanelIsStatic) {
      onPanelEditCancel(chartEditBaseline);
    }
    setChartEditBaseline(null);
    setChartEditSession(null);
    setChartEditorVisible(false);
    setChartEditorPlacementId(null);
    setChartEditorDirty(false);
    setStaticContentDraft(null);
    setStaticContentDirty(false);
    setStaticContentRestoration(null);
    setStaticContentEditorSurface("quick");
  }

  function dismissSelectedPanel() {
    if (moderatorOperationGateRef.current.isActive()) return;
    if (chartEditSession?.activeSurface === "quick") {
      cancelQuickChartEditRestoration();
      const next = dismissChartEditSession(chartEditSession, {
        surface: "quick",
        restoration: captureQuickChartEditRestoration("quick"),
      });
      setChartEditSession(next);
      setChartEditorVisible(false);
      if (next === null) {
        setChartEditorPlacementId(null);
        setChartEditBaseline(null);
        setChartEditorDirty(false);
      }
      return;
    }
    setChartEditorVisible(false);
  }

  function changePage(pageId, updates) {
    if (moderatorOperationGateRef.current.isActive()) return;
    setPageDrafts((current) => ({
      ...current,
      [pageId]: { ...(current[pageId] ?? pageDraftFromPage(dashboard.pages.find((page) => page.id === pageId))), ...updates },
    }));
    const basePage = pageDrafts[pageId] ?? pageDraftFromPage(dashboard.pages.find((page) => page.id === pageId));
    const nextDraft = { ...basePage, ...updates };
    pendingEdits.schedule(`page:${pageId}`, {
      type: "page",
      pageId,
      updates: nextDraft,
    });
    reportContentActivity("page.updated", {
      subject: dashboard.pages.find((page) => page.id === pageId)?.label ?? pageId,
      key: `content:page:${pageId}:draft`,
    });
  }

  function changeDashboardText(updates) {
    if (moderatorOperationGateRef.current.isActive()) return;
    const nextDraft = { ...dashboardDraft, ...updates };
    setDashboardDraft(nextDraft);
    pendingEdits.schedule("dashboard", {
      type: "dashboard",
      updates: nextDraft,
    });
    reportContentActivity("dashboard.settings.updated", {
      detail: "Dashboard text changed.",
      key: "content:dashboard:settings",
    });
  }

  function commitStructureDraft(value) {
    return runModeratorTransaction({
      flush: () => pendingEdits.flush(),
      commit: () => onStructureChange?.(value),
    });
  }

  function saveSceneDatePosition(sceneId, datePosition) {
    if (moderatorOperationGateRef.current.isActive()) {
      return Promise.reject(new Error("Wait for the current dashboard operation to finish."));
    }
    const scene = dashboardStateRef.current.scenes?.find(({ id }) => id === sceneId);
    const status = beginContentOperation("scene.saved", {
      subject: scene?.name ?? sceneId,
      workingLabel: `Saving Scene “${scene?.name ?? sceneId}”`,
      key: `content:scene:${sceneId}:date-position`,
    });
    return status.beforeWork().then(() => runModeratorTransaction({
      flush: () => pendingEdits.flush(),
      commit: () => onSaveSceneDatePosition?.(sceneId, datePosition),
    })).then((result) => {
      status.succeed();
      return result;
    }, (error) => {
      status.fail(error);
      throw error;
    });
  }

  function changeSectionByIds(pageId, sectionId, updates) {
    if (moderatorOperationGateRef.current.isActive()) return;
    const page = dashboard.pages.find((candidate) => candidate.id === pageId);
    const section = page?.sections?.find((candidate) => candidate.id === sectionId);
    if (!section) return;
    const baseSection = sectionDrafts[section.id] ?? sectionDraftFromSection(section);
    const nextDraft = { ...baseSection, ...updates };
    setSectionDrafts((current) => ({
      ...current,
      [section.id]: nextDraft,
    }));
    pendingEdits.schedule(`section:${pageId}:${section.id}`, {
      type: "section",
      pageId,
      sectionId: section.id,
      updates: nextDraft,
    });
    reportContentActivity("section.updated", {
      subject: section.title ?? section.id,
      key: `content:section:${section.id}:draft`,
    });
  }

  function changeSection(section, updates) {
    changeSectionByIds(activePage.id, section.id, updates);
  }

  function changeGlobalPanelColors(updates) {
    if (moderatorOperationGateRef.current.isActive()) return;
    flushPendingEditsInBackground();
    onDashboardChange({
      globalStyles: {
        ...(dashboard.globalStyles ?? {}),
        panelColors: {
          ...globalPanelColors,
          ...updates,
        },
      },
    });
    reportContentActivity("dashboard.settings.updated", {
      detail: "Panel colors changed.",
      key: "content:dashboard:panel-colors",
    });
  }

  function startSectionAtPanel(section, panel) {
    if (moderatorOperationGateRef.current.isActive()) return;
    const title = window.prompt("Section title", "New section");
    if (!title) {
      return;
    }
    const description = window.prompt("Section subtext", "") ?? "";
    flushPendingEditsInBackground();
    onSectionInsert(activePage.id, section.id, panel.id, {
      id: `${section.id}_${Date.now()}`,
      title,
      description,
    });
    reportContentActivity("section.created", {
      subject: title,
      key: `content:section:${activePage.id}:${title}`,
    });
  }

  function addSection(value) {
    const title = String(value ?? "").trim();
    if (!title || moderatorOperationGateRef.current.isActive() || buildLayoutDraftRef.current?.status === "saving" || !activePage) return false;
    const sectionId = `${activePage.id}_section_${Date.now()}`;
    const current = buildLayoutDraftRef.current ?? createBuildLayoutDraft(dashboardStateRef.current);
    const next = addBuildLayoutSection(
      current,
      activePage.id,
      {
        id: sectionId,
        title,
        description: "New dashboard section.",
        panels: [],
      },
    );
    buildLayoutDraftRef.current = next;
    setBuildLayoutDraft(next);
    setBuildSelection({ kind: "section", pageId: activePage.id, sectionId });
    requestAnimationFrame(() => focusMovedLayoutTarget(sectionId));
    reportContentActivity("section.created", { subject: title, key: `content:section:${sectionId}` });
    return true;
  }

  function removeSectionTitle(section) {
    if (moderatorOperationGateRef.current.isActive()) return;
    flushPendingEditsInBackground();
    onSectionChange(activePage.id, section.id, { title: "", description: "" });
    reportContentActivity("section.updated", {
      subject: section.title ?? section.id,
      detail: "Title and description removed.",
      key: `content:section:${section.id}:draft`,
    });
  }

  function removeActivePage(pageId = activePage?.id) {
    if (moderatorOperationGateRef.current.isActive()) return;
    if ((dashboard.pages ?? []).length <= 1) {
      return;
    }
    const page = dashboard.pages.find(({ id }) => id === pageId);
    if (!page) return;
    clearModeratorError("remove-page");
    setPendingRemovalPageId(pageId);
  }

  function confirmPageRemoval() {
    const pageId = pendingRemovalPageId;
    if (pageId === null) return;
    const activeIndex = dashboard.pages.findIndex(({ id }) => id === pageId);
    const page = dashboard.pages[activeIndex];
    const fallbackPage = dashboard.pages[activeIndex - 1] ?? dashboard.pages[activeIndex + 1] ?? dashboard.pages[0];
    const status = beginContentOperation("page.deleted", {
      subject: page?.label ?? pageId,
      workingLabel: `Deleting Page “${page?.label ?? pageId}”`,
      key: `content:page:${pageId}:delete`,
    });
    void performModeratorOperation("remove-page", async () => {
      await pendingEdits.flush();
      await onPageRemove(pageId);
      onActivePageChange(fallbackPage.id);
      setBuildSelection({ kind: "page", pageId: fallbackPage.id });
      setPendingRemovalPageId(null);
      status.succeed();
    }, {
      status,
      onError(error) {
        status.fail(error);
      },
    });
  }

  function cancelPageRemoval() {
    if (moderatorOperationGateRef.current.isActive()) return;
    setPendingRemovalPageId(null);
    clearModeratorError("remove-page");
  }

  function openPanelEditor(panelId) {
    const selection = selectionForPlacement(dashboard, panelId);
    if (selection) void requestBuildSelection(selection, { intent: "activate" });
  }

  function activateBuildSelectionImmediately(selection, intent) {
    setBuildSelection(selection);
    if (selection.kind !== "chart" || intent !== "activate") {
      setChartEditorVisible(false);
      setChartEditorPlacementId(null);
      setChartEditBaseline(null);
      setChartEditorDirty(false);
      setChartEditSession(null);
      return;
    }
    const currentDashboard = buildLayoutDraftRef.current?.value ?? dashboardStateRef.current;
    const placement = findPanelPlacement(currentDashboard, selection.placementId);
    const chart = placement?.chart ?? null;
    const staticChart = chart
      ? getChartSchema(chart.typeId).authoringWorkflow === "static"
      : false;
    setChartEditBaseline(null);
    setChartEditorPlacementId(selection.placementId);
    setChartEditorVisible(true);
    setChartEditorDirty(false);
    setStaticContentEditorSurface("quick");
    setStaticContentDraft(staticChart && chart ? createStaticContentDraft({
      mode: "edit",
      destination: staticDestinationForPlacement(currentDashboard, selection.placementId),
      panel: chart,
      placement: currentDashboard.dataSources?.[chart.sourceId],
      mediaItem: currentDashboard.contentLibrary?.mediaItems?.[
        currentDashboard.dataSources?.[chart.sourceId]?.mediaId
      ],
      assets: currentDashboard.assets ?? {},
    }) : null);
    setStaticContentDirty(false);
    setStaticContentRestoration(null);
    setChartEditSession(chart && !staticChart
      ? createChartEditSession({
          placementId: selection.placementId,
          chart,
          chronoGroups: currentDashboard.chronoGroups ?? [],
          activeSurface: "quick",
          restoration: captureQuickChartEditRestoration("quick"),
        })
      : null);
  }

  function requestBuildSelection(nextSelection, { intent = "activate", discardStaticDraft = false } = {}) {
    if (
      moderatorOperationGateRef.current.isActive()
      || !isValidBuildSelection(dashboardStateRef.current, nextSelection)
    ) return Promise.resolve(false);
    const reactivatingCurrentChart = nextSelection.kind === "chart"
      && nextSelection.placementId === chartEditorPlacementId
      && intent === "activate";
    if (selectedEditorDirty && !reactivatingCurrentChart && selectedPanelIsStatic && !discardStaticDraft) {
      setPendingStaticBuildSelection({ selection: nextSelection, intent });
      setChartEditorVisible(false);
      return Promise.resolve(false);
    }
    if (quickChartEditDirty && !reactivatingCurrentChart) {
      setBuildSelectionError("Resume or reset the suspended chart changes before changing selection.");
      return Promise.resolve(false);
    }
    if (chartEditorDirty && !reactivatingCurrentChart) {
      setBuildSelectionError("Finish or cancel the open chart editor before changing Page.");
      return Promise.resolve(false);
    }
    setBuildSelectionError("");
    if (reactivatingCurrentChart) {
      if (!resumeQuickChartEditSession()) setChartEditorVisible(true);
      return Promise.resolve(true);
    }
    if (chartEditorPlacementId) {
      setChartEditorVisible(false);
      setChartEditorPlacementId(null);
      setChartEditBaseline(null);
      setChartEditorDirty(false);
      setChartEditSession(null);
      setStaticContentDraft(null);
      setStaticContentDirty(false);
    }
    if (nextSelection.kind === "chronoGroup") {
      setBuildSelection(nextSelection);
      setChartEditorVisible(false);
      setChartEditorPlacementId(null);
      setFocusInspectorLabelKey((current) => current + 1);
      return Promise.resolve(true);
    }
    const requestId = ++buildRevealRequestIdRef.current;
    for (const [id, resolve] of buildRevealResolversRef.current) {
      if (id !== requestId) resolve(false);
    }
    buildRevealResolversRef.current.clear();
    const result = new Promise((resolve) => {
      buildRevealResolversRef.current.set(requestId, resolve);
    });
    activateBuildSelectionImmediately(nextSelection, intent);
    setPendingBuildSelection({ requestId, selection: nextSelection, intent });
    if (nextSelection.pageId && nextSelection.pageId !== activePage?.id) {
      void onActivePageChange(nextSelection.pageId);
    }
    return result;
  }
  requestBuildSelectionRef.current = requestBuildSelection;
  const activateBuildCanvasSelection = React.useCallback((nextSelection) => {
    const activate = buildWorkspaceSelectionRef.current ?? requestBuildSelectionRef.current;
    return activate?.(nextSelection, { intent: "activate" }) ?? Promise.resolve(false);
  }, []);
  const navigateBuildCanvasPage = React.useCallback((pageId) => {
    void activateBuildCanvasSelection({ kind: "page", pageId });
  }, [activateBuildCanvasSelection]);

  function completeBuildReveal(requestId) {
    if (pendingBuildSelection?.requestId !== requestId) return;
    buildRevealResolversRef.current.get(requestId)?.(true);
    buildRevealResolversRef.current.delete(requestId);
    setPendingBuildSelection(null);
    setBuildRevealRequest(null);
  }

  async function renameBuildSelection(selection, value) {
    const title = value.trim();
    const currentDashboard = buildLayoutDraftRef.current?.value ?? dashboardStateRef.current;
    if (!title || buildLayoutDraftRef.current?.status === "saving" || !isValidBuildSelection(currentDashboard, selection)) return false;
    const current = buildLayoutDraftRef.current ?? createBuildLayoutDraft(dashboardStateRef.current);
    const next = selection.kind === "page"
      ? renameBuildLayoutPage(current, selection.pageId, title)
      : selection.kind === "section"
        ? renameBuildLayoutSection(current, selection.pageId, selection.sectionId, title)
        : selection.kind === "chart"
          ? renameBuildLayoutPanel(current, selection.placementId, title)
          : current;
    if (next === current || next.status !== "dirty") return false;
    buildLayoutDraftRef.current = next;
    setBuildLayoutDraft(next);
    setInlineRenameDirty(false);
    onInlineRenameDirtyChange?.(false);
    reportContentActivity(selection.kind === "page"
      ? "page.updated"
      : selection.kind === "section" ? "section.updated" : "layout.draft.updated", {
      subject: title,
      key: `content:${selection.kind}:${selection.pageId ?? selection.placementId}:${selection.sectionId ?? "title"}`,
    });
    return true;
  }

  function openChartWizard(sectionId) {
    if (moderatorOperationGateRef.current.isActive()) return;
    if (resumeSuspendedChartWizardWithTakeover()) return;
    if (chartAuthoringActive) return;
    const section = sectionId
      ? activePage?.sections?.find(({ id }) => id === sectionId)
      : buildSelection?.kind === "section"
      ? activePage?.sections?.find(({ id }) => id === buildSelection.sectionId)
      : activePage?.sections?.[0];
    if (!activePage || !section) return;
    releaseCleanQuickChartEditSession();
    setChartCreateOwner(null);
    setChartWizardTarget({ pageId: activePage.id, sectionId: section.id });
    setChartWizardSuspended(false);
    reportContentActivity("chart.draft.created", {
      subject: section.title ?? section.id,
      detail: "Authoring started.",
      key: "content:chart.draft:create",
    });
  }

  function discardStaticDraftAndSelect() {
    const pending = pendingStaticBuildSelection;
    if (!pending) return;
    cleanupImageDraftAssets(staticContentDraft, dashboardStateRef.current);
    setPendingStaticBuildSelection(null);
    setStaticContentDraft(null);
    setStaticContentDirty(false);
    reportContentActivity("static.draft.discarded", {
      subject: staticContentDraft?.title ?? staticContentDraft?.mode,
      key: "content:static.draft:active",
    });
    void requestBuildSelection(pending.selection, { ...pending, discardStaticDraft: true });
  }

  function openStaticContentWizard(sectionId) {
    if (moderatorOperationGateRef.current.isActive() || chartAuthoringActive) return;
    if (staticContentOwner?.activity === "suspended") {
      resumeStaticContentWork();
      return;
    }
    const section = sectionId
      ? activePage?.sections?.find(({ id }) => id === sectionId)
      : buildSelection?.kind === "section"
      ? activePage?.sections?.find(({ id }) => id === buildSelection.sectionId)
      : activePage?.sections?.[0];
    if (!activePage || !section) return;
    releaseCleanQuickChartEditSession();
    staticWizardInvokerRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    setStaticContentRestoration(null);
    setStaticWizardTarget({ pageId: activePage.id, sectionId: section.id });
    reportContentActivity("static.draft.created", {
      subject: section.title ?? section.id,
      detail: "Authoring started.",
      key: "content:static.draft:active",
    });
  }

  function restoreStaticWizardFocus() {
    const invoker = staticWizardInvokerRef.current;
    staticWizardInvokerRef.current = null;
    window.requestAnimationFrame(() => {
      const target = invoker?.isConnected
        ? invoker
        : document.getElementById("add-static-content-command");
      target?.focus({ preventScroll: true });
    });
  }

  function recoverEmptySectionInBuild(sectionId) {
    if (moderatorOperationGateRef.current.isActive() || !activePage) return;
    const section = activePage.sections?.find(({ id }) => id === sectionId);
    if (!section) return;
    setBuildSelection({
      kind: "section",
      pageId: activePage.id,
      sectionId,
    });
    setChartWizardTarget({ pageId: activePage.id, sectionId });
    void onModeRequest("build");
  }

  function saveEditMode() {
    if (moderatorOperationGateRef.current.isActive()) return;
    const status = beginOperation({
      key: "finish-build",
      label: "Finishing Build",
      blocking: true,
      priority: true,
    });
    void performModeratorOperation("save-session", async () => {
      const outcome = await completeFinishBuildTransition({
        requestMode: onModeRequest,
        status,
      });
      setChartEditBaseline(null);
      return outcome;
    }, { status });
  }

  function changeIconAccent(nextAccent) {
    if (moderatorOperationGateRef.current.isActive()) return;
    flushPendingEditsInBackground();
    onDashboardChange({
      globalStyles: {
        ...(dashboard.globalStyles ?? {}),
        iconAccent: nextAccent,
      },
    });
    reportContentActivity("dashboard.settings.updated", {
      detail: "Icon accent changed.",
      key: "content:dashboard:icon-accent",
    });
  }

  function resetEditMode() {
    if (moderatorOperationGateRef.current.isActive()) return;
    const status = beginContentOperation("dashboard.reset", {
      workingLabel: "Discarding dashboard changes",
      key: "content:dashboard:reset",
      intent: "warning",
    });
    void performModeratorOperation("reset-session", async () => {
      const cancelled = pendingEdits.takePending();
      const retryDrafts = {
        dashboard: structuredClone(dashboardDraft),
        pages: structuredClone(pageDrafts),
        sections: structuredClone(sectionDrafts),
      };
      try {
        const resetDashboard = await onResetEditSession();
        pendingEdits.cancel();
        setDashboardDraft(dashboardTextDraftFromDashboard(resetDashboard ?? dashboard));
        setPageDrafts({});
        setSectionDrafts({});
        setBuildLayoutDraft(null);
        setChartEditBaseline(null);
        setChartEditSession(null);
        setChartEditorPlacementId(null);
        setChartEditorVisible(false);
        setChartEditorDirty(false);
        chartDraftSessionStore.clear(chartDraftSessionKey);
        setChartWizardTarget(null);
        setChartWizardDirty(false);
        setChartCreateOwner(null);
        setChartWizardSuspended(false);
        setChartWizardSuspendedTarget(null);
        setChartDraftSessionRevision((current) => current + 1);
        setLocalAuthoringDrafts({});
        setBuildTreeResetGeneration((current) => current + 1);
        setResetEditSessionConfirmation(false);
        status.succeed();
      } catch (error) {
        pendingEdits.restore(cancelled);
        scheduleRendererDrafts(retryDrafts);
        status.fail(error);
        throw error;
      }
    }, { status });
  }

  function confirmDeleteDashboardContent() {
    if (moderatorOperationGateRef.current.isActive()) return;
    const cancelled = pendingEdits.takePending();
    void performModeratorOperation("delete-dashboard-content", async () => {
      try {
        if (typeof onDeleteDashboardContent !== "function") {
          throw new Error("Dashboard content deletion is unavailable.");
        }
        const blankDashboard = await onDeleteDashboardContent();
        pendingEdits.cancel();
        for (const resolve of buildRevealResolversRef.current.values()) resolve(false);
        buildRevealResolversRef.current.clear();
        buildRevealRequestIdRef.current += 1;
        appliedBuildRevealIdRef.current = 0;
        setDashboardDraft(dashboardTextDraftFromDashboard(blankDashboard));
        setPageDrafts({});
        setSectionDrafts({});
        setBuildLayoutDraft(null);
        setSelectedPanelId(null);
        setChartEditorPlacementId(null);
        setChartEditorVisible(false);
        setChartEditBaseline(null);
        setChartEditorDirty(false);
        setChartEditSession(null);
        setChartWizardTarget(null);
        setChartWizardDirty(false);
        setChartCreateOwner(null);
        chartDraftSessionStore.clear(chartDraftSessionKey);
        setChartWizardSuspended(false);
        setChartWizardSuspendedTarget(null);
        setChartDraftSessionRevision((current) => current + 1);
        setLocalAuthoringDrafts({});
        setInlineRenameDirty(false);
        resetExternalDirty();
        onInlineRenameDirtyChange?.(false);
        setBuildSelection(null);
        setPendingBuildSelection(null);
        setBuildRevealRequest(null);
        setBuildSelectionError("");
        setPendingRemovalPanelId(null);
        setPendingRemovalPageId(null);
        setPackageExportIssues([]);
        setMultiSelectMode(false);
        setMultiPanelIds([]);
        setDeleteContentConfirmation(false);
        setBuildTreeResetGeneration((current) => current + 1);
      } catch (error) {
        pendingEdits.restore(cancelled);
        throw error;
      }
    });
  }

  function scheduleRendererDrafts(drafts) {
    pendingEdits.schedule("dashboard", {
      type: "dashboard",
      updates: drafts.dashboard,
    });
    for (const [pageId, updates] of Object.entries(drafts.pages)) {
      pendingEdits.schedule(`page:${pageId}`, {
        type: "page",
        pageId,
        updates,
      });
    }
    for (const page of dashboard.pages ?? []) {
      for (const section of page.sections ?? []) {
        const updates = drafts.sections[section.id];
        if (!updates) continue;
        pendingEdits.schedule(`section:${page.id}:${section.id}`, {
          type: "section",
          pageId: page.id,
          sectionId: section.id,
          updates,
        });
      }
    }
  }

  function dashboardWithCurrentDrafts(panelOverride = null) {
    const { loadedData: _runtimeData, ...portableDashboard } = dashboard;
    const nextDashboard = structuredClone(portableDashboard);
    Object.assign(nextDashboard, dashboardDraft);

    nextDashboard.pages = (nextDashboard.pages ?? []).map((page) => {
      const pageDraft = pageDrafts[page.id];
      const nextPage = pageDraft ? { ...page, ...pageDraft } : page;
      return {
        ...nextPage,
        sections: (nextPage.sections ?? []).map((section) => {
          const sectionDraft = sectionDrafts[section.id];
          const nextSection = sectionDraft ? { ...section, ...sectionDraft } : section;
          return {
            ...nextSection,
            panels: (nextSection.panels ?? []).map((panel) =>
              panelOverride && panel.id === panelOverride.id ? panelOverride : panel,
            ),
          };
        }),
      };
    });

    return nextDashboard;
  }

  const runtimeMediaItems = React.useMemo(() => overlayRuntimeContentHealth(
    workingDashboard.contentLibrary?.mediaItems,
    workingDashboard.runtimeContentHealth?.mediaItems,
  ), [workingDashboard.contentLibrary?.mediaItems, workingDashboard.runtimeContentHealth?.mediaItems]);
  const runtimeContentLibrary = React.useMemo(() => ({
    ...(workingDashboard.contentLibrary ?? {}),
    mediaItems: runtimeMediaItems,
    sourceEntries: overlayRuntimeContentHealth(
      workingDashboard.contentLibrary?.sourceEntries,
      workingDashboard.runtimeContentHealth?.sourceEntries,
    ),
  }), [workingDashboard.contentLibrary, workingDashboard.runtimeContentHealth?.sourceEntries, runtimeMediaItems]);
  const openPanelEditorRef = React.useRef(openPanelEditor);
  openPanelEditorRef.current = openPanelEditor;
  const requestContentRepair = React.useCallback(
    ({ panelId }) => panelId && openPanelEditorRef.current?.(panelId),
    [],
  );
  const contentRenderContext = React.useMemo(() => ({
    mediaItems: runtimeMediaItems,
    assets: workingDashboard.assets ?? {},
    resolveAsset: resolveBrowserAuthoredAsset,
    requestRepair: requestContentRepair,
  }), [requestContentRepair, runtimeMediaItems, workingDashboard.assets]);
  const navigateContentDependency = React.useCallback((use) => {
    const selection = selectionForPlacement(dashboardStateRef.current, use.panelId);
    const activate = buildWorkspaceSelectionRef.current ?? requestBuildSelectionRef.current;
    if (selection) void activate?.(selection, { intent: "activate" });
  }, []);
  const deleteManagedContent = React.useCallback(async (plan) => {
      await pendingEdits.flush();
      return commitContentDeletion(plan, createContentDeletionAdapters({
        getDashboard: () => dashboardStateRef.current,
        commitDashboard: async (candidate, context) => onDashboardChange(candidate, context),
        assetStore: browserAuthoredAssetStore,
      }));
  }, [onDashboardChange, pendingEdits]);
  const managerDashboard = React.useMemo(() => editMode ? projectContentManagerDependencies({
    dashboard: { ...workingDashboard, contentLibrary: runtimeContentLibrary },
    activeRetainers: contentDraftRetainers,
    onNavigate: navigateContentDependency,
    onDelete: deleteManagedContent,
  }) : workingDashboard, [
    contentDraftRetainers,
    deleteManagedContent,
    editMode,
    navigateContentDependency,
    runtimeContentLibrary,
    workingDashboard,
  ]);
  const dashboardCanvasActions = useDashboardCanvasActions({
    select: activateBuildCanvasSelection,
    removePanel,
    requestPanelMove,
    panelDragStart: handlePanelDragStart,
    panelDragOver: handlePanelDragOver,
    panelDrop: handlePanelDrop,
    panelDragEnd: clearDragState,
    reorderSection: reorderBuildSection,
    structureCommand: applyBuildStructureCommand,
    addPage: addBuildPage,
    addSection,
    addChart: openChartWizard,
    addStaticContent: openStaticContentWizard,
  });

  if (mode === "present") {
    return (
      <PresentWorkspace
        dashboard={dashboard}
        contentRenderContext={contentRenderContext}
        activePageId={activePage?.id}
        onActivePageChange={onActivePageChange}
        onModeRequest={onModeRequest}
        onOpenDashboardLook={onOpenDashboardLook}
        runtime={presentationRuntime}
        compositionReady={presentationCompositionReady}
        presentableItemIndex={presentableItemIndex}
        accessibilityEnabled={accessibilityEnabled}
        themeProjection={themeProjection}
      />
    );
  }

  const buildControlsDisabled = moderatorMutationLocked || chartAuthoringActive;
  const selectedChartEditor = editMode && selectedPanel ? (selectedPanelIsStatic && staticContentEditorSurface === "quick" ? (
    <StaticContentQuickEditor
      draft={staticContentDraft ?? createStaticContentDraft({
        mode: "edit",
        destination: staticDestinationForPlacement(workingDashboard, selectedPlacement.panelId),
        panel: selectedPanel,
        placement: workingDashboard.dataSources?.[selectedPanel.sourceId],
        mediaItem: workingDashboard.contentLibrary?.mediaItems?.[
          workingDashboard.dataSources?.[selectedPanel.sourceId]?.mediaId
        ],
        assets: workingDashboard.assets ?? {},
      })}
      disabled={moderatorMutationLocked}
      onDraftChange={changeStaticQuickDraft}
      onSave={saveStaticQuickDraft}
      onReset={resetStaticQuickDraft}
      onClose={dismissSelectedPanel}
      onOpenFullEditor={openFullStaticContentEditor}
    />
  ) : selectedPanelIsStatic ? (
    <StaticContentEditor
      dashboard={workingDashboard}
      contentDraftCoordinator={contentDraftCoordinator}
      contentRenderContext={contentRenderContext}
      onContentDraftStage={onContentDraftStage}
      onContentDraftCommit={onContentDraftCommit}
      onContentDraftDiscard={onContentDraftDiscard}
      destination={staticDestinationForPlacement(workingDashboard, selectedPlacement.panelId)}
      panel={selectedPanel}
      placement={workingDashboard.dataSources?.[selectedPanel.sourceId]}
      mediaItem={workingDashboard.contentLibrary?.mediaItems?.[
        workingDashboard.dataSources?.[selectedPanel.sourceId]?.mediaId
      ]}
      assets={workingDashboard.assets ?? {}}
      initialDraft={staticContentDraft}
      restoration={staticContentRestoration}
      disabled={moderatorMutationLocked}
      onDraftChange={setStaticContentDraft}
      onDirtyChange={setStaticContentDirty}
      onRestorationChange={setStaticContentRestoration}
      onSave={async ({ panel, placement, mediaItem, assets, stagedAssetIds }) => {
        const subject = panel?.title?.trim() || selectedPlacement.panelId;
        const status = beginContentOperation("static.saved", {
          subject,
          workingLabel: `Saving Dashboard Content “${subject}”`,
          key: "static-content-save",
        });
        try {
          await status.beforeWork();
          await pendingEdits.flush();
          const prepared = prepareStaticPanelTransaction({
            dashboard: dashboardStateRef.current,
            operation: "update",
            panelId: selectedPlacement.panelId,
            panel,
            placement,
            mediaItem,
            assets,
            stagedAssetIds,
          });
          await onStaticPanelCommit(prepared, { reportStatus: false });
          setChartEditorVisible(false);
          setChartEditorPlacementId(null);
          setStaticContentDraft(null);
          setStaticContentDirty(false);
          setStaticContentRestoration(null);
          setStaticContentEditorSurface("quick");
          status.succeed();
        } catch (error) {
          status.fail(error);
          throw error;
        }
      }}
      onCancel={cancelSelectedPanel}
      onSuspend={suspendStaticContentOwner}
    />
  ) : (
    <ChartQuickEditor
      session={chartEditSession}
      profile={workingDashboard.datasetProfiles?.[chartEditSession.draft.sourceId]}
      disabled={moderatorMutationLocked}
      onDraftChange={changeQuickChartDraft}
      onSave={typeof onChartSave === "function" ? saveChartEditSession : undefined}
      onReset={resetQuickChartDraft}
      onClose={dismissSelectedPanel}
      onOpenFullEditor={openFullChartEditor}
      onRemove={typeof onPanelRemove === "function"
        ? () => removePanel(chartEditSession.placementId)
        : undefined}
    />
  )) : null;
  const buildWorkspace = editMode ? (
    <BuildWorkspace
      key={buildTreeResetGeneration}
      themeProjection={themeProjection}
      dashboard={managerDashboard}
      contentDraftCoordinator={contentDraftCoordinator}
      onContentDraftStage={onContentDraftStage}
      onContentDraftCommit={onContentDraftCommit}
      onContentDraftDiscard={onContentDraftDiscard}
      onReportContentActivity={reportContentActivity}
      onBeginContentOperation={beginContentOperation}
      activePage={activePage}
      pageType={landingActive ? "landing" : "analytical"}
      buildPanelOpen={buildPanelOpen}
      onCloseDashboardMap={onCloseBuildPanel}
      selection={buildSelection}
      dashboardDraft={dashboardDraft}
      pageDrafts={pageDrafts}
      sectionDrafts={sectionDrafts}
      chartEditor={selectedPanelIsStatic && staticContentEditorSurface === "full"
        ? null
        : selectedChartEditor}
      chartEditorPlacementId={chartEditorPlacementId}
      chartEditorOpen={selectedPanelIsStatic
        ? staticContentEditorSurface === "quick" && chartEditorVisible
        : chartEditSession?.activeSurface === "quick"}
      onCloseChartEditor={dismissSelectedPanel}
      onResumeChartEditor={() => {
        if (!resumeQuickChartEditSession()) {
          setChartEditorVisible(Boolean(chartEditorPlacementId));
        }
      }}
      chartDraftOpen={chartAuthoringActive}
      chartDraftDirty={selectedEditorDirty}
      mutationsDisabled={layoutMutationLocked}
      accessibilityEnabled={accessibilityEnabled}
      deviceLayout={deviceLayout}
      focusLabelKey={focusInspectorLabelKey}
      operationError={operationError || buildSelectionError || moderatorOperation.error}
      geoDataSources={geoDataSources}
      onActivePageChange={onActivePageChange}
      onActivate={requestBuildSelection}
      onRename={renameBuildSelection}
      onInlineRenameDirtyChange={handleInlineRenameDirtyChange}
      onLayoutMove={stageBuildLayoutMove}
      revealRequest={buildRevealRequest}
      treeResetGeneration={buildTreeResetGeneration}
      onRevealComplete={completeBuildReveal}
      onDashboardChange={changeDashboardText}
      onStructureCommit={commitStructureDraft}
      onPageChange={changePage}
      onPageRemove={removeActivePage}
      onSectionChange={changeSection}
      onPageReorder={reorderBuildPage}
      onSectionReorder={reorderBuildSection}
      onAddSection={addSection}
      onAddChart={openChartWizard}
      onAddStaticContent={openStaticContentWizard}
      layoutDraft={buildLayoutDraft ? {
        draftId: buildLayoutDraft.draftId,
        kind: "layout",
        targetId: buildLayoutDraft.targetId,
        status: buildLayoutDraft.status,
        activity: buildLayoutDraft.activity ?? (buildPanelOpen ? "active" : "suspended"),
        surface: "dashboard-map",
        error: buildLayoutDraft.error,
        restoration: null,
        resolution: null,
      } : null}
      chartSlotDraft={chartOwnerSlot}
      chartOwners={chartOwnerSlots}
      owners={staticContentOwner ? [staticContentOwner] : []}
      authoredDirtyState={authoredDirtyState}
      pendingWorkResumeActions={{
        structure: () => onOpenBuildPanel?.(),
        chartEditor: () => {
          if (!resumeQuickChartEditSession()) {
            setChartEditorVisible(Boolean(chartEditorPlacementId));
          }
        },
        chartWizard: resumeChartWizardWork,
        staticContent: resumeStaticContentWork,
        configuration: () => onOpenBuildPanel?.(),
        inlineRename: resumeInlineRenameWork,
        scenario: () => onResolveScenarioDraft?.(),
        dashboardMetadata: () => onOpenBuildPanel?.(),
      }}
      pendingWorkOwnerActions={{
        ...(buildLayoutDraft ? {
          [buildLayoutDraft.draftId]: {
            focus: focusLayoutOwner,
            resume: resumeLayoutOwner,
            save: saveBuildLayoutChanges,
            discard: discardBuildLayoutChanges,
          },
        } : {}),
        ...(chartEditOwner ? {
          [chartEditOwner.id]: {
            focus: focusChartEditOwner,
            resume: resumeQuickChartEditSession,
            save: chartEditOwner.operation === "remove"
              ? retryChartEditOperation
              : saveChartEditSession,
            discard: discardChartEditOwner,
          },
        } : {}),
        ...(chartCreateOwner ? {
          [chartCreateOwner.id]: {
            focus: focusChartCreateOwner,
            resume: resumeChartWizardWork,
          },
        } : {}),
        ...(staticContentOwner ? {
          [staticContentOwner.draftId]: {
            focus: restoreStaticContentOwnerFocus,
            resume: resumeStaticContentWork,
            discard: discardStaticContentOwner,
          },
        } : {}),
      }}
      onSaveLayout={saveBuildLayoutChanges}
      onDiscardLayout={discardBuildLayoutChanges}
      onFinish={saveEditMode}
      onReset={requestResetEditSession}
      onLocalDraftsChange={handleLocalDraftsChange}
      onDeviceLayoutChange={onDeviceLayoutChange}
      onDisplayAction={onDisplayAction}
      selectionControllerRef={buildWorkspaceSelectionRef}
      exportResolutionControllerRef={buildWorkspaceExportResolutionRef}
    />
  ) : null;
  return (
    <>
      <DashboardModeWorkspace
        mode={editMode ? "build" : "view"}
        activePage={renderingActivePage}
        pageType={landingActive ? "landing" : "analytical"}
        dashboard={renderingDashboard}
        contentDraftCoordinator={contentDraftCoordinator}
        onContentDraftStage={onContentDraftStage}
        onContentDraftCommit={onContentDraftCommit}
        onContentDraftDiscard={onContentDraftDiscard}
        contentRenderContext={contentRenderContext}
        buildPanelOpen={buildPanelOpen}
        buildStaticAuthoringOpen={false}
        buildState={editMode ? {
          selection: buildSelection,
           disabled: layoutMutationLocked || buildDraftLocked,
           sectionDrafts,
           draggingPanelId,
           dragOverPanelId,
           actions: dashboardCanvasActions,
        } : null}
        buildWorkspace={buildWorkspace}
        displayState={displayState}
        iconLanguageStyles={iconLanguageStyles}
        geoDataSources={geoDataSources}
        multiSelectMode={multiSelectMode}
        multiPanelIds={multiPanelIds}
        multiSelectNotice={multiSelectNotice}
        onActivePageChange={editMode
          ? navigateBuildCanvasPage
          : navigateToPage}
        onAddPanelToSection={viewOnly ? undefined : recoverEmptySectionInBuild}
        onDisplayAction={onDisplayAction}
        onToggleMultiPanel={toggleMultiPanel}
        onStartMultiFullscreenSelection={startMultiFullscreenSelection}
        onOpenMultiFullscreen={openMultiFullscreen}
        onCancelMultiSelection={cancelMultiSelection}
      />
      {editMode && selectedPanelIsStatic && staticContentEditorSurface === "full" && chartEditorVisible
        ? selectedChartEditor
        : null}
      <BuildMoveDialog
        open={Boolean(moveDialogRequest)}
        dashboard={workingDashboard}
        source={moveDialogRequest?.source}
        sourceLabel={moveDialogRequest?.label}
        destinationPageId={moveDialogRequest?.source?.pageId}
        invoker={moveDialogRequest?.invoker}
        onCancel={() => setMoveDialogRequest(null)}
        onMove={(move) => {
          const invoker = moveDialogRequest?.invoker ?? null;
          setMoveDialogRequest(null);
          stageBuildLayoutMove(move, invoker);
        }}
      />
      <BuildMoveConfirmationDialog
        analysis={moveConfirmation?.analysis}
        invoker={moveConfirmation?.invoker}
        onCancel={() => setMoveConfirmation(null)}
        onConfirm={confirmBuildLayoutMove}
      />
      {editMode && <>
      <ChartWizardV3
        key={`chart-create:${chartDraftSessionKey}:${chartWizardSessionEpoch}`}
        open={Boolean(chartWizardTarget)}
        contentDraftCoordinator={contentDraftCoordinator}
        destination={chartWizardTarget}
        dashboard={workingDashboard}
        onContentDraftStage={onContentDraftStage}
        onContentDraftCommit={onContentDraftCommit}
        onContentDraftDiscard={onContentDraftDiscard}
        initialDraftState={chartDraftSessionStore.get(chartDraftSessionKey)}
        suspendControllerRef={chartWizardControllerRef}
        disabled={layoutMutationLocked}
        dataSources={workingDashboard.dataSources}
        loadedData={workingDashboard.loadedData}
        datasetProfiles={workingDashboard.datasetProfiles ?? {}}
        geoDataSources={geoDataSources}
        chronoGroups={workingDashboard.chronoGroups ?? []}
        existingCharts={configuredCharts(workingDashboard)}
        onDirtyChange={setChartWizardDirty}
        onDraftStateChange={handleChartDraftStateChange}
        onOwnerChange={handleChartCreateOwnerChange}
        onRestorationChange={recordChartCreateRestoration}
        onSuspendedChange={(suspended, restoration) => {
          setChartWizardSuspended(suspended);
          setChartWizardSuspendedTarget(suspended ? chartWizardTarget : null);
          if (suspended) {
            setChartCreateOwner((current) => current ? {
              ...current,
              activity: "suspended",
              restoration,
              activation: "resume",
            } : current);
            reportContentActivity("chart.draft.suspended", {
              subject: chartWizardTarget?.sectionId,
              key: "content:chart.draft:create",
            });
          }
        }}
        onClose={() => {
          if (!moderatorOperationGateRef.current.isActive()) setChartWizardTarget(null);
        }}
        onCreate={async (payload, reviewedPlacement) => {
          if (moderatorOperationGateRef.current.isActive()) {
            throw new Error("Wait for the current dashboard operation to finish.");
          }
          const subject = payload?.chart?.title ?? payload?.chart?.id ?? "New chart";
          const status = beginContentOperation("chart.created", {
            subject,
            workingLabel: `Creating Chart “${subject}”`,
            key: "chart-create",
          });
          try {
            await status.beforeWork();
            await pendingEdits.flush();
            const activeLayoutDraft = buildLayoutDraftRef.current;
            const layoutDraftId = activeLayoutDraft?.draftId ?? null;
            const workingTarget = reviewedPlacement ?? chartWizardTarget;
            const persistenceTarget = activeLayoutDraft
              ? resolveChartCreationPersistenceTarget(activeLayoutDraft, workingTarget)
              : workingTarget;
            if (!persistenceTarget) {
              throw new Error("Save layout changes before adding a chart to a newly created Section.");
            }
            const committed = await onChartCreate(payload, persistenceTarget, { reportStatus: false });
            if (layoutDraftId) {
              const placementId = createdPlacementIdFromCommittedDashboard(committed, payload?.chart?.id);
              setBuildLayoutDraft((current) => {
                if (current?.draftId !== layoutDraftId || !placementId) return current;
                const rebased = rebaseChartPersistenceIntoLayoutDraft({
                  layoutDraft: current,
                  committedDashboard: committed,
                  intent: { kind: "create", placementId },
                });
                buildLayoutDraftRef.current = rebased;
                return rebased;
              });
            }
            status.succeed();
            return committed;
          } catch (error) {
            status.fail(error);
            throw error;
          }
        }}
        onCommitSuccess={() => {
          const nextSessionEpoch = chartWizardSessionEpochRef.current + 1;
          chartWizardSessionEpochRef.current = nextSessionEpoch;
          chartDraftSessionStore.clear(chartDraftSessionKey);
          setChartDraftSessionRevision((current) => current + 1);
          setChartWizardSessionEpoch(nextSessionEpoch);
          setChartCreateOwner(null);
          setChartWizardDirty(false);
          setChartWizardSuspended(false);
          setChartWizardSuspendedTarget(null);
          setChartWizardTarget(null);
        }}
        onDiscardChanges={() => {
          const nextSessionEpoch = chartWizardSessionEpochRef.current + 1;
          chartWizardSessionEpochRef.current = nextSessionEpoch;
          chartDraftSessionStore.clear(chartDraftSessionKey);
          setChartDraftSessionRevision((current) => current + 1);
          setChartWizardSessionEpoch(nextSessionEpoch);
          setChartCreateOwner(null);
          setChartWizardDirty(false);
          setChartWizardSuspended(false);
          setChartWizardSuspendedTarget(null);
          reportContentActivity("chart.draft.discarded", {
            subject: chartWizardTarget?.sectionId,
            key: "content:chart.draft:create",
          });
        }}
      />
      {chartEditSession && (
        chartEditSession.activeSurface === "full" || chartEditSession.dirtyOrigins.full
      ) && <ChartWizardV3
        key={`chart-edit:${chartEditSession.placementId}`}
        mode="edit"
        open={chartEditSession.activeSurface === "full"}
        editSession={chartEditSession}
        editDirty={isChartEditSessionDirty(chartEditSession)}
        destination={staticDestinationForPlacement(workingDashboard, chartEditSession.placementId)}
        dashboard={workingDashboard}
        disabled={moderatorMutationLocked}
        dataSources={workingDashboard.dataSources}
        loadedData={workingDashboard.loadedData}
        datasetProfiles={workingDashboard.datasetProfiles ?? {}}
        geoDataSources={geoDataSources}
        chronoGroups={chartEditSession.chronoGroups}
        existingCharts={configuredCharts(workingDashboard)}
        onEditDraftChange={changeFullChartDraft}
        onRestorationChange={recordFullChartRestoration}
        onSuspendedChange={(suspended, restoration) => {
          if (suspended) suspendFullChartEditSession(restoration);
        }}
        onClose={() => {}}
        onSaveChanges={saveChartEditSession}
        onDiscardChanges={discardChartEditOwner}
      />}
      {staticWizardTarget && <StaticContentWizard
        open
        contentDraftCoordinator={contentDraftCoordinator}
        contentRenderContext={contentRenderContext}
        dashboard={workingDashboard}
        onContentDraftStage={onContentDraftStage}
        onContentDraftCommit={onContentDraftCommit}
        onContentDraftDiscard={onContentDraftDiscard}
        destination={staticWizardTarget}
        initialDraft={staticContentDraft}
        restoration={staticContentRestoration}
        disabled={moderatorMutationLocked}
        onDraftChange={setStaticContentDraft}
        onDirtyChange={setStaticContentDirty}
        onRestorationChange={setStaticContentRestoration}
        onSuspend={suspendStaticContentOwner}
        onClose={() => {
          setStaticWizardTarget(null);
          setStaticContentDraft(null);
          setStaticContentDirty(false);
          setStaticContentRestoration(null);
          restoreStaticWizardFocus();
        }}
        onCreate={async ({ destination, panel, placement, mediaItem, assets, stagedAssetIds }) => {
          const subject = panel?.title?.trim() || destination?.sectionId || "New content";
          const status = beginContentOperation("static.saved", {
            subject,
            workingLabel: `Saving Dashboard Content “${subject}”`,
            key: "static-content-save",
          });
          try {
            await status.beforeWork();
            await pendingEdits.flush();
            const prepared = prepareStaticPanelTransaction({
              dashboard: dashboardStateRef.current,
              operation: "create",
              destination,
              panel,
              placement,
              mediaItem,
              assets,
              stagedAssetIds,
            });
            await onStaticPanelCommit(prepared, { reportStatus: false });
            setStaticWizardTarget(null);
            setStaticContentDraft(null);
            setStaticContentDirty(false);
            setStaticContentRestoration(null);
            restoreStaticWizardFocus();
            status.succeed();
          } catch (error) {
            status.fail(error);
            throw error;
          }
        }}
      />}
      <input
        ref={importInputRef}
        className="visually-hidden"
        type="file"
        accept="application/json,.json"
        onChange={(event) => {
          onImportConfig(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <ConfirmDialog
        open={pendingStaticBuildSelection !== null}
        title="Discard static content changes?"
        message="Your unsaved static content changes last only for this application session."
        cancelLabel="Keep editing"
        confirmLabel="Discard"
        onCancel={() => {
          setPendingStaticBuildSelection(null);
          setChartEditorVisible(true);
        }}
        onConfirm={discardStaticDraftAndSelect}
      />
      <ConfirmDialog
        open={packageImportConfirmation}
        title="Discard unsaved dashboard changes?"
        message="Unsaved changes to this dashboard will be lost."
        cancelLabel="Cancel"
        confirmLabel="Choose package"
        onConfirm={confirmDashboardPackageImport}
        onCancel={() => setPackageImportConfirmation(false)}
      />
      <ConfirmDialog
        open={resetEditSessionConfirmation}
        title="Discard Build changes?"
        message="Replace local work with the baseline captured when you entered Build? This does not contact the deployed online dashboard."
        cancelLabel="Keep editing"
        confirmLabel={moderatorOperation.kind === "reset-session" ? "Discarding Build changes…" : "Discard Build changes"}
        disabled={moderatorOperation.kind === "reset-session"}
        confirmDisabled={moderatorOperation.kind === "reset-session"}
        error={moderatorOperation.errorKind === "reset-session" ? moderatorOperation.error : ""}
        onConfirm={resetEditMode}
        onCancel={() => {
          if (moderatorOperationGateRef.current.isActive()) return;
          setResetEditSessionConfirmation(false);
          clearModeratorError("reset-session");
        }}
      />
      <DeleteDashboardContentDialog
        open={deleteContentConfirmation}
        summary={summarizeDashboardContent(dashboard)}
        busy={moderatorOperation.kind === "delete-dashboard-content"}
        error={moderatorOperation.errorKind === "delete-dashboard-content" ? moderatorOperation.error : ""}
        onConfirm={confirmDeleteDashboardContent}
        onCancel={() => {
          if (moderatorOperationGateRef.current.isActive()) return;
          setDeleteContentConfirmation(false);
          clearModeratorError("delete-dashboard-content");
        }}
      />
      <ConfirmDialog
        open={pendingRemovalPageId !== null}
        title={`Delete Page ${dashboard.pages.find(({ id }) => id === pendingRemovalPageId)?.label ?? ""}?`}
        message="This Page, all of its Sections and charts, and those charts’ Chrono Group memberships will be removed. This cannot be undone after the dashboard change is saved."
        confirmLabel={moderatorOperation.kind === "remove-page" ? "Deleting…" : "Delete page"}
        cancelLabel="Keep page"
        disabled={moderatorOperation.kind === "remove-page"}
        confirmDisabled={moderatorOperation.kind === "remove-page"}
        error={moderatorOperation.errorKind === "remove-page" ? moderatorOperation.error : ""}
        onConfirm={confirmPageRemoval}
        onCancel={cancelPageRemoval}
      />
      <DashboardPackageExportDialog
        open={packageExportIssues.length > 0}
        issues={packageExportIssues}
        onResolve={resolvePackageExportIssue}
        onCancel={() => setPackageExportIssues([])}
      />
      <ConfirmDialog
        open={pendingRemovalPanelId !== null}
        title="Remove this chart?"
        message="The chart will be removed from this dashboard and any synchronized playback group."
        confirmLabel={moderatorOperation.kind === "remove-chart" ? "Removing..." : "Remove chart"}
        cancelLabel="Keep chart"
        disabled={moderatorOperation.kind === "remove-chart"}
        confirmDisabled={moderatorOperation.kind === "remove-chart"}
        error={moderatorOperation.errorKind === "remove-chart" ? moderatorOperation.error : ""}
        onConfirm={confirmPanelRemoval}
        onCancel={cancelPanelRemoval}
      />
      <FullscreenDisplay
        dashboard={dashboard}
        displayState={displayState}
        onDisplayAction={onDisplayAction}
        accessibilityEnabled={accessibilityEnabled}
      />
      </>}
    </>
  );

  return (
    <main
      className="app-shell"
      data-device-layout={deviceLayout}
      data-page-type={landingActive ? "landing" : "analytical"}
      style={iconLanguageStyles}
    >
      <header className="dashboard-header">
        <div className="dashboard-brand-block">
          <img className="pdpc-header-mark" src={`${import.meta.env.BASE_URL}assets/pdpc-logo.png`} alt="" />
          <div>
            <p className="eyebrow">{dashboardDraft.programLabel}</p>
            {editMode ? (
              <div className="header-text-edit-fields">
                <input
                  aria-label="Program label"
                  disabled={moderatorMutationLocked}
                  value={dashboardDraft.programLabel ?? ""}
                  onChange={(event) => changeDashboardText({ programLabel: event.target.value })}
                />
                <input
                  aria-label="Page title"
                  disabled={moderatorMutationLocked}
                  value={(pageDrafts[activePage.id]?.title ?? activePage?.title) ?? dashboard.title}
                  onChange={(event) => changePage(activePage.id, { title: event.target.value })}
                />
                <input
                  aria-label="Page subtitle"
                  disabled={moderatorMutationLocked}
                  value={(pageDrafts[activePage.id]?.description ?? activePage?.description) ?? dashboard.description}
                  onChange={(event) => changePage(activePage.id, { description: event.target.value })}
                />
              </div>
            ) : (
              <>
                {landingActive ? (
                  <div className="dashboard-page-title">{activePage?.title ?? dashboard.title}</div>
                ) : (
                  <h1>{activePage?.title ?? dashboard.title}</h1>
                )}
                {typeof (activePage?.description ?? dashboard.description) === "string"
                  && (activePage?.description ?? dashboard.description).trim() !== ""
                  && <p className="subtitle">{activePage?.description ?? dashboard.description}</p>}
              </>
            )}
          </div>
        </div>
        <div className="header-right-rail">
          <dl className="dashboard-meta">
            <div>
              <dt>Scenario</dt>
              <dd>
                {editMode ? (
                  <input disabled={moderatorMutationLocked} value={dashboardDraft.scenarioLabel ?? ""} onChange={(event) => changeDashboardText({ scenarioLabel: event.target.value })} />
                ) : (
                  dashboard.scenarioLabel
                )}
              </dd>
            </div>
            <div>
              <dt>Updated</dt>
              <dd>
                {editMode ? (
                  <input disabled={moderatorMutationLocked} value={dashboardDraft.lastUpdated ?? ""} onChange={(event) => changeDashboardText({ lastUpdated: event.target.value })} />
                ) : (
                  dashboard.lastUpdated
                )}
              </dd>
            </div>
          </dl>
        </div>
        <div className="header-floating-actions">
          <div className="header-edit-primary-actions">
            {editMode ? (
              <IconControl
                interactionId="shell.save-edits"
                className="header-edit-floating-button"
                ariaLabel={moderatorOperation.kind === "save-session" ? "Saving edits" : "Save edits"}
                tooltip={moderatorOperation.kind === "save-session" ? "Saving edits" : "Save edits"}
                data-icon-surface="dark"
                onClick={saveEditMode}
                disabled={moderatorOperation.kind !== null}
                disabledReason={moderatorOperation.kind !== null
                  ? "Wait for the current dashboard operation to finish."
                  : ""}
              />
            ) : (
              <IconControl
                interactionId="shell.open-editable-tab"
                className="header-edit-floating-button"
                aria-label="Open Build mode"
                tooltip="Build mode"
                title="Build mode"
                data-icon-surface="dark"
                onClick={() => onModeRequest("build")}
                disabled={moderatorOperation.kind !== null}
                disabledReason={moderatorOperation.kind !== null
                  ? "Wait for the current dashboard operation to finish."
                  : ""}
              />
            )}
            {editMode && (
              <IconControl
                interactionId="shell.reset-edits"
                className="header-edit-floating-button secondary"
                ariaLabel="Discard Build changes"
                tooltip="Discard Build changes"
                data-icon-surface="dark"
                onClick={requestResetEditSession}
                disabled={moderatorOperation.kind !== null}
                disabledReason={moderatorOperation.kind !== null
                  ? "Wait for the current dashboard operation to finish."
                  : ""}
              />
            )}
          </div>
        </div>
      </header>
      {moderatorOperation.errorKind === "save-session" && moderatorOperation.error && (
        <p role="alert" className="edit-operation-error">{moderatorOperation.error}</p>
      )}
      {editMode && (
        <section className="edit-command-banner" aria-label="Edit commands">
          <div className="edit-command-title">
            <p className="eyebrow">Mode</p>
            <h2>Edit mode</h2>
          </div>
          <div className="header-edit-controls">
            <div className="tab-edit-controls">
              <IconControl interactionId="shell.add-tab" disabled={moderatorMutationLocked} onClick={addPage} />
              <IconControl interactionId="shell.remove-tab" className="secondary" disabled={moderatorMutationLocked || (dashboard.pages ?? []).length <= 1} onClick={removeActivePage} />
            </div>
            <GlobalPanelColorControls disabled={moderatorMutationLocked} colors={globalPanelColors} onChange={changeGlobalPanelColors} />
            <GlobalIconAccentControl
              disabled={moderatorMutationLocked}
              value={iconAccentVariants.base}
              onChange={changeIconAccent}
            />
            <input
              ref={importInputRef}
              className="visually-hidden"
              type="file"
              disabled={moderatorMutationLocked}
              accept="application/json,.json"
              onChange={(event) => {
                onImportConfig(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </div>
        </section>
      )}

      {multiSelectMode && (
        <section className="multi-select-dock" aria-label="Multi-fullscreen selection">
          <span className="multi-select-count">
            <strong>{multiPanelIds.length}</strong>
            <span>of 4 selected</span>
          </span>
          <IconControl
            interactionId="fullscreen.enter-multi-fullscreen"
            disabled={multiPanelIds.length < 2}
            onClick={openMultiFullscreen}
          />
          <IconControl
            interactionId="editor.cancel"
            className="secondary"
            ariaLabel="Cancel multi-fullscreen selection"
            tooltip="Cancel multi-fullscreen selection"
            onClick={cancelMultiSelection}
          />
        </section>
      )}
      {multiSelectNotice && (
        <div
          className="multi-select-limit-notice"
          role="alert"
          key={multiSelectNotice.id}
        >
          {multiSelectNotice.message}
        </div>
      )}

      <nav className="page-tabs" aria-label="Dashboard pages">
        {dashboard.pages.map((page) => (
          editMode ? (
            <label className={`page-tab-edit ${page.id === activePage.id ? "active" : ""}`} key={page.id}>
              <IconControl
                interactionId="shell.open-editable-tab"
                disabled={moderatorMutationLocked}
                className={page.id === activePage.id ? "active" : "secondary"}
                ariaLabel={`Open ${page.label}`}
                tooltip={`Open ${page.label}`}
                pressed={page.id === activePage.id}
                onClick={() => navigateToPage(page.id)}
              />
              <input
                disabled={moderatorMutationLocked}
                value={(pageDrafts[page.id]?.label ?? page.label) ?? ""}
                onChange={(event) => changePage(page.id, { label: event.target.value })}
              />
            </label>
          ) : (
            <button
              key={page.id}
              type="button"
              className={page.id === activePage.id ? "active" : "secondary"}
              onClick={() => navigateToPage(page.id)}
            >
              {page.label}
            </button>
          )
        ))}
      </nav>
      <PlaybackSurface
        entryBlocked={chartAuthoringActive}
        entryBlockedReason="Finish, save, or discard chart authoring before opening Playback view."
        accessibilityEnabled={accessibilityEnabled}
      >
      <section className="dashboard-workspace">
        <div className="page-stack">
          {landingActive ? (
            <LandingPage
              page={activePage}
              pages={dashboard.pages}
              onNavigate={navigateToPage}
            />
          ) : (
            activePage.sections.map((section) => (
            <section className="dashboard-section" key={section.id}>
              <div className="section-header">
                <div className="section-title-block">
                  {editMode ? (
                    <>
                      <label className="section-edit-field">
                        <span>Section title</span>
                        <input
                          disabled={moderatorMutationLocked}
                          value={(sectionDrafts[section.id]?.title ?? section.title) ?? ""}
                          onChange={(event) => changeSection(section, { title: event.target.value })}
                        />
                      </label>
                      <label className="section-edit-field">
                        <span>Section subtext</span>
                        <input
                          disabled={moderatorMutationLocked}
                          value={(sectionDrafts[section.id]?.description ?? section.description) ?? ""}
                          onChange={(event) => changeSection(section, { description: event.target.value })}
                        />
                      </label>
                    </>
                  ) : (
                    <>
                      <h2>{section.title}</h2>
                      {section.description && <p>{section.description}</p>}
                    </>
                  )}
                </div>
                {editMode && (
                  <div className="section-actions">
                    <IconControl
                      interactionId="shell.add-chart"
                      className="secondary add-panel-button"
                      disabled={moderatorMutationLocked}
                      onClick={() => {
                        if (moderatorOperationGateRef.current.isActive()) return;
                        setChartWizardTarget({ pageId: activePage.id, sectionId: section.id });
                      }}
                    />
                    <IconControl
                      interactionId="shell.remove-title"
                      className="secondary add-panel-button"
                      disabled={moderatorMutationLocked}
                      onClick={() => removeSectionTitle(section)}
                    />
                  </div>
                )}
              </div>
              <LayoutGrid>
                {section.panels.map((placement) => {
                  const panelId = placement.id;
                  const chart = placement.chart ?? placement;
                  return (
                    <ChartPanel
                      key={panelId}
                      panel={chart}
                      rows={dashboard.loadedData[chart.sourceId] ?? []}
                      datasetProfile={dashboard.datasetProfiles?.[chart.sourceId]}
                      geoData={geoDataSources[chart.presentation?.map?.geoSource]}
                      dataSources={dashboard.dataSources}
                      assets={dashboard.assets ?? {}}
                      accessibilityEnabled={accessibilityEnabled}
                      editMode={editMode}
                      editDisabled={moderatorMutationLocked}
                      isDragging={draggingPanelId === panelId}
                      isDragTarget={dragOverPanelId === panelId}
                      isSelected={editMode && selectedPanelId === panelId}
                      multiSelectMode={multiSelectMode}
                      isMultiSelected={multiPanelIds.includes(chart.id)}
                      multiSelectionIndex={multiPanelIds.indexOf(chart.id) + 1}
                      onEdit={() => openPanelEditor(panelId)}
                      onRemove={() => removePanel(panelId)}
                      onToggleMultiSelect={() => toggleMultiPanel(chart.id)}
                      onFullScreenHold={() => startMultiFullscreenSelection(chart.id)}
                      onDisplayAction={onDisplayAction}
                      onDragStart={(event) => handlePanelDragStart(event, panelId)}
                      onDragOver={(event) => handlePanelDragOver(event, panelId)}
                      onDrop={(event) => handlePanelDrop(event, panelId)}
                      onDragEnd={clearDragState}
                      onStartSection={() => startSectionAtPanel(section, placement)}
                    />
                  );
                })}
              </LayoutGrid>
            </section>
            ))
          )}
        </div>

        {editMode && selectedPanel && (
          <ChartEditorV3
            disabled={moderatorMutationLocked}
            chart={selectedPanel}
            chronoGroups={dashboard.chronoGroups ?? []}
            existingCharts={configuredCharts(dashboard)}
            rows={dashboard.loadedData?.[selectedPanel.sourceId] ?? []}
            geoData={geoDataSources[selectedPanel.presentation?.map?.geoSource]}
            geoDataSources={geoDataSources}
            dataSources={dashboard.dataSources ?? {}}
            profile={dashboard.datasetProfiles?.[selectedPanel.sourceId]}
            loadedData={dashboard.loadedData ?? {}}
            profiles={dashboard.datasetProfiles ?? {}}
            parsingMetadata={dashboard.dataSources?.[selectedPanel.sourceId]?.parsingMetadata ?? {}}
            timezone={dashboard.timezone ?? "UTC"}
            onSave={saveSelectedChartV3}
            onApplyCitationToSourceCharts={onApplyCitationToSourceCharts}
            onCancel={cancelSelectedPanel}
            onRemove={() => removePanel(selectedPlacement.panelId)}
          />
        )}
      </section>
      </PlaybackSurface>
      <ChartWizardV3
        key={`chart-create:${chartDraftSessionKey}:${chartWizardSessionEpoch}`}
        open={Boolean(chartWizardTarget)}
        destination={chartWizardTarget}
        dashboard={dashboard}
        initialDraftState={chartDraftSessionStore.get(chartDraftSessionKey)}
        suspendControllerRef={chartWizardControllerRef}
        disabled={moderatorMutationLocked}
        dataSources={dashboard.dataSources}
        loadedData={dashboard.loadedData}
        datasetProfiles={dashboard.datasetProfiles ?? {}}
        geoDataSources={geoDataSources}
        chronoGroups={dashboard.chronoGroups ?? []}
        existingCharts={configuredCharts(dashboard)}
        onDraftStateChange={handleChartDraftStateChange}
        onClose={() => {
          if (moderatorOperationGateRef.current.isActive()) return;
          setChartWizardTarget(null);
        }}
        onCreate={async (payload, reviewedPlacement) => {
          if (moderatorOperationGateRef.current.isActive()) {
            throw new Error("Wait for the current dashboard operation to finish.");
          }
          const target = chartWizardTarget;
          await pendingEdits.flush();
          await onChartCreate(payload, reviewedPlacement ?? target);
        }}
        onCommitSuccess={() => {
          const nextSessionEpoch = chartWizardSessionEpochRef.current + 1;
          chartWizardSessionEpochRef.current = nextSessionEpoch;
          chartDraftSessionStore.clear(chartDraftSessionKey);
          setChartDraftSessionRevision((current) => current + 1);
          setChartWizardSessionEpoch(nextSessionEpoch);
          setChartCreateOwner(null);
          setChartWizardDirty(false);
          setChartWizardSuspended(false);
          setChartWizardSuspendedTarget(null);
          setChartWizardTarget(null);
        }}
      />
      <ConfirmDialog
        open={resetEditSessionConfirmation}
        title="Discard Build changes?"
        message="Replace local work with the baseline captured when you entered Build? This does not contact the deployed online dashboard."
        cancelLabel="Keep editing"
        confirmLabel={moderatorOperation.kind === "reset-session" ? "Discarding Build changes…" : "Discard Build changes"}
        disabled={moderatorOperation.kind === "reset-session"}
        confirmDisabled={moderatorOperation.kind === "reset-session"}
        error={moderatorOperation.errorKind === "reset-session" ? moderatorOperation.error : ""}
        onConfirm={resetEditMode}
        onCancel={() => {
          if (moderatorOperationGateRef.current.isActive()) return;
          setResetEditSessionConfirmation(false);
          clearModeratorError("reset-session");
        }}
      />
      <ConfirmDialog
        open={pendingRemovalPanelId !== null}
        title="Remove this chart?"
        message="The chart will be removed from this dashboard and any synchronized playback group."
        confirmLabel={moderatorOperation.kind === "remove-chart" ? "Removing..." : "Remove chart"}
        cancelLabel="Keep chart"
        disabled={moderatorOperation.kind === "remove-chart"}
        confirmDisabled={moderatorOperation.kind === "remove-chart"}
        error={moderatorOperation.errorKind === "remove-chart" ? moderatorOperation.error : ""}
        onConfirm={confirmPanelRemoval}
        onCancel={cancelPanelRemoval}
      />
      <FullscreenDisplay
        dashboard={dashboard}
        displayState={displayState}
        onDisplayAction={onDisplayAction}
        accessibilityEnabled={accessibilityEnabled}
      />
      <DashboardFooter dashboard={dashboard} />
      <div className="dashboard-device-tools">
        <DeviceLayoutControl value={deviceLayout} onChange={onDeviceLayoutChange} />
      </div>
    </main>
  );
});

export default DashboardRenderer;

export function projectContentManagerDependencies({ dashboard, activeRetainers, onNavigate, onDelete }) {
  const projected = { ...dashboard };
  const graph = buildContentDependencyGraph({ dashboard, activeRetainers });
  const contentDependencyState = Object.create(null);
  for (const [mediaId, record] of Object.entries(projected.contentLibrary?.mediaItems ?? {})) {
    contentDependencyState[`media:${mediaId}`] = createManagerDependencyState({ dashboard, graph, record, kind: "media", id: mediaId, onNavigate, onDelete });
  }
  for (const [sourceId, record] of Object.entries(projected.contentLibrary?.sourceEntries ?? {})) {
    const kind = classifyManagedSource(sourceId, projected.dataSources?.[sourceId])?.kind;
    if (kind) contentDependencyState[`${kind}:${sourceId}`] = createManagerDependencyState({ dashboard, graph, record, kind, id: sourceId, onNavigate, onDelete });
  }
  Object.defineProperty(projected, "contentDependencyState", { value: Object.freeze(contentDependencyState) });
  return projected;
}

function createManagerDependencyState({ dashboard, graph, record, kind, id, onNavigate, onDelete }) {
  const plan = prepareContentDeletion({ dashboard, graph, item: { kind, id } });
  const uses = [...plan.directUses];
  Object.defineProperties(uses, {
    activeRetainers: { value: plan.retainers },
    deletion: { value: { ...plan, itemLabel: record.displayName ?? id } },
    onNavigate: { value: onNavigate },
    onDelete: { value: onDelete },
  });
  return Object.freeze({ uses, activeRetainers: plan.retainers });
}

function DashboardFooter({ dashboard }) {
  const feedbackUrl = dashboard.feedbackUrl || feedbackMailtoUrl(dashboard.contactEmail);
  const contactUrl = dashboard.contactEmail ? `mailto:${dashboard.contactEmail}` : null;
  const showRepositoryLink = Boolean(dashboard.repositoryUrl && dashboard.showRepositoryLink);
  return (
    <footer className="dashboard-footer" aria-label="Dashboard information and feedback">
      <div>
        <strong>{dashboard.footerTitle ?? "SimEx Dashboard V3"}</strong>
        <span>{dashboard.footerCredit ?? "Developed by Hekmat Alrouh"}</span>
      </div>
      <nav aria-label="Project links">
        <a href={feedbackUrl} target="_blank" rel="noreferrer">
          Report a bug / request a feature
        </a>
        {contactUrl && <a href={contactUrl}>Contact maintainer</a>}
        {showRepositoryLink && (
          <a href={dashboard.repositoryUrl} target="_blank" rel="noreferrer">
            Project repository
          </a>
        )}
      </nav>
    </footer>
  );
}

function feedbackMailtoUrl(contactEmail) {
  const email = contactEmail || "hekmat.alrouh@live.com";
  return `mailto:${email}?subject=${encodeURIComponent("SimEx Dashboard feedback")}`;
}

function GlobalPanelColorControls({ colors, onChange, disabled = false }) {
  return (
    <details className="global-color-controls">
      <IconSummary
        interactionId="shell.global-panel-colors"
        className="global-color-summary"
        tooltipPlacement="below"
      />
      <fieldset className="global-color-grid" disabled={disabled}>
        <ColorField label="Panel background" value={colors.panelBackgroundColor} fallback="#f5f8fb" onChange={(color) => onChange({ panelBackgroundColor: color })} />
        <ColorField label="Panel border" value={colors.panelBorderColor} fallback="#d8e2ec" onChange={(color) => onChange({ panelBorderColor: color })} />
        <ColorField label="Chart background" value={colors.chartAreaColor} fallback="#eaf1f6" onChange={(color) => onChange({ chartAreaColor: color })} />
        <ColorField label="Chart border" value={colors.chartAreaBorderColor} fallback="#d8e2ec" onChange={(color) => onChange({ chartAreaBorderColor: color })} />
        <ColorField label="Edit highlight" value={colors.editHighlightColor} fallback="#043bcb" onChange={(color) => onChange({ editHighlightColor: color })} />
        <ColorField label="Multi-fullscreen highlight" value={colors.multiSelectHighlightColor} fallback="#00a676" onChange={(color) => onChange({ multiSelectHighlightColor: color })} />
      </fieldset>
    </details>
  );
}

function diffPanel(previous, next) {
  const updates = {};
  for (const key of Object.keys(next)) {
    if (JSON.stringify(previous?.[key]) !== JSON.stringify(next[key])) {
      updates[key] = next[key];
    }
  }
  return updates;
}

function dashboardTextDraftFromDashboard(dashboard) {
  return {
    programLabel: dashboard?.programLabel ?? "",
    scenarioLabel: dashboard?.scenarioLabel ?? "",
    lastUpdated: dashboard?.lastUpdated ?? "",
  };
}

function pageDraftFromPage(page) {
  return {
    label: page?.label ?? "",
    title: page?.title ?? "",
    description: page?.description ?? "",
  };
}

function sectionDraftFromSection(section) {
  return {
    title: section?.title ?? "",
    description: section?.description ?? "",
  };
}

function GlobalIconAccentControl({ value, onChange, disabled = false }) {
  return (
    <details className="global-color-controls global-icon-accent-controls">
      <IconSummary
        interactionId="shell.icon-accent"
        className="global-color-summary"
        tooltipPlacement="below"
      />
      <fieldset className="global-color-grid" disabled={disabled}>
        <ColorField
          label="Accent color"
          value={value}
          fallback={ICON_TOKENS.accentBase}
          onChange={onChange}
          showContrast
        />
        <div className="global-icon-accent-preview" aria-label="Icon accent preview">
          <span className="global-icon-accent-preview-light">
            <SimExIcon iconId="playback" />
            Light
          </span>
          <span className="global-icon-accent-preview-dark" data-icon-surface="dark">
            <SimExIcon iconId="playback" className="simex-icon--on-dark" />
            Dark
          </span>
        </div>
        <IconControl
          interactionId="shell.reset-edits"
          className="secondary"
          ariaLabel="Reset icon accent"
          tooltip="Reset icon accent"
          onClick={() => onChange(ICON_TOKENS.accentBase)}
        />
      </fieldset>
    </details>
  );
}

function boundedModeratorMessage(error) {
  const message = typeof error?.message === "string" && error.message.trim()
    ? error.message.trim()
    : "The dashboard could not be saved.";
  return message.length <= 240 ? message : `${message.slice(0, 237)}...`;
}

function resolveGlobalPanelColors(dashboard) {
  return {
    panelBackgroundColor: dashboard?.globalStyles?.panelColors?.panelBackgroundColor ?? "#f5f8fb",
    panelBorderColor: dashboard?.globalStyles?.panelColors?.panelBorderColor ?? "#d8e2ec",
    chartAreaColor: dashboard?.globalStyles?.panelColors?.chartAreaColor ?? "#eaf1f6",
    chartAreaBorderColor: dashboard?.globalStyles?.panelColors?.chartAreaBorderColor ?? "#d8e2ec",
    editHighlightColor: dashboard?.globalStyles?.panelColors?.editHighlightColor ?? "#043bcb",
    multiSelectHighlightColor: dashboard?.globalStyles?.panelColors?.multiSelectHighlightColor ?? "#00a676",
  };
}

export function validatedGeoDataSources(dashboard = {}) {
  const result = Object.create(null);
  for (const [sourceId, source] of Object.entries(dashboard.dataSources ?? {})) {
    if (!isGeoJsonDescriptor(source)) continue;
    const candidate = dashboard.loadedData?.[sourceId];
    try {
      validateGeoJson(candidate, `Data source "${sourceId}" GeoJSON`);
      result[sourceId] = candidate;
    } catch {
      // Invalid geography never crosses the rendering or authoring boundary.
    }
  }
  return result;
}

export function commitPendingDashboardEdits(edits, callbacks = {}) {
  if (typeof callbacks.onApplyPendingEdits === "function") {
    return callbacks.onApplyPendingEdits(edits);
  }
  for (const edit of edits) {
    if (edit.type === "dashboard") {
      callbacks.onDashboardChange?.(edit.updates);
    } else if (edit.type === "page") {
      callbacks.onPageChange?.(edit.pageId, edit.updates);
    } else if (edit.type === "section") {
      callbacks.onSectionChange?.(
        edit.pageId,
        edit.sectionId,
        edit.updates,
      );
    }
  }
  return undefined;
}

function uniquePageId(dashboard, label) {
  const base = slugify(label) || "new_page";
  const existing = new Set((dashboard.pages ?? []).map((page) => page.id));
  let candidate = base;
  let counter = 2;
  while (existing.has(candidate)) {
    candidate = `${base}_${counter}`;
    counter += 1;
  }
  return candidate;
}

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function selectionForPlacement(dashboard, placementId) {
  for (const page of dashboard.pages ?? []) {
    for (const section of page.sections ?? []) {
      const placement = section.panels?.find(({ id }) => id === placementId);
      if (placement) return {
        kind: "chart",
        pageId: page.id,
        sectionId: section.id,
        placementId,
        chartId: (placement.chart ?? placement).id,
      };
    }
  }
  return null;
}

function staticDestinationForPlacement(dashboard, placementId) {
  const selection = selectionForPlacement(dashboard, placementId);
  return selection && { pageId: selection.pageId, sectionId: selection.sectionId };
}

function isValidBuildSelection(dashboard, selection) {
  if (!selection?.kind) return false;
  if (selection.kind === "chronoGroup") {
    return (dashboard.chronoGroups ?? []).some(({ id }) => id === selection.chronoGroupId);
  }
  const page = (dashboard.pages ?? []).find(({ id }) => id === selection.pageId);
  if (!page) return false;
  if (selection.kind === "page") return true;
  const section = (page.sections ?? []).find(({ id }) => id === selection.sectionId);
  if (!section) return false;
  if (selection.kind === "section") return true;
  return selection.kind === "chart"
    && (section.panels ?? []).some(({ id }) => id === selection.placementId);
}







