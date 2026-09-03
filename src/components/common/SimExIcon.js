import React from "react";
import { createPortal } from "react-dom";

import { getInteraction } from "../../iconography/iconCatalog.js";
import { ICON_GLYPHS, getIconGlyph } from "../../iconography/iconGlyphs.js";
import ControlTooltip from "./ControlTooltip.js";

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
  disabledReason = "",
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
    "aria-describedby": ariaDescribedByProp,
    ...forwardedButtonProps
  } = buttonProps;
  const isPlanned = interaction.status === "planned";
  const isDisabled = disabled || isPlanned;
  const workflowDisabled = disabled === true
    && typeof disabledReason === "string"
    && disabledReason.trim() !== "";
  const isPressed = pressed ?? selected ?? ariaPressedProp;
  const resolvedLabel = ariaLabelProp ?? ariaLabel ?? interaction.label;
  const resolvedTooltip = tooltip ?? interaction.tooltip ?? resolvedLabel;
  const tooltipState = useIconTooltip(resolvedTooltip, tooltipPlacement);
  const describedBy = [
    ariaDescribedByProp,
    tooltipState.open ? tooltipState.id : null,
  ].filter(Boolean).join(" ") || undefined;
  const {
    onMouseEnter,
    onMouseLeave,
    onFocus,
    onBlur,
    onKeyDown,
    ...restButtonProps
  } = forwardedButtonProps;

  const control = React.createElement(
      "button",
      {
        ...restButtonProps,
        ref: workflowDisabled ? undefined : tooltipState.anchorRef,
        type,
        className: joinClassNames("simex-icon-control", className),
        disabled: isDisabled,
        "aria-disabled": isDisabled || undefined,
        "aria-label": resolvedLabel,
        "aria-pressed": isPressed,
        "aria-describedby": workflowDisabled ? undefined : describedBy,
        "data-icon-control": interaction.id,
        "data-icon-tooltip": resolvedTooltip,
        "data-icon-tooltip-placement": tooltipPlacement === "below" ? "below" : "above",
        "data-icon-tone": interaction.tone ?? "standard",
        "data-icon-status": isPlanned ? "planned" : interaction.status,
        "data-icon-selected": isPressed === true ? "true" : undefined,
        onMouseEnter: chainHandlers(onMouseEnter, tooltipState.show),
        onMouseLeave: chainHandlers(onMouseLeave, tooltipState.hide),
        onFocus,
        onBlur: chainHandlers(onBlur, tooltipState.hide),
        onKeyDown,
      },
      React.createElement(SimExIcon, {
        iconId: interaction.glyphId,
        size: iconSize,
        className: iconClassName,
        decorative: true,
      }),
  );
  return React.createElement(
    React.Fragment,
    null,
    workflowDisabled
      ? React.createElement(
          ControlTooltip,
          { disabled: true, reason: disabledReason },
          control,
        )
      : control,
    workflowDisabled ? null : tooltipState.layer,
  );
});

export const IconSummary = React.memo(function IconSummary({
  interactionId,
  ariaLabel,
  tooltip,
  tooltipPlacement = "above",
  iconSize = 20,
  iconClassName = "",
  className = "",
  ...summaryProps
} = {}) {
  const interaction = getInteraction(interactionId);
  if (!interaction) {
    throw new Error(`Unknown icon interaction: ${String(interactionId)}`);
  }

  const resolvedLabel = ariaLabel ?? interaction.label;
  const resolvedTooltip = tooltip ?? interaction.tooltip ?? resolvedLabel;
  const tooltipState = useIconTooltip(resolvedTooltip, tooltipPlacement);
  const {
    onMouseEnter,
    onMouseLeave,
    onFocus,
    onBlur,
    onKeyDown,
    ...forwardedSummaryProps
  } = summaryProps;

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      "summary",
      {
        ...forwardedSummaryProps,
        ref: tooltipState.anchorRef,
        className: joinClassNames("simex-icon-control", className),
        "aria-label": resolvedLabel,
        "aria-describedby": tooltipState.open ? tooltipState.id : undefined,
        "data-icon-control": interaction.id,
        "data-icon-tooltip": resolvedTooltip,
        "data-icon-tooltip-placement": tooltipPlacement === "below" ? "below" : "above",
        "data-icon-tone": interaction.tone ?? "standard",
        "data-icon-status": interaction.status,
        onMouseEnter: chainHandlers(onMouseEnter, tooltipState.show),
        onMouseLeave: chainHandlers(onMouseLeave, tooltipState.hide),
        onFocus,
        onBlur: chainHandlers(onBlur, tooltipState.hide),
        onKeyDown,
      },
      React.createElement(SimExIcon, {
        iconId: interaction.glyphId,
        size: iconSize,
        className: iconClassName,
        decorative: true,
      }),
    ),
    tooltipState.layer,
  );
});

function useIconTooltip(label, placement) {
  const anchorRef = React.useRef(null);
  const tooltipRef = React.useRef(null);
  const id = `simex-tooltip-${React.useId().replaceAll(":", "")}`;
  const [open, setOpen] = React.useState(false);
  const [geometry, setGeometry] = React.useState(null);

  React.useLayoutEffect(() => {
    if (!open || !anchorRef.current || !tooltipRef.current) return undefined;
    const position = () => {
      const anchor = anchorRef.current;
      const tooltip = tooltipRef.current;
      if (!anchor || !tooltip) return;
      const anchorRect = anchor.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      const gap = 8;
      const inset = 8;
      const wantsBelow = placement === "below";
      const preferredTop = wantsBelow
        ? anchorRect.bottom + gap
        : anchorRect.top - tooltipRect.height - gap;
      const alternateTop = wantsBelow
        ? anchorRect.top - tooltipRect.height - gap
        : anchorRect.bottom + gap;
      const top = preferredTop >= inset
        && preferredTop + tooltipRect.height <= window.innerHeight - inset
        ? preferredTop
        : alternateTop;
      const root = anchor.closest(".app-frame") ?? anchor;
      const theme = getComputedStyle(root);
      setGeometry({
        left: Math.max(
          inset,
          Math.min(
            anchorRect.left + (anchorRect.width - tooltipRect.width) / 2,
            window.innerWidth - tooltipRect.width - inset,
          ),
        ),
        top: Math.max(inset, Math.min(top, window.innerHeight - tooltipRect.height - inset)),
        backgroundColor: theme.getPropertyValue("--simex-surface-panel").trim(),
        color: theme.getPropertyValue("--simex-text-strong").trim(),
        borderColor: theme.getPropertyValue("--simex-border-strong").trim(),
        fontFamily: theme.getPropertyValue("--simex-style-body-font").trim(),
      });
    };
    position();
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    };
  }, [open, placement]);

  const hide = React.useCallback(() => setOpen(false), []);
  const show = React.useCallback(() => setOpen(Boolean(label)), [label]);
  const layer = open && typeof document !== "undefined"
    ? createPortal(React.createElement(
        "span",
        {
          ref: tooltipRef,
          id,
          role: "tooltip",
          "aria-label": label,
          className: "simex-tooltip-layer",
          style: geometry ?? { visibility: "hidden" },
        },
        label,
      ), document.body)
    : null;

  return { anchorRef, id, open, show, hide, layer };
}

function chainHandlers(first, second) {
  return (event) => {
    first?.(event);
    if (!event.defaultPrevented) second?.(event);
  };
}

function joinClassNames(...values) {
  return values.filter(Boolean).join(" ");
}
