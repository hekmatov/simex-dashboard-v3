import React from "react";
import { IconControl } from "../common/SimExIcon.js";
import {
  FieldShell,
  GroupShell,
  fieldControlId,
  fieldDescribedBy,
  fieldHasError
} from "./StandardField.jsx";
function RoleField({
  field,
  value = field?.value,
  onChange = noop,
  columns = []
} = {}) {
  if (!field || typeof field !== "object") return null;
  const options = acceptedColumns(columns, field.accepts);
  const persistedBindings = bindingList(value, field.multiple === true);
  const seedBlankRow = field.seedBlankRow === true && persistedBindings.length === 0;
  const bindings = seedBlankRow ? [{}] : persistedBindings;
  const id = fieldControlId(field);
  const describedBy = fieldDescribedBy(field);
  if (!field.multiple) {
    const binding = bindings[0] ?? null;
    return /* @__PURE__ */ React.createElement(FieldShell, { field }, /* @__PURE__ */ React.createElement(
      "select",
      {
        id,
        value: binding?.field ?? "",
        required: field.required === true,
        "aria-describedby": describedBy || void 0,
        "aria-invalid": fieldHasError(field) ? "true" : void 0,
        onChange: (event) => onChange(
          event.target.value ? { ...binding ?? {}, field: event.target.value } : null
        )
      },
      /* @__PURE__ */ React.createElement("option", { value: "" }, "Select a column"),
      options.map((column) => /* @__PURE__ */ React.createElement("option", { key: column.name, value: column.name }, column.name, " (", typeLabel(column.type), ")"))
    ));
  }
  const canAdd = !seedBlankRow
    && (field.max === null || !Number.isFinite(field.max) || bindings.length < field.max);
  return /* @__PURE__ */ React.createElement(GroupShell, { field, className: "chart-authoring-role-list" }, /* @__PURE__ */ React.createElement("div", { id }, bindings.map((binding, index) => /* @__PURE__ */ React.createElement("div", { className: "chart-authoring-role-row", key: `${binding.field ?? "binding"}-${index}` }, /* @__PURE__ */ React.createElement("label", null, "Column", /* @__PURE__ */ React.createElement(
    "select",
    {
      value: binding.field ?? "",
      onChange: (event) => {
        const fieldName = event.target.value;
        if (seedBlankRow) {
          if (!options.some(({ name }) => name === fieldName)) return;
          onChange([{
            field: fieldName,
            ...Array.isArray(field.axisOptions)
              ? { axis: field.axisOptions[0] }
              : {},
          }]);
          return;
        }
        onChange(replaceBinding(
          bindings,
          index,
          { ...binding, field: fieldName }
        ));
      }
    },
    /* @__PURE__ */ React.createElement("option", { value: "" }, "Select a column"),
    options.map((column) => /* @__PURE__ */ React.createElement("option", { key: column.name, value: column.name }, column.name, " (", typeLabel(column.type), ")"))
  )), Array.isArray(field.axisOptions) ? /* @__PURE__ */ React.createElement("label", null, "Axis", /* @__PURE__ */ React.createElement(
    "select",
    {
      value: binding.axis ?? field.axisOptions[0],
      disabled: seedBlankRow,
      onChange: (event) => onChange(replaceBinding(
        bindings,
        index,
        { ...binding, axis: event.target.value }
      ))
    },
    field.axisOptions.map((axis) => /* @__PURE__ */ React.createElement("option", { key: axis, value: axis }, sentence(axis)))
  )) : null, /* @__PURE__ */ React.createElement(IconControl, {
    interactionId: "editor.remove-measurement",
    className: "secondary",
    ariaLabel: `Remove ${field.label} ${index + 1}`,
    tooltip: `Remove ${singular(field.label).toLocaleLowerCase()} ${index + 1}`,
    disabled: bindings.length <= (field.min ?? 0),
    onClick: () => onChange(bindings.filter((_, itemIndex) => itemIndex !== index))
  }))), canAdd ? /* @__PURE__ */ React.createElement(IconControl, {
    interactionId: "editor.add-measurement",
    className: "secondary",
    ariaLabel: `Add ${singular(field.label).toLocaleLowerCase()}`,
    tooltip: `Add ${singular(field.label).toLocaleLowerCase()}`,
    onClick: () => onChange([
        ...bindings,
        {
          field: firstUnused(options, bindings),
          ...Array.isArray(field.axisOptions) ? { axis: field.axisOptions[0] } : {}
        }
      ])
  }) : null));
}
function bindingList(value, multiple) {
  if (multiple) return Array.isArray(value) ? value.filter(isRecord) : [];
  return isRecord(value) ? [value] : [];
}
function replaceBinding(bindings, index, value) {
  return bindings.map((binding, itemIndex) => itemIndex === index ? value : binding);
}
function acceptedColumns(columns, accepts) {
  if (!Array.isArray(columns)) return [];
  const allowed = new Set(Array.isArray(accepts) ? accepts : ["any"]);
  return columns.filter((column) => typeof column?.name === "string" && (allowed.has("any") || allowed.has(canonicalType(column.type))));
}
function canonicalType(type) {
  if (type === "numeric") return "number";
  return typeof type === "string" ? type : "any";
}
function typeLabel(type) {
  const canonical = canonicalType(type);
  return {
    number: "number",
    temporal: "date or time",
    category: "category",
    geographic: "geography"
  }[canonical] ?? canonical;
}
function firstUnused(options, bindings) {
  const used = new Set(bindings.map(({ field }) => field));
  return options.find(({ name }) => !used.has(name))?.name ?? "";
}
function singular(label) {
  return typeof label === "string" && label.endsWith("s") ? label.slice(0, -1) : label || "item";
}
function sentence(value) {
  return typeof value === "string" && value ? value[0].toUpperCase() + value.slice(1) : "";
}
function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function noop() {
}
export {
  RoleField as default
};
