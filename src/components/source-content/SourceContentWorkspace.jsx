import React from "react";
import { listManageableSourceEntries } from "../../content-library/sourceEntrySchema.js";
import ContentDetail, { buildContentRenameDraft } from "./ContentDetail.jsx";
import DataSourceCatalogue from "./DataSourceCatalogue.jsx";
import MediaCatalogue from "./MediaCatalogue.jsx";

const EMPTY_FILTERS = Object.freeze({ origin: "all", status: "all", usage: "all", kind: "all" });

export default function SourceContentWorkspace({
  dashboard,
  contentDraftCoordinator = null,
  geoDataSources = {},
  viewportWidth,
  active = true,
  initialSelectedId = null,
  viewState = null,
  ownerControllerRef = null,
  onOwnersChange,
  onRetainedOwnersChange,
  onViewStateChange,
  onRequestClose,
  onContentDraftStage,
  onContentDraftCommit,
  onContentDraftDiscard,
}) {
  const width = useViewportWidth(viewportWidth);
  const layout = managerLayoutForWidth(width);
  const [localViewState, setLocalViewState] = React.useState(() => createSourceContentViewState({
    selections: { media: initialSelectedId, sources: null },
    tabletDetailOpen: Boolean(initialSelectedId),
  }));
  const browseState = viewState ?? localViewState;
  const { tab, queries, filters: filterState, selections, tabletDetailOpen } = browseState;
  const pendingDraftIds = React.useRef(new Set());
  const rootRef = React.useRef(null);
  const lastRestorationRef = React.useRef(null);
  const activeRef = React.useRef(active);
  activeRef.current = active;
  const [ownerRegistry, dispatchOwnerRegistry] = React.useReducer(
    reduceSourceContentOwnerRegistry,
    undefined,
    createSourceContentOwnerRegistry,
  );
  const ownerRegistryRef = React.useRef(ownerRegistry);
  ownerRegistryRef.current = ownerRegistry;
  const [ownerResetGeneration, setOwnerResetGeneration] = React.useState(0);
  const [renameOperation, setRenameOperation] = React.useState({ busy: false, error: "" });
  const renamePromiseRef = React.useRef(null);
  const retainedSourceContentOwners = React.useMemo(
    () => selectRetainedSourceContentOwners(ownerRegistry),
    [ownerRegistry],
  );
  const sourceContentOwners = React.useMemo(
    () => retainedSourceContentOwners.filter((owner) => owner.eligible !== false),
    [retainedSourceContentOwners],
  );
  const preserveDraftsOnUnmount = !shouldDiscardSourceContentDraftsOnUnmount(
    active,
    sourceContentOwners.length,
  );
  const ownerLocked = sourceContentOwners.length > 0;

  const stageDraft = React.useCallback((input) => {
    const staged = onContentDraftStage?.(input);
    const draftId = staged?.draftId ?? input.draftId;
    if (draftId) {
      pendingDraftIds.current.add(draftId);
      dispatchOwnerRegistry({
        type: "STAGE",
        input: { ...input, draftId },
        activity: active ? "active" : "suspended",
      });
    }
    return staged;
  }, [active, onContentDraftStage]);
  const commitDraft = React.useCallback(async (draftId, buildCandidate) => {
    dispatchOwnerRegistry({ type: "STATUS", transactionDraftId: draftId, status: "saving" });
    try {
      const result = await onContentDraftCommit?.(draftId, buildCandidate);
      pendingDraftIds.current.delete(draftId);
      dispatchOwnerRegistry({ type: "SUCCEEDED", transactionDraftId: draftId });
      return result;
    } catch (error) {
      dispatchOwnerRegistry({
        type: "STATUS",
        transactionDraftId: draftId,
        status: "error",
        error: error?.message ?? "Source Content could not be saved.",
      });
      throw error;
    }
  }, [onContentDraftCommit]);
  const discardDraft = React.useCallback(async (draftId, reason) => {
    const result = await onContentDraftDiscard?.(draftId, reason);
    pendingDraftIds.current.delete(draftId);
    dispatchOwnerRegistry({ type: "DISCARD", transactionDraftId: draftId });
    return result;
  }, [onContentDraftDiscard]);
  const setDraftEligibility = React.useCallback((draftId, eligible) => {
    dispatchOwnerRegistry({
      type: "ELIGIBILITY",
      transactionDraftId: draftId,
      eligible: eligible === true,
    });
  }, []);

  React.useEffect(() => {
    onOwnersChange?.(sourceContentOwners);
  }, [onOwnersChange, sourceContentOwners]);

  React.useEffect(() => {
    onRetainedOwnersChange?.(retainedSourceContentOwners);
  }, [onRetainedOwnersChange, retainedSourceContentOwners]);

  React.useEffect(() => () => {
    onRetainedOwnersChange?.([]);
  }, [onRetainedOwnersChange]);

  React.useImperativeHandle(ownerControllerRef, () => ({
    suspend() {
      const activeElement = typeof document === "undefined" ? null : document.activeElement;
      const activeInsideWorkspace = rootRef.current?.contains?.(activeElement) === true;
      const restoration = activeInsideWorkspace
        ? captureSourceContentRestoration(rootRef.current)
        : lastRestorationRef.current ?? captureSourceContentRestoration(rootRef.current);
      lastRestorationRef.current = restoration;
      dispatchOwnerRegistry({ type: "ACTIVITY", activity: "suspended", restoration });
      return restoration;
    },
    resume(ownerId = null) {
      dispatchOwnerRegistry({ type: "ACTIVITY", activity: "active" });
      restoreSourceContentFocus(rootRef.current, currentSourceContentRestoration(
        lastRestorationRef.current,
        ownerForId(ownerRegistryRef.current, ownerId),
      ));
      return true;
    },
    focus(ownerId = null) {
      restoreSourceContentFocus(rootRef.current, currentSourceContentRestoration(
        lastRestorationRef.current,
        ownerForId(ownerRegistryRef.current, ownerId),
      ));
      return true;
    },
    async discard(ownerId) {
      const owner = ownerForId(ownerRegistryRef.current, ownerId);
      if (!owner) return false;
      const result = await discardDraft(owner.transactionDraftId, "source-content-owner-discard");
      setOwnerResetGeneration((current) => current + 1);
      return result;
    },
  }), [discardDraft, ownerControllerRef]);

  const updateViewState = (updater) => {
    const next = createSourceContentViewState(
      typeof updater === "function" ? updater(browseState) : updater,
    );
    if (viewState === null) setLocalViewState(next);
    onViewStateChange?.(next);
  };

  React.useEffect(() => () => {
    if (!shouldDiscardSourceContentDraftsOnUnmount(
      activeRef.current,
      selectSourceContentOwners(ownerRegistryRef.current).length,
    )) return;
    for (const draftId of pendingDraftIds.current) onContentDraftDiscard?.(draftId, "manager-unmount");
    pendingDraftIds.current.clear();
  }, [onContentDraftDiscard]);

  const filters = { ...filterState[tab], query: queries[tab] };
  const items = visibleManagerItems(dashboard, tab, filters);
  const selectedId = selections[tab];
  const selected = items.find(({ id }) => id === selectedId)
    ?? (layout === "desktop" ? items[0] ?? null : null);

  const selectItem = (id) => {
    if (ownerLocked) return;
    updateViewState((current) => ({
      ...current,
      selections: { ...current.selections, [tab]: id },
      tabletDetailOpen: layout === "tablet" ? true : current.tabletDetailOpen,
    }));
  };

  const rename = async (values) => {
    if (!selected || !onContentDraftStage || !onContentDraftCommit || renamePromiseRef.current) {
      return renamePromiseRef.current;
    }
    const operation = (async () => {
      setRenameOperation({ busy: true, error: "" });
      const { buildCandidate, ...draftInput } = buildContentRenameDraft({ dashboard, item: selected, ...values });
      const existing = selectSourceContentOwners(ownerRegistryRef.current)
        .find(({ kind, scopeId }) => kind === "source-content-edit" && scopeId === selected.id);
      let draftId;
      if (existing) {
        draftId = existing.transactionDraftId;
        contentDraftCoordinator?.updateDraft?.(draftId, {
          payload: draftInput.payload,
          assetIds: draftInput.assetIds,
          mediaIds: draftInput.mediaIds,
          sourceIds: draftInput.sourceIds,
        });
      } else {
        const staged = stageDraft(draftInput);
        draftId = staged?.draftId ?? draftInput.draftId;
      }
      try {
        await commitDraft(draftId, buildCandidate);
        setRenameOperation({ busy: false, error: "" });
        return true;
      } catch (error) {
        setRenameOperation({
          busy: false,
          error: error?.message ?? "Source Content metadata could not be saved.",
        });
        return false;
      }
    })();
    renamePromiseRef.current = operation;
    try {
      return await operation;
    } finally {
      renamePromiseRef.current = null;
    }
  };

  const syncRenameDraft = (values) => {
    if (!selected || !onContentDraftStage) return;
    const draft = buildEligibleContentRenameDraft({ dashboard, item: selected, ...values });
    const draftId = `manager-rename-${selected.kind}-${selected.id}`;
    const retained = contentDraftCoordinator?.getActiveRetainers?.().records
      ?.some(({ ownerId }) => ownerId === draftId);
    if (!draft) {
      if (retained) {
        pendingDraftIds.current.delete(draftId);
        dispatchOwnerRegistry({ type: "DISCARD", transactionDraftId: draftId });
        void onContentDraftDiscard?.(draftId, "manager-rename-ineligible");
      }
      return;
    }
    const { buildCandidate: _buildCandidate, ...draftInput } = draft;
    if (retained) {
      contentDraftCoordinator?.updateDraft?.(draftId, draftInput);
      setDraftEligibility(draftId, true);
    } else {
      stageDraft(draftInput);
    }
  };

  if (layout === "unsupported") return <p>Build is not available at this viewport width.</p>;
  const catalogueProps = {
    dashboard,
    contentDraftCoordinator,
    items,
    query: queries[tab],
    filters: filterState[tab],
    selectedId: selected?.id ?? null,
    onQueryChange: (query) => updateViewState((current) => ({ ...current, queries: { ...current.queries, [tab]: query } })),
    onFilterChange: (name, value) => updateViewState((current) => ({
      ...current,
      filters: { ...current.filters, [tab]: { ...current.filters[tab], [name]: value } },
    })),
    onSelect: selectItem,
    onContentDraftStage: stageDraft,
    onContentDraftCommit: commitDraft,
    onContentDraftDiscard: discardDraft,
    onContentDraftEligibility: setDraftEligibility,
    preserveDraftsOnUnmount,
  };
  const catalogue = tab === "media"
    ? <MediaCatalogue key={`media:${ownerResetGeneration}`} {...catalogueProps} />
    : <DataSourceCatalogue key={`sources:${ownerResetGeneration}`} {...catalogueProps} />;
  const detail = (
    <section className="source-content-detail" aria-label="Content detail">
      {layout === "tablet" && <button type="button" className="secondary source-content-back" disabled={ownerLocked} onClick={() => updateViewState((current) => ({ ...current, tabletDetailOpen: false }))}>Back</button>}
      <ContentDetail
        key={`${selected?.kind ?? "empty"}:${selected?.id ?? "none"}:${ownerResetGeneration}`}
        item={selected}
        dashboard={dashboard}
        contentDraftCoordinator={contentDraftCoordinator}
        datasetProfile={dashboard.datasetProfiles?.[selected?.id]}
        geoData={geoDataSources[selected?.id] ?? dashboard.loadedData?.[selected?.id]}
        onRename={rename}
        onRenameDraftChange={syncRenameDraft}
        renameBusy={renameOperation.busy}
        renameError={renameOperation.error}
        onRequestClose={onRequestClose}
        onContentDraftStage={stageDraft}
        onContentDraftCommit={commitDraft}
        onContentDraftDiscard={discardDraft}
        onContentDraftEligibility={setDraftEligibility}
        preserveDraftsOnUnmount={preserveDraftsOnUnmount}
      />
    </section>
  );
  return (
    <section
      ref={rootRef}
      className="source-content-workspace"
      data-manager-layout={layout}
      aria-labelledby="source-content-heading"
      aria-busy={sourceContentOwners.some(({ status }) => status === "saving") ? "true" : undefined}
      onFocusCapture={(event) => {
        lastRestorationRef.current = captureSourceContentRestoration(rootRef.current, event.target);
      }}
      onBlurCapture={(event) => {
        lastRestorationRef.current = captureSourceContentRestoration(rootRef.current, event.target);
      }}
    >
      <header className="source-content-workspace__header">
        <div><p className="eyebrow">Build</p><h2 id="source-content-heading">Source content</h2></div>
        <p>Manage reusable media and dashboard data sources without leaving the canvas.</p>
      </header>
      <div className="source-content-tabs" role="tablist" aria-label="Source content categories">
        <button type="button" role="tab" aria-selected={tab === "media"} disabled={ownerLocked} onClick={() => updateViewState((current) => ({ ...current, tab: "media", tabletDetailOpen: false }))}>Media</button>
        <button type="button" role="tab" aria-selected={tab === "sources"} disabled={ownerLocked} onClick={() => updateViewState((current) => ({ ...current, tab: "sources", tabletDetailOpen: false }))}>Data sources</button>
      </div>
      <div className="source-content-composition">
        {(layout === "desktop" || !tabletDetailOpen) && catalogue}
        {(layout === "desktop" || tabletDetailOpen) && detail}
      </div>
    </section>
  );
}

export function createSourceContentViewState(input = {}) {
  const queries = input.queries ?? {};
  const filters = input.filters ?? {};
  const selections = input.selections ?? {};
  return {
    tab: input.tab === "sources" ? "sources" : "media",
    queries: {
      media: String(queries.media ?? ""),
      sources: String(queries.sources ?? ""),
    },
    filters: {
      media: normalizedFilters(filters.media),
      sources: normalizedFilters(filters.sources),
    },
    selections: {
      media: optionalId(selections.media),
      sources: optionalId(selections.sources),
    },
    tabletDetailOpen: input.tabletDetailOpen === true,
  };
}

export function managerLayoutForWidth(width) {
  const value = Number(width);
  if (value < 768) return "unsupported";
  if (value < 1200) return "tablet";
  return "desktop";
}

export function visibleManagerItems(dashboard = {}, tab = "media", filters = {}) {
  const base = tab === "media"
    ? Object.entries(dashboard.contentLibrary?.mediaItems ?? {}).map(([id, record]) => contentItem(dashboard, id, "media", record, dependencyStateFor(dashboard, "media", id)))
    : listManageableSourceEntries(dashboard.contentLibrary ?? {}, dashboard.dataSources ?? {})
      .map((record) => contentItem(dashboard, record.sourceId, record.kind, record, dependencyStateFor(dashboard, record.kind, record.sourceId)));
  const query = String(filters.query ?? "").trim().toLocaleLowerCase();
  return base.filter((item) => (
    (!query || item.record.displayName.toLocaleLowerCase().includes(query) || item.id.toLocaleLowerCase().includes(query))
    && (!filters.origin || filters.origin === "all" || item.record.origin === filters.origin)
    && (!filters.status || filters.status === "all" || item.record.health === filters.status)
    && (!filters.usage || filters.usage === "all" || (filters.usage === "used" ? item.usageCount > 0 : item.usageCount === 0))
    && (!filters.kind || filters.kind === "all" || item.kind === filters.kind)
  )).sort((left, right) => left.record.displayName.localeCompare(right.record.displayName));
}

export function createSourceContentOwnerRegistry() {
  return {};
}

export function reduceSourceContentOwnerRegistry(registry = createSourceContentOwnerRegistry(), action = {}) {
  if (action.type === "STAGE") {
    const owner = projectSourceContentOwner(action.input, action);
    return owner ? { ...registry, [owner.draftId]: owner } : registry;
  }
  if (action.type === "STATUS") {
    return mapSourceContentOwners(registry, action.transactionDraftId, (owner) => ({
      ...owner,
      status: action.status,
      ...(action.error ? { error: String(action.error) } : { error: undefined }),
    }));
  }
  if (action.type === "ELIGIBILITY") {
    return mapSourceContentOwners(registry, action.transactionDraftId, (owner) => ({
      ...owner,
      eligible: action.eligible === true,
    }));
  }
  if (action.type === "ACTIVITY") {
    return Object.fromEntries(Object.entries(registry).map(([id, owner]) => [id, {
      ...owner,
      activity: action.activity === "suspended" ? "suspended" : "active",
      restoration: action.restoration ?? owner.restoration ?? null,
    }]));
  }
  if (action.type === "SUCCEEDED" || action.type === "DISCARD") {
    return Object.fromEntries(Object.entries(registry)
      .filter(([, owner]) => owner.transactionDraftId !== action.transactionDraftId));
  }
  return registry;
}

export function selectRetainedSourceContentOwners(registry = {}) {
  return Object.values(registry)
    .sort((left, right) => left.draftId.localeCompare(right.draftId));
}

export function selectSourceContentOwners(registry = {}) {
  return selectRetainedSourceContentOwners(registry)
    .filter((owner) => owner.eligible !== false);
}

export function buildEligibleContentRenameDraft({ dashboard, item, displayName, defaultDescription = "" } = {}) {
  if (!item || typeof displayName !== "string" || displayName.trim() === "") return null;
  const currentName = String(item.record?.displayName ?? "");
  const currentDescription = item.kind === "media" ? String(item.record?.defaultDescription ?? "") : "";
  const nextDescription = item.kind === "media" ? String(defaultDescription ?? "") : "";
  if (displayName.trim() === currentName && nextDescription === currentDescription) return null;
  return buildContentRenameDraft({ dashboard, item, displayName, defaultDescription: nextDescription });
}

export function currentSourceContentRestoration(lastRestoration, owner) {
  return lastRestoration ?? owner?.restoration ?? null;
}

export function shouldDiscardSourceContentDraftsOnUnmount(active, ownerCount = 0) {
  return active === true || ownerCount === 0;
}

export function projectSourceContentOwner(input = {}, {
  activity = "active",
  restoration = null,
} = {}) {
  const transactionDraftId = optionalId(input.draftId);
  const edit = new Set([
    "manager-rename",
    "media-replacement",
    "csv-replacement",
    "geojson-replacement",
  ]).has(input.kind);
  const create = new Set([
    "manager-media-add",
    "manager-media-deduplicate",
    "manager-csv-add",
    "manager-geojson-add",
  ]).has(input.kind);
  if (!transactionDraftId || (!edit && !create)) return null;
  const scopeId = edit
    ? optionalId(input.payload?.itemId)
      ?? optionalId(input.payload?.mediaId)
      ?? optionalId(input.payload?.sourceId)
      ?? optionalId(input.mediaIds?.[0])
      ?? optionalId(input.sourceIds?.[0])
    : transactionDraftId;
  if (!scopeId) return null;
  const kind = edit ? "source-content-edit" : "source-content-create";
  return {
    draftId: `${kind}:${scopeId}`,
    kind,
    scopeId,
    targetId: scopeId,
    transactionDraftId,
    status: "dirty",
    activity: activity === "suspended" ? "suspended" : "active",
    surface: sourceContentSurface(input.kind),
    restoration,
  };
}

function mapSourceContentOwners(registry, transactionDraftId, update) {
  return Object.fromEntries(Object.entries(registry).map(([id, owner]) => [
    id,
    owner.transactionDraftId === transactionDraftId ? update(owner) : owner,
  ]));
}

function sourceContentSurface(kind) {
  if (new Set(["media-replacement", "csv-replacement", "geojson-replacement"]).has(kind)) {
    return "source-content-dialog";
  }
  if (kind === "manager-rename") return "source-content-detail";
  return "source-content-catalogue";
}

function ownerForId(registry, ownerId) {
  if (ownerId && registry[ownerId]) return registry[ownerId];
  return selectSourceContentOwners(registry)[0] ?? null;
}

function captureSourceContentRestoration(root, activeElement = null) {
  if (!root || typeof document === "undefined") return null;
  const currentElement = activeElement ?? document.activeElement;
  const focusable = sourceContentFocusable(root, { includeParkedHost: true });
  const focusIndex = focusable.indexOf(currentElement);
  const surface = currentElement?.closest?.('[role="dialog"]')
    ? "source-content-dialog"
    : currentElement?.closest?.(".source-content-detail")
      ? "source-content-detail"
      : "source-content-catalogue";
  const scrollHost = sourceContentScrollHost(root, surface);
  return {
    surface,
    focusIndex: focusIndex >= 0 ? focusIndex : 0,
    scrollTop: Number(scrollHost?.scrollTop ?? 0),
  };
}

function restoreSourceContentFocus(root, restoration) {
  if (!root || typeof window === "undefined") return;
  window.requestAnimationFrame(() => {
    const scrollHost = sourceContentScrollHost(root, restoration?.surface);
    if (scrollHost) scrollHost.scrollTop = Number(restoration?.scrollTop ?? 0);
    const focusable = sourceContentFocusable(root);
    const focusIndex = Number.isSafeInteger(restoration?.focusIndex) ? restoration.focusIndex : 0;
    (focusable[focusIndex] ?? root.querySelector("#source-content-heading") ?? root)?.focus?.({ preventScroll: true });
  });
}

function sourceContentScrollHost(root, surface) {
  if (surface === "source-content-dialog") {
    return root.querySelector('[role="dialog"]')
      ?? root.closest('[data-authoring-surface="source-content"]')
      ?? root;
  }
  if (surface === "source-content-detail") {
    return root.querySelector(".source-content-detail")
      ?? root.closest('[data-authoring-surface="source-content"]')
      ?? root;
  }
  return root.querySelector(".source-content-catalogue")
    ?? root.closest('[data-authoring-surface="source-content"]')
    ?? root;
}

function sourceContentFocusable(root, { includeParkedHost = false } = {}) {
  const authoringHost = root.closest('[data-authoring-surface="source-content"]');
  return [...root.querySelectorAll(
    'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )].filter((element) => {
    const hiddenAncestor = element.closest("[hidden]");
    return !hiddenAncestor || (includeParkedHost && hiddenAncestor === authoringHost);
  });
}

function contentItem(dashboard, id, kind, record, dependencyState = null) {
  const hasDependencyState = Array.isArray(dependencyState?.uses);
  const uses = hasDependencyState
    ? dependencyState.uses
    : Array.isArray(record.uses) ? record.uses : [];
  const usageCount = Number.isSafeInteger(record.usageCount) && record.usageCount >= 0
    ? record.usageCount
    : hasDependencyState ? uses.length : uses.length > 0 ? uses.length : null;
  return {
    id,
    kind,
    record,
    typeLabel: kind === "media" ? "Image" : kind === "csv" ? "CSV" : "GeoJSON",
    usageCount,
    usageKnown: usageCount !== null,
    uses,
    activeRetainers: Array.isArray(dependencyState?.activeRetainers) ? dependencyState.activeRetainers : [],
  };
}

function dependencyStateFor(dashboard, kind, id) {
  return dashboard.contentDependencyState?.[`${kind}:${id}`] ?? null;
}

function normalizedFilters(value = {}) {
  return {
    origin: String(value.origin ?? EMPTY_FILTERS.origin),
    status: String(value.status ?? EMPTY_FILTERS.status),
    usage: String(value.usage ?? EMPTY_FILTERS.usage),
    kind: String(value.kind ?? EMPTY_FILTERS.kind),
  };
}

function optionalId(value) {
  return typeof value === "string" && value ? value : null;
}

function useViewportWidth(explicitWidth) {
  const [width, setWidth] = React.useState(() => explicitWidth ?? (typeof window === "undefined" ? 1440 : window.innerWidth));
  React.useEffect(() => {
    if (explicitWidth !== undefined) { setWidth(explicitWidth); return undefined; }
    const update = () => setWidth(window.innerWidth);
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [explicitWidth]);
  return width;
}
