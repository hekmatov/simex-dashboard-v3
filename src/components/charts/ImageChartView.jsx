import React from "react";
import { titleContainerProps } from "./chartViewPresentation.js";

export default function ImageChartView({ model, chart = {}, provenance }) {
  const src = safeImageSource(model.src);
  if (!src) return React.createElement("div", { className: "chart-status-error", role: "status", "aria-live": "polite" }, "This chart image cannot be displayed.");
  const title = chart.title || "Chart image";
  return React.createElement("figure", {
    className: "chart-image-view",
    ...titleContainerProps(chart),
  },
    React.createElement("img", { src, alt: model.alt || chart.description || title, style: { objectFit: safeFit(model.fit) } }),
    React.createElement("figcaption", null, title),
    React.createElement("p", { className: "chart-view-provenance" }, `Source: ${provenance?.label ?? "Unavailable"}`),
    provenance?.capturedAt ? React.createElement("p", { className: "chart-view-provenance" }, `Captured: ${provenance.capturedAt}`) : null);
}

function safeImageSource(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const src = value.trim();
  return /^(?:https?:|blob:|\/|\.\/|\.\.\/)/i.test(src) ? src : null;
}
function safeFit(value) { return ["contain", "cover", "fill"].includes(value) ? value : "contain"; }
