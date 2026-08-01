import React from "react";

import ModalFocusScope from "./ModalFocusScope.jsx";

export default function ConfirmDialog({
  open = false,
  title = "Are you sure?",
  message = "",
  confirmLabel = "Yes",
  cancelLabel = "No",
  onConfirm = noop,
  onCancel = noop,
  disabled = false,
} = {}) {
  if (!open) return null;
  const id = `confirm-${safeId(title)}`;
  return React.createElement(
    ModalFocusScope,
    {
      as: "div",
      open,
      initialFocusSelector: "[data-modal-initial-focus=\"true\"]",
      onEscape: onCancel,
      className: "confirm-dialog-backdrop",
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": `${id}-title`,
      "aria-describedby": message ? `${id}-message` : undefined,
      tabIndex: -1,
    },
    React.createElement(
      "section",
      { className: "confirm-dialog" },
      React.createElement("h2", { id: `${id}-title` }, title),
      message
        ? React.createElement("p", { id: `${id}-message` }, message)
        : null,
      React.createElement(
        "div",
        { className: "confirm-dialog-actions" },
        React.createElement(
          "button",
          {
            type: "button",
            className: "secondary",
            "data-modal-initial-focus": "true",
            disabled,
            onClick: onCancel,
          },
          cancelLabel,
        ),
        React.createElement(
          "button",
          {
            type: "button",
            className: "danger",
            disabled,
            onClick: onConfirm,
          },
          confirmLabel,
        ),
      ),
    ),
  );
}

function safeId(value) {
  return typeof value === "string"
    ? value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    : "action";
}

function noop() {}
