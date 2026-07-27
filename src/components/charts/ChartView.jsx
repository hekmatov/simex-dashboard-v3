import React from "react";

import { prepareChartData } from "../../charting/data/prepareChartData.js";
import { buildAccessibilityCompanionForFamily } from "../../charting/rendering/accessibilityRows.js";
import { buildRenderModel } from "../../charting/rendering/buildRenderModel.js";
import { useOptionalPlayback } from "../playback/PlaybackProvider.jsx";
import CardChartView from "./CardChartView.jsx";
import EChartsChartView from "./EChartsChartView.jsx";
import ImageChartView from "./ImageChartView.jsx";
import TableChartView from "./TableChartView.jsx";
import TargetCollectionChartView from "./TargetCollectionChartView.jsx";

const MAX_STATUS_LENGTH = 240;

export default function ChartView(props) {
  const playback = useOptionalPlayback();
  const playbackProps = withPlaybackTimeContext(props, playback);
  try {
    const prepared = prepareChartData(playbackProps);
    const model = withPlaybackPresentation(
      buildRenderModel({ ...playbackProps, prepared }),
      prepared,
      playbackProps.timeContext,
      playbackProps.chart,
    );
    const provenance = resolveProvenance(props);
    if (model.kind === "echarts") return React.createElement(EChartsChartView, { model, chart: props.chart, provenance });
    if (model.kind === "cards") return React.createElement(CardChartView, { model, chart: props.chart, provenance });
    if (model.kind === "targetCollection") return React.createElement(TargetCollectionChartView, { model, chart: props.chart, provenance });
    if (model.kind === "table") return React.createElement(TableChartView, { model, chart: props.chart, provenance });
    if (model.kind === "image") return React.createElement(ImageChartView, { model, chart: props.chart, provenance });
    return React.createElement(ChartStatus, { message: model.message, empty: prepared.status === "empty" });
  } catch {
    return React.createElement(ChartStatus, { message: "This chart cannot be displayed." });
  }
}

function withPlaybackTimeContext(props, playback) {
  const groupId = props.chart?.interaction?.timeSync?.groupId;
  const memberTimeContext = playback?.timeContextForChart?.(props.chart?.id);
  if (
    groupId
    && memberTimeContext?.groupId === groupId
    && Number.isFinite(memberTimeContext.activeEpochMs)
  ) {
    return { ...props, timeContext: memberTimeContext };
  }
  return props;
}

function withPlaybackPresentation(model, prepared, timeContext, chart) {
  if (!timeContext || prepared.meta?.activeTime === undefined) return model;
  const activeMarks = prepared.marks?.filter(({ active }) => active === true) ?? [];
  if (prepared.meta.activeTime.status === "missing" && activeMarks.length === 0) {
    const message = prepared.diagnostics?.find(({ message: text }) => (
      /No measurement at this time/.test(text)
    ))?.message ?? "No measurement at this time.";
    return { kind: "error", message };
  }
  if (
    model.kind !== "echarts"
    || prepared.meta.activeTime.mode !== "trace"
    || !["axis", "timeline"].includes(model.accessibility?.family)
    || activeMarks.length === 0
  ) {
    return model;
  }
  const activeCompanion = buildAccessibilityCompanionForFamily(
    model.accessibility.family,
    activeMarks,
    chart,
  );
  return {
    ...model,
    accessibility: {
      ...activeCompanion,
      rows: activeCompanion.family === "axis" && activeCompanion.rows.length === 1
        ? [{ ...activeCompanion.rows[0], series: "value" }]
        : activeCompanion.rows,
    },
  };
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
