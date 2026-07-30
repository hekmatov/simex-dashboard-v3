import React from "react";

import { resolveChartCitation } from "../../charting/presentation/chartCitation.js";
import ConfirmDialog from "../common/ConfirmDialog.jsx";
import SourceCsvViewerButton from "../source-data/SourceCsvViewerButton.jsx";
import {
  fieldControlId,
  fieldDescribedBy,
  FieldShell,
} from "./StandardField.jsx";

export default function CitationField({
  field,
  value = "",
  onChange,
  chart = {},
  charts = [],
  dataSources = {},
  profile,
  onApplyCitationToSourceCharts,
}) {
  const [confirmationOpen, setConfirmationOpen] = React.useState(false);
  const source = readEntry(dataSources, chart.sourceId);
  const otherChartCount = charts.filter((candidate) => (
    candidate?.id !== chart.id && candidate?.sourceId === chart.sourceId
  )).length;
  const inheritedChart = {
    ...chart,
    presentation: {
      ...(chart.presentation ?? {}),
      citation: undefined,
    },
  };
  const inherited = resolveChartCitation({
    chart: inheritedChart,
    dataSources,
    datasetProfile: profile,
  });
  const id = fieldControlId(field);
  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      FieldShell,
      { field, className: "chart-authoring-citation-field" },
      React.createElement("input", {
        id,
        value: typeof value === "string" ? value : "",
        placeholder: inherited,
        "aria-describedby": fieldDescribedBy(field) || undefined,
        onChange: (event) => onChange(event.target.value),
      }),
      React.createElement(
        "small",
        { className: "chart-authoring-citation-resolved" },
        `Displayed source: ${typeof value === "string" && value.trim() ? value.trim() : inherited}`,
      ),
      React.createElement(
        "div",
        { className: "chart-authoring-citation-actions" },
        React.createElement(SourceCsvViewerButton, {
          sourceId: chart.sourceId,
          source,
        }),
        React.createElement(
          "button",
          {
            type: "button",
            className: "secondary",
            disabled: otherChartCount === 0
              || typeof onApplyCitationToSourceCharts !== "function",
            onClick: () => setConfirmationOpen(true),
          },
          otherChartCount === 0
            ? "No other charts share this source"
            : `Apply to ${otherChartCount} source-sharing chart${otherChartCount === 1 ? "" : "s"}`,
        ),
      ),
    ),
    React.createElement(ConfirmDialog, {
      open: confirmationOpen,
      title: "Apply citation to source-sharing charts?",
      message: `This will update this chart and ${otherChartCount} other chart${otherChartCount === 1 ? "" : "s"} that use the same CSV source.`,
      confirmLabel: "Apply citation",
      cancelLabel: "Keep chart only",
      onConfirm: () => {
        setConfirmationOpen(false);
        onApplyCitationToSourceCharts?.({
          sourceId: chart.sourceId,
          label: typeof value === "string" ? value : "",
          excludeChartId: chart.id,
        });
      },
      onCancel: () => setConfirmationOpen(false),
    }),
  );
}

function readEntry(collection, key) {
  if (collection instanceof Map) return collection.get(key);
  return collection && typeof collection === "object" ? collection[key] : undefined;
}
