import React from "react";

export default function ControlTooltip({
  children,
  disabled = false,
  explain = false,
  reason = "",
  className = "",
}) {
  const normalizedReason = typeof reason === "string" ? reason.trim() : "";
  const active = normalizedReason !== "" && (disabled === true || explain === true);
  const disabledAnchor = active && disabled === true;
  const explanationAnchor = active && explain === true && disabled !== true;
  const reasonId = `control-tooltip-${React.useId().replaceAll(":", "")}`;
  const describedChild = explanationAnchor && React.isValidElement(children)
    ? React.cloneElement(children, {
        "aria-describedby": [children.props["aria-describedby"], reasonId]
          .filter(Boolean)
          .join(" "),
      })
    : children;

  return React.createElement(
    "span",
    {
      className: ["control-tooltip", className].filter(Boolean).join(" "),
      "data-control-tooltip-anchor": active ? "true" : "false",
      "data-control-tooltip-kind": disabledAnchor
        ? "disabled"
        : explanationAnchor
          ? "explanation"
          : undefined,
      "aria-describedby": disabledAnchor ? reasonId : undefined,
    },
    describedChild,
    active
      ? React.createElement(
          "span",
          { id: reasonId, role: "tooltip", className: "control-tooltip__reason" },
          normalizedReason,
        )
      : null,
  );
}
