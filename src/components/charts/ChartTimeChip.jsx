import React from "react";
export const ChartTimeEvidenceContext = React.createContext(null);

export default function ChartTimeChip() {
  const evidence = React.useContext(ChartTimeEvidenceContext);
  if (!evidence) return null;
  return React.createElement("span", {
    className: "chart-time-chip",
    "aria-live": "off",
    "data-chart-time-kind": evidence.kind,
    "data-chart-observation-epochs": evidence.observationEpochs.join(","),
    "data-chart-time-policy": evidence.policy ?? undefined,
  }, evidence.label);
}
