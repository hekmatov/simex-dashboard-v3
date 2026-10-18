import React from "react";
import { layoutGridGeometryStyle } from "./chartStageGeometry.js";

export default function LayoutGrid({ children, geometry }) {
  return <section className="layout-grid layout-two-column" style={layoutGridGeometryStyle(geometry)}>{children}</section>;
}
