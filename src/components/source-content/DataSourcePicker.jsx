import React from "react";
import {
  listManageableSourceEntries,
  resolveSourceEntryLabels,
} from "../../content-library/sourceEntrySchema.js";
import AccessibleListboxSelect from "../common/AccessibleListboxSelect.jsx";

export default function DataSourcePicker({
  dashboard = {},
  loadedData = {},
  selectedSourceId = "",
  disabled = false,
  uploadError = "",
  onSelect = noop,
  onUpload = noop,
} = {}) {
  const options = resolveSourceEntryLabels(
    listManageableSourceEntries(
      dashboard.contentLibrary ?? {},
      dashboard.dataSources ?? {},
    ),
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
      React.createElement(AccessibleListboxSelect, {
        label: "Managed data source",
        value: options.some(({ sourceId }) => sourceId === selectedSourceId) ? selectedSourceId : "",
        options,
        getLabel: ({ label }) => label,
        getValue: ({ sourceId }) => sourceId,
        placeholder: "Choose a source",
        width: "24rem",
        disabled,
        onChange: onSelect,
      }),
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
