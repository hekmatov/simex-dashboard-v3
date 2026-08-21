import React from "react";

import DeviceLayoutControl from "../DeviceLayoutControl.jsx";
import { SimExIcon } from "../common/SimExIcon.js";
import ModalFocusScope from "../common/ModalFocusScope.jsx";
import CanonicalDashboardFrame, { CanonicalDashboardFooter } from "../dashboard/CanonicalDashboardFrame.jsx";
import DashboardCanvas from "../dashboard/DashboardCanvas.jsx";
import DashboardHeader from "../dashboard/DashboardHeader.jsx";
import BuildInspector from "./BuildInspector.jsx";
import BuildPageNavigation from "./BuildPageNavigation.jsx";
import BuildStructureRail from "./BuildStructureRail.jsx";
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
  onRevealComplete,
  onDashboardChange,
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
  const [tablet, setTablet] = React.useState(false);
  const locked = mutationsDisabled || chartDraftOpen;
  const navigationLocked = mutationsDisabled || chartDraftDirty;
  const selectedChart = findSelectedChart(dashboard, selection);
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
    if (navigationLocked) return Promise.resolve(false);
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

  const structure = (
    <BuildStructureRail
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
          data-device-layout={deviceLayout}
          data-open={buildPanelOpen ? "true" : "false"}
          aria-hidden={buildPanelOpen ? undefined : "true"}
          inert={!buildPanelOpen}
        >
          <BuildPageNavigation
            pages={dashboard.pages}
            activePageId={activePage?.id}
            pageDrafts={pageDrafts}
            disabled={navigationLocked}
            onSelectPage={(pageId) => void chooseSelection({ kind: "page", pageId }, { intent: "activate" })}
            onPageChange={onPageChange}
            onPageReorder={onPageReorder}
          />
          <section className="build-command-area" aria-label="Build commands">
            <div className="build-command-title">
              <p className="eyebrow">Workspace</p>
              <strong>Build commands</strong>
            </div>
            <button type="button" disabled={locked} onClick={onFinish}>Finish Build</button>
            <button type="button" className="secondary" disabled={locked} onClick={onReset}>Reset</button>
            <button type="button" className="secondary" disabled={locked} onClick={() => onAddChart?.()}>Add chart</button>
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

function findSelectedChart(dashboard, selection) {
  if (selection?.kind !== "chart") return null;
  const page = (dashboard.pages ?? []).find(({ id }) => id === selection.pageId);
  const section = (page?.sections ?? []).find(({ id }) => id === selection.sectionId);
  const placement = (section?.panels ?? []).find(({ id }) => id === selection.placementId);
  return placement?.chart ?? placement ?? null;
}
