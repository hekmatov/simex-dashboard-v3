import React from "react";

import ModalFocusScope from "./common/ModalFocusScope.jsx";
import SourceCsvViewerButton from "./source-data/SourceCsvViewerButton.jsx";

export default function SourceViewer({
  open = false,
  chartId,
  sourceId,
  source,
  status = "ready",
  error = "",
  restoration = null,
  onClose = noop,
  onRestore = noop,
  onRetry = noop,
} = {}) {
  const dismiss = React.useMemo(
    () => createSourceViewerDismissHandler({ restoration, onClose, onRestore }),
    [onClose, onRestore, restoration],
  );
  if (!open) return null;

  const metadata = sourceViewerMetadata(sourceId, source);
  const dialogId = `source-viewer-${safeId(chartId ?? sourceId)}`;
  return React.createElement(
    ModalFocusScope,
    {
      as: "aside",
      open,
      initialFocusSelector: "[data-modal-initial-focus=\"true\"]",
      onEscape: () => dismiss("escape"),
      className: "source-viewer-backdrop dashboard-dialog-backdrop",
      onPointerDown: (event) => event.stopPropagation(),
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": `${dialogId}-title`,
      tabIndex: -1,
      "data-chart-id": chartId,
    },
    React.createElement(
      "section",
      { className: "source-viewer-panel dashboard-dialog dashboard-dialog--workspace dashboard-dialog--wide" },
      React.createElement(
        "header",
        { className: "source-viewer-panel-header dashboard-dialog__header" },
        React.createElement(
          "div",
          null,
          React.createElement("p", { className: "source-viewer-eyebrow" }, "Chart source"),
          React.createElement("h2", { id: `${dialogId}-title` }, metadata.label),
        ),
        React.createElement(
          "button",
          {
            type: "button",
            className: "secondary",
            "aria-label": "Close source viewer",
            "data-modal-initial-focus": "true",
            onClick: () => dismiss("close-button"),
          },
          "Close",
        ),
      ),
      React.createElement(
        "dl",
        { className: "source-viewer-metadata" },
        metadata.items.flatMap(({ label, value, id }) => [
          React.createElement("dt", { key: `${id}-label` }, label),
          React.createElement("dd", { key: `${id}-value` }, value),
        ]),
      ),
      status === "loading"
        ? React.createElement("p", { role: "status" }, "Loading source details…")
        : null,
      status === "error"
        ? React.createElement(
            "div",
            { className: "source-viewer-recovery" },
            React.createElement(
              "p",
              { role: "alert" },
              boundedMessage(error),
            ),
            React.createElement(
              "button",
              { type: "button", className: "secondary", onClick: onRetry },
              "Retry",
            ),
          )
        : null,
      status === "ready"
        ? React.createElement(SourceCsvViewerButton, {
            sourceId,
            source,
            interactionId: "panel.view-source-csv",
          })
        : null,
    ),
  );
}

export function createSourceViewerDismissHandler({
  restoration = null,
  onClose = noop,
  onRestore = noop,
} = {}) {
  let dismissed = false;
  return (reason = "close-button") => {
    if (dismissed) return false;
    dismissed = true;
    onClose(reason);
    onRestore(restoration);
    return true;
  };
}

export function sourceViewerMetadata(sourceId, source) {
  const label = nonEmpty(source?.provenance?.label)
    ?? nonEmpty(source?.fileName)
    ?? nonEmpty(sourceId)
    ?? "Unavailable source";
  const candidates = [
    ["source-id", "Source ID", nonEmpty(sourceId)],
    ["provider", "Provider", nonEmpty(source?.provenance?.provider)],
    ["file", "Original file", nonEmpty(source?.fileName)],
    ["retrieved", "Retrieved", nonEmpty(source?.provenance?.retrievedAt)],
  ];
  return {
    label,
    items: candidates
      .filter(([, , value]) => value)
      .map(([id, itemLabel, value]) => ({ id, label: itemLabel, value })),
  };
}

function boundedMessage(value) {
  const message = nonEmpty(value) ?? "The source details could not be loaded.";
  return message.length <= 240 ? message : `${message.slice(0, 239)}…`;
}

function safeId(value) {
  const normalized = nonEmpty(value) ?? "source";
  return normalized.replace(/[^a-zA-Z0-9_-]+/g, "-");
}

function nonEmpty(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function noop() {}
