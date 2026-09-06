import React from "react";

import { sourceStateForDashboard } from "../../charting/data/chartDataState.js";
import SectionStructureCommandDialog from "../build/SectionStructureCommandDialog.jsx";
import { SimExIcon } from "../common/SimExIcon.js";
import LayoutGrid from "../LayoutGrid.jsx";
import DashboardChartPlacement from "./DashboardChartPlacement.jsx";

function DashboardSection({
  section,
  sectionDraft,
  pageId,
  index,
  count,
  movablePageCount,
  getDashboard,
  excludedIds,
  rowsBySource,
  chartDataStates,
  dataSourceStates,
  datasetProfiles,
  geoDataSources,
  dataSources,
  assets,
  contentRenderContext,
  accessibilityEnabled,
  showFullscreen,
  actions,
  disabled,
  selectedPlacementId,
  sectionSelected,
  draggingPanelId,
  dragOverPanelId,
  onAddPanelToSection,
  onDisplayAction,
  multiSelectMode,
  multiPanelIds,
  onToggleMultiPanel,
  onStartMultiFullscreenSelection,
}) {
  const visiblePlacements = (section.panels ?? []).filter((placement) => {
    const chart = placement.chart ?? placement;
    return !excludedIds.has(chart.id);
  });
  if (visiblePlacements.length === 0 && !actions && !onAddPanelToSection) return null;

  const dashboardDataState = {
    loadedData: rowsBySource,
    chartDataStates,
    dataSourceStates,
  };
  return (
    <section
      className={`dashboard-section${sectionSelected ? " is-build-selected" : ""}`}
      data-canonical-section-id={section.id}
    >
      {actions ? (
        <BuildSectionHeader
          sectionDraft={sectionDraft}
          getDashboard={getDashboard}
          movablePageCount={movablePageCount}
          pageId={pageId}
          index={index}
          count={count}
          disabled={disabled}
          onReorder={(targetIndex) => actions.reorderSection(section.id, targetIndex)}
          onCommand={actions.structureCommand}
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
            const selected = selectedPlacementId === placement.id;
            return (
              <DashboardChartPlacement
                key={placement.id}
                placement={placement}
                pageId={pageId}
                sectionId={section.id}
                rows={rowsBySource?.[chart.sourceId]}
                sourceState={sourceStateForDashboard(dashboardDataState, chart.sourceId, chart.id)}
                datasetProfile={datasetProfiles?.[chart.sourceId]}
                geoData={geoDataSources[chart.presentation?.map?.geoSource]}
                dataSources={dataSources}
                assets={assets}
                contentRenderContext={contentRenderContext}
                accessibilityEnabled={accessibilityEnabled}
                showFullscreen={showFullscreen}
                actions={actions}
                editDisabled={disabled}
                editControlDisabled={disabled && !selected}
                isDragging={draggingPanelId === placement.id}
                isDragTarget={dragOverPanelId === placement.id}
                isSelected={selected}
                onDisplayAction={onDisplayAction}
                multiSelectMode={multiSelectMode}
                isMultiSelected={multiPanelIds.includes(chart.id)}
                multiSelectionIndex={multiPanelIds.indexOf(chart.id) + 1}
                onToggleMultiPanel={actions ? undefined : onToggleMultiPanel}
                onStartMultiFullscreenSelection={actions ? undefined : onStartMultiFullscreenSelection}
              />
            );
          })}
        </LayoutGrid>
      ) : (
        <section
          className="dashboard-empty-section build-empty-section"
          aria-label={`${sectionDraft.title || "Untitled section"} empty state`}
          data-build-empty-drop-target={actions ? "true" : undefined}
          onDragOver={actions ? (event) => actions.panelDragOver(event, {
            pageId,
            sectionId: section.id,
            index: 0,
            edge: "empty",
          }) : undefined}
          onDrop={actions ? (event) => actions.panelDrop(event, {
            pageId,
            sectionId: section.id,
            index: 0,
          }) : undefined}
        >
          <p>This section has no panels.</p>
          {actions ? (
            <div className="build-empty-section__actions">
              <button type="button" disabled={disabled} onClick={() => actions.addChart(section.id)}>
                Add chart
              </button>
              <button type="button" disabled={disabled} onClick={() => actions.addStaticContent(section.id)}>
                Add Text/Image
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => onAddPanelToSection?.(section.id)}>
              Add Panel to Section
            </button>
          )}
        </section>
      )}
    </section>
  );
}

function BuildSectionHeader({
  sectionDraft,
  getDashboard,
  movablePageCount,
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
        <button type="button" className="secondary build-section-move-button" disabled={disabled || index === 0} aria-label={`Move ${title} earlier`} title={`Move ${title} earlier`} onClick={() => onReorder(index - 1)}>
          <SimExIcon iconId="reorderPrevious" className="build-section-move-icon build-section-move-icon--up" size={18} />
        </button>
        <button type="button" className="secondary build-section-move-button" disabled={disabled || index === count - 1} aria-label={`Move ${title} later`} title={`Move ${title} later`} onClick={() => onReorder(index + 1)}>
          <SimExIcon iconId="reorderNext" className="build-section-move-icon build-section-move-icon--down" size={18} />
        </button>
        <button type="button" className="secondary" disabled={disabled || count === 1 || movablePageCount === 0} aria-label={`Move ${title} to Page`} onClick={() => setCommand("move")}>Move to Page</button>
        <button type="button" className="secondary" disabled={disabled || count === 1} aria-label={`Merge ${title}`} onClick={() => setCommand("merge")}>Merge</button>
        <button type="button" className="secondary danger" disabled={disabled || count === 1} aria-label={`Remove ${title}`} onClick={() => setCommand("remove")}>Remove</button>
      </div>
      {command && <SectionStructureCommandDialog command={command} dashboard={getDashboard()} pageId={pageId} section={sectionDraft} onCancel={() => setCommand(null)} onConfirm={(operation) => { onCommand?.(operation); setCommand(null); }} />}
    </div>
  );
}

export default React.memo(DashboardSection);
