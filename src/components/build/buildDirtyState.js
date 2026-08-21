const AUTHORED_DIRTY_KEYS = Object.freeze([
  "chartEditor",
  "chartWizard",
  "inlineRename",
  "pendingContent",
  "timeGroup",
  "scene",
  "dashboardMetadata",
]);

export function createBuildDirtyState() {
  return {
    chartEditor: false,
    chartWizard: false,
    inlineRename: false,
    pendingContent: false,
    timeGroup: false,
    scene: false,
    dashboardMetadata: false,
  };
}

export function hasUnsavedAuthoredContent(state = {}) {
  return AUTHORED_DIRTY_KEYS.some((key) => state?.[key] === true);
}
