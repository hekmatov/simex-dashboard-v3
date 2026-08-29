const STUDIOS = new Set(["chrono", "scene"]);
const STATUS_FILTERS = new Set(["all", "ready", "needs-attention"]);
const ITEM_TYPES = new Set(["chronoGroup", "scene"]);

export function createChronoContentState({
  chronoGroups = [],
  scenes = [],
  pages = [],
  findings = [],
  studio = "chrono",
  query = "",
  statusFilter = "all",
  pageId = null,
  scrollTop = 0,
  focusId = null,
  activeDraft = null,
  runningSession = null,
} = {}) {
  assertStudio(studio);
  assertStatusFilter(statusFilter);
  return {
    chronoGroups: clone(chronoGroups),
    scenes: clone(scenes),
    pages: clone(pages),
    findings: clone(findings),
    studio,
    view: "library",
    selectedItemType: null,
    selectedItemId: null,
    query: String(query),
    statusFilter,
    pageId,
    scrollTop: finiteScroll(scrollTop),
    focusId,
    activeDraft: activeDraft ? clone(activeDraft) : null,
    operation: null,
    conflict: null,
    error: null,
    runningSession,
    authoredContentChanged: false,
    studioContexts: {
      chrono: browseContext({ query: studio === "chrono" ? query : "", statusFilter: "all", pageId: studio === "chrono" ? pageId : null, scrollTop: 0, focusId: null }),
      scene: browseContext({ query: studio === "scene" ? query : "", statusFilter: "all", pageId: studio === "scene" ? pageId : null, scrollTop: 0, focusId: null }),
    },
    returnContext: captureContext({ studio, view: "library", selectedItemId: null, pageId, scrollTop, focusId, query, statusFilter }),
  };
}

export function reduceChronoContent(state, action) {
  if (!state || typeof state !== "object") throw new TypeError("Chrono content state is required.");
  switch (action?.type) {
    case "REFRESH_CONTENT":
      return {
        ...state,
        chronoGroups: clone(action.chronoGroups ?? state.chronoGroups),
        scenes: clone(action.scenes ?? state.scenes),
        pages: clone(action.pages ?? state.pages),
        findings: clone(action.findings ?? state.findings),
      };
    case "SET_STUDIO": {
      assertStudio(action.studio);
      const currentContext = browseContext(state);
      const nextContext = action.studio === state.studio
        ? currentContext
        : (state.studioContexts?.[action.studio] ?? browseContext({ pageId: state.pageId }));
      return {
        ...state,
        ...nextContext,
        studio: action.studio,
        studioContexts: {
          ...state.studioContexts,
          [state.studio]: currentContext,
        },
        view: "library",
        selectedItemType: null,
        selectedItemId: null,
        operation: null,
        error: null,
      };
    }
    case "SET_QUERY":
      return { ...state, query: String(action.query ?? ""), error: null };
    case "SET_STATUS_FILTER":
      assertStatusFilter(action.statusFilter);
      return { ...state, statusFilter: action.statusFilter, error: null };
    case "SET_PAGE_FILTER":
      return { ...state, pageId: action.pageId ?? null, error: null };
    case "CAPTURE_RETURN_CONTEXT": {
      const returnContext = captureContext({ ...state, ...action.context });
      return { ...state, ...returnContext, returnContext };
    }
    case "OPEN_CONTENT": {
      assertItemType(action.itemType);
      const returnContext = captureContext(state);
      return {
        ...state,
        view: "content",
        studio: action.itemType === "scene" ? "scene" : "chrono",
        selectedItemType: action.itemType,
        selectedItemId: action.itemId,
        operation: null,
        conflict: null,
        error: null,
        returnContext,
      };
    }
    case "START_CREATE_CHRONO_GROUP":
      return requestOperation(state, { intent: "create", itemType: "chronoGroup", itemId: null, parentChronoGroupId: null });
    case "START_CREATE_SCENE":
      return {
        ...requestOperation(state, {
        intent: "create",
        itemType: "scene",
        itemId: null,
        parentChronoGroupId: action.parentChronoGroupId ?? (state.selectedItemType === "chronoGroup" ? state.selectedItemId : null),
        }),
        studio: "scene",
      };
    case "START_EDIT":
      return requestOperation(state, {
        intent: "edit",
        itemType: action.itemType ?? state.selectedItemType,
        itemId: action.itemId ?? state.selectedItemId,
        parentChronoGroupId: null,
      });
    case "START_DUPLICATE":
      return requestOperation(state, {
        intent: "duplicate",
        itemType: action.itemType ?? state.selectedItemType,
        itemId: action.itemId ?? state.selectedItemId,
        parentChronoGroupId: null,
      });
    case "START_REPAIR":
      return requestOperation(state, {
        intent: "repair",
        itemType: action.itemType ?? state.selectedItemType,
        itemId: action.itemId ?? state.selectedItemId,
        parentChronoGroupId: null,
        stage: action.stage ?? null,
        focusId: action.focusId ?? null,
      });
    case "RETURN_TO_CONTENT":
      return {
        ...state,
        ...(state.returnContext ?? captureContext(state)),
        operation: null,
        conflict: null,
        error: null,
      };
    case "RETURN_TO_STUDIO":
      return {
        ...state,
        ...state.returnContext,
        view: "library",
        selectedItemType: null,
        selectedItemId: null,
        operation: null,
        conflict: null,
        error: null,
      };
    case "RESOLVE_CONFLICT":
      return resolveConflict(state, action.choice);
    case "DRAFT_SAVE_FAILED":
      return state.conflict ? { ...state, conflict: { ...state.conflict, status: "failed" }, error: normalizedError(action.error, "Draft save failed.") } : state;
    case "DRAFT_SAVE_SUCCEEDED":
      return state.conflict ? {
        ...state,
        activeDraft: null,
        view: "editor",
        operation: state.conflict.pendingOperation,
        conflict: null,
        error: null,
      } : state;
    case "OPERATION_FAILED":
      return state.operation ? { ...state, operation: { ...state.operation, status: "failed" }, error: normalizedError(action.error, "Chrono authoring operation failed.") } : state;
    case "RETRY_OPERATION":
      return state.operation ? { ...state, operation: { ...state.operation, status: "pending" }, error: null } : state;
    case "OPERATION_SUCCEEDED":
      return {
        ...state,
        chronoGroups: clone(action.chronoGroups ?? state.chronoGroups),
        scenes: clone(action.scenes ?? state.scenes),
        view: action.returnToContent === false ? "library" : (state.selectedItemId ? "content" : "library"),
        operation: null,
        conflict: null,
        error: null,
        authoredContentChanged: state.runningSession ? true : state.authoredContentChanged,
      };
    case "ACKNOWLEDGE_AUTHORED_CONTENT_CHANGED":
      return { ...state, authoredContentChanged: false };
    default:
      throw new Error(`Unknown Chrono content action: ${String(action?.type)}`);
  }
}

export function selectChronoStudioCards(state) {
  return filterByQueryAndStatus((state?.chronoGroups ?? []).map((group) => ({
    ...clone(group),
    type: "chronoGroup",
    status: statusFor(state, "chronoGroup", group.id),
    statusReasons: reasonsFor(state, "chronoGroup", group.id),
    sceneCount: (state?.scenes ?? []).filter((scene) => scene.chronoGroupId === group.id).length,
    pageIds: groupPageIds(state, group),
  })), state);
}

export function selectSceneStudioSections(state) {
  const cards = filterByQueryAndStatus((state?.scenes ?? []).map((scene) => ({
    ...clone(scene),
    type: "scene",
    status: statusFor(state, "scene", scene.id),
    statusReasons: reasonsFor(state, "scene", scene.id),
    chronoGroupName: (state?.chronoGroups ?? []).find(({ id }) => id === scene.chronoGroupId)?.name ?? scene.chronoGroupId,
  })), state);
  const byPage = new Map(cards.map((scene) => [scene.pageId, []]));
  for (const scene of cards) byPage.get(scene.pageId).push(scene);
  return (state?.pages ?? []).flatMap((page) => byPage.has(page.id) ? [{ pageId: page.id, pageLabel: page.label ?? page.title ?? page.id, scenes: byPage.get(page.id) }] : []);
}

export function selectChronoGroupContent(state, id) {
  const group = (state?.chronoGroups ?? []).find((candidate) => candidate.id === id);
  if (!group) return null;
  const childScenes = (state?.scenes ?? []).filter((scene) => scene.chronoGroupId === id);
  const pageSections = chartLocations(state?.pages ?? [])
    .filter(({ chart }) => (group.chartIds ?? group.members?.map(({ chartId }) => chartId) ?? []).includes(chart.id))
    .reduce((sections, entry) => {
      let section = sections.find(({ pageId }) => pageId === entry.pageId);
      if (!section) {
        section = { pageId: entry.pageId, pageLabel: entry.pageLabel, charts: [], sceneIds: childScenes.filter(({ pageId }) => pageId === entry.pageId).map(({ id: sceneId }) => sceneId) };
        sections.push(section);
      }
      section.charts.push(entry.chart);
      return sections;
    }, []);
  for (const page of state?.pages ?? []) {
    const sceneIds = childScenes.filter(({ pageId }) => pageId === page.id).map(({ id: sceneId }) => sceneId);
    if (sceneIds.length && !pageSections.some(({ pageId }) => pageId === page.id)) pageSections.push({ pageId: page.id, pageLabel: page.label ?? page.title ?? page.id, charts: [], sceneIds });
  }
  return { ...clone(group), status: statusFor(state, "chronoGroup", id), statusReasons: reasonsFor(state, "chronoGroup", id), childScenes: clone(childScenes), pageSections };
}

export function selectSceneContent(state, id) {
  const scene = (state?.scenes ?? []).find((candidate) => candidate.id === id);
  if (!scene) return null;
  const group = (state?.chronoGroups ?? []).find(({ id: groupId }) => groupId === scene.chronoGroupId);
  const locations = chartLocations(state?.pages ?? []);
  return {
    ...clone(scene),
    status: statusFor(state, "scene", id),
    statusReasons: reasonsFor(state, "scene", id),
    chronoGroupName: group?.name ?? scene.chronoGroupId,
    memberCharts: (scene.members ?? []).map((member) => ({
      ...clone(member),
      ...clone(locations.find(({ chart }) => chart.id === member.chartId) ?? {}),
    })),
  };
}

export function createRunningTemporalSnapshot({ mode, content }) {
  if (mode !== "view" && mode !== "present") throw new Error('A running temporal snapshot mode must be "view" or "present".');
  return deepFreeze({ mode, content: clone(content), started: true });
}

function requestOperation(state, operation) {
  assertItemType(operation.itemType);
  const pendingOperation = { ...operation };
  const returnContext = captureContext(state);
  if (state.activeDraft?.dirty === true) {
    return { ...state, operation: null, conflict: { status: "awaiting-choice", pendingOperation, options: ["save", "discard", "stay"] }, error: null, returnContext };
  }
  return { ...state, view: "editor", operation: pendingOperation, conflict: null, error: null, returnContext };
}

export function withTemporalOwnerScope(draft, kind, localDraftId) {
  if (!draft) return draft;
  if (!new Set(["chrono", "scene"]).has(kind)) {
    throw new Error(`Unknown temporal owner kind: ${String(kind)}`);
  }
  if (typeof localDraftId !== "string" || localDraftId.trim() === "") {
    throw new Error("Temporal owner local draft id is required.");
  }
  return { ...draft, ownerKind: kind, ownerScopeId: localDraftId };
}

export function selectTemporalDraftOwners(drafts = {}) {
  return [
    temporalOwner(drafts.chronoGroup, "chrono", "chrono-studio"),
    temporalOwner(drafts.scene, "scene", "scene-studio"),
  ].filter(Boolean);
}

function temporalOwner(draft, kind, surface) {
  if (!draft || draft.ownerKind !== kind || !draft.ownerScopeId) return null;
  const activity = draft.status === "suspended" ? "suspended" : "active";
  const status = draft.status === "suspended" ? draft.suspendedStatus : draft.status;
  if (!new Set(["dirty", "saving", "error"]).has(status)) return null;
  return {
    draftId: `${kind}:${draft.ownerScopeId}`,
    kind,
    scopeId: draft.ownerScopeId,
    targetId: draft.stage ?? draft.restoration?.stage ?? null,
    status,
    activity,
    surface,
    restoration: draft.restoration ?? null,
  };
}

function resolveConflict(state, choice) {
  if (!state.conflict) return state;
  if (!["save", "discard", "stay"].includes(choice)) throw new Error(`Unknown temporal draft conflict choice: ${String(choice)}`);
  if (choice === "stay") return { ...state, conflict: null, operation: null, error: null };
  if (choice === "save") return { ...state, conflict: { ...state.conflict, status: "saving" }, error: null };
  return { ...state, activeDraft: null, view: "editor", operation: state.conflict.pendingOperation, conflict: null, error: null };
}

function filterByQueryAndStatus(items, state) {
  const query = String(state?.query ?? "").trim().toLocaleLowerCase();
  return items.filter((item) => {
    if ((state?.statusFilter ?? "all") !== "all" && item.status !== state.statusFilter) return false;
    if (state?.pageId && item.pageId !== state.pageId && !item.pageIds?.includes(state.pageId)) return false;
    return !query || [item.name, item.pageLabel, item.chronoGroupName].filter(Boolean).join(" ").toLocaleLowerCase().includes(query);
  });
}

function statusFor(state, itemType, itemId) {
  const findings = (state?.findings ?? []).filter((finding) => (finding.itemType ?? finding.type) === itemType && (finding.itemId ?? finding.id) === itemId);
  return findings.length ? "needs-attention" : "ready";
}

function reasonsFor(state, itemType, itemId) {
  return (state?.findings ?? []).filter((finding) => (finding.itemType ?? finding.type) === itemType && (finding.itemId ?? finding.id) === itemId).map((finding) => finding.message ?? finding.reason ?? finding.code ?? "Needs repair");
}

function groupPageIds(state, group) {
  const chartIds = new Set(group.chartIds ?? group.members?.map(({ chartId }) => chartId) ?? []);
  const chartPages = chartLocations(state?.pages ?? []).filter(({ chart }) => chartIds.has(chart.id)).map(({ pageId }) => pageId);
  const scenePages = (state?.scenes ?? []).filter((scene) => scene.chronoGroupId === group.id).map(({ pageId }) => pageId);
  return [...new Set([...chartPages, ...scenePages])];
}

function chartLocations(pages) {
  return pages.flatMap((page) => (page.sections ?? []).flatMap((section) => (section.panels ?? []).map((placement) => ({
    pageId: page.id,
    pageLabel: page.label ?? page.title ?? page.id,
    sectionId: section.id,
    sectionLabel: section.title ?? section.id,
    chart: clone(placement.chart ?? placement),
  }))));
}

function captureContext(source) {
  return {
    studio: source?.studio ?? "chrono",
    view: source?.view ?? "library",
    selectedItemId: source?.selectedItemId ?? null,
    pageId: source?.pageId ?? null,
    scrollTop: finiteScroll(source?.scrollTop),
    focusId: source?.focusId ?? null,
    query: String(source?.query ?? ""),
    statusFilter: source?.statusFilter ?? "all",
  };
}

function browseContext(source) {
  return {
    query: String(source?.query ?? ""),
    statusFilter: source?.statusFilter ?? "all",
    pageId: source?.pageId ?? null,
    scrollTop: finiteScroll(source?.scrollTop),
    focusId: source?.focusId ?? null,
  };
}

function finiteScroll(value) { return Number.isFinite(value) && value >= 0 ? value : 0; }
function assertStudio(value) { if (!STUDIOS.has(value)) throw new Error(`Unknown Chrono studio: ${String(value)}`); }
function assertStatusFilter(value) { if (!STATUS_FILTERS.has(value)) throw new Error(`Unknown Chrono status filter: ${String(value)}`); }
function assertItemType(value) { if (!ITEM_TYPES.has(value)) throw new Error(`Unknown Chrono content item type: ${String(value)}`); }
function normalizedError(error, fallback) { return { code: error?.code ?? "OPERATION_FAILED", message: error?.message ?? fallback, retryable: error?.retryable !== false }; }
function clone(value) { return value == null ? value : structuredClone(value); }
function deepFreeze(value) { if (!value || typeof value !== "object" || Object.isFrozen(value)) return value; for (const child of Object.values(value)) deepFreeze(child); return Object.freeze(value); }
