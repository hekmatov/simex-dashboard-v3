import React from "react";

import ConfirmDialog from "../common/ConfirmDialog.jsx";
import { IconControl } from "../common/SimExIcon.js";

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
      React.createElement(IconControl, {
        interactionId: "editor.save-changes",
        type: "submit",
        ariaLabel: submitting ? "Saving changes" : "Save changes",
        tooltip: submitting ? "Saving changes" : "Save changes",
        disabled: disabled || !valid || submitting,
        onClick: onSave,
      }),
      React.createElement(IconControl, {
        interactionId: "editor.reset-changes",
        className: "secondary",
        disabled: disabled || submitting,
        onClick: onRequestReset,
      }),
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
