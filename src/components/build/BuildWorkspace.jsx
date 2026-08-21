import React from "react";

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

export default function BuildWorkspace({
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
  onSectionChange,
  onTimeGroupChange,
  onOpenSceneComposer,
  onPageReorder,
  onSectionReorder,
  onAddSection,
  onAddChart,
  onFinish,
  onReset,
  onImportPackage,
  onExportPackage,
  onOpenBackground,
  onDeviceLayoutChange,
  onDisplayAction,
}) {
  const [openSheet, setOpenSheet] = React.useState(null);
  const [activeAuxiliary, setActiveAuxiliary] = React.useState(null);
  const [parkedAuxiliaries, setParkedAuxiliaries] = React.useState([]);
  const [structureDraft, setStructureDraft] = React.useState(() => createStructureDraft(dashboard));
  const [scenarioDraft, setScenarioDraft] = React.useState(() => createScenarioDraft({ ...dashboard, ...dashboardDraft }));
  const [tablet, setTablet] = React.useState(false);
  const locked = mutationsDisabled || chartDraftOpen;
  const navigationLocked = mutationsDisabled || chartDraftDirty;
  const selectedChartItem = selection?.kind === "chart"
    ? collectChartPlacements(dashboard).find(({ placementId }) => placementId === selection.placementId)
    : null;
  const selectedChart = selectedChartItem?.chart ?? null;
  const unitOrbitCapabilities = compatibleUnitOrbitCapabilities(selectedChartItem);
  const inspectorFocusKey = tablet
    ? (openSheet === "inspector" ? focusLabelKey : 0)
    : focusLabelKey;

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
            <button type="button" className="secondary" disabled={locked} onClick={() => onAddChart?.()}>Add chart</button>
            <button type="button" className="secondary" disabled={locked} onClick={() => openAuxiliary("structure")}>Pages &amp; sections</button>
            <button type="button" className="secondary" disabled={locked} onClick={() => openAuxiliary("scenario")}>Scenario details</button>
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
                  Resume {surface === "structure" ? "Structure" : "Scenario"}
                </button>
              ))}
            </nav>
          )}
          {activeAuxiliary && (
            <ModalFocusScope
              as="aside"
              open
              className="build-authoring-auxiliary"
              role="dialog"
              aria-modal="false"
              aria-label={activeAuxiliary === "structure" ? "Structure authoring" : "Scenario details"}
              onEscape={closeAuxiliary}
            >
              <button type="button" className="build-sheet-close" onClick={closeAuxiliary}>Close</button>
              {activeAuxiliary === "structure" ? (
                <StructureAuthoring draft={structureDraft} disabled={locked} onAction={dispatchStructure} />
              ) : (
                <ScenarioAuthoring draft={scenarioDraft} disabled={locked} onAction={dispatchScenario} />
              )}
            </ModalFocusScope>
          )}
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
