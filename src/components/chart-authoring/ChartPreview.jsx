import React from "react";
import { prepareChartData } from "../../charting/data/prepareChartData.js";
import ChartView from "../charts/ChartView.jsx";
const MAX_DIAGNOSTICS = 4;
const MAX_MESSAGE_LENGTH = 240;
function ChartPreview({
  chart,
  rows = [],
  datasetProfile,
  timeContext,
  renderContext
} = {}) {
  let prepared;
  try {
    prepared = prepareChartData({
      chart,
      rows: Array.isArray(rows) ? rows : [],
      datasetProfile,
      timeContext
    });
  } catch (error) {
    return /* @__PURE__ */ React.createElement(
      PreviewState,
      {
        status: "invalid",
        diagnostics: [{
          message: error instanceof Error ? error.message : "The preview could not be prepared."
        }]
      }
    );
  }
  if (prepared.status !== "ready") {
    return /* @__PURE__ */ React.createElement(PreviewState, { status: prepared.status, diagnostics: prepared.diagnostics });
  }
  return /* @__PURE__ */ React.createElement("section", { className: "chart-authoring-preview chart-authoring-preview-ready", "aria-label": "Chart preview" }, /* @__PURE__ */ React.createElement(
    ChartView,
    {
      chart,
      rows,
      datasetProfile,
      timeContext,
      renderContext
    }
  ));
}
function PreviewState({ status, diagnostics }) {
  const safeStatus = status === "empty" ? "empty" : "invalid";
  const messages = Array.isArray(diagnostics) ? diagnostics.filter((diagnostic) => diagnostic && typeof diagnostic === "object").slice(0, MAX_DIAGNOSTICS) : [];
  return /* @__PURE__ */ React.createElement(
    "section",
    {
      className: `chart-authoring-preview chart-authoring-preview-${safeStatus}`,
      "aria-label": "Chart preview",
      role: "status",
      "aria-live": "polite"
    },
    /* @__PURE__ */ React.createElement("strong", null, safeStatus === "empty" ? "No chart data to preview" : "Preview needs attention"),
    messages.length > 0 ? /* @__PURE__ */ React.createElement("ul", null, messages.map((diagnostic, index) => /* @__PURE__ */ React.createElement(
      "li",
      {
        key: `${diagnostic.code ?? "diagnostic"}-${index}`,
        "data-responsible-field": responsibleField(diagnostic)
      },
      boundedMessage(diagnostic.message)
    ))) : /* @__PURE__ */ React.createElement("p", null, "No renderer-ready marks are available for the selected roles and filters.")
  );
}
function responsibleField(diagnostic) {
  if (typeof diagnostic.role === "string") return diagnostic.role;
  if (typeof diagnostic.field === "string") return diagnostic.field;
  if (/filter/i.test(diagnostic.code ?? "")) return "filters";
  if (/duplicate/i.test(diagnostic.code ?? "")) return "duplicates";
  if (/map|geograph/i.test(diagnostic.code ?? "")) return "map";
  return "data";
}
function boundedMessage(value) {
  const message = typeof value === "string" && value.trim() ? value.trim() : "The selected data cannot be rendered.";
  return message.length <= MAX_MESSAGE_LENGTH ? message : `${message.slice(0, MAX_MESSAGE_LENGTH - 1)}\u2026`;
}
export {
  ChartPreview as default
};
