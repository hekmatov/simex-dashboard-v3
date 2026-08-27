import React from "react";

const MODE_CONTEXT_LABELS = {
  home: "Home context",
  view: "View context",
  build: "Build context",
  present: "Present context",
};

export default function ModeContextStrip({ mode, contextNode, statusNode, disabledReason = "" }) {
  if (React.Children.count(contextNode) === 0 && !statusNode && !disabledReason) return null;
  const sharesViewBuildBlockSize = mode === "view" || mode === "build";
  return (
    <section
      className="mode-context-strip"
      data-command-crown-layer="context"
      data-mode-context-size={sharesViewBuildBlockSize ? "shared" : "mode-specific"}
      aria-label={MODE_CONTEXT_LABELS[mode] ?? "Mode context"}
    >
      <span className="mode-context-label">{MODE_CONTEXT_LABELS[mode] ?? "Mode context"}</span>
      <div className="mode-context-content">{contextNode}</div>
      {(statusNode || disabledReason) && (
        <div className="mode-context-status" role={disabledReason ? "status" : undefined}>
          {statusNode || disabledReason}
        </div>
      )}
    </section>
  );
}
