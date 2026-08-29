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

export default function ChartQuickEditor({
  session,
  disabled = false,
  onDraftChange = noop,
  onSave = noop,
  onReset = noop,
  onClose = noop,
  onRemove = noop,
  onOpenFullEditor = noop,
} = {}) {
  if (session?.activeSurface !== "quick") return null;

  const chart = session.draft;
  const model = buildQuickEditorFormModel({ chart });
  const dirty = isChartEditSessionDirty(session);
  const saving = session.status === "saving";
  const locked = disabled || saving;
  const changeDraft = (path, value) => {
    if (locked) return;
    onDraftChange(updateQuickChartDraft(chart, path, value));
  };
  const submit = (event) => {
    event?.preventDefault?.();
    if (locked || !dirty || !model.valid) return;
    return onSave();
  };
  const invokeWhileUnlocked = (callback) => () => {
    if (!locked) callback();
  };

  return React.createElement(
    "div",
    { className: "chart-editor-inspector chart-quick-editor-inspector" },
    React.createElement(
      "aside",
      {
        className: "chart-editor-v3 chart-quick-editor",
        "aria-labelledby": "chart-quick-editor-title",
        "aria-busy": locked ? "true" : undefined,
        "aria-disabled": locked ? "true" : undefined,
        inert: locked ? "" : undefined,
        "data-chart-edit-status": session.status,
        "data-chart-edit-dirty": dirty ? "true" : "false",
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
        React.createElement(
          "div",
          { className: "chart-editor-layout chart-quick-editor-layout" },
          React.createElement(ChartFootprintPicker, {
            value: resolveChartFootprint(chart.layout),
            disabled: locked,
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
          React.createElement(
            "button",
            {
              type: "button",
              className: "secondary chart-quick-editor-open-full",
              disabled: locked,
              onClick: invokeWhileUnlocked(onOpenFullEditor),
            },
            "Open full editor",
          ),
        ),
        session.error
          ? React.createElement(
              "p",
              { className: "wizard-error chart-editor-error", role: "alert" },
              session.error.message,
            )
          : null,
        React.createElement(EditSessionActions, {
          valid: model.valid && dirty,
          submitting: saving,
          disabled,
          saveLabel: "Save",
          resetLabel: "Reset",
          cancelLabel: "Close",
          onRequestReset: invokeWhileUnlocked(onReset),
          onCancel: invokeWhileUnlocked(onClose),
          onRemove: invokeWhileUnlocked(onRemove),
        }),
      ),
    ),
  );
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

function noop() {}
