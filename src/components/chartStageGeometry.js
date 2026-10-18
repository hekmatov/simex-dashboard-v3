import { chartFootprintRowSpan } from "./chartPanelLayout.js";

// canvasWidth is the section grid's padding-box width, excluding the outer
// dashboard frame's border. Pass the destination's effective width under rails,
// rather than its canonical maximum, when calculating a preview footprint.
export const CANVAS_GEOMETRY = Object.freeze({
  desktop: Object.freeze({ canvasWidth: 1392, sectionPaddingInline: 18, columns: 4, gap: 16, rowHeight: 38.25 }),
  tablet: Object.freeze({ canvasWidth: 1180, sectionPaddingInline: 18, columns: 4, gap: 16, rowHeight: 41 }),
});

export function resolveCanvasGeometry({ deviceLayout = "desktop", canvasWidth } = {}) {
  const geometry = CANVAS_GEOMETRY[deviceLayout] ?? CANVAS_GEOMETRY.desktop;
  const minimumWidth = geometry.sectionPaddingInline * 2 + geometry.gap * (geometry.columns - 1);
  return Number.isFinite(canvasWidth) && canvasWidth > minimumWidth
    ? Object.freeze({ ...geometry, canvasWidth })
    : geometry;
}

export function chartFootprintPixelSize(footprint, geometry = CANVAS_GEOMETRY.desktop) {
  const innerWidth = geometry.canvasWidth - geometry.sectionPaddingInline * 2;
  const columnWidth = (innerWidth - geometry.gap * (geometry.columns - 1)) / geometry.columns;
  const rowSpan = chartFootprintRowSpan(footprint.rows);
  return Object.freeze({
    width: columnWidth * footprint.columns + geometry.gap * (footprint.columns - 1),
    height: geometry.rowHeight * rowSpan + geometry.gap * (rowSpan - 1),
  });
}

export function layoutGridGeometryStyle(geometry = CANVAS_GEOMETRY.desktop) {
  return {
    "--layout-grid-columns": geometry.columns,
    "--layout-grid-gap": `${geometry.gap}px`,
    "--layout-grid-row-height": `${geometry.rowHeight}px`,
    "--layout-grid-tablet-row-height": `${CANVAS_GEOMETRY.tablet.rowHeight}px`,
    "--layout-grid-padding-inline": `${geometry.sectionPaddingInline}px`,
  };
}
