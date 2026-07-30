import React from "react";

const POPOVER_EVENT = "simex:chart-source-popover";

export default function ChartPanelActions({
  chartId,
  citation,
  showFullscreen = true,
  selectionMode = false,
  fullscreenSelected = false,
  onFullscreen,
  onFullscreenHoldStart,
  onFullscreenHoldEnd,
}) {
  const [infoOpen, setInfoOpen] = React.useState(false);
  const railRef = React.useRef(null);
  React.useEffect(() => {
    const closeCompeting = (event) => {
      if (event.detail?.chartId !== chartId) setInfoOpen(false);
    };
    const closeOutside = (event) => {
      if (!railRef.current?.contains(event.target)) setInfoOpen(false);
    };
    const closeEscape = (event) => {
      if (event.key === "Escape") setInfoOpen(false);
    };
    document.addEventListener(POPOVER_EVENT, closeCompeting);
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => {
      document.removeEventListener(POPOVER_EVENT, closeCompeting);
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, [chartId]);
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
    !selectionMode
      ? React.createElement(
          "button",
          {
            type: "button",
            className: "chart-panel-icon-button",
            "aria-label": "Show source information",
            "aria-expanded": infoOpen,
            title: "Source information",
            onClick: toggleInfo,
          },
          React.createElement(InfoIcon),
        )
      : null,
    showFullscreen ? React.createElement(
      "button",
      {
        type: "button",
        className: [
          "chart-panel-icon-button",
          fullscreenSelected ? "chart-panel-icon-button--selected" : "",
        ].filter(Boolean).join(" "),
        "aria-label": selectionMode
          ? fullscreenSelected
            ? "Remove chart from multi-fullscreen"
            : "Add chart to multi-fullscreen"
          : "Open chart fullscreen",
        "aria-pressed": selectionMode ? fullscreenSelected : undefined,
        title: selectionMode
          ? fullscreenSelected
            ? "Selected for multi-fullscreen"
            : "Add to multi-fullscreen"
          : "Fullscreen",
        onPointerDown: selectionMode ? undefined : onFullscreenHoldStart,
        onPointerUp: selectionMode ? undefined : onFullscreenHoldEnd,
        onPointerCancel: selectionMode ? undefined : onFullscreenHoldEnd,
        onPointerLeave: selectionMode ? undefined : onFullscreenHoldEnd,
        onClick: onFullscreen,
      },
      fullscreenSelected
        ? React.createElement(FullscreenSelectedIcon)
        : React.createElement(FullscreenIcon),
    ) : null,
  );
}

function InfoIcon() {
  return React.createElement(
    "svg",
    { viewBox: "0 0 24 24", "aria-hidden": "true" },
    React.createElement("circle", { cx: 12, cy: 12, r: 9 }),
    React.createElement("path", { d: "M12 10v6" }),
    React.createElement("path", { d: "M12 7h.01" }),
  );
}

function FullscreenIcon() {
  return React.createElement(
    "svg",
    { viewBox: "0 0 24 24", "aria-hidden": "true" },
    React.createElement("path", { d: "M8 3H3v5" }),
    React.createElement("path", { d: "M16 3h5v5" }),
    React.createElement("path", { d: "M21 16v5h-5" }),
    React.createElement("path", { d: "M3 16v5h5" }),
  );
}

function FullscreenSelectedIcon() {
  return React.createElement(
    "svg",
    { viewBox: "0 0 24 24", "aria-hidden": "true" },
    React.createElement("path", { d: "M8 3H3v5" }),
    React.createElement("path", { d: "M16 3h5v5" }),
    React.createElement("path", { d: "M21 16v5h-5" }),
    React.createElement("path", { d: "M3 16v5h5" }),
    React.createElement("path", {
      className: "chart-fullscreen-checkmark",
      d: "m7.5 12 3 3 6-7",
    }),
  );
}
