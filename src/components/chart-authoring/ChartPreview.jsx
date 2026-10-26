import React from "react";
import { prepareChartData } from "../../charting/data/prepareChartData.js";
import { enforceRenderReadiness } from "../../charting/rendering/buildRenderModel.js";
import { resolvePreparedChartRendering } from "../../charting/rendering/resolveChartRendering.js";
import ChartView from "../charts/ChartView.jsx";
const MAX_DIAGNOSTICS = 4;
const MAX_MESSAGE_LENGTH = 240;
function ChartPreview({
  chart,
  rows = [],
  datasetProfile,
  geoData,
  timeContext,
  renderContext,
  prepared: suppliedPrepared,
  diagnosticNamespace = chart?.id
} = {}) {
  const result = prepareChartPreview({ chart, rows, datasetProfile, geoData, timeContext, renderContext, prepared: suppliedPrepared });
  if (result.status !== "ready") return React.createElement(PreviewState, {
    status: result.status,
    diagnostics: buildPreviewDiagnostics(result.diagnostics, { namespace: diagnosticNamespace }),
  });
  return React.createElement("section", { className: "chart-authoring-preview chart-authoring-preview-ready", "aria-label": "Chart preview" }, React.createElement(ChartView, {
    chart, rows, datasetProfile, geoData, timeContext, renderContext, resolvedRendering: result.resolvedRendering,
  }));
}

export function prepareChartPreview({ chart, rows = [], datasetProfile, geoData, timeContext, renderContext, prepared: suppliedPrepared } = {}) {
  let prepared;
  try {
    prepared = suppliedPrepared ?? enforceRenderReadiness({
        chart,
        prepared: prepareChartData({
          chart,
          rows: Array.isArray(rows) ? rows : [],
          datasetProfile,
          geoData,
          timeContext
        })
      });
  } catch (error) {
    return {
        status: "invalid", diagnostics: [{
          message: error instanceof Error ? error.message : "The preview could not be prepared."
        }],
    };
  }
  if (prepared.status !== "ready") {
    return { status: prepared.status, diagnostics: prepared.diagnostics, prepared };
  }
  const renderingInput = {
    chart,
    rows,
    datasetProfile,
    geoData,
    timeContext,
    renderContext
  };
  const resolvedRendering = resolvePreparedChartRendering(
    renderingInput,
    prepared
  );
  return { status: "ready", prepared, resolvedRendering };
}
export function PreviewState({ status, diagnostics }) {
  const safeStatus = ["empty", "pending"].includes(status) ? status : "invalid";
  const messages = Array.isArray(diagnostics) ? diagnostics.filter((diagnostic) => diagnostic && typeof diagnostic === "object").slice(0, MAX_DIAGNOSTICS) : [];
  return /* @__PURE__ */ React.createElement(
    "section",
    {
      className: `chart-authoring-preview chart-authoring-preview-${safeStatus}`,
      "aria-label": "Chart preview",
      role: "status",
      "aria-live": "polite"
    },
    /* @__PURE__ */ React.createElement("strong", null, safeStatus === "empty" ? "No chart data to preview" : safeStatus === "pending" ? "Preparing chart preview…" : "Preview needs attention"),
    messages.length > 0 ? /* @__PURE__ */ React.createElement("ul", null, messages.map((diagnostic, index) => /* @__PURE__ */ React.createElement(
      "li",
      {
        key: `${diagnostic.code ?? "diagnostic"}-${index}`,
        id: diagnostic.id,
        "data-responsible-field": diagnostic.fieldId ?? responsibleField(diagnostic)
      },
      boundedMessage(diagnostic.message)
    ))) : /* @__PURE__ */ React.createElement("p", null, "No renderer-ready marks are available for the selected roles and filters.")
  );
}
function buildPreviewDiagnostics(diagnostics, { namespace = "chart" } = {}) {
  const safeNamespace = safeId(namespace || "chart");
  if (!Array.isArray(diagnostics)) return [];
  return diagnostics.filter(isRecord).slice(0, MAX_DIAGNOSTICS).map((diagnostic, index) => {
    const fieldId = responsibleField(diagnostic);
    const code = typeof diagnostic.code === "string" && diagnostic.code
      ? diagnostic.code
      : "diagnostic";
    return {
      ...diagnostic,
      id: `chart-preview-${safeNamespace}-${safeId(fieldId)}-${safeId(code)}-${index}`,
      fieldId,
      message: boundedMessage(diagnostic.message)
    };
  });
}
function responsibleField(diagnostic) {
  if (typeof diagnostic.fieldId === "string") return diagnostic.fieldId;
  if (typeof diagnostic.role === "string") return diagnostic.role;
  if (typeof diagnostic.field === "string") return diagnostic.field;
  if (Array.isArray(diagnostic.path)) {
    const known = ["measurements", "measurement", "observation", "category", "value", "entity", "label", "filters", "duplicates", "map", "timeline", "target"];
    const match = diagnostic.path.find((part) => known.includes(part));
    if (match) return match;
  }
  if (/filter/i.test(diagnostic.code ?? "")) return "filters";
  if (/duplicate/i.test(diagnostic.code ?? "")) return "duplicates";
  if (/map|geograph/i.test(diagnostic.code ?? "")) return "map";
  return "data";
}
function safeId(value) {
  return typeof value === "string"
    ? value.replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase()
    : "unknown";
}
function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function boundedMessage(value) {
  const message = typeof value === "string" && value.trim() ? value.trim() : "The selected data cannot be rendered.";
  return message.length <= MAX_MESSAGE_LENGTH ? message : `${message.slice(0, MAX_MESSAGE_LENGTH - 1)}\u2026`;
}
export {
  ChartPreview as default,
  buildPreviewDiagnostics
};
