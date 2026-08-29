const SURFACES = new Set(["quick", "full"]);
const STATUSES = new Set(["clean", "dirty", "saving", "error"]);
const RUNTIME_DASHBOARD_FIELDS = [
  "chartDataStates",
  "dataSourceStates",
  "runtimeContentHealth",
  "loadedData",
];

export function createChartEditSession({
  placementId,
  chart,
  chronoGroups = [],
  activeSurface = "quick",
  restoration,
} = {}) {
  const surface = requiredSurface(activeSurface);
  const savedChart = cloneChart(chart);
  const savedChronoGroups = cloneChronoGroups(chronoGroups);
  const scopeId = requiredPlacementId(placementId);
  return {
    owner: { kind: "chart-edit", scopeId },
    placementId: scopeId,
    savedChart,
    savedChronoGroups,
    draft: structuredClone(savedChart),
    chronoGroups: structuredClone(savedChronoGroups),
    dirtyOrigins: { quick: false, full: false },
    activeSurface: surface,
    activity: "active",
    suspended: false,
    restoration: normalizeRestoration(restoration, surface),
    pendingRuntimeArtifact: null,
    pendingOperation: null,
    status: "clean",
    error: null,
  };
}

export function projectChartEditSessionOwner(state) {
  assertSession(state);
  if (!hasRetainableChartEditWork(state)) return null;
  const activity = state.activeSurface ? "active" : "suspended";
  const surface = state.activeSurface ?? chartEditSessionPendingSurface(state);
  return {
    id: `chart-edit:${state.owner.scopeId}`,
    kind: state.owner.kind,
    scopeId: state.owner.scopeId,
    targetId: state.placementId,
    label: "Chart changes",
    status: state.status,
    activity,
    surface,
    restoration: structuredClone(state.restoration),
    activation: activity === "active" ? "focus" : "resume",
    ...(state.pendingOperation?.kind === "remove"
      ? { operation: "remove" }
      : {}),
  };
}

export function reduceChartEditSession(state, action) {
  assertSession(state);
  if (!action || typeof action !== "object" || typeof action.type !== "string") {
    throw new TypeError("Chart edit session actions require a type.");
  }

  switch (action.type) {
    case "CHANGE":
      return changeSession(state, action);
    case "OPEN":
      return openSession(state, action);
    case "SUSPEND":
      return suspendSession(state, action);
    case "RESUME":
      return resumeSession(state);
    case "RESET":
      assertNotSaving(state);
      return {
        ...state,
        draft: structuredClone(state.savedChart),
        chronoGroups: structuredClone(state.savedChronoGroups),
        dirtyOrigins: { quick: false, full: false },
        suspended: false,
        pendingRuntimeArtifact: null,
        pendingOperation: null,
        status: "clean",
        error: null,
      };
    case "SAVE_SUCCEEDED":
      return acceptSave(state, action);
    case "PERSISTENCE_FAILED":
      if (state.status !== "saving") {
        throw new Error("Chart edit persistence can fail only while saving.");
      }
      return {
        ...state,
        status: "error",
        error: normalizeError(action.error),
      };
    default:
      throw new Error(`Unknown chart edit session action: ${action.type}`);
  }
}

export function isChartEditSessionDirty(state) {
  assertSession(state);
  return projectionKey(state.draft, state.chronoGroups)
    !== projectionKey(state.savedChart, state.savedChronoGroups);
}

export function hasRetainableChartEditWork(state) {
  assertSession(state);
  return isChartEditSessionDirty(state) || state.pendingOperation !== null;
}

export function chartEditSessionPendingSurface(state) {
  assertSession(state);
  if (!hasRetainableChartEditWork(state)) return null;
  if (state.dirtyOrigins.full) return "full";
  if (state.dirtyOrigins.quick) return "quick";
  return state.activeSurface ?? state.restoration.surface;
}

export function dismissChartEditSession(state, {
  surface = state?.activeSurface,
  restoration,
} = {}) {
  const suspended = reduceChartEditSession(state, {
    type: "SUSPEND",
    surface,
    restoration,
  });
  return hasRetainableChartEditWork(suspended) ? suspended : null;
}

export function projectChartEditSessionDashboard(dashboard, state) {
  assertSession(state);
  if (!isRecord(dashboard)) {
    throw new TypeError("A dashboard is required for chart edit preview.");
  }

  const preview = structuredClone(dashboard);
  let matches = 0;
  for (const page of preview.pages ?? []) {
    for (const section of page.sections ?? []) {
      section.panels = (section.panels ?? []).map((panel) => {
        if (panel?.id !== state.placementId) return panel;
        matches += 1;
        const chart = structuredClone(state.draft);
        return Object.hasOwn(panel, "chart")
          ? { ...panel, chart }
          : chart;
      });
    }
  }
  if (matches !== 1) {
    throw new Error(
      matches === 0
        ? `Chart placement "${state.placementId}" does not exist in the dashboard.`
        : `Chart placement "${state.placementId}" is not unique in the dashboard.`,
    );
  }
  preview.chronoGroups = applyChartEditSessionChronoGroupChanges(
    preview.chronoGroups ?? [],
    deriveChronoGroupChanges(state.savedChronoGroups, state.chronoGroups),
  );
  return preview;
}

export function applyChartEditSessionChronoGroupChanges(chronoGroups, changes) {
  const current = cloneChronoGroups(chronoGroups);
  const upsert = cloneChronoGroups(changes?.upsert ?? []);
  const remove = Array.isArray(changes?.remove)
    ? changes.remove.map((groupId) => requiredGroupId(groupId))
    : [];
  const removeIds = new Set(remove);
  const replacements = indexChronoGroups(upsert, "Chart edit Chrono Group changes");
  const seen = new Set();
  const merged = current.flatMap((group) => {
    const groupId = requiredGroupId(group?.id);
    if (seen.has(groupId)) {
      throw new Error(`Current Chrono Groups contain duplicate id "${groupId}".`);
    }
    seen.add(groupId);
    if (removeIds.has(groupId)) return [];
    const replacement = replacements.get(groupId);
    return [structuredClone(replacement ?? group)];
  });
  for (const group of upsert) {
    const groupId = requiredGroupId(group?.id);
    if (!seen.has(groupId) && !removeIds.has(groupId)) {
      merged.push(structuredClone(group));
    }
  }
  return merged;
}

export function prepareChartEditSessionSave(state, {
  runtimeArtifact = state?.pendingRuntimeArtifact,
} = {}) {
  assertSession(state);
  assertNotSaving(state);
  if (!isChartEditSessionDirty(state)) {
    throw new Error("Chart edit Save requires a real change.");
  }
  const pendingRuntimeArtifact = cloneRuntimeArtifact(runtimeArtifact);
  return {
    session: {
      ...state,
      pendingRuntimeArtifact,
      pendingOperation: null,
      status: "saving",
      error: null,
    },
    intent: {
      kind: "save",
      placementId: state.placementId,
      chart: structuredClone(state.draft),
      chronoGroupChanges: deriveChronoGroupChanges(
        state.savedChronoGroups,
        state.chronoGroups,
      ),
      ...(pendingRuntimeArtifact
        ? { runtimeArtifact: structuredClone(pendingRuntimeArtifact) }
        : {}),
    },
  };
}

export function materializeChartEditSessionSave(intent, currentChronoGroups) {
  if (!isRecord(intent) || intent.kind !== "save") {
    throw new TypeError("A chart edit Save intent is required.");
  }
  const payload = {
    placementId: requiredPlacementId(intent.placementId),
    chart: cloneChart(intent.chart),
  };
  if (
    (intent.chronoGroupChanges?.upsert?.length ?? 0) > 0
    || (intent.chronoGroupChanges?.remove?.length ?? 0) > 0
  ) {
    payload.chronoGroups = applyChartEditSessionChronoGroupChanges(
      currentChronoGroups,
      intent.chronoGroupChanges,
    );
  }
  if (Object.hasOwn(intent, "runtimeArtifact")) {
    payload.runtimeArtifact = cloneRuntimeArtifact(intent.runtimeArtifact);
  }
  return payload;
}

export function rebaseChartPersistenceIntoLayoutDraft({
  layoutDraft,
  committedDashboard,
  intent,
} = {}) {
  if (
    !isRecord(layoutDraft)
    || !isRecord(layoutDraft.baseline)
    || !isRecord(layoutDraft.value)
  ) {
    throw new TypeError("A Build layout draft with a baseline and value is required.");
  }
  if (!isRecord(committedDashboard)) {
    throw new TypeError("A committed dashboard is required to rebase a layout draft.");
  }
  if (!isRecord(intent) || !new Set(["create", "save", "remove"]).has(intent.kind)) {
    throw new TypeError("A chart Create, Save, or Remove intent is required to rebase a layout draft.");
  }
  const placementId = requiredPlacementId(intent.placementId);
  const baseline = structuredClone(layoutDraft.baseline);
  const local = structuredClone(layoutDraft.value);
  const committed = retainLayoutDraftRuntimeFields(
    structuredClone(committedDashboard),
    local,
  );
  const indexes = {
    baseline: indexDashboardLayout(baseline, "Build layout baseline"),
    local: indexDashboardLayout(local, "Build layout value"),
    committed: indexDashboardLayout(committed, "Committed dashboard"),
  };
  const value = rebaseDashboardLayoutValue({ baseline, local, committed, indexes });

  if (intent.kind === "save") {
    const committedPlacement = requireUniquePlacement(
      indexes.committed.placements,
      placementId,
      "Committed chart Save",
    );
    replaceCommittedPlacementChart(value, placementId, committedPlacement);
  } else if (intent.kind === "remove") {
    if (indexes.committed.placements.has(placementId)) {
      throw new Error(`Committed chart Remove still contains placement "${placementId}".`);
    }
    const removedPlacement = indexes.local.placements.get(placementId)
      ?? indexes.baseline.placements.get(placementId);
    removePlacementFromRebasedLayout(
      value,
      placementId,
      chartFromPlacement(removedPlacement)?.id,
    );
  } else {
    requireUniquePlacement(indexes.committed.placements, placementId, "Committed chart Create");
    insertCreatedPlacementIntoRebasedLayout(value, committed, placementId);
    requireUniquePlacement(indexDashboardLayout(value, "Rebased chart Create").placements, placementId, "Rebased chart Create");
  }

  return {
    ...layoutDraft,
    baseline: committed,
    value,
  };
}

export function resolveChartCreationPersistenceTarget(layoutDraft, target) {
  if (!isRecord(layoutDraft?.baseline) || !isRecord(layoutDraft?.value) || !isRecord(target)) return null;
  const localPage = (layoutDraft.value.pages ?? []).find(({ id }) => id === target.pageId);
  if (!(localPage?.sections ?? []).some(({ id }) => id === target.sectionId)) return null;
  const baselineMatches = (layoutDraft.baseline.pages ?? []).flatMap((page) => (
    (page.sections ?? []).filter(({ id }) => id === target.sectionId).map(() => page.id)
  ));
  if (baselineMatches.length !== 1) return null;
  return { ...target, pageId: baselineMatches[0] };
}

export function createdPlacementIdFromCommittedDashboard(committedDashboard, chartId) {
  const matches = (committedDashboard?.pages ?? []).flatMap(({ sections = [] }) => sections)
    .flatMap(({ panels = [] }) => panels)
    .filter((placement) => chartFromPlacement(placement)?.id === chartId);
  if (matches.length !== 1 || typeof matches[0]?.id !== "string" || !matches[0].id) {
    throw new Error(`Committed chart Create must contain exactly one placement for chart "${String(chartId)}".`);
  }
  return matches[0].id;
}

export function prepareConfirmedChartEditRemoval(state) {
  assertSession(state);
  assertNotSaving(state);
  const intent = {
    kind: "remove",
    placementId: state.placementId,
  };
  return {
    session: {
      ...state,
      pendingOperation: {
        kind: "remove",
        intent: structuredClone(intent),
      },
      status: "saving",
      error: null,
    },
    intent,
  };
}

export function prepareChartEditSessionRetry(state) {
  assertSession(state);
  assertNotSaving(state);
  if (state.status !== "error" || state.pendingOperation?.kind !== "remove") {
    throw new Error("Chart edit retry requires a failed retained operation.");
  }
  return {
    session: {
      ...state,
      status: "saving",
      error: null,
    },
    intent: structuredClone(state.pendingOperation.intent),
  };
}

export function prepareActiveQuickChartEditRemoval(state, placementId) {
  if (
    state?.activeSurface !== "quick"
    || state.placementId !== placementId
  ) return null;
  return prepareConfirmedChartEditRemoval(state);
}

function changeSession(state, action) {
  assertNotSaving(state);
  const surface = requiredSurface(action.surface);
  if (surface !== state.activeSurface || (surface === "quick" && state.dirtyOrigins.full)) {
    return state;
  }
  if (!Object.hasOwn(action, "draft") && !Object.hasOwn(action, "chronoGroups")) {
    throw new Error("Chart edit changes require a draft or Chrono Groups value.");
  }

  const draft = Object.hasOwn(action, "draft")
    ? cloneChart(action.draft)
    : structuredClone(state.draft);
  const chronoGroups = Object.hasOwn(action, "chronoGroups")
    ? cloneChronoGroups(action.chronoGroups)
    : structuredClone(state.chronoGroups);
  if (projectionKey(draft, chronoGroups) === projectionKey(state.draft, state.chronoGroups)) {
    return state;
  }

  const dirty = projectionKey(draft, chronoGroups)
    !== projectionKey(state.savedChart, state.savedChronoGroups);
  return {
    ...state,
    draft,
    chronoGroups,
    dirtyOrigins: dirty
      ? { ...state.dirtyOrigins, [surface]: true }
      : { quick: false, full: false },
    suspended: false,
    activity: "active",
    pendingRuntimeArtifact: null,
    pendingOperation: null,
    status: dirty ? "dirty" : "clean",
    error: null,
  };
}

function openSession(state, action) {
  assertNotSaving(state);
  const requestedSurface = requiredSurface(action.surface);
  const surface = state.dirtyOrigins.full ? "full" : requestedSurface;
  const restoration = normalizeRestoration({
    ...state.restoration,
    ...action.restoration,
    surface,
  }, surface);
  return {
    ...state,
    activeSurface: surface,
    suspended: false,
    activity: "active",
    restoration,
    status: state.status === "error"
      ? "error"
      : isChartEditSessionDirty(state) ? "dirty" : "clean",
  };
}

function suspendSession(state, action) {
  assertNotSaving(state);
  const surface = requiredSurface(action.surface);
  if (surface !== state.activeSurface) return state;
  const dirty = isChartEditSessionDirty(state);
  const retainable = hasRetainableChartEditWork(state);
  return {
    ...state,
    activeSurface: null,
    suspended: retainable,
    activity: "suspended",
    restoration: normalizeRestoration({
      ...state.restoration,
      ...action.restoration,
      surface,
    }, surface),
    status: state.status === "error"
      ? "error"
      : dirty ? "dirty" : "clean",
  };
}

function resumeSession(state) {
  assertNotSaving(state);
  const surface = preferredSurface(state);
  return {
    ...state,
    activeSurface: surface,
    suspended: false,
    activity: "active",
    restoration: normalizeRestoration({
      ...state.restoration,
      surface,
    }, surface),
    status: state.status === "error"
      ? "error"
      : isChartEditSessionDirty(state) ? "dirty" : "clean",
  };
}

function acceptSave(state, action) {
  if (state.status !== "saving") {
    throw new Error("Chart edit Save can succeed only while saving.");
  }
  const savedChart = Object.hasOwn(action, "chart")
    ? cloneChart(action.chart)
    : structuredClone(state.draft);
  const savedChronoGroups = Object.hasOwn(action, "chronoGroups")
    ? cloneChronoGroups(action.chronoGroups)
    : structuredClone(state.chronoGroups);
  return {
    ...state,
    savedChart,
    savedChronoGroups,
    draft: structuredClone(savedChart),
    chronoGroups: structuredClone(savedChronoGroups),
    dirtyOrigins: { quick: false, full: false },
    suspended: false,
    pendingRuntimeArtifact: null,
    pendingOperation: null,
    status: "clean",
    error: null,
  };
}

function preferredSurface(state) {
  if (state.dirtyOrigins.full) return "full";
  if (state.dirtyOrigins.quick) return "quick";
  return requiredSurface(state.restoration.surface ?? "quick");
}

function projectionKey(chart, chronoGroups) {
  return stableSerialize({ chart, chronoGroups });
}

function deriveChronoGroupChanges(savedChronoGroups, chronoGroups) {
  const saved = indexChronoGroups(savedChronoGroups, "Saved Chrono Groups");
  const draft = indexChronoGroups(chronoGroups, "Draft Chrono Groups");
  const upsert = chronoGroups
    .filter((group) => {
      const groupId = requiredGroupId(group?.id);
      const savedGroup = saved.get(groupId);
      return !savedGroup || stableSerialize(savedGroup) !== stableSerialize(group);
    })
    .map((group) => structuredClone(group));
  const remove = [...saved.keys()].filter((groupId) => !draft.has(groupId));
  return { upsert, remove };
}

function rebaseDashboardLayoutValue({ baseline, local, committed, indexes }) {
  const value = mergeChangedRecord(
    baseline,
    local,
    committed,
    new Set(["pages", "chronoGroups", "scenes"]),
  );
  value.pages = rebaseTopologyCollection({
    baselineParent: baseline.pages,
    localParent: local.pages,
    committedParent: committed.pages,
    baselineGlobal: indexes.baseline.pages,
    localGlobal: indexes.local.pages,
    committedGlobal: indexes.committed.pages,
    identity: entityId,
    merge: (baselinePage, localPage, committedPage) => {
      const page = mergeChangedRecord(
        baselinePage,
        localPage,
        committedPage,
        new Set(["sections"]),
      );
      const pageId = entityId(baselinePage);
      page.sections = rebaseTopologyCollection({
        baselineParent: baselinePage.sections,
        localParent: localPage.sections,
        committedParent: committedPage.sections,
        baselineGlobal: indexes.baseline.sections,
        localGlobal: indexes.local.sections,
        committedGlobal: indexes.committed.sections,
        identity: (section) => pageScopedSectionKey(pageId, entityId(section)),
        merge: (baselineSection, localSection, committedSection) => {
          const section = mergeChangedRecord(
            baselineSection,
            localSection,
            committedSection,
            new Set(["panels"]),
          );
          section.panels = rebaseTopologyCollection({
            baselineParent: baselineSection.panels,
            localParent: localSection.panels,
            committedParent: committedSection.panels,
            baselineGlobal: indexes.baseline.placements,
            localGlobal: indexes.local.placements,
            committedGlobal: indexes.committed.placements,
            identity: placementIdentity,
            merge: (baselinePlacement, localPlacement, committedPlacement) => (
              mergeChangedRecord(baselinePlacement, localPlacement, committedPlacement)
            ),
          });
          return section;
        },
      });
      return page;
    },
  });
  rebaseOptionalRecordCollection(
    value,
    "chronoGroups",
    baseline,
    local,
    committed,
    indexes.baseline.chronoGroups,
    indexes.local.chronoGroups,
    indexes.committed.chronoGroups,
    mergeReferenceBearingRecord,
  );
  rebaseOptionalRecordCollection(
    value,
    "scenes",
    baseline,
    local,
    committed,
    indexes.baseline.scenes,
    indexes.local.scenes,
    indexes.committed.scenes,
    mergeReferenceBearingRecord,
  );
  return value;
}

function rebaseOptionalRecordCollection(
  target,
  key,
  baseline,
  local,
  committed,
  baselineGlobal,
  localGlobal,
  committedGlobal,
  merge = mergeChangedRecord,
) {
  if (![baseline[key], local[key], committed[key]].some(Array.isArray)) {
    delete target[key];
    return;
  }
  target[key] = rebaseTopologyCollection({
    baselineParent: baseline[key],
    localParent: local[key],
    committedParent: committed[key],
    baselineGlobal,
    localGlobal,
    committedGlobal,
    identity: entityId,
    merge,
  });
}

function mergeReferenceBearingRecord(baseline, local, committed) {
  const merged = mergeChangedRecord(
    baseline,
    local,
    committed,
    new Set(["members", "chartIds", "present"]),
  );
  rebaseOptionalIdentityArray({
    target: merged,
    key: "members",
    baseline,
    local,
    committed,
    identity: memberChartId,
    description: "Temporal members",
    merge: mergeChangedRecord,
  });
  rebaseOptionalIdentityArray({
    target: merged,
    key: "chartIds",
    baseline,
    local,
    committed,
    identity: chartReferenceId,
    description: "Temporal chart references",
    merge: (_baselineId, _localId, committedId) => committedId,
  });
  rebaseOptionalReferenceRecord(merged, "present", baseline, local, committed);
  return merged;
}

function rebaseOptionalReferenceRecord(target, key, baseline, local, committed) {
  const baselineRecord = baseline?.[key];
  const localRecord = local?.[key];
  const committedRecord = committed?.[key];
  if (sameProjection(localRecord, baselineRecord)) {
    if (committedRecord === undefined) delete target[key];
    else target[key] = structuredClone(committedRecord);
    return;
  }
  if (localRecord === undefined) {
    delete target[key];
    return;
  }
  if (
    !isRecord(baselineRecord)
    || !isRecord(localRecord)
    || !isRecord(committedRecord)
  ) {
    target[key] = structuredClone(localRecord);
    return;
  }
  const merged = mergeChangedRecord(
    baselineRecord,
    localRecord,
    committedRecord,
    new Set(["chartIds"]),
  );
  rebaseOptionalIdentityArray({
    target: merged,
    key: "chartIds",
    baseline: baselineRecord,
    local: localRecord,
    committed: committedRecord,
    identity: chartReferenceId,
    description: "Scene Present chart references",
    merge: (_baselineId, _localId, committedId) => committedId,
  });
  target[key] = merged;
}

function rebaseOptionalIdentityArray({
  target,
  key,
  baseline,
  local,
  committed,
  identity,
  description,
  merge,
}) {
  const baselineItems = baseline?.[key];
  const localItems = local?.[key];
  const committedItems = committed?.[key];
  if (sameProjection(localItems, baselineItems)) {
    if (committedItems === undefined) delete target[key];
    else target[key] = structuredClone(committedItems);
    return;
  }
  if (localItems === undefined) {
    delete target[key];
    return;
  }
  if (
    !Array.isArray(baselineItems)
    || !Array.isArray(localItems)
    || !Array.isArray(committedItems)
  ) {
    target[key] = structuredClone(localItems);
    return;
  }
  target[key] = rebaseTopologyCollection({
    baselineParent: baselineItems,
    localParent: localItems,
    committedParent: committedItems,
    baselineGlobal: indexEntities(baselineItems, identity, `Baseline ${description}`),
    localGlobal: indexEntities(localItems, identity, `Build layout ${description}`),
    committedGlobal: indexEntities(committedItems, identity, `Committed ${description}`),
    identity,
    merge,
  });
}

function rebaseTopologyCollection({
  baselineParent = [],
  localParent = [],
  committedParent = [],
  baselineGlobal,
  localGlobal,
  committedGlobal,
  identity,
  merge,
}) {
  const baselineIds = baselineParent.map(identity);
  const localIds = localParent.map(identity);
  const committedIds = committedParent.map(identity);
  const localTopologyChanged = !sameSequence(baselineIds, localIds);
  const sequence = localTopologyChanged
    ? localIds.filter((id) => !baselineGlobal.has(id) || committedGlobal.has(id))
    : committedIds.filter((id) => !baselineGlobal.has(id) || localGlobal.has(id));
  if (localTopologyChanged) {
    for (const id of committedIds) {
      if (!baselineGlobal.has(id) && !localGlobal.has(id) && !sequence.includes(id)) {
        sequence.push(id);
      }
    }
  }
  return sequence.map((id) => {
    const baselineItem = baselineGlobal.get(id);
    const localItem = localGlobal.get(id);
    const committedItem = committedGlobal.get(id);
    if (!localItem) return structuredClone(committedItem);
    if (!baselineItem || !committedItem) return structuredClone(localItem);
    return merge(baselineItem, localItem, committedItem);
  });
}

function mergeChangedRecord(baseline, local, committed, excluded = new Set()) {
  if (!isRecord(local)) return structuredClone(local);
  if (!isRecord(baseline) || !isRecord(committed)) return structuredClone(local);
  const merged = structuredClone(committed);
  for (const key of new Set([...Object.keys(baseline), ...Object.keys(local)])) {
    if (excluded.has(key)) continue;
    const baselineHas = Object.hasOwn(baseline, key);
    const localHas = Object.hasOwn(local, key);
    if (!localHas && baselineHas) {
      delete merged[key];
    } else if (localHas && (!baselineHas || !sameProjection(local[key], baseline[key]))) {
      merged[key] = structuredClone(local[key]);
    }
  }
  return merged;
}

function retainLayoutDraftRuntimeFields(committed, local) {
  for (const key of RUNTIME_DASHBOARD_FIELDS) {
    if (!Object.hasOwn(committed, key) && Object.hasOwn(local, key)) {
      committed[key] = structuredClone(local[key]);
    }
  }
  return committed;
}

function indexDashboardLayout(dashboard, description) {
  const pages = indexEntities(dashboard.pages ?? [], entityId, `${description} Pages`);
  const sectionItems = (dashboard.pages ?? []).flatMap(({ sections = [] }) => sections);
  const placementItems = sectionItems.flatMap(({ panels = [] }) => panels);
  const sections = new Map();
  for (const [pageId, page] of pages) {
    const pageSections = indexEntities(
      page.sections ?? [],
      entityId,
      `${description} Page "${pageId}" Sections`,
    );
    for (const [sectionId, section] of pageSections) {
      sections.set(pageScopedSectionKey(pageId, sectionId), section);
    }
  }
  return {
    pages,
    sections,
    placements: indexEntities(
      placementItems,
      placementIdentity,
      `${description} chart placements`,
    ),
    chronoGroups: indexEntities(
      dashboard.chronoGroups ?? [],
      entityId,
      `${description} Chrono Groups`,
    ),
    scenes: indexEntities(dashboard.scenes ?? [], entityId, `${description} Scenes`),
  };
}

function indexEntities(items, identity, description) {
  const indexed = new Map();
  for (const item of items) {
    const id = identity(item);
    if (typeof id !== "string" || id.trim() === "") {
      throw new Error(`${description} require stable IDs.`);
    }
    if (indexed.has(id)) throw new Error(`${description} contain duplicate id "${id}".`);
    indexed.set(id, item);
  }
  return indexed;
}

function requireUniquePlacement(placements, placementId, description) {
  const placement = placements.get(placementId);
  if (!placement) throw new Error(`${description} is missing placement "${placementId}".`);
  return placement;
}

function replaceCommittedPlacementChart(dashboard, placementId, committedPlacement) {
  let matches = 0;
  for (const page of dashboard.pages ?? []) {
    for (const section of page.sections ?? []) {
      section.panels = (section.panels ?? []).map((placement) => {
        if (placementIdentity(placement) !== placementId) return placement;
        matches += 1;
        const committedChart = structuredClone(chartFromPlacement(committedPlacement));
        return Object.hasOwn(placement, "chart")
          ? { ...placement, chart: committedChart }
          : committedChart;
      });
    }
  }
  if (matches !== 1) {
    throw new Error(`Rebased chart Save requires one placement "${placementId}".`);
  }
}

function insertCreatedPlacementIntoRebasedLayout(dashboard, committedDashboard, placementId) {
  let committedLocation = null;
  for (const page of committedDashboard.pages ?? []) {
    for (const section of page.sections ?? []) {
      const index = (section.panels ?? []).findIndex((placement) => placementIdentity(placement) === placementId);
      if (index >= 0) committedLocation = { section, index, placement: section.panels[index] };
    }
  }
  if (!committedLocation) throw new Error(`Committed chart Create is missing placement "${placementId}".`);
  const targetSections = (dashboard.pages ?? []).flatMap(({ sections = [] }) => sections)
    .filter(({ id }) => id === committedLocation.section.id);
  if (targetSections.length !== 1) {
    throw new Error(`Rebased chart Create requires one destination Section "${committedLocation.section.id}".`);
  }
  const target = targetSections[0];
  if ((target.panels ?? []).some((placement) => placementIdentity(placement) === placementId)) return;
  const committedIds = committedLocation.section.panels.map(placementIdentity);
  const previousIds = committedIds.slice(0, committedLocation.index).reverse();
  const nextIds = committedIds.slice(committedLocation.index + 1);
  const previousIndex = previousIds.map((id) => target.panels.findIndex((item) => placementIdentity(item) === id)).find((index) => index >= 0);
  const nextIndex = nextIds.map((id) => target.panels.findIndex((item) => placementIdentity(item) === id)).find((index) => index >= 0);
  const insertionIndex = previousIndex !== undefined ? previousIndex + 1 : nextIndex !== undefined ? nextIndex : target.panels.length;
  target.panels.splice(insertionIndex, 0, structuredClone(committedLocation.placement));
}

function removePlacementFromRebasedLayout(dashboard, placementId, chartId) {
  for (const page of dashboard.pages ?? []) {
    for (const section of page.sections ?? []) {
      section.panels = (section.panels ?? [])
        .filter((placement) => placementIdentity(placement) !== placementId);
    }
  }
  if (!chartId) return;
  dashboard.chronoGroups = (dashboard.chronoGroups ?? []).flatMap((group) => {
    if (!Array.isArray(group.members)) return [group];
    const members = group.members.filter((member) => member?.chartId !== chartId);
    return members.length > 0 ? [{ ...group, members }] : [];
  });
}

function entityId(entity) {
  return entity?.id;
}

function pageScopedSectionKey(pageId, sectionId) {
  return JSON.stringify([pageId, sectionId]);
}

function placementIdentity(placement) {
  return placement?.id ?? chartFromPlacement(placement)?.id;
}

function chartFromPlacement(placement) {
  return placement?.chart ?? placement;
}

function memberChartId(member) {
  return member?.chartId;
}

function chartReferenceId(chartId) {
  return chartId;
}

function sameSequence(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function sameProjection(left, right) {
  return stableSerialize(left) === stableSerialize(right);
}

function indexChronoGroups(chronoGroups, description) {
  const groups = cloneChronoGroups(chronoGroups);
  const indexed = new Map();
  for (const group of groups) {
    const groupId = requiredGroupId(group?.id);
    if (indexed.has(groupId)) {
      throw new Error(`${description} contain duplicate id "${groupId}".`);
    }
    indexed.set(groupId, group);
  }
  return indexed;
}

function stableSerialize(value, ancestors = new Set()) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (ancestors.has(value)) {
    throw new TypeError("Chart edit session data cannot contain circular references.");
  }
  ancestors.add(value);
  const serialized = Array.isArray(value)
    ? `[${value.map((entry) => stableSerialize(entry, ancestors)).join(",")}]`
    : `{${Object.keys(value).sort().map((key) => (
        `${JSON.stringify(key)}:${stableSerialize(value[key], ancestors)}`
      )).join(",")}}`;
  ancestors.delete(value);
  return serialized;
}

function normalizeRestoration(value, fallbackSurface) {
  const restoration = isRecord(value) ? value : {};
  const surface = requiredSurface(restoration.surface ?? fallbackSurface);
  const focusId = restoration.focusId ?? null;
  if (focusId !== null && typeof focusId !== "string") {
    throw new TypeError("Chart edit restoration focusId must be a string or null.");
  }
  const scrollTop = restoration.scrollTop ?? 0;
  if (!Number.isFinite(scrollTop) || scrollTop < 0) {
    throw new TypeError("Chart edit restoration scrollTop must be a non-negative number.");
  }
  return { surface, focusId, scrollTop };
}

function normalizeError(error) {
  return {
    code: typeof error?.code === "string" && error.code.trim()
      ? error.code
      : "CHART_EDIT_PERSISTENCE_FAILED",
    message: typeof error?.message === "string" && error.message.trim()
      ? error.message
      : "The chart change could not be saved.",
    retryable: error?.retryable !== false,
  };
}

function cloneChart(chart) {
  if (!isRecord(chart)) {
    throw new TypeError("Chart edit session chart data must be an object.");
  }
  return structuredClone(chart);
}

function cloneChronoGroups(chronoGroups) {
  if (!Array.isArray(chronoGroups)) {
    throw new TypeError("Chart edit session Chrono Groups must be an array.");
  }
  return structuredClone(chronoGroups);
}

function cloneRuntimeArtifact(runtimeArtifact) {
  if (runtimeArtifact === null || runtimeArtifact === undefined) return null;
  if (!isRecord(runtimeArtifact)) {
    throw new TypeError("Chart edit runtime artifact must be an object.");
  }
  return structuredClone(runtimeArtifact);
}

function assertSession(state) {
  if (
    !isRecord(state)
    || !isRecord(state.savedChart)
    || !isRecord(state.draft)
    || !Array.isArray(state.savedChronoGroups)
    || !Array.isArray(state.chronoGroups)
    || !isRecord(state.dirtyOrigins)
    || typeof state.dirtyOrigins.quick !== "boolean"
    || typeof state.dirtyOrigins.full !== "boolean"
    || (state.activeSurface !== null && !SURFACES.has(state.activeSurface))
    || typeof state.suspended !== "boolean"
    || !isRecord(state.restoration)
    || (state.pendingRuntimeArtifact !== null && !isRecord(state.pendingRuntimeArtifact))
    || !isValidPendingOperation(state.pendingOperation)
    || !STATUSES.has(state.status)
  ) {
    throw new TypeError("Chart edit session state is invalid.");
  }
  requiredPlacementId(state.placementId);
  normalizeRestoration(state.restoration, state.activeSurface ?? "quick");
}

function isValidPendingOperation(operation) {
  if (operation === null) return true;
  return isRecord(operation)
    && operation.kind === "remove"
    && isRecord(operation.intent)
    && operation.intent.kind === "remove"
    && operation.intent.placementId === operation.intent.placementId?.trim()
    && operation.intent.placementId !== "";
}

function assertNotSaving(state) {
  if (state.status === "saving") {
    throw new Error("Chart edit session is already saving.");
  }
}

function requiredPlacementId(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("Chart edit session placementId is required.");
  }
  return value;
}

function requiredGroupId(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("Chart edit Chrono Group id is required.");
  }
  return value;
}

function requiredSurface(value) {
  if (!SURFACES.has(value)) {
    throw new Error(`Unknown chart edit surface: ${String(value)}`);
  }
  return value;
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
