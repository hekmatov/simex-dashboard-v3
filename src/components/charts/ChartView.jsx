import React from "react";

import {
  canReuseChartRendering,
  resolveChartRendering,
  resolvePreparedChartRendering,
} from "../../charting/rendering/resolveChartRendering.js";
import { serializeCanonicalRuntimeLedger } from "../../charting/rendering/canonicalRuntimeLedger.js";
import { resolveChartSurfaceBackground } from "../../charting/presentation/chartSurfaceBackground.js";
import { resolveChartDataState } from "../../charting/data/chartDataState.js";
import { getChartSchema } from "../../charting/schemas/chartSchemaRegistry.js";
import { dashboardOwnedRegionProps } from "../../theme/dashboardRegionRegistry.js";
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
  const panelRows = Number(props.panelFootprint?.rows);
  const shortPanel = Number.isFinite(panelRows) && panelRows < 1;
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
    short: shortPanel,
  }, content);
}

export function renderChartContent(props, interactionMode) {
  try {
    const resolved = resolveDestinationRendering(props);
    const { model, prepared, schema } = resolved;
    const provenance = resolveProvenance(props);
    const panelRows = Number(props.panelFootprint?.rows);
    const shortPanel = Number.isFinite(panelRows) && panelRows < 1;
    const compactPanel = Number.isFinite(panelRows) && panelRows <= 0.5;
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
      accessibilityEnabled: false,
      audienceScale: props.audienceScale,
      mapBudgetRequest: props.mapBudgetRequest,
      onVisualChange: props.onVisualChange,
    });
    else if (model.kind === "cards") view = React.createElement(CardChartView, {
      model,
      chart: props.chart,
      provenance,
      interactionMode,
      short: shortPanel,
      compact: compactPanel,
    });
    else if (model.kind === "targetCollection") view = React.createElement(TargetCollectionChartView, {
      model,
      chart: props.chart,
      provenance,
      accessibilityEnabled: false,
      interactionMode,
      audienceScale: props.audienceScale,
    });
    else if (model.kind === "table") view = React.createElement(TableChartView, { model, chart: props.chart, provenance });
    else if (model.kind === "image") view = React.createElement(ImageChartView, {
      model,
      chart: props.chart,
      provenance,
      zoomEnabled,
      interactionMode,
      surface: props.surface,
      audienceScale: props.audienceScale,
      onRetry: props.onImageRetry,
      onReplace: props.onImageReplace,
      onEdit: props.onImageEdit,
      contentRenderContext: props.renderContext,
    });
    else if (model.kind === "freeText") view = React.createElement(FreeTextChartView, {
      model,
      chart: props.chart,
      contentRenderContext: props.renderContext,
      surface: props.surface,
    });
    else return React.createElement(ChartStatus, {
      message: resolved.message ?? model.message,
      empty: prepared?.status === "empty",
    });
    const activeDate = chartActiveDate(props.timeContext?.activeEpochMs);
    const framedView = React.createElement("div", {
      ...presentationFrameProps(props.chart, props.canonicalPlotId),
      ...(activeDate ? { "data-chart-active-date": activeDate } : {}),
      "data-chart-interaction-mode": interactionMode,
      ...(typeof window === "undefined" ? {} : {
        "data-canonical-runtime-ledger": serializeCanonicalRuntimeLedger({
          chart: props.chart,
          resolution: resolved,
          timeContext: props.timeContext,
        }),
      }),
    }, view);
    return chartZoom && !typedStaticImage
      ? React.createElement(ZoomGuard, null, framedView)
      : framedView;
  } catch {
    return React.createElement(ChartStatus, { message: "This chart cannot be displayed." });
  }
}

function ResolvedChartContent({ props, interactionMode }) {
  const suppliedResolution = canReuseChartRendering(props.resolvedRendering, props)
    ? props.resolvedRendering
    : null;
  const effectOwned = requiresEffectOwnedResolution(props)
    && suppliedResolution?.status !== "available";
  const [resolutionAttempt, setResolutionAttempt] = React.useState(0);
  const initialResolution = React.useMemo(() => (
    effectOwned
      ? (resolutionAttempt === 0 ? suppliedResolution : null) ?? pendingStaticImageResolution(props)
      : resolveDestinationRendering(props)
  ), [
    effectOwned,
    props.chart,
    props.datasetProfile,
    props.geoData,
    props.renderContext,
    props.resolvedRendering,
    props.prepared,
    props.rows,
    props.timeContext,
    resolutionAttempt,
  ]);
  const [settledResolution, setSettledResolution] = React.useState(null);

  React.useEffect(() => {
    if (!effectOwned) {
      setSettledResolution(null);
      return undefined;
    }
    let current = true;
    let ownedResolution = null;
    let ownsAttempt = false;
    let released = false;
    const releaseOwnedResolution = () => {
      if (!ownsAttempt || released || typeof ownedResolution?.model?.release !== "function") return false;
      released = true;
      ownedResolution.model.release();
      return true;
    };
    const publish = (resolution) => {
      ownedResolution = resolution;
      if (current) setSettledResolution(resolution);
      else releaseOwnedResolution();
    };
    setSettledResolution(null);
    // A supplied pending resolution is borrowed: observe its settlement, but
    // leave its lease with the caller. Retry creates a fresh local lease.
    const attempt = resolutionAttempt === 0 && suppliedResolution
      ? suppliedResolution
      : resolveChartRendering(props);
    ownsAttempt = attempt !== suppliedResolution;
    if (attempt.status !== "pending" || !attempt.pending) {
      publish(attempt);
    } else {
      Promise.resolve(attempt.pending).then(publish);
    }
    return () => {
      current = false;
      releaseOwnedResolution();
    };
  }, [
    effectOwned,
    props.chart,
    props.datasetProfile,
    props.geoData,
    props.renderContext,
    props.resolvedRendering,
    props.rows,
    props.timeContext,
    resolutionAttempt,
  ]);

  const resolvedRendering = canReuseChartRendering(settledResolution, props)
    ? settledResolution
    : initialResolution;
  const retryImageResolution = () => {
    if (effectOwned) setResolutionAttempt((attempt) => attempt + 1);
    props.onImageRetry?.();
  };
  return renderChartContent({
    ...props,
    resolvedRendering,
    onImageRetry: retryImageResolution,
  }, interactionMode);
}

function resolveDestinationRendering(props) {
  if (canReuseChartRendering(props.resolvedRendering, props)) return props.resolvedRendering;
  return props.prepared == null
    ? resolveChartRendering(props)
    : resolvePreparedChartRendering(props, props.prepared);
}

function requiresEffectOwnedResolution(props) {
  const chart = props?.chart;
  if (chart?.typeId !== "image" || !chart.sourceId) return false;
  if (Object.hasOwn(props.renderContext ?? {}, "staticSourceResolution")) return false;
  const source = valueForId(props.renderContext?.sources, chart.sourceId);
  const mediaItem = valueForId(props.renderContext?.mediaItems, source?.mediaId);
  return typeof document !== "undefined"
    && source?.kind === "staticImage"
    && mediaItem?.current?.kind === "asset";
}

function pendingStaticImageResolution(props) {
  const sourceId = props.chart?.sourceId;
  const source = valueForId(props.renderContext?.sources, sourceId);
  const mediaItem = valueForId(props.renderContext?.mediaItems, source?.mediaId);
  return {
    status: "pending",
    schema: getChartSchema("image"),
    prepared: null,
    model: {
      kind: "image",
      status: "loading",
      staticSource: true,
      sourceId,
      mediaId: source?.mediaId ?? null,
      revision: mediaItem?.revision ?? null,
    },
    message: null,
    inputKey: {
      chart: props.chart,
      rows: props.rows,
      datasetProfile: props.datasetProfile,
      geoData: props.geoData,
      timeContext: props.timeContext,
      renderContext: props.renderContext,
    },
  };
}

function valueForId(collection, id) {
  if (collection instanceof Map) return collection.get(id);
  if (Array.isArray(collection)) return collection.find((entry) => entry?.id === id);
  return collection?.[id];
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

export function presentationFrameProps(chart, canonicalPlotId) {
  const align = ["left", "center", "right"].includes(chart?.presentation?.title?.align)
    ? chart.presentation.title.align
    : "left";
  const backgroundColor = resolveChartSurfaceBackground(
    chart?.presentation?.background,
  );
  return {
    className: "chart-view-frame",
    ...dashboardOwnedRegionProps("chart-view-frame"),
    "data-canonical-plot-id": canonicalPlotId ?? chart?.id,
    "data-title-align": align,
    style: {
      textAlign: align,
      ...(backgroundColor ? { backgroundColor } : {}),
    },
  };
}

export function chartActiveDate(activeEpochMs) {
  if (!Number.isFinite(activeEpochMs)) return null;
  const date = new Date(activeEpochMs);
  return Number.isFinite(date.valueOf()) ? date.toISOString().slice(0, 10) : null;
}

export function withPlaybackTimeContext(props, playback) {
  if (isStaticContentChart(props.chart)) {
    return { ...props, timeContext: undefined };
  }
  const memberTimeContext = playback?.timeContextForChart?.(props.chart?.id);
  if (
    Number.isFinite(memberTimeContext?.activeEpochMs)
  ) {
    // Prepared marks belong to the supplied time context. Playback owns fresh
    // preparation when it projects this chart into a different frame.
    return { ...props, timeContext: memberTimeContext,
      prepared: memberTimeContext === props.timeContext ? props.prepared : undefined };
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
