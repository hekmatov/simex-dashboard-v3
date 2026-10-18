import React from "react";

import { chartPanelFootprintStyle } from "../chartPanelLayout.js";
import { layoutGridGeometryStyle } from "../chartStageGeometry.js";

export default function AuthoringFootprintFrame({ layout, kind, className = "", children } = {}) {
  const gridClassName = ["authoring-footprint-grid", className].filter(Boolean).join(" ");
  return (
    <div className={gridClassName} style={{ ...layoutGridGeometryStyle(), ...chartPanelFootprintStyle(layout) }}>
      <div className="authoring-footprint-frame" data-authoring-footprint={kind}>
        {children}
      </div>
    </div>
  );
}
