import React from "react";
import ChartTimeChip from "./ChartTimeChip.jsx";

export const ChartSourceEvidenceContext = React.createContext(null);

export default function ChartSourceCaption() {
  const evidence = React.useContext(ChartSourceEvidenceContext);
  if (!evidence) return React.createElement(ChartTimeChip);
  return React.createElement(React.Fragment, null, React.createElement(ChartTimeChip), React.createElement("p", {
    className: "chart-source-caption",
    style: {
      color: "var(--simex-text-muted)", fontFamily: "var(--simex-style-body-font)",
      fontSize: "var(--audience-text-size, 12px)", lineHeight: 1.35,
      margin: 0, overflowWrap: "anywhere", whiteSpace: "normal",
    },
  },
  React.createElement("span", { "data-chart-source-citation": "true" }, `Source: ${evidence.citation}`),
  evidence.uncertainty ? " · " : null,
  evidence.uncertainty ? React.createElement("span", { "data-chart-source-uncertainty": "true" }, `Uncertainty: ${evidence.uncertainty}`) : null));
}
