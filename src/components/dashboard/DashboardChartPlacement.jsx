import React from "react";

import ChartPanel from "../ChartPanel.jsx";

function DashboardChartPlacement({
  placement,
  pageId,
  sectionId,
  rows,
  sourceState,
  datasetProfile,
  geoData,
  dataSources,
  assets,
  contentRenderContext,
  accessibilityEnabled,
  showFullscreen = true,
  actions = null,
  editDisabled = false,
  editControlDisabled = false,
  isDragging = false,
  isDragTarget = false,
  isSelected = false,
  onDisplayAction,
  multiSelectMode = false,
  isMultiSelected = false,
  multiSelectionIndex = 0,
  onToggleMultiPanel,
  onStartMultiFullscreenSelection,
}) {
  const chart = placement.chart ?? placement;
  const placementId = placement.id ?? chart.id;
  const onRemove = React.useCallback(() => {
    actions?.removePanel(placementId);
  }, [actions, placementId]);
  const onMove = React.useCallback((invoker) => {
    actions?.requestPanelMove({
      kind: "panel",
      pageId,
      sectionId,
      placementId,
    }, chart.title, invoker);
  }, [actions, chart.title, pageId, placementId, sectionId]);
  const onDragStart = React.useCallback((event) => {
    actions?.panelDragStart(event, {
      kind: "panel",
      pageId,
      sectionId,
      placementId,
    });
  }, [actions, pageId, placementId, sectionId]);
  const onDragOver = React.useCallback((event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const edge = event.clientY >= rect.top + rect.height / 2 ? "after" : "before";
    actions?.panelDragOver(event, { pageId, sectionId, placementId, edge });
  }, [actions, pageId, placementId, sectionId]);
  const onDrop = React.useCallback((event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const edge = event.clientY >= rect.top + rect.height / 2 ? "after" : "before";
    actions?.panelDrop(event, { pageId, sectionId, placementId, edge });
  }, [actions, pageId, placementId, sectionId]);

  return (
    <ChartPanel
      panel={chart}
      canonicalPanelId={chart.id}
      canonicalPlacementId={placementId}
      canonicalPlotId={chart.id}
      rows={rows}
      sourceState={sourceState}
      datasetProfile={datasetProfile}
      geoData={geoData}
      dataSources={dataSources}
      assets={assets}
      contentRenderContext={contentRenderContext}
      accessibilityEnabled={accessibilityEnabled}
      showFullscreen={showFullscreen}
      editMode={Boolean(actions)}
      placementId={placementId}
      editDisabled={editDisabled}
      editControlDisabled={editControlDisabled}
      isDragging={isDragging}
      isDragTarget={isDragTarget}
      isSelected={isSelected}
      editPageId={actions ? pageId : undefined}
      editSectionId={actions ? sectionId : undefined}
      onBuildSelect={actions?.select}
      onRemove={actions ? onRemove : undefined}
      onMove={actions ? onMove : undefined}
      onDragStart={actions ? onDragStart : undefined}
      onDragOver={actions ? onDragOver : undefined}
      onDrop={actions ? onDrop : undefined}
      onDragEnd={actions?.panelDragEnd}
      onDisplayAction={onDisplayAction}
      multiSelectMode={multiSelectMode}
      isMultiSelected={isMultiSelected}
      multiSelectionIndex={multiSelectionIndex}
      onToggleMultiPanel={onToggleMultiPanel}
      onStartMultiFullscreenSelection={onStartMultiFullscreenSelection}
    />
  );
}

export default React.memo(DashboardChartPlacement);
