export const DASHBOARD_MODES = Object.freeze(["home", "view", "build", "present"]);
export const DEFAULT_DASHBOARD_MODE = "home";
const DASHBOARD_MODES_WITHOUT_HOME = Object.freeze(["view", "build", "present"]);
export const DASHBOARD_STORAGE_KEY =
  "simex-dashboard-config-v3-three-mode-v1";
export const DASHBOARD_MODE_STORAGE_KEY = "simex-dashboard-ui-mode-v1";

export function densityForDashboardMode(mode) {
  if (mode === "build") return "compact";
  if (mode === "present") return "spacious";
  return "comfortable";
}

export function isDashboardMode(mode) {
  return DASHBOARD_MODES.includes(mode);
}

export function isHomeEnabled(dashboard = {}) {
  return dashboard?.home?.enabled !== false;
}

export function availableDashboardModes(dashboard = {}) {
  return isHomeEnabled(dashboard) ? DASHBOARD_MODES : DASHBOARD_MODES_WITHOUT_HOME;
}

export function isAvailableDashboardMode(mode, dashboard = {}) {
  return availableDashboardModes(dashboard).includes(mode);
}

export function resolveInitialDashboardMode({ storedMode, requestedMode, dashboard } = {}) {
  if (isAvailableDashboardMode(requestedMode, dashboard)) return requestedMode;
  if (isAvailableDashboardMode(storedMode, dashboard)) return storedMode;
  return isHomeEnabled(dashboard) ? "home" : "view";
}

export function reconcileDashboardMode(mode, dashboard = {}) {
  return isAvailableDashboardMode(mode, dashboard)
    ? mode
    : isHomeEnabled(dashboard) ? "home" : "view";
}

export function reconcileLoadedDashboardMode(mode, dashboard = {}) {
  if (mode === null || mode === undefined) return mode;
  return reconcileDashboardMode(mode, dashboard);
}

export function readDashboardModePreference() {
  try {
    const storage = globalThis.localStorage;
    return storage?.getItem(DASHBOARD_MODE_STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

export function persistDashboardModePreference(mode) {
  if (!isDashboardMode(mode)) return false;
  try {
    const storage = globalThis.localStorage;
    if (!storage) return false;
    storage.setItem(DASHBOARD_MODE_STORAGE_KEY, mode);
    return true;
  } catch {
    return false;
  }
}
