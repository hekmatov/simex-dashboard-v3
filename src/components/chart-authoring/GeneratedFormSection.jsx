import React from "react";
import { buildPreviewDiagnostics } from "./ChartPreview.jsx";
import SchemaField from "./SchemaField.jsx";
import { updateStructuredFieldValue } from "./StandardField.jsx";
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
  if (section.groups?.length) {
    return React.createElement(React.Fragment, null, section.groups.map(group => React.createElement(GeneratedFormSection, {
      key: group.id, section: { ...group, fields: fields.filter(field => group.fieldIds.includes(field.id)).sort((a, b) => group.fieldIds.indexOf(a.id) - group.fieldIds.indexOf(b.id)) },
      onChange, diagnostics, diagnosticNamespace, ...context,
    })));
  }
  const labelsField = section.id === "labels" ? fields.find(field => field.control === "labels" && field.controls?.includes("visible")) : null;
  const previewDiagnostics = buildPreviewDiagnostics(diagnostics, {
    namespace: diagnosticNamespace
  });
  const content = /* @__PURE__ */ React.createElement("div", { className: "chart-authoring-section-fields dashboard-authoring-grid" }, compactFieldItems(fields).map(({ field, visibilityField }) => {
    const renderedField = {
      ...field,
      ...(duplicateStructuredTitle(section, field) ? { suppressLegend: true } : {}),
      ...(visibilityField ? { compactLabel: true } : {}),
      ...(field === labelsField ? { controls: field.controls.filter(control => control !== "visible") } : {}),
    };
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        key: field.id,
        className: `dashboard-authoring-field-slot${wideField(field) || visibilityField ? " dashboard-authoring-field--wide" : ""}${visibilityField ? " dashboard-authoring-field--compound" : ""}`,
        "data-field-slot": field.id,
      },
      visibilityField
        ? React.createElement(SchemaField, {
            field: visibilityField,
            value: visibilityField.value,
            onChange,
            diagnostics: previewDiagnostics.filter((diagnostic) => diagnosticAppliesToField(diagnostic, visibilityField)),
            ...context
          })
        : null,
      React.createElement(SchemaField, {
        field: renderedField,
        value: field.value,
        onChange,
        diagnostics: previewDiagnostics.filter((diagnostic) => diagnosticAppliesToField(diagnostic, field)),
        ...context
      })
    );
  }));
  if (section.advanced) {
    return /* @__PURE__ */ React.createElement("details", { className: "chart-authoring-section chart-authoring-section-advanced" }, /* @__PURE__ */ React.createElement("summary", null, section.label), content);
  }
  return /* @__PURE__ */ React.createElement(
    "section",
    {
      className: "chart-authoring-section",
      "aria-labelledby": `chart-form-section-${safeId(section.id)}`
    },
    React.createElement("div", { className: "chart-authoring-section-heading" },
      React.createElement("h3", {
        id: `chart-form-section-${safeId(section.id)}`,
        className: section.headingVisible === false ? "visually-hidden" : undefined,
      }, section.label),
      labelsField ? React.createElement("label", { className: "chart-authoring-inline-toggle dashboard-authoring-boolean-row" },
        React.createElement("input", { type: "checkbox", checked: labelsField.value?.visible === true,
          onChange: event => onChange(labelsField.path, updateStructuredFieldValue("labels", labelsField.value, ["visible"], event.target.checked)) }), "Show labels") : null,
    ),
    content
  );
}
function diagnosticAppliesToField(diagnostic, field) {
  if (diagnostic?.fieldId === field.id) return true;
  return Array.isArray(diagnostic?.path) && diagnostic.path.includes(field.id);
}
const VISIBILITY_PAIRS = new Map([
  ["title", "titleVisible"],
  ["description", "descriptionVisible"],
]);
function compactFieldItems(fields) {
  const byId = new Map(fields.map((field) => [field.id, field]));
  return fields.flatMap((field) => {
    if (VISIBILITY_PAIRS.has(field.id)) {
      return [{ field: { ...field, compactLabel: byId.has(VISIBILITY_PAIRS.get(field.id)) }, visibilityField: byId.get(VISIBILITY_PAIRS.get(field.id)) ?? null }];
    }
    if ([...VISIBILITY_PAIRS.values()].includes(field.id)) return [];
    return [{ field, visibilityField: null }];
  });
}
function validField(field) {
  return field !== null && typeof field === "object" && typeof field.id === "string" && field.id.trim() !== "" && typeof field.label === "string" && field.label.trim() !== "";
}
const WIDE_CONTROLS = new Set([
  "textarea", "filters", "labels", "axes", "targets", "map", "timeline",
  "role", "palette", "color", "referenceLine", "citation", "collection", "timeSync",
  "deltaComparison", "quickBackground",
  "presentationOrder", "legendEntries", "categoryColors", "seriesColorsByIdentity",
]);
const DUPLICATE_SAFE_STRUCTURED_CONTROLS = new Set([
  "labels", "axes", "targets", "map", "timeline",
]);
function wideField(field) {
  return WIDE_CONTROLS.has(field.control);
}
function duplicateStructuredTitle(section, field) {
  return DUPLICATE_SAFE_STRUCTURED_CONTROLS.has(field.control)
    && section.label.trim() === field.label.trim();
}
function safeId(value) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-");
}
function noop() {
}
export {
  GeneratedFormSection as default
};
