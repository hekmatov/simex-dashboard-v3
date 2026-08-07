import React from "react";
import ColorField from "../ColorField.jsx";

const DEFAULT_REFERENCE_LINE = Object.freeze({
  visible: true,
  value: 0,
  label: "",
  color: "#E56B2F",
  lineStyle: "dashed",
});

export default function ReferenceLineField({
  field,
  value,
  onChange = noop,
} = {}) {
  const current = normalizeValue(value);
  const enabled = current.visible === true;
  const update = (property, nextValue) => onChange({
    ...current,
    [property]: nextValue,
  });

  return React.createElement(
    "fieldset",
    {
      className: "chart-authoring-field chart-authoring-reference-line",
      "data-field-id": field?.id,
    },
    React.createElement("legend", null, field?.label ?? "Reference line"),
    React.createElement(
      "label",
      { className: "chart-authoring-inline-toggle" },
      React.createElement("input", {
        type: "checkbox",
        checked: enabled,
        onChange: (event) => onChange({
          ...current,
          visible: event.target.checked,
        }),
      }),
      "Show reference line",
    ),
    enabled
      ? React.createElement(
          "div",
          { className: "chart-authoring-reference-line-grid" },
          React.createElement(
            "label",
            null,
            "Value",
            React.createElement("input", {
              type: "number",
              step: "any",
              value: Number.isFinite(current.value) ? current.value : "",
              onChange: (event) => update(
                "value",
                event.target.value === "" ? undefined : Number(event.target.value),
              ),
            }),
          ),
          React.createElement(
            "label",
            null,
            "Label",
            React.createElement("input", {
              type: "text",
              value: current.label,
              placeholder: "Optional label",
              onChange: (event) => update("label", event.target.value),
            }),
          ),
          React.createElement(
            "label",
            null,
            "Line style",
            React.createElement(
              "select",
              {
                value: current.lineStyle,
                onChange: (event) => update("lineStyle", event.target.value),
              },
              React.createElement("option", { value: "dashed" }, "Dashed"),
              React.createElement("option", { value: "solid" }, "Solid"),
              React.createElement("option", { value: "dotted" }, "Dotted"),
            ),
          ),
          React.createElement(ColorField, {
            id: "chart-reference-line-color",
            label: "Line color",
            value: current.color,
            onChange: (color) => update("color", color),
            dataColorField: "referenceLine",
          }),
        )
      : null,
  );
}

function normalizeValue(value) {
  const source = value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
  return {
    ...DEFAULT_REFERENCE_LINE,
    ...source,
    label: typeof source.label === "string" ? source.label : "",
    color: validColor(source.color) ? source.color.toUpperCase() : DEFAULT_REFERENCE_LINE.color,
    lineStyle: ["solid", "dashed", "dotted"].includes(source.lineStyle)
      ? source.lineStyle
      : DEFAULT_REFERENCE_LINE.lineStyle,
  };
}

function validColor(value) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

function noop() {}
