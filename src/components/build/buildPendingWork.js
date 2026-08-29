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
  owners = [],
  parkedAuxiliaries = coordinator?.parkedAuxiliaries ?? [],
  layoutDraft = null,
  actions = {},
} = {}) {
  const chartSlot = coordinator?.slots?.chart;
  const adoptedOwners = new Map();
  for (const owner of [
    coordinator?.slots?.layout,
    chartSlot,
    layoutDraft,
    ...(Array.isArray(chartOwners) ? chartOwners : []),
    ...(Array.isArray(owners) ? owners : []),
  ]) {
    if (isAdoptedOwner(owner)) adoptedOwners.set(owner.draftId, owner);
  }
  const adoptedChartOwners = new Map(
    [...adoptedOwners].filter(([, owner]) => new Set(["chart-edit", "chart-create"]).has(owner.kind)),
  );
  const adoptedChartKinds = new Set(
    [...adoptedChartOwners.values()].map(({ kind }) => kind),
  );
  const adoptedKinds = new Set([...adoptedOwners.values()].map(({ kind }) => kind));
  for (const session of parkedAuxiliaries ?? []) {
    const temporalKind = temporalOwnerKind(session?.surface);
    if (temporalKind && (session?.dirty === true || isPendingState(session?.status))) {
      adoptedKinds.add(temporalKind);
    }
  }
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
      || (key === "structure" && adoptedKinds.has("layout"))
      || (key === "chronoGroup" && adoptedKinds.has("chrono"))
      || (key === "scene" && adoptedKinds.has("scene"))
    ) continue;
    upsert(descriptorForDefinition(DEFINITIONS[key], {
      state: "dirty",
      resume: actions.resumeByKey?.[key],
      actions,
    }));
  }

  const layoutSlot = coordinator?.slots?.layout;
  if (isPendingState(layoutSlot?.status)) {
    upsert(isAdoptedOwner(layoutSlot)
      ? descriptorForOwner(layoutSlot, actions)
      : descriptorForDefinition(DEFINITIONS.structure, {
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
  for (const owner of adoptedOwners.values()) {
    if (!new Set(["chart-edit", "chart-create"]).has(owner.kind) && isPendingState(owner.status)) {
      upsert(descriptorForOwner(owner, actions));
    }
  }
  if (isPendingState(layoutDraft?.status)) {
    const scopedLayoutDraft = adoptedOwners.get(layoutDraft.draftId);
    upsert(scopedLayoutDraft
      ? descriptorForOwner({
          ...layoutDraft,
          ...scopedLayoutDraft,
          targetId: layoutDraft.targetId ?? scopedLayoutDraft.targetId,
        }, actions)
      : descriptorForDefinition(DEFINITIONS.structure, {
          state: layoutDraft.status,
          resume: actions.resumeByKey?.structure,
          actions,
        }));
  }

  for (const session of parkedAuxiliaries ?? []) {
    const key = authoredKeyForAuxiliary(session?.surface);
    const temporalKind = temporalOwnerKind(session?.surface);
    if (temporalKind) {
      const id = `${temporalKind}:${session?.draftId}`;
      if (adoptedOwners.has(id)) continue;
      if (session?.dirty !== true && !isPendingState(session?.status)) continue;
      upsert(descriptorForOwner({
        draftId: id,
        kind: temporalKind,
        scopeId: session?.draftId,
        status: session?.dirty === true ? "dirty" : session.status,
        activity: "suspended",
        surface: session.surface === "scene" ? "scene-studio" : "chrono-studio",
        restoration: session.restoration ?? null,
      }, actions));
      continue;
    }
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
  return descriptorForOwner(owner, actions);
}

function descriptorForOwner(owner, actions) {
  const ownerActions = actions.ownerById?.[owner.draftId] ?? {};
  const activity = owner.activity === "suspended" ? "suspended" : "active";
  const activation = activity === "suspended" ? "resume" : "focus";
  const descriptor = {
    id: owner.draftId,
    kind: owner.kind,
    scopeId: owner.scopeId,
    targetId: owner.targetId,
    label: labelForOwnerKind(owner.kind),
    origin: owner.surface ?? owner.kind,
    priority: priorityForOwnerKind(owner.kind),
    state: owner.status,
    activity,
    surface: owner.surface ?? null,
    restoration: owner.restoration ?? null,
    activation,
    resume: typeof ownerActions[activation] === "function"
      ? ownerActions[activation]
      : owner.kind === "layout" && typeof actions.resumeByKey?.structure === "function"
        ? actions.resumeByKey.structure
        : new Set(["chrono", "scene"]).has(owner.kind) && typeof actions.resumeAuxiliary === "function"
          ? () => actions.resumeAuxiliary(owner.kind === "chrono" ? "chrono-group" : "scene", owner.scopeId)
          : NOOP,
    ...(owner.operation ? { operation: owner.operation } : {}),
  };
  if (typeof ownerActions.save === "function") descriptor.save = ownerActions.save;
  if (typeof ownerActions.discard === "function") descriptor.discard = ownerActions.discard;
  if (owner.kind === "layout") {
    descriptor.save ??= typeof actions.saveLayout === "function" ? actions.saveLayout : NOOP;
    descriptor.discard ??= typeof actions.discardLayout === "function" ? actions.discardLayout : NOOP;
  }
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
  return isAdoptedOwner(slot) && new Set(["chart-edit", "chart-create"]).has(slot.kind);
}

function isAdoptedOwner(owner) {
  return Boolean(
    owner
    && typeof owner.kind === "string"
    && typeof owner.scopeId === "string"
    && owner.draftId === `${owner.kind}:${owner.scopeId}`,
  );
}

function temporalOwnerKind(surface) {
  return ({ "chrono-group": "chrono", scene: "scene" })[surface] ?? null;
}

function labelForOwnerKind(kind) {
  return ({
    layout: "Layout changes",
    chrono: "Chrono Studio changes",
    scene: "Scene Studio changes",
    "chart-create": "New chart draft",
    "chart-edit": "Chart changes",
  })[kind] ?? `${humanize(kind)} changes`;
}

function priorityForOwnerKind(kind) {
  return ({ layout: 10, "chart-edit": 20, "chart-create": 30, chrono: 70, scene: 80 })[kind] ?? 110;
}

function stateWithHigherPriority(left, right) {
  return (STATE_WEIGHT[right] ?? 0) > (STATE_WEIGHT[left] ?? 0) ? right : left;
}

function humanize(value) {
  return value.replaceAll("-", " ").replace(/^./, (character) => character.toUpperCase());
}
