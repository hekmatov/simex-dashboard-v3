import React from "react";
import { titleContainerProps } from "./chartViewPresentation.js";

export default function CardChartView({ model, chart = {}, provenance }) {
  const title = chart.title || "Chart summary";
  const description = chart.description || "Summary values for this chart.";
  const items = Array.isArray(model.items) ? model.items : [];
  return React.createElement("section", {
    className: "chart-card-view",
    "aria-label": title,
    ...titleContainerProps(chart),
  },
    React.createElement("h3", { className: "chart-view-title" }, title),
    React.createElement("p", { className: "chart-view-description" }, description),
    React.createElement("div", { className: "chart-card-collection", role: "list" }, items.map((item) => React.createElement(CardItem, { key: item.key, item, chart }))),
    React.createElement(Provenance, { provenance }));
}

function CardItem({ item, chart }) {
  const fields = [
    ["Value", formatValue(item.value)],
    item.target !== null && item.target !== undefined ? ["Target", formatValue(item.target)] : null,
    item.delta?.absolute !== null && item.delta?.absolute !== undefined ? ["Change", signed(item.delta.absolute)] : null,
    item.delta?.percentage !== null && item.delta?.percentage !== undefined ? ["Percentage change", formatPercentage(item.delta.percentage)] : null,
    item.direction ? ["Direction", item.direction] : null,
    item.favorability ? ["Favorable outcome", item.favorability] : null,
    item.comparison !== null && item.comparison !== undefined ? ["Comparison value", formatValue(item.comparison)] : null,
    item.comparisonTime ? ["Compared with", item.comparisonTime] : null,
    item.time ? ["Observed", item.time] : null,
  ].filter(Boolean);
  return React.createElement("article", { className: "chart-card", role: "listitem" },
    React.createElement("h4", null, item.label || chart.title || "Value"),
    React.createElement("dl", null, fields.map(([label, value]) => React.createElement("div", {
      key: label,
      className: `chart-card-${label.toLowerCase().replaceAll(" ", "-")}`,
      "aria-label": label === "Compared with" ? `${label} ${value}` : undefined,
    }, React.createElement("dt", null, label), React.createElement("dd", null, value)))));
}

function Provenance({ provenance = {} }) {
  return React.createElement(React.Fragment, null,
    React.createElement("p", { className: "chart-view-provenance" }, `Source: ${provenance.label ?? "Unavailable"}`),
    provenance.capturedAt ? React.createElement("p", { className: "chart-view-provenance" }, `Captured: ${provenance.capturedAt}`) : null);
}
function signed(value) { const number = Number(value); return Number.isFinite(number) ? `${number > 0 ? "+" : ""}${formatValue(number)}` : "Not available"; }
function formatPercentage(value) { const number = Number(value); return Number.isFinite(number) ? `${signed(number)}%` : "Not available"; }
function formatValue(value) {
  if (value === null || value === undefined || value === "") return "Not available";
  if (typeof value === "number" && !Number.isFinite(value)) return "Not available";
  return typeof value === "object" ? "Structured value" : String(value);
}
