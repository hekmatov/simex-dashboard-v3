import React from "react";

import ChartPanelActions from "./charts/ChartPanelActions.jsx";
import { IconControl } from "./common/SimExIcon.js";
import ModalFocusScope from "./common/ModalFocusScope.jsx";
import DisplayedChartGrid from "./display/DisplayedChartGrid.jsx";
import { resolveChartCitation } from "../charting/presentation/chartCitation.js";

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

export default function FullscreenDisplay({
  dashboard,
  displayState,
  onDisplayAction,
}) {
  const panelIds = displayState.displayed_chart_ids;
  if (panelIds.length === 0) return null;

  const layoutOptions = multiLayoutOptions(panelIds.length);
  const resolvedLayout = layoutOptions.some(
    ({ value }) => value === displayState.layout,
  )
    ? displayState.layout
    : layoutOptions[0].value;
  const closeAll = () => onDisplayAction?.({ type: "manual_close_all" });

  return (
    <ModalFocusScope
      as="div"
      className="fullscreen-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Displayed charts"
      initialFocusSelector="[data-fullscreen-close-all]"
      onEscape={closeAll}
    >
      <article className={`multi-fullscreen-panel multi-fullscreen-${resolvedLayout}`}>
        <div className="multi-fullscreen-controls">
          {layoutOptions.map((option) => (
            <IconControl
              key={option.value}
              interactionId={LAYOUT_INTERACTION_IDS[option.value]}
              className={[
                "fullscreen-layout-button",
                resolvedLayout === option.value ? "active" : "secondary",
              ].join(" ")}
              iconClassName="fullscreen-layout-icon"
              pressed={resolvedLayout === option.value}
              onClick={() => onDisplayAction({
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
            className="secondary fullscreen-close-all-button"
            data-fullscreen-close-all
            onClick={closeAll}
          >
            Close all
          </button>
        </div>
        <DisplayedChartGrid
          dashboard={dashboard}
          chartIds={panelIds}
          layout={resolvedLayout}
          surface="fullscreen"
          renderCellControls={(chart, index, displayedCharts) => (
            <>
              <div className="multi-cell-controls">
                <strong>{index + 1}</strong>
                {displayedCharts.length > 1 && (
                  <>
                    <IconControl
                      interactionId="fullscreen.previous-displayed-chart"
                      className="secondary multi-cell-icon-button"
                      disabled={index === 0}
                      onClick={() => onDisplayAction({
                        type: "manual_reorder",
                        chart_ids: moveItem(panelIds, index, index - 1),
                      })}
                      ariaLabel={`Move ${chart.id} previous`}
                      tooltip="Move previous"
                      tooltipPlacement="below"
                      title="Move previous"
                    />
                    <IconControl
                      interactionId="fullscreen.next-displayed-chart"
                      className="secondary multi-cell-icon-button"
                      disabled={index === displayedCharts.length - 1}
                      onClick={() => onDisplayAction({
                        type: "manual_reorder",
                        chart_ids: moveItem(panelIds, index, index + 1),
                      })}
                      ariaLabel={`Move ${chart.id} next`}
                      tooltip="Move next"
                      tooltipPlacement="below"
                      title="Move next"
                    />
                  </>
                )}
                <IconControl
                  interactionId="fullscreen.close-chart"
                  className="secondary multi-cell-icon-button multi-cell-close-button"
                  onClick={() => onDisplayAction({
                    type: "manual_close",
                    chart_id: chart.id,
                  })}
                  ariaLabel={`Close ${chart.id}`}
                  tooltip="Close chart"
                  tooltipPlacement="below"
                  title="Close chart"
                />
              </div>
              <ChartPanelActions
                chartId={`fullscreen-${chart.id}`}
                citation={resolveChartCitation({
                  chart,
                  dataSources: dashboard.dataSources ?? {},
                  datasetProfile: dashboard.datasetProfiles?.[chart.sourceId],
                })}
                showFullscreen={false}
              />
            </>
          )}
        />
      </article>
    </ModalFocusScope>
  );
}

function moveItem(items, fromIndex, toIndex) {
  const nextItems = [...items];
  const [item] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, item);
  return nextItems;
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
