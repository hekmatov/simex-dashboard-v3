const BASE_CAPABILITIES = Object.freeze([
  { id: "data", label: "Data" },
  { id: "content", label: "Content" },
  { id: "appearance", label: "Appearance" },
  { id: "axes", label: "Axes" },
  { id: "interaction", label: "Interaction" },
  { id: "size", label: "Size" },
  { id: "advanced", label: "Advanced" },
]);

export function collectChartPlacements(dashboard = {}) {
  return (dashboard.pages ?? []).flatMap((page) =>
    (page.sections ?? []).flatMap((section) =>
      (section.panels ?? []).map((placement) => ({
        pageId: page.id,
        sectionId: section.id,
        placementId: placement.id,
        placement,
        chart: placement.chart ?? placement,
      })),
    ),
  );
}

export function compatibleUnitOrbitCapabilities(item) {
  if (!item?.chart) return [];
  const collection = Boolean(item.chart.collection) || item.chart.type === "collection";
  return collection
    ? BASE_CAPABILITIES
      .filter(({ id }) => id !== "axes")
      .flatMap((capability) => capability.id === "size"
        ? [{ id: "collection", label: "Collection" }, capability]
        : [capability])
    : BASE_CAPABILITIES.slice();
}

export function filterChartCollection(items, query) {
  if (!Array.isArray(items) || items.length === 0) return { kind: "empty", items: [] };
  const normalized = String(query ?? "").trim().toLocaleLowerCase();
  if (!normalized) return { kind: "results", items: items.slice() };
  const filtered = items.filter((item) => [
    item.chart?.title,
    item.chart?.id,
    item.placementId,
  ].some((value) => String(value ?? "").toLocaleLowerCase().includes(normalized)));
  return { kind: filtered.length ? "results" : "no-results", items: filtered };
}

export function validatePanelDraft(chart = {}) {
  const footprint = chart.footprint ?? {};
  if (
    !Number.isInteger(footprint.columns)
    || footprint.columns < 1
    || footprint.columns > 4
    || !Number.isInteger(footprint.rows)
    || footprint.rows < 1
    || footprint.rows > 2
  ) {
    return issue("FOOTPRINT_OUT_OF_RANGE", "Choose a footprint from 1–4 columns and 1–2 rows.");
  }
  const collection = Boolean(chart.collection) || chart.type === "collection";
  if (collection && (chart.chronoGroupIds?.length || chart.sceneIds?.length)) {
    return issue("COLLECTION_TEMPORAL_INELIGIBLE", "Collection Display charts cannot join Chrono Groups or Scenes.");
  }
  if (!String(chart.title ?? "").trim()) return issue("CHART_TITLE_REQUIRED", "Enter a chart title.");
  return null;
}

export function createPanelEditingState({ placement, restoration = null }) {
  const chart = placement?.chart ?? placement?.placement?.chart ?? placement?.placement ?? placement;
  const saved = clone(chart);
  return {
    placementId: placement?.placementId ?? placement?.id ?? null,
    saved,
    draft: clone(saved),
    status: "clean",
    error: null,
    restoration: clone(restoration),
  };
}

export function reducePanelEditingState(state, action) {
  switch (action?.type) {
    case "EDIT":
      return { ...state, draft: { ...state.draft, ...clone(action.updates) }, status: "dirty", error: null };
    case "SAVE_REQUEST": {
      const validation = validatePanelDraft(state.draft);
      return validation ? { ...state, status: "error", error: validation } : { ...state, status: "saving", error: null };
    }
    case "SAVE_SUCCEEDED": {
      const saved = clone(action.savedValue ?? state.draft);
      return { ...state, saved, draft: clone(saved), status: "clean", error: null };
    }
    case "SAVE_FAILED":
      return { ...state, status: "error", error: normalizeError(action.error) };
    case "DISCARD":
      return { ...state, draft: clone(state.saved), status: "clean", error: null };
    case "STAY":
      return { ...state, status: changed(state) ? "dirty" : "clean", error: null };
    case "SUSPEND":
      return { ...state, status: "suspended", restoration: clone(action.restoration ?? state.restoration) };
    case "RESUME":
      return { ...state, status: changed(state) ? "dirty" : "clean" };
    default:
      throw new Error(`Unknown panel editing action: ${String(action?.type)}`);
  }
}

function changed(state) {
  return JSON.stringify(state.saved) !== JSON.stringify(state.draft);
}

function issue(code, message, retryable = false) {
  return { code, message, retryable };
}

function normalizeError(error) {
  return {
    code: error?.code ?? "PANEL_SAVE_FAILED",
    message: error?.message ?? "The chart could not be saved.",
    retryable: error?.retryable !== false,
  };
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}
