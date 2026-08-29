import React from "react";
import CollectionDisplay from "../collection/CollectionDisplay.jsx";
import {
  chartDescriptionVisible,
  chartTitleClassName,
  titleContainerProps,
} from "./chartViewPresentation.js";

const NUMBER_FORMATTER = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

export default function CardChartView({ model, chart = {}, provenance, interactionMode = "active" }) {
  const controlsPortalId = `collection-controls-${React.useId()}`;
  const title = chart.title || "Chart summary";
  const description = chart.description || "Summary values for this chart.";
  const items = Array.isArray(model.items) ? model.items : [];
  return React.createElement("section", {
    className: "chart-card-view",
    "aria-label": title,
    ...titleContainerProps(chart),
  },
    React.createElement("header", { className: "collection-display-header" },
      React.createElement("h3", { className: chartTitleClassName(chart) }, title),
      React.createElement("div", { id: controlsPortalId, className: "collection-header-transport-host" })),
    chartDescriptionVisible(chart)
      ? React.createElement("p", { className: "chart-view-description" }, description)
      : null,
    React.createElement("div", { className: "chart-card-collection", role: items.length <= 1 ? "list" : undefined },
      items.length <= 1
        ? items.map((item) => React.createElement(CardItem, {
            key: item.key,
            item,
            chart,
          }))
        : React.createElement(CollectionDisplay, {
            items: collectionItems(items),
            settings: model.presentation?.collection ?? {},
            controlsPortalId,
            interactive: interactionMode !== "passive",
            renderItem: (item) => React.createElement(CardItem, {
              item,
              chart,
              nested: true,
            }),
          })));
}

function CardItem({ item, chart, nested = false }) {
  const hasTemporalProvenance = (
    item.provenance
    && typeof item.provenance.label === "string"
    && item.provenance.label.trim()
  );
  const hasComparisonProvenance = (
    item.comparisonProvenance
    && typeof item.comparisonProvenance.label === "string"
    && item.comparisonProvenance.label.trim()
  );
  const fields = [
    ["Value", formatValue(item.value)],
    item.target !== null && item.target !== undefined ? ["Target", formatValue(item.target)] : null,
    item.delta?.absolute !== null && item.delta?.absolute !== undefined ? ["Change", signed(item.delta.absolute)] : null,
    item.delta?.percentage !== null && item.delta?.percentage !== undefined ? ["Percentage change", formatPercentage(item.delta.percentage)] : null,
    item.direction ? ["Direction", item.direction] : null,
    item.favorability ? ["Favorable outcome", item.favorability] : null,
    item.comparison !== null && item.comparison !== undefined ? ["Comparison value", formatValue(item.comparison)] : null,
    hasComparisonProvenance
      ? ["Comparison source", item.comparisonProvenance.label]
      : item.comparisonTime
        ? ["Compared with", item.comparisonTime]
        : null,
    hasTemporalProvenance && item.activeTime ? ["Playback time", item.activeTime] : null,
    hasTemporalProvenance ? ["Measurement source", item.provenance.label] : null,
    !hasTemporalProvenance && item.time ? ["Observed", item.time] : null,
  ].filter(Boolean);
  return React.createElement("article", {
    className: "chart-card",
    role: nested ? undefined : "listitem",
    ...(item.temporalStatus
      ? { "data-temporal-status": item.temporalStatus }
      : {}),
  },
    React.createElement("h4", null, item.label || chart.title || "Value"),
    React.createElement("dl", null, fields.map(([label, value]) => React.createElement("div", {
      key: label,
      className: `chart-card-${label.toLowerCase().replaceAll(" ", "-")}`,
      "aria-label": ["Compared with", "Measurement source", "Comparison source"].includes(label)
        ? `${label} ${value}`
        : undefined,
    }, React.createElement("dt", null, label), React.createElement("dd", null, value)))));
}

function collectionItems(items) {
  return items.map((item, index) => {
    const entityId = typeof item.entityId === "string" && item.entityId.trim()
      ? item.entityId
      : typeof item.key === "string" && item.key.trim()
        ? item.key
        : null;
    if (!entityId) {
      throw new Error(`Card collection item ${index + 1} requires a stable key.`);
    }
    return { ...item, entityId };
  });
}

function signed(value) { const number = Number(value); return Number.isFinite(number) ? `${number > 0 ? "+" : ""}${formatValue(number)}` : "Not available"; }
function formatPercentage(value) { const number = Number(value); return Number.isFinite(number) ? `${signed(number)}%` : "Not available"; }
function formatValue(value) {
  if (value === null || value === undefined || value === "") return "Not available";
  if (typeof value === "number" && !Number.isFinite(value)) return "Not available";
  if (typeof value === "number") return NUMBER_FORMATTER.format(value);
  return typeof value === "object" ? "Structured value" : String(value);
}
