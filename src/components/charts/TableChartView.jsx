import React from "react";
import {
  chartDescriptionVisible,
  chartTitleClassName,
  chartTitleVisible,
  titleContainerProps,
} from "./chartViewPresentation.js";

export default function TableChartView({ model, chart = {}, provenance }) {
  const columns = Array.isArray(model.columns) ? model.columns : [];
  const rows = Array.isArray(model.rows) ? model.rows : [];
  const metadata = Array.isArray(model.rowMetadata) ? model.rowMetadata : [];
  const title = chart.title || "Table";
  const rowDistribution = chart.presentation?.table?.rowDistribution === "fill"
    ? "fill"
    : "regular";
  const table = React.createElement("table", null,
    React.createElement("caption", {
      className: chartTitleVisible(chart)
        ? undefined
        : "chart-view-title--visually-hidden",
    }, `${title} data table`),
    React.createElement("thead", null, React.createElement("tr", null, columns.map((column) => React.createElement("th", { key: column.key, scope: "col" }, column.label)))),
    React.createElement("tbody", null, rows.map((row, index) => React.createElement("tr", {
      key: metadata[index]?.key ?? canonicalRowKey(row, columns, metadata[index]?.time),
      "aria-label": metadata[index]?.time ? `Observed ${metadata[index].time}` : undefined,
    }, columns.map((column) => React.createElement("td", { key: column.key }, formatValue(row?.[column.key])))))));
  return React.createElement("section", {
    className: `chart-table-view chart-table-view--${rowDistribution}`,
    "aria-label": title,
    ...titleContainerProps(chart),
  },
    React.createElement("h3", { className: chartTitleClassName(chart) }, title),
    chartDescriptionVisible(chart) && chart.description
      ? React.createElement("p", { className: "chart-view-description" }, chart.description)
      : null,
    React.createElement("div", { className: "chart-table-scroll" }, table));
}

function formatValue(value) {
  if (value === null || value === undefined || value === "" || (typeof value === "number" && !Number.isFinite(value))) return "Not available";
  return typeof value === "object" ? "Structured value" : String(value);
}
function canonicalRowKey(row, columns, time) { return `table:${canonicalStringify([...(columns ?? []).map(({ key }) => [key, row?.[key]]), ["time", time ?? null]])}`; }
function canonicalStringify(value) {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "number") return Number.isFinite(value) ? `number:${value}` : `number:${String(value)}`;
  if (typeof value === "string") return `string:${JSON.stringify(value)}`;
  if (typeof value === "boolean") return `boolean:${value}`;
  if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(",")}]`;
  if (typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalStringify(value[key])}`).join(",")}}`;
  return String(value);
}
