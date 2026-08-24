import React from "react";

import { sourceStateForDashboard } from "../../charting/data/chartDataState.js";
import ChartPanel from "../ChartPanel.jsx";
import LandingPage, { hasLandingPresentation } from "../LandingPage.jsx";
import LayoutGrid from "../LayoutGrid.jsx";
import { SimExIcon } from "../common/SimExIcon.js";
import SectionStructureCommandDialog from "../build/SectionStructureCommandDialog.jsx";
import SceneViewCompositionGrid from "../time/SceneViewCompositionGrid.jsx";

export default function DashboardCanvas({
  activePage,
  dashboard,
  surface,
  buildState,
  displayState,
  multiSelectMode = false,
  multiPanelIds = [],
  excludedChartIds = [],
  chronoSection = null,
  geoDataSources = {},
  onNavigate,
  onAddPanelToSection,
  onDisplayAction,
  onToggleMultiPanel,
  onStartMultiFullscreenSelection,
}) {
  const canvasInstanceId = React.useId();
  const excludedIds = new Set([
    ...excludedChartIds,
    ...(chronoSection?.chartIds ?? []),
  ]);
  const chronoPlacements = chronoSection
    ? (activePage?.sections ?? []).flatMap((section) => (
        (section.panels ?? [])
          .filter((placement) => chronoSection.chartIds.includes((placement.chart ?? placement).id))
          .map((placement) => ({ placement, section }))
      ))
    : [];
  const chronoMemberCount = chronoSection?.scene
    ? (chronoSection.scene.members ?? []).length
    : chronoPlacements.length;

  if (!activePage) return null;
  const landingActive = hasLandingPresentation(activePage);
  const accessibilityEnabled = dashboard.globalStyles?.accessibility?.enabled === true;

  return (
    <section
      className="dashboard-workspace"
      data-dashboard-surface={surface}
      data-canonical-canvas-id={activePage.id}
      data-canonical-canvas-instance={canvasInstanceId}
    >
      <div className="page-stack" data-canonical-grid-id={activePage.id}>
        {landingActive ? (
          <LandingPage page={activePage} pages={dashboard.pages} onNavigate={onNavigate} />
        ) : (
          <>
            {chronoMemberCount > 0 && (
              <section
                className="dashboard-section chrono-dashboard-section"
                data-chrono-section={chronoSection.id}
              >
                <div className="section-header">
                  <div className="section-title-block">
                    <h2>{chronoSection.title}</h2>
                    <p>{chronoMemberCount} participating chart{chronoMemberCount === 1 ? "" : "s"}</p>
                  </div>
                </div>
                {chronoSection.scene ? (
                  <SceneViewCompositionGrid
                    dashboard={dashboard}
                    scene={chronoSection.scene}
                    timeContextForChart={chronoSection.timeContextForChart}
                    surface="view-scene"
                  />
                ) : (
                  <LayoutGrid>
                    {chronoPlacements.map(({ placement }) => {
                      const chart = placement.chart ?? placement;
                      return (
                        <ChartPanel
                          key={placement.id}
                          panel={chart}
                          canonicalPanelId={chart.id}
                          canonicalPlacementId={placement.id ?? chart.id}
                          canonicalPlotId={chart.id}
                          rows={dashboard.loadedData?.[chart.sourceId]}
                          sourceState={sourceStateForDashboard(dashboard, chart.sourceId, chart.id)}
                          datasetProfile={dashboard.datasetProfiles?.[chart.sourceId]}
                          geoData={geoDataSources[chart.presentation?.map?.geoSource]}
                          dataSources={dashboard.dataSources}
                          accessibilityEnabled={accessibilityEnabled}
                          onDisplayAction={onDisplayAction}
                          multiSelectMode={multiSelectMode}
                          isMultiSelected={multiPanelIds.includes(chart.id)}
                          multiSelectionIndex={multiPanelIds.indexOf(chart.id) + 1}
                          onToggleMultiPanel={onToggleMultiPanel}
                          onStartMultiFullscreenSelection={onStartMultiFullscreenSelection}
                        />
                      );
                    })}
                  </LayoutGrid>
                )}
              </section>
            )}
            {(activePage.sections ?? []).map((section, sectionIndex) => {
              const visiblePlacements = (section.panels ?? []).filter((placement) => {
                const chart = placement.chart ?? placement;
                return !excludedIds.has(chart.id);
              });
              if (visiblePlacements.length === 0 && !buildState && !onAddPanelToSection) {
                return null;
              }
              const sectionDraft = buildState?.sectionDrafts?.[section.id] ?? section;
              return (
                <section className={`dashboard-section${buildState?.selection?.kind === "section" && buildState.selection.sectionId === section.id ? " is-build-selected" : ""}`} data-canonical-section-id={section.id} key={section.id}>
                  {buildState ? (
                    <BuildSectionHeader
                      sectionDraft={sectionDraft}
                      dashboard={dashboard}
                      pageId={activePage.id}
                      index={sectionIndex}
                      count={activePage.sections?.length ?? 0}
                      disabled={Boolean(buildState.disabled)}
                      onReorder={(targetIndex) => buildState.onReorderSection?.(section.id, targetIndex)}
                      onCommand={buildState.onStructureCommand}
                    />
                  ) : (
                    <div className="section-header">
                      <div className="section-title-block">
                        <h2>{section.title}</h2>
                        {section.description && <p>{section.description}</p>}
                      </div>
                    </div>
                  )}
                  {visiblePlacements.length > 0 ? (
                    <LayoutGrid>
                      {visiblePlacements.map((placement) => {
                        const chart = placement.chart ?? placement;
                        const selected = buildState?.selection?.kind === "chart"
                          && buildState.selection.placementId === placement.id;
                        return (
                          <ChartPanel
                            key={placement.id}
                            panel={chart}
                            canonicalPanelId={chart.id}
                            canonicalPlacementId={placement.id ?? chart.id}
                            canonicalPlotId={chart.id}
                            rows={dashboard.loadedData?.[chart.sourceId]}
                            sourceState={sourceStateForDashboard(dashboard, chart.sourceId, chart.id)}
                            datasetProfile={dashboard.datasetProfiles?.[chart.sourceId]}
                            geoData={geoDataSources[chart.presentation?.map?.geoSource]}
                            dataSources={dashboard.dataSources}
                            accessibilityEnabled={accessibilityEnabled}
                            editMode={Boolean(buildState)}
                            placementId={placement.id}
                            editDisabled={Boolean(buildState?.disabled)}
                            editControlDisabled={Boolean(buildState?.disabled) && !selected}
                            isSelected={selected}
                            editPageId={buildState ? activePage.id : undefined}
                            editSectionId={buildState ? section.id : undefined}
                            onBuildSelect={buildState?.onSelect}
                            onDisplayAction={onDisplayAction}
                            multiSelectMode={multiSelectMode}
                            isMultiSelected={multiPanelIds.includes(chart.id)}
                            multiSelectionIndex={multiPanelIds.indexOf(chart.id) + 1}
                            onToggleMultiPanel={onToggleMultiPanel}
                            onStartMultiFullscreenSelection={onStartMultiFullscreenSelection}
                          />
                        );
                      })}
                    </LayoutGrid>
                  ) : (
                    <section className="dashboard-empty-section build-empty-section" aria-label={`${sectionDraft.title || "Untitled section"} empty state`}>
                      <p>This section has no panels.</p>
                      <button
                        type="button"
                        disabled={Boolean(buildState?.disabled)}
                        onClick={() => (buildState
                          ? buildState.onAddChart?.(section.id)
                          : onAddPanelToSection?.(section.id))}
                      >
                        Add Panel to Section
                      </button>
                    </section>
                  )}
                </section>
              );
            })}
            {buildState && (
              <div className="build-add-section-row">
                <button
                  type="button"
                  className="secondary"
                  disabled={Boolean(buildState.disabled)}
                  onClick={() => buildState.onAddSection?.()}
                >
                  <SimExIcon iconId="addTab" size={18} />
                  <span>Add section</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function BuildSectionHeader({
  sectionDraft,
  dashboard,
  pageId,
  index,
  count,
  disabled,
  onReorder,
  onCommand,
}) {
  const title = sectionDraft.title || "Untitled section";
  const [renaming, setRenaming] = React.useState(false);
  const [name, setName] = React.useState(title);
  const [command, setCommand] = React.useState(null);

  function commitRename() {
    const next = name.trim();
    if (next && next !== title) onCommand?.({ type: "rename-section", pageId, sectionId: sectionDraft.id, title: next });
    else setName(title);
    setRenaming(false);
  }

  return (
    <div className="section-header build-section-header">
      <div className="section-title-block">
        {renaming ? <input className="build-section-title-input" aria-label="Section title" autoFocus value={name} onChange={(event) => setName(event.target.value)} onBlur={commitRename} onKeyDown={(event) => { if (event.key === "Enter") commitRename(); if (event.key === "Escape") { setName(title); setRenaming(false); } }} /> : <h2><button type="button" className="build-section-title-trigger" disabled={disabled} aria-label={`Edit Section title: ${title}`} onClick={() => setRenaming(true)}>{title}</button></h2>}
        {sectionDraft.description && <p>{sectionDraft.description}</p>}
      </div>
      <div className="build-section-actions" aria-label={`${title} Section actions`}>
        <button
          type="button"
          className="secondary build-section-move-button"
          disabled={disabled || index === 0}
          aria-label={`Move ${title} earlier`}
          title={`Move ${title} earlier`}
          onClick={() => onReorder(index - 1)}
        >
          <SimExIcon
            iconId="reorderPrevious"
            className="build-section-move-icon build-section-move-icon--up"
            size={18}
          />
        </button>
        <button
          type="button"
          className="secondary build-section-move-button"
          disabled={disabled || index === count - 1}
          aria-label={`Move ${title} later`}
          title={`Move ${title} later`}
          onClick={() => onReorder(index + 1)}
        >
          <SimExIcon
            iconId="reorderNext"
            className="build-section-move-icon build-section-move-icon--down"
            size={18}
          />
        </button>
        <button type="button" className="secondary" disabled={disabled || count === 1 || dashboard.pages.filter(({ id, landing }) => id !== pageId && !landing).length === 0} aria-label={`Move ${title} to Page`} onClick={() => setCommand("move")}>Move to Page</button>
        <button type="button" className="secondary" disabled={disabled || count === 1} aria-label={`Merge ${title}`} onClick={() => setCommand("merge")}>Merge</button>
        <button type="button" className="secondary danger" disabled={disabled || count === 1} aria-label={`Remove ${title}`} onClick={() => setCommand("remove")}>Remove</button>
      </div>
      {command && <SectionStructureCommandDialog command={command} dashboard={dashboard} pageId={pageId} section={sectionDraft} onCancel={() => setCommand(null)} onConfirm={(operation) => { onCommand?.(operation); setCommand(null); }} />}
    </div>
  );
}
