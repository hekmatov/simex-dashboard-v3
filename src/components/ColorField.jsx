import React from "react";
import { pickColorFromPage } from "./color/EyeDropperCoordinator.js";
import { IconControl } from "./common/SimExIcon.js";
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
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [activePalette, setActivePalette] = React.useState(() => colorGroupFor(normalizedValue));
  const colorFieldRef = React.useRef(null);
  const controlId = id || `settings-color-${safeId(label)}`;
  const paletteId = `${controlId}-palette`;
  const contrast = describeColorContrast(normalizedValue, { transparent });
  React.useEffect(() => {
    setDraft(normalizedValue);
  }, [normalizedValue, pickerRevision]);
  React.useEffect(() => {
    if (!paletteOpen) return undefined;
    function closeOnOutsidePointer(event) {
      if (!colorFieldRef.current?.contains(event.target)) setPaletteOpen(false);
    }
    function closeOnEscape(event) {
      if (event.key === "Escape") setPaletteOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [paletteOpen]);
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
          : error?.message || "Color picker could not start.",
      );
    } finally {
      setPickerActive(false);
    }
  }
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "settings-color-field",
      ref: colorFieldRef,
      "data-color-field": dataColorField,
      "data-invalid": error || invalid ? "true" : void 0
    },
    /* @__PURE__ */ React.createElement("label", { htmlFor: controlId }, label),
    /* @__PURE__ */ React.createElement("div", { className: "settings-color-row" }, /* @__PURE__ */ React.createElement("button", {
      type: "button",
      className: "settings-color-swatch",
      style: { backgroundColor: normalizedValue },
      "aria-label": `${paletteOpen ? "Close" : "Open"} ${label} color options`,
      "aria-expanded": paletteOpen,
      "aria-controls": paletteId,
      onClick: () => {
        setActivePalette(colorGroupFor(normalizedValue));
        setPaletteOpen((open) => !open);
      }
    }), /* @__PURE__ */ React.createElement(
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
    ), /* @__PURE__ */ React.createElement(IconControl, {
      interactionId: "editor.pick-color-from-dashboard",
      className: "secondary settings-pipette-button",
      iconClassName: "settings-pipette-icon",
      onClick: startPicking,
      disabled: pickerActive,
      "aria-label": `Pick ${String(label).toLowerCase()} from dashboard`,
      tooltip: "Pick color from screen",
      title: "Pick color from screen"
    })),
    paletteOpen ? /* @__PURE__ */ React.createElement(ColorPalettePanel, {
      id: paletteId,
      label,
      activePalette,
      normalizedValue,
      onSelectPalette: setActivePalette,
      onSelectColor: commitColor
    }) : null,
    allowTransparency ? /* @__PURE__ */ React.createElement("label", { className: "chart-authoring-inline-toggle settings-color-transparency" }, /* @__PURE__ */ React.createElement("input", {
      type: "checkbox",
      checked: transparent === true,
      onChange: (event) => onTransparencyChange?.(event.target.checked)
    }), "Transparent background") : null,
    showContrast || allowTransparency ? /* @__PURE__ */ React.createElement("small", { role: "status", "aria-live": "polite", className: `settings-color-contrast settings-color-contrast-${contrast.level}` }, contrast.message) : null,
    message ? /* @__PURE__ */ React.createElement("small", null, message) : null,
    help ? /* @__PURE__ */ React.createElement("small", { id: `${controlId}-help` }, help) : null,
    error ? /* @__PURE__ */ React.createElement("small", { id: `${controlId}-error`, role: "alert" }, error) : null
  );
}
function ColorPalettePanel({
  id,
  label,
  activePalette,
  normalizedValue,
  onSelectPalette,
  onSelectColor
}) {
  const tabs = [...COLOR_GROUPS.map((group) => group.label), "Gradients"];
  const activeColors = COLOR_GROUPS.find((group) => group.label === activePalette)?.colors ?? [];
  const paletteContent = activePalette === "Gradients"
    ? React.createElement(
      "div",
      { className: "settings-gradient-grid", "aria-label": `${label} gradient maps` },
      GRADIENT_MAPS.map((map) => React.createElement(
        "button",
        {
          type: "button",
          key: map.label,
          title: `${map.label}: use middle color`,
          "aria-label": `${map.label} gradient map`,
          onClick: () => onSelectColor(map.colors[Math.floor(map.colors.length / 2)]),
        },
        React.createElement("span", {
          style: { background: `linear-gradient(90deg, ${map.colors.join(", ")})` },
        }),
        React.createElement("small", null, map.label),
      )),
    )
    : React.createElement(
      "div",
      { className: "settings-color-preset-grid", "aria-label": `${activePalette} colors` },
      activeColors.map((color) => React.createElement("button", {
        type: "button",
        key: color,
        className: color.toUpperCase() === normalizedValue ? "active" : "",
        style: { backgroundColor: color },
        title: color,
        "aria-label": `Use ${color} for ${label}`,
        onClick: () => onSelectColor(color),
      })),
    );
  return React.createElement(
    "div",
    {
      className: "settings-color-popover",
      id,
      role: "dialog",
      "aria-label": `${label} color options`,
    },
    React.createElement(
      "div",
      { className: "settings-color-tabs", role: "tablist", "aria-label": "Color classes" },
      tabs.map((tab) => React.createElement(
        "button",
        {
          type: "button",
          key: tab,
          role: "tab",
          "aria-selected": activePalette === tab,
          onClick: () => onSelectPalette(tab),
        },
        tab,
      )),
    ),
    React.createElement("div", { className: "settings-color-tab-panel", role: "tabpanel" }, paletteContent),
  );
}
function colorGroupFor(value) {
  const normalized = normalizeHexColor(value, "");
  return COLOR_GROUPS.find((group) => group.colors.includes(normalized))?.label ?? "PDPC";
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
