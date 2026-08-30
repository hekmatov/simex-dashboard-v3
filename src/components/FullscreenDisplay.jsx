import React from "react";

import { IconControl } from "./common/SimExIcon.js";
import ModalFocusScope from "./common/ModalFocusScope.jsx";
import DisplayedChartGrid from "./display/DisplayedChartGrid.jsx";
import { useOptionalPlayback } from "./playback/PlaybackProvider.jsx";

const LAYOUT_INTERACTION_IDS = Object.freeze({
  solo: "layout.solo",
  sideBySide: "layout.side-by-side",
  overUnder: "layout.over-and-under",
  topFocus: "layout.top-dominant",
  bottomFocus: "layout.bottom-dominant",
  leftFocus: "layout.left-dominant",
  rightFocus: "layout.right-dominant",
  grid2x2: "layout.2-2-grid",
});
const NO_TIME_CONTEXT = () => null;

export default function FullscreenDisplay({
  dashboard,
  contentRenderContext,
  displayState,
  onDisplayAction,
  timeContextForChart,
}) {
  const panelIds = displayState.displayed_chart_ids;
  const playback = useOptionalPlayback();
  const draggedChartId = React.useRef(null);
  const returnFocusTarget = React.useRef(null);
  const wasOpen = React.useRef(false);
  const [announcement, setAnnouncement] = React.useState("");
  const isComparison = panelIds.length > 1;

  React.useEffect(() => {
    const open = panelIds.length > 0;
    if (open && !wasOpen.current) {
      returnFocusTarget.current = findReturnFocusTarget(
        isComparison,
        panelIds[0],
      );
    } else if (!open && wasOpen.current) {
      restoreFocus(returnFocusTarget.current);
      returnFocusTarget.current = null;
    }
    wasOpen.current = open;
  }, [isComparison, panelIds.length, panelIds[0]]);

  React.useEffect(() => () => {
    if (wasOpen.current) restoreFocus(returnFocusTarget.current);
  }, []);

  React.useEffect(() => {
    if (panelIds.length > 0 && playback?.playing === true) {
      playback.dispatch({ type: "pause" });
    }
  }, [panelIds.length, playback?.dispatch, playback?.playing]);

  if (panelIds.length === 0) return null;

  const layoutOptions = multiLayoutOptions(panelIds.length);
  const resolvedLayout = layoutOptions.some(
    ({ value }) => value === displayState.layout,
  )
    ? displayState.layout
    : layoutOptions[0].value;
  const closeAll = () => onDisplayAction?.({ type: "manual_close_all" });
  const resolveTimeContext = timeContextForChart
    ?? playback?.timeContextForChart
    ?? NO_TIME_CONTEXT;

  const moveChart = (chart, fromIndex, toIndex) => {
    const reordered = reorderDisplayedCharts(panelIds, fromIndex, toIndex);
    if (reordered === panelIds) return;
    onDisplayAction?.({
      type: "manual_reorder",
      chart_ids: reordered,
    });
    setAnnouncement(
      `${chart.title} moved to position ${toIndex + 1} of ${panelIds.length}.`,
    );
  };

  const comparisonCellProps = (chart, index, charts) => {
    if (!isComparison) return {};
    return {
      draggable: true,
      tabIndex: 0,
      "aria-label": `${chart.title}, position ${index + 1} of ${charts.length}`,
      "aria-keyshortcuts": "Alt+ArrowLeft Alt+ArrowRight Alt+ArrowUp Alt+ArrowDown",
      onDragStart: (event) => {
        draggedChartId.current = chart.id;
        event.currentTarget.classList.add("is-dragging");
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", chart.id);
      },
      onDragOver: (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      },
      onDrop: (event) => {
        event.preventDefault();
        const sourceId = event.dataTransfer.getData("text/plain")
          || draggedChartId.current;
        const sourceIndex = panelIds.indexOf(sourceId);
        moveChart(chart, sourceIndex, index);
        draggedChartId.current = null;
      },
      onDragEnd: (event) => {
        event.currentTarget.classList.remove("is-dragging");
        draggedChartId.current = null;
      },
      onKeyDown: (event) => {
        if (!event.altKey) return;
        const earlier = event.key === "ArrowLeft" || event.key === "ArrowUp";
        const later = event.key === "ArrowRight" || event.key === "ArrowDown";
        if (!earlier && !later) return;
        const nextIndex = index + (earlier ? -1 : 1);
        if (nextIndex < 0 || nextIndex >= panelIds.length) return;
        event.preventDefault();
        moveChart(chart, index, nextIndex);
      },
    };
  };

  return (
    <ModalFocusScope
      as="div"
      className="fullscreen-backdrop fullscreen-backdrop--immersive dashboard-dialog-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={isComparison ? "Chart comparison" : "Focused chart"}
      initialFocusSelector="[data-fullscreen-exit]"
      onEscape={closeAll}
    >
      <article
        className={`multi-fullscreen-panel multi-fullscreen-${resolvedLayout} dashboard-dialog dashboard-dialog--workspace dashboard-dialog--fullscreen`}
        data-display-mode={isComparison ? "comparison" : "focus"}
      >
        <div
          className="multi-fullscreen-controls dashboard-dialog__header"
          aria-label={isComparison ? "Comparison layout and exit" : "Focus exit"}
        >
          {isComparison && layoutOptions.map((option) => (
            <IconControl
              key={option.value}
              interactionId={LAYOUT_INTERACTION_IDS[option.value]}
              className={[
                "fullscreen-layout-button",
                resolvedLayout === option.value ? "active" : "secondary",
              ].join(" ")}
              iconClassName="fullscreen-layout-icon"
              pressed={resolvedLayout === option.value}
              onClick={() => onDisplayAction?.({
                type: "layout_changed",
                layout: option.value,
              })}
              ariaLabel={`Use ${option.label.toLowerCase()} layout`}
              tooltip={option.label}
              title={option.label}
            />
          ))}
          <button
            type="button"
            className="secondary fullscreen-exit-button"
            data-fullscreen-exit
            onClick={closeAll}
          >
            {isComparison ? "Exit comparison" : "Exit focus"}
          </button>
        </div>
        <DisplayedChartGrid
          dashboard={dashboard}
          contentRenderContext={contentRenderContext}
          chartIds={panelIds}
          layout={resolvedLayout}
          surface="fullscreen"
          timeContextForChart={resolveTimeContext}
          getCellProps={comparisonCellProps}
          renderCellControls={isComparison
            ? (chart, index, displayedCharts) => (
                <div
                  className="multi-cell-controls"
                  aria-label={`Reorder ${chart.title}`}
                >
                  <IconControl
                    interactionId="fullscreen.previous-displayed-chart"
                    className="secondary multi-cell-icon-button"
                    disabled={index === 0}
                    onClick={() => moveChart(chart, index, index - 1)}
                    ariaLabel={`Move ${chart.title} previous`}
                    tooltip="Move previous"
                    tooltipPlacement="below"
                    title="Move previous"
                  />
                  <IconControl
                    interactionId="fullscreen.next-displayed-chart"
                    className="secondary multi-cell-icon-button"
                    disabled={index === displayedCharts.length - 1}
                    onClick={() => moveChart(chart, index, index + 1)}
                    ariaLabel={`Move ${chart.title} next`}
                    tooltip="Move next"
                    tooltipPlacement="below"
                    title="Move next"
                  />
                </div>
              )
            : undefined}
        />
        <p className="visually-hidden" role="status" aria-live="polite">
          {announcement}
        </p>
      </article>
    </ModalFocusScope>
  );
}

export function reorderDisplayedCharts(items, fromIndex, toIndex) {
  if (
    !Array.isArray(items)
    || !Number.isInteger(fromIndex)
    || !Number.isInteger(toIndex)
    || fromIndex < 0
    || fromIndex >= items.length
    || toIndex < 0
    || toIndex >= items.length
    || fromIndex === toIndex
  ) {
    return items;
  }
  const reordered = [...items];
  const [item] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, item);
  return reordered;
}

function findReturnFocusTarget(isComparison, chartId) {
  if (typeof document === "undefined") return null;
  if (isComparison) {
    return document.querySelector(".view-comparison-button");
  }
  const panel = [...document.querySelectorAll("[data-panel-id]")]
    .find((candidate) => candidate.dataset.panelId === chartId);
  return panel?.querySelector('[aria-label="Focus chart"]') ?? panel ?? null;
}

function restoreFocus(target) {
  if (!target?.isConnected || typeof target.focus !== "function") return;
  const focus = () => target.focus({ preventScroll: true });
  if (
    typeof window !== "undefined"
    && typeof window.requestAnimationFrame === "function"
  ) {
    window.requestAnimationFrame(focus);
  } else {
    focus();
  }
}

function multiLayoutOptions(count) {
  if (count === 1) return [{ value: "solo", label: "Single chart" }];
  if (count === 2) {
    return [
      { value: "sideBySide", label: "Side by side" },
      { value: "overUnder", label: "Over-under" },
    ];
  }
  if (count === 3) {
    return [
      { value: "topFocus", label: "One on top" },
      { value: "bottomFocus", label: "One on bottom" },
      { value: "leftFocus", label: "One on left" },
      { value: "rightFocus", label: "One on right" },
    ];
  }
  return [{ value: "grid2x2", label: "2 by 2" }];
}
