import React from "react";
import { createPortal } from "react-dom";

import DeviceLayoutControl from "../DeviceLayoutControl.jsx";
import { SimExIcon } from "../common/SimExIcon.js";
import ModalFocusScope from "../common/ModalFocusScope.jsx";
import CanonicalDashboardFrame, { CanonicalDashboardFooter } from "../dashboard/CanonicalDashboardFrame.jsx";
import DashboardCanvas from "../dashboard/DashboardCanvas.jsx";
import DashboardHeader from "../dashboard/DashboardHeader.jsx";
import BuildInspector from "./BuildInspector.jsx";
import BuildStructureRail from "./BuildStructureRail.jsx";
import {
  captureBuildCanvasState,
  restoreBuildCanvasState,
  selectedTargetUsability,
} from "./buildCanvasRestoration.js";
import {
  collectChartPlacements,
  compatibleUnitOrbitCapabilities,
} from "./panelEditingModel.js";
import ScenarioAuthoring, {
  createScenarioDraft,
  reduceScenarioDraft,
} from "./ScenarioAuthoring.jsx";
import StructureAuthoring, {
  createStructureDraft,
  reduceStructureDraft,
} from "./StructureAuthoring.jsx";
import UnitOrbit from "./UnitOrbit.jsx";
import SceneStudio from "../time/SceneStudio.jsx";
import {
  createSceneDraft,
  reduceSceneDraft,
} from "../time/sceneDraft.js";
import TimeContentLibrary from "../time/TimeContentLibrary.jsx";
import {
  createTimeContentState,
  reduceTimeContent,
} from "../time/timeContentState.js";
import TimeGroupStudio from "../time/TimeGroupStudio.jsx";
import { hasActiveLocalAuthoringDrafts } from "./buildDirtyState.js";
import { deriveTemporalContentItems } from "../../charting/time/temporalNeedsAttention.js";
import {
  createTimeGroupDraft,
  reduceTimeGroupDraft,
  toSavedTimeGroup,
} from "../time/timeGroupDraft.js";
import { dashboardThemeRootProps } from "../../theme/dashboardThemeRoot.js";

export default function BuildWorkspace({
  themeProjection,
  dashboard,
  activePage,
  pageType,
  buildPanelOpen = false,
  selection,
  dashboardDraft,
  pageDrafts,
  sectionDrafts,
  chartEditor,
  chartEditorPlacementId = null,
  chartEditorOpen = true,
  onCloseChartEditor,
  chartDraftOpen = false,
  chartDraftDirty = false,
  mutationsDisabled = false,
  deviceLayout,
  focusLabelKey,
  operationError = "",
  appearanceControls,
  geoDataSources,
  onActivePageChange,
  onActivate,
  onRename,
  onInlineRenameDirtyChange,
  revealRequest = null,
  treeResetGeneration = 0,
  onRevealComplete,
  onDashboardChange,
  onStructureCommit,
  onScenarioCommit,
  onPageChange,
  onPageRemove,
  onSectionChange,
  onTimeGroupChange,
  onOpenSceneComposer,
  onPageReorder,
  onSectionReorder,
  onAddSection,
  onAddChart,
  chartDraftAvailable = false,
  onFinish,
  onReset,
  onImportPackage,
  onExportPackage,
  onOpenBackground,
  onLocalDraftsChange,
  onDeviceLayoutChange,
  onDisplayAction,
}) {
  const [openSheet, setOpenSheet] = React.useState(null);
  const [activeAuxiliary, setActiveAuxiliary] = React.useState(null);
  const [parkedAuxiliaries, setParkedAuxiliaries] = React.useState([]);
  const [structureDraft, setStructureDraft] = React.useState(() => createStructureDraft(dashboard));
  const [scenarioDraft, setScenarioDraft] = React.useState(() => createScenarioDraft({ ...dashboard, ...dashboardDraft }));
  const temporalCharts = React.useMemo(() => temporalAuthoringCharts(dashboard), [dashboard]);
  const [timeGroupDraft, setTimeGroupDraft] = React.useState(() => createTimeGroupDraft(
    timeGroupDraftInput(dashboard, temporalAuthoringCharts(dashboard)),
  ));
  const [sceneDraft, setSceneDraft] = React.useState(() => createSceneDraft(
    initialScene(dashboard, activePage?.id),
    sceneValidationContext(dashboard),
  ));
  const temporalContentItems = React.useMemo(
    () => deriveTemporalContentItems({ dashboard, charts: temporalCharts }),
    [dashboard, temporalCharts],
  );
  const [timeContentState, setTimeContentState] = React.useState(() => createTimeContentState({
    items: temporalContentItems,
    pageId: activePage?.id ?? null,
  }));
  const [tablet, setTablet] = React.useState(false);
  const localAuthoringDrafts = React.useMemo(() => ({
    structure: structureDraft,
    scenario: scenarioDraft,
    timeGroup: timeGroupDraft,
    scene: sceneDraft,
  }), [sceneDraft, scenarioDraft, structureDraft, timeGroupDraft]);
  const localAuthoringDirty = hasActiveLocalAuthoringDrafts(localAuthoringDrafts);
  const locked = mutationsDisabled || chartDraftOpen;
  const navigationLocked = mutationsDisabled || chartDraftDirty || localAuthoringDirty;
  const selectedChartItem = selection?.kind === "chart"
    ? collectChartPlacements(dashboard).find(({ placementId }) => placementId === selection.placementId)
    : null;
  const selectedChart = selectedChartItem?.chart ?? null;
  const unitOrbitCapabilities = compatibleUnitOrbitCapabilities(selectedChartItem);
  const inspectorFocusKey = tablet
    ? (openSheet === "inspector" ? focusLabelKey : 0)
    : focusLabelKey;

  React.useEffect(() => {
    onLocalDraftsChange?.(localAuthoringDrafts);
  }, [localAuthoringDrafts, onLocalDraftsChange]);

  React.useEffect(() => {
    setTimeContentState((current) => reduceTimeContent(current, {
      type: "REFRESH_ITEMS",
      items: temporalContentItems,
    }));
  }, [temporalContentItems]);

  React.useEffect(() => {
    const query = window.matchMedia?.("(min-width: 768px) and (max-width: 1199px)");
    if (!query) return undefined;
    const update = () => setTablet(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);

  React.useEffect(() => {
    if (tablet || openSheet === null) return;
    setOpenSheet(null);
  }, [tablet, openSheet]);

  React.useEffect(() => {
    if (!tablet || focusLabelKey <= 0) return;
    setOpenSheet(selection?.kind === "chart" ? null : "inspector");
  }, [focusLabelKey, selection?.kind, tablet]);

  const chooseSelection = (next, options) => {
    if (
      navigationLocked
      && !buildSelectionAllowedWhileLocked(selection, next, options)
    ) return Promise.resolve(false);
    if (tablet) setOpenSheet(next.kind === "chart" ? null : "inspector");
    return onActivate?.(next, options) ?? Promise.resolve(false);
  };

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
      if (attempts === 0) {
        target.scrollIntoView({ block: "center", inline: "nearest", behavior: revealRequest.behavior });
      }
      attempts += 1;
      const rect = target.getBoundingClientRect();
      const intersectsViewport = rect.bottom > 0
        && rect.right > 0
        && rect.top < window.innerHeight
        && rect.left < window.innerWidth;
      if (intersectsViewport) {
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
  const open = (name) => {
    if (!locked) setOpenSheet(name);
  };
  const close = () => setOpenSheet(null);

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
  }), [activeAuxiliary, dashboard, selection]);

  const restoreCanvas = React.useCallback((restoration) => {
    if (!restoration) return;
    let commands;
    try {
      commands = restoreBuildCanvasState(restoration, dashboard);
    } catch {
      return;
    }
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: commands.scrollTop, left: commands.scrollLeft, behavior: "auto" });
      if (commands.focusId) document.getElementById(commands.focusId)?.focus();
    });
  }, [dashboard]);

  const openAuxiliary = (surface) => {
    if (locked || activeAuxiliary === surface) return;
    const restoration = captureRestoration();
    if (activeAuxiliary) {
      setParkedAuxiliaries((current) => [
        ...current.filter((entry) => entry.surface !== activeAuxiliary),
        { surface: activeAuxiliary, restoration },
      ]);
    }
    setActiveAuxiliary(surface);
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
    const next = parkedAuxiliaries.at(-1) ?? null;
    setParkedAuxiliaries((current) => current.slice(0, -1));
    setActiveAuxiliary(next?.surface ?? null);
    restoreCanvas(next?.restoration ?? captureRestoration());
  };

  const resumeAuxiliary = (surface) => {
    if (activeAuxiliary === surface) return;
    const parked = parkedAuxiliaries.find((entry) => entry.surface === surface);
    if (!parked) return;
    if (activeAuxiliary) {
      setParkedAuxiliaries((current) => [
        ...current.filter((entry) => entry.surface !== surface && entry.surface !== activeAuxiliary),
        { surface: activeAuxiliary, restoration: captureRestoration() },
      ]);
    } else {
      setParkedAuxiliaries((current) => current.filter((entry) => entry.surface !== surface));
    }
    setActiveAuxiliary(surface);
    restoreCanvas(parked.restoration);
  };

  const dispatchStructure = (action) => {
    let normalized = action;
    if (action.type === "REQUEST_ADD_PAGE") {
      const id = stableDraftId("page");
      normalized = {
        type: "ADD_PAGE",
        page: { id, label: "New Page", title: "New Page", sections: [] },
        initialSection: { id: `${id}-section`, title: "New Section", panels: [] },
      };
    }
    if (action.type === "REQUEST_ADD_SECTION") {
      normalized = {
        type: "ADD_SECTION",
        pageId: action.pageId,
        section: { id: stableDraftId("section"), title: "New Section", panels: [] },
      };
    }
    if (normalized.type === "SAVE_REQUEST") {
      const saving = reduceStructureDraft(structureDraft, normalized);
      setStructureDraft(saving);
      if (saving.status !== "saving") return;
      Promise.resolve(onStructureCommit?.(saving.value))
        .then(() => setStructureDraft((current) => reduceStructureDraft(current, { type: "SAVE_SUCCEEDED" })))
        .catch((error) => setStructureDraft((current) => reduceStructureDraft(current, {
          type: "SAVE_FAILED",
          error: storageFacingError(error, "STRUCTURE_SAVE_FAILED"),
        })));
      return;
    }
    setStructureDraft((current) => reduceStructureDraft(current, normalized));
  };

  const dispatchScenario = (action) => {
    if (action.type === "SAVE_REQUEST") {
      const saving = reduceScenarioDraft(scenarioDraft, action);
      setScenarioDraft(saving);
      if (saving.status !== "saving") return;
      Promise.resolve(onScenarioCommit?.(saving.value))
        .then(() => setScenarioDraft((current) => reduceScenarioDraft(current, { type: "SAVE_SUCCEEDED" })))
        .catch((error) => setScenarioDraft((current) => reduceScenarioDraft(current, {
          type: "SAVE_FAILED",
          error: storageFacingError(error, "SCENARIO_SAVE_FAILED"),
        })));
      return;
    }
    setScenarioDraft((current) => reduceScenarioDraft(current, action));
  };

  const commitTemporalContent = (updates) => onStructureCommit?.({
    pages: dashboard.pages,
    timeSyncGroups: updates.timeSyncGroups ?? dashboard.timeSyncGroups ?? [],
    scenes: updates.scenes ?? dashboard.scenes ?? [],
  });

  const dispatchTimeGroup = (action) => {
    if (action.type === "SAVE_REQUEST") {
      const saving = reduceTimeGroupDraft(timeGroupDraft, action);
      setTimeGroupDraft(saving);
      if (saving.status !== "saving") return;
      const savedGroup = toSavedTimeGroup(saving);
      const timeSyncGroups = mergeTimeGroup(dashboard.timeSyncGroups ?? [], savedGroup, temporalCharts);
      Promise.resolve(commitTemporalContent({ timeSyncGroups }))
        .then(() => setTimeGroupDraft((current) => reduceTimeGroupDraft(current, {
          type: "SAVE_SUCCEEDED",
          savedValue: savedGroup,
        })))
        .catch((error) => setTimeGroupDraft((current) => reduceTimeGroupDraft(current, {
          type: "SAVE_FAILED",
          error: storageFacingError(error, "TIME_GROUP_SAVE_FAILED"),
        })));
      return;
    }
    setTimeGroupDraft((current) => reduceTimeGroupDraft(current, action));
  };

  const dispatchScene = (action) => {
    if (action.type === "SAVE_REQUEST") {
      const saving = reduceSceneDraft(sceneDraft, action);
      setSceneDraft(saving);
      if (saving.status !== "saving") return;
      const scenes = mergeScene(dashboard.scenes ?? [], saving.value);
      Promise.resolve(commitTemporalContent({ scenes }))
        .then(() => setSceneDraft((current) => reduceSceneDraft(current, {
          type: "SAVE_SUCCEEDED",
          savedValue: saving.value,
        })))
        .catch((error) => setSceneDraft((current) => reduceSceneDraft(current, {
          type: "SAVE_FAILED",
          error: storageFacingError(error, "SCENE_SAVE_FAILED"),
        })));
      return;
    }
    setSceneDraft((current) => reduceSceneDraft(current, action));
  };

  const dispatchTimeContent = (action) => {
    const next = reduceTimeContent(timeContentState, action);
    setTimeContentState(next);
    if (action.type !== "REQUEST_INTENT" || next.conflict || !next.operation) return;
    const { item, intent, handoff } = next.operation;
    if (handoff.surface === "time-group" && intent !== "remove") {
      const group = dashboard.timeSyncGroups?.find(({ id }) => id === item.id);
      const source = intent === "create" ? null : group;
      const input = timeGroupDraftInput(dashboard, temporalCharts, source);
      if (intent === "duplicate") {
        input.group.id = stableDraftId("time-group");
        input.group.name = `Copy of ${input.group.name}`;
      }
      setTimeGroupDraft(createTimeGroupDraft({ ...input, initialStage: handoff.stage }));
      openAuxiliary("time-group");
    }
    if (handoff.surface === "scene" && intent !== "remove") {
      const existing = dashboard.scenes?.find(({ id }) => id === item.id);
      const source = intent === "create" ? initialScene(dashboard, activePage?.id) : existing;
      const value = structuredClone(source ?? initialScene(dashboard, activePage?.id));
      if (intent === "duplicate") {
        value.id = stableDraftId("scene");
        value.name = `Copy of ${value.name}`;
      }
      setSceneDraft({
        ...createSceneDraft(value, sceneValidationContext(dashboard)),
        stage: handoff.stage,
      });
      openAuxiliary("scene");
    }
  };

  const structure = (
    <BuildStructureRail
      key={treeResetGeneration}
      dashboard={dashboard}
      selection={selection}
      disabled={navigationLocked}
      onActivate={chooseSelection}
      onRename={onRename}
      onRenameDirtyChange={onInlineRenameDirtyChange}
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
      onTimeGroupChange={onTimeGroupChange}
      onOpenSceneComposer={onOpenSceneComposer}
    />
  );

  return (
    <CanonicalDashboardFrame
      mode="build"
      pageType={pageType}
      buildPanelOpen={buildPanelOpen}
      pageId={activePage?.id}
      dashboardHeader={<DashboardHeader activePage={activePage} dashboard={dashboard} />}
      pageContent={(
        <DashboardCanvas
          activePage={activePage}
          dashboard={dashboard}
          surface="build"
          geoDataSources={geoDataSources}
          onNavigate={(pageId) => void chooseSelection({ kind: "page", pageId }, { intent: "activate" })}
          onDisplayAction={onDisplayAction}
          buildState={{
            selection,
            disabled: navigationLocked,
            sectionDrafts,
            onSelect: (next) => void chooseSelection(next, { intent: "activate" }),
            onReorderSection: onSectionReorder,
            onAddSection,
            onAddChart,
          }}
        />
      )}
      footer={<CanonicalDashboardFooter dashboard={dashboard} />}
      overlayLayer={(
        <div
          id="build-authoring-panel"
          className="build-authoring-layer"
          data-build-auxiliary-contract="context-shelf"
          data-device-layout={deviceLayout}
          data-open={buildPanelOpen ? "true" : "false"}
          aria-hidden={buildPanelOpen ? undefined : "true"}
          inert={!buildPanelOpen}
        >
          <section className="build-command-area" aria-label="Build commands">
            <div className="build-command-title">
              <p className="eyebrow">Workspace</p>
              <strong>Build commands</strong>
            </div>
            <button type="button" disabled={locked} onClick={onFinish}>Finish Build</button>
            <button type="button" className="secondary" disabled={locked} onClick={onReset}>Reset</button>
            <button type="button" className="secondary" disabled={locked} onClick={() => onAddChart?.()}>{chartDraftAvailable ? "Resume chart draft" : "Add chart"}</button>
            <button type="button" className="secondary" disabled={locked} onClick={() => openAuxiliary("structure")}>Pages &amp; sections</button>
            <button type="button" className="secondary" disabled={locked} onClick={() => openAuxiliary("scenario")}>Scenario details</button>
            <button type="button" className="secondary" disabled={locked} onClick={() => openAuxiliary("time-content")}>Time Content</button>
            <button type="button" className="secondary" disabled={locked} onClick={() => openAuxiliary("time-group")}>Time Group Studio</button>
            <button type="button" className="secondary" disabled={locked} onClick={() => openAuxiliary("scene")}>Scene Studio</button>
            <div className="build-package-actions" aria-label="Dashboard packages">
              <button type="button" className="secondary build-package-action" disabled={mutationsDisabled} onMouseDown={(event) => event.preventDefault()} onClick={onImportPackage}>
                <SimExIcon iconId="import" size={18} />
                <span>Import package</span>
              </button>
              <button type="button" className="secondary build-package-action" disabled={mutationsDisabled} onClick={onExportPackage}>
                <SimExIcon iconId="export" size={18} />
                <span>Export package</span>
              </button>
            </div>
            <fieldset className="build-device-layout-fieldset" disabled={locked}>
              <DeviceLayoutControl value={deviceLayout} onChange={onDeviceLayoutChange} />
            </fieldset>
            <fieldset className="build-appearance-controls" disabled={locked}>
              {appearanceControls}
              <button type="button" className="secondary" disabled={locked} onClick={onOpenBackground}>Background</button>
            </fieldset>
          </section>
          {operationError && <p className="build-operation-error" role="alert">{operationError}</p>}
          {parkedAuxiliaries.length > 0 && (
            <nav className="build-context-shelf" aria-label="Parked Build work">
              {parkedAuxiliaries.map(({ surface }) => (
                <button key={surface} type="button" className="secondary" onClick={() => resumeAuxiliary(surface)}>
                  Resume {auxiliaryLabel(surface)}
                </button>
              ))}
            </nav>
          )}
          {activeAuxiliary && typeof document !== "undefined" && createPortal((
            <aside
              className="build-authoring-auxiliary"
              {...dashboardThemeRootProps(themeProjection)}
              data-authoring-surface={activeAuxiliary}
              role="dialog"
              aria-modal="false"
              aria-label={`${auxiliaryLabel(activeAuxiliary)} authoring`}
              onKeyDown={(event) => {
                if (event.key !== "Escape") return;
                event.preventDefault();
                event.stopPropagation();
                closeAuxiliary();
              }}
            >
              <button type="button" className="secondary build-auxiliary-close" onClick={closeAuxiliary}>Close</button>
              {activeAuxiliary === "structure" && <StructureAuthoring draft={structureDraft} disabled={locked} onAction={dispatchStructure} />}
              {activeAuxiliary === "scenario" && <ScenarioAuthoring draft={scenarioDraft} disabled={locked} onAction={dispatchScenario} />}
              {activeAuxiliary === "time-group" && <TimeGroupStudio draft={timeGroupDraft} disabled={locked} onAction={dispatchTimeGroup} />}
              {activeAuxiliary === "scene" && (
                <SceneStudio
                  draft={sceneDraft}
                  charts={sceneEligibleCharts(dashboard, temporalCharts, sceneDraft.value)}
                  disabled={locked}
                  onAction={dispatchScene}
                />
              )}
              {activeAuxiliary === "time-content" && <TimeContentLibrary state={timeContentState} onAction={dispatchTimeContent} />}
            </aside>
          ), document.body)}
          <section className="build-canvas-toolbar" aria-label="Build regions">
            <button type="button" disabled={locked} onClick={() => open("structure")}>Structure</button>
            <button type="button" disabled={locked} onClick={() => open("inspector")}>Inspector</button>
          </section>
          <section className="build-region-grid">
            <ModalFocusScope
              as="section"
              open={tablet && openSheet === "structure"}
              className={"build-side-sheet build-structure-sheet" + (openSheet === "structure" ? " build-sheet-open" : "")}
              role={tablet && openSheet === "structure" ? "dialog" : undefined}
              aria-modal={tablet && openSheet === "structure" ? "true" : undefined}
              aria-label="Dashboard structure"
              onEscape={close}
            >
              {tablet && openSheet === "structure" && <button type="button" className="build-sheet-close" onClick={close}>Close</button>}
              {structure}
            </ModalFocusScope>
            <ModalFocusScope
              as="section"
              open={tablet && openSheet === "inspector"}
              className={"build-side-sheet build-inspector-sheet" + (openSheet === "inspector" ? " build-sheet-open" : "")}
              role={tablet && openSheet === "inspector" ? "dialog" : undefined}
              aria-modal={tablet && openSheet === "inspector" ? "true" : undefined}
              aria-label="Context inspector"
              onEscape={close}
            >
              {tablet && openSheet === "inspector" && <button type="button" className="build-sheet-close" onClick={close}>Close</button>}
              {inspector}
            </ModalFocusScope>
          </section>
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
      )}
    />
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
    structure: "Structure",
    scenario: "Scenario",
    "time-content": "Time Content",
    "time-group": "Time Group",
    scene: "Scene",
  })[surface] ?? "Build work";
}

function timeGroupDraftInput(dashboard, charts, groupOverride = undefined) {
  const group = groupOverride === undefined ? dashboard.timeSyncGroups?.[0] : groupOverride;
  const start = Date.parse(`${group?.period?.start ?? new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
  const end = Date.parse(`${group?.period?.end ?? new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
  const memberFallbacks = Object.fromEntries((group?.members ?? [])
    .filter((member) => member.matching?.policy)
    .map((member) => [member.chartId, matchingLabel(member.matching.policy)]));
  return {
    group: {
      id: group?.id ?? stableDraftId("time-group"),
      name: group?.name ?? "",
      period: { startEpochMs: start, endEpochMs: end },
      chartIds: (group?.members ?? []).map(({ chartId }) => chartId),
      defaultMatching: matchingLabel(group?.matching?.policy ?? "exact"),
      memberFallbacks,
      secondsPerFrame: group?.secondsPerFrame ?? 1,
    },
    charts,
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

function temporalAuthoringCharts(dashboard) {
  const memberships = new Map();
  for (const group of dashboard.timeSyncGroups ?? []) {
    for (const member of group.members ?? []) memberships.set(member.chartId, member);
  }
  return collectChartPlacements(dashboard).map((placement) => {
    const chart = placement.chart;
    const member = memberships.get(chart.id);
    const timeField = bindingField(chart.roles?.[member?.timeRole])
      ?? temporalRoleField(chart.roles);
    const rows = dashboard.loadedData?.[chart.sourceId] ?? [];
    const valueFields = Object.entries(chart.roles ?? {})
      .filter(([role]) => role !== member?.timeRole)
      .flatMap(([, binding]) => bindingFields(binding))
      .filter((field) => field && field !== timeField);
    const variables = valueFields.map((field) => ({
      id: field,
      label: field,
      observations: rows.map((row) => ({
        epochMs: parseEpoch(row?.[timeField]),
        value: row?.[field],
      })).filter(({ epochMs }) => Number.isFinite(epochMs)),
    }));
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
      interpolationAllowed: chart.interaction?.timeSync?.interpolationAllowed === true,
      variables,
      sourceChart: chart,
      timeRole: member?.timeRole ?? temporalRoleName(chart.roles),
    };
  });
}

function initialScene(dashboard, preferredPageId) {
  if (dashboard.scenes?.[0]) return structuredClone(dashboard.scenes[0]);
  const group = dashboard.timeSyncGroups?.[0];
  const placements = collectChartPlacements(dashboard);
  const memberIds = new Set((group?.members ?? []).map(({ chartId }) => chartId));
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
    groupId: group?.id ?? "select-time-group",
    period: {
      start: `${startDate}T00:00:00.000Z`,
      end: `${endDate}T00:00:00.000Z`,
    },
    frames: { mode: "source", chartId: firstChartId, selection: "all" },
    members: chartIds.map((chartId) => ({ chartId, width: 2 })),
    present: {
      chartIds,
      layout: ({ 1: "single", 2: "split", 3: "trio", 4: "quad" })[chartIds.length] ?? "single",
    },
    audience: { datePosition: { xPermille: 680, yPermille: 40, widthPermille: 280 } },
  };
}

function sceneValidationContext(dashboard) {
  return {
    groups: dashboard.timeSyncGroups ?? [],
    pages: dashboard.pages ?? [],
    charts: collectChartPlacements(dashboard).map(({ chart, pageId }) => ({ ...chart, pageId })),
    scenes: dashboard.scenes ?? [],
  };
}

function sceneEligibleCharts(dashboard, charts, scene) {
  const group = dashboard.timeSyncGroups?.find(({ id }) => id === scene?.groupId);
  const memberIds = new Set((group?.members ?? []).map(({ chartId }) => chartId));
  return charts.filter((chart) => memberIds.has(chart.id) && chart.pageId === scene?.pageId);
}

function mergeTimeGroup(groups, saved, charts) {
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
    members: saved.chartIds.map((chartId) => ({
      ...(memberById.get(chartId) ?? {}),
      chartId,
      timeRole: memberById.get(chartId)?.timeRole ?? chartById.get(chartId)?.timeRole ?? "observation",
      ...(saved.memberFallbacks?.[chartId]
        ? { matching: matchingValue(saved.memberFallbacks[chartId]) }
        : {}),
    })),
  };
  return existing
    ? groups.map((group) => group.id === saved.id ? next : group)
    : [...groups, next];
}

function mergeScene(scenes, saved) {
  return scenes.some(({ id }) => id === saved.id)
    ? scenes.map((scene) => scene.id === saved.id ? structuredClone(saved) : scene)
    : [...scenes, structuredClone(saved)];
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
