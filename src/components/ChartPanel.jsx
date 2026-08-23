import React from "react";

import ChartView from "./charts/ChartView.jsx";
import ChartPanelActions from "./charts/ChartPanelActions.jsx";
import SourceViewer from "./SourceViewer.jsx";
import { IconControl } from "./common/SimExIcon.js";
import {
  chartPanelFootprintStyle,
  chartPanelLayoutClass,
  resolveChartFootprint,
} from "./chartPanelLayout.js";
import { resolveChartCitation } from "../charting/presentation/chartCitation.js";

function ChartPanel({
  panel,
  rows,
  sourceState,
  datasetProfile,
  geoData,
  dataSources = {},
  accessibilityEnabled = false,
  suspended = false,
  editMode = false,
  placementId,
  editDisabled = false,
  editControlDisabled = editDisabled,
  isDragging = false,
  isDragTarget = false,
  isSelected = false,
  multiSelectMode = false,
  isMultiSelected = false,
  multiSelectionIndex = 0,
  onEdit,
  onRemove,
  onToggleMultiSelect,
  onFullScreenHold,
  onDisplayAction,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onStartSection,
}) {
  const chart = panel?.chart ?? panel;
  const footprint = resolveChartFootprint(chart.layout);
  const citation = resolveChartCitation({
    chart,
    dataSources,
    datasetProfile,
  });
  const holdTimer = React.useRef(null);
  const suppressFullscreenClickUntil = React.useRef(0);
  const panelRef = React.useRef(null);
  const [sourceViewerRestoration, setSourceViewerRestoration] = React.useState(null);
  const [chartVisible, setChartVisible] = React.useState(
    () => typeof IntersectionObserver === "undefined",
  );
  const shouldRenderChart = !suspended && (chartVisible || isSelected);

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
      onFullScreenHold?.();
    }, 650);
  };
  const handleFullscreenClick = () => {
    if (Date.now() < suppressFullscreenClickUntil.current) {
      suppressFullscreenClickUntil.current = 0;
      return;
    }
    if (multiSelectMode) {
      onToggleMultiSelect?.();
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
        editMode ? "chart-panel-has-actions" : "",
        isSelected ? "selected" : "",
        isMultiSelected ? "chart-panel-multi-selected" : "",
        isDragging ? "dragging" : "",
        isDragTarget ? "drag-target" : "",
      ].filter(Boolean).join(" ")}
      data-panel-id={chart.id}
      data-build-placement-id={editMode && placementId ? placementId : undefined}
      data-footprint={`${footprint.columns}x${footprint.rows}`}
      style={chartPanelFootprintStyle(chart.layout)}
      tabIndex={editMode && placementId ? -1 : undefined}
      draggable={editMode && !editDisabled}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      {editMode && <div className="panel-actions" aria-label={`${chart.title} actions`}>
        {editMode && (
          <>
            <IconControl interactionId="shell.start-section" className="secondary" tooltipPlacement="below" disabled={editDisabled} onClick={() => {
              if (!editDisabled) onStartSection?.();
            }} ariaLabel="Start section here" tooltip="Start section here" />
            <IconControl interactionId="chart.remove" tooltipPlacement="below" disabled={editDisabled} onClick={() => {
              if (!editDisabled) onRemove?.();
            }} />
            <IconControl interactionId="panel.edit-chart" className="secondary" tooltipPlacement="below" disabled={editControlDisabled} data-build-edit-for={placementId} onClick={() => {
              if (!editControlDisabled) onEdit?.();
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
          renderContext={{
            sources: dataSources,
            mapName: chart.presentation?.map?.geoSource ?? chart.id,
            accessibilityEnabled,
          }}
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
        citation,
        selectionMode: multiSelectMode,
        fullscreenSelected: isMultiSelected,
        fullscreenSelectionIndex: multiSelectionIndex,
        onFullscreenHoldStart: multiSelectMode ? undefined : beginFullscreenHold,
        onFullscreenHoldEnd: clearHold,
        onFullscreen: handleFullscreenClick,
        onViewSource: () => setSourceViewerRestoration(captureSourceViewerRestoration({
          chartId: chart.id,
          selected: isSelected,
          panelElement: panelRef.current,
        })),
      })}
      <SourceViewer
        open={sourceViewerRestoration !== null}
        chartId={chart.id}
        sourceId={chart.sourceId}
        source={dataSources?.[chart.sourceId]}
        restoration={sourceViewerRestoration}
        onClose={() => setSourceViewerRestoration(null)}
        onRestore={restoreSourceViewerContext}
      />
    </article>
  );
}

function captureSourceViewerRestoration({ chartId, selected, panelElement }) {
  const scroller = typeof document === "undefined"
    ? null
    : document.querySelector(".dashboard-command-page-scroller");
  const bounds = panelElement?.getBoundingClientRect?.();
  return Object.freeze({
    selectedChartId: selected ? chartId : null,
    focusId: typeof document === "undefined" ? null : document.activeElement?.id ?? null,
    scrollTop: scroller?.scrollTop ?? 0,
    canvas: bounds
      ? Object.freeze({ width: bounds.width, height: bounds.height })
      : null,
  });
}

function restoreSourceViewerContext(restoration) {
  if (!restoration || typeof document === "undefined") return;
  const scroller = document.querySelector(".dashboard-command-page-scroller");
  if (scroller && Number.isFinite(restoration.scrollTop)) {
    scroller.scrollTop = restoration.scrollTop;
  }
}

export default React.memo(ChartPanel);
