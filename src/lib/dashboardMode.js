export const DASHBOARD_MODES = Object.freeze(["view", "build", "present"]);
export const DEFAULT_DASHBOARD_MODE = "view";
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

export function resolveInitialDashboardMode({ storedMode, requestedMode } = {}) {
  if (isDashboardMode(requestedMode)) return requestedMode;
  if (isDashboardMode(storedMode)) return storedMode;
  return DEFAULT_DASHBOARD_MODE;
}

export function readDashboardModePreference(storage) {
  try {
    return storage?.getItem(DASHBOARD_MODE_STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

export function persistDashboardModePreference(mode, storage) {
  if (!isDashboardMode(mode)) return false;
  try {
    storage?.setItem(DASHBOARD_MODE_STORAGE_KEY, mode);
    return true;
  } catch {
    return false;
  }
}
