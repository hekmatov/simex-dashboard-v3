import React from "react";
import { IconControl } from "../common/SimExIcon.js";
import SourceCsvViewerButton from "../source-data/SourceCsvViewerButton.jsx";

const POPOVER_EVENT = "simex:chart-source-popover";

export default function ChartPanelActions({
  chartId,
  chartTitle,
  variableId,
  sourceId,
  source,
  citation,
  staticContent = false,
  showSourceActions = true,
  showFullscreen = true,
  selectionMode = false,
  fullscreenSelected = false,
  fullscreenSelectionIndex = 0,
  onFullscreen,
  onFullscreenHoldStart,
  onFullscreenHoldEnd,
}) {
  const [infoOpen, setInfoOpen] = React.useState(false);
  const railRef = React.useRef(null);
  React.useEffect(() => {
    if (!infoOpen) return undefined;
    const closeCompeting = (event) => {
      if (event.detail?.chartId !== chartId) setInfoOpen(false);
    };
    const closeOutside = (event) => {
      if (!railRef.current?.contains(event.target)) setInfoOpen(false);
    };
    const closeEscape = (event) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      setInfoOpen(false);
    };
    document.addEventListener(POPOVER_EVENT, closeCompeting);
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => {
      document.removeEventListener(POPOVER_EVENT, closeCompeting);
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, [chartId, infoOpen]);
  React.useEffect(() => {
    if (selectionMode) setInfoOpen(false);
  }, [selectionMode]);

  const toggleInfo = () => {
    setInfoOpen((current) => {
      const next = !current;
      if (next) {
        document.dispatchEvent(new CustomEvent(POPOVER_EVENT, {
          detail: { chartId },
        }));
      }
      return next;
    });
  };

  return React.createElement(
    "div",
    {
      ref: railRef,
      className: selectionMode
        ? "chart-panel-action-rail chart-panel-action-rail--selection"
        : "chart-panel-action-rail",
    },
    !selectionMode && infoOpen
      ? React.createElement(
          "div",
          { className: "chart-source-popover", role: "status" },
          React.createElement("strong", null, "Source"),
          React.createElement("span", null, citation || "Unavailable"),
        )
      : null,
    !selectionMode && !staticContent && showSourceActions
      ? React.createElement(SourceCsvViewerButton, {
          sourceId,
          source,
          context: { chartId, chartTitle, variableId },
          className: "chart-panel-icon-button",
          interactionId: "panel.view-source-csv",
        })
      : null,
    !selectionMode && !staticContent && showSourceActions
      ? React.createElement(IconControl, {
          interactionId: "panel.view-source-information",
          className: "chart-panel-icon-button",
          "aria-label": "Show chart details",
          "aria-expanded": infoOpen,
          title: "Details",
          onClick: toggleInfo,
        })
      : null,
    showFullscreen ? React.createElement(IconControl, {
      interactionId: fullscreenSelected
        ? `fullscreen.select.${Math.min(4, Math.max(1, fullscreenSelectionIndex))}`
        : "fullscreen.open",
      className: [
        "chart-panel-icon-button",
        fullscreenSelected ? "chart-panel-icon-button--selected" : "",
      ].filter(Boolean).join(" "),
      "aria-label": selectionMode
        ? fullscreenSelected
          ? "Remove chart from comparison"
          : "Add chart to comparison"
        : "Focus chart",
      "aria-pressed": selectionMode ? fullscreenSelected : undefined,
      tooltip: selectionMode
        ? fullscreenSelected
          ? `${fullscreenSelectionIndex} of 4 selected`
          : "Add to comparison"
        : "Fullscreen",
      title: selectionMode
        ? fullscreenSelected
          ? "Selected for comparison"
          : "Add to comparison"
        : "Fullscreen",
      onPointerDown: selectionMode ? undefined : onFullscreenHoldStart,
      onPointerUp: selectionMode ? undefined : onFullscreenHoldEnd,
      onPointerCancel: selectionMode ? undefined : onFullscreenHoldEnd,
      onPointerLeave: selectionMode ? undefined : onFullscreenHoldEnd,
      onClick: onFullscreen,
    }) : null,
  );
}
