import React from "react";

export default function CardChartView({ model, chart = {} }) {
  const title = chart.title || "Chart summary";
  const description = chart.description || "Summary values for this chart.";
  const items = Array.isArray(model.items) ? model.items : [];
  return React.createElement("section", { className: "chart-card-view", "aria-label": title },
    React.createElement("h3", { className: "chart-view-title" }, title),
    React.createElement("p", { className: "chart-view-description" }, description),
    React.createElement("div", { className: "chart-card-collection", role: "list" }, items.map((item) => React.createElement(CardItem, { key: item.key, item, chart }))),
    React.createElement("p", { className: "chart-view-provenance" }, sourceText(chart)));
}

function CardItem({ item, chart }) {
  const fields = [
    ["Value", formatValue(item.value)],
    item.target !== null && item.target !== undefined ? ["Target", formatValue(item.target)] : null,
    item.delta?.absolute !== null && item.delta?.absolute !== undefined ? ["Change", signed(item.delta.absolute)] : null,
    item.delta?.percentage !== null && item.delta?.percentage !== undefined ? ["Percentage change", `${signed(item.delta.percentage)}%`] : null,
    item.direction ? ["Direction", item.direction] : null,
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

function sourceText(chart) { return `Source: ${String(chart.provenance ?? chart.sourceLabel ?? chart.source?.label ?? "Configured data")}`; }
function signed(value) { const number = Number(value); return Number.isFinite(number) ? `${number > 0 ? "+" : ""}${formatValue(number)}` : formatValue(value); }
function formatValue(value) { if (value === null || value === undefined || value === "") return "Not available"; return typeof value === "object" ? "Structured value" : String(value); }
