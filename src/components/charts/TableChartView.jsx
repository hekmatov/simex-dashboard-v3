import React from "react";

export default function TableChartView({ model, chart = {} }) {
  const columns = Array.isArray(model.columns) ? model.columns : [];
  const rows = Array.isArray(model.rows) ? model.rows : [];
  const metadata = Array.isArray(model.rowMetadata) ? model.rowMetadata : [];
  const title = chart.title || "Table";
  return React.createElement("section", { className: "chart-table-view", "aria-label": title },
    React.createElement("h3", { className: "chart-view-title" }, title),
    chart.description ? React.createElement("p", { className: "chart-view-description" }, chart.description) : null,
    React.createElement("div", { className: "chart-table-scroll" }, React.createElement("table", null,
      React.createElement("caption", null, `${title} data table`),
      React.createElement("thead", null, React.createElement("tr", null, columns.map((column) => React.createElement("th", { key: column.key, scope: "col" }, column.label)))),
      React.createElement("tbody", null, rows.map((row, index) => React.createElement("tr", { key: `row-${index}`, "aria-label": metadata[index]?.time ? `Observed ${metadata[index].time}` : undefined }, columns.map((column) => React.createElement("td", { key: column.key }, formatValue(row?.[column.key])))))))),
    React.createElement("p", { className: "chart-view-provenance" }, sourceText(chart)));
}

function sourceText(chart) { return `Source: ${String(chart.provenance ?? chart.sourceLabel ?? chart.source?.label ?? "Configured data")}`; }
function formatValue(value) { if (value === null || value === undefined || value === "") return "Not available"; return typeof value === "object" ? "Structured value" : String(value); }
