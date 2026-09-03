import React from "react";

import { isChartEditSessionDirty } from "../../charting/forms/chartEditSession.js";
import { buildQuickEditorFormModel } from "../../charting/forms/formModel.js";
import {
  legacySizeForFootprint,
  resolveChartFootprint,
} from "../chartPanelLayout.js";
import ChartFootprintPicker from "./ChartFootprintPicker.jsx";
import EditSessionActions from "./EditSessionActions.jsx";
import GeneratedFormSection from "./GeneratedFormSection.jsx";

const DANGEROUS_PATH_SEGMENTS = new Set([
  "__proto__",
  "prototype",
  "constructor",
]);
const SAVE_UNAVAILABLE_REASON = "Saving is unavailable for this chart session.";
const REMOVE_UNAVAILABLE_REASON = "Removing is unavailable for this chart session.";
const FULL_EDITOR_UNAVAILABLE_REASON = "Full editing is unavailable for this chart session.";

export default function ChartQuickEditor({
  session,
  profile,
  disabled = false,
  onDraftChange = noop,
  onSave,
  onReset = noop,
  onClose = noop,
  onRemove,
  onOpenFullEditor,
} = {}) {
  if (session?.activeSurface !== "quick") return null;

  const chart = session.draft;
  const model = buildQuickEditorFormModel({ chart, profile });
  const dirty = isChartEditSessionDirty(session);
  const saving = session.status === "saving";
  const locked = disabled || saving;
  const saveAvailable = typeof onSave === "function";
  const removeAvailable = typeof onRemove === "function";
  const fullEditorAvailable = typeof onOpenFullEditor === "function";
  const changeDraft = (path, value) => {
    if (locked) return;
    onDraftChange(updateQuickChartDraft(chart, path, value));
  };
  const submit = (event) => {
    event?.preventDefault?.();
    if (locked || !saveAvailable || !dirty || !model.valid) return;
    return onSave();
  };
  const invokeWhileUnlocked = (callback) => () => {
    if (!locked) callback?.();
  };

  return React.createElement(
    "div",
    { className: "chart-editor-inspector chart-quick-editor-inspector" },
    React.createElement(
      "aside",
      {
        ref: (root) => assignQuickEditorControlIds(root, session.placementId),
        className: "chart-editor-v3 chart-quick-editor",
        "aria-labelledby": "chart-quick-editor-title",
        "aria-busy": locked ? "true" : undefined,
        "aria-disabled": locked ? "true" : undefined,
        inert: disabled && !saving ? true : undefined,
        "data-chart-quick-placement-id": session.placementId,
        "data-chart-edit-status": session.status,
        "data-chart-edit-dirty": dirty ? "true" : "false",
        onFocusCapture: (event) => assignQuickEditorControlIds(
          event.currentTarget,
          session.placementId,
        ),
      },
      React.createElement(
        "form",
        { onSubmit: submit },
        React.createElement(
          "header",
          { className: "chart-editor-header chart-quick-editor-header" },
          React.createElement(
            "div",
            null,
            React.createElement("p", { className: "eyebrow" }, "Quick edit"),
            React.createElement(
              "h2",
              { id: "chart-quick-editor-title" },
              chart.title?.trim() || "Untitled chart",
            ),
          ),
        ),
        React.createElement(EditSessionActions, {
          className: "chart-quick-editor-actions",
          leadingAction: {
            interactionId: "shell.open-editable-tab",
            ariaLabel: "Open full editor",
            tooltip: "Open full editor",
            disabled: locked || !fullEditorAvailable,
            disabledReason: fullEditorAvailable ? "" : FULL_EDITOR_UNAVAILABLE_REASON,
            onClick: invokeWhileUnlocked(onOpenFullEditor),
          },
          valid: model.valid && dirty,
          submitting: saving,
          disabled,
          saveDisabled: !saveAvailable,
          saveDisabledReason: SAVE_UNAVAILABLE_REASON,
          removeDisabled: !removeAvailable,
          removeDisabledReason: REMOVE_UNAVAILABLE_REASON,
          saveLabel: "Save",
          resetLabel: "Reset",
          cancelLabel: "Close",
          onRequestReset: invokeWhileUnlocked(onReset),
          onCancel: invokeWhileUnlocked(onClose),
          onRemove: invokeWhileUnlocked(onRemove),
        }),
        React.createElement(
          "div",
          { className: "chart-editor-layout chart-quick-editor-layout" },
          React.createElement(ChartFootprintPicker, {
            value: resolveChartFootprint(chart.layout),
            disabled: locked || chart.typeId === "gauge",
            onChange: ({ columns, rows }) => changeDraft(
              ["layout"],
              {
                ...(chart.layout ?? {}),
                size: legacySizeForFootprint({ columns, rows }),
                width: columns,
                height: rows,
              },
            ),
          }),
          React.createElement(
            "fieldset",
            {
              className: "chart-quick-editor-fields",
              disabled: locked,
            },
            React.createElement(
              "legend",
              { className: "visually-hidden" },
              "Quick chart settings",
            ),
            React.createElement(GeneratedFormSection, {
              section: model.sections[0],
              chart,
              onChange: changeDraft,
            }),
          ),
        ),
        session.error
          ? React.createElement(
              "p",
              { className: "wizard-error chart-editor-error", role: "alert" },
              session.error.message,
            )
          : null,
      ),
    ),
  );
}

export function assignQuickEditorControlIds(root, placementId) {
  if (!root?.querySelectorAll) return root;
  const documentRef = root.ownerDocument;
  const prefix = `chart-quick-${safeControlId(placementId || "chart")}`;
  for (const control of root.querySelectorAll(
    "button, input, select, textarea",
  )) {
    if (control.id) continue;
    const semantic = quickControlSemanticId(control);
    let candidate = `${prefix}-${semantic}`;
    let suffix = 2;
    while (documentRef?.getElementById(candidate) && documentRef.getElementById(candidate) !== control) {
      candidate = `${prefix}-${semantic}-${suffix}`;
      suffix += 1;
    }
    control.id = candidate;
  }
  return root;
}

export function updateQuickChartDraft(chart, path, value) {
  if (!chart || typeof chart !== "object" || Array.isArray(chart)) {
    throw new TypeError("Quick chart updates require a chart draft.");
  }
  if (!Array.isArray(path) || path.length === 0) {
    throw new Error("Quick chart updates require a non-empty path.");
  }
  for (const segment of path) {
    if (
      (typeof segment !== "string" && !Number.isInteger(segment))
      || DANGEROUS_PATH_SEGMENTS.has(segment)
    ) {
      throw new Error(`Unsafe quick chart update path segment "${segment}".`);
    }
  }

  const root = { ...chart };
  let next = root;
  let current = chart;
  const ancestors = [];
  for (let index = 0; index < path.length - 1; index += 1) {
    const segment = path[index];
    const currentValue = current?.[segment];
    const child = Array.isArray(currentValue)
      ? [...currentValue]
      : isRecord(currentValue)
        ? { ...currentValue }
        : {};
    next[segment] = child;
    ancestors.push({ parent: next, key: segment, child });
    next = child;
    current = currentValue;
  }

  const leaf = path.at(-1);
  if (value === undefined) {
    delete next[leaf];
    for (let index = ancestors.length - 1; index >= 0; index -= 1) {
      const { parent, key, child } = ancestors[index];
      if (!isRecord(child) || Object.keys(child).length > 0) break;
      delete parent[key];
    }
  } else {
    next[leaf] = structuredClone(value);
  }
  return root;
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function quickControlSemanticId(control) {
  if (control.dataset?.controlTooltipAnchor === "true") {
    const ownedControl = control.querySelector?.(
      "[data-icon-control]",
    );
    const ownedId = ownedControl?.dataset?.iconControl || "disabled-control";
    return `${safeControlId(ownedId)}-reason`;
  }
  if (control.dataset?.iconControl) return safeControlId(control.dataset.iconControl);
  if (control.matches?.("[role='gridcell'][data-columns][data-rows]")) {
    return `footprint-${control.dataset.columns}x${control.dataset.rows}`;
  }
  const colorField = control.closest?.("[data-color-field]");
  const colorPrefix = colorField?.dataset?.colorField
    ? `${safeControlId(colorField.dataset.colorField)}-`
    : "";
  const label = control.getAttribute?.("aria-label")
    || control.closest?.("label")?.textContent
    || control.getAttribute?.("name")
    || control.getAttribute?.("type")
    || control.textContent
    || control.tagName;
  return `${colorPrefix}${safeControlId(label || "control")}`;
}

function safeControlId(value) {
  return String(value ?? "control")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "control";
}

function noop() {}
