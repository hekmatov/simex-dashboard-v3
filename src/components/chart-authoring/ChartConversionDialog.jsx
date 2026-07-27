import React from "react";

import RoleField from "./RoleField.jsx";

export default function ChartConversionDialog({
  conversion,
  columns = [],
  onRoleAssignment = noop,
  onConfirm = noop,
  onCancel = noop,
} = {}) {
  if (!conversion?.plan) return null;
  const { plan } = conversion;
  const roleFields = Array.isArray(conversion.roleFields)
    ? conversion.roleFields
    : [];
  const removed = Array.isArray(plan.removedSettings)
    ? plan.removedSettings
    : [];
  const preserved = Object.entries(plan.preservedRoles ?? {});
  const blocked = plan.requiredRoles.length > 0;
  return React.createElement(
    "div",
    {
      className: "confirm-dialog-backdrop chart-conversion-backdrop",
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "chart-conversion-title",
      "aria-describedby": "chart-conversion-consequences",
    },
    React.createElement(
      "section",
      { className: "confirm-dialog chart-conversion-dialog" },
      React.createElement(
        "header",
        null,
        React.createElement("p", { className: "eyebrow" }, "Change chart type"),
        React.createElement(
          "h2",
          { id: "chart-conversion-title" },
          plan.kind === "compatible"
            ? "Compatible change"
            : "Role remapping required",
        ),
      ),
      React.createElement(
        "p",
        { id: "chart-conversion-consequences" },
        `Convert ${plan.sourceTypeId} to ${plan.targetTypeId}. Review what is kept and removed before applying this change.`,
      ),
      preserved.length > 0
        ? React.createElement(
            "section",
            { className: "chart-conversion-summary" },
            React.createElement("h3", null, "Preserved data roles"),
            React.createElement(
              "ul",
              null,
              preserved.map(([roleId, assignment]) => React.createElement(
                "li",
                { key: roleId },
                React.createElement("strong", null, roleId),
                ": ",
                bindingSummary(assignment),
              )),
            ),
          )
        : null,
      roleFields.length > 0
        ? React.createElement(
            "section",
            { className: "chart-conversion-remapping" },
            React.createElement("h3", null, "Required role remapping"),
            roleFields.map((role) => React.createElement(RoleField, {
              key: role.id,
              field: {
                ...role,
                required: role.min > 0,
                multiple: role.max === null || role.max > 1,
              },
              value: conversion.roleAssignments?.[role.id],
              columns: normalizeColumns(columns),
              onChange: (value) => onRoleAssignment(role.id, value),
            })),
          )
        : null,
      removed.length > 0
        ? React.createElement(
            "section",
            { className: "chart-conversion-removals" },
            React.createElement("h3", null, "Settings that will be removed"),
            React.createElement(
              "ul",
              null,
              removed.map(({ path, label }) => React.createElement(
                "li",
                { key: path },
                React.createElement("code", null, path),
                React.createElement("span", null, label),
              )),
            ),
          )
        : React.createElement(
            "p",
            { className: "chart-conversion-no-removals" },
            "No configured settings need to be removed.",
          ),
      blocked
        ? React.createElement(
            "p",
            { className: "wizard-error", role: "alert" },
            "Complete every required data role before applying this change.",
          )
        : null,
      React.createElement(
        "div",
        { className: "confirm-dialog-actions" },
        React.createElement(
          "button",
          {
            type: "button",
            className: "secondary",
            onClick: onCancel,
          },
          "Cancel",
        ),
        React.createElement(
          "button",
          {
            type: "button",
            disabled: blocked,
            onClick: onConfirm,
          },
          "Apply chart type change",
        ),
      ),
    ),
  );
}

function normalizeColumns(columns) {
  if (Array.isArray(columns)) return columns;
  if (columns && typeof columns[Symbol.iterator] === "function") {
    return [...columns];
  }
  return [];
}

function bindingSummary(assignment) {
  const bindings = Array.isArray(assignment)
    ? assignment
    : assignment ? [assignment] : [];
  return bindings
    .map((binding) => binding?.field)
    .filter((field) => typeof field === "string" && field)
    .join(", ") || "Not assigned";
}

function noop() {}
