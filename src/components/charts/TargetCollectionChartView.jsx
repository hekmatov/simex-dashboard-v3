import React from "react";

import CollectionDisplay from "../collection/CollectionDisplay.jsx";
import { useOptionalPlayback } from "../playback/PlaybackProvider.jsx";
import EmbeddedEChartsItem from "./EmbeddedEChartsItem.jsx";
import { titleContainerProps } from "./chartViewPresentation.js";

export default function TargetCollectionChartView({
  model,
  chart = {},
  provenance,
  playback: suppliedPlayback,
}) {
  const contextPlayback = useOptionalPlayback();
  const playback = suppliedPlayback ?? contextPlayback;
  const titleId = React.useId();
  const descriptionId = React.useId();
  const title = chart.title || "Target status";
  const description = chart.description || "Target status by entity.";
  const items = Array.isArray(model.items) ? model.items : [];

  return React.createElement("section", {
    className: "chart-target-collection-view",
    "aria-labelledby": titleId,
    "aria-describedby": descriptionId,
    ...titleContainerProps(chart),
  },
  React.createElement("h3", {
    id: titleId,
    className: "chart-view-title",
  }, title),
  React.createElement("p", {
    id: descriptionId,
    className: "chart-view-description",
  }, description),
  React.createElement("div", {
    className: "chart-target-collection",
  }, React.createElement(CollectionDisplay, {
    items,
    settings: model.presentation?.collection ?? {},
    playback,
    renderItem: (item) => React.createElement(TargetCollectionItem, {
      item,
    }),
  })),
  React.createElement(Provenance, { provenance }));
}

function TargetCollectionItem({ item }) {
  const labelId = React.useId();
  const summaryId = React.useId();
  const label = displayText(item.label, "Target");
  const summary = displayText(
    item.accessibleSummary,
    `${label}: actual ${displayValue(item.actual ?? item.value)}; target ${displayValue(item.target)}`,
  );
  return React.createElement("article", {
    className: "chart-target-collection-item",
    role: "img",
    "aria-labelledby": labelId,
    "aria-describedby": summaryId,
    ...(item.temporalStatus
      ? { "data-temporal-status": item.temporalStatus }
      : {}),
  },
  React.createElement("h4", {
    id: labelId,
    className: "chart-target-collection-label",
  }, label),
  React.createElement("p", {
    id: summaryId,
    className: "chart-view-title--visually-hidden",
  }, summary),
  React.createElement(EmbeddedEChartsItem, { model: item.model }));
}

function Provenance({ provenance = {} }) {
  return React.createElement(React.Fragment, null,
    React.createElement(
      "p",
      { className: "chart-view-provenance" },
      `Source: ${provenance.label ?? "Unavailable"}`,
    ),
    provenance.capturedAt
      ? React.createElement(
          "p",
          { className: "chart-view-provenance" },
          `Captured: ${provenance.capturedAt}`,
        )
      : null);
}

function displayText(value, fallback) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function displayValue(value) {
  return value === null
    || value === undefined
    || (typeof value === "number" && !Number.isFinite(value))
    ? "Unavailable"
    : String(value);
}
