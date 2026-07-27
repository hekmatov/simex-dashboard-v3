import React from "react";
function StandardField({
  field,
  value = field?.value,
  onChange = noop,
  columns = []
} = {}) {
  if (!validField(field)) return null;
  const id = fieldControlId(field);
  const describedBy = fieldDescribedBy(field);
  const shared = {
    id,
    "aria-describedby": describedBy || void 0,
    "aria-invalid": field.error ? "true" : void 0
  };
  if (field.control === "filters") {
    return /* @__PURE__ */ React.createElement(
      GroupShell,
      { field, className: "chart-authoring-filters" },
      filterControls(value, columns, onChange)
    );
  }
  let control;
  switch (field.control) {
    case "textarea":
      control = /* @__PURE__ */ React.createElement("textarea", { ...shared, value: text(value), onChange: (event) => onChange(event.target.value) });
      break;
    case "select":
      control = /* @__PURE__ */ React.createElement("select", { ...shared, value: scalar(value), onChange: (event) => onChange(event.target.value) }, optionList(field.options).map((option) => /* @__PURE__ */ React.createElement("option", { key: option.value, value: option.value }, option.label)));
      break;
    case "toggle":
      control = /* @__PURE__ */ React.createElement("input", { ...shared, type: "checkbox", checked: value === true, onChange: (event) => onChange(event.target.checked) });
      break;
    case "grouping":
      control = /* @__PURE__ */ React.createElement(
        "select",
        {
          ...shared,
          multiple: true,
          value: Array.isArray(value) ? value : [],
          onChange: (event) => onChange(
            [...event.target.selectedOptions].map(({ value: optionValue }) => optionValue)
          )
        },
        columnOptions(columns).map((option) => /* @__PURE__ */ React.createElement("option", { key: option.value, value: option.value }, option.label))
      );
      break;
    case "duplicates":
      control = /* @__PURE__ */ React.createElement("select", { ...shared, value: scalar(value ?? "first"), onChange: (event) => onChange(event.target.value) }, optionList([
        ["error", "Flag as an error"],
        ["first", "Use first observation"],
        ["last", "Use last observation"],
        ["aggregate", "Aggregate observations"]
      ]).map((option) => /* @__PURE__ */ React.createElement("option", { key: option.value, value: option.value }, option.label)));
      break;
    case "labels":
      control = objectToggle(id, describedBy, value, "show", "Show chart labels", onChange);
      break;
    case "axes":
      control = objectText(id, describedBy, value, "primaryLabel", "Primary axis label", onChange);
      break;
    case "targets":
      control = objectText(id, describedBy, value, "label", "Target label", onChange);
      break;
    case "map":
      control = objectText(id, describedBy, value, "featureKey", "Map feature key", onChange);
      break;
    case "timeline":
      control = objectToggle(id, describedBy, value, "showLabels", "Show event labels", onChange);
      break;
    case "accessibility":
      control = objectText(id, describedBy, value, "description", "Accessible description", onChange);
      break;
    default:
      control = /* @__PURE__ */ React.createElement(
        "input",
        {
          ...shared,
          type: field.control === "number" ? "number" : "text",
          required: field.required === true,
          value: field.control === "number" ? numeric(value) : text(value),
          onChange: (event) => onChange(
            field.control === "number" ? Number(event.target.value) : event.target.value
          )
        }
      );
  }
  return /* @__PURE__ */ React.createElement(FieldShell, { field }, control);
}
function FieldShell({ field, children, className = "" }) {
  if (!validField(field)) return null;
  const id = fieldControlId(field);
  return /* @__PURE__ */ React.createElement("div", { className: `chart-authoring-field ${className}`.trim(), "data-field-id": field.id }, /* @__PURE__ */ React.createElement("label", { htmlFor: id }, field.label, field.required ? /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, " *") : null), field.detected ? /* @__PURE__ */ React.createElement("small", { className: "chart-authoring-detected" }, "Detected: ", detectedLabel(field)) : null, children, field.help ? /* @__PURE__ */ React.createElement("small", { id: `${id}-help` }, field.help) : null, field.error ? /* @__PURE__ */ React.createElement("small", { id: `${id}-error`, role: "alert" }, field.error) : null);
}
function GroupShell({ field, children, className = "" }) {
  if (!validField(field)) return null;
  const id = fieldControlId(field);
  return /* @__PURE__ */ React.createElement(
    "fieldset",
    {
      className: `chart-authoring-field ${className}`.trim(),
      "data-field-id": field.id,
      "aria-describedby": fieldDescribedBy(field) || void 0
    },
    /* @__PURE__ */ React.createElement(
      "legend",
      null,
      field.label,
      field.required ? /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, " *") : null
    ),
    field.detected ? /* @__PURE__ */ React.createElement("small", { className: "chart-authoring-detected" }, "Detected: ", detectedLabel(field)) : null,
    children,
    field.help ? /* @__PURE__ */ React.createElement("small", { id: `${id}-help` }, field.help) : null,
    field.error ? /* @__PURE__ */ React.createElement("small", { id: `${id}-error`, role: "alert" }, field.error) : null
  );
}
function filterControls(value, columns, onChange) {
  const filters = Array.isArray(value) ? value.filter(record) : [];
  const options = columnOptions(columns);
  const replace = (index, filter) => onChange(
    filters.map((current, itemIndex) => itemIndex === index ? filter : current)
  );
  return /* @__PURE__ */ React.createElement(
    "div",
    { className: "chart-authoring-filter-list" },
    filters.map((filter, index) => /* @__PURE__ */ React.createElement(
      "div",
      { className: "chart-authoring-filter-row", key: `${filter.field ?? "filter"}-${index}` },
      /* @__PURE__ */ React.createElement(
        "label",
        null,
        "Filter column",
        /* @__PURE__ */ React.createElement(
          "select",
          {
            value: typeof filter.field === "string" ? filter.field : "",
            onChange: (event) => replace(index, { ...filter, field: event.target.value })
          },
          /* @__PURE__ */ React.createElement("option", { value: "" }, "Select a column"),
          options.map((option) => /* @__PURE__ */ React.createElement("option", { key: option.value, value: option.value }, option.label))
        )
      ),
      /* @__PURE__ */ React.createElement(
        "label",
        null,
        "Condition",
        /* @__PURE__ */ React.createElement(
          "select",
          {
            value: typeof filter.operator === "string" ? filter.operator : "equals",
            onChange: (event) => replace(index, { ...filter, operator: event.target.value })
          },
          [
            ["equals", "Equals"],
            ["notEquals", "Does not equal"],
            ["contains", "Contains"],
            ["in", "Is one of"],
            ["notIn", "Is not one of"],
            ["range", "Is within range"]
          ].map(([operator, label]) => /* @__PURE__ */ React.createElement("option", { key: operator, value: operator }, label))
        )
      ),
      /* @__PURE__ */ React.createElement(
        "label",
        null,
        "Value",
        /* @__PURE__ */ React.createElement("input", {
          value: typeof filter.value === "string" || typeof filter.value === "number" ? filter.value : "",
          onChange: (event) => replace(index, { ...filter, value: event.target.value })
        })
      ),
      /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          className: "secondary",
          onClick: () => onChange(filters.filter((_, itemIndex) => itemIndex !== index))
        },
        "Remove"
      )
    )),
    /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        className: "secondary",
        disabled: options.length === 0,
        onClick: () => onChange([
          ...filters,
          { field: options[0]?.value ?? "", operator: "equals", value: "" }
        ])
      },
      "Add filter"
    )
  );
}
function fieldControlId(field) {
  return `chart-field-${safeId(field?.id)}`;
}
function fieldDescribedBy(field) {
  const id = fieldControlId(field);
  return [
    field?.help ? `${id}-help` : null,
    field?.error ? `${id}-error` : null
  ].filter(Boolean).join(" ");
}
function objectToggle(id, describedBy, value, key, label, onChange) {
  const current = record(value);
  return /* @__PURE__ */ React.createElement("label", { className: "chart-authoring-inline-toggle" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      id,
      type: "checkbox",
      checked: current[key] === true,
      "aria-describedby": describedBy || void 0,
      onChange: (event) => onChange({ ...current, [key]: event.target.checked })
    }
  ), label);
}
function objectText(id, describedBy, value, key, placeholder, onChange) {
  const current = record(value);
  return /* @__PURE__ */ React.createElement(
    "input",
    {
      id,
      value: text(current[key]),
      placeholder,
      "aria-describedby": describedBy || void 0,
      onChange: (event) => onChange({ ...current, [key]: event.target.value })
    }
  );
}
function validField(field) {
  return field !== null && typeof field === "object" && typeof field.id === "string" && field.id.trim() !== "" && typeof field.label === "string" && field.label.trim() !== "";
}
function optionList(options) {
  if (!Array.isArray(options)) return [];
  return options.flatMap((option) => {
    if (Array.isArray(option) && option.length >= 2) {
      return [{ value: String(option[0]), label: String(option[1]) }];
    }
    if (option && typeof option === "object" && typeof option.value === "string" && typeof option.label === "string") {
      return [option];
    }
    return [];
  });
}
function columnOptions(columns) {
  return Array.isArray(columns) ? columns.flatMap((column) => typeof column?.name === "string" ? [{ value: column.name, label: column.name }] : []) : [];
}
function detectedLabel(field) {
  const option = optionList(field.options).find(({ value }) => value === field.detected);
  return option?.label ?? text(field.detected);
}
function safeId(value) {
  return typeof value === "string" ? value.replace(/[^a-zA-Z0-9_-]/g, "-") : "unknown";
}
function record(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function scalar(value) {
  return ["string", "number"].includes(typeof value) ? String(value) : "";
}
function text(value) {
  return typeof value === "string" ? value : "";
}
function numeric(value) {
  return Number.isFinite(value) ? value : "";
}
function noop() {
}
export {
  FieldShell,
  GroupShell,
  StandardField as default,
  fieldControlId,
  fieldDescribedBy
};
