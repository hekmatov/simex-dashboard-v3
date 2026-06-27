import React from "react";
import ReactECharts from "echarts-for-react";

import { buildEchartsOption } from "../lib/buildEchartsOption.js";
import { validateChartConfig } from "../lib/validateConfig.js";

export default function ChartPanel({ chart, data, editMode, onEdit }) {
  const validationError = validateChartConfig(chart, data);

  if (validationError) {
    return (
      <article className="chart-panel chart-panel-error">
        <h2>{chart.title}</h2>
        <p>{validationError}</p>
      </article>
    );
  }

  const option = buildEchartsOption(chart, data);

  return (
    <article className={`chart-panel chart-size-${chart.size ?? "standard"}`}>
      {editMode && (
        <button type="button" className="chart-edit-button" onClick={onEdit}>
          Edit
        </button>
      )}
      <ReactECharts option={option} className="chart-canvas" notMerge />
    </article>
  );
}
