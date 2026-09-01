import React from "react";
import CollectionDisplay from "../collection/CollectionDisplay.jsx";
import {
  chartDescriptionVisible,
  chartTitleClassName,
  titleContainerProps,
} from "./chartViewPresentation.js";
import { cardPresentationForChart } from "../../charting/presentation/cardPresentationContract.js";

const NUMBER_FORMATTER = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

export default function CardChartView({
  model,
  chart = {},
  provenance,
  interactionMode = "active",
  short = false,
  compact = false,
}) {
  const controlsPortalId = `collection-controls-${React.useId()}`;
  const title = chart.title || "Chart summary";
  const description = chart.description || "Summary values for this chart.";
  const items = Array.isArray(model.items) ? model.items : [];
  const cardPresentation = presentationForItems(chart, items);
  return React.createElement("section", {
    className: [
      "chart-card-view",
      short ? "chart-card-view--short" : "",
      compact ? "chart-card-view--compact" : "",
    ].filter(Boolean).join(" "),
    "aria-label": title,
    ...titleContainerProps(chart),
  },
    React.createElement("header", { className: "collection-display-header" },
      React.createElement("h3", { className: chartTitleClassName(chart) }, title),
      React.createElement("div", { id: controlsPortalId, className: "collection-header-transport-host" })),
    chartDescriptionVisible(chart)
      ? React.createElement("p", { className: "chart-view-description" }, description)
      : null,
    React.createElement("div", {
      className: "chart-card-collection",
      role: items.length <= 1 ? "list" : undefined,
      ...(short ? {
        tabIndex: 0,
        "aria-label": `${title} cards. Scroll to view all cards.`,
      } : {}),
    },
      items.length <= 1
        ? items.map((item, index) => React.createElement(CardItem, {
            key: item.key,
            item,
            chart,
            cardPresentation,
            cardIndex: index,
          }))
        : React.createElement(CollectionDisplay, {
            items: collectionItems(items),
            settings: model.presentation?.collection ?? {},
            controlsPortalId,
            interactive: interactionMode !== "passive",
            renderItem: (item) => React.createElement(CardItem, {
              item,
              chart,
              cardPresentation,
              cardIndex: item.cardIndex,
              nested: true,
            }),
          })));
}

function CardItem({
  item,
  chart,
  cardPresentation,
  cardIndex = 0,
  nested = false,
}) {
  const isDelta = isDeltaCard(cardPresentation.style, item);
  const direction = isDelta ? deltaDirection(item) : null;
  const deltaValue = isDelta ? formatDelta(item.delta) : null;
  const accent = usesCardAccent(cardPresentation.style)
    ? accentColor(cardPresentation.accentColors, cardIndex)
    : null;
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
  const label = item.label || chart.title || "Value";
  return React.createElement("article", {
    className: `chart-card chart-card--${toKebabCase(cardPresentation.style)}`,
    role: nested ? undefined : "listitem",
    "data-card-style": cardPresentation.style,
    ...(direction ? { "data-delta-direction": direction } : {}),
    ...(accent ? { style: { "--chart-card-accent": accent } } : {}),
    "aria-label": cardAriaLabel({
      item,
      label,
      value: formatValue(item.value),
      direction,
      deltaValue,
      hasTemporalProvenance,
      hasComparisonProvenance,
    }),
    ...(item.temporalStatus
      ? { "data-temporal-status": item.temporalStatus }
      : {}),
  },
    React.createElement("span", { className: "chart-card-label" }, label),
    React.createElement("strong", { className: "chart-card-value" }, formatValue(item.value)),
    isDelta
      ? React.createElement("span", { className: "chart-card-delta" },
          cardPresentation.showDeltaArrow
            ? React.createElement("span", {
                className: "chart-card-delta-arrow",
                "aria-hidden": "true",
              }, deltaArrow(direction))
            : null,
          React.createElement("span", { className: "chart-card-delta-value" }, deltaValue))
      : null);
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
    return { ...item, entityId, cardIndex: index };
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

function presentationForItems(chart, items) {
  const typeId = chart.typeId || (
    items.some((item) => item?.delta !== null && item?.delta !== undefined)
      ? "deltaCard"
      : "kpi"
  );
  return cardPresentationForChart({ ...chart, typeId });
}

function isDeltaCard(style, item) {
  return ["footerDelta", "splitMetric", "directionRail"].includes(style)
    || (item.delta !== null && item.delta !== undefined);
}

function usesCardAccent(style) {
  return style === "quietLedger" || style === "signalStamps";
}

function accentColor(colors, index) {
  const palette = Array.isArray(colors)
    ? colors.filter((color) => /^#[0-9a-f]{6}$/i.test(color))
    : [];
  const colorIndex = Math.abs(Number(index) || 0);
  if (palette.length > 0) return palette[colorIndex % palette.length];
  return `var(--simex-data-${(colorIndex % 6) + 1})`;
}

function deltaDirection(item) {
  if (["increase", "decrease", "unchanged"].includes(item.direction)) {
    return item.direction;
  }
  const value = Number(item.delta?.absolute);
  if (!Number.isFinite(value) || value === 0) return "unchanged";
  return value > 0 ? "increase" : "decrease";
}

function formatDelta(delta) {
  const absolute = Number(delta?.absolute);
  if (Number.isFinite(absolute)) return signed(absolute);
  const percentage = Number(delta?.percentage);
  return Number.isFinite(percentage) ? `${signed(percentage)}%` : "Not available";
}

function deltaArrow(direction) {
  if (direction === "increase") return "↑";
  if (direction === "decrease") return "↓";
  return "→";
}

function toKebabCase(value) {
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase();
}

function cardAriaLabel({
  item,
  label,
  value,
  direction,
  deltaValue,
  hasTemporalProvenance,
  hasComparisonProvenance,
}) {
  const details = [`${label}: ${value}`];
  if (deltaValue) details.push(`Change ${deltaValue}${direction ? `, ${direction}` : ""}`);
  if (item.delta?.percentage !== null && item.delta?.percentage !== undefined) {
    details.push(`Percentage change ${formatPercentage(item.delta.percentage)}`);
  }
  if (typeof item.favorability === "string" && item.favorability.trim()) {
    details.push(`Favorable outcome ${item.favorability}`);
  }
  if (item.target !== null && item.target !== undefined) details.push(`Target ${formatValue(item.target)}`);
  if (item.comparison !== null && item.comparison !== undefined) details.push(`Comparison value ${formatValue(item.comparison)}`);
  if (hasComparisonProvenance) details.push(`Comparison source ${item.comparisonProvenance.label}`);
  else if (item.comparisonTime) details.push(`Compared with ${item.comparisonTime}`);
  if (hasTemporalProvenance && item.activeTime) details.push(`Playback time ${item.activeTime}`);
  if (hasTemporalProvenance) details.push(`Measurement source ${item.provenance.label}`);
  else if (item.time) details.push(`Observed ${item.time}`);
  return details.join(". ");
}
