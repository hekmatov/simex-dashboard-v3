import React from "react";

import {
  canReuseChartRendering,
  resolveChartRendering,
} from "../../charting/rendering/resolveChartRendering.js";
import { resolveChartSurfaceBackground } from "../../charting/presentation/chartSurfaceBackground.js";
import { resolveChartDataState } from "../../charting/data/chartDataState.js";
import { getChartSchema } from "../../charting/schemas/chartSchemaRegistry.js";
import { useOptionalPlayback } from "../playback/PlaybackProvider.jsx";
import ChartDataStateBoundary from "./ChartDataStateBoundary.jsx";
import CardChartView from "./CardChartView.jsx";
import EChartsChartView from "./EChartsChartView.jsx";
import FreeTextChartView from "./FreeTextChartView.jsx";
import ImageChartView from "./ImageChartView.jsx";
import TableChartView from "./TableChartView.jsx";
import TargetCollectionChartView from "./TargetCollectionChartView.jsx";
import ZoomGuard from "./ZoomGuard.jsx";

const MAX_STATUS_LENGTH = 240;

export default function ChartView(props) {
  const playback = useOptionalPlayback();
  const staticContent = isStaticContentChart(props.chart);
  const playbackProps = staticContent
    ? { ...props, timeContext: undefined }
    : props.timeContextAuthority === "explicit"
    ? props
    : withPlaybackTimeContext(props, playback);
  const interactionMode = props.interactionMode === "passive" ? "passive" : "active";
  const state = staticContent ? null : resolveChartDataState({
    chartTitle: props.chart?.title,
    rows: props.rows,
    sourceState: props.sourceState,
  });
  const content = state && !state.hasValidContent
    ? null
    : React.createElement(ResolvedChartContent, {
        props: playbackProps,
        interactionMode,
      });
  return React.createElement(ChartDataStateBoundary, {
    state,
    chartName: props.chart?.title,
  }, content);
}

export function renderChartContent(props, interactionMode) {
  try {
    const resolved = canReuseChartRendering(
      props.resolvedRendering,
      props,
    )
      ? props.resolvedRendering
      : resolveChartRendering(props);
    const { model, prepared, schema } = resolved;
    const provenance = resolveProvenance(props);
    let view;
    const chartZoom = interactionMode === "active"
      && chartZoomEnabled(props.chart, schema);
    const typedStaticImage = model.kind === "image" && model.staticSource === true;
    const zoomEnabled = typedStaticImage
      ? interactionMode === "active"
      : chartZoom;
    if (model.kind === "echarts") view = React.createElement(EChartsChartView, {
      model,
      chart: props.chart,
      provenance,
      zoomEnabled,
      accessibilityEnabled: props.accessibilityEnabled === true,
    });
    else if (model.kind === "cards") view = React.createElement(CardChartView, { model, chart: props.chart, provenance, interactionMode });
    else if (model.kind === "targetCollection") view = React.createElement(TargetCollectionChartView, {
      model,
      chart: props.chart,
      provenance,
      accessibilityEnabled: props.accessibilityEnabled === true,
      interactionMode,
    });
    else if (model.kind === "table") view = React.createElement(TableChartView, { model, chart: props.chart, provenance });
    else if (model.kind === "image") view = React.createElement(ImageChartView, {
      model,
      chart: props.chart,
      provenance,
      zoomEnabled,
      interactionMode,
      surface: props.surface,
      onRetry: props.onImageRetry,
      onReplace: props.onImageReplace,
      onEdit: props.onImageEdit,
    });
    else if (model.kind === "freeText") view = React.createElement(FreeTextChartView, {
      model,
      chart: props.chart,
    });
    else return React.createElement(ChartStatus, {
      message: resolved.message ?? model.message,
      empty: prepared?.status === "empty",
    });
    const framedView = React.createElement("div", {
      ...presentationFrameProps(props.chart),
      "data-chart-interaction-mode": interactionMode,
    }, view);
    return chartZoom && !typedStaticImage
      ? React.createElement(ZoomGuard, null, framedView)
      : framedView;
  } catch {
    return React.createElement(ChartStatus, { message: "This chart cannot be displayed." });
  }
}

function ResolvedChartContent({ props, interactionMode }) {
  const releasedModelsRef = React.useRef(new WeakSet());
  const releaseResolution = React.useCallback((resolution) => {
    const model = resolution?.model;
    if (
      model === null
      || typeof model !== "object"
      || typeof model.release !== "function"
      || releasedModelsRef.current.has(model)
    ) return false;
    releasedModelsRef.current.add(model);
    model.release();
    return true;
  }, []);
  const initialResolution = React.useMemo(() => (
    canReuseChartRendering(props.resolvedRendering, props)
      ? props.resolvedRendering
      : resolveChartRendering(props)
  ), [
    props.chart,
    props.datasetProfile,
    props.geoData,
    props.renderContext,
    props.resolvedRendering,
    props.rows,
    props.timeContext,
  ]);
  const [settledResolution, setSettledResolution] = React.useState(null);

  React.useEffect(() => {
    let current = true;
    let resolvedPending = null;
    setSettledResolution(null);
    if (initialResolution.status !== "pending" || !initialResolution.pending) {
      return () => { current = false; };
    }
    Promise.resolve(initialResolution.pending).then((settled) => {
      resolvedPending = settled;
      if (current) setSettledResolution(settled);
      else releaseResolution(settled);
    });
    return () => {
      current = false;
      if (resolvedPending) releaseResolution(resolvedPending);
    };
  }, [initialResolution, releaseResolution]);

  const resolvedRendering = canReuseChartRendering(settledResolution, props)
    ? settledResolution
    : initialResolution;
  React.useEffect(() => () => {
    releaseResolution(resolvedRendering);
  }, [releaseResolution, resolvedRendering]);
  return renderChartContent({ ...props, resolvedRendering }, interactionMode);
}

function isStaticContentChart(chart) {
  try {
    return getChartSchema(chart?.typeId).authoringWorkflow === "static";
  } catch {
    return false;
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
  const backgroundColor = resolveChartSurfaceBackground(
    chart?.presentation?.background,
  );
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
  const memberTimeContext = playback?.timeContextForChart?.(props.chart?.id);
  if (
    Number.isFinite(memberTimeContext?.activeEpochMs)
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
