import React from "react";
import {
  SERIES_STYLE_LIMITS,
} from "../../charting/presentation/seriesStyleContract.js";
import ColorField from "../ColorField.jsx";
import { IconControl } from "../common/SimExIcon.js";
import { fieldControlId } from "./StandardField.jsx";

const MAX_SERIES_COLORS = SERIES_STYLE_LIMITS.colors.max;
const DEFAULT_SERIES_COLORS = Object.freeze([
  "#043BCB",
  "#36BDEB",
  "#2BAA7B",
  "#F1A1AD",
  "#F59E0B",
]);

function SeriesColorsField({
  field,
  value = field?.value,
  onChange = noop,
} = {}) {
  const colors = validColors(value);
  const controlId = fieldControlId(field);
  const replace = (index, color) => {
    const next = [...colors];
    next[index] = color;
    onChange(next);
  };
  const remove = (index) => {
    const next = colors.filter((_, colorIndex) => colorIndex !== index);
    onChange(next.length > 0 ? next : undefined);
  };
  const add = () => {
    if (colors.length >= MAX_SERIES_COLORS) return;
    onChange([
      ...colors,
      DEFAULT_SERIES_COLORS[colors.length % DEFAULT_SERIES_COLORS.length],
    ]);
  };

  return React.createElement(
    "fieldset",
    {
      className: "chart-authoring-field chart-authoring-series-colors",
      "data-field-id": field?.id,
    },
    React.createElement("legend", { className: "visually-hidden" }, field?.label ?? "Series colors"),
    React.createElement(
      "div",
      { className: "chart-authoring-series-colors-heading" },
      React.createElement("span", { className: "chart-authoring-field-label" }, field?.label ?? "Series colors"),
      colors.length === 0
        ? React.createElement(
            "small",
            { className: "chart-authoring-empty" },
            "Using the default color sequence.",
          )
        : null,
    ),
    React.createElement(
      "div",
      { className: "chart-authoring-series-color-list" },
      colors.map((color, index) => React.createElement(
        "div",
        {
          className: "chart-authoring-series-color",
          key: `series-color-${index}`,
        },
        React.createElement(ColorField, {
          id: `${controlId}-${index}`,
          label: `Color ${index + 1}`,
          value: color,
          fallback: DEFAULT_SERIES_COLORS[
            index % DEFAULT_SERIES_COLORS.length
          ],
          onChange: (nextColor) => replace(index, nextColor),
          dataColorField: `${field.id}-${index}`,
          pickerRevision: value,
        }),
        React.createElement(IconControl, {
          interactionId: "editor.remove-measurement",
          className: "secondary",
          onClick: () => remove(index),
          ariaLabel: `Remove color ${index + 1}`,
          tooltip: `Remove color ${index + 1}`,
        }),
      )),
    ),
    React.createElement(IconControl, {
      interactionId: "editor.add-color",
      className: "secondary chart-authoring-add-series-color",
      disabled: colors.length >= MAX_SERIES_COLORS,
      onClick: add,
    }),
    colors.length > 0
      ? React.createElement(IconControl, {
          interactionId: "editor.use-default-colors",
          className: "secondary chart-authoring-default-series-colors",
          onClick: () => onChange(undefined),
        })
      : null,
    React.createElement(
      "small",
      null,
      `Colors are assigned in plotted order. Add up to ${MAX_SERIES_COLORS}.`,
    ),
  );
}

function validColors(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((color) => (
      typeof color === "string"
      && /^#[0-9a-f]{6}$/i.test(color)
    ))
    .slice(0, MAX_SERIES_COLORS);
}

function noop() {}

export default SeriesColorsField;
