import React from "react";

import ConfirmDialog from "../common/ConfirmDialog.jsx";
import { IconControl } from "../common/SimExIcon.js";

export default function EditSessionActions({
  valid = false,
  submitting = false,
  disabled = false,
  saveDisabled = false,
  saveDisabledReason = "",
  removeDisabled = false,
  removeDisabledReason = "",
  saveLabel = "Save changes",
  savingLabel = "Saving changes",
  resetLabel = "Reset changes",
  cancelLabel = "Cancel",
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
        ariaLabel: submitting ? savingLabel : saveLabel,
        tooltip: submitting ? savingLabel : saveLabel,
        disabled: disabled || saveDisabled || !valid || submitting,
        disabledReason: saveDisabled ? saveDisabledReason : "",
        onClick: onSave,
      }),
      React.createElement(IconControl, {
        interactionId: "editor.reset-changes",
        className: "secondary",
        ariaLabel: resetLabel,
        tooltip: resetLabel,
        disabled: disabled || submitting,
        onClick: onRequestReset,
      }),
      React.createElement(IconControl, {
        interactionId: "editor.cancel",
        className: "secondary",
        ariaLabel: cancelLabel,
        tooltip: cancelLabel,
        disabled: disabled || submitting,
        onClick: onCancel,
      }),
      typeof onRemove === "function"
        ? React.createElement(IconControl, {
            interactionId: "chart.remove",
            className: "chart-editor-remove",
            disabled: disabled || removeDisabled || submitting,
            disabledReason: removeDisabled ? removeDisabledReason : "",
            onClick: () => {
              if (!disabled && !removeDisabled && !submitting) onRemove();
            },
          })
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
