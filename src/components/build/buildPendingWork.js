import { AUTHORED_DIRTY_KEYS } from "./buildDirtyState.js";

const NOOP = () => {};
const PENDING_STATES = new Set(["dirty", "error", "saving", "suspended", "paused"]);
const STATE_WEIGHT = Object.freeze({
  paused: 1,
  suspended: 2,
  dirty: 3,
  saving: 4,
  error: 5,
});

const DEFINITIONS = Object.freeze({
  structure: Object.freeze({ id: "layout", kind: "layout", label: "Layout changes", origin: "dashboard-map", priority: 10 }),
  chartEditor: Object.freeze({ id: "chart-editor", kind: "chart", label: "Chart changes", origin: "chart-editor", priority: 20 }),
  chartWizard: Object.freeze({ id: "chart-wizard", kind: "chart", label: "New chart draft", origin: "chart-wizard", priority: 30 }),
  staticContent: Object.freeze({ id: "text-image", kind: "text-image", label: "Text/Image changes", origin: "text-image-editor", priority: 40 }),
  inlineRename: Object.freeze({ id: "inline-rename", kind: "rename", label: "Unfinished rename", origin: "dashboard-map", priority: 50 }),
  pendingContent: Object.freeze({ id: "source-content", kind: "content", label: "Source content changes", origin: "source-content", priority: 60 }),
  chronoGroup: Object.freeze({ id: "chrono-group", kind: "chrono", label: "Chrono Studio changes", origin: "chrono-studio", priority: 70 }),
  scene: Object.freeze({ id: "scene", kind: "scene", label: "Scene Studio changes", origin: "scene-studio", priority: 80 }),
  scenario: Object.freeze({ id: "scenario", kind: "scenario", label: "Scenario Passport changes", origin: "scenario-passport", priority: 90 }),
  dashboardMetadata: Object.freeze({ id: "dashboard-metadata", kind: "metadata", label: "Dashboard details", origin: "dashboard-map", priority: 100 }),
});

export function selectBuildPendingWork({
  authoredDirty = {},
  coordinator = null,
  chartOwners = [],
  parkedAuxiliaries = coordinator?.parkedAuxiliaries ?? [],
  layoutDraft = null,
  actions = {},
} = {}) {
  const chartSlot = coordinator?.slots?.chart;
  const adoptedChartOwners = new Map();
  for (const owner of [chartSlot, ...(Array.isArray(chartOwners) ? chartOwners : [])]) {
    if (isAdoptedChartOwner(owner)) adoptedChartOwners.set(owner.draftId, owner);
  }
  const adoptedChartKinds = new Set(
    [...adoptedChartOwners.values()].map(({ kind }) => kind),
  );
  const entries = new Map();
  const upsert = (candidate, { preferResume = false } = {}) => {
    if (!candidate || !PENDING_STATES.has(candidate.state)) return;
    const existing = entries.get(candidate.id);
    if (!existing) {
      entries.set(candidate.id, candidate);
      return;
    }
    const state = stateWithHigherPriority(existing.state, candidate.state);
    const merged = {
      ...existing,
      ...candidate,
      state,
      priority: Math.min(existing.priority, candidate.priority),
      resume: preferResume ? candidate.resume : existing.resume,
    };
    if (existing.save && !candidate.save) merged.save = existing.save;
    if (existing.discard && !candidate.discard) merged.discard = existing.discard;
    entries.set(candidate.id, merged);
  };

  for (const key of AUTHORED_DIRTY_KEYS) {
    if (authoredDirty?.[key] !== true) continue;
    if (
      (key === "chartEditor" && adoptedChartKinds.has("chart-edit"))
      || (key === "chartWizard" && adoptedChartKinds.has("chart-create"))
    ) continue;
    upsert(descriptorForDefinition(DEFINITIONS[key], {
      state: "dirty",
      resume: actions.resumeByKey?.[key],
      actions,
    }));
  }

  const layoutSlot = coordinator?.slots?.layout;
  if (isPendingState(layoutSlot?.status)) {
    upsert(descriptorForDefinition(DEFINITIONS.structure, {
      state: layoutSlot.status,
      resume: actions.resumeByKey?.structure,
      actions,
    }));
  }
  if (isPendingState(chartSlot?.status)) {
    if (!isAdoptedChartOwner(chartSlot)) {
      upsert(descriptorForDefinition(DEFINITIONS.chartEditor, {
        state: chartSlot.status,
        resume: actions.resumeByKey?.chartEditor,
        actions,
      }));
    }
  }
  for (const owner of adoptedChartOwners.values()) {
    if (isPendingState(owner.status)) {
      upsert(descriptorForChartOwner(owner, actions));
    }
  }
  if (isPendingState(layoutDraft?.status)) {
    upsert(descriptorForDefinition(DEFINITIONS.structure, {
      state: layoutDraft.status,
      resume: actions.resumeByKey?.structure,
      actions,
    }));
  }

  for (const session of parkedAuxiliaries ?? []) {
    const key = authoredKeyForAuxiliary(session?.surface);
    const definition = key ? DEFINITIONS[key] : auxiliaryDefinition(session);
    const resume = key === "structure"
      ? actions.resumeByKey?.structure
      : () => actions.resumeAuxiliary?.(session?.surface, session?.draftId);
    upsert(descriptorForDefinition(definition, {
      state: session?.dirty === true
        ? "dirty"
        : isPendingState(session?.status) ? session.status : "paused",
      resume,
      actions,
    }), { preferResume: key !== "structure" });
  }

  return [...entries.values()]
    .sort((left, right) => left.priority - right.priority || left.id.localeCompare(right.id));
}

function descriptorForChartOwner(owner, actions) {
  const ownerActions = actions.ownerById?.[owner.draftId] ?? {};
  const activity = owner.activity === "suspended" ? "suspended" : "active";
  const activation = activity === "suspended" ? "resume" : "focus";
  const descriptor = {
    id: owner.draftId,
    kind: owner.kind,
    scopeId: owner.scopeId,
    targetId: owner.targetId,
    label: owner.kind === "chart-create" ? "New chart draft" : "Chart changes",
    origin: owner.surface ?? owner.kind,
    priority: owner.kind === "chart-create" ? 30 : 20,
    state: owner.status,
    activity,
    surface: owner.surface ?? null,
    restoration: owner.restoration ?? null,
    activation,
    resume: typeof ownerActions[activation] === "function"
      ? ownerActions[activation]
      : NOOP,
    ...(owner.operation ? { operation: owner.operation } : {}),
  };
  if (typeof ownerActions.save === "function") descriptor.save = ownerActions.save;
  if (typeof ownerActions.discard === "function") descriptor.discard = ownerActions.discard;
  return descriptor;
}

function descriptorForDefinition(definition, { state, resume, actions }) {
  const descriptor = {
    ...definition,
    state,
    resume: typeof resume === "function" ? resume : NOOP,
  };
  if (definition.kind === "layout") {
    descriptor.save = typeof actions.saveLayout === "function" ? actions.saveLayout : NOOP;
    descriptor.discard = typeof actions.discardLayout === "function" ? actions.discardLayout : NOOP;
  }
  return descriptor;
}

function auxiliaryDefinition(session) {
  const surface = String(session?.surface || "auxiliary");
  const draftId = String(session?.draftId || surface);
  return {
    id: `auxiliary:${draftId}`,
    kind: surface,
    label: session?.label || `${humanize(surface)} work`,
    origin: surface,
    priority: 110,
  };
}

function authoredKeyForAuxiliary(surface) {
  return ({
    structure: "structure",
    "source-content": "pendingContent",
    "chrono-group": "chronoGroup",
    scene: "scene",
  })[surface] ?? null;
}

function isPendingState(state) {
  return PENDING_STATES.has(state);
}

function isAdoptedChartOwner(slot) {
  return Boolean(
    slot
    && new Set(["chart-edit", "chart-create"]).has(slot.kind)
    && slot.draftId === `${slot.kind}:${slot.scopeId}`,
  );
}

function stateWithHigherPriority(left, right) {
  return (STATE_WEIGHT[right] ?? 0) > (STATE_WEIGHT[left] ?? 0) ? right : left;
}

function humanize(value) {
  return value.replaceAll("-", " ").replace(/^./, (character) => character.toUpperCase());
}
