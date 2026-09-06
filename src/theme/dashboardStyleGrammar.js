// One family across PDPC View, including tables and authored code. Calibri is
// the guide fallback when the host does not provide licensed Avenir fonts.
const PDPC_FONT_STACK = 'Avenir, "Avenir Next", Calibri, "SimEx Inter", sans-serif';
const SURFACE_ROLES = Object.freeze([
  "shell", "command-bar", "panel", "editor", "dialog", "drawer", "menu", "status", "table", "chart-cell",
]);

const STYLE_GRAMMARS = Object.freeze({
  "evidence-ledger": Object.freeze({
    bodyFont: '"SimEx Inter", Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    headingFont: 'Georgia, "Times New Roman", serif',
    headingWeight: "500",
    headingTracking: "-0.015em",
    panelRadius: "2px",
    controlRadius: "2px",
    surfaceRadius: "2px",
    transitionDuration: "140ms",
    shadow: Object.freeze({ light: "none", dark: "none" }),
    shellShadow: Object.freeze({ light: "none", dark: "none" }),
    roleBackground: "none",
    registerBackground: "repeating-linear-gradient(to bottom, transparent 0, transparent 31px, var(--simex-border-subtle) 32px)",
    roleBorder: "var(--simex-border-strong)",
    roleDivider: "var(--simex-border-strong)",
    roleRail: "none",
    edgeBlockStart: "0px",
    edgeInlineEnd: "0px",
    edgeBlockEnd: "0px",
    edgeInlineStart: "0px",
  }),
  "humanist-standard": Object.freeze({
    bodyFont: 'Segoe UI Variable Text, "Trebuchet MS", "Segoe UI", ui-sans-serif, system-ui, sans-serif',
    headingFont: 'Segoe UI Variable Display, "Trebuchet MS", "Segoe UI", ui-sans-serif, system-ui, sans-serif',
    headingWeight: "650",
    headingTracking: "-0.012em",
    panelRadius: "14px",
    controlRadius: "10px",
    surfaceRadius: "18px",
    transitionDuration: "180ms",
    shadow: Object.freeze({
      light: "0 8px 20px color-mix(in srgb, var(--simex-text-strong) 10%, transparent)",
      dark: "0 10px 24px color-mix(in srgb, var(--simex-surface-outer) 24%, transparent)",
    }),
    shellShadow: Object.freeze({
      light: "0 16px 38px color-mix(in srgb, var(--simex-text-strong) 12%, transparent)",
      dark: "0 16px 38px color-mix(in srgb, var(--simex-surface-outer) 48%, transparent)",
    }),
    roleBackground: "linear-gradient(color-mix(in srgb, var(--simex-surface-panel-alt) 28%, transparent), color-mix(in srgb, var(--simex-surface-panel-alt) 28%, transparent))",
    registerBackground: "none",
    roleBorder: "color-mix(in srgb, var(--simex-border-subtle) 78%, transparent)",
    roleDivider: "color-mix(in srgb, var(--simex-border-subtle) 64%, transparent)",
    roleRail: "none",
    edgeBlockStart: "0px",
    edgeInlineEnd: "0px",
    edgeBlockEnd: "0px",
    edgeInlineStart: "0px",
  }),
  "signal-instrument": Object.freeze({
    bodyFont: 'Segoe UI Variable Text, "Segoe UI", ui-sans-serif, system-ui, sans-serif',
    headingFont: 'Bahnschrift, "Segoe UI Variable Display", "Segoe UI", ui-sans-serif, system-ui, sans-serif',
    headingWeight: "650",
    headingTracking: "0.012em",
    panelRadius: "4px",
    controlRadius: "3px",
    surfaceRadius: "6px",
    transitionDuration: "95ms",
    shadow: Object.freeze({
      light: "0 1px 2px color-mix(in srgb, var(--simex-text-strong) 14%, transparent), inset 0 1px 0 color-mix(in srgb, var(--simex-surface-panel) 55%, transparent)",
      dark: "0 1px 2px color-mix(in srgb, var(--simex-surface-outer) 38%, transparent), inset 0 1px 0 color-mix(in srgb, var(--simex-text-strong) 6%, transparent)",
    }),
    shellShadow: Object.freeze({
      light: "0 4px 12px color-mix(in srgb, var(--simex-text-strong) 14%, transparent), inset 0 1px 0 color-mix(in srgb, var(--simex-surface-panel) 45%, transparent)",
      dark: "0 4px 12px color-mix(in srgb, var(--simex-surface-outer) 32%, transparent), inset 0 1px 0 color-mix(in srgb, var(--simex-text-strong) 6%, transparent)",
    }),
    roleBackground: "linear-gradient(to bottom, var(--simex-border-subtle) 0 1px, transparent 1px 100%)",
    registerBackground: "none",
    roleBorder: "var(--simex-border-strong)",
    roleDivider: "var(--simex-border-subtle)",
    roleRail: "linear-gradient(to right, var(--simex-accent) 0 3px, transparent 3px 100%)",
    edgeBlockStart: "1px",
    edgeInlineEnd: "0px",
    edgeBlockEnd: "0px",
    edgeInlineStart: "3px",
  }),
});

export function resolveDashboardStyleGrammar(
  dashboardStyle = "evidence-ledger",
  resolvedAppearance = "light",
) {
  const grammar = dashboardStyle === "pdpc"
    ? {
        ...STYLE_GRAMMARS["evidence-ledger"],
        bodyFont: PDPC_FONT_STACK,
        headingFont: PDPC_FONT_STACK,
        headingWeight: "900",
        headingTracking: "normal",
      }
    : STYLE_GRAMMARS[dashboardStyle] ?? STYLE_GRAMMARS["evidence-ledger"];
  const appearance = resolvedAppearance === "dark" ? "dark" : "light";
  return Object.freeze({
    "--simex-style-body-font": grammar.bodyFont,
    "--simex-style-heading-font": grammar.headingFont,
    "--simex-style-heading-weight": grammar.headingWeight,
    "--simex-style-heading-tracking": grammar.headingTracking,
    "--simex-style-panel-radius": grammar.panelRadius,
    "--simex-style-control-radius": grammar.controlRadius,
    "--simex-style-surface-radius": grammar.surfaceRadius,
    "--simex-style-transition-duration": grammar.transitionDuration,
    "--simex-style-panel-shadow": grammar.shadow[appearance],
    "--simex-style-shell-shadow": grammar.shellShadow[appearance],
    "--simex-style-role-border": grammar.roleBorder,
    "--simex-style-role-divider": grammar.roleDivider,
    "--simex-style-role-rail": grammar.roleRail,
    "--simex-style-edge-block-start": grammar.edgeBlockStart,
    "--simex-style-edge-inline-end": grammar.edgeInlineEnd,
    "--simex-style-edge-block-end": grammar.edgeBlockEnd,
    "--simex-style-edge-inline-start": grammar.edgeInlineStart,
    "--simex-material-ledger-register-background": grammar.registerBackground,
    ...Object.fromEntries(SURFACE_ROLES.map((role) => [
      `--simex-role-${role}-background`,
      grammar.roleBackground,
    ])),
  });
}
