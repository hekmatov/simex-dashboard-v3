import React from "react";

import { getInteraction } from "../../iconography/iconCatalog.js";
import { ICON_GLYPHS, getIconGlyph } from "../../iconography/iconGlyphs.js";

export const SimExIcon = React.memo(function SimExIcon({
  iconId,
  decorative = true,
  label,
  size = 24,
  className = "",
} = {}) {
  const resolvedId = Object.prototype.hasOwnProperty.call(ICON_GLYPHS, iconId)
    ? iconId
    : "unknown";

  return React.createElement("svg", {
    className: joinClassNames("simex-icon", className),
    viewBox: "0 0 24 24",
    width: size,
    height: size,
    focusable: "false",
    role: decorative ? undefined : "img",
    "aria-hidden": decorative ? "true" : undefined,
    "aria-label": decorative ? undefined : label,
    "data-icon-id": resolvedId,
    dangerouslySetInnerHTML: { __html: getIconGlyph(resolvedId) },
  });
});

export const IconControl = React.memo(function IconControl({
  interactionId,
  ariaLabel,
  tooltip,
  tooltipPlacement = "above",
  iconSize = 20,
  iconClassName = "",
  pressed,
  selected,
  disabled = false,
  className = "",
  type = "button",
  ...buttonProps
} = {}) {
  const interaction = getInteraction(interactionId);
  if (!interaction) {
    throw new Error(`Unknown icon interaction: ${String(interactionId)}`);
  }

  const {
    "aria-label": ariaLabelProp,
    "aria-pressed": ariaPressedProp,
    ...forwardedButtonProps
  } = buttonProps;
  const isPlanned = interaction.status === "planned";
  const isDisabled = disabled || isPlanned;
  const isPressed = pressed ?? selected ?? ariaPressedProp;
  const resolvedLabel = ariaLabelProp ?? ariaLabel ?? interaction.label;
  const resolvedTooltip = tooltip ?? interaction.tooltip ?? resolvedLabel;

  return React.createElement(
    "button",
    {
      ...forwardedButtonProps,
      type,
      className: joinClassNames("simex-icon-control", className),
      disabled: isDisabled,
      "aria-disabled": isDisabled || undefined,
      "aria-label": resolvedLabel,
      "aria-pressed": isPressed,
      "data-icon-control": interactionId,
      "data-icon-tooltip": resolvedTooltip,
      "data-icon-tooltip-placement": tooltipPlacement === "below" ? "below" : "above",
      "data-icon-tone": interaction.tone ?? "standard",
      "data-icon-status": isPlanned ? "planned" : interaction.status,
      "data-icon-selected": isPressed === true ? "true" : undefined,
    },
    React.createElement(SimExIcon, {
      iconId: interaction.glyphId,
      size: iconSize,
      className: iconClassName,
      decorative: true,
    }),
  );
});

function joinClassNames(...values) {
  return values.filter(Boolean).join(" ");
}
