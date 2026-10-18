import React from "react";
import ChartPanel from "../ChartPanel.jsx";
import LayoutGrid from "../LayoutGrid.jsx";
import { chartPanelFootprintStyle, resolveChartFootprint } from "../chartPanelLayout.js";
import { chartFootprintPixelSize, resolveCanvasGeometry } from "../chartStageGeometry.js";
import { dashboardThemeRootProps } from "../../theme/dashboardThemeRoot.js";
import { dashboardOwnedRegionProps } from "../../theme/dashboardRegionRegistry.js";
import { useOptionalPlayback } from "../playback/PlaybackProvider.jsx";
import { withPlaybackTimeContext } from "../charts/ChartView.jsx";
import { prepareChartPreview, PreviewState, buildPreviewDiagnostics } from "./ChartPreview.jsx";

export function authoringStageScale(size, { fit = "fit", availableWidth = size.width, maxHeight = Infinity } = {}) {
  return fit === "actual" ? 1 : Math.max(0.001, Math.round(Math.min(1, availableWidth / size.width, maxHeight / size.height) * 1000) / 1000);
}

export function useAuthoringDestinationGeometry({ deviceLayout = "desktop", destination, placementId, canvasWidth } = {}) {
  const [measuredWidth, setMeasuredWidth] = React.useState(null);
  React.useLayoutEffect(() => {
    if (canvasWidth != null) return undefined;
    const findDestination = () => {
      const frames = [...document.querySelectorAll(".canonical-dashboard-frame[data-canonical-page-id]")];
      const frame = frames.find(el => el.dataset.canonicalPageId === destination?.pageId) ?? frames[0];
      if (!frame) return null;
      const placement = placementId && [...frame.querySelectorAll("[data-canonical-placement-id]")]
        .find(el => el.dataset.canonicalPlacementId === placementId);
      const section = [...frame.querySelectorAll("[data-canonical-section-id]")]
        .find(el => el.dataset.canonicalSectionId === destination?.sectionId);
      // Empty sections have the same padding-box width as their future grid.
      // Canvas content excludes both the frame border and Build rails.
      return placement?.closest(".layout-grid") ?? section?.querySelector(".layout-grid")
        ?? section ?? frame.querySelector(".canonical-dashboard-content");
    };
    let target = null;
    const measure = () => {
      const next = findDestination();
      if (next !== target) {
        if (target) observer?.unobserve(target);
        target = next;
        if (target) observer?.observe(target);
      }
      const width = target?.getBoundingClientRect().width;
      if (width > 0) setMeasuredWidth(width);
    };
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    measure();
    const mutations = new MutationObserver(() => { if (!target?.isConnected) measure(); });
    const content = document.querySelector(".canonical-dashboard-frame[data-canonical-page-id] .canonical-dashboard-content");
    if (content) mutations.observe(content, { childList: true, subtree: true });
    window.addEventListener("resize", measure);
    return () => { observer?.disconnect(); mutations.disconnect(); window.removeEventListener("resize", measure); };
  }, [canvasWidth, destination?.pageId, destination?.sectionId, deviceLayout, placementId]);
  return resolveCanvasGeometry({ deviceLayout, canvasWidth: canvasWidth ?? measuredWidth ?? undefined });
}

function useCanvasReveal(onShowOnCanvas) {
  const cleanup = React.useRef(null);
  const [revealing, setRevealing] = React.useState(false);
  const finish = React.useCallback((restoreFocus = true) => {
    cleanup.current?.(restoreFocus);
    cleanup.current = null;
    setRevealing(false);
  }, []);
  React.useEffect(() => {
    const escape = event => {
      if (event.key !== "Escape" || !cleanup.current) return;
      event.preventDefault(); event.stopImmediatePropagation(); finish();
    };
    const blur = () => finish(false);
    window.addEventListener("keydown", escape, true);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", escape, true);
      window.removeEventListener("blur", blur);
      cleanup.current?.(false);
    };
  }, [finish]);
  const begin = button => {
    if (cleanup.current || typeof onShowOnCanvas !== "function") return;
    const surface = button.closest(".dashboard-dialog, .unit-orbit") ?? button.closest(".authoring-stage");
    const previous = surface?.getAttribute("data-authoring-reveal");
    surface?.setAttribute("data-authoring-reveal", "true");
    const cancelReveal = onShowOnCanvas();
    cleanup.current = restoreFocus => {
      if (previous == null) surface?.removeAttribute("data-authoring-reveal");
      else surface?.setAttribute("data-authoring-reveal", previous);
      cancelReveal?.();
      if (restoreFocus && button.isConnected) button.focus({ preventScroll: true });
    };
    setRevealing(true);
  };
  return {
    revealing,
    buttonProps: {
      "aria-pressed": revealing,
      onPointerDown: event => {
        if (event.button !== 0) return;
        event.currentTarget.setPointerCapture?.(event.pointerId);
        begin(event.currentTarget);
      },
      onPointerUp: () => finish(),
      onPointerCancel: () => finish(),
      onLostPointerCapture: () => finish(),
      onBlur: () => finish(false),
      onClick: event => {
        if (event.detail !== 0) return;
        if (cleanup.current) finish(); else begin(event.currentTarget);
      },
    },
  };
}

export default function AuthoringStage({
  chart, rows = [], datasetProfile, geoData, prepared, renderContext,
  timeContext, themeProjection, deviceLayout = "desktop", canvasWidth,
  destination, placementId, onShowOnCanvas, readiness,
  fit: controlledFit, availableWidth: suppliedWidth, maxHeight: suppliedMaxHeight,
}) {
  const geometry = useAuthoringDestinationGeometry({ deviceLayout, canvasWidth, destination, placementId });
  const footprint = resolveChartFootprint(chart?.layout);
  const size = chartFootprintPixelSize(footprint, geometry);
  const [fit, setFit] = React.useState("fit");
  const mode = controlledFit ?? fit;
  const viewport = React.useRef(null);
  const [bounds, setBounds] = React.useState({ width: null, height: null });
  React.useLayoutEffect(() => {
    const measure = () => setBounds({ width: viewport.current?.clientWidth ?? null, height: window.innerHeight * 0.46 });
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    if (viewport.current) observer?.observe(viewport.current);
    window.addEventListener("resize", measure);
    return () => { observer?.disconnect(); window.removeEventListener("resize", measure); };
  }, []);
  const maxHeight = suppliedMaxHeight ?? bounds.height ?? 600;
  const scale = authoringStageScale(size, { fit: mode, availableWidth: suppliedWidth ?? bounds.width ?? size.width, maxHeight });
  const effectiveRenderContext = React.useMemo(() => renderContext?.mapName ? renderContext : ({ ...renderContext, mapName: chart?.presentation?.map?.geoSource ?? chart?.id }), [renderContext, chart?.id, chart?.presentation?.map?.geoSource]);
  const playback = useOptionalPlayback();
  const input = withPlaybackTimeContext({ chart, rows, datasetProfile, geoData, prepared, renderContext: effectiveRenderContext, timeContext }, playback);
  const result = React.useMemo(() => readiness && readiness.status !== "ready"
    ? readiness
    : prepareChartPreview(input), [chart, rows, datasetProfile, geoData, prepared, effectiveRenderContext, input.timeContext, input.prepared, readiness]);
  const status = result.status ?? "invalid";
  const { revealing, buttonProps } = useCanvasReveal(onShowOnCanvas);
  const labelId = React.useId();
  const mapOwnerId = React.useId();
  return (
    <section className={`authoring-stage app-frame chart-authoring-preview chart-authoring-preview-${status}`} {...dashboardThemeRootProps(themeProjection)} {...dashboardOwnedRegionProps("chart-authoring-stage")}
      data-stage-width={size.width} data-stage-height={size.height} data-stage-scale={scale} data-stage-fit={mode}
      data-stage-revealing={revealing ? "true" : undefined} aria-label="Chart preview">
      <div className="authoring-stage__toolbar">
        <div role="group" aria-label="Preview size">
          <button type="button" className="secondary" aria-pressed={mode === "fit"} onClick={() => setFit("fit")}>Fit</button>
          <button type="button" className="secondary" aria-pressed={mode === "actual"} onClick={() => setFit("actual")}>Actual</button>
        </div>
        {onShowOnCanvas && <button type="button" className="secondary" {...buttonProps}>Show on canvas</button>}
      </div>
      <p className="authoring-stage__caption" id={labelId}>{size.width} × {size.height} on the dashboard · {scale === 1 ? "Actual dashboard size" : `Shown at ${Math.round(scale * 100)}% of dashboard size`}</p>
      {deviceLayout === "phone" && <p className="authoring-stage__advisory">Phone layout stacks charts at automatic height; preview uses the desktop footprint.</p>}
      <div ref={viewport} className="authoring-stage__viewport" style={{ maxHeight }} tabIndex={mode === "actual" ? 0 : undefined}
        aria-label={mode === "actual" ? "Actual-size chart; scroll to inspect" : undefined} aria-describedby={labelId}>
        <div className="authoring-stage__space" style={{ width: size.width * scale, height: size.height * scale }}>
          <div className="authoring-stage__canvas canonical-dashboard-frame" style={{ width: size.width, height: size.height, transform: `scale(${scale})` }}>
            <LayoutGrid geometry={{ ...geometry, columns: footprint.columns }}>
              {status === "ready" ? <ChartPanel panel={chart} rows={rows} datasetProfile={datasetProfile} geoData={geoData}
                prepared={result.prepared} resolvedRendering={result.resolvedRendering} renderContext={effectiveRenderContext}
                timeContext={input.timeContext} timeContextAuthority="explicit" showFullscreen={false}
                mapBudgetOwnerId={`authoring:${mapOwnerId}:${chart.id}`} mapBudgetKind="preview" />
                : <article className="chart-panel chart-panel-footprint" style={chartPanelFootprintStyle(chart?.layout)}>
                  <PreviewState status={status} diagnostics={buildPreviewDiagnostics(result.diagnostics, { namespace: chart?.id })} />
                </article>}
            </LayoutGrid>
          </div>
        </div>
      </div>
    </section>
  );
}
