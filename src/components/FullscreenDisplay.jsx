import React from "react";

import ChartView from "./charts/ChartView.jsx";
import ChartPanelActions from "./charts/ChartPanelActions.jsx";
import { resolveChartCitation } from "../charting/presentation/chartCitation.js";

export default function FullscreenDisplay({
  dashboard,
  displayState,
  onDisplayAction,
  accessibilityEnabled = false,
}) {
  const panelIds = displayState.displayed_chart_ids;
  const panels = panelIds
    .map((panelId) => findPanel(dashboard, panelId))
    .filter(Boolean);
  if (panels.length === 0) return null;

  const layoutOptions = multiLayoutOptions(panels.length);
  const resolvedLayout = layoutOptions.some(
    ({ value }) => value === displayState.layout,
  )
    ? displayState.layout
    : layoutOptions[0].value;

  return (
    <div
      className="fullscreen-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Displayed charts"
    >
      <article className={`multi-fullscreen-panel multi-fullscreen-${resolvedLayout}`}>
        <div className="multi-fullscreen-controls">
          {layoutOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={[
                "fullscreen-layout-button",
                resolvedLayout === option.value ? "active" : "secondary",
              ].join(" ")}
              onClick={() => onDisplayAction({
                type: "layout_changed",
                layout: option.value,
              })}
              aria-label={`Use ${option.label.toLowerCase()} layout`}
              title={option.label}
            >
              <LayoutIcon layout={option.value} />
            </button>
          ))}
          <button
            type="button"
            className="secondary fullscreen-toolbar-close"
            onClick={() => onDisplayAction({ type: "manual_close_all" })}
            aria-label="Close all displayed charts"
            title="Close all"
          >
            <span aria-hidden="true">{"\u00D7"}</span>
          </button>
        </div>
        <div className={`multi-fullscreen-grid multi-count-${panels.length} layout-${resolvedLayout}`}>
          {panels.map((chart, index) => (
            <section
              className={`multi-fullscreen-cell multi-cell-${index + 1}`}
              key={chart.id}
              data-displayed-chart-id={chart.id}
            >
              <div className="multi-cell-controls">
                <strong>{index + 1}</strong>
                {panels.length > 1 && (
                  <>
                    <button
                      type="button"
                      className="secondary multi-cell-icon-button"
                      disabled={index === 0}
                      onClick={() => onDisplayAction({
                        type: "manual_reorder",
                        chart_ids: moveItem(panelIds, index, index - 1),
                      })}
                      aria-label={`Move ${chart.id} previous`}
                      title="Move previous"
                    >
                      <span aria-hidden="true">{"\u2039"}</span>
                    </button>
                    <button
                      type="button"
                      className="secondary multi-cell-icon-button"
                      disabled={index === panels.length - 1}
                      onClick={() => onDisplayAction({
                        type: "manual_reorder",
                        chart_ids: moveItem(panelIds, index, index + 1),
                      })}
                      aria-label={`Move ${chart.id} next`}
                      title="Move next"
                    >
                      <span aria-hidden="true">{"\u203A"}</span>
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="secondary multi-cell-icon-button multi-cell-close-button"
                  onClick={() => onDisplayAction({
                    type: "manual_close",
                    chart_id: chart.id,
                  })}
                  aria-label={`Close ${chart.id}`}
                  title="Close chart"
                >
                  <span aria-hidden="true">{"\u00D7"}</span>
                </button>
              </div>
              <ChartView
                chart={chart}
                rows={dashboard.loadedData?.[chart.sourceId] ?? []}
                datasetProfile={dashboard.datasetProfiles?.[chart.sourceId]}
                geoData={dashboard.loadedData?.[chart.presentation?.map?.geoSource]}
                accessibilityEnabled={accessibilityEnabled}
                renderContext={{
                  sources: dashboard.dataSources ?? {},
                  mapName: chart.presentation?.map?.geoSource ?? chart.id,
                  accessibilityEnabled,
                }}
              />
              <ChartPanelActions
                chartId={`fullscreen-${chart.id}`}
                citation={resolveChartCitation({
                  chart,
                  dataSources: dashboard.dataSources ?? {},
                  datasetProfile: dashboard.datasetProfiles?.[chart.sourceId],
                })}
                showFullscreen={false}
              />
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}

function findPanel(dashboard, panelId) {
  for (const page of dashboard.pages ?? []) {
    for (const section of page.sections ?? []) {
      const panel = (section.panels ?? []).find(
        (candidate) => (candidate.chart ?? candidate).id === panelId,
      );
      if (panel) return panel.chart ?? panel;
    }
  }
  return null;
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

function LayoutIcon({ layout }) {
  const dividerPaths = {
    solo: [],
    sideBySide: ["M12 2v14"],
    overUnder: ["M2 9h20"],
    topFocus: ["M2 9h20", "M12 9v7"],
    bottomFocus: ["M2 9h20", "M12 2v7"],
    leftFocus: ["M12 2v14", "M12 9h10"],
    rightFocus: ["M12 2v14", "M2 9h10"],
    grid2x2: ["M12 2v14", "M2 9h20"],
  }[layout] ?? [];

  return (
    <svg
      className="fullscreen-layout-icon"
      viewBox="0 0 24 18"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="14" rx="1.5" />
      {dividerPaths.map((path) => (
        <path d={path} key={path} />
      ))}
    </svg>
  );
}
