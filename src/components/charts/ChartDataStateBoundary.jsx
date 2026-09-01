import React from "react";
import ChartStateSurface from "../ChartStateSurface.jsx";

export default function ChartDataStateBoundary({ state, chartName, short = false, children }) {
  const [continued, setContinued] = React.useState(false);
  if (!state) return children;
  const hasValidContent = state.hasValidContent && Boolean(children);
  return React.createElement(
    "div",
    {
      className: `chart-data-state-boundary chart-data-state-boundary--${state.kind}`,
      "data-chart-state": state.kind,
      "data-has-valid-content": hasValidContent ? "true" : "false",
      "data-chart-state-short": short ? "true" : undefined,
      "aria-busy": state.kind === "loading" ? "true" : undefined,
    },
    React.createElement(ChartStateSurface, {
      state: { kind: state.kind, message: state.message },
      chartName,
      short,
      lastValid: hasValidContent ? children : null,
      onContinue: state.kind === "partial" ? () => setContinued(true) : null,
    }),
    continued && state.kind === "partial"
      ? React.createElement(
          "p",
          { className: "chart-data-state-boundary__feedback", role: "status", "aria-live": "polite" },
          "Continuing with available data. Unavailable series remain identified; saved chart semantics are unchanged.",
        )
      : null,
  );
}
