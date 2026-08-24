import React from "react";

export default function SceneCompositionAuthoringOverlay({
  board,
  chart,
  member,
  index,
  orderedIds,
  presentIds,
  selectedChartId,
  disabled = false,
  onAction,
}) {
  const chartId = chart?.id ?? member?.chartId;
  const selected = selectedChartId === chartId;
  const inPresent = presentIds.includes(chartId);
  const moveToBoundary = (movingChartId, boundaryIndex) => {
    const targetIndex = boundaryTargetIndex(orderedIds, movingChartId, boundaryIndex);
    if (targetIndex === null) return;
    onAction?.({ type: "MOVE_CHART", board, chartId: movingChartId, targetIndex });
  };
  const boundary = (boundaryIndex, label) => (
    <button
      type="button"
      className="scene-insertion-target"
      aria-label={`${label} in ${board} position ${boundaryIndex + 1}`}
      disabled={disabled || !selectedChartId}
      onClick={() => moveToBoundary(selectedChartId, boundaryIndex)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => moveToBoundary(event.dataTransfer?.getData("text/plain"), boundaryIndex)}
    >
      Drop here
    </button>
  );

  return (
    <div className="scene-chart-authoring-overlay" data-board={board} data-selected={selected || undefined}>
      <div className="scene-chart-authoring-overlay__boundaries">
        {boundary(index, "Drop before")}
        {index === orderedIds.length - 1 ? boundary(orderedIds.length, "Drop after") : null}
      </div>
      <div className="scene-chart-authoring-overlay__title-row">
        <button
          type="button"
          className="scene-chart-title"
          disabled={disabled}
          draggable={!disabled}
          onClick={() => onAction?.({ type: "SELECT_CHART", chartId, board })}
          onDragStart={(event) => event.dataTransfer?.setData("text/plain", chartId)}
          onKeyDown={(event) => keyboardMove(event, { board, chartId, onAction })}
        >
          {chart?.title ?? chart?.label ?? chartId}
        </button>
        {board === "scene" && member ? <span>{member.width} columns</span> : null}
        {board === "scene" ? (
          <button
            type="button"
            className="scene-present-corner-action"
            disabled={disabled || (!inPresent && presentIds.length >= 4)}
            onClick={() => onAction?.({ type: "TOGGLE_PRESENT", chartId })}
          >
            {inPresent ? "Remove from Present" : "Add to Present"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function boundaryTargetIndex(orderedIds, chartId, boundaryIndex) {
  const from = orderedIds.indexOf(chartId);
  if (from < 0 || orderedIds.length === 0) return null;
  const adjustedBoundary = boundaryIndex - (from < boundaryIndex ? 1 : 0);
  return Math.max(0, Math.min(orderedIds.length - 1, adjustedBoundary));
}

function keyboardMove(event, { board, chartId, onAction }) {
  if (!event.altKey) return;
  const direction = {
    ArrowUp: "earlier",
    ArrowLeft: "earlier",
    ArrowDown: "later",
    ArrowRight: "later",
    Home: "first",
    End: "last",
  }[event.key];
  if (!direction) return;
  event.preventDefault();
  onAction?.({ type: "MOVE_CHART", board, chartId, direction });
}
