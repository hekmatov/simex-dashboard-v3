import React from "react";

export default function ControlTooltip({
  children,
  disabled = false,
  reason = "",
  className = "",
}) {
  const normalizedReason = typeof reason === "string" ? reason.trim() : "";
  const active = disabled === true && normalizedReason !== "";
  const reasonId = `control-tooltip-${React.useId().replaceAll(":", "")}`;

  return React.createElement(
    "span",
    {
      className: ["control-tooltip", className].filter(Boolean).join(" "),
      "data-control-tooltip-anchor": active ? "true" : "false",
      tabIndex: active ? 0 : undefined,
      "aria-describedby": active ? reasonId : undefined,
    },
    children,
    active
      ? React.createElement(
          "span",
          { id: reasonId, role: "tooltip", className: "control-tooltip__reason" },
          normalizedReason,
        )
      : null,
  );
}
