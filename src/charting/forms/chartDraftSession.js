import { reduceWizardState } from "./wizardDraft.js";

export function createChartDraftSessionStore() {
  const drafts = new Map();

  return Object.freeze({
    get(dashboardId) {
      requiredDashboardId(dashboardId);
      return drafts.get(dashboardId) ?? null;
    },

    start(dashboardId, state) {
      requiredDashboardId(dashboardId);
      if (drafts.has(dashboardId)) return drafts.get(dashboardId);
      requireState(state);
      drafts.set(dashboardId, state);
      return state;
    },

    suspend(dashboardId, restoration) {
      requiredDashboardId(dashboardId);
      const state = drafts.get(dashboardId);
      if (!state) return null;
      overwriteState(state, reduceWizardState(state, {
        type: "suspend",
        restoration,
      }));
      return state;
    },

    resume(dashboardId) {
      requiredDashboardId(dashboardId);
      const state = drafts.get(dashboardId);
      if (!state) return null;
      overwriteState(state, reduceWizardState(state, { type: "resume" }));
      return state;
    },

    replace(dashboardId, state) {
      requiredDashboardId(dashboardId);
      requireState(state);
      drafts.set(dashboardId, state);
      return state;
    },

    clear(dashboardId) {
      requiredDashboardId(dashboardId);
      return drafts.delete(dashboardId);
    },
  });
}

export function isMeaningfulChartDraft(state) {
  if (!state || state.discarded === true || state.status === "committed") return false;
  if (state.status === "committing" || state.status === "ambiguous") return true;
  return Boolean(
    meaningful(state.destination)
    || meaningful(state.chartTypeId)
    || meaningful(state.source)
    || meaningful(state.profileRevision)
    || meaningful(state.mapping)
    || meaningful(state.preparation)
    || meaningful(state.configuration)
    || meaningful(state.companions)
    || meaningful(state.renderProofRevision)
    || meaningful(state.placementProofRevision)
    || meaningful(state.draft),
  );
}

export function projectChartCreateOwner(state, {
  retainable = false,
  activity = state?.suspension && state.suspension.resumed !== true
    ? "suspended"
    : "active",
} = {}) {
  if (
    retainable !== true
    || !state
    || state.discarded === true
    || state.status === "committed"
    || typeof state.draftId !== "string"
    || state.draftId.trim() === ""
  ) return null;
  const scopeId = state.draftId.trim();
  const normalizedActivity = activity === "suspended" ? "suspended" : "active";
  return {
    id: `chart-create:${scopeId}`,
    kind: "chart-create",
    scopeId,
    targetId: scopeId,
    label: "New chart draft",
    status: state.status === "committing"
      ? "saving"
      : new Set(["failed", "ambiguous"]).has(state.status) ? "error" : "dirty",
    activity: normalizedActivity,
    surface: "create",
    restoration: state.suspension?.restoration
      ? structuredClone(state.suspension.restoration)
      : null,
    activation: normalizedActivity === "suspended" ? "resume" : "focus",
  };
}

function overwriteState(target, source) {
  if (target === source) return target;
  Object.assign(target, source);
  return target;
}

function requireState(state) {
  if (state === null || typeof state !== "object" || Array.isArray(state)) {
    throw new TypeError("Chart draft session state must be an object.");
  }
}

function requiredDashboardId(dashboardId) {
  if (typeof dashboardId !== "string" || dashboardId.trim() === "") {
    throw new Error("Dashboard id is required for a chart draft session.");
  }
}

function meaningful(value) {
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}
