import React from "react";

import ChartEditorV3 from "./chart-authoring/ChartEditorV3.jsx";
import ChartWizardV3 from "./chart-authoring/ChartWizardV3.jsx";
import BuildWorkspace from "./build/BuildWorkspace.jsx";
import {
  buildLeaveBlockReason,
  createBuildDirtyState,
  hasActiveLocalAuthoringDrafts,
  hasUnsavedAuthoredContent,
} from "./build/buildDirtyState.js";
import { reconcileBuildSelection } from "./build/buildSelectionModel.js";
import ColorField from "./ColorField.jsx";
import ConfirmDialog from "./common/ConfirmDialog.jsx";
import { IconControl, IconSummary, SimExIcon } from "./common/SimExIcon.js";
import DeviceLayoutControl from "./DeviceLayoutControl.jsx";
import FullscreenDisplay from "./FullscreenDisplay.jsx";
import ChartPanel from "./ChartPanel.jsx";
import LayoutGrid from "./LayoutGrid.jsx";
import LandingPage, { hasLandingPresentation } from "./LandingPage.jsx";
import PlaybackSurface from "./playback/PlaybackSurface.jsx";
import PresentWorkspace from "./presentation/PresentWorkspace.jsx";
import usePresentationRuntime from "./presentation/usePresentationRuntime.js";
import ViewShell from "./view/ViewShell.jsx";
import {
  configuredCharts,
  findPanelPlacement,
} from "../lib/dashboardSelectors.js";
import { createDebouncedDashboardEdits } from "../lib/dashboardCommitController.js";
import { createImportedRendererDraftState } from "../lib/dashboardPackageImportTransaction.js";
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
import { installChartDraftUnloadGuard } from "../charting/forms/chartDraftUnloadGuard.js";

const DashboardRenderer = React.forwardRef(function DashboardRenderer({
  dashboard,
  mode,
  activePageId,
  onActivePageChange,
  onModeRequest,
  onBuildDraftLockChange,
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
  onDashboardChange,
  onTimeGroupChange,
  onBackgroundPersistenceError,
  onApplyPendingEdits,
  onPanelEditCommit,
  onPanelEditCancel,
  onSectionChange,
  onSectionReorder,
  onSectionInsert,
  onVantaBackgroundChange,
  onChartCreate,
  onChartSave,
  onApplyCitationToSourceCharts,
  onPanelRemove,
  onPanelReorder,
  onImportConfig,
  onExportConfig,
  onResetEditSession,
  onOpenDashboardLook,
  buildPanelOpen = false,
  operationError = "",
  themeProjection,
}, ref) {
  const buildMode = mode === "build";
  const editMode = buildMode;
  const [selectedPanelId, setSelectedPanelId] = React.useState(null);
  const [buildSelection, setBuildSelection] = React.useState(null);
  const [chartEditorPlacementId, setChartEditorPlacementId] = React.useState(null);
  const [chartEditorVisible, setChartEditorVisible] = React.useState(false);
  const [chartEditorDirty, setChartEditorDirty] = React.useState(false);
  const [chartWizardDirty, setChartWizardDirty] = React.useState(false);
  const [chartWizardSuspended, setChartWizardSuspended] = React.useState(false);
  const [chartWizardSuspendedTarget, setChartWizardSuspendedTarget] = React.useState(null);
  const [localAuthoringDrafts, setLocalAuthoringDrafts] = React.useState({});
  const [chartDraftSessionRevision, setChartDraftSessionRevision] = React.useState(0);
  const [inlineRenameDirty, setInlineRenameDirty] = React.useState(false);
  const [packageImportConfirmation, setPackageImportConfirmation] = React.useState(false);
  const [externalDirty, setExternalDirty] = React.useState({
    timeGroup: false,
    scene: false,
    dashboardMetadata: false,
  });
  const [pendingBuildSelection, setPendingBuildSelection] = React.useState(null);
  const [buildRevealRequest, setBuildRevealRequest] = React.useState(null);
  const [buildTreeResetGeneration, setBuildTreeResetGeneration] = React.useState(0);
  const [buildSelectionError, setBuildSelectionError] = React.useState("");
  const [focusInspectorLabelKey, setFocusInspectorLabelKey] = React.useState(0);
  const [draggingPanelId, setDraggingPanelId] = React.useState(null);
  const [dragOverPanelId, setDragOverPanelId] = React.useState(null);
  const [multiSelectMode, setMultiSelectMode] = React.useState(false);
  const [multiPanelIds, setMultiPanelIds] = React.useState([]);
  const multiPanelIdsRef = React.useRef(multiPanelIds);
  multiPanelIdsRef.current = multiPanelIds;
  const dashboardStateRef = React.useRef(dashboard);
  dashboardStateRef.current = dashboard;
  const buildRevealRequestIdRef = React.useRef(0);
  const buildRevealResolversRef = React.useRef(new Map());
  const appliedBuildRevealIdRef = React.useRef(0);
  const importInputRef = React.useRef(null);
  const [showVantaSettings, setShowVantaSettings] = React.useState(false);
  const [backgroundDraft, setBackgroundDraft] = React.useState(() => sanitizeVantaSettings(dashboard.vantaBackground));
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

  const activePage =
    dashboard.pages.find((page) => page.id === activePageId) ?? dashboard.pages[0];
  const presentationValidChartIds = React.useMemo(
    () => configuredCharts(dashboard)
      .map((chart) => chart?.id)
      .filter((chartId) => typeof chartId === "string" && chartId.length > 0),
    [dashboard],
  );
  const presentationRuntime = usePresentationRuntime(presentationValidChartIds);
  const landingActive = hasLandingPresentation(activePage);
  const selectedPlacement = findPanelPlacement(dashboard, chartEditorPlacementId);
  const selectedPanel = selectedPlacement?.chart ?? null;
  const chartAuthoringActive = Boolean(
    chartWizardTarget || (editMode && selectedPanel),
  );
  const localAuthoringDirty = hasActiveLocalAuthoringDrafts(localAuthoringDrafts);
  const buildDraftLocked = Boolean(chartEditorDirty || localAuthoringDirty);
  const moderatorMutationLocked = moderatorOperation.kind !== null;
  const authoredDirty = hasUnsavedAuthoredContent({
    ...createBuildDirtyState(),
    chartEditor: chartEditorDirty,
    chartWizard: chartWizardDirty || isMeaningfulChartDraft(
      chartDraftSessionStore.get(chartDraftSessionKey),
    ),
    structure: localAuthoringDirty,
    scenario: localAuthoringDirty,
    inlineRename: inlineRenameDirty,
    pendingContent: pendingEdits.hasPending(),
    timeGroup: externalDirty.timeGroup,
    scene: externalDirty.scene,
    dashboardMetadata: externalDirty.dashboardMetadata,
  });
  const globalPanelColors = React.useMemo(() => resolveGlobalPanelColors(dashboard), [dashboard.globalStyles]);
  const accessibilityEnabled = dashboard.globalStyles?.accessibility?.enabled === true;
  const iconAccent = dashboard.globalStyles?.iconAccent ?? ICON_TOKENS.accentBase;
  const iconAccentVariants = React.useMemo(
    () => deriveIconAccentVariants(iconAccent),
    [iconAccent],
  );
  const iconLanguageStyles = React.useMemo(() => ({
    "--simex-icon-base": ICON_TOKENS.base,
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
    if (!["timeGroup", "scene", "dashboardMetadata"].includes(key)) return false;
    setExternalDirty((current) => ({ ...current, [key]: dirty === true }));
    return true;
  }, []);

  const handleLocalDraftsChange = React.useCallback((drafts) => {
    setLocalAuthoringDrafts(drafts ?? {});
  }, []);

  const handleChartDraftStateChange = React.useCallback((state) => {
    if (!state || state.discarded === true || state.status === "committed") {
      chartDraftSessionStore.clear(chartDraftSessionKey);
    } else if (chartDraftSessionStore.get(chartDraftSessionKey)) {
      chartDraftSessionStore.replace(chartDraftSessionKey, state);
    } else {
      chartDraftSessionStore.start(chartDraftSessionKey, state);
    }
    setChartWizardDirty(isMeaningfulChartDraft(state));
    setChartDraftSessionRevision((current) => current + 1);
  }, [chartDraftSessionKey, chartDraftSessionStore]);

  React.useImperativeHandle(ref, () => ({
    setAuthoredDirtyFlag,
    async prepareForPackageImport() {
      await pendingEdits.flush();
      await onCommitPendingConfiguration?.();
    },
    resetAfterPackageImport(importedDashboard) {
      const rebasedDrafts = createImportedRendererDraftState(importedDashboard);
      pendingEdits.cancel();
      for (const resolve of buildRevealResolversRef.current.values()) resolve(false);
      buildRevealResolversRef.current.clear();
      buildRevealRequestIdRef.current += 1;
      appliedBuildRevealIdRef.current = 0;
      setDashboardDraft(rebasedDrafts.dashboardDraft);
      setPageDrafts(rebasedDrafts.pageDrafts);
      setSectionDrafts(rebasedDrafts.sectionDrafts);
      setChartEditorPlacementId(null);
      setChartEditorVisible(false);
      setChartEditBaseline(null);
      setChartEditorDirty(false);
      setChartWizardTarget(null);
      setChartWizardDirty(false);
      chartDraftSessionStore.clear(chartDraftSessionKey);
      setChartWizardSuspended(false);
      setChartWizardSuspendedTarget(null);
      setChartDraftSessionRevision((current) => current + 1);
      setLocalAuthoringDrafts({});
      setInlineRenameDirty(false);
      setExternalDirty({ timeGroup: false, scene: false, dashboardMetadata: false });
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
    requestAddPage() {
      if (!buildMode || chartAuthoringActive) return;
      addPage();
    },
    requestTimeGroupAuthoring() {
      if (!buildMode || chartAuthoringActive) return;
      const group = dashboardStateRef.current.timeSyncGroups?.[0];
      if (!group) return;
      setBuildSelection({ kind: "timeGroup", groupId: group.id });
      setFocusInspectorLabelKey((current) => current + 1);
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
      await pendingEdits.flush();
      await onCommitPendingConfiguration?.();
      return { ok: true };
    },
  }), [buildMode, buildDraftLocked, chartAuthoringActive, chartDraftSessionKey, chartDraftSessionStore, chartWizardTarget, localAuthoringDrafts, multiSelectMode, onCommitPendingConfiguration, onInlineRenameDirtyChange, pendingEdits, setAuthoredDirtyFlag]);

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
    const { requestId, selection, intent } = pendingBuildSelection;
    setBuildSelection(selection);
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

  function performModeratorOperation(kind, transaction) {
    return moderatorOperationGateRef.current.run(async () => {
      setModeratorOperation({ kind, errorKind: null, error: "" });
      try {
        const result = await transaction();
        setModeratorOperation({ kind: null, errorKind: null, error: "" });
        return result;
      } catch (error) {
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
    setInlineRenameDirty(dirty === true);
    onInlineRenameDirtyChange?.(dirty === true);
  }

  function requestDashboardPackageImport() {
    setBuildSelectionError("");
    if (authoredDirty) {
      setPackageImportConfirmation(true);
      return;
    }
    importInputRef.current?.click();
  }

  function confirmDashboardPackageImport() {
    setPackageImportConfirmation(false);
    importInputRef.current?.click();
  }

  async function exportDashboardPackage() {
    setBuildSelectionError("");
    if (chartEditorDirty || chartWizardDirty) {
      setBuildSelectionError("Save or cancel the changed chart before exporting a dashboard package.");
      return;
    }
    try {
      const snapshot = dashboardWithCurrentDrafts();
      await pendingEdits.flush();
      await onCommitPendingConfiguration?.();
      onExportConfig(snapshot);
    } catch (error) {
      setBuildSelectionError(boundedModeratorMessage(error));
    }
  }

  function confirmPanelRemoval() {
    const panelId = pendingRemovalPanelId;
    if (panelId === null) return;
    void performModeratorOperation("remove-chart", async () => {
      await pendingEdits.flush();
      await onPanelRemove(panelId);
      setChartEditBaseline(null);
      setChartEditorVisible(false);
      setChartEditorPlacementId((current) => (current === panelId ? null : current));
      setSelectedPanelId((current) => (current === panelId ? null : current));
      setPendingRemovalPanelId(null);
    });
  }

  function cancelPanelRemoval() {
    if (moderatorOperationGateRef.current.isActive()) return;
    setPendingRemovalPanelId(null);
    clearModeratorError("remove-chart");
  }

  function handlePanelDragStart(event, panelId) {
    if (moderatorOperationGateRef.current.isActive()) {
      event.preventDefault();
      return;
    }
    setDraggingPanelId(panelId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", panelId);
  }

  function handlePanelDragOver(event, panelId) {
    if (
      moderatorOperationGateRef.current.isActive()
      || !editMode
      || !draggingPanelId
    ) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (draggingPanelId === panelId) {
      setDragOverPanelId(null);
      return;
    }
    setDragOverPanelId(panelId);
  }

  function handlePanelDrop(event, targetPanelId) {
    event.preventDefault();
    if (moderatorOperationGateRef.current.isActive()) return;
    const sourcePanelId = event.dataTransfer.getData("text/plain") || draggingPanelId;
    flushPendingEditsInBackground();
    onPanelReorder(sourcePanelId, targetPanelId);
    setDraggingPanelId(null);
    setDragOverPanelId(null);
  }

  function clearDragState() {
    setDraggingPanelId(null);
    setDragOverPanelId(null);
  }

  function startMultiFullscreenSelection(panelId) {
    const initialPanelIds = panelId ? [panelId] : [];
    setMultiSelectMode(true);
    multiPanelIdsRef.current = initialPanelIds;
    setMultiPanelIds(initialPanelIds);
    setMultiSelectNotice(null);
  }

  function toggleMultiPanel(panelId) {
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
  }

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

  function addPage() {
    if (moderatorOperationGateRef.current.isActive()) return;
    const label = "New page";
    const pageId = uniquePageId(dashboardStateRef.current, label);
    void performModeratorOperation("add-page", async () => {
      await pendingEdits.flush();
      await onPageAdd({
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
      });
      onActivePageChange(pageId);
      setBuildSelection({ kind: "page", pageId });
      setFocusInspectorLabelKey((current) => current + 1);
    });
  }

  function reorderBuildPage(pageId, targetIndex) {
    if (moderatorOperationGateRef.current.isActive()) return;
    void performModeratorOperation("reorder-page", async () => {
      await pendingEdits.flush();
      await onPageReorder?.(pageId, targetIndex);
      setBuildSelection({ kind: "page", pageId });
    });
  }

  function reorderBuildSection(sectionId, targetIndex) {
    if (moderatorOperationGateRef.current.isActive() || !activePage) return;
    void performModeratorOperation("reorder-section", async () => {
      await pendingEdits.flush();
      await onSectionReorder?.(activePage.id, sectionId, targetIndex);
      setBuildSelection((current) => (
        current?.kind === "section" && current.sectionId === sectionId
          ? current
          : { kind: "page", pageId: activePage.id }
      ));
    });
  }

  function openBackgroundSettings() {
    if (moderatorOperationGateRef.current.isActive()) return;
    setBackgroundDraft(sanitizeVantaSettings(dashboard.vantaBackground));
    setShowVantaSettings(true);
  }

  function saveBackgroundSettings() {
    if (moderatorOperationGateRef.current.isActive()) return;
    flushPendingEditsInBackground();
    onVantaBackgroundChange(sanitizeVantaSettings(backgroundDraft));
    setShowVantaSettings(false);
  }

  function resetBackgroundSettings() {
    if (moderatorOperationGateRef.current.isActive()) return;
    const defaults = sanitizeVantaSettings();
    setBackgroundDraft(defaults);
    flushPendingEditsInBackground();
    onVantaBackgroundChange(defaults);
    setShowVantaSettings(false);
  }

  function changeBackgroundDraft(updates) {
    if (moderatorOperationGateRef.current.isActive()) return;
    setBackgroundDraft((current) => ({ ...current, ...updates }));
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
        setChartEditorVisible(false);
        setChartEditorPlacementId(null);
        setChartEditorDirty(false);
      },
    });
  }

  function cancelSelectedPanel() {
    if (moderatorOperationGateRef.current.isActive()) return;
    pendingEdits.cancel();
    if (chartEditBaseline) {
      onPanelEditCancel(chartEditBaseline);
    }
    setChartEditBaseline(null);
    setChartEditorVisible(false);
    setChartEditorPlacementId(null);
    setChartEditorDirty(false);
  }

  function dismissSelectedPanel() {
    if (moderatorOperationGateRef.current.isActive()) return;
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
  }

  function changeSection(section, updates) {
    changeSectionByIds(activePage.id, section.id, updates);
  }

  function changeDashboardText(updates) {
    if (moderatorOperationGateRef.current.isActive()) return;
    const nextDraft = { ...dashboardDraft, ...updates };
    setDashboardDraft(nextDraft);
    pendingEdits.schedule("dashboard", {
      type: "dashboard",
      updates: nextDraft,
    });
  }

  function commitStructureDraft(value) {
    return runModeratorTransaction({
      flush: () => pendingEdits.flush(),
      commit: () => onStructureChange?.(value),
    });
  }

  function commitScenarioDraft(value) {
    return runModeratorTransaction({
      flush: () => pendingEdits.flush(),
      commit: () => onDashboardChange?.({
        scenarioLabel: value.scenarioLabel,
        programLabel: value.programLabel,
        lastUpdated: value.lastUpdated,
      }),
      onCommitted: () => setDashboardDraft(dashboardTextDraftFromDashboard(value)),
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
  }

  function applyBackgroundSettings() {
    if (moderatorOperationGateRef.current.isActive()) return;
    flushPendingEditsInBackground();
    onVantaBackgroundChange(sanitizeVantaSettings(backgroundDraft));
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
  }

  function changeAccessibilityEnabled(enabled) {
    if (moderatorOperationGateRef.current.isActive()) return;
    flushPendingEditsInBackground();
    onDashboardChange({
      globalStyles: {
        ...(dashboard.globalStyles ?? {}),
        accessibility: { enabled },
      },
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
  }

  function addSection() {
    if (moderatorOperationGateRef.current.isActive() || !activePage) return;
    const targetSection = buildSelection?.kind === "section"
      ? activePage.sections?.find(({ id }) => id === buildSelection.sectionId)
      : activePage.sections?.at(-1);
    if (!targetSection) return;
    const sectionId = `${activePage.id}_section_${Date.now()}`;
    void performModeratorOperation("add-section", async () => {
      await pendingEdits.flush();
      await onSectionInsert(activePage.id, targetSection.id, null, {
        id: sectionId,
        title: "New section",
        description: "New dashboard section.",
      });
      setBuildSelection({
        kind: "section",
        pageId: activePage.id,
        sectionId,
      });
      setFocusInspectorLabelKey((current) => current + 1);
    });
  }

  function removeSectionTitle(section) {
    if (moderatorOperationGateRef.current.isActive()) return;
    flushPendingEditsInBackground();
    onSectionChange(activePage.id, section.id, { title: "", description: "" });
  }

  function removeActivePage(pageId = activePage?.id) {
    if (moderatorOperationGateRef.current.isActive()) return;
    if ((dashboard.pages ?? []).length <= 1) {
      return;
    }
    const page = dashboard.pages.find(({ id }) => id === pageId);
    if (!page || !window.confirm(`Remove the "${page.label}" tab?`)) {
      return;
    }

    const activeIndex = dashboard.pages.findIndex(({ id }) => id === pageId);
    const fallbackPage = dashboard.pages[activeIndex - 1] ?? dashboard.pages[activeIndex + 1] ?? dashboard.pages[0];
    flushPendingEditsInBackground();
    onPageRemove(pageId);
    onActivePageChange(fallbackPage.id);
    setBuildSelection({ kind: "page", pageId: fallbackPage.id });
  }

  function openPanelEditor(panelId) {
    const selection = selectionForPlacement(dashboard, panelId);
    if (selection) void requestBuildSelection(selection, { intent: "activate" });
  }

  function requestBuildSelection(nextSelection, { intent = "activate" } = {}) {
    if (
      moderatorOperationGateRef.current.isActive()
      || !isValidBuildSelection(dashboardStateRef.current, nextSelection)
    ) return Promise.resolve(false);
    const reactivatingCurrentChart = nextSelection.kind === "chart"
      && nextSelection.placementId === chartEditorPlacementId
      && intent === "activate";
    if (
      chartEditorDirty
      && !reactivatingCurrentChart
    ) {
      setBuildSelectionError("Finish or cancel the open chart editor before changing Page.");
      return Promise.resolve(false);
    }
    setBuildSelectionError("");
    if (reactivatingCurrentChart) {
      setChartEditorVisible(true);
      return Promise.resolve(true);
    }
    if (chartEditorPlacementId) {
      setChartEditorVisible(false);
      setChartEditorPlacementId(null);
      setChartEditBaseline(null);
      setChartEditorDirty(false);
    }
    if (nextSelection.kind === "timeGroup") {
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
    setPendingBuildSelection({ requestId, selection: nextSelection, intent });
    if (nextSelection.pageId && nextSelection.pageId !== activePage?.id) {
      void onActivePageChange(nextSelection.pageId);
    }
    return result;
  }

  function completeBuildReveal(requestId) {
    if (pendingBuildSelection?.requestId !== requestId) return;
    const { selection, intent } = pendingBuildSelection;
    if (selection.kind === "chart" && intent === "activate") {
      setChartEditBaseline(dashboardWithCurrentDrafts());
      setChartEditorPlacementId(selection.placementId);
      setChartEditorVisible(true);
      setChartEditorDirty(false);
    } else {
      setChartEditorVisible(false);
      setChartEditorPlacementId(null);
      setChartEditBaseline(null);
      setChartEditorDirty(false);
    }
    buildRevealResolversRef.current.get(requestId)?.(true);
    buildRevealResolversRef.current.delete(requestId);
    setPendingBuildSelection(null);
    setBuildRevealRequest(null);
  }

  async function renameBuildSelection(selection, value) {
    const title = value.trim();
    if (!title || !isValidBuildSelection(dashboardStateRef.current, selection)) return false;
    try {
      await pendingEdits.flush();
      if (selection.kind === "page") {
        changePage(selection.pageId, { label: title });
        await pendingEdits.flush();
        return true;
      }
      if (selection.kind === "section") {
        changeSectionByIds(selection.pageId, selection.sectionId, { title });
        await pendingEdits.flush();
        return true;
      }
    } catch (error) {
      setBuildSelectionError(boundedModeratorMessage(error));
      return false;
    }
    if (selection.kind !== "chart") return false;
    const placement = findPanelPlacement(dashboardStateRef.current, selection.placementId);
    if (!placement?.chart) return false;
    const result = await performModeratorOperation("rename-chart", async () => {
      await onChartSave({
        chart: structuredClone({ ...placement.chart, title }),
        timeSyncGroups: structuredClone(dashboardStateRef.current.timeSyncGroups ?? []),
      });
      return true;
    });
    return result === true;
  }

  function openChartWizard(sectionId) {
    if (moderatorOperationGateRef.current.isActive() || chartAuthoringActive) return;
    if (chartWizardSuspended && chartWizardSuspendedTarget) {
      setChartWizardTarget(chartWizardSuspendedTarget);
      setChartWizardSuspended(false);
      return;
    }
    const section = sectionId
      ? activePage?.sections?.find(({ id }) => id === sectionId)
      : buildSelection?.kind === "section"
      ? activePage?.sections?.find(({ id }) => id === buildSelection.sectionId)
      : activePage?.sections?.[0];
    if (!activePage || !section) return;
    setChartWizardTarget({ pageId: activePage.id, sectionId: section.id });
    setChartWizardSuspended(false);
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
    void performModeratorOperation("save-session", async () => {
      await onModeRequest("view");
      setChartEditBaseline(null);
    });
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
  }

  function resetEditMode() {
    if (moderatorOperationGateRef.current.isActive()) return;
    const cancelled = pendingEdits.takePending();
    const retryDrafts = {
      dashboard: structuredClone(dashboardDraft),
      pages: structuredClone(pageDrafts),
      sections: structuredClone(sectionDrafts),
    };
    void performModeratorOperation("reset-session", async () => {
      try {
        const resetDashboard = await onResetEditSession();
        pendingEdits.cancel();
        setDashboardDraft(dashboardTextDraftFromDashboard(resetDashboard ?? dashboard));
        setPageDrafts({});
        setSectionDrafts({});
        setChartEditBaseline(null);
        chartDraftSessionStore.clear(chartDraftSessionKey);
        setChartWizardTarget(null);
        setChartWizardDirty(false);
        setChartWizardSuspended(false);
        setChartWizardSuspendedTarget(null);
        setChartDraftSessionRevision((current) => current + 1);
        setLocalAuthoringDrafts({});
        setBuildTreeResetGeneration((current) => current + 1);
        setResetEditSessionConfirmation(false);
      } catch (error) {
        pendingEdits.restore(cancelled);
        scheduleRendererDrafts(retryDrafts);
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

  if (editMode && showVantaSettings) {
    return (
      <main className="app-shell background-editor-shell" style={iconLanguageStyles}>
        <section className="background-editor-bar">
          <VantaSettingsPanel settings={backgroundDraft} onChange={changeBackgroundDraft} />
          <div className="background-editor-actions">
            <IconControl interactionId="shell.apply-background" className="secondary" onClick={applyBackgroundSettings} />
            <IconControl interactionId="shell.save-background" onClick={saveBackgroundSettings} />
            <IconControl interactionId="shell.reset-background" className="secondary" onClick={resetBackgroundSettings} />
          </div>
        </section>
      </main>
    );
  }

  if (mode === "present") {
    return (
      <PresentWorkspace
        dashboard={dashboard}
        activePageId={activePage?.id}
        onActivePageChange={onActivePageChange}
        onModeRequest={onModeRequest}
        onOpenDashboardLook={onOpenDashboardLook}
        runtime={presentationRuntime}
        accessibilityEnabled={accessibilityEnabled}
        themeProjection={themeProjection}
      />
    );
  }

  if (!editMode) {
    return (
      <ViewShell
        activePage={activePage}
        pageType={landingActive ? "landing" : "analytical"}
        dashboard={dashboard}
        displayState={displayState}
        companionStatusLabel={companionStatusLabel}
        iconLanguageStyles={iconLanguageStyles}
        geoDataSources={geoDataSources}
        multiSelectMode={multiSelectMode}
        multiPanelIds={multiPanelIds}
        multiSelectNotice={multiSelectNotice}
        onActivePageChange={navigateToPage}
        onAddPanelToSection={recoverEmptySectionInBuild}
        onDisplayAction={onDisplayAction}
        onToggleMultiPanel={toggleMultiPanel}
        onStartMultiFullscreenSelection={startMultiFullscreenSelection}
        onOpenMultiFullscreen={openMultiFullscreen}
        onCancelMultiSelection={cancelMultiSelection}
      />
    );
  }

  const buildControlsDisabled = moderatorMutationLocked || chartAuthoringActive;
  const selectedChartEditor = selectedPanel ? (
    <ChartEditorV3
      surface="inspector"
      disabled={moderatorMutationLocked}
      chart={selectedPanel}
      timeSyncGroups={dashboard.timeSyncGroups ?? []}
      existingCharts={configuredCharts(dashboard)}
      rows={dashboard.loadedData?.[selectedPanel.sourceId] ?? []}
      geoData={geoDataSources[selectedPanel.presentation?.map?.geoSource]}
      geoDataSources={geoDataSources}
      dataSources={dashboard.dataSources ?? {}}
      profile={dashboard.datasetProfiles?.[selectedPanel.sourceId]}
      loadedData={dashboard.loadedData ?? {}}
      profiles={dashboard.datasetProfiles ?? {}}
      parsingMetadata={dashboard.dataSources?.[selectedPanel.sourceId]?.parsingMetadata ?? {}}
      onSave={saveSelectedChartV3}
      onApplyCitationToSourceCharts={onApplyCitationToSourceCharts}
      onCancel={cancelSelectedPanel}
      onDirtyChange={setChartEditorDirty}
      onRemove={() => removePanel(selectedPlacement.panelId)}
    />
  ) : null;
  return (
    <>
      <div className="build-mode-shell" style={iconLanguageStyles}>
        <BuildWorkspace
          key={buildTreeResetGeneration}
          themeProjection={themeProjection}
          dashboard={dashboard}
          activePage={activePage}
          pageType={landingActive ? "landing" : "analytical"}
          buildPanelOpen={buildPanelOpen}
          selection={buildSelection}
          dashboardDraft={dashboardDraft}
          pageDrafts={pageDrafts}
          sectionDrafts={sectionDrafts}
          chartEditor={selectedChartEditor}
          chartEditorPlacementId={chartEditorPlacementId}
          chartEditorOpen={chartEditorVisible}
          onCloseChartEditor={dismissSelectedPanel}
          chartDraftOpen={chartAuthoringActive}
          chartDraftDirty={chartEditorDirty}
          mutationsDisabled={moderatorMutationLocked}
          deviceLayout={deviceLayout}
          focusLabelKey={focusInspectorLabelKey}
          operationError={operationError || buildSelectionError || moderatorOperation.error}
          geoDataSources={geoDataSources}
          appearanceControls={(
            <>
              <GlobalPanelColorControls
                disabled={buildControlsDisabled}
                colors={globalPanelColors}
                onChange={changeGlobalPanelColors}
              />
              <GlobalIconAccentControl
                disabled={buildControlsDisabled}
                value={iconAccentVariants.base}
                onChange={changeIconAccent}
              />
              <label className="accessibility-edit-toggle">
                <input
                  type="checkbox"
                  disabled={buildControlsDisabled}
                  checked={accessibilityEnabled}
                  onChange={(event) => changeAccessibilityEnabled(event.target.checked)}
                />
                <span>Chart accessibility</span>
              </label>
            </>
          )}
          onActivePageChange={onActivePageChange}
          onActivate={requestBuildSelection}
          onRename={renameBuildSelection}
          onInlineRenameDirtyChange={handleInlineRenameDirtyChange}
          revealRequest={buildRevealRequest}
          treeResetGeneration={buildTreeResetGeneration}
          onRevealComplete={completeBuildReveal}
          onDashboardChange={changeDashboardText}
          onStructureCommit={commitStructureDraft}
          onScenarioCommit={commitScenarioDraft}
          onPageChange={changePage}
          onSectionChange={changeSection}
          onTimeGroupChange={onTimeGroupChange}
          onOpenSceneComposer={() => onModeRequest?.("present")}
          onPageReorder={reorderBuildPage}
          onSectionReorder={reorderBuildSection}
          onAddSection={addSection}
          onAddChart={openChartWizard}
          chartDraftAvailable={chartWizardSuspended}
          onFinish={saveEditMode}
          onReset={() => setResetEditSessionConfirmation(true)}
          onImportPackage={requestDashboardPackageImport}
          onExportPackage={exportDashboardPackage}
          onOpenBackground={openBackgroundSettings}
          onLocalDraftsChange={handleLocalDraftsChange}
          onDeviceLayoutChange={onDeviceLayoutChange}
          onDisplayAction={onDisplayAction}
        />
      </div>
      <ChartWizardV3
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
        timeSyncGroups={dashboard.timeSyncGroups ?? []}
        existingCharts={configuredCharts(dashboard)}
        onDirtyChange={setChartWizardDirty}
        onDraftStateChange={handleChartDraftStateChange}
        onSuspendedChange={(suspended) => {
          setChartWizardSuspended(suspended);
          setChartWizardSuspendedTarget(suspended ? chartWizardTarget : null);
        }}
        onClose={() => {
          if (!moderatorOperationGateRef.current.isActive()) setChartWizardTarget(null);
        }}
        onCreate={async (payload, reviewedPlacement) => {
          if (moderatorOperationGateRef.current.isActive()) {
            throw new Error("Wait for the current dashboard operation to finish.");
          }
          await pendingEdits.flush();
          await onChartCreate(payload, reviewedPlacement ?? chartWizardTarget);
          setChartWizardSuspended(false);
          setChartWizardSuspendedTarget(null);
          setChartWizardTarget(null);
        }}
      />
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
        title="Discard these edits?"
        message="Reset changes? All unsaved dashboard edits will be replaced by the most recently saved dashboard."
        cancelLabel="Keep editing"
        confirmLabel={moderatorOperation.kind === "reset-session" ? "Resetting..." : "Reset"}
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
          <img className="pdpc-header-mark" src={`${import.meta.env.BASE_URL}assets/pdpc-mark.png`} alt="" />
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
                <p className="subtitle">{activePage?.description ?? dashboard.description}</p>
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
              />
            )}
            {editMode && (
              <IconControl
                interactionId="shell.reset-edits"
                className="header-edit-floating-button secondary"
                ariaLabel={moderatorOperation.kind === "reset-session" ? "Resetting edits" : "Reset edits"}
                tooltip={moderatorOperation.kind === "reset-session" ? "Resetting edits" : "Reset edits"}
                data-icon-surface="dark"
                onClick={() => {
                  if (moderatorOperationGateRef.current.isActive()) return;
                  clearModeratorError("reset-session");
                  setResetEditSessionConfirmation(true);
                }}
                disabled={moderatorOperation.kind !== null}
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
            <IconControl interactionId="shell.import" disabled={moderatorMutationLocked} onClick={() => importInputRef.current?.click()} />
            <IconControl interactionId="shell.export" disabled={moderatorMutationLocked} onClick={() => onExportConfig(dashboardWithCurrentDrafts())} />
            <GlobalPanelColorControls disabled={moderatorMutationLocked} colors={globalPanelColors} onChange={changeGlobalPanelColors} />
            <GlobalIconAccentControl
              disabled={moderatorMutationLocked}
              value={iconAccentVariants.base}
              onChange={changeIconAccent}
            />
            <label className="accessibility-edit-toggle">
              <input
                type="checkbox"
                disabled={moderatorMutationLocked}
                checked={accessibilityEnabled}
                onChange={(event) => changeAccessibilityEnabled(event.target.checked)}
              />
              <span>
                Chart accessibility
                <small>Generate screen-reader chart descriptions</small>
              </span>
            </label>
            <IconControl interactionId="shell.background" className="secondary" disabled={moderatorMutationLocked} onClick={openBackgroundSettings} />
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
            timeSyncGroups={dashboard.timeSyncGroups ?? []}
            existingCharts={configuredCharts(dashboard)}
            rows={dashboard.loadedData?.[selectedPanel.sourceId] ?? []}
            geoData={geoDataSources[selectedPanel.presentation?.map?.geoSource]}
            geoDataSources={geoDataSources}
            dataSources={dashboard.dataSources ?? {}}
            profile={dashboard.datasetProfiles?.[selectedPanel.sourceId]}
            loadedData={dashboard.loadedData ?? {}}
            profiles={dashboard.datasetProfiles ?? {}}
            parsingMetadata={dashboard.dataSources?.[selectedPanel.sourceId]?.parsingMetadata ?? {}}
            onSave={saveSelectedChartV3}
            onApplyCitationToSourceCharts={onApplyCitationToSourceCharts}
            onCancel={cancelSelectedPanel}
            onRemove={() => removePanel(selectedPlacement.panelId)}
          />
        )}
      </section>
      </PlaybackSurface>
      <ChartWizardV3
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
        timeSyncGroups={dashboard.timeSyncGroups ?? []}
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
          setChartWizardSuspended(false);
          setChartWizardSuspendedTarget(null);
          setChartWizardTarget(null);
        }}
      />
      <ConfirmDialog
        open={resetEditSessionConfirmation}
        title="Discard these edits?"
        message="Reset changes? All unsaved dashboard edits will be replaced by the most recently saved dashboard."
        cancelLabel="Keep editing"
        confirmLabel={moderatorOperation.kind === "reset-session" ? "Resetting..." : "Reset edits"}
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
          interactionId="shell.reset-background"
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

function VantaSettingsPanel({ settings = {}, onChange }) {
  const resolved = sanitizeVantaSettings(settings);
  return (
    <div className="vanta-settings-panel">
      <label>
        Color scheme
        <select
          value={resolved.colorScheme ?? "manual"}
          onChange={(event) => {
            const scheme = event.target.value;
            const colors = backgroundPaletteColors(scheme);
            onChange({
              colorScheme: scheme,
              ...(colors ? { backgroundColor: colors[0], networkColor: colors[1] } : {}),
            });
          }}
        >
          {BACKGROUND_COLOR_SCHEMES.map((scheme) => <option key={scheme.value} value={scheme.value}>{scheme.label}</option>)}
        </select>
      </label>
      <div className="color-scheme-preview" aria-label="Background color scheme preview">
        {(backgroundPaletteColors(resolved.colorScheme) ?? [resolved.backgroundColor, resolved.networkColor]).map((color, index) => <span key={`${color}-${index}`} style={{ backgroundColor: color }} />)}
      </div>
      <ColorField label="Static background" value={resolved.backgroundColor} fallback="#08224a" onChange={(color) => onChange({ backgroundColor: color, colorScheme: "manual" })} />
      <ColorField label="Line/dot color" value={resolved.networkColor} fallback="#9bd3ff" onChange={(color) => onChange({ networkColor: color, colorScheme: "manual" })} />
      <RangeSetting label="Points" value={resolved.points} min={3} max={18} step={1} onChange={(points) => onChange({ points })} />
      <RangeSetting label="Max distance" value={resolved.maxDistance} min={8} max={32} step={1} onChange={(maxDistance) => onChange({ maxDistance })} />
      <RangeSetting label="Spacing" value={resolved.spacing} min={10} max={34} step={1} onChange={(spacing) => onChange({ spacing })} />
      <RangeSetting label="Motion speed" value={resolved.speed} min={0.1} max={2} step={0.05} onChange={(speed) => onChange({ speed })} />
      <label className="checkbox-row"><input type="checkbox" checked={resolved.mouseControls} onChange={(event) => onChange({ mouseControls: event.target.checked })} />Mouse tracking</label>
    </div>
  );
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

function RangeSetting({ label, value, min, max, step, onChange }) {
  return (
    <label className="range-setting">
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <output>{value}</output>
    </label>
  );
}

function sanitizeVantaSettings(settings) {
  const merged = {
    backgroundColor: "#f7f9fc",
    networkColor: "#f1a1ad",
    mouseControls: false,
    touchControls: false,
    points: 6,
    maxDistance: 17,
    spacing: 18,
    speed: 0.45,
    ...settings,
  };
  return {
    ...merged,
    points: clampNumber(merged.points, 3, 18),
    maxDistance: clampNumber(merged.maxDistance, 8, 32),
    spacing: clampNumber(merged.spacing, 10, 34),
    speed: clampNumber(merged.speed, 0.1, 2),
  };
}

const BACKGROUND_COLOR_SCHEMES = [
  { value: "manual", label: "Manual colors" },
  { value: "pdpc", label: "PDPC mixed" },
  { value: "redGreen5", label: "Likert red to green" },
  { value: "likertInfographic5", label: "Likert infographic" },
  { value: "caseIntensity", label: "Case intensity" },
  { value: "blueYellow5", label: "Likert blue to yellow" },
  { value: "cool", label: "Cool blues/teals" },
  { value: "warm", label: "Warm alert" },
];

function backgroundPaletteColors(scheme) {
  const palettes = {
    pdpc: ["#08224A", "#043BCB", "#36BDEB", "#2BAA7B", "#F1A1AD"],
    redGreen5: ["#D71920", "#FDAE61", "#FFFFBF", "#A6D96A", "#1A9641"],
    likertInfographic5: ["#3BA64A", "#A7B734", "#F6A21A", "#F47B20", "#DF1F2D"],
    caseIntensity: ["#7FDEC1", "#4496D1", "#043BCB", "#08224A", "#8F1D2C"],
    blueYellow5: ["#2C7BB6", "#ABD9E9", "#FFFFBF", "#FDAE61", "#D7191C"],
    cool: ["#08224A", "#2456A6", "#4496D1", "#007C89", "#7FDEC1"],
    warm: ["#8F1D2C", "#C98700", "#F3D37A", "#E16B5A", "#08224A"],
  };
  return palettes[scheme];
}

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return min;
  }
  return Math.min(Math.max(number, min), max);
}

export function validatedGeoDataSources(dashboard = {}) {
  const result = Object.create(null);
  for (const [sourceId, source] of Object.entries(dashboard.dataSources ?? {})) {
    if (source?.kind !== "geojson") continue;
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

function isValidBuildSelection(dashboard, selection) {
  if (!selection?.kind) return false;
  if (selection.kind === "timeGroup") {
    return (dashboard.timeSyncGroups ?? []).some(({ id }) => id === selection.groupId);
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







