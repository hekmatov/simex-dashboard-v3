import React from "react";
import SourceCsvViewerButton from "../source-data/SourceCsvViewerButton.jsx";
import { IconControl } from "../common/SimExIcon.js";
import DataSourcePicker from "../source-content/DataSourcePicker.jsx";

export default function DataSourceStep({
  dashboard = {},
  dataSources = {},
  loadedData = {},
  selectedSourceId = "",
  selectedSource = null,
  selectedSourceKind = "",
  profile = null,
  allowSourceCreation = true,
  manualAllowed = false,
  manualTable = null,
  manualErrors = [],
  uploadError = "",
  geoUploadError = "",
  geographyRequired = false,
  geoSources = [],
  selectedGeoSourceId = "",
  prerequisites = [],
  onSelectExisting = noop,
  onUploadCsv = noop,
  onUploadGeoJson = noop,
  onSelectManual = noop,
  onManualTableChange = noop,
  onGeoSourceChange = noop,
  onRequestClear = noop,
  existingCharts = [],
  onCopyChart = noop,
} = {}) {
  const warnings = profileWarnings(profile);
  return React.createElement(
    "section",
    {
      className: "chart-wizard-step chart-wizard-data-source",
      "aria-labelledby": "chart-wizard-data-source-heading",
    },
    React.createElement("h3", { id: "chart-wizard-data-source-heading" }, "Select data source"),
    React.createElement(PrerequisiteNotice, { messages: prerequisites }),
    React.createElement(
      React.Fragment,
      null,
      React.createElement(DataSourcePicker, {
        dashboard: {
          ...dashboard,
          dataSources: dashboard.dataSources ?? dataSources,
        },
        loadedData,
        selectedSourceId: selectedSourceKind === "existing" ? selectedSourceId : "",
        allowUpload: allowSourceCreation,
        uploadError,
        onSelect: onSelectExisting,
        onUpload: onUploadCsv,
      }),
      existingCharts.length > 0 ? React.createElement(
        "section",
        { className: "wizard-choice-card" },
        React.createElement("h4", null, "Copy from another chart"),
        React.createElement("label", null, "Chart to copy", React.createElement("select", {
          defaultValue: "",
          onChange: (event) => event.target.value && onCopyChart(event.target.value),
        }, React.createElement("option", { value: "" }, "Choose a chart"), existingCharts.map((chart) => React.createElement("option", { key: chart.id, value: chart.id }, `${chart.title || chart.id} (${chart.typeId})`)))),
      ) : null,
      allowSourceCreation && manualAllowed
        ? React.createElement(
            "section",
            { className: "wizard-choice-card chart-wizard-manual-source" },
            React.createElement("h4", null, "Enter data manually"),
            React.createElement(
              "p",
              null,
              "Best for a concise chart with a small number of values.",
            ),
            manualTable
              ? React.createElement(ManualDataTable, {
                  table: manualTable,
                  errors: manualErrors,
                  onChange: onManualTableChange,
                })
              : React.createElement(IconControl, {
                  interactionId: "wizard.enter-data-manually",
                  className: "secondary",
                  onClick: onSelectManual,
                }),
          )
        : null,
    ),
    geographyRequired
      ? React.createElement(
          "section",
          {
            className: "wizard-choice-card chart-wizard-geography-source",
            "data-field-id": "geoSource",
          },
          React.createElement("h4", null, "Map geography"),
          React.createElement(
            "label",
            null,
            "GeoJSON source",
            React.createElement(
              "select",
              {
                value: selectedGeoSourceId,
                required: true,
                "aria-describedby": "chart-wizard-geo-source-help",
                onChange: (event) => onGeoSourceChange(event.target.value),
              },
              React.createElement(
                "option",
                { value: "" },
                "Choose a GeoJSON source",
              ),
              normalizedGeoSources(geoSources).map(({ value, label }) => (
                React.createElement(
                  "option",
                  { key: value, value },
                  label,
                )
              )),
            ),
          ),
          React.createElement(
            "p",
            { id: "chart-wizard-geo-source-help" },
            "Choose the validated boundary or point file used to locate the selected geographic identifiers.",
          ),
          allowSourceCreation
            ? React.createElement(
                React.Fragment,
                null,
                React.createElement(
                  "label",
                  null,
                  "Upload GeoJSON",
                  React.createElement("input", {
                    type: "file",
                    accept: ".geojson,application/geo+json,application/json",
                    onChange: (event) => onUploadGeoJson(event.target.files?.[0] ?? null),
                  }),
                ),
                geoUploadError
                  ? React.createElement("p", { className: "wizard-error", role: "alert" }, geoUploadError)
                  : null,
              )
            : null,
        )
      : null,
    selectedSourceId
      ? React.createElement(
          "section",
          { className: "wizard-source-profile", "aria-label": "Selected source profile" },
          React.createElement(
            "div",
            { className: "wizard-source-profile-heading" },
            React.createElement(
              "div",
              null,
              React.createElement("h4", null, "Detected columns"),
              React.createElement(
                "p",
                null,
                `${profile?.rowCount ?? 0} rows · ${profile?.columns?.length ?? 0} columns`,
              ),
            ),
            React.createElement(
              "div",
              { className: "wizard-source-profile-actions" },
              React.createElement(SourceCsvViewerButton, {
                sourceId: selectedSourceId,
                source: selectedSource,
                interactionId: "wizard.view-source-csv",
              }),
              React.createElement(IconControl, {
                interactionId: "wizard.remove-data-source",
                ariaLabel: "Reset selection",
                tooltip: "Reset selection",
                className: "secondary",
                onClick: onRequestClear,
              }),
            ),
          ),
          React.createElement(ProfileTable, { profile }),
          warnings.length > 0
            ? React.createElement(
                "div",
                { className: "wizard-source-warnings", role: "status" },
                React.createElement("h5", null, "Warnings"),
                React.createElement(
                  "ul",
                  null,
                  warnings.map((warning, index) => React.createElement(
                    "li",
                    { key: `${warning.column}-${warning.code}-${index}` },
                    `${warning.column}: ${warning.message}`,
                  )),
                ),
              )
            : null,
        )
      : null,
  );
}

function ManualDataTable({ table, errors, onChange }) {
  const columns = Array.isArray(table?.columns) ? table.columns : [];
  const rows = Array.isArray(table?.rows) ? table.rows : [];
  const maxRows = Number.isInteger(table?.maxRows) ? table.maxRows : 50;
  const updateCell = (rowIndex, fieldId, value) => {
    const nextRows = rows.map((row, index) => (
      index === rowIndex ? { ...row, [fieldId]: value } : { ...row }
    ));
    onChange({ ...table, rows: nextRows });
  };
  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      "div",
      { className: "chart-wizard-manual-table-wrap" },
      React.createElement(
        "table",
        { className: "chart-wizard-manual-table" },
        React.createElement(
          "thead",
          null,
          React.createElement(
            "tr",
            null,
            columns.map((column) => React.createElement(
              "th",
              { key: column.fieldId, scope: "col" },
              column.header,
            )),
            React.createElement("th", { scope: "col" }, "Actions"),
          ),
        ),
        React.createElement(
          "tbody",
          null,
          rows.map((row, rowIndex) => React.createElement(
            "tr",
            { key: rowIndex },
            columns.map((column) => React.createElement(
              "td",
              { key: column.fieldId },
              React.createElement("input", {
                "aria-label": `${column.header} row ${rowIndex + 1}`,
                value: scalar(row?.[column.fieldId]),
                onChange: (event) => updateCell(
                  rowIndex,
                  column.fieldId,
                  event.target.value,
                ),
              }),
            )),
            React.createElement(
              "td",
              null,
              React.createElement(IconControl, {
                interactionId: "wizard.remove-row",
                ariaLabel: `Remove row ${rowIndex + 1}`,
                tooltip: `Remove row ${rowIndex + 1}`,
                className: "secondary",
                disabled: rows.length <= 1,
                onClick: () => onChange({
                  ...table,
                  rows: rows
                    .filter((_, index) => index !== rowIndex)
                    .map((current) => ({ ...current })),
                }),
              }),
            ),
          )),
        ),
      ),
    ),
    React.createElement(IconControl, {
      interactionId: "wizard.add-row",
      className: "secondary",
      disabled: rows.length >= maxRows,
      onClick: () => onChange({
        ...table,
        rows: [
          ...rows.map((row) => ({ ...row })),
          Object.fromEntries(columns.map(({ fieldId }) => [fieldId, ""])),
        ],
      }),
    }),
    Array.isArray(errors) && errors.length > 0
      ? React.createElement(
          "ul",
          { className: "wizard-error-list", role: "alert" },
          errors.map((error, index) => React.createElement(
            "li",
            { key: index },
            error,
          )),
        )
      : null,
  );
}

function ProfileTable({ profile }) {
  const columns = Array.isArray(profile?.columns) ? profile.columns : [];
  if (columns.length === 0) {
    return React.createElement(
      "p",
      { className: "chart-authoring-empty" },
      "No columns were detected.",
    );
  }
  return React.createElement(
    "div",
    { className: "wizard-source-profile-table-wrap" },
    React.createElement(
      "table",
      { className: "wizard-source-profile-table" },
      React.createElement(
        "thead",
        null,
        React.createElement(
          "tr",
          null,
          React.createElement("th", { scope: "col" }, "Column"),
          React.createElement("th", { scope: "col" }, "Detected type"),
          React.createElement("th", { scope: "col" }, "Examples"),
        ),
      ),
      React.createElement(
        "tbody",
        null,
        columns.map((column) => React.createElement(
          "tr",
          { key: column.name },
          React.createElement("th", { scope: "row" }, column.name),
          React.createElement("td", null, typeLabel(column.type)),
          React.createElement(
            "td",
            null,
            Array.isArray(column.examples) && column.examples.length > 0
              ? column.examples.map(displayScalar).join(", ")
              : "No examples",
          ),
        )),
      ),
    ),
  );
}

function PrerequisiteNotice({ messages }) {
  const items = Array.isArray(messages)
    ? messages.filter((value) => typeof value === "string" && value)
    : [];
  if (items.length === 0) return null;
  return React.createElement(
    "div",
    { className: "chart-wizard-prerequisites", role: "status" },
    React.createElement("strong", null, "Before this step"),
    React.createElement(
      "ul",
      null,
      items.map((item) => React.createElement("li", { key: item }, item)),
    ),
  );
}

function profileWarnings(profile) {
  if (!Array.isArray(profile?.columns)) return [];
  return profile.columns.flatMap((column) => (
    Array.isArray(column?.temporal?.diagnostics)
      ? column.temporal.diagnostics.map((diagnostic) => ({
          column: column.name,
          code: diagnostic?.code ?? "warning",
          message: diagnosticMessage(diagnostic),
        }))
      : []
  ));
}

function normalizedGeoSources(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((option) => (
    option
    && typeof option.value === "string"
    && option.value.trim() !== ""
    && typeof option.label === "string"
    && option.label.trim() !== ""
  ));
}

function diagnosticMessage(diagnostic) {
  if (typeof diagnostic?.message === "string" && diagnostic.message.trim()) {
    return diagnostic.message.trim();
  }
  if (diagnostic?.code === "ambiguous-date-format") {
    return "Date values need an explicit interpretation or format.";
  }
  return "Review the detected values before assigning this column.";
}

function typeLabel(type) {
  return {
    numeric: "Number",
    number: "Number",
    temporal: "Date or time",
    category: "Category",
    geographic: "Geography",
    boolean: "True / false",
  }[type] ?? "Other";
}

function displayScalar(value) {
  if (value === null) return "null";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "value";
}

function scalar(value) {
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "";
}

function readEntry(collection, key) {
  if (collection instanceof Map) return collection.get(key);
  return isRecord(collection) ? collection[key] : undefined;
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function noop() {}
