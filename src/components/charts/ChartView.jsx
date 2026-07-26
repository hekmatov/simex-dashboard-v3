import React from "react";

import { prepareChartData } from "../../charting/data/prepareChartData.js";
import { buildRenderModel } from "../../charting/rendering/buildRenderModel.js";
import CardChartView from "./CardChartView.jsx";
import EChartsChartView from "./EChartsChartView.jsx";
import ImageChartView from "./ImageChartView.jsx";
import TableChartView from "./TableChartView.jsx";

const MAX_STATUS_LENGTH = 240;

export default function ChartView(props) {
  try {
    const prepared = prepareChartData(props);
    const model = buildRenderModel({ ...props, prepared });
    const provenance = resolveProvenance(props);
    if (model.kind === "echarts") return React.createElement(EChartsChartView, { model, chart: props.chart, provenance });
    if (model.kind === "cards") return React.createElement(CardChartView, { model, chart: props.chart, provenance });
    if (model.kind === "table") return React.createElement(TableChartView, { model, chart: props.chart, provenance });
    if (model.kind === "image") return React.createElement(ImageChartView, { model, chart: props.chart, provenance });
    return React.createElement(ChartStatus, { message: model.message, empty: prepared.status === "empty" });
  } catch {
    return React.createElement(ChartStatus, { message: "This chart cannot be displayed." });
  }
}

function resolveProvenance({ chart = {}, renderContext = {}, datasetProfile } = {}) {
  const sourceId = text(chart.sourceId);
  const metadata = renderContext.sources?.[sourceId]?.provenance
    ?? renderContext.sourceMetadata?.[sourceId]?.provenance
    ?? renderContext.sourceMetadata?.[sourceId]
    ?? datasetProfile?.provenance;
  return {
    label: text(metadata?.label) ?? sourceId ?? "Unavailable",
    capturedAt: text(metadata?.capturedAt),
  };
}

function text(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function ChartStatus({ message, empty = false }) {
  return React.createElement("div", {
    className: empty ? "chart-status-empty" : "chart-status-error",
    role: "status",
    "aria-live": "polite",
  }, boundedMessage(message));
}

function boundedMessage(message) {
  const text = typeof message === "string" && message.trim() ? message.trim() : "No chart data is available.";
  return text.length <= MAX_STATUS_LENGTH ? text : `${text.slice(0, MAX_STATUS_LENGTH - 1)}…`;
}
