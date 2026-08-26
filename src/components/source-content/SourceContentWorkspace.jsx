import React from "react";
import { listManageableSourceEntries } from "../../content-library/sourceEntrySchema.js";
import ContentDetail, { buildContentRenameDraft } from "./ContentDetail.jsx";
import DataSourceCatalogue from "./DataSourceCatalogue.jsx";
import MediaCatalogue from "./MediaCatalogue.jsx";

const EMPTY_FILTERS = Object.freeze({ origin: "all", status: "all", usage: "all", kind: "all" });

export default function SourceContentWorkspace({
  dashboard,
  viewportWidth,
  initialSelectedId = null,
  viewState = null,
  onViewStateChange,
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

  const updateViewState = (updater) => {
    const next = createSourceContentViewState(
      typeof updater === "function" ? updater(browseState) : updater,
    );
    if (viewState === null) setLocalViewState(next);
    onViewStateChange?.(next);
  };

  React.useEffect(() => () => {
    for (const draftId of pendingDraftIds.current) onContentDraftDiscard?.(draftId, "manager-unmount");
    pendingDraftIds.current.clear();
  }, [onContentDraftDiscard]);

  const filters = { ...filterState[tab], query: queries[tab] };
  const items = visibleManagerItems(dashboard, tab, filters);
  const selectedId = selections[tab];
  const selected = items.find(({ id }) => id === selectedId)
    ?? (layout === "desktop" ? items[0] ?? null : null);

  const selectItem = (id) => {
    updateViewState((current) => ({
      ...current,
      selections: { ...current.selections, [tab]: id },
      tabletDetailOpen: layout === "tablet" ? true : current.tabletDetailOpen,
    }));
  };

  const rename = async (values) => {
    if (!selected || !onContentDraftStage || !onContentDraftCommit) return;
    const { buildCandidate, ...draftInput } = buildContentRenameDraft({ dashboard, item: selected, ...values });
    const staged = onContentDraftStage(draftInput);
    const draftId = staged?.draftId ?? draftInput.draftId;
    pendingDraftIds.current.add(draftId);
    try {
      await onContentDraftCommit(draftId, buildCandidate);
      pendingDraftIds.current.delete(draftId);
    } catch (error) {
      throw error;
    }
  };

  if (layout === "unsupported") return <p>Build is not available at this viewport width.</p>;
  const catalogueProps = {
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
  };
  const catalogue = tab === "media" ? <MediaCatalogue {...catalogueProps} /> : <DataSourceCatalogue {...catalogueProps} />;
  const detail = (
    <section className="source-content-detail" aria-label="Content detail">
      {layout === "tablet" && <button type="button" className="secondary source-content-back" onClick={() => updateViewState((current) => ({ ...current, tabletDetailOpen: false }))}>Back</button>}
      <ContentDetail item={selected} datasetProfile={dashboard.datasetProfiles?.[selected?.id]} onRename={rename} />
    </section>
  );
  return (
    <section className="source-content-workspace" data-manager-layout={layout} aria-labelledby="source-content-heading">
      <header className="source-content-workspace__header">
        <div><p className="eyebrow">Build</p><h2 id="source-content-heading">Source content</h2></div>
        <p>Manage reusable media and dashboard data sources without leaving the canvas.</p>
      </header>
      <div className="source-content-tabs" role="tablist" aria-label="Source content categories">
        <button type="button" role="tab" aria-selected={tab === "media"} onClick={() => updateViewState((current) => ({ ...current, tab: "media", tabletDetailOpen: false }))}>Media</button>
        <button type="button" role="tab" aria-selected={tab === "sources"} onClick={() => updateViewState((current) => ({ ...current, tab: "sources", tabletDetailOpen: false }))}>Data sources</button>
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
