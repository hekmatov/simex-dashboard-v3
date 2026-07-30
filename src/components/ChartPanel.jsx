import React from "react";

import ChartView from "./charts/ChartView.jsx";
import ChartPanelActions from "./charts/ChartPanelActions.jsx";
import { resolveChartCitation } from "../charting/presentation/chartCitation.js";

function ChartPanel({
  panel,
  rows = [],
  datasetProfile,
  geoData,
  dataSources = {},
  accessibilityEnabled = false,
  suspended = false,
  editMode = false,
  isDragging = false,
  isDragTarget = false,
  isSelected = false,
  multiSelectMode = false,
  isMultiSelected = false,
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
  const citation = resolveChartCitation({
    chart,
    dataSources,
    datasetProfile,
  });
  const holdTimer = React.useRef(null);
  const suppressFullscreenClickUntil = React.useRef(0);
  const panelRef = React.useRef(null);
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
      type: "manual_open",
      chart_id: chart.id,
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
        `chart-panel-${chart.layout?.size ?? "standard"}`,
        editMode ? "chart-panel-has-actions" : "",
        isSelected ? "selected" : "",
        isMultiSelected ? "chart-panel-multi-selected" : "",
        isDragging ? "dragging" : "",
        isDragTarget ? "drag-target" : "",
      ].filter(Boolean).join(" ")}
      data-panel-id={chart.id}
      draggable={editMode}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      {editMode && <div className="panel-actions" aria-label={`${chart.title} actions`}>
        {editMode && (
          <>
            <button type="button" className="secondary" onClick={onEdit} aria-label="Edit chart">
              Edit
            </button>
            <button type="button" className="secondary" onClick={onStartSection} aria-label="Start section here">
              Section
            </button>
            <button type="button" className="danger" onClick={onRemove} aria-label="Remove chart">
              Remove
            </button>
          </>
        )}
      </div>}
      {shouldRenderChart ? (
        <ChartView
          chart={chart}
          rows={Array.isArray(rows) ? rows : []}
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
        onFullscreenHoldStart: multiSelectMode ? undefined : beginFullscreenHold,
        onFullscreenHoldEnd: clearHold,
        onFullscreen: handleFullscreenClick,
      })}
    </article>
  );
}

export default React.memo(ChartPanel);
