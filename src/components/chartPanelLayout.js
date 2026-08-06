const PANEL_LAYOUT_CLASSES = Object.freeze({
  compact: "chart-panel-compact",
  standard: "chart-panel-standard",
  wide: "chart-panel-wide",
  full: "chart-panel-full",
});

export function chartPanelLayoutClass(size = "standard") {
  return PANEL_LAYOUT_CLASSES[size] ?? PANEL_LAYOUT_CLASSES.standard;
}
