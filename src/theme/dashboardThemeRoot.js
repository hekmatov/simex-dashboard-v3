const THEME_DATASET_FIELDS = Object.freeze([
  ["dashboardStyle", "data-dashboard-style"],
  ["dashboardColorProfile", "data-dashboard-color-profile"],
  ["chartColorMode", "data-chart-color-mode"],
  ["appearancePreference", "data-appearance-preference"],
  ["resolvedAppearance", "data-resolved-appearance"],
]);

export function dashboardThemeRootProps(themeProjection = {}, localStyle = {}) {
  return {
    ...Object.fromEntries(THEME_DATASET_FIELDS.map(
      ([field, attribute]) => [attribute, themeProjection?.[field]],
    )),
    style: {
      ...(themeProjection?.cssVariables ?? {}),
      ...localStyle,
    },
  };
}

export function captureDashboardThemeProjection(root) {
  const cssVariables = {};
  if (root?.style && typeof root.style[Symbol.iterator] === "function") {
    for (const property of root.style) {
      if (!property.startsWith("--simex-")) continue;
      const value = root.style.getPropertyValue(property).trim();
      if (value) cssVariables[property] = value;
    }
  }
  return {
    ...Object.fromEntries(THEME_DATASET_FIELDS.map(
      ([field]) => [field, root?.dataset?.[field]],
    )),
    cssVariables,
  };
}
