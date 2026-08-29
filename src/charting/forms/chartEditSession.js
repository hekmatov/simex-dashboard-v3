const SURFACES = new Set(["quick", "full"]);
const STATUSES = new Set(["clean", "dirty", "saving", "error"]);

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
  return {
    placementId: requiredPlacementId(placementId),
    savedChart,
    savedChronoGroups,
    draft: structuredClone(savedChart),
    chronoGroups: structuredClone(savedChronoGroups),
    dirtyOrigins: { quick: false, full: false },
    activeSurface: surface,
    suspended: false,
    restoration: normalizeRestoration(restoration, surface),
    status: "clean",
    error: null,
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

export function chartEditSessionPendingSurface(state) {
  assertSession(state);
  if (!isChartEditSessionDirty(state)) return null;
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
  return isChartEditSessionDirty(suspended) ? suspended : null;
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

export function prepareChartEditSessionSave(state) {
  assertSession(state);
  assertNotSaving(state);
  if (!isChartEditSessionDirty(state)) {
    throw new Error("Chart edit Save requires a real change.");
  }
  return {
    session: {
      ...state,
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
  return payload;
}

export function prepareConfirmedChartEditRemoval(state) {
  assertSession(state);
  assertNotSaving(state);
  return {
    session: {
      ...state,
      status: "saving",
      error: null,
    },
    intent: {
      kind: "remove",
      placementId: state.placementId,
    },
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
  return {
    ...state,
    activeSurface: null,
    suspended: dirty,
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
    || !STATUSES.has(state.status)
  ) {
    throw new TypeError("Chart edit session state is invalid.");
  }
  requiredPlacementId(state.placementId);
  normalizeRestoration(state.restoration, state.activeSurface ?? "quick");
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
