import React from "react";

export default function ChartDataStateBoundary({ state, children }) {
  if (!state) return children;
  const hasValidContent = state.hasValidContent && Boolean(children);
  return React.createElement(
    "div",
    {
      className: `chart-data-state-boundary chart-data-state-boundary--${state.kind}`,
      "data-chart-state": state.kind,
      "data-has-valid-content": hasValidContent ? "true" : "false",
      "aria-busy": state.kind === "loading" ? "true" : undefined,
    },
    hasValidContent ? children : null,
    React.createElement(
      "div",
      { className: "chart-state-plate", role: "status", "aria-live": "polite" },
      React.createElement("span", {
        className: "chart-state-indicator",
        "aria-hidden": "true",
      }, indicatorFor(state.kind)),
      React.createElement("p", null, state.message),
    ),
  );
}

function indicatorFor(kind) {
  if (kind === "loading") return "••••";
  if (kind === "partial") return "◩";
  if (kind === "error") return "!";
  return "—";
}
