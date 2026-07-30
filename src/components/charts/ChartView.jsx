import React from "react";

import {
  canReuseChartRendering,
  resolveChartRendering,
} from "../../charting/rendering/resolveChartRendering.js";
import { getChartSchema } from "../../charting/schemas/chartSchemaRegistry.js";
import { useOptionalPlayback } from "../playback/PlaybackProvider.jsx";
import CardChartView from "./CardChartView.jsx";
import EChartsChartView from "./EChartsChartView.jsx";
import ImageChartView from "./ImageChartView.jsx";
import TableChartView from "./TableChartView.jsx";
import TargetCollectionChartView from "./TargetCollectionChartView.jsx";
import ZoomGuard from "./ZoomGuard.jsx";

const MAX_STATUS_LENGTH = 240;

export default function ChartView(props) {
  const playback = useOptionalPlayback();
  const playbackProps = withPlaybackTimeContext(props, playback);
  try {
    const resolved = canReuseChartRendering(
      props.resolvedRendering,
      playbackProps,
    )
      ? props.resolvedRendering
      : resolveChartRendering(playbackProps);
    const { model, prepared, schema } = resolved;
    const provenance = resolveProvenance(props);
    let view;
    const zoomEnabled = chartZoomEnabled(props.chart, schema);
    if (model.kind === "echarts") view = React.createElement(EChartsChartView, {
      model,
      chart: props.chart,
      provenance,
      zoomEnabled,
      accessibilityEnabled: props.accessibilityEnabled === true,
    });
    else if (model.kind === "cards") view = React.createElement(CardChartView, { model, chart: props.chart, provenance });
    else if (model.kind === "targetCollection") view = React.createElement(TargetCollectionChartView, {
      model,
      chart: props.chart,
      provenance,
      accessibilityEnabled: props.accessibilityEnabled === true,
    });
    else if (model.kind === "table") view = React.createElement(TableChartView, { model, chart: props.chart, provenance });
    else if (model.kind === "image") view = React.createElement(ImageChartView, {
      model,
      chart: props.chart,
      provenance,
      zoomEnabled,
    });
    else return React.createElement(ChartStatus, {
      message: resolved.message ?? model.message,
      empty: prepared?.status === "empty",
    });
    const framedView = React.createElement("div", presentationFrameProps(props.chart), view);
    return zoomEnabled
      ? React.createElement(ZoomGuard, null, framedView)
      : framedView;
  } catch {
    return React.createElement(ChartStatus, { message: "This chart cannot be displayed." });
  }
}

export function chartZoomEnabled(chart, suppliedSchema) {
  try {
    const schema = suppliedSchema ?? getChartSchema(chart?.typeId);
    return schema.capabilities.zoom === true
      && chart?.interaction?.zoom?.enabled === true;
  } catch {
    return false;
  }
}

export function presentationFrameProps(chart) {
  const align = ["left", "center", "right"].includes(chart?.presentation?.title?.align)
    ? chart.presentation.title.align
    : "left";
  const background = chart?.presentation?.background;
  let backgroundColor;
  if (background && typeof background === "object" && !Array.isArray(background)) {
    if (background.transparent === true) {
      backgroundColor = "transparent";
    } else {
      const color = typeof background.color === "string" ? background.color.trim() : "";
      if (/^#[0-9a-f]{6}$/i.test(color)) backgroundColor = color.toUpperCase();
    }
  }
  return {
    className: "chart-view-frame",
    "data-title-align": align,
    style: {
      textAlign: align,
      ...(backgroundColor ? { backgroundColor } : {}),
    },
  };
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
