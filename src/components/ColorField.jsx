import React from "react";
import { pickColorFromPage } from "./color/EyeDropperCoordinator.js";
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;
const COLOR_GROUPS = [
  {
    label: "PDPC",
    colors: ["#08224A", "#043BCB", "#36BDEB", "#2BAA7B", "#F1A1AD"]
  },
  {
    label: "Status",
    colors: ["#15803D", "#84A82D", "#F59E0B", "#EA580C", "#DC2626"]
  },
  {
    label: "Neutrals",
    colors: ["#111827", "#374151", "#6B7280", "#D8E2EC", "#F5F8FB", "#FFFFFF"]
  }
];
const GRADIENT_MAPS = [
  { label: "Red to green", colors: ["#D71920", "#Fdae61", "#FFFFBF", "#A6D96A", "#1A9641"] },
  { label: "Green to red", colors: ["#1A9641", "#A6D96A", "#FFFFBF", "#Fdae61", "#D71920"] },
  { label: "Blue to yellow", colors: ["#2C7BB6", "#ABD9E9", "#FFFFBF", "#FDAE61", "#D7191C"] },
  { label: "Yellow to blue", colors: ["#D7191C", "#FDAE61", "#FFFFBF", "#ABD9E9", "#2C7BB6"] },
  { label: "Likert", colors: ["#3BA64A", "#A7B734", "#F6A21A", "#F47B20", "#DF1F2D"] },
  { label: "PDPC", colors: ["#08224A", "#043BCB", "#36BDEB", "#2BAA7B", "#F1A1AD"] }
];
function ColorField({
  id,
  label,
  value,
  fallback = "#043BCB",
  onChange,
  showPresets = true,
  dataColorField,
  help,
  error,
  invalid = false,
  ariaDescribedBy,
  allowTransparency = false,
  transparent = false,
  onTransparencyChange,
  showContrast = false,
  pickerRevision
}) {
  const normalizedValue = normalizeHexColor(value, fallback);
  const [draft, setDraft] = React.useState(normalizedValue);
  const [message, setMessage] = React.useState("");
  const [pickerActive, setPickerActive] = React.useState(false);
  const controlId = id || `settings-color-${safeId(label)}`;
  const contrast = describeColorContrast(normalizedValue, { transparent });
  React.useEffect(() => {
    setDraft(normalizedValue);
  }, [normalizedValue, pickerRevision]);
  function commitColor(nextColor) {
    const normalized = normalizeHexColor(nextColor, "");
    setDraft(nextColor);
    if (!normalized) {
      setMessage("Use #RRGGBB.");
      return;
    }
    setMessage("");
    onChange(normalized);
  }
  async function startPicking() {
    if (pickerActive) {
      setMessage("The picker is already active.");
      return;
    }
    setPickerActive(true);
    setMessage("Pick any color visible on the page. Press Esc to cancel.");
    try {
      const color = await pickColorFromPage();
      if (color) commitColor(color);
    } catch (error) {
      setMessage(
        error?.name === "AbortError"
          ? "Picker cancelled."
          : error?.message || "Native picker could not start.",
      );
    } finally {
      setPickerActive(false);
    }
  }
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "settings-color-field",
      "data-color-field": dataColorField,
      "data-invalid": error || invalid ? "true" : void 0
    },
    /* @__PURE__ */ React.createElement("label", { htmlFor: controlId }, label),
    /* @__PURE__ */ React.createElement("div", { className: "settings-color-row" }, /* @__PURE__ */ React.createElement("label", { className: "settings-color-swatch", style: { backgroundColor: normalizedValue }, title: "Open color picker" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        "aria-label": `Pick ${label}`,
        type: "color",
        value: normalizedValue,
        onChange: (event) => commitColor(event.target.value)
      }
    )), /* @__PURE__ */ React.createElement(
      "input",
      {
        id: controlId,
        "aria-label": label,
        "aria-describedby": ariaDescribedBy || void 0,
        "aria-invalid": error || invalid ? "true" : void 0,
        value: draft,
        onChange: (event) => commitColor(event.target.value),
        onBlur: (event) => setDraft(normalizeHexColor(event.target.value, normalizedValue)),
        spellCheck: "false"
      }
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        className: "secondary settings-pipette-button",
        onClick: startPicking,
        disabled: pickerActive,
        "aria-label": `Pick ${String(label).toLowerCase()} from dashboard`,
        title: "Pick color from screen"
      },
      /* @__PURE__ */ React.createElement(PipetteIcon, null)
    )),
    allowTransparency ? /* @__PURE__ */ React.createElement("label", { className: "chart-authoring-inline-toggle settings-color-transparency" }, /* @__PURE__ */ React.createElement("input", {
      type: "checkbox",
      checked: transparent === true,
      onChange: (event) => onTransparencyChange?.(event.target.checked)
    }), "Transparent background") : null,
    showPresets ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "settings-color-palette", "aria-label": `${label} color presets` }, COLOR_GROUPS.map((group) => /* @__PURE__ */ React.createElement("div", { className: "settings-color-palette-group", key: group.label }, /* @__PURE__ */ React.createElement("small", null, group.label), /* @__PURE__ */ React.createElement("div", { className: "settings-color-preset-grid" }, group.colors.map((color) => /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        key: color,
        className: color.toUpperCase() === normalizedValue ? "active" : "",
        style: { backgroundColor: color },
        title: color,
        "aria-label": `Use ${color} for ${label}`,
        onClick: () => commitColor(color)
      }
    )))))), /* @__PURE__ */ React.createElement("div", { className: "settings-gradient-grid", "aria-label": `${label} gradient maps` }, GRADIENT_MAPS.map((map) => /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        key: map.label,
        title: `${map.label}: use middle color`,
        "aria-label": `${map.label} gradient map`,
        onClick: () => commitColor(map.colors[Math.floor(map.colors.length / 2)])
      },
      /* @__PURE__ */ React.createElement("span", { style: { background: `linear-gradient(90deg, ${map.colors.join(", ")})` } }),
      /* @__PURE__ */ React.createElement("small", null, map.label)
    )))) : null,
    showContrast || allowTransparency ? /* @__PURE__ */ React.createElement("small", { role: "status", "aria-live": "polite", className: `settings-color-contrast settings-color-contrast-${contrast.level}` }, contrast.message) : null,
    message ? /* @__PURE__ */ React.createElement("small", null, message) : null,
    help ? /* @__PURE__ */ React.createElement("small", { id: `${controlId}-help` }, help) : null,
    error ? /* @__PURE__ */ React.createElement("small", { id: `${controlId}-error`, role: "alert" }, error) : null
  );
}
function PipetteIcon() {
  return /* @__PURE__ */ React.createElement("svg", { className: "settings-pipette-icon", viewBox: "0 0 24 24", "aria-hidden": "true", focusable: "false" }, /* @__PURE__ */ React.createElement("path", { d: "M14.5 4.5 19.5 9.5" }), /* @__PURE__ */ React.createElement("path", { d: "M8 16 4.5 19.5" }), /* @__PURE__ */ React.createElement("path", { d: "M6.5 17.5 16.5 7.5" }), /* @__PURE__ */ React.createElement("path", { d: "M14 5 19 10 16 13 11 8z" }), /* @__PURE__ */ React.createElement("path", { d: "M5 20h5" }));
}
function normalizeHexColor(value, fallback) {
  const color = String(value ?? "").trim();
  return HEX_COLOR_PATTERN.test(color) ? color.toUpperCase() : fallback;
}
function describeColorContrast(value, { transparent = false } = {}) {
  if (transparent) {
    return {
      level: "contextual",
      message: "Transparent background: contrast depends on the content behind the chart."
    };
  }
  const color = normalizeHexColor(value, "#FFFFFF");
  const darkRatio = contrastRatio(color, "#08224A");
  const lightRatio = contrastRatio(color, "#FFFFFF");
  if (darkRatio >= 4.5) {
    return {
      level: "high",
      message: `High contrast with dark text (${darkRatio.toFixed(1)}:1).`
    };
  }
  if (lightRatio >= 4.5) {
    return {
      level: "high",
      message: `High contrast with light text (${lightRatio.toFixed(1)}:1).`
    };
  }
  return {
    level: "low",
    message: `Low contrast with dark or light text (best is ${Math.max(darkRatio, lightRatio).toFixed(1)}:1).`
  };
}
function contrastRatio(first, second) {
  const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}
function relativeLuminance(value) {
  const color = normalizeHexColor(value, "#000000");
  const channels = [1, 3, 5].map((start) => Number.parseInt(color.slice(start, start + 2), 16) / 255).map((channel) => (
    channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4
  ));
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
function safeId(value) {
  return typeof value === "string" ? value.replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase() : "color";
}
export {
  ColorField as default,
  describeColorContrast
};
