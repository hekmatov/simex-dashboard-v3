import React from "react";

import ChartView from "./charts/ChartView.jsx";
import ChartPanelActions from "./charts/ChartPanelActions.jsx";
import { IconControl } from "./common/SimExIcon.js";
import { useOptionalPlayback } from "./playback/PlaybackProvider.jsx";
import {
  chartPanelFootprintStyle,
  chartPanelLayoutClass,
  resolveChartFootprint,
} from "./chartPanelLayout.js";
import { resolveChartCitation } from "../charting/presentation/chartCitation.js";
import { getChartSchema } from "../charting/schemas/chartSchemaRegistry.js";

function ChartPanel({
  panel,
  rows,
  sourceState,
  datasetProfile,
  geoData,
  dataSources = {},
  assets = {},
  contentRenderContext = {},
  accessibilityEnabled = false,
  canonicalPanelId,
  canonicalPlacementId,
  canonicalPlotId,
  suspended = false,
  editMode = false,
  placementId,
  editPageId,
  editSectionId,
  editDisabled = false,
  editControlDisabled = editDisabled,
  isDragging = false,
  isDragTarget = false,
  isSelected = false,
  multiSelectMode = false,
  isMultiSelected = false,
  multiSelectionIndex = 0,
  onEdit,
  onBuildSelect,
  onRemove,
  onToggleMultiSelect,
  onToggleMultiPanel,
  onFullScreenHold,
  onStartMultiFullscreenSelection,
  onDisplayAction,
  onMove,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onStartSection,
}) {
  const chart = panel?.chart ?? panel;
  const panelLabel = String(chart.title ?? "").trim()
    || (["freeText", "image"].includes(chart.typeId) ? "Text/Image panel" : chart.id || "Panel");
  const playback = useOptionalPlayback();
  const chronoAvailability = playback?.availabilityVisible === true
    ? playback.frameAvailabilityByChartId?.[chart.id] ?? null
    : null;
  const footprint = resolveChartFootprint(chart.layout);
  const citation = resolveChartCitation({
    chart,
    dataSources,
    datasetProfile,
  });
  const renderContext = React.useMemo(() => ({
    ...contentRenderContext,
    sources: dataSources,
    assets,
    mapName: chart.presentation?.map?.geoSource ?? chart.id,
    accessibilityEnabled,
  }), [accessibilityEnabled, assets, chart.id, chart.presentation?.map?.geoSource, contentRenderContext, dataSources]);
  const holdTimer = React.useRef(null);
  const suppressFullscreenClickUntil = React.useRef(0);
  const panelRef = React.useRef(null);
  const [chartVisible, setChartVisible] = React.useState(
    () => typeof IntersectionObserver === "undefined",
  );
  const shouldRenderChart = !suspended && (chartVisible || isSelected);
  const requestEdit = () => {
    if (editControlDisabled) return;
    if (onEdit) onEdit();
    else onBuildSelect?.({
      kind: "chart",
      pageId: editPageId,
      sectionId: editSectionId,
      placementId,
      chartId: chart.id,
    });
  };

  const clearHold = () => {
    if (holdTimer.current !== null) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };
  const beginFullscreenHold = () => {
    clearHold();
    suppressFullscreenClickUntil.current = 0;
    holdTimer.current = setTimeout(() => {
      holdTimer.current = null;
      suppressFullscreenClickUntil.current = Date.now() + 1200;
      if (onFullScreenHold) onFullScreenHold();
      else onStartMultiFullscreenSelection?.(chart.id);
    }, 650);
  };
  const handleFullscreenClick = () => {
    if (multiSelectMode) {
      if (onToggleMultiSelect) onToggleMultiSelect();
      else onToggleMultiPanel?.(chart.id);
      return;
    }
    if (Date.now() < suppressFullscreenClickUntil.current) {
      suppressFullscreenClickUntil.current = 0;
      return;
    }
    onDisplayAction?.({
      type: "manual_set",
      chart_ids: [chart.id],
    });
  };
  React.useEffect(() => clearHold, []);
  React.useEffect(() => {
    if (chartVisible || isSelected) return undefined;
    const panelElement = panelRef.current;
    if (!panelElement || typeof IntersectionObserver === "undefined") {
      setChartVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      setChartVisible(true);
      observer.disconnect();
    }, { rootMargin: "520px 0px" });
    observer.observe(panelElement);
    return () => observer.disconnect();
  }, [chartVisible, isSelected]);

  return (
    <article
      ref={panelRef}
      className={[
        "chart-panel",
        chartPanelLayoutClass(chart.layout?.size),
        "chart-panel-footprint",
        chronoAvailability ? "chart-panel-chrono-availability" : "",
        editMode ? "chart-panel-has-actions" : "",
        isSelected ? "selected" : "",
        isMultiSelected ? "chart-panel-multi-selected" : "",
        isDragging ? "dragging" : "",
        isDragTarget ? "drag-target" : "",
      ].filter(Boolean).join(" ")}
      data-panel-id={chart.id}
      data-chrono-availability={chronoAvailability?.status}
      data-chrono-series-id={chronoAvailability?.seriesId}
      data-canonical-panel-id={canonicalPanelId}
      data-canonical-placement-id={canonicalPlacementId}
      data-build-placement-id={editMode && placementId ? placementId : undefined}
      data-footprint={`${footprint.columns}x${footprint.rows}`}
      style={chartPanelFootprintStyle(chart.layout)}
      tabIndex={editMode && placementId ? -1 : undefined}
      onDragOverCapture={onDragOver}
      onDropCapture={onDrop}
      onDragEnd={onDragEnd}
    >
      {editMode && <div className="panel-actions" aria-label={`${panelLabel} actions`}>
        {editMode && (
          <>
            <IconControl
              interactionId="panel.move"
              className="secondary panel-move-handle"
              tooltipPlacement="below"
              disabled={editDisabled}
              ariaLabel={`Move panel ${panelLabel}`}
              tooltip="Move panel"
              draggable={!editDisabled}
              onClick={(event) => {
                if (!editDisabled) onMove?.(event.currentTarget);
              }}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
            <IconControl interactionId="shell.start-section" className="secondary" tooltipPlacement="below" disabled={editDisabled} onClick={() => {
              if (!editDisabled) onStartSection?.();
            }} ariaLabel="Start section here" tooltip="Start section here" />
            <IconControl interactionId="chart.remove" tooltipPlacement="below" disabled={editDisabled} onClick={() => {
              if (!editDisabled) onRemove?.();
            }} />
            <IconControl interactionId="panel.edit-chart" className="secondary" tooltipPlacement="below" disabled={editControlDisabled} data-build-edit-for={placementId} onClick={() => {
              requestEdit();
            }} />
          </>
        )}
      </div>}
      {shouldRenderChart ? (
        <ChartView
          chart={chart}
          rows={rows}
          sourceState={sourceState}
          datasetProfile={datasetProfile}
          geoData={geoData}
          accessibilityEnabled={accessibilityEnabled}
          canonicalPlotId={canonicalPlotId}
          renderContext={renderContext}
          mapBudgetRequest={chart.presentation?.map?.geoSource ? {
            ownerId: `dashboard:${chart.id}`,
            kind: "dashboard",
            visible: chartVisible,
            active: shouldRenderChart,
          } : null}
          interactionMode="active"
          surface={editMode ? "build" : "view"}
          onImageReplace={requestEdit}
          onImageEdit={requestEdit}
        />
      ) : (
        <div className="chart-deferred-placeholder" aria-hidden="true">
          <span>
            {suspended
              ? "Chart paused while the editor is open"
              : "Chart loads when it enters the viewport"}
          </span>
        </div>
      )}
      {React.createElement(ChartPanelActions, {
        chartId: chart.id,
        chartTitle: chart.title,
        variableId: sourceViewerVariableId(chart),
        sourceId: chart.sourceId,
        source: dataSources?.[chart.sourceId],
        citation,
        staticContent: getChartSchema(chart.typeId).authoringWorkflow === "static",
        selectionMode: multiSelectMode,
        fullscreenSelected: isMultiSelected,
        fullscreenSelectionIndex: multiSelectionIndex,
        onFullscreenHoldStart: multiSelectMode ? undefined : beginFullscreenHold,
        onFullscreenHoldEnd: clearHold,
        onFullscreen: handleFullscreenClick,
      })}
    </article>
  );
}

export function sourceViewerVariableId(chart = {}) {
  const roles = chart.roles ?? {};
  return roles.measurements?.[0]?.field
    ?? roles.value?.field
    ?? roles.y?.field
    ?? roles.color?.field
    ?? "Not configured";
}

export default React.memo(ChartPanel);
