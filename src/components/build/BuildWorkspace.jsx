import React from "react";
import { createPortal } from "react-dom";

import BuildCommandHeader from "./BuildCommandHeader.jsx";
import BuildInspector from "./BuildInspector.jsx";
import BuildStructureRail from "./BuildStructureRail.jsx";
import {
  captureBuildCanvasState,
  restoreBuildCanvasState,
  selectedTargetRevealDecision,
  selectedTargetUsability,
} from "./buildCanvasRestoration.js";
import {
  collectChartPlacements,
  compatibleUnitOrbitCapabilities,
} from "./panelEditingModel.js";
import UnitOrbit, { revealUnitOrbitAnchor } from "./UnitOrbit.jsx";
import SceneEditor from "../time/SceneEditor.jsx";
import {
  buildTemporalChartVariables,
  describeTemporalInterpolationSupport,
} from "../time/temporalAuthoringData.js";
import {
  createSceneDraft,
  reduceSceneDraft,
} from "../time/sceneDraft.js";
import ChronoStudio from "../time/ChronoStudio.jsx";
import ChronoGroupContent from "../time/ChronoGroupContent.jsx";
import SceneLibrary from "../time/SceneLibrary.jsx";
import SceneContent from "../time/SceneContent.jsx";
import {
  createChronoContentState,
  reduceChronoContent,
  selectChronoGroupContent,
  selectChronoStudioCards,
  selectSceneContent,
  selectSceneStudioSections,
  selectTemporalDraftOwners,
  withTemporalOwnerScope,
} from "../time/chronoContentState.js";
import ChronoGroupEditor from "../time/ChronoGroupEditor.jsx";
import {
  hasActiveLocalAuthoringDrafts,
  hasEditingLocalAuthoringDrafts,
} from "./buildDirtyState.js";
import { deriveTemporalContentItems } from "../../charting/time/temporalNeedsAttention.js";
import {
  clearChronoGroupReviewForSave,
  clearSceneReviewForSave,
} from "../../charting/time/temporalReview.js";
import {
  createChronoGroupDraft,
  reduceChronoGroupDraft,
  toSavedChronoGroup,
} from "../time/chronoGroupDraft.js";
import { dashboardThemeRootProps } from "../../theme/dashboardThemeRoot.js";
import {
  createBuildDraftCoordinatorState,
  reduceBuildDraftCoordinator,
} from "./buildDraftCoordinator.js";
import { selectBuildPendingWork } from "./buildPendingWork.js";
import { getChartSchema } from "../../charting/schemas/chartSchemaRegistry.js";
import SourceContentWorkspace, { createSourceContentViewState } from "../source-content/SourceContentWorkspace.jsx";
import RightSideDrawer from "../common/RightSideDrawer.jsx";

export default function BuildWorkspace({
  themeProjection,
  dashboard,
  contentDraftCoordinator = null,
  onContentDraftStage,
  onContentDraftCommit,
  onContentDraftDiscard,
  activePage,
  buildPanelOpen = false,
  onCloseDashboardMap,
  selection,
  dashboardDraft,
  pageDrafts,
  sectionDrafts,
  chartEditor,
  chartEditorPlacementId = null,
  chartEditorOpen = true,
  onCloseChartEditor,
  onResumeChartEditor,
  chartDraftOpen = false,
  mutationsDisabled = false,
  accessibilityEnabled = false,
  deviceLayout,
  focusLabelKey,
  operationError = "",
  geoDataSources,
  onActivePageChange,
  onActivate,
  onRename,
  onInlineRenameDirtyChange,
  onLayoutMove,
  revealRequest = null,
  treeResetGeneration = 0,
  onRevealComplete,
  onDashboardChange,
  onAccessibilityChange,
  onStructureCommit,
  onPageChange,
  onPageRemove,
  onSectionChange,
  onAddChart,
  onAddStaticContent,
  layoutDraft = null,
  chartSlotDraft = null,
  chartOwners = [],
  owners = [],
  authoredDirtyState = {},
  pendingWorkResumeActions = {},
  pendingWorkOwnerActions = {},
  onSaveLayout,
  onDiscardLayout,
  onFinish,
  onReset,
  onLocalDraftsChange,
  onDisplayAction,
  selectionControllerRef,
  exportResolutionControllerRef,
}) {
  const [mapRegion, setMapRegion] = React.useState("structure");
  const [draftCoordinator, dispatchDraftCoordinator] = React.useReducer(
    reduceBuildDraftCoordinator,
    { layoutDraft, chartSlotDraft },
    ({ layoutDraft: initialLayout, chartSlotDraft: initialChart }) => {
      let state = createBuildDraftCoordinatorState();
      if (initialLayout) state = reduceBuildDraftCoordinator(state, { type: "OPEN_SLOT", slot: "layout", draft: initialLayout });
      if (initialChart) state = reduceBuildDraftCoordinator(state, { type: "OPEN_SLOT", slot: "chart", draft: initialChart });
      return state;
    },
  );
  const activeAuxiliary = draftCoordinator.activeAuxiliary?.surface ?? null;
  const parkedAuxiliaries = draftCoordinator.parkedAuxiliaries;
  const [sourceContentViewState, setSourceContentViewState] = React.useState(() => createSourceContentViewState());
  const [sourceContentOwners, setSourceContentOwners] = React.useState([]);
  const [retainedSourceContentOwners, setRetainedSourceContentOwners] = React.useState([]);
  const sourceContentControllerRef = React.useRef(null);
  const [chronoGroupDraft, setChronoGroupDraft] = React.useState(null);
  const [sceneDraft, setSceneDraft] = React.useState(null);
  const [chronoContentState, setChronoContentState] = React.useState(null);
  const temporalSurfaceActive = activeAuxiliary === "chrono-group"
    || activeAuxiliary === "scene";
  const renderedAuxiliary = temporalSurfaceActive
    ? (chronoContentState?.studio === "scene" ? "scene" : "chrono-group")
    : activeAuxiliary;
  const sourceContentSaving = sourceContentOwners.some(({ status }) => status === "saving");
  const temporalCharts = React.useMemo(
    () => temporalSurfaceActive ? temporalAuthoringCharts(dashboard) : [],
    [dashboard, temporalSurfaceActive],
  );
  const temporalContentItems = React.useMemo(
    () => temporalSurfaceActive
      ? deriveTemporalContentItems({ dashboard, charts: temporalCharts })
      : [],
    [dashboard, temporalCharts, temporalSurfaceActive],
  );
  const temporalFindings = React.useMemo(() => temporalContentItems.flatMap((item) => (
    item.needsAttention ?? []
  ).map((finding) => ({
    ...finding,
    itemType: item.type === "scene" ? "scene" : "chronoGroup",
    itemId: item.id,
  }))), [temporalContentItems]);
  const localAuthoringDrafts = React.useMemo(() => ({
    chronoGroup: chronoGroupDraft,
    scene: sceneDraft,
  }), [sceneDraft, chronoGroupDraft]);
  const temporalOwners = React.useMemo(
    () => selectTemporalDraftOwners(localAuthoringDrafts),
    [localAuthoringDrafts],
  );
  const localAuthoringDirty = hasActiveLocalAuthoringDrafts(localAuthoringDrafts);
  const localAuthoringEditing = hasEditingLocalAuthoringDrafts(localAuthoringDrafts);
  const locked = mutationsDisabled || chartDraftOpen;
  const auxiliaryLocked = mutationsDisabled || (chartDraftOpen && !chartEditorPlacementId);
  const mutationDisabledReason = mutationsDisabled
    ? "Wait for the current dashboard operation to finish."
    : chartDraftOpen
      ? "Finish or cancel the open chart draft."
      : "";
  const auxiliaryDisabledReason = mutationsDisabled
    ? "Wait for the current dashboard operation to finish."
    : auxiliaryLocked
      ? "Finish or cancel the open chart draft."
      : "";
  const navigationLocked = mutationsDisabled || localAuthoringEditing;
  const selectedChartItem = selection?.kind === "chart"
    ? collectChartPlacements(dashboard).find(({ placementId }) => placementId === selection.placementId)
    : null;
  const selectedChart = selectedChartItem?.chart ?? null;
  const unitOrbitCapabilities = compatibleUnitOrbitCapabilities(selectedChartItem);
  const inspectorFocusKey = mapRegion === "inspector" ? focusLabelKey : 0;

  React.useEffect(() => {
    onLocalDraftsChange?.(localAuthoringDrafts);
  }, [localAuthoringDrafts, onLocalDraftsChange]);

  React.useEffect(() => {
    dispatchDraftCoordinator({ type: "SYNC_SLOT", slot: "layout", draft: layoutDraft });
  }, [layoutDraft]);

  React.useEffect(() => {
    dispatchDraftCoordinator({ type: "SYNC_SLOT", slot: "chart", draft: chartSlotDraft });
  }, [chartSlotDraft]);

  React.useEffect(() => {
    if (!temporalSurfaceActive) return;
    setChronoContentState((current) => current === null ? current : reduceChronoContent(current, {
      type: "REFRESH_CONTENT",
      chronoGroups: dashboard.chronoGroups ?? [],
      scenes: dashboard.scenes ?? [],
      pages: dashboard.pages ?? [],
      findings: temporalFindings,
    }));
  }, [dashboard.chronoGroups, dashboard.pages, dashboard.scenes, temporalFindings, temporalSurfaceActive]);

  React.useEffect(() => {
    if (focusLabelKey <= 0 || selection?.kind === "chart") return;
    setMapRegion("inspector");
  }, [focusLabelKey, selection?.kind]);

  const chooseSelection = (next, options) => {
    if (
      navigationLocked
      && !buildSelectionAllowedWhileLocked(selection, next, options)
    ) return Promise.resolve(false);
    if (next.kind === "chronoGroup" && (dashboard.chronoGroups ?? []).some(({ id }) => id === next.chronoGroupId)) {
      openAuxiliary("chrono-group");
      const library = createChronoContentState({
        chronoGroups: dashboard.chronoGroups ?? [],
        scenes: dashboard.scenes ?? [],
        pages: dashboard.pages ?? [],
        findings: temporalFindings,
        studio: "chrono",
      });
      setChronoContentState(reduceChronoContent(library, {
        type: "OPEN_CONTENT",
        itemType: "chronoGroup",
        itemId: next.chronoGroupId,
      }));
    }
    return onActivate?.(next, options) ?? Promise.resolve(false);
  };
  if (selectionControllerRef) selectionControllerRef.current = chooseSelection;
  React.useEffect(() => () => {
    if (selectionControllerRef?.current === chooseSelection) {
      selectionControllerRef.current = null;
    }
  }, [chooseSelection, selectionControllerRef]);

  React.useEffect(() => {
    if (!revealRequest) return undefined;
    let cancelled = false;
    let frame = 0;
    let attempts = 0;
    const { id, selection } = revealRequest;
    const escaped = (value) => CSS.escape(String(value));
    const selector = selection.kind === "section"
      ? `[data-canonical-section-id="${escaped(selection.sectionId)}"]`
      : selection.kind === "chart"
        ? `[data-canonical-placement-id="${escaped(selection.placementId)}"]`
        : `[data-canonical-canvas-id="${escaped(selection.pageId)}"]`;
    const reveal = () => {
      if (cancelled) return;
      const target = document.querySelector(selector);
      if (!target) {
        frame = window.requestAnimationFrame(reveal);
        return;
      }
      const rect = target.getBoundingClientRect();
      const revealDecision = selectedTargetRevealDecision({
        targetRect: rect,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        attempts,
      });
      if (revealDecision.shouldScroll) {
        target.scrollIntoView({
          block: selection.kind === "chart" ? "center" : "start",
          inline: "nearest",
          behavior: revealRequest.behavior,
        });
      }
      attempts += 1;
      if (revealDecision.complete) {
        onRevealComplete?.(id);
        return;
      }
      if (attempts < 90) frame = window.requestAnimationFrame(reveal);
    };
    frame = window.requestAnimationFrame(reveal);
    return () => {
      cancelled = true;
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [onRevealComplete, revealRequest]);
  const captureRestoration = React.useCallback(() => ({
    ...captureBuildCanvasState({
      layout: dashboard,
      selection,
      focusId: document.activeElement?.id || null,
      scrollTop: window.scrollY,
      scrollLeft: window.scrollX,
      effectiveCanvasWidth: document.querySelector(".canonical-dashboard-frame")?.clientWidth ?? window.innerWidth,
    }),
    activeCommand: activeAuxiliary,
    chartEditorOpen: Boolean(chartEditorPlacementId && chartEditorOpen),
  }), [activeAuxiliary, chartEditorOpen, chartEditorPlacementId, dashboard, selection]);

  const restoreCanvas = React.useCallback((restoration) => {
    if (!restoration) return;
    let commands;
    try {
      commands = restoreBuildCanvasState(restoration, dashboard);
    } catch {
      return;
    }
    const restoredSelection = commands.selection
      ? chooseSelection(commands.selection, { intent: "restore" })
      : Promise.resolve(true);
    void Promise.resolve(restoredSelection).catch(() => false).then(() => {
      window.requestAnimationFrame(() => {
        if (restoration.chartEditorOpen) onResumeChartEditor?.();
        window.scrollTo({ top: commands.scrollTop, left: commands.scrollLeft, behavior: "auto" });
        if (commands.focusId) document.getElementById(commands.focusId)?.focus();
      });
    });
  }, [dashboard, onResumeChartEditor, chooseSelection]);

  const initializeAuxiliary = (surface) => {
    if (surface === "chrono-group") {
      const resumingDraft = chronoGroupDraft?.status === "suspended";
      setChronoGroupDraft((current) => current?.status === "suspended"
        ? reduceChronoGroupDraft(current, { type: "RESUME" })
        : current);
      if (!resumingDraft) setChronoContentState((current) => current
        ? reduceChronoContent(current, { type: "SET_STUDIO", studio: "chrono" })
        : createChronoContentState({
          chronoGroups: dashboard.chronoGroups ?? [],
          scenes: dashboard.scenes ?? [],
          pages: dashboard.pages ?? [],
          findings: temporalFindings,
          studio: "chrono",
          pageId: null,
        }));
    }
    if (surface === "scene") {
      const resumingDraft = sceneDraft?.status === "suspended";
      setSceneDraft((current) => current?.status === "suspended"
        ? reduceSceneDraft(current, { type: "RESUME" })
        : current);
      if (!resumingDraft) setChronoContentState((current) => current
        ? reduceChronoContent(current, { type: "SET_STUDIO", studio: "scene" })
        : createChronoContentState({
          chronoGroups: dashboard.chronoGroups ?? [],
          scenes: dashboard.scenes ?? [],
          pages: dashboard.pages ?? [],
          findings: temporalFindings,
          studio: "scene",
          pageId: null,
        }));
    }
  };

  const openAuxiliary = (surface) => {
    if (auxiliaryLocked || activeAuxiliary === surface) return;
    if (surface === "source-content" && sourceContentOwners.length > 0) {
      const parked = parkedAuxiliaries.find((entry) => entry.surface === surface);
      if (parked) {
        initializeAuxiliary(surface);
        dispatchDraftCoordinator({ type: "RESUME_AUXILIARY", session: parked });
        sourceContentControllerRef.current?.resume(sourceContentOwners[0]?.draftId);
        return;
      }
    }
    initializeAuxiliary(surface);
    const restoration = captureRestoration();
    dispatchDraftCoordinator({
      type: "OPEN_AUXILIARY",
      session: {
        surface,
        draftId: `auxiliary-${surface}`,
        dirty: false,
        mutationCapable: false,
        restoration,
      },
    });
    if (restoration.chartEditorOpen) onCloseChartEditor?.();
    window.requestAnimationFrame(() => {
      const selected = selection?.placementId
        ? document.querySelector(`[data-canonical-placement-id="${CSS.escape(selection.placementId)}"]`)
        : null;
      const usability = selectedTargetUsability({
        targetRect: selected?.getBoundingClientRect() ?? null,
        viewport: { width: window.innerWidth, height: window.innerHeight },
      });
      if (!usability.usable) selected?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "auto" });
    });
  };

  const closeAuxiliary = () => {
    if (renderedAuxiliary === "source-content" && sourceContentSaving) return;
    const restoration = captureRestoration();
    if (renderedAuxiliary === "chrono-group" && hasActiveLocalAuthoringDrafts({ chronoGroup: chronoGroupDraft })) {
      setChronoGroupDraft((current) => reduceChronoGroupDraft(current, {
        type: "SUSPEND",
        restoration: { ...restoration, stage: current.stage },
      }));
    }
    if (renderedAuxiliary === "scene" && hasActiveLocalAuthoringDrafts({ scene: sceneDraft })) {
      setSceneDraft((current) => reduceSceneDraft(current, {
        type: "SUSPEND",
        restoration: { ...restoration, stage: current.stage },
      }));
    }
    const currentSession = draftCoordinator.activeAuxiliary;
    if (renderedAuxiliary === "source-content" && currentSession && sourceContentOwners.length > 0) {
      const sourceRestoration = sourceContentControllerRef.current?.suspend() ?? restoration;
      dispatchDraftCoordinator({
        type: "PARK_AUXILIARY",
        session: {
          ...currentSession,
          dirty: true,
          status: "suspended",
          restoration: sourceRestoration,
        },
      });
      restoreCanvas(currentSession.restoration ?? restoration);
      return;
    }
    if (currentSession) dispatchDraftCoordinator({
      type: "CLOSE_AUXILIARY",
      draftId: currentSession.draftId,
      choice: "discard",
    });
    restoreCanvas(currentSession?.restoration ?? restoration);
  };

  const resumeAuxiliary = (surface, draftId = null) => {
    if (activeAuxiliary === surface) return;
    const parked = parkedAuxiliaries.find((entry) => (
      entry.surface === surface && (draftId === null || entry.draftId === draftId)
    ));
    if (!parked) {
      openAuxiliary(surface);
      return;
    }
    initializeAuxiliary(surface);
    dispatchDraftCoordinator({ type: "RESUME_AUXILIARY", session: parked });
    if (surface === "source-content") {
      sourceContentControllerRef.current?.resume(sourceContentOwners[0]?.draftId);
    }
    restoreCanvas(parked.restoration);
  };

  const effectiveAuthoredDirtyState = {
    ...authoredDirtyState,
    chronoGroup: authoredDirtyState.chronoGroup === true
      || hasActiveLocalAuthoringDrafts({ chronoGroup: chronoGroupDraft }),
    scene: authoredDirtyState.scene === true
      || hasActiveLocalAuthoringDrafts({ scene: sceneDraft }),
  };
  const discardPendingLayout = () => {
    onDiscardLayout?.();
    revealUnitOrbitAnchor(chartEditorPlacementId);
  };
  const exportResolutionController = {
    resolve(issueId) {
      const surface = ({
        "chrono-group": "chrono-group",
        scene: "scene",
      })[issueId];
      if (!surface) return false;
      if (activeAuxiliary === surface) return true;
      if (parkedAuxiliaries.some((entry) => entry.surface === surface)) {
        resumeAuxiliary(surface);
      } else {
        openAuxiliary(surface);
      }
      return true;
    },
  };
  if (exportResolutionControllerRef) {
    exportResolutionControllerRef.current = exportResolutionController;
  }
  React.useEffect(() => () => {
    if (exportResolutionControllerRef?.current === exportResolutionController) {
      exportResolutionControllerRef.current = null;
    }
  }, [exportResolutionController, exportResolutionControllerRef]);

  const commitTemporalContent = (updates) => onStructureCommit?.({
    pages: dashboard.pages,
    chronoGroups: updates.chronoGroups ?? dashboard.chronoGroups ?? [],
    scenes: updates.scenes ?? dashboard.scenes ?? [],
  });

  const dispatchChronoGroup = (action) => {
    if (action.type === "SAVE_REQUEST") {
      const saving = reduceChronoGroupDraft(chronoGroupDraft, action);
      setChronoGroupDraft(saving);
      if (saving.status !== "saving") return;
      const savedGroup = clearChronoGroupReviewForSave(toSavedChronoGroup(saving));
      const chronoGroups = mergeChronoGroup(dashboard.chronoGroups ?? [], savedGroup, temporalCharts);
      const duplicateSourceId = chronoContentState?.operation?.intent === "duplicate"
        ? chronoContentState.operation.itemId
        : null;
      const duplicatedScenes = duplicateSourceId
        ? (dashboard.scenes ?? []).filter(({ chronoGroupId }) => chronoGroupId === duplicateSourceId).map((scene) => ({
          ...structuredClone(scene),
          id: stableDraftId("scene"),
          name: `Copy of ${scene.name}`,
          chronoGroupId: savedGroup.id,
        }))
        : [];
      const scenes = [...(dashboard.scenes ?? []), ...duplicatedScenes];
      Promise.resolve(commitTemporalContent({ chronoGroups, scenes }))
        .then(() => {
          setChronoGroupDraft((current) => reduceChronoGroupDraft(current, { type: "SAVE_SUCCEEDED", savedValue: savedGroup }));
          setChronoContentState((current) => completeContentOperation(current, { chronoGroups, scenes }, "chronoGroup", savedGroup.id));
        })
        .catch((error) => setChronoGroupDraft((current) => reduceChronoGroupDraft(current, {
          type: "SAVE_FAILED",
          error: storageFacingError(error, "CHRONO_GROUP_SAVE_FAILED"),
        })));
      return;
    }
    if (action.type === "DISCARD") {
      setChronoGroupDraft((current) => reduceChronoGroupDraft(current, action));
      setChronoContentState((current) => reduceChronoContent(current, { type: "RETURN_TO_CONTENT" }));
      return;
    }
    setChronoGroupDraft((current) => reduceChronoGroupDraft(current, action));
  };

  const dispatchScene = (action) => {
    if (action.type === "SAVE_REQUEST") {
      const saving = reduceSceneDraft(sceneDraft, action);
      setSceneDraft(saving);
      if (saving.status !== "saving") return;
      const savedScene = clearSceneReviewForSave(saving.value);
      const scenes = mergeScene(dashboard.scenes ?? [], savedScene);
      Promise.resolve(commitTemporalContent({ scenes }))
        .then(() => {
          setSceneDraft((current) => reduceSceneDraft(current, { type: "SAVE_SUCCEEDED", savedValue: savedScene }));
          setChronoContentState((current) => completeContentOperation(current, { scenes }, "scene", savedScene.id));
        })
        .catch((error) => setSceneDraft((current) => reduceSceneDraft(current, {
          type: "SAVE_FAILED",
          error: storageFacingError(error, "SCENE_SAVE_FAILED"),
        })));
      return;
    }
    if (action.type === "DISCARD") {
      setSceneDraft((current) => reduceSceneDraft(current, action));
      setChronoContentState((current) => reduceChronoContent(current, { type: "RETURN_TO_CONTENT" }));
      return;
    }
    setSceneDraft((current) => reduceSceneDraft(current, action));
  };

  const dispatchChronoContent = (action) => {
    if (action.type === "REQUEST_REMOVE") {
      const itemType = action.itemType ?? chronoContentState.selectedItemType;
      const itemId = action.itemId ?? chronoContentState.selectedItemId;
      const groupScenes = itemType === "chronoGroup" ? (dashboard.scenes ?? []).filter(({ chronoGroupId }) => chronoGroupId === itemId) : [];
      const message = itemType === "chronoGroup"
        ? `Remove this Chrono Group and ${groupScenes.length} child ${groupScenes.length === 1 ? "Scene" : "Scenes"}?`
        : "Remove this Scene?";
      if (!window.confirm(message)) return;
      const chronoGroups = itemType === "chronoGroup" ? (dashboard.chronoGroups ?? []).filter(({ id }) => id !== itemId) : (dashboard.chronoGroups ?? []);
      const scenes = itemType === "chronoGroup"
        ? (dashboard.scenes ?? []).filter(({ chronoGroupId }) => chronoGroupId !== itemId)
        : (dashboard.scenes ?? []).filter(({ id }) => id !== itemId);
      setChronoContentState((current) => ({ ...current, operation: { intent: "remove", itemType, itemId, status: "saving" }, error: null }));
      Promise.resolve(commitTemporalContent({ chronoGroups, scenes }))
        .then(() => setChronoContentState((current) => reduceChronoContent(current, { type: "OPERATION_SUCCEEDED", chronoGroups, scenes, returnToContent: false })))
        .catch((error) => setChronoContentState((current) => reduceChronoContent(current, { type: "OPERATION_FAILED", error: storageFacingError(error, "TEMPORAL_REMOVE_FAILED") })));
      return;
    }
    const next = reduceChronoContent(chronoContentState, action);
    setChronoContentState(next);
    if (next.conflict || next.view !== "editor" || !next.operation) return;
    const { itemType, itemId, intent, parentChronoGroupId } = next.operation;
    if (itemType === "chronoGroup") {
      const group = dashboard.chronoGroups?.find(({ id }) => id === itemId);
      const source = intent === "create" ? null : group;
      const input = chronoGroupDraftInput(dashboard, temporalCharts, source);
      if (intent === "duplicate") {
        input.group.id = stableDraftId("chrono-group");
        input.group.name = `Copy of ${input.group.name}`;
      }
      setChronoGroupDraft(withTemporalOwnerScope(
        createChronoGroupDraft({ ...input, initialStage: "period" }),
        "chrono",
        draftCoordinator.activeAuxiliary?.draftId ?? "auxiliary-chrono-group",
        { intent },
      ));
    }
    if (itemType === "scene") {
      const existing = dashboard.scenes?.find(({ id }) => id === itemId);
      const source = intent === "create" ? initialScene(dashboard, activePage?.id) : existing;
      const value = structuredClone(source ?? initialScene(dashboard, activePage?.id));
      if (intent === "duplicate") {
        value.id = stableDraftId("scene");
        value.name = `Copy of ${value.name}`;
      }
      let nextDraft = createSceneDraft(value, sceneValidationContext(dashboard));
      if (parentChronoGroupId) nextDraft = reduceSceneDraft(nextDraft, { type: "SET_CHRONO_GROUP", chronoGroupId: parentChronoGroupId });
      if (next.operation.stage) nextDraft = reduceSceneDraft(nextDraft, { type: "SET_STAGE", stage: next.operation.stage });
      nextDraft = withTemporalOwnerScope(
        {
          ...nextDraft,
          restoration: next.operation.focusId
            ? { stage: next.operation.stage, focusId: next.operation.focusId, scrollTop: 0 }
            : nextDraft.restoration,
        },
        "scene",
        draftCoordinator.activeAuxiliary?.draftId ?? "auxiliary-scene",
        { intent },
      );
      setSceneDraft(nextDraft);
    }
  };

  const temporalOwnerActions = Object.fromEntries(temporalOwners.map((owner) => {
    const surface = owner.kind === "chrono" ? "chrono-group" : "scene";
    const dispatch = owner.kind === "chrono" ? dispatchChronoGroup : dispatchScene;
    const activate = () => {
      if (activeAuxiliary !== surface) {
        resumeAuxiliary(surface, owner.scopeId);
        return;
      }
      const focusId = owner.restoration?.focusId;
      if (focusId) window.requestAnimationFrame(() => document.getElementById(focusId)?.focus());
    };
    return [owner.draftId, {
      focus: activate,
      resume: activate,
      save: () => dispatch({ type: "SAVE_REQUEST" }),
      discard: () => dispatch({ type: "DISCARD" }),
    }];
  }));
  const sourceContentOwnerActions = Object.fromEntries(sourceContentOwners.map((owner) => [owner.draftId, {
    focus: () => sourceContentControllerRef.current?.focus(owner.draftId),
    resume: () => {
      resumeAuxiliary("source-content");
      sourceContentControllerRef.current?.resume(owner.draftId);
    },
    discard: async () => {
      const result = await sourceContentControllerRef.current?.discard(owner.draftId);
      if (sourceContentOwners.length === 1) {
        const session = draftCoordinator.activeAuxiliary?.surface === "source-content"
          ? draftCoordinator.activeAuxiliary
          : parkedAuxiliaries.find((entry) => entry.surface === "source-content");
        if (session) dispatchDraftCoordinator({
          type: "CLOSE_AUXILIARY",
          draftId: session.draftId,
          choice: "discard",
        });
      }
      return result;
    },
  }]));
  const pendingWork = selectBuildPendingWork({
    authoredDirty: effectiveAuthoredDirtyState,
    coordinator: draftCoordinator,
    chartOwners,
    owners: [...temporalOwners, ...sourceContentOwners, ...(Array.isArray(owners) ? owners : [])],
    retainedSourceOwners: retainedSourceContentOwners,
    parkedAuxiliaries,
    layoutDraft,
    actions: {
      resumeByKey: {
        ...pendingWorkResumeActions,
        pendingContent: pendingWorkResumeActions.pendingContent
          ?? (() => resumeAuxiliary("source-content")),
        chronoGroup: pendingWorkResumeActions.chronoGroup
          ?? (() => resumeAuxiliary("chrono-group")),
        scene: pendingWorkResumeActions.scene
          ?? (() => resumeAuxiliary("scene")),
      },
      resumeAuxiliary,
      ownerById: { ...pendingWorkOwnerActions, ...temporalOwnerActions, ...sourceContentOwnerActions },
      saveLayout: onSaveLayout,
      discardLayout: discardPendingLayout,
    },
  });

  const structure = (
    <BuildStructureRail
      key={treeResetGeneration}
      dashboard={dashboard}
      selection={selection}
      disabled={navigationLocked}
      onActivate={chooseSelection}
      onRename={onRename}
      onRenameDirtyChange={onInlineRenameDirtyChange}
      onMove={onLayoutMove}
    />
  );
  const inspector = (
    <BuildInspector
      dashboard={dashboard}
      selection={selection}
      dashboardDraft={dashboardDraft}
      pageDrafts={pageDrafts}
      sectionDrafts={sectionDrafts}
      disabled={locked}
      focusLabelKey={inspectorFocusKey}
      onDashboardChange={onDashboardChange}
      onPageChange={onPageChange}
      onPageRemove={onPageRemove}
      onSectionChange={onSectionChange}
    />
  );

  return (
    <div
      className="build-workspace-authoring-root"
      data-build-draft-coordinator="live"
      data-build-auxiliary-contract="context-shelf"
      data-device-layout={deviceLayout}
    >
          <BuildCommandHeader
            pendingWork={pendingWork}
            locked={locked}
            disabledReason={mutationDisabledReason}
            auxiliaryLocked={auxiliaryLocked}
            auxiliaryDisabledReason={auxiliaryDisabledReason}
            accessibilityEnabled={accessibilityEnabled}
            operationError={operationError}
            onFinish={onFinish}
            onReset={onReset}
            onAddChart={() => onAddChart?.()}
            onAddStaticContent={() => onAddStaticContent?.()}
            onAccessibilityChange={onAccessibilityChange}
            onOpenAuxiliary={openAuxiliary}
          />
          {(activeAuxiliary === "source-content" || sourceContentOwners.length > 0) && typeof document !== "undefined" && createPortal((
            <aside
              className="build-authoring-auxiliary build-authoring-auxiliary--source-content"
              {...dashboardThemeRootProps(themeProjection)}
              data-authoring-surface="source-content"
              role="complementary"
              aria-label="Source content authoring"
              hidden={activeAuxiliary !== "source-content"}
              style={activeAuxiliary !== "source-content" ? { display: "none" } : undefined}
              inert={activeAuxiliary !== "source-content" ? "" : undefined}
              onKeyDown={(event) => {
                if (event.key !== "Escape" || sourceContentSaving) return;
                event.preventDefault();
                event.stopPropagation();
                closeAuxiliary();
              }}
            >
              <button
                type="button"
                className="secondary build-auxiliary-close"
                disabled={sourceContentSaving}
                title={sourceContentSaving ? "Wait for the current Source Content operation to finish." : undefined}
                onClick={closeAuxiliary}
              >
                Close
              </button>
              <SourceContentWorkspace
                dashboard={dashboard}
                geoDataSources={geoDataSources}
                contentDraftCoordinator={contentDraftCoordinator}
                active={activeAuxiliary === "source-content"}
                ownerControllerRef={sourceContentControllerRef}
                viewState={sourceContentViewState}
                onOwnersChange={setSourceContentOwners}
                onRetainedOwnersChange={setRetainedSourceContentOwners}
                onViewStateChange={setSourceContentViewState}
                onRequestClose={closeAuxiliary}
                onContentDraftStage={onContentDraftStage}
                onContentDraftCommit={onContentDraftCommit}
                onContentDraftDiscard={onContentDraftDiscard}
              />
            </aside>
          ), document.body)}
          {activeAuxiliary && activeAuxiliary !== "source-content" && typeof document !== "undefined" && createPortal((
            <aside
              className="build-authoring-auxiliary"
              {...dashboardThemeRootProps(themeProjection)}
              data-authoring-surface={renderedAuxiliary}
              role="dialog"
              aria-modal="false"
              aria-label={`${auxiliaryLabel(renderedAuxiliary)} authoring`}
              onKeyDown={(event) => {
                if (event.key !== "Escape") return;
                event.preventDefault();
                event.stopPropagation();
                closeAuxiliary();
              }}
            >
              <button type="button" className="secondary build-auxiliary-close" onClick={closeAuxiliary}>Close</button>
              {renderedAuxiliary === "chrono-group" && chronoContentState?.view === "library" && (
                <ChronoStudio state={chronoContentState} cards={selectChronoStudioCards(chronoContentState)} onAction={dispatchChronoContent} />
              )}
              {renderedAuxiliary === "chrono-group" && chronoContentState?.view === "content" && (
                <ChronoGroupContent content={selectChronoGroupContent(chronoContentState, chronoContentState.selectedItemId)} onAction={dispatchChronoContent} />
              )}
              {renderedAuxiliary === "chrono-group" && chronoContentState?.view === "editor" && chronoGroupDraft && (
                <ChronoGroupEditor draft={chronoGroupDraft} disabled={locked} onAction={dispatchChronoGroup} />
              )}
              {renderedAuxiliary === "scene" && chronoContentState?.view === "library" && (
                <SceneLibrary state={chronoContentState} sections={selectSceneStudioSections(chronoContentState)} onAction={dispatchChronoContent} />
              )}
              {renderedAuxiliary === "scene" && chronoContentState?.view === "content" && (
                <SceneContent content={selectSceneContent(chronoContentState, chronoContentState.selectedItemId)} onAction={dispatchChronoContent} />
              )}
              {renderedAuxiliary === "scene" && chronoContentState?.view === "editor" && sceneDraft && (
                <SceneEditor
                  dashboard={dashboard}
                  themeProjection={themeProjection}
                  draft={sceneDraft}
                  charts={sceneEligibleCharts(dashboard, temporalCharts, sceneDraft.value)}
                  chronoGroups={dashboard.chronoGroups ?? []}
                  pages={dashboard.pages ?? []}
                  disabled={locked}
                  onAction={dispatchScene}
                />
              )}
            </aside>
          ), document.body)}
          <RightSideDrawer
            id="dashboard-map-panel"
            title="Dashboard map"
            open={buildPanelOpen}
            onClose={onCloseDashboardMap}
            modality="complementary"
            eyebrow="Build"
            className="dashboard-map-panel"
            headerClassName="dashboard-map-header"
            contentClassName="dashboard-map-content"
            panelProps={{ "aria-label": "Dashboard map" }}
            headerActions={(
              <div className="dashboard-map-region-switch" role="group" aria-label="Dashboard map regions">
                <button
                  type="button"
                  className="secondary"
                  data-dashboard-map-region-control="structure"
                  aria-pressed={mapRegion === "structure"}
                  disabled={locked}
                  onClick={() => setMapRegion("structure")}
                >
                  Structure
                </button>
                <button
                  type="button"
                  className="secondary"
                  aria-pressed={mapRegion === "inspector"}
                  disabled={locked}
                  onClick={() => setMapRegion("inspector")}
                >
                  Inspector
                </button>
              </div>
            )}
          >
            <section className="build-region-grid">
              {mapRegion === "structure" ? (
                <section className="build-side-sheet build-structure-sheet" data-dashboard-map-region="structure">
                  {structure}
                </section>
              ) : (
                <section className="build-side-sheet build-inspector-sheet" data-dashboard-map-region="inspector" role="region" aria-label="Context inspector">
                  {inspector}
                </section>
              )}
            </section>
          </RightSideDrawer>
          {chartEditorPlacementId && chartEditor && (
            <UnitOrbit
              themeProjection={themeProjection}
              anchorPlacementId={chartEditorPlacementId}
              chartTitle={selectedChart?.title}
              capabilities={unitOrbitCapabilities}
              open={chartEditorOpen}
              onRequestClose={onCloseChartEditor}
            >
              {chartEditor}
            </UnitOrbit>
          )}
    </div>
  );
}

export function buildSelectionAllowedWhileLocked(current, next, { intent = "activate" } = {}) {
  return intent === "activate"
    && current?.kind === "chart"
    && next?.kind === "chart"
    && typeof current.placementId === "string"
    && current.placementId !== ""
    && current.placementId === next.placementId;
}

function stableDraftId(prefix) {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${random}`;
}

function storageFacingError(error, fallbackCode) {
  const message = error?.message || "The draft could not be saved.";
  const quota = error?.name === "QuotaExceededError" || /quota|storage full/i.test(message);
  return {
    code: quota ? "QUOTA_EXHAUSTED" : error?.code ?? fallbackCode,
    message,
    retryable: true,
  };
}

function auxiliaryLabel(surface) {
  return ({
    "chrono-group": "Chrono Studio",
    scene: "Scene Studio",
    "source-content": "Source content",
  })[surface] ?? "Build work";
}

function chronoGroupDraftInput(dashboard, charts, groupOverride = undefined) {
  const group = groupOverride === undefined ? dashboard.chronoGroups?.[0] : groupOverride;
  const start = Date.parse(`${group?.period?.start ?? new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
  const end = Date.parse(`${group?.period?.end ?? new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
  const memberFallbacks = Object.fromEntries((group?.members ?? [])
    .filter((member) => member.matching?.policy)
    .map((member) => [member.chartId, matchingLabel(member.matching.policy)]));
  return {
    group: {
      id: group?.id ?? stableDraftId("chrono-group"),
      name: group?.name ?? "",
      period: { startEpochMs: start, endEpochMs: end },
      chartIds: (group?.members ?? []).map(({ chartId }) => chartId),
      defaultMatching: matchingLabel(group?.matching?.policy ?? "exact"),
      memberFallbacks,
      secondsPerFrame: group?.secondsPerFrame ?? 1,
    },
    chronoGroups: dashboard.chronoGroups ?? [],
    charts: charts.map((chart) => ({
      ...chart,
      otherGroupNames: (chart.chronoGroupMemberships ?? [])
        .filter(({ groupId }) => groupId !== group?.id)
        .map(({ groupName }) => groupName),
    })),
    scenes: (dashboard.scenes ?? []).map((scene) => ({
      ...scene,
      period: {
        startEpochMs: Date.parse(scene.period?.start),
        endEpochMs: Date.parse(scene.period?.end),
      },
    })),
    timeZone: dashboard.timezone ?? dashboard.timeZone ?? "UTC",
  };
}

export function temporalAuthoringCharts(dashboard) {
  const memberships = new Map();
  const membershipLists = new Map();
  for (const group of dashboard.chronoGroups ?? []) {
    for (const member of group.members ?? []) {
      memberships.set(member.chartId, member);
      const entries = membershipLists.get(member.chartId) ?? [];
      entries.push({ groupId: group.id, groupName: group.name ?? group.id });
      membershipLists.set(member.chartId, entries);
    }
  }
  const variableCache = new Map();
  return collectChartPlacements(dashboard)
    .filter(({ chart }) => isTemporalAuthoringChart(chart))
    .map((placement) => {
    const chart = placement.chart;
    const member = memberships.get(chart.id);
    const timeField = bindingField(chart.roles?.[member?.timeRole])
      ?? temporalRoleField(chart.roles);
    const rows = dashboard.loadedData?.[chart.sourceId] ?? [];
    const valueFields = Object.entries(chart.roles ?? {})
      .filter(([role]) => role !== member?.timeRole)
      .flatMap(([, binding]) => bindingFields(binding))
      .filter((field) => field && field !== timeField);
    const cacheKey = JSON.stringify([chart.sourceId, timeField, valueFields]);
    const variables = variableCache.get(cacheKey)
      ?? buildTemporalChartVariables(rows, timeField, valueFields, parseEpoch);
    variableCache.set(cacheKey, variables);
    const interpolationSupport = describeTemporalInterpolationSupport(variables);
    const configuredInterpolation = chart.interaction?.timeSync?.interpolationAllowed;
    return {
      id: chart.id,
      title: chart.title,
      label: chart.title ?? chart.id,
      pageId: placement.pageId,
      pageLabel: dashboard.pages?.find(({ id }) => id === placement.pageId)?.label
        ?? dashboard.pages?.find(({ id }) => id === placement.pageId)?.title
        ?? placement.pageId,
      sectionId: placement.sectionId,
      sectionLabel: dashboard.pages?.find(({ id }) => id === placement.pageId)
        ?.sections?.find(({ id }) => id === placement.sectionId)?.title ?? placement.sectionId,
      interpolationAllowed: typeof configuredInterpolation === "boolean"
        ? configuredInterpolation
        : interpolationSupport.allowed,
      interpolationUnsupportedVariables: interpolationSupport.unsupportedVariables,
      interpolationReason: interpolationSupport.reason,
      chronoGroupMemberships: membershipLists.get(chart.id) ?? [],
      variables,
      sourceChart: chart,
      timeRole: member?.timeRole ?? temporalRoleName(chart.roles),
    };
    });
}

function initialScene(dashboard, preferredPageId) {
  const group = dashboard.chronoGroups?.[0];
  const placements = collectChartPlacements(dashboard)
    .filter(({ chart }) => isTemporalAuthoringChart(chart));
  const memberIds = new Set(group?.chartIds ?? (group?.members ?? []).map(({ chartId }) => chartId));
  const eligible = placements.filter(({ chart, pageId }) => (
    memberIds.has(chart.id) && (!preferredPageId || pageId === preferredPageId)
  ));
  const fallback = eligible.length > 0
    ? eligible
    : placements.filter(({ chart }) => memberIds.has(chart.id));
  const selected = fallback.slice(0, Math.max(1, Math.min(4, fallback.length)));
  const pageId = selected[0]?.pageId ?? preferredPageId ?? dashboard.pages?.[0]?.id ?? "page";
  const chartIds = selected.map(({ chart }) => chart.id);
  const firstChartId = chartIds[0] ?? "select-chart";
  const startDate = group?.period?.start ?? new Date().toISOString().slice(0, 10);
  const endDate = group?.period?.end ?? startDate;
  return {
    id: stableDraftId("scene"),
    name: "",
    pageId,
    chronoGroupId: group?.id ?? "select-chrono-group",
    period: {
      start: `${startDate}T00:00:00.000Z`,
      end: `${endDate}T00:00:00.000Z`,
    },
    frames: { mode: "source", chartId: firstChartId, selection: "all" },
    members: chartIds.map((chartId) => ({ chartId, width: 2 })),
    present: {
      chartIds,
      layout: ({ 1: "single", 2: "vertical-divider", 3: "large-left", 4: "grid-2x2" })[chartIds.length] ?? "single",
    },
    audience: { datePosition: { xPermille: 680, yPermille: 40, widthPermille: 280 } },
  };
}

function sceneValidationContext(dashboard) {
  return {
    chronoGroups: dashboard.chronoGroups ?? [],
    pages: dashboard.pages ?? [],
    charts: collectChartPlacements(dashboard).map(({ chart, pageId }) => ({ ...chart, pageId })),
    scenes: dashboard.scenes ?? [],
  };
}

export function sceneEligibleCharts(dashboard, charts, scene) {
  const group = dashboard.chronoGroups?.find(({ id }) => id === scene?.chronoGroupId);
  const memberIds = new Set(group?.chartIds ?? (group?.members ?? []).map(({ chartId }) => chartId));
  return charts.filter((chart) => (
    isTemporalAuthoringChart(chart.sourceChart ?? chart)
    && memberIds.has(chart.id)
    && chart.pageId === scene?.pageId
  ));
}

export function mergeChronoGroup(groups, saved, charts) {
  const existing = groups.find(({ id }) => id === saved.id);
  const chartById = new Map(charts.map((chart) => [chart.id, chart]));
  const memberById = new Map((existing?.members ?? []).map((member) => [member.chartId, member]));
  const next = {
    ...(existing ?? {}),
    id: saved.id,
    name: saved.name,
    period: {
      start: new Date(saved.period.startEpochMs).toISOString().slice(0, 10),
      end: new Date(saved.period.endEpochMs).toISOString().slice(0, 10),
    },
    matching: matchingValue(saved.defaultMatching),
    secondsPerFrame: saved.secondsPerFrame,
    members: saved.chartIds.filter((chartId) => chartById.has(chartId)).map((chartId) => ({
      ...(memberById.get(chartId) ?? {}),
      chartId,
      timeRole: memberById.get(chartId)?.timeRole ?? chartById.get(chartId)?.timeRole ?? "observation",
      ...(saved.memberFallbacks?.[chartId]
        ? { matching: matchingValue(saved.memberFallbacks[chartId]) }
        : {}),
    })),
  };
  delete next.temporalReview;
  return existing
    ? groups.map((group) => group.id === saved.id ? next : group)
    : [...groups, next];
}

function isTemporalAuthoringChart(chart) {
  try {
    return getChartSchema(chart?.typeId).authoringWorkflow !== "static";
  } catch {
    return true;
  }
}

function mergeScene(scenes, saved) {
  return scenes.some(({ id }) => id === saved.id)
    ? scenes.map((scene) => scene.id === saved.id ? structuredClone(saved) : scene)
    : [...scenes, structuredClone(saved)];
}

function completeContentOperation(state, updates, itemType, itemId) {
  if (!state) return state;
  const createIntent = state.operation?.intent === "create";
  let refreshed = reduceChronoContent(state, { type: "OPERATION_SUCCEEDED", ...updates, returnToContent: true });
  if (createIntent && itemType === "scene") {
    const savedScene = refreshed.scenes?.find(({ id }) => id === itemId);
    refreshed = reduceChronoContent(refreshed, { type: "SET_QUERY", query: "" });
    refreshed = reduceChronoContent(refreshed, { type: "SET_STATUS_FILTER", statusFilter: "all" });
    refreshed = reduceChronoContent(refreshed, { type: "SET_PAGE_FILTER", pageId: savedScene?.pageId ?? null });
  }
  return reduceChronoContent(refreshed, { type: "OPEN_CONTENT", itemType, itemId });
}

function matchingLabel(policy) {
  return ({
    exact: "Concurrent only",
    lastKnown: "Snap to Latest",
    nearest: "Snap to Closest",
    interpolate: "Interpolate",
  })[policy] ?? policy;
}

function matchingValue(label) {
  const policy = ({
    "Concurrent only": "exact",
    "Snap to Latest": "lastKnown",
    "Snap to Closest": "nearest",
    Interpolate: "interpolate",
  })[label] ?? label;
  return policy === "nearest" ? { policy, toleranceMs: 0 } : { policy };
}

function bindingFields(binding) {
  if (Array.isArray(binding)) return binding.flatMap(bindingFields);
  const field = bindingField(binding);
  return field ? [field] : [];
}

function bindingField(binding) {
  return typeof binding === "string" ? binding : binding?.field;
}

function temporalRoleName(roles = {}) {
  return Object.keys(roles).find((role) => /time|date|observation/i.test(role)) ?? "observation";
}

function temporalRoleField(roles = {}) {
  return bindingField(roles[temporalRoleName(roles)]);
}

function parseEpoch(value) {
  if (Number.isFinite(value)) return value;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}
