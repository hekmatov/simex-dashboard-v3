import React from "react";

import { sourceStateForDashboard } from "../../charting/data/chartDataState.js";

import ChartView from "../charts/ChartView.jsx";

export default function DisplayedChartGrid({
  dashboard,
  chartIds = [],
  items,
  layout = "solo",
  timeContextForChart = () => null,
  timeContextAuthority,
  surface = "fullscreen",
  layoutSystem,
  getCellProps,
  renderCellControls,
  staticAssetReadiness = new Map(),
  contentRenderContext = {},
  onVisualChange,
}) {
  const presentationItems = items ?? chartIds.map(
    (chartId) => ({ kind: "chart", chart_id: chartId }),
  );
  const entries = presentationItems
    .map((item) => ({ item, chart: findChart(dashboard, presentationItemId(item)) }))
    .filter(({ chart }) => Boolean(chart));
  const charts = entries.map(({ chart }) => chart);
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
      {entries.map(({ item, chart }, index) => {
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
              item.kind === "image" ? "audience-static-image-cell" : "",
              item.kind === "image"
                ? `audience-static-image-${staticAssetReadiness.get(item.panel_id)?.status ?? "loading"}`
                : "",
            ].filter(Boolean).join(" ")}
            key={chart.id}
            data-displayed-chart-id={chart.id}
            data-presentation-item-kind={item.kind}
            data-image-media-id={item.kind === "image" ? item.media_id : undefined}
            data-image-revision={item.kind === "image" ? item.revision : undefined}
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
                ...contentRenderContext,
                sources: dashboard.dataSources ?? {},
                assets: dashboard.assets ?? {},
                mapName: chart.presentation?.map?.geoSource ?? chart.id,
                accessibilityEnabled: dashboard.globalStyles?.accessibility?.enabled === true,
                ...(item.kind === "image" ? {
                  staticSourceResolution: staticAssetReadiness.get(item.panel_id),
                } : {}),
              }}
              timeContext={item.kind === "chart" ? timeContextForChart(chart.id) : null}
              timeContextAuthority={timeContextAuthority}
              interactionMode={surface === "audience" ? "passive" : "active"}
              surface={surface}
              onVisualChange={onVisualChange}
            />
          </section>
        );
      })}
    </div>
  );
}

function presentationItemId(item) {
  return item?.kind === "image" ? item.panel_id : item?.chart_id;
}

export function findChart(dashboard, chartId) {
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
