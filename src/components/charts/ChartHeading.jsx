import React from "react";

import {
  chartDescriptionVisible,
  chartTitleClassName,
  chartTitleStyle,
  titleContainerProps,
} from "./chartViewPresentation.js";

export default function ChartHeading({ chart, titleId, descriptionId, level = 3, titleStyle }) {
  const Heading = `h${level}`;
  const title = String(chart?.title || "Chart");
  const description = String(chart?.description || "");
  const resolvedTitleStyle = {
    ...chartTitleStyle(chart),
    ...titleStyle,
  };

  return React.createElement(
    "header",
    { className: "chart-view-heading", ...titleContainerProps(chart) },
    React.createElement(Heading, {
      id: titleId,
      className: chartTitleClassName(chart),
      ...(Object.keys(resolvedTitleStyle).length > 0 ? {
        style: {
          fontFamily: "var(--simex-style-heading-font)",
          ...resolvedTitleStyle,
        },
      } : {}),
    }, title),
    chartDescriptionVisible(chart) && description
      ? React.createElement("p", { id: descriptionId, className: "chart-view-description" }, description)
      : null,
  );
}
