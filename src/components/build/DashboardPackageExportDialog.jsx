import React from "react";

import ModalFocusScope from "../common/ModalFocusScope.jsx";

export default function DashboardPackageExportDialog({
  open = false,
  issues = [],
  busy = false,
  error = "",
  onResolve = noop,
  onCancel = noop,
} = {}) {
  if (!open) return null;

  return React.createElement(
    ModalFocusScope,
    {
      as: "div",
      open: true,
      className: "confirm-dialog-backdrop dashboard-package-export-backdrop dashboard-dialog-backdrop",
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "dashboard-package-export-title",
      "aria-describedby": "dashboard-package-export-description",
      initialFocusSelector: '[data-modal-initial-focus="true"]',
      onEscape: busy ? noop : onCancel,
      tabIndex: -1,
    },
    React.createElement(
      "section",
      { className: "confirm-dialog dashboard-package-export dashboard-dialog dashboard-dialog--utility dashboard-dialog--compact" },
      React.createElement(
        "header",
        { className: "dashboard-dialog__header" },
        React.createElement(
          "div",
          null,
          React.createElement("p", { className: "eyebrow" }, "Dashboard package"),
          React.createElement(
            "h2",
            { id: "dashboard-package-export-title" },
            "Finish unfinished work before download",
          ),
        ),
      ),
      React.createElement(
        "div",
        { className: "confirm-dialog-body dashboard-dialog__body" },
        React.createElement(
          "p",
          { id: "dashboard-package-export-description" },
          "Resolve each active draft first so the package contains a deliberate, recoverable dashboard state.",
        ),
        React.createElement(
          "ul",
          { className: "dashboard-package-export-issues" },
          ...issues.map((issue, index) => React.createElement(
            "li",
            { key: issue.id },
            React.createElement(
              "div",
              null,
              React.createElement("strong", null, issue.label),
              issue.description
                ? React.createElement("p", null, issue.description)
                : null,
            ),
            React.createElement(
              "button",
              {
                type: "button",
                className: "secondary",
                disabled: busy,
                "data-modal-initial-focus": index === 0 ? "true" : undefined,
                onClick: () => onResolve(issue.id),
              },
              issue.actionLabel,
            ),
          )),
        ),
        error
          ? React.createElement("p", { className: "confirm-dialog-error", role: "alert" }, error)
          : null,
      ),
      React.createElement(
        "div",
        { className: "confirm-dialog-actions dashboard-dialog__footer dashboard-dialog__actions" },
        React.createElement(
          "button",
          {
            type: "button",
            className: "secondary",
            disabled: busy,
            onClick: onCancel,
          },
          "Cancel download",
        ),
      ),
    ),
  );
}

function noop() {}
