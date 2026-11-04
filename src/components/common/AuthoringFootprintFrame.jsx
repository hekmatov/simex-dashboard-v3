import React from "react";

import { chartPanelFootprintStyle, resolveChartFootprint } from "../chartPanelLayout.js";
import { chartFootprintPixelSize } from "../chartStageGeometry.js";
import { authoringStageScale, useAuthoringDestinationGeometry } from "../chart-authoring/AuthoringStage.jsx";
import LayoutGrid from "../LayoutGrid.jsx";

// Lay out at the destination's logical width, then scale the complete panel.
export default function AuthoringFootprintFrame({
  layout, kind, className = "", children, destination, deviceLayout = "desktop",
  canvasWidth, fit: controlledFit,
} = {}) {
  const geometry = useAuthoringDestinationGeometry({ destination, deviceLayout, canvasWidth });
  const footprint = resolveChartFootprint(layout);
  const size = chartFootprintPixelSize(footprint, geometry);
  const [fit, setFit] = React.useState("fit");
  const mode = controlledFit ?? fit;
  const viewport = React.useRef(null);
  const [availableWidth, setAvailableWidth] = React.useState(size.width);
  React.useLayoutEffect(() => {
    const measure = () => setAvailableWidth(viewport.current?.clientWidth || size.width);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    if (viewport.current) observer?.observe(viewport.current);
    window.addEventListener("resize", measure);
    measure();
    return () => { observer?.disconnect(); window.removeEventListener("resize", measure); };
  }, [size.width]);
  // The editor owns vertical scrolling; Fit only scales an over-wide panel.
  const scale = authoringStageScale(size, { fit: mode, availableWidth });
  return (
    <div className={`authoring-stage app-frame ${className}`} data-stage-width={size.width} data-stage-height={size.height} data-stage-scale={scale} data-stage-fit={mode}>
      <div className="authoring-stage__toolbar" role="group" aria-label="Preview size">
        <button type="button" className="secondary" aria-pressed={mode === "fit"} onClick={() => setFit("fit")}>Fit</button>
        <button type="button" className="secondary" aria-pressed={mode === "actual"} onClick={() => setFit("actual")}>Actual</button>
      </div>
      <p className="authoring-stage__caption">{size.width} × {size.height} on the dashboard · {Math.round(scale * 100)}%</p>
      <div ref={viewport} className="authoring-stage__viewport" tabIndex={mode === "actual" ? 0 : undefined} aria-label={mode === "actual" ? "Actual-size panel; scroll to inspect" : undefined}>
        <div className="authoring-stage__space" style={{ width: size.width * scale, height: size.height * scale }}>
          <div className="authoring-stage__canvas canonical-dashboard-frame" style={{ width: size.width, height: size.height, transform: `scale(${scale})` }}>
            <LayoutGrid geometry={{ ...geometry, columns: footprint.columns }}>
              <article className="chart-panel chart-panel-footprint" data-authoring-footprint={kind} style={chartPanelFootprintStyle(layout)}>
                <div className="chart-view-frame">{children}</div>
              </article>
            </LayoutGrid>
          </div>
        </div>
      </div>
    </div>
  );
}
