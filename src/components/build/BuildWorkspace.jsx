import React from "react";

import DeviceLayoutControl from "../DeviceLayoutControl.jsx";
import ModalFocusScope from "../common/ModalFocusScope.jsx";
import DashboardCanvas from "../dashboard/DashboardCanvas.jsx";
import BuildInspector from "./BuildInspector.jsx";
import BuildStructureRail from "./BuildStructureRail.jsx";

export default function BuildWorkspace({
  dashboard,
  activePage,
  selection,
  dashboardDraft,
  pageDrafts,
  sectionDrafts,
  chartEditor,
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
  onAddPage,
  onAddSection,
  onAddChart,
  onRemovePage,
  onFinish,
  onReset,
  onImport,
  onExport,
  onOpenBackground,
  onDeviceLayoutChange,
  onDisplayAction,
}) {
  const importInputRef = React.useRef(null);
  const [openSheet, setOpenSheet] = React.useState(null);
  const [tablet, setTablet] = React.useState(false);
  const locked = mutationsDisabled || chartDraftOpen;

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
    setOpenSheet("inspector");
  }, [focusLabelKey, tablet]);

  const chooseSelection = (next) => {
    if (locked) return;
    onSelectionChange?.(next);
    if (next.pageId && next.pageId !== activePage?.id) {
      onActivePageChange?.(next.pageId);
    }
    if (tablet) setOpenSheet("inspector");
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
      onAddPage={onAddPage}
      onAddSection={onAddSection}
      onRemovePage={onRemovePage}
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
      chartEditor={chartEditor}
      focusLabelKey={focusLabelKey}
      onDashboardChange={onDashboardChange}
      onPageChange={onPageChange}
      onSectionChange={onSectionChange}
    />
  );

  return (
    <main className="build-workspace" data-device-layout={deviceLayout}>
      <header className="build-header">
        <div>
          <p className="eyebrow">Build</p>
          <h1>{dashboard.programLabel || "SimEx Dashboard"}</h1>
          <p>{dashboard.scenarioLabel || "Dashboard authoring workspace"}</p>
        </div>
        <span>{dashboard.lastUpdated}</span>
      </header>
      <nav className="build-page-tabs" aria-label="Dashboard pages">
        {(dashboard.pages ?? []).map((page) => (
          <button
            key={page.id}
            type="button"
            className={page.id === activePage?.id ? "active" : "secondary"}
            disabled={locked}
            aria-current={page.id === activePage?.id ? "page" : undefined}
            onClick={() => chooseSelection({ kind: "page", pageId: page.id })}
          >
            {page.label || page.title || "Untitled page"}
          </button>
        ))}
      </nav>
      <section className="build-command-area" aria-label="Build commands">
        <div className="build-command-title">
          <p className="eyebrow">Workspace</p>
          <strong>Build commands</strong>
        </div>
        <button type="button" disabled={locked} onClick={onFinish}>Finish Build</button>
        <button type="button" className="secondary" disabled={locked} onClick={onReset}>Reset</button>
        <button type="button" className="secondary" disabled={locked} onClick={onAddChart}>Add chart</button>
        <button type="button" className="secondary" disabled={locked} onClick={() => importInputRef.current?.click()}>Import</button>
        <button type="button" className="secondary" disabled={locked} onClick={onExport}>Export</button>
        <input
          ref={importInputRef}
          className="visually-hidden"
          type="file"
          accept="application/json,.json"
          disabled={locked}
          onChange={(event) => {
            onImport?.(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
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
          className={`build-side-sheet build-structure-sheet${openSheet === "structure" ? " build-sheet-open" : ""}`}
          role={tablet && openSheet === "structure" ? "dialog" : undefined}
          aria-modal={tablet && openSheet === "structure" ? "true" : undefined}
          aria-label="Dashboard structure"
          onEscape={close}
        >
          {tablet && openSheet === "structure" && <button type="button" className="build-sheet-close" onClick={close}>Close</button>}
          {structure}
        </ModalFocusScope>
        <section className="build-live-canvas" aria-label="Live dashboard canvas">
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
              onSelect: chooseSelection,
            }}
          />
        </section>
        <ModalFocusScope
          as="section"
          open={tablet && openSheet === "inspector"}
          className={`build-side-sheet build-inspector-sheet${openSheet === "inspector" ? " build-sheet-open" : ""}`}
          role={tablet && openSheet === "inspector" ? "dialog" : undefined}
          aria-modal={tablet && openSheet === "inspector" ? "true" : undefined}
          aria-label="Context inspector"
          onEscape={close}
        >
          {tablet && openSheet === "inspector" && <button type="button" className="build-sheet-close" onClick={close}>Close</button>}
          {inspector}
        </ModalFocusScope>
      </section>
    </main>
  );
}
