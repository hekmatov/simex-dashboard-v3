import React from "react";

import ConfirmDialog from "../common/ConfirmDialog.jsx";

export default function EditSessionActions({
  valid = false,
  resetConfirmationOpen = false,
  onSave = noop,
  onRequestReset = noop,
  onConfirmReset = noop,
  onCancelReset = noop,
  onCancel = noop,
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
          disabled: !valid,
          onClick: onSave,
        },
        "Save",
      ),
      React.createElement(
        "button",
        {
          type: "button",
          className: "secondary",
          onClick: onRequestReset,
        },
        "Reset changes",
      ),
      React.createElement(
        "button",
        {
          type: "button",
          className: "secondary",
          onClick: onCancel,
        },
        "Cancel",
      ),
    ),
    React.createElement(ConfirmDialog, {
      open: resetConfirmationOpen,
      title: "Discard these edits?",
      message: "Reset changes? Your unsaved chart changes will be replaced by the most recently saved version.",
      confirmLabel: "Reset changes",
      cancelLabel: "Keep editing",
      onConfirm: onConfirmReset,
      onCancel: onCancelReset,
    }),
  );
}

function noop() {}
