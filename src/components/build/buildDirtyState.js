const AUTHORED_DIRTY_KEYS = Object.freeze([
  "structure",
  "scenario",
  "chartEditor",
  "chartWizard",
  "inlineRename",
  "pendingContent",
  "chronoGroup",
  "scene",
  "dashboardMetadata",
]);

export function createBuildDirtyState() {
  return {
    structure: false,
    scenario: false,
    chartEditor: false,
    chartWizard: false,
    inlineRename: false,
    pendingContent: false,
    chronoGroup: false,
    scene: false,
    dashboardMetadata: false,
  };
}

export function hasUnsavedAuthoredContent(state = {}) {
  return AUTHORED_DIRTY_KEYS.some((key) => state?.[key] === true);
}

const LOCAL_AUTHORING_DRAFT_KEYS = Object.freeze([
  "structure",
  "scenario",
  "chronoGroup",
  "scene",
]);

export function activeLocalAuthoringDrafts(drafts = {}) {
  return LOCAL_AUTHORING_DRAFT_KEYS
    .map((key) => ({ key, draft: drafts?.[key] }))
    .filter(({ draft }) => isActiveLocalAuthoringDraft(draft));
}

export function hasActiveLocalAuthoringDrafts(drafts = {}) {
  return activeLocalAuthoringDrafts(drafts).length > 0;
}

export function buildLeaveBlockReason(drafts = {}) {
  const active = activeLocalAuthoringDrafts(drafts)[0];
  if (!active) return "";
  const label = ({
    structure: "Structure",
    scenario: "Scenario",
    chronoGroup: "Chrono Group",
    scene: "Scene",
  })[active.key];
  return `Save or discard changes to ${label} before leaving this edit. Stay in Build to continue editing.`;
}

function isActiveLocalAuthoringDraft(draft) {
  if (!draft || draft.status === "clean" || draft.status === "committed") return false;
  if (draft.status === "saving") return true;
  try {
    return JSON.stringify(draft.baseline) !== JSON.stringify(draft.value);
  } catch {
    return true;
  }
}
