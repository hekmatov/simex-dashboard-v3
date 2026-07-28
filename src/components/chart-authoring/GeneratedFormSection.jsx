import React from "react";
import { buildPreviewDiagnostics } from "./ChartPreview.jsx";
import SchemaField from "./SchemaField.jsx";
function GeneratedFormSection({
  section,
  onChange = noop,
  diagnostics = [],
  diagnosticNamespace = "chart",
  ...context
} = {}) {
  if (!section || typeof section !== "object" || typeof section.id !== "string" || typeof section.label !== "string") {
    return null;
  }
  const fields = Array.isArray(section.fields) ? section.fields.filter(validField) : [];
  const previewDiagnostics = buildPreviewDiagnostics(diagnostics, {
    namespace: diagnosticNamespace
  });
  const content = /* @__PURE__ */ React.createElement("div", { className: "chart-authoring-section-fields" }, fields.map((field) => /* @__PURE__ */ React.createElement(
    SchemaField,
    {
      key: field.id,
      field,
      value: field.value,
      onChange,
      diagnostics: previewDiagnostics.filter((diagnostic) => diagnosticAppliesToField(diagnostic, field)),
      ...context
    }
  )));
  if (section.advanced) {
    return /* @__PURE__ */ React.createElement("details", { className: "chart-authoring-section chart-authoring-section-advanced" }, /* @__PURE__ */ React.createElement("summary", null, section.label), content);
  }
  return /* @__PURE__ */ React.createElement(
    "section",
    {
      className: "chart-authoring-section",
      "aria-labelledby": `chart-form-section-${safeId(section.id)}`
    },
    /* @__PURE__ */ React.createElement("h3", { id: `chart-form-section-${safeId(section.id)}` }, section.label),
    content
  );
}
function diagnosticAppliesToField(diagnostic, field) {
  if (diagnostic?.fieldId === field.id) return true;
  return Array.isArray(diagnostic?.path) && diagnostic.path.includes(field.id);
}
function validField(field) {
  return field !== null && typeof field === "object" && typeof field.id === "string" && field.id.trim() !== "" && typeof field.label === "string" && field.label.trim() !== "";
}
function safeId(value) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-");
}
function noop() {
}
export {
  GeneratedFormSection as default
};
