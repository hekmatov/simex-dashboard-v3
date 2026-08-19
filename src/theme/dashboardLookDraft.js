const SIGNATURE_PROFILE_BY_STYLE = Object.freeze({
  "evidence-ledger": "evidence-ledger/brighter-vellum",
  "humanist-standard": "humanist-standard/common-ground",
  "signal-instrument": "signal-instrument/calibrated-steel",
});

export function createDashboardLookPreview(theme) {
  return {
    dashboardStyle: theme.dashboardStyle,
    dashboardColorProfile: theme.dashboardColorProfile,
    chartColorMode: theme.chartColorMode,
    appearancePreference: theme.appearancePreference,
    resolvedAppearance: theme.resolvedAppearance,
  };
}

export function dashboardLookUpdates(preview) {
  return {
    dashboardStyle: preview.dashboardStyle,
    dashboardColorProfile: preview.dashboardColorProfile,
  };
}

export function chartColorUpdates(preview) {
  return { chartColorMode: preview.chartColorMode };
}

export function signatureProfileForStyle(style) {
  return SIGNATURE_PROFILE_BY_STYLE[style] ?? null;
}

export function resolveDashboardLookSurfaceAttributes(preview = {}) {
  const appearancePreference = preview.appearancePreference ?? "system";
  return {
    style: preview.dashboardStyle,
    colorProfile: preview.dashboardColorProfile,
    resolvedAppearance: appearancePreference === "system"
      ? preview.resolvedAppearance ?? "light"
      : appearancePreference,
  };
}
