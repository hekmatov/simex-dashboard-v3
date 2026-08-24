import React from "react";
import { titleContainerProps } from "./chartViewPresentation.js";
import { IconControl } from "../common/SimExIcon.js";

const MIN_IMAGE_SCALE = 1;
const MAX_IMAGE_SCALE = 3;
const IMAGE_SCALE_STEP = 0.25;

export default function ImageChartView({
  model,
  chart = {},
  provenance,
  zoomEnabled = false,
}) {
  const src = safeImageSource(model.src);
  const [scale, setScale] = React.useState(MIN_IMAGE_SCALE);
  const canZoom = zoomEnabled === true;
  React.useEffect(() => {
    setScale(MIN_IMAGE_SCALE);
  }, [canZoom, src]);
  if (!src) return React.createElement("div", { className: "chart-status-error", role: "status", "aria-live": "polite" }, "This chart image cannot be displayed.");
  const title = chart.title || "Chart image";
  return React.createElement("figure", {
    className: canZoom
      ? "chart-image-view chart-image-view--zoom-enabled"
      : "chart-image-view",
    ...(canZoom ? {
      "data-image-zoom-scale": scale,
      onWheel: (event) => setScale((current) => nextImageZoomScale(current, event)),
    } : {}),
    ...titleContainerProps(chart),
  },
    React.createElement("div", { className: "chart-image-viewport" },
      React.createElement("img", {
        src,
        alt: model.alt || chart.description || title,
        style: {
          objectFit: safeFit(model.fit),
          ...(canZoom ? {
            transform: `scale(${scale})`,
            transformOrigin: "center center",
          } : {}),
        },
      })),
    React.createElement("figcaption", null, title),
    canZoom
      ? React.createElement("div", { className: "chart-image-zoom-controls" },
          React.createElement("output", {
            className: "chart-image-zoom-status",
            role: "status",
            "aria-live": "polite",
          }, `Zoom ${Math.round(scale * 100)}%`),
          React.createElement(IconControl, {
            interactionId: "image.zoom-reset",
            className: "secondary",
            disabled: scale === MIN_IMAGE_SCALE,
            onClick: () => setScale(MIN_IMAGE_SCALE),
          }))
      : null,
  );
}

export function nextImageZoomScale(currentScale, event) {
  const current = Number.isFinite(currentScale)
    ? Math.min(MAX_IMAGE_SCALE, Math.max(MIN_IMAGE_SCALE, currentScale))
    : MIN_IMAGE_SCALE;
  let ctrlKey = false;
  let deltaY = 0;
  try {
    ctrlKey = event?.ctrlKey === true;
    deltaY = Number.isFinite(event?.deltaY) ? event.deltaY : 0;
  } catch {
    return current;
  }
  if (!ctrlKey || deltaY === 0) return current;
  const next = current + (deltaY < 0 ? IMAGE_SCALE_STEP : -IMAGE_SCALE_STEP);
  return Math.min(MAX_IMAGE_SCALE, Math.max(MIN_IMAGE_SCALE, next));
}

function safeImageSource(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const src = value.trim();
  return /^(?:https?:|blob:|\/|\.\/|\.\.\/|data:image\/[a-z0-9.+-]+;base64,)/i.test(src)
    ? src
    : null;
}
function safeFit(value) { return ["contain", "cover", "fill"].includes(value) ? value : "contain"; }
