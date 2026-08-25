import React from "react";

import { sourceStateForDashboard } from "../../charting/data/chartDataState.js";
import { configuredCharts } from "../../lib/dashboardSelectors.js";
import { resolveChartFootprint } from "../chartPanelLayout.js";
import ChartView from "../charts/ChartView.jsx";

export default function SceneViewCompositionGrid({
  dashboard,
  scene,
  timeContextForChart = () => null,
  timeContextAuthority,
  surface = "view-scene",
  getCellProps,
  renderCellChrome,
}) {
  const chartsById = new Map(
    configuredCharts(dashboard).map((chart) => [chart.id, chart]),
  );
  const accessibilityEnabled = dashboard?.globalStyles?.accessibility?.enabled === true;

  return (
    <div
      className="scene-view-composition-grid"
      data-scene-composition-surface={surface}
    >
      {(scene?.members ?? []).map((member, index) => {
        const chart = chartsById.get(member.chartId);
        const cellProps = getCellProps?.({ chart, member, index, missing: !chart }) ?? {};
        if (!chart) {
          return (
            <section
              {...cellProps}
              className="scene-view-composition-cell scene-view-composition-cell--missing"
              data-scene-chart-id={member.chartId}
              data-scene-chart-missing="true"
              data-scene-width={member.width}
              data-scene-row-height="1"
              style={{
                "--scene-chart-width": member.width,
                "--scene-chart-height": 1,
              }}
              key={member.chartId}
            >
              {renderCellChrome?.({ chart: null, member, index, missing: true })}
              <p role="status">This authored Scene chart no longer exists.</p>
            </section>
          );
        }

        const height = resolveChartFootprint(chart.layout).rows;
        return (
          <section
            {...cellProps}
            className="scene-view-composition-cell"
            data-scene-chart-id={chart.id}
            data-scene-width={member.width}
            data-scene-row-height={height}
            style={{
              "--scene-chart-width": member.width,
              "--scene-chart-height": height,
            }}
            key={chart.id}
          >
            {renderCellChrome?.({ chart, member, index, missing: false })}
            <ChartView
              chart={chart}
              rows={dashboard.loadedData?.[chart.sourceId]}
              sourceState={sourceStateForDashboard(
                dashboard,
                chart.sourceId,
                chart.id,
              )}
              datasetProfile={dashboard.datasetProfiles?.[chart.sourceId]}
              geoData={dashboard.loadedData?.[chart.presentation?.map?.geoSource]}
              accessibilityEnabled={accessibilityEnabled}
              canonicalPlotId={chart.id}
              renderContext={{
                sources: dashboard.dataSources ?? {},
                assets: dashboard.assets ?? {},
                mapName: chart.presentation?.map?.geoSource ?? chart.id,
                accessibilityEnabled,
              }}
              timeContext={timeContextForChart(chart.id)}
              timeContextAuthority={timeContextAuthority}
              interactionMode="active"
              surface="view"
            />
          </section>
        );
      })}
    </div>
  );
}
