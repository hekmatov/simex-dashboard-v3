import React from "react";

import { useModalFocus } from "../common/ModalFocusScope.jsx";
import RoleField from "./RoleField.jsx";

export default function ChartConversionDialog({
  conversion,
  error = "",
  columns = [],
  onRoleAssignment = noop,
  onPlaybackSelection = noop,
  onConfirm = noop,
  onCancel = noop,
} = {}) {
  const dialogRef = useModalFocus({
    open: Boolean(conversion?.plan),
    initialFocusSelector: [
      ".chart-conversion-remapping select:not([disabled])",
      ".chart-conversion-remapping input:not([disabled])",
      "#chart-conversion-playback-role:not([disabled])",
      "[data-modal-conversion-cancel=\"true\"]",
    ].join(","),
    onEscape: onCancel,
  });
  if (!conversion?.plan) return null;
  const { plan } = conversion;
  const roleFields = Array.isArray(conversion.roleFields)
    ? conversion.roleFields
    : [];
  const removed = Array.isArray(plan.removedSettings)
    ? plan.removedSettings
    : [];
  const preserved = Object.entries(plan.preservedRoles ?? {});
  const playback = conversion.playback;
  const requiredRolesBlocked = plan.requiredRoles.length > 0;
  const playbackChoiceRequired = Boolean(
    playback?.selectable
    && playback.options?.length > 0
    && !playback.selection,
  );
  const blocked = requiredRolesBlocked || playbackChoiceRequired;
  return React.createElement(
    "div",
    {
      className: "confirm-dialog-backdrop chart-conversion-backdrop",
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "chart-conversion-title",
      "aria-describedby": error
        ? "chart-conversion-consequences chart-conversion-error"
        : "chart-conversion-consequences",
      tabIndex: -1,
      ref: dialogRef,
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
      playback?.selectable && playback.options?.length > 0
        ? React.createElement(
            "section",
            { className: "chart-conversion-playback-choice" },
            React.createElement(
              "label",
              { htmlFor: "chart-conversion-playback-role" },
              "Playback time role",
            ),
            React.createElement(
              "select",
              {
                id: "chart-conversion-playback-role",
                value: playbackSelectionValue(playback.selection),
                "aria-describedby": playbackChoiceRequired
                  ? "chart-conversion-playback-help chart-conversion-playback-error"
                  : "chart-conversion-playback-help",
                onChange: (event) => onPlaybackSelection(
                  playbackSelectionFromValue(event.target.value),
                ),
              },
              playback.options.length > 1
                ? React.createElement(
                    "option",
                    { value: "" },
                    "Choose a playback time role",
                  )
                : null,
              playback.options.map(({ roleId, label }) =>
                React.createElement(
                  "option",
                  { key: roleId, value: `role:${roleId}` },
                  label,
                )),
              React.createElement(
                "option",
                { value: "remove" },
                "Remove from synchronized playback",
              ),
            ),
            React.createElement(
              "p",
              { id: "chart-conversion-playback-help" },
              "Choose which assigned time role follows the shared playback clock, or intentionally remove this chart from synchronized playback.",
            ),
            playbackChoiceRequired
              ? React.createElement(
                  "p",
                  {
                    id: "chart-conversion-playback-error",
                    className: "wizard-error",
                    role: "alert",
                  },
                  "Choose a playback time role or remove this chart from synchronized playback.",
                )
              : null,
          )
        : null,
      conversion.timeSyncConsequence
        ? React.createElement(
            "section",
            { className: "chart-conversion-time-sync" },
            React.createElement("h3", null, "Synchronized playback"),
            React.createElement(
              "p",
              null,
              timeSyncConsequenceSummary(conversion.timeSyncConsequence),
            ),
          )
        : null,
      error
        ? React.createElement(
            "p",
            {
              id: "chart-conversion-error",
              className: "wizard-error",
              role: "alert",
            },
            error,
          )
        : null,
      requiredRolesBlocked
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
            "data-modal-conversion-cancel": "true",
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

function timeSyncConsequenceSummary(consequence) {
  if (consequence.kind === "remap") {
    return `The ${consequence.fromRole} time role will be remapped to ${consequence.targetLabel}.`;
  }
  if (consequence.kind === "preserve") {
    return `The ${consequence.targetLabel} time role will be preserved.`;
  }
  if (consequence.kind === "ambiguous") {
    return "Choose one temporal role before synchronized playback can be preserved.";
  }
  if (consequence.intentional) {
    return "This chart will be removed from synchronized playback. Its assigned analytical time roles will be retained.";
  }
  return "Synchronized playback will be removed unless a compatible time role is assigned.";
}

function playbackSelectionValue(selection) {
  if (selection?.mode === "role") return `role:${selection.roleId}`;
  if (selection?.mode === "remove") return "remove";
  return "";
}

function playbackSelectionFromValue(value) {
  if (value === "") return null;
  if (value === "remove") return { mode: "remove" };
  if (value.startsWith("role:")) {
    return { mode: "role", roleId: value.slice(5) };
  }
  return null;
}

function noop() {}
