import React from "react";

import { StaticContentStateBoundary } from "../static-content/StaticContentStateBoundary.jsx";
import { titleContainerProps } from "./chartViewPresentation.js";

const MIN_IMAGE_SCALE = 1;
const MAX_IMAGE_SCALE = 3;
const IMAGE_SCALE_STEP = 0.25;
const PAN_STEP = 5;

export default function ImageChartView({
  model,
  chart = {},
  interactionMode = "active",
  surface = "view",
  zoomEnabled = interactionMode === "active",
  onRetry,
  onReplace,
  onEdit,
}) {
  const src = safeImageSource(model?.src ?? model?.url);
  const active = interactionMode === "active" && zoomEnabled === true;
  const [loadState, setLoadState] = React.useState(src ? "loading" : "error");
  const [scale, setScale] = React.useState(MIN_IMAGE_SCALE);
  const [pan, setPan] = React.useState({ x: 0, y: 0 });
  const [touchActions, setTouchActions] = React.useState(false);
  const drag = React.useRef(null);

  React.useEffect(() => {
    setLoadState(src ? "loading" : "error");
    setScale(MIN_IMAGE_SCALE);
    setPan({ x: 0, y: 0 });
    setTouchActions(false);
  }, [src, model?.revision, surface, active]);

  if (model?.status === "loading") {
    return <div className="chart-image-pending" role="status" aria-live="polite">Loading saved image…</div>;
  }

  if (!src && model?.staticSource !== true && model?.status !== "error") {
    return <div className="chart-status-error" role="status" aria-live="polite">This chart image cannot be displayed.</div>;
  }
  if (model?.status === "error") {
    return <StaticContentStateBoundary
      state={model}
      surface={surface}
      onRetry={onRetry}
      onReplace={onReplace}
      onEdit={onEdit}
    />;
  }

  const title = chart.title || "Chart image";
  const crop = safeCrop(model?.crop);
  const rotation = safeRotation(model?.rotation);
  const fit = safeFit(model?.fit);
  const decorative = model?.decorative === true;
  const movePan = (next) => setPan(clampImagePan(next, scale));
  const setNextScale = (nextScale) => {
    const next = clampScale(nextScale);
    setScale(next);
    setPan((current) => clampImagePan(current, next));
  };
  const resetView = () => {
    setScale(MIN_IMAGE_SCALE);
    setPan({ x: 0, y: 0 });
  };
  const onKeyDown = (event) => {
    if (!active) return;
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      setNextScale(scale + IMAGE_SCALE_STEP);
    } else if (event.key === "-") {
      event.preventDefault();
      setNextScale(scale - IMAGE_SCALE_STEP);
    } else if (event.key === "0") {
      event.preventDefault();
      resetView();
    } else if (event.key.startsWith("Arrow")) {
      event.preventDefault();
      movePan({
        x: pan.x + (event.key === "ArrowRight" ? PAN_STEP : event.key === "ArrowLeft" ? -PAN_STEP : 0),
        y: pan.y + (event.key === "ArrowDown" ? PAN_STEP : event.key === "ArrowUp" ? -PAN_STEP : 0),
      });
    }
  };
  const state = !src || loadState === "error"
    ? {
        status: "error",
        failure: model?.failure ?? {
          code: src ? "image-load-failed" : "invalid-image-source",
          message: "This image could not be displayed.",
          retryable: true,
        },
      }
    : { status: "ready" };

  return <StaticContentStateBoundary
    state={state}
    surface={surface}
    onRetry={() => {
      setLoadState("loading");
      onRetry?.();
    }}
    onReplace={onReplace}
    onEdit={onEdit}
  >
    <figure
      className={`chart-image-view${active ? " chart-image-view--active" : ""}${touchActions ? " chart-image-view--touch-actions" : ""}`}
      data-static-image="true"
      data-image-zoom-scale={active ? scale : undefined}
      data-image-pan-x={active ? pan.x : undefined}
      data-image-pan-y={active ? pan.y : undefined}
      onPointerDown={active ? (event) => {
        if (event.pointerType === "touch") setTouchActions((current) => !current);
        if (event.button !== 0 || scale <= 1 || event.target.closest?.("button")) return;
        drag.current = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, pan };
        event.currentTarget.setPointerCapture?.(event.pointerId);
      } : undefined}
      onPointerMove={active ? (event) => {
        if (drag.current?.pointerId !== event.pointerId) return;
        movePan({
          x: drag.current.pan.x + (event.clientX - drag.current.clientX) / 4,
          y: drag.current.pan.y + (event.clientY - drag.current.clientY) / 4,
        });
      } : undefined}
      onPointerUp={active ? () => { drag.current = null; } : undefined}
      onWheel={active ? (event) => {
        const next = nextImageZoomScale(scale, event);
        if (next !== scale) {
          event.preventDefault();
          setNextScale(next);
        }
      } : undefined}
      onKeyDown={onKeyDown}
      tabIndex={active ? 0 : undefined}
      aria-label={active ? `${title} image viewer. Use arrow keys to pan, plus and minus to zoom, and zero to reset the view.` : undefined}
      {...titleContainerProps(chart)}
    >
      <div className="chart-image-viewport">
        {loadState === "loading" && <span className="chart-image-loading" aria-hidden="true" />}
        <div className="chart-image-saved-window">
          <div className="chart-image-transient" style={{ transform: `translate(${pan.x}%, ${pan.y}%) scale(${scale})` }}>
            {src && <svg
              className="chart-image-saved-geometry"
              data-image-transform-order="rotation-crop-fit"
              viewBox={`${crop.x} ${crop.y} ${crop.width} ${crop.height}`}
              preserveAspectRatio={fit === "cover" ? "xMidYMid slice" : "xMidYMid meet"}
              focusable="false"
            >
              <g className="chart-image-saved-rotation" transform={`rotate(${rotation} 500 500)`}>
                <foreignObject x="0" y="0" width="1000" height="1000">
                  <div className="chart-image-normalized-source" xmlns="http://www.w3.org/1999/xhtml">
                    <img
                      src={src}
                      alt={decorative ? "" : String(model?.alt ?? "")}
                      role={decorative ? "presentation" : undefined}
                      aria-hidden={decorative ? "true" : undefined}
                      style={{ objectFit: "fill" }}
                      onLoad={() => setLoadState("ready")}
                      onError={() => setLoadState("error")}
                      draggable="false"
                    />
                  </div>
                </foreignObject>
              </g>
            </svg>}
          </div>
        </div>
      </div>
      {!decorative && <figcaption>{title}</figcaption>}
      {active && <div className="chart-image-actions" aria-label="Image viewer actions">
        <button type="button" className="secondary" aria-label="Zoom out" disabled={scale <= MIN_IMAGE_SCALE} onClick={() => setNextScale(scale - IMAGE_SCALE_STEP)}>−</button>
        <output className="chart-image-zoom-status" aria-live="polite">{Math.round(scale * 100)}%</output>
        <button type="button" className="secondary" aria-label="Zoom in" disabled={scale >= MAX_IMAGE_SCALE} onClick={() => setNextScale(scale + IMAGE_SCALE_STEP)}>+</button>
        <button type="button" className="secondary" onClick={resetView} disabled={scale === MIN_IMAGE_SCALE && pan.x === 0 && pan.y === 0}>Reset view</button>
      </div>}
    </figure>
  </StaticContentStateBoundary>;
}

export function nextImageZoomScale(currentScale, event) {
  const current = clampScale(currentScale);
  let ctrlKey = false;
  let deltaY = 0;
  try {
    ctrlKey = event?.ctrlKey === true;
    deltaY = Number.isFinite(event?.deltaY) ? event.deltaY : 0;
  } catch {
    return current;
  }
  if (!ctrlKey || deltaY === 0) return current;
  return clampScale(current + (deltaY < 0 ? IMAGE_SCALE_STEP : -IMAGE_SCALE_STEP));
}

export function clampImagePan(value, scale) {
  if (clampScale(scale) <= MIN_IMAGE_SCALE) return { x: 0, y: 0 };
  const limit = Math.min(100, (clampScale(scale) - 1) * 50);
  return {
    x: clampNumber(value?.x, -limit, limit),
    y: clampNumber(value?.y, -limit, limit),
  };
}

function clampScale(value) {
  return clampNumber(Number.isFinite(value) ? value : MIN_IMAGE_SCALE, MIN_IMAGE_SCALE, MAX_IMAGE_SCALE);
}

function clampNumber(value, minimum, maximum) {
  const number = Number.isFinite(value) ? value : 0;
  return Math.min(maximum, Math.max(minimum, number));
}

function safeCrop(crop) {
  return crop && Number.isFinite(crop.x) && Number.isFinite(crop.y) && Number.isFinite(crop.width) && Number.isFinite(crop.height)
    ? crop
    : { x: 0, y: 0, width: 1000, height: 1000 };
}

function safeRotation(value) {
  return [0, 90, 180, 270].includes(value) ? value : 0;
}

function safeImageSource(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const src = value.trim();
  return /^(?:https:|blob:|\/|\.\/|\.\.\/|data:image\/[a-z0-9.+-]+;base64,)/i.test(src)
    ? src
    : null;
}

function safeFit(value) {
  return ["contain", "cover"].includes(value) ? value : "contain";
}
