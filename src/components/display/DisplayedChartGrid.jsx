import React from "react";

import ChartView from "../charts/ChartView.jsx";

export default function DisplayedChartGrid({
  dashboard,
  chartIds = [],
  layout = "solo",
  timeContextForChart = () => null,
  surface = "fullscreen",
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
    <div className={className} data-display-surface={surface}>
      {charts.map((chart, index) => (
        <section
          className={[
            "displayed-chart-cell",
            `displayed-cell-${index + 1}`,
            surface === "fullscreen" ? "multi-fullscreen-cell" : "",
            surface === "fullscreen" ? `multi-cell-${index + 1}` : "",
          ].filter(Boolean).join(" ")}
          key={chart.id}
          data-displayed-chart-id={chart.id}
        >
          {renderCellControls?.(chart, index, charts)}
          <ChartView
            chart={chart}
            rows={dashboard.loadedData?.[chart.sourceId] ?? []}
            datasetProfile={dashboard.datasetProfiles?.[chart.sourceId]}
            geoData={dashboard.loadedData?.[chart.presentation?.map?.geoSource]}
            accessibilityEnabled={dashboard.globalStyles?.accessibility?.enabled === true}
            renderContext={{
              sources: dashboard.dataSources ?? {},
              mapName: chart.presentation?.map?.geoSource ?? chart.id,
              accessibilityEnabled: dashboard.globalStyles?.accessibility?.enabled === true,
            }}
            timeContext={timeContextForChart(chart.id)}
            interactionMode={surface === "audience" ? "passive" : "active"}
          />
        </section>
      ))}
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
