import React from "react";
import { chartPanelFootprintStyle, chartPanelLayoutClass } from "../chartPanelLayout.js";
import { MOBILE_VIEW_QUERY } from "../common/useMediaQuery.js";
import { observeDeferredPanel, shouldDeferPanel } from "./deferredPanelVisibility.js";

export default function DeferredPanelMount({ chart, surface, eager, selected, children }) {
  const defer = shouldDeferPanel({ surface, eager, selected, typeId: chart.typeId });
  const [mounted, setMounted] = React.useState(!defer);
  const root = React.useRef(null);
  React.useEffect(() => {
    if (!defer) { setMounted(true); return; }
    if (mounted) return;
    return observeDeferredPanel(root.current, () => setMounted(true), {
      prioritizeVisible: window.matchMedia?.(MOBILE_VIEW_QUERY).matches === true,
    });
  }, [defer, mounted]);
  React.useEffect(() => {
    const reveal = () => setMounted(true);
    window.addEventListener("beforeprint", reveal);
    return () => window.removeEventListener("beforeprint", reveal);
  }, []);
  // Build and capture/export surfaces do not introduce an extra layout owner.
  if (surface !== "view" || !shouldDeferPanel({ surface, typeId: chart.typeId })) return children;
  return <div ref={root}
    className={`deferred-panel-mount chart-panel-footprint ${chartPanelLayoutClass(chart.layout?.size)}`}
    style={chartPanelFootprintStyle(chart.layout)}
    data-deferred-panel={chart.id} data-panel-mounted={mounted || !defer ? "true" : "false"}
    data-canonical-panel-id={mounted || !defer ? undefined : chart.id}
    tabIndex={-1}>
    {mounted || !defer ? children : <button type="button" className="chart-panel-placeholder"
      onFocus={() => { setMounted(true); root.current?.focus({ preventScroll: true }); }}
      onClick={() => setMounted(true)}>Load chart: {chart.title || "Untitled chart"}</button>}
  </div>;
}
