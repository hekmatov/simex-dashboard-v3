import React from "react";

import { prepareChartData } from "../../charting/data/prepareChartData.js";
import { buildAccessibilityCompanionForFamily } from "../../charting/rendering/accessibilityRows.js";
import { buildRenderModel } from "../../charting/rendering/buildRenderModel.js";
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
    const schema = getChartSchema(playbackProps.chart?.typeId);
    const prepared = prepareChartData(playbackProps);
    const model = withPlaybackPresentation(
      buildRenderModel({ ...playbackProps, prepared }),
      prepared,
      playbackProps.timeContext,
      playbackProps.chart,
    );
    const provenance = resolveProvenance(props);
    let view;
    const zoomEnabled = chartZoomEnabled(props.chart, schema);
    if (model.kind === "echarts") view = React.createElement(EChartsChartView, {
      model,
      chart: props.chart,
      provenance,
      zoomEnabled,
    });
    else if (model.kind === "cards") view = React.createElement(CardChartView, { model, chart: props.chart, provenance });
    else if (model.kind === "targetCollection") view = React.createElement(TargetCollectionChartView, { model, chart: props.chart, provenance });
    else if (model.kind === "table") view = React.createElement(TableChartView, { model, chart: props.chart, provenance });
    else if (model.kind === "image") view = React.createElement(ImageChartView, {
      model,
      chart: props.chart,
      provenance,
      zoomEnabled,
    });
    else return React.createElement(ChartStatus, { message: model.message, empty: prepared.status === "empty" });
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
  const activeCanonical = prepared.meta.activeTime.canonical;
  const overlayMarks = activeMarks.map((mark) => ({
    ...mark,
    ...(model.accessibility.family === "axis"
      ? { x: activeCanonical }
      : {}),
  }));
  const activeCompanion = buildAccessibilityCompanionForFamily(
    model.accessibility.family,
    overlayMarks,
    chart,
  );
  const activeRows = activeCompanion.rows.map((row, index) => {
    const playbackProvenance = playbackProvenanceLabel(
      activeMarks[index]?.temporalProvenance,
    );
    return playbackProvenance ? { ...row, playbackProvenance } : row;
  });
  return {
    ...model,
    accessibility: {
      ...activeCompanion,
      rows: activeCompanion.family === "axis" && activeRows.length === 1
        ? [{ ...activeRows[0], series: "value" }]
        : activeRows,
    },
  };
}

function playbackProvenanceLabel(provenance) {
  const status = provenance?.status;
  const sourceTime = canonicalEpoch(provenance?.sourceEpochMs);
  const lowerTime = canonicalEpoch(provenance?.lowerEpochMs);
  const upperTime = canonicalEpoch(provenance?.upperEpochMs);
  if (status === "observed") {
    return sourceTime ? `observed measurement from ${sourceTime}` : null;
  }
  if (status === "carried") {
    return sourceTime ? `last known from ${sourceTime}` : "last known value";
  }
  if (status === "nearest") {
    return sourceTime ? `nearest measurement from ${sourceTime}` : "nearest measurement";
  }
  if (status === "interpolated") {
    return lowerTime && upperTime
      ? `interpolated between ${lowerTime} and ${upperTime}`
      : "interpolated value";
  }
  return null;
}

function canonicalEpoch(epochMs) {
  if (!Number.isFinite(epochMs)) return null;
  const canonical = new Date(epochMs).toISOString();
  return canonical.endsWith("T00:00:00.000Z")
    ? canonical.slice(0, 10)
    : canonical;
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
