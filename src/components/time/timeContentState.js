const FILTERS = new Set(["all", "groups", "scenes"]);
const INTENTS = new Set(["create", "edit", "duplicate", "remove", "repair"]);
const CONFLICT_CHOICES = new Set(["save", "discard", "stay"]);

const GROUP_REASON_STAGES = Object.freeze({
  period: "period",
  "data-period": "period",
  "invalid-period": "period",
  "out-of-period": "period",
  membership: "charts",
  charts: "charts",
  "no-observation": "charts",
  "no-observations": "charts",
  "zero-observation": "charts",
  "member-no-observations": "charts",
  "missing-chart": "charts",
  matching: "defaults",
  cadence: "defaults",
  interpolation: "defaults",
  defaults: "defaults",
  "unsupported-interpolation": "defaults",
  review: "review",
  name: "review",
});

const SCENE_REASON_STAGES = Object.freeze({
  scope: "select",
  frame: "select",
  frames: "select",
  "selected-frame": "select",
  "selected-frame-missing": "select",
  "missing-frame": "select",
  "invalid-frame-rule": "select",
  "zero-frame-ledger": "select",
  "missing-chart": "select",
  "cross-page": "select",
  composition: "arrange",
  width: "arrange",
  presentation: "arrange",
  "present-layout": "arrange",
  "present-subset": "arrange",
  "invalid-present-subset": "arrange",
  "cross-page-chart": "arrange",
  "missing-chart": "arrange",
});

export function createTimeContentState({
  items = [],
  query = "",
  filter = "all",
  grouping = "ready",
  pageId = null,
  scrollTop = 0,
  focusId = null,
  activeDraft = null,
  runningSession = null,
} = {}) {
  assertFilter(filter);
  return {
    items: clone(items),
    query: String(query),
    filter,
    grouping,
    pageId,
    scrollTop: finiteScroll(scrollTop),
    focusId,
    activeDraft: activeDraft ? clone(activeDraft) : null,
    operation: null,
    conflict: null,
    error: null,
    runningSession,
    authoredContentChanged: false,
    returnContext: captureReturnContext({ query, filter, pageId, scrollTop, focusId }),
  };
}

export function reduceTimeContent(state, action) {
  if (!state || typeof state !== "object") {
    throw new TypeError("Time Content state is required.");
  }

  switch (action?.type) {
    case "REFRESH_ITEMS":
      if (!Array.isArray(action.items)) {
        throw new TypeError("Time Content refresh items must be an array.");
      }
      return { ...state, items: clone(action.items) };
    case "SET_QUERY":
      return {
        ...state,
        query: String(action.query ?? ""),
        error: null,
      };
    case "SET_FILTER":
      assertFilter(action.filter);
      return { ...state, filter: action.filter, error: null };
    case "SET_GROUPING":
      if (action.grouping !== "ready" && action.grouping !== "needs-attention") {
        throw new Error(`Unknown Time Content grouping: ${String(action.grouping)}`);
      }
      return { ...state, grouping: action.grouping, error: null };
    case "CAPTURE_RETURN_CONTEXT": {
      const returnContext = captureReturnContext({
        query: state.query,
        filter: state.filter,
        pageId: action.pageId ?? state.pageId,
        scrollTop: action.scrollTop ?? state.scrollTop,
        focusId: action.focusId ?? state.focusId,
      });
      return { ...state, ...returnContext, returnContext };
    }
    case "REQUEST_INTENT": {
      assertIntent(action.intent);
      const returnContext = captureReturnContext(state);
      const operation = {
        intent: action.intent,
        item: clone(action.item ?? {}),
        reason: action.reason ?? null,
        handoff: ownerHandoff(action.item ?? {}, action.intent, action.reason),
        returnContext,
        status: "pending",
      };
      if (state.activeDraft?.dirty === true) {
        return {
          ...state,
          operation: null,
          conflict: {
            status: "awaiting-choice",
            activeDraft: clone(state.activeDraft),
            pendingOperation: operation,
            options: ["save", "discard", "stay"],
          },
          error: null,
          returnContext,
        };
      }
      return {
        ...state,
        operation,
        conflict: null,
        error: null,
        returnContext,
      };
    }
    case "RESOLVE_CONFLICT": {
      if (!state.conflict) return state;
      if (!CONFLICT_CHOICES.has(action.choice)) {
        throw new Error(`Unknown temporal draft conflict choice: ${String(action.choice)}`);
      }
      if (action.choice === "stay") {
        return { ...state, operation: null, conflict: null, error: null };
      }
      if (action.choice === "discard") {
        return {
          ...state,
          activeDraft: null,
          operation: state.conflict.pendingOperation,
          conflict: null,
          error: null,
        };
      }
      return {
        ...state,
        operation: null,
        conflict: { ...state.conflict, status: "saving" },
        error: null,
      };
    }
    case "DRAFT_SAVE_FAILED":
      if (!state.conflict) return state;
      return {
        ...state,
        conflict: { ...state.conflict, status: "failed" },
        error: normalizeError(action.error, "Draft save failed."),
      };
    case "DRAFT_SAVE_SUCCEEDED":
      if (!state.conflict) return state;
      return {
        ...state,
        activeDraft: null,
        operation: state.conflict.pendingOperation,
        conflict: null,
        error: null,
        authoredContentChanged: state.runningSession
          ? true
          : state.authoredContentChanged,
      };
    case "OPERATION_FAILED":
      if (!state.operation) return state;
      return {
        ...state,
        operation: { ...state.operation, status: "failed" },
        error: normalizeError(action.error, "Time Content operation failed."),
      };
    case "RETRY_OPERATION":
      if (!state.operation) return state;
      return {
        ...state,
        operation: { ...state.operation, status: "pending" },
        error: null,
      };
    case "OPERATION_SUCCEEDED":
      if (!state.operation) return state;
      return {
        ...state,
        items: Array.isArray(action.items) ? clone(action.items) : state.items,
        operation: null,
        conflict: null,
        error: null,
        authoredContentChanged: state.runningSession
          ? true
          : state.authoredContentChanged,
      };
    case "RETURN_TO_LIBRARY": {
      const returnContext = state.operation?.returnContext
        ?? state.conflict?.pendingOperation?.returnContext
        ?? state.returnContext;
      return {
        ...state,
        ...returnContext,
        operation: null,
        conflict: null,
        error: null,
        returnContext,
      };
    }
    case "ACKNOWLEDGE_AUTHORED_CONTENT_CHANGED":
      return { ...state, authoredContentChanged: false };
    default:
      throw new Error(`Unknown Time Content action: ${String(action?.type)}`);
  }
}

export function ownerHandoff(item, intent, reason) {
  assertIntent(intent);
  const itemType = normalizeItemType(item?.type);
  const normalizedReason = normalizeReason(reason);
  if (itemType === "group") {
    const stage = GROUP_REASON_STAGES[normalizedReason]
      ?? (intent === "create" ? "period" : "review");
    return {
      owner: `time-group:${stage}`,
      surface: "time-group",
      stage,
      itemId: item?.id ?? null,
      intent,
      reason: reason ?? null,
    };
  }

  const stage = SCENE_REASON_STAGES[normalizedReason] ?? "select";
  return {
    owner: `scene:${stage}`,
    surface: "scene",
    stage,
    itemId: item?.id ?? null,
    intent,
    reason: reason ?? null,
  };
}

export function selectTimeContentSections(state) {
  const query = String(state?.query ?? "").trim().toLocaleLowerCase();
  const filter = state?.filter ?? "all";
  assertFilter(filter);
  const visible = (state?.items ?? []).filter((item) => {
    const type = normalizeItemType(item?.type);
    if (filter === "groups" && type !== "group") return false;
    if (filter === "scenes" && type !== "scene") return false;
    if (!query) return true;
    const searchable = [
      item?.name,
      item?.pageLabel,
      ...(item?.needsAttention ?? []).flatMap((finding) => [finding?.code, finding?.message]),
    ].filter(Boolean).join(" ").toLocaleLowerCase();
    return searchable.includes(query);
  });
  return {
    ready: visible.filter((item) => !hasNeedsAttention(item)),
    needsAttention: visible.filter(hasNeedsAttention),
  };
}

export function getTimeContentEmptyState(state, sections = selectTimeContentSections(state)) {
  if ((state?.items ?? []).length === 0) {
    return {
      kind: "empty-library",
      message: "No Time Groups or Scenes have been created yet.",
    };
  }
  if (sections.ready.length === 0 && sections.needsAttention.length === 0) {
    return {
      kind: "no-results",
      message: "No Time Groups or Scenes match the current search and filter.",
    };
  }
  return null;
}

export function createRunningTemporalSnapshot({ mode, content }) {
  if (mode !== "view" && mode !== "present") {
    throw new Error('A running temporal snapshot mode must be "view" or "present".');
  }
  return deepFreeze({
    mode,
    content: clone(content),
    started: true,
  });
}

function captureReturnContext(source) {
  return {
    pageId: source?.pageId ?? null,
    scrollTop: finiteScroll(source?.scrollTop),
    focusId: source?.focusId ?? null,
    query: String(source?.query ?? ""),
    filter: source?.filter ?? "all",
  };
}

function normalizeItemType(type) {
  if (type === "group" || type === "time-group") return "group";
  if (type === "scene") return "scene";
  throw new Error(`Unknown Time Content item type: ${String(type)}`);
}

function normalizeReason(reason) {
  return String(reason ?? "")
    .trim()
    .toLocaleLowerCase()
    .replaceAll("_", "-")
    .replace(/\s+/g, "-");
}

function hasNeedsAttention(item) {
  return item?.status === "needs-attention"
    || (Array.isArray(item?.needsAttention) && item.needsAttention.length > 0);
}

function assertFilter(filter) {
  if (!FILTERS.has(filter)) {
    throw new Error(`Unknown Time Content filter: ${String(filter)}`);
  }
}

function assertIntent(intent) {
  if (!INTENTS.has(intent)) {
    throw new Error(`Unknown Time Content intent: ${String(intent)}`);
  }
}

function finiteScroll(value) {
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function normalizeError(error, fallbackMessage) {
  if (error && typeof error === "object") {
    return {
      code: error.code ?? "OPERATION_FAILED",
      message: error.message ?? fallbackMessage,
      retryable: error.retryable !== false,
    };
  }
  return {
    code: "OPERATION_FAILED",
    message: typeof error === "string" ? error : fallbackMessage,
    retryable: true,
  };
}

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
