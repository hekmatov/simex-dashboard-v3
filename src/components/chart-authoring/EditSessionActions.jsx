import React from "react";

import ConfirmDialog from "../common/ConfirmDialog.jsx";

export default function EditSessionActions({
  valid = false,
  submitting = false,
  disabled = false,
  resetConfirmationOpen = false,
  onSave = noop,
  onRequestReset = noop,
  onConfirmReset = noop,
  onCancelReset = noop,
  onCancel = noop,
  onRemove,
} = {}) {
  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      "div",
      { className: "chart-editor-actions" },
      React.createElement(
        "button",
        {
          type: "submit",
          disabled: disabled || !valid || submitting,
          onClick: onSave,
        },
        submitting ? "Saving..." : "Save",
      ),
      React.createElement(
        "button",
        {
          type: "button",
          className: "secondary",
          disabled: disabled || submitting,
          onClick: onRequestReset,
        },
        "Reset changes",
      ),
      React.createElement(
        "button",
        {
          type: "button",
          className: "secondary",
          disabled: disabled || submitting,
          onClick: onCancel,
        },
        "Cancel",
      ),
      typeof onRemove === "function"
        ? React.createElement(
            "button",
            {
              type: "button",
              className: "danger chart-editor-remove",
              disabled: disabled || submitting,
              onClick: () => {
                if (!disabled && !submitting) onRemove();
              },
            },
            "Remove chart",
          )
        : null,
    ),
    React.createElement(ConfirmDialog, {
      open: resetConfirmationOpen,
      title: "Discard these edits?",
      message: "Reset changes? Your unsaved chart changes will be replaced by the most recently saved version.",
      confirmLabel: "Reset changes",
      cancelLabel: "Keep editing",
      onConfirm: onConfirmReset,
      onCancel: onCancelReset,
      disabled: disabled || submitting,
    }),
  );
}

function noop() {}
