import React from "react";

import { sourceStateForDashboard } from "../../charting/data/chartDataState.js";

import ChartView from "../charts/ChartView.jsx";

export default function DisplayedChartGrid({
  dashboard,
  chartIds = [],
  layout = "solo",
  timeContextForChart = () => null,
  timeContextAuthority,
  surface = "fullscreen",
  layoutSystem,
  getCellProps,
  renderCellControls,
}) {
  const charts = chartIds
    .map((chartId) => findChart(dashboard, chartId))
    .filter(Boolean);
  const count = charts.length;
  const className = [
    "displayed-chart-grid",
    `displayed-count-${count}`,
    `layout-${layout}`,
    surface === "fullscreen" ? "multi-fullscreen-grid" : "",
    surface === "fullscreen" ? `multi-count-${count}` : "",
  ].filter(Boolean).join(" ");

  return (
    <div
      className={className}
      data-display-surface={surface}
      data-layout-system={layoutSystem ?? (surface === "audience" ? "presentation" : undefined)}
    >
      {charts.map((chart, index) => {
        const cellProps = getCellProps?.(chart, index, charts) ?? {};
        const suppliedClassName = cellProps.className;
        const attributes = { ...cellProps };
        delete attributes.className;
        return (
          <section
            {...attributes}
            className={[
              "displayed-chart-cell",
              `displayed-cell-${index + 1}`,
              surface === "fullscreen" ? "multi-fullscreen-cell" : "",
              surface === "fullscreen" ? `multi-cell-${index + 1}` : "",
              suppliedClassName,
            ].filter(Boolean).join(" ")}
            key={chart.id}
            data-displayed-chart-id={chart.id}
          >
            {renderCellControls?.(chart, index, charts)}
            <ChartView
              chart={chart}
              rows={dashboard.loadedData?.[chart.sourceId]}
              sourceState={sourceStateForDashboard(dashboard, chart.sourceId, chart.id)}
              datasetProfile={dashboard.datasetProfiles?.[chart.sourceId]}
              geoData={dashboard.loadedData?.[chart.presentation?.map?.geoSource]}
              accessibilityEnabled={dashboard.globalStyles?.accessibility?.enabled === true}
              renderContext={{
                sources: dashboard.dataSources ?? {},
                assets: dashboard.assets ?? {},
                mapName: chart.presentation?.map?.geoSource ?? chart.id,
                accessibilityEnabled: dashboard.globalStyles?.accessibility?.enabled === true,
              }}
              timeContext={timeContextForChart(chart.id)}
              timeContextAuthority={timeContextAuthority}
              interactionMode={surface === "audience" ? "passive" : "active"}
              surface={surface}
            />
          </section>
        );
      })}
    </div>
  );
}

function findChart(dashboard, chartId) {
  for (const page of dashboard?.pages ?? []) {
    for (const section of page.sections ?? []) {
      const panel = (section.panels ?? []).find(
        (candidate) => (candidate.chart ?? candidate).id === chartId,
      );
      if (panel) return panel.chart ?? panel;
    }
  }
  return null;
}
