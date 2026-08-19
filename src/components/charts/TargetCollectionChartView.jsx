import React from "react";

import CollectionDisplay from "../collection/CollectionDisplay.jsx";
import EmbeddedEChartsItem from "./EmbeddedEChartsItem.jsx";
import {
  chartDescriptionVisible,
  titleContainerProps,
} from "./chartViewPresentation.js";

export default function TargetCollectionChartView({
  model,
  chart = {},
  provenance,
  accessibilityEnabled = false,
}) {
  const titleId = React.useId();
  const descriptionId = React.useId();
  const title = chart.title || "Target status";
  const description = chart.description || "Target status by entity.";
  const items = Array.isArray(model.items) ? model.items : [];

  return React.createElement("section", {
    className: "chart-target-collection-view",
    ...(accessibilityEnabled
      ? {
          "aria-labelledby": titleId,
          "aria-describedby": descriptionId,
        }
      : {}),
    ...titleContainerProps(chart),
  },
  React.createElement("h3", {
    id: titleId,
    className: "chart-view-title",
  }, title),
  chartDescriptionVisible(chart)
    ? React.createElement("p", {
        id: descriptionId,
        className: "chart-view-description",
      }, description)
    : accessibilityEnabled
      ? React.createElement("p", {
          id: descriptionId,
          className: "chart-view-title--visually-hidden",
        }, description)
    : null,
  React.createElement("div", {
    className: "chart-target-collection",
  }, React.createElement(CollectionDisplay, {
    items,
    settings: model.presentation?.collection ?? {},
    renderItem: (item) => React.createElement(TargetCollectionItem, {
      item,
      accessibilityEnabled,
    }),
  })));
}

function TargetCollectionItem({ item, accessibilityEnabled }) {
  const labelId = React.useId();
  const summaryId = React.useId();
  const label = displayText(item.label, "Target");
  const summary = accessibilityEnabled
    ? displayText(
        item.accessibleSummary,
        `${label}: actual ${displayValue(item.actual ?? item.value)}; target ${displayValue(item.target)}`,
      )
    : null;
  return React.createElement("article", {
    className: "chart-target-collection-item",
    ...(accessibilityEnabled
      ? {
          role: "group",
          "aria-labelledby": labelId,
          "aria-describedby": summaryId,
        }
      : {}),
    ...(item.temporalStatus
      ? { "data-temporal-status": item.temporalStatus }
      : {}),
  },
  React.createElement("h4", {
    id: labelId,
    className: "chart-target-collection-label",
  }, label),
  accessibilityEnabled
    ? React.createElement("p", {
        id: summaryId,
        className: "chart-view-title--visually-hidden",
      }, summary)
    : null,
  React.createElement(EmbeddedEChartsItem, { model: item.model }));
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
