const STYLE_GRAMMARS = Object.freeze({
  "evidence-ledger": Object.freeze({
    bodyFont: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    headingFont: 'Georgia, "Times New Roman", serif',
    dataFont: 'Georgia, "Times New Roman", serif',
    headingWeight: "500",
    headingTracking: "-0.015em",
    panelRadius: "2px",
    controlRadius: "2px",
    surfaceRadius: "2px",
    transitionDuration: "140ms",
    shadow: Object.freeze({ light: "none", dark: "none" }),
  }),
  "humanist-standard": Object.freeze({
    bodyFont: 'Segoe UI Variable Text, "Trebuchet MS", "Segoe UI", ui-sans-serif, system-ui, sans-serif',
    headingFont: 'Segoe UI Variable Display, "Trebuchet MS", "Segoe UI", ui-sans-serif, system-ui, sans-serif',
    dataFont: 'Segoe UI Variable Display, "Trebuchet MS", "Segoe UI", ui-sans-serif, system-ui, sans-serif',
    headingWeight: "650",
    headingTracking: "-0.012em",
    panelRadius: "14px",
    controlRadius: "10px",
    surfaceRadius: "18px",
    transitionDuration: "180ms",
    shadow: Object.freeze({
      light: "0 8px 20px rgb(36 57 52 / 10%)",
      dark: "0 10px 24px rgb(0 0 0 / 24%)",
    }),
  }),
  "signal-instrument": Object.freeze({
    bodyFont: 'Segoe UI Variable Text, "Segoe UI", ui-sans-serif, system-ui, sans-serif',
    headingFont: 'Bahnschrift, "Segoe UI Variable Display", "Segoe UI", ui-sans-serif, system-ui, sans-serif',
    dataFont: 'Cascadia Mono, "Segoe UI Mono", Consolas, ui-monospace, monospace',
    headingWeight: "650",
    headingTracking: "0.012em",
    panelRadius: "4px",
    controlRadius: "3px",
    surfaceRadius: "6px",
    transitionDuration: "95ms",
    shadow: Object.freeze({
      light: "0 1px 2px rgb(19 38 45 / 14%), inset 0 1px 0 rgb(255 255 255 / 55%)",
      dark: "0 1px 2px rgb(0 0 0 / 38%), inset 0 1px 0 rgb(255 255 255 / 6%)",
    }),
  }),
});

export function resolveDashboardStyleGrammar(
  dashboardStyle = "evidence-ledger",
  resolvedAppearance = "light",
) {
  const grammar = STYLE_GRAMMARS[dashboardStyle] ?? STYLE_GRAMMARS["evidence-ledger"];
  const appearance = resolvedAppearance === "dark" ? "dark" : "light";
  return Object.freeze({
    "--simex-style-body-font": grammar.bodyFont,
    "--simex-style-heading-font": grammar.headingFont,
    "--simex-style-data-font": grammar.dataFont,
    "--simex-style-heading-weight": grammar.headingWeight,
    "--simex-style-heading-tracking": grammar.headingTracking,
    "--simex-style-panel-radius": grammar.panelRadius,
    "--simex-style-control-radius": grammar.controlRadius,
    "--simex-style-surface-radius": grammar.surfaceRadius,
    "--simex-style-transition-duration": grammar.transitionDuration,
    "--simex-style-panel-shadow": grammar.shadow[appearance],
  });
}
