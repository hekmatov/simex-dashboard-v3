import React from "react";

import ColorField from "../ColorField.jsx";
import { fieldControlId, fieldDescribedBy } from "./StandardField.jsx";

const CUSTOM_BACKGROUND = "#FFFFFF";

export default function QuickBackgroundField({
  field,
  chart,
  onChange = noop,
} = {}) {
  const controlId = fieldControlId(field);
  const background = chart?.presentation?.background;
  const color = validHex(background?.color) ? background.color.toUpperCase() : "";
  const mode = background?.transparent === true
    ? "transparent"
    : color
      ? "custom"
      : "default";

  const selectMode = (event) => {
    switch (event.target.value) {
      case "transparent":
        onChange(["presentation", "background"], {
          ...(color ? { color } : {}),
          transparent: true,
        });
        break;
      case "custom":
        onChange(["presentation", "background"], {
          color: color || CUSTOM_BACKGROUND,
          transparent: false,
        });
        break;
      default:
        onChange(["presentation", "background"], undefined);
    }
  };

  return React.createElement(
    "div",
    {
      className: "chart-authoring-field chart-quick-background",
      "data-field-id": field?.id,
    },
    React.createElement("label", { htmlFor: `${controlId}-mode` }, field?.label ?? "Background color"),
    React.createElement(
      "select",
      {
        id: `${controlId}-mode`,
        value: mode,
        onChange: selectMode,
        "aria-describedby": fieldDescribedBy(field) || undefined,
      },
      React.createElement("option", { value: "default" }, "Default"),
      React.createElement("option", { value: "transparent" }, "Transparent"),
      React.createElement("option", { value: "custom" }, "Custom"),
    ),
    mode === "custom"
      ? React.createElement(ColorField, {
          id: controlId,
          label: "Custom background color",
          labelHidden: true,
          value: color,
          fallback: CUSTOM_BACKGROUND,
          onChange: (nextColor) => onChange(["presentation", "background"], {
            color: nextColor,
            transparent: false,
          }),
          dataColorField: field?.id,
          pickerRevision: background,
        })
      : null,
  );
}

function validHex(value) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value.trim());
}

function noop() {}
