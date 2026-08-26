import React from "react";
import { listManageableSourceEntries } from "../../content-library/sourceEntrySchema.js";

export default function DataSourcePicker({
  dashboard = {},
  loadedData = {},
  selectedSourceId = "",
  disabled = false,
  uploadError = "",
  onSelect = noop,
  onUpload = noop,
} = {}) {
  const options = listManageableSourceEntries(
    dashboard.contentLibrary ?? {},
    dashboard.dataSources ?? {},
  ).filter(({ kind, sourceId }) => (
    kind === "csv" && Array.isArray(readEntry(loadedData, sourceId))
  ));

  return React.createElement(
    "div",
    { className: "chart-wizard-source-grid", "data-draft-owner": "chart" },
    React.createElement(
      "section",
      { className: "wizard-choice-card" },
      React.createElement("h4", null, "Use an existing CSV"),
      React.createElement(
        "label",
        null,
        "Managed data source",
        React.createElement(
          "select",
          {
            value: options.some(({ sourceId }) => sourceId === selectedSourceId) ? selectedSourceId : "",
            disabled,
            onChange: (event) => onSelect(event.target.value),
          },
          React.createElement("option", { value: "" }, "Choose a source"),
          options.map(({ sourceId, displayName }) => React.createElement(
            "option",
            { key: sourceId, value: sourceId },
            displayName,
          )),
        ),
      ),
    ),
    React.createElement(
      "section",
      { className: "wizard-choice-card" },
      React.createElement("h4", null, "Upload a new CSV"),
      React.createElement("p", null, "The CSV remains a chart draft until the completed chart is created."),
      React.createElement(
        "label",
        null,
        "CSV file",
        React.createElement("input", {
          type: "file",
          accept: ".csv,text/csv",
          disabled,
          onChange: (event) => onUpload(event.target.files?.[0] ?? null),
        }),
      ),
      uploadError
        ? React.createElement("p", { className: "wizard-error", role: "alert" }, uploadError)
        : null,
    ),
  );
}

function readEntry(collection, key) {
  if (collection instanceof Map) return collection.get(key);
  return collection && typeof collection === "object" ? collection[key] : undefined;
}

function noop() {}
