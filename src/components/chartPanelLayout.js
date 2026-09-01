const LEGACY_FOOTPRINTS = Object.freeze({
  compact: Object.freeze({ columns: 1, rows: 1 }),
  standard: Object.freeze({ columns: 2, rows: 1 }),
  wide: Object.freeze({ columns: 4, rows: 1 }),
  full: Object.freeze({ columns: 4, rows: 2 }),
});

const PANEL_LAYOUT_CLASSES = Object.freeze({
  compact: "chart-panel-compact",
  standard: "chart-panel-standard",
  wide: "chart-panel-wide",
  full: "chart-panel-full",
});

export const FOOTPRINT_ROW_HEIGHTS = Object.freeze([
  0.25,
  0.5,
  0.75,
  1,
  1.25,
  1.5,
  1.75,
  2,
]);

export function isSupportedFootprintRowHeight(rows) {
  return FOOTPRINT_ROW_HEIGHTS.includes(rows);
}

export function chartFootprintRowSpan(rows) {
  return isSupportedFootprintRowHeight(rows) ? Math.round(rows * 4) : 4;
}

export function chartPanelLayoutClass(size = "standard") {
  return PANEL_LAYOUT_CLASSES[size] ?? PANEL_LAYOUT_CLASSES.standard;
}

export function resolveChartFootprint(layout = {}) {
  const columns = layout?.width;
  const rows = layout?.height;
  if (
    Number.isInteger(columns)
    && columns >= 1
    && columns <= 4
    && isSupportedFootprintRowHeight(rows)
  ) {
    return { columns, rows };
  }
  const fallback = LEGACY_FOOTPRINTS[layout?.size] ?? LEGACY_FOOTPRINTS.standard;
  return { ...fallback };
}

export function chartPanelFootprintStyle(layout = {}) {
  const footprint = resolveChartFootprint(layout);
  return {
    "--chart-footprint-columns": footprint.columns,
    "--chart-footprint-rows": footprint.rows,
    "--chart-footprint-row-span": chartFootprintRowSpan(footprint.rows),
  };
}

export function legacySizeForFootprint({ columns, rows }) {
  if (columns === 1 && rows === 1) return "compact";
  if (columns === 4 && rows === 1) return "wide";
  if (columns === 4 && rows === 2) return "full";
  return "standard";
}
