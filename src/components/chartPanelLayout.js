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
    && Number.isInteger(rows)
    && rows >= 1
    && rows <= 2
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
  };
}

export function legacySizeForFootprint({ columns, rows }) {
  if (columns === 1 && rows === 1) return "compact";
  if (columns === 4 && rows === 1) return "wide";
  if (columns === 4 && rows === 2) return "full";
  return "standard";
}
