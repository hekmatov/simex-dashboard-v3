import React from "react";
import ChartStateSurface from "../ChartStateSurface.jsx";

export default function ChartDataStateBoundary({ state, chartName, children }) {
  if (!state) return children;
  const hasValidContent = state.hasValidContent && Boolean(children);
  const surfaceKind = state.kind === "partial" ? "unavailable" : state.kind;
  return React.createElement(
    "div",
    {
      className: `chart-data-state-boundary chart-data-state-boundary--${state.kind}`,
      "data-chart-state": state.kind,
      "data-has-valid-content": hasValidContent ? "true" : "false",
      "aria-busy": state.kind === "loading" ? "true" : undefined,
    },
    React.createElement(ChartStateSurface, {
      state: { kind: surfaceKind, message: state.message },
      chartName,
      lastValid: hasValidContent ? children : null,
    }),
  );
}
