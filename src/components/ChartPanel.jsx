import React from "react";

import ChartView from "./charts/ChartView.jsx";

function ChartPanel({
  panel,
  rows = [],
  datasetProfile,
  geoData,
  dataSources = {},
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
  const holdTimer = React.useRef(null);

  const clearHold = () => {
    if (holdTimer.current !== null) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };
  const beginFullscreenHold = () => {
    clearHold();
    holdTimer.current = setTimeout(() => {
      holdTimer.current = null;
      onFullScreenHold?.();
    }, 650);
  };
  React.useEffect(() => clearHold, []);

  return (
    <article
      className={[
        "chart-panel",
        `chart-panel-${chart.layout?.size ?? "standard"}`,
        isSelected ? "selected" : "",
        isMultiSelected ? "multi-selected" : "",
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
      <div className="panel-actions" aria-label={`${chart.title} actions`}>
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
        {multiSelectMode ? (
          <button
            type="button"
            className={isMultiSelected ? "active" : "secondary"}
            onClick={onToggleMultiSelect}
            aria-label={isMultiSelected ? "Remove from multi-fullscreen" : "Add to multi-fullscreen"}
          >
            Multi-fullscreen
          </button>
        ) : (
          <button
            type="button"
            className="secondary"
            aria-label="Fullscreen chart"
            title="Fullscreen chart"
            onPointerDown={beginFullscreenHold}
            onPointerUp={clearHold}
            onPointerCancel={clearHold}
            onPointerLeave={clearHold}
            onClick={() => onDisplayAction?.({
              type: "manual_open",
              chart_id: chart.id,
            })}
          >
            Fullscreen
          </button>
        )}
      </div>
      <ChartView
        chart={chart}
        rows={Array.isArray(rows) ? rows : []}
        datasetProfile={datasetProfile}
        geoData={geoData}
        renderContext={{
          sources: dataSources,
          mapName: chart.presentation?.map?.geoSource ?? chart.id,
        }}
      />
    </article>
  );
}

export default React.memo(ChartPanel);
