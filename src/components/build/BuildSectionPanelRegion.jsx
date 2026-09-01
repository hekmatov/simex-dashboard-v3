import React from "react";

import { sourceStateForDashboard } from "../../charting/data/chartDataState.js";
import ChartPanel from "../ChartPanel.jsx";
import LayoutGrid from "../LayoutGrid.jsx";
import { sectionPanelRegionPropsEqual } from "./sectionReorderChartWork.js";

function BuildSectionPanelRegion({
  section,
  sectionDraft,
  pageId,
  runtime,
  delegates,
  editMode,
  disabled,
  selectedPlacementId,
  draggingPanelId,
  dragOverPanelId,
  multiSelectMode,
  multiPanelIds,
  excludedChartIds,
  chronoChartIds,
}) {
  const excludedIds = new Set([...excludedChartIds, ...chronoChartIds]);
  const visiblePlacements = (section.panels ?? []).filter((placement) => (
    !excludedIds.has((placement.chart ?? placement).id)
  ));

  if (visiblePlacements.length === 0) {
    if (!editMode && !delegates.canAddPanel()) return null;
    return (
      <section
        className="dashboard-empty-section build-empty-section"
        aria-label={`${sectionDraft.title || "Untitled section"} empty state`}
        data-build-empty-drop-target={editMode ? "true" : undefined}
        onDragOver={editMode ? (event) => delegates.panelDragOver(event, {
          pageId,
          sectionId: section.id,
          index: 0,
          edge: "empty",
        }) : undefined}
        onDrop={editMode ? (event) => delegates.panelDrop(event, {
          pageId,
          sectionId: section.id,
          index: 0,
        }) : undefined}
      >
        <p>This section has no panels.</p>
        {editMode ? (
          <div className="build-empty-section__actions">
            <button type="button" disabled={disabled} onClick={() => delegates.addChart(section.id)}>
              Add chart
            </button>
            <button type="button" disabled={disabled} onClick={() => delegates.addStaticContent(section.id)}>
              Add Text/Image
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => delegates.addPanel(section.id)}>
            Add Panel to Section
          </button>
        )}
      </section>
    );
  }

  return (
    <LayoutGrid>
      {visiblePlacements.map((placement) => (
        <SectionChartPanel
          key={placement.id}
          placement={placement}
          section={section}
          pageId={pageId}
          runtime={runtime}
          delegates={delegates}
          editMode={editMode}
          disabled={disabled}
          selected={selectedPlacementId === placement.id}
          isDragging={draggingPanelId === placement.id}
          isDragTarget={dragOverPanelId === placement.id}
          multiSelectMode={multiSelectMode}
          isMultiSelected={multiPanelIds.includes((placement.chart ?? placement).id)}
          multiSelectionIndex={multiPanelIds.indexOf((placement.chart ?? placement).id) + 1}
        />
      ))}
    </LayoutGrid>
  );
}

function SectionChartPanelContent({
  placement,
  section,
  pageId,
  runtime,
  delegates,
  editMode,
  disabled,
  selected,
  isDragging,
  isDragTarget,
  multiSelectMode,
  isMultiSelected,
  multiSelectionIndex,
}) {
  const chart = placement.chart ?? placement;
  const placementIndex = section.panels.indexOf(placement);
  const dragPayload = {
    kind: "panel",
    pageId,
    sectionId: section.id,
    placementId: placement.id,
  };
  return (
    <ChartPanel
      panel={chart}
      canonicalPanelId={chart.id}
      canonicalPlacementId={placement.id ?? chart.id}
      canonicalPlotId={chart.id}
      rows={runtime.loadedData?.[chart.sourceId]}
      sourceState={sourceStateForDashboard(runtime, chart.sourceId, chart.id)}
      datasetProfile={runtime.datasetProfiles?.[chart.sourceId]}
      geoData={runtime.geoDataSources[chart.presentation?.map?.geoSource]}
      dataSources={runtime.dataSources}
      assets={runtime.assets}
      contentRenderContext={runtime.contentRenderContext}
      accessibilityEnabled={runtime.accessibilityEnabled}
      editMode={editMode}
      placementId={placement.id}
      editDisabled={disabled}
      editControlDisabled={disabled && !selected}
      isDragging={isDragging}
      isDragTarget={isDragTarget}
      isSelected={selected}
      editPageId={editMode ? pageId : undefined}
      editSectionId={editMode ? section.id : undefined}
      onBuildSelect={delegates.select}
      onRemove={editMode ? () => delegates.removePanel(placement.id) : undefined}
      onMove={editMode ? (invoker) => delegates.requestPanelMove(dragPayload, chart.title, invoker) : undefined}
      onDragStart={editMode ? (event) => delegates.panelDragStart(event, dragPayload) : undefined}
      onDragOver={editMode ? (event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const after = event.clientY >= rect.top + rect.height / 2;
        delegates.panelDragOver(event, {
          pageId,
          sectionId: section.id,
          index: placementIndex + (after ? 1 : 0),
          placementId: placement.id,
          edge: after ? "after" : "before",
        });
      } : undefined}
      onDrop={editMode ? (event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const after = event.clientY >= rect.top + rect.height / 2;
        delegates.panelDrop(event, {
          pageId,
          sectionId: section.id,
          index: placementIndex + (after ? 1 : 0),
        });
      } : undefined}
      onDragEnd={delegates.panelDragEnd}
      onDisplayAction={delegates.displayAction}
      multiSelectMode={multiSelectMode}
      isMultiSelected={isMultiSelected}
      multiSelectionIndex={multiSelectionIndex}
      onToggleMultiPanel={delegates.toggleMultiPanel}
      onStartMultiFullscreenSelection={delegates.startMultiFullscreenSelection}
    />
  );
}

const SectionChartPanel = React.memo(SectionChartPanelContent);

export default React.memo(BuildSectionPanelRegion, sectionPanelRegionPropsEqual);
