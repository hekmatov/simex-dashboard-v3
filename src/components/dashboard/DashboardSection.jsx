import React from "react";

import { sectionRole } from "../../charting/config/sectionRoles.js";

import { sourceStateForDashboard } from "../../charting/data/chartDataState.js";
import ActionMenu from "../common/ActionMenu.jsx";
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
      tabIndex={-1}
    >
      {actions ? (
        <BuildSectionHeader
          sectionDraft={sectionDraft}
          role={sectionRole(sectionDraft)}
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

export function BuildSectionHeader({
  role = "standard",
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
        {role === "attention" && <span className="section-role-tag">Attention strip</span>}
        {sectionDraft.description && <p>{sectionDraft.description}</p>}
      </div>
      <div className="build-section-actions" aria-label={`${title} Section actions`}>
        <ActionMenu
          id={`section-menu-${sectionDraft.id}`}
          label={`Section actions for ${title}`}
          disabled={disabled}
          triggerProps={{ "data-section-menu": sectionDraft.id }}
          items={[
            { id: "rename", label: "Rename", onSelect: () => setRenaming(true) },
            { id: "move-earlier", label: "Move earlier", disabled: index === 0, onSelect: () => onReorder(index - 1) },
            { id: "move-later", label: "Move later", disabled: index === count - 1, onSelect: () => onReorder(index + 1) },
            { id: "move-page", label: "Move to Page…", disabled: count === 1 || movablePageCount === 0, onSelect: () => setCommand("move") },
            { id: "merge", label: "Merge…", disabled: count === 1, onSelect: () => setCommand("merge") },
            { id: "remove", label: "Remove…", danger: true, disabled: count === 1, onSelect: () => setCommand("remove") },
          ]}
        >
          <SimExIcon iconId="moveFourWay" size={16} />
          <span>Actions</span>
        </ActionMenu>
      </div>
      {command && <SectionStructureCommandDialog command={command} dashboard={getDashboard()} pageId={pageId} section={sectionDraft} onCancel={() => setCommand(null)} onConfirm={(operation) => { onCommand?.(operation); setCommand(null); }} />}
    </div>
  );
}

export default React.memo(DashboardSection);
