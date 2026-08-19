import React from "react";

import DeviceLayoutControl from "../DeviceLayoutControl.jsx";
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
  selection,
  dashboardDraft,
  pageDrafts,
  sectionDrafts,
  chartEditor,
  onCloseChartEditor,
  chartDraftOpen = false,
  mutationsDisabled = false,
  deviceLayout,
  focusLabelKey,
  operationError = "",
  appearanceControls,
  geoDataSources,
  onActivePageChange,
  onSelectionChange,
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
  onOpenBackground,
  onDeviceLayoutChange,
  onDisplayAction,
}) {
  const [openSheet, setOpenSheet] = React.useState(null);
  const [tablet, setTablet] = React.useState(false);
  const locked = mutationsDisabled || chartDraftOpen;
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

  const chooseSelection = (next) => {
    if (locked) return;
    onSelectionChange?.(next);
    if (next.pageId && next.pageId !== activePage?.id) {
      onActivePageChange?.(next.pageId);
    }
    if (tablet) setOpenSheet(next.kind === "chart" ? null : "inspector");
  };
  const open = (name) => {
    if (!locked) setOpenSheet(name);
  };
  const close = () => setOpenSheet(null);

  const structure = (
    <BuildStructureRail
      dashboard={dashboard}
      selection={selection}
      disabled={locked}
      onSelect={chooseSelection}
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
      pageId={activePage?.id}
      dashboardHeader={<DashboardHeader activePage={activePage} dashboard={dashboard} />}
      pageContent={(
        <DashboardCanvas
          activePage={activePage}
          dashboard={dashboard}
          surface="build"
          geoDataSources={geoDataSources}
          onNavigate={(pageId) => chooseSelection({ kind: "page", pageId })}
          onDisplayAction={onDisplayAction}
          buildState={{
            selection,
            disabled: locked,
            sectionDrafts,
            onSelect: chooseSelection,
            onRenameSection: onSectionChange,
            onReorderSection: onSectionReorder,
            onAddSection,
            onAddChart,
          }}
        />
      )}
      footer={<CanonicalDashboardFooter dashboard={dashboard} />}
      overlayLayer={(
        <div className="build-authoring-layer" data-device-layout={deviceLayout}>
          <BuildPageNavigation
            pages={dashboard.pages}
            activePageId={activePage?.id}
            pageDrafts={pageDrafts}
            disabled={locked}
            onSelectPage={(pageId) => chooseSelection({ kind: "page", pageId })}
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
          {selection?.kind === "chart" && chartEditor && (
            <UnitOrbit
              anchorPlacementId={selection.placementId}
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
