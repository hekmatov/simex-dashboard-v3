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
  onContentDraftStage,
  onContentDraftCommit,
  onContentDraftDiscard,
}) {
  const width = useViewportWidth(viewportWidth);
  const layout = managerLayoutForWidth(width);
  const [tab, setTab] = React.useState("media");
  const [queries, setQueries] = React.useState({ media: "", sources: "" });
  const [filterState, setFilterState] = React.useState({ media: { ...EMPTY_FILTERS }, sources: { ...EMPTY_FILTERS } });
  const [selections, setSelections] = React.useState({ media: initialSelectedId, sources: null });
  const [tabletDetailOpen, setTabletDetailOpen] = React.useState(Boolean(initialSelectedId));
  const pendingDraftIds = React.useRef(new Set());

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
    setSelections((current) => ({ ...current, [tab]: id }));
    if (layout === "tablet") setTabletDetailOpen(true);
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
    onQueryChange: (query) => setQueries((current) => ({ ...current, [tab]: query })),
    onFilterChange: (name, value) => setFilterState((current) => ({ ...current, [tab]: { ...current[tab], [name]: value } })),
    onSelect: selectItem,
  };
  const catalogue = tab === "media" ? <MediaCatalogue {...catalogueProps} /> : <DataSourceCatalogue {...catalogueProps} />;
  const detail = (
    <section className="source-content-detail" aria-label="Content detail">
      {layout === "tablet" && <button type="button" className="secondary source-content-back" onClick={() => setTabletDetailOpen(false)}>Back</button>}
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
        <button type="button" role="tab" aria-selected={tab === "media"} onClick={() => { setTab("media"); setTabletDetailOpen(false); }}>Media</button>
        <button type="button" role="tab" aria-selected={tab === "sources"} onClick={() => { setTab("sources"); setTabletDetailOpen(false); }}>Data sources</button>
      </div>
      <div className="source-content-composition">
        {(layout === "desktop" || !tabletDetailOpen) && catalogue}
        {(layout === "desktop" || tabletDetailOpen) && detail}
      </div>
    </section>
  );
}

export function managerLayoutForWidth(width) {
  const value = Number(width);
  if (value < 768) return "unsupported";
  if (value < 1200) return "tablet";
  return "desktop";
}

export function visibleManagerItems(dashboard = {}, tab = "media", filters = {}) {
  const base = tab === "media"
    ? Object.entries(dashboard.contentLibrary?.mediaItems ?? {}).map(([id, record]) => contentItem(dashboard, id, "media", record))
    : listManageableSourceEntries(dashboard.contentLibrary ?? {}, dashboard.dataSources ?? {})
      .map((record) => contentItem(dashboard, record.sourceId, record.kind, record));
  const query = String(filters.query ?? "").trim().toLocaleLowerCase();
  return base.filter((item) => (
    (!query || item.record.displayName.toLocaleLowerCase().includes(query) || item.id.toLocaleLowerCase().includes(query))
    && (!filters.origin || filters.origin === "all" || item.record.origin === filters.origin)
    && (!filters.status || filters.status === "all" || item.record.health === filters.status)
    && (!filters.usage || filters.usage === "all" || (filters.usage === "used" ? item.usageCount > 0 : item.usageCount === 0))
    && (!filters.kind || filters.kind === "all" || item.kind === filters.kind)
  )).sort((left, right) => left.record.displayName.localeCompare(right.record.displayName));
}

function contentItem(dashboard, id, kind, record) {
  const uses = directUses(dashboard, id, kind);
  return { id, kind, record, typeLabel: kind === "media" ? "Image" : kind === "csv" ? "CSV" : "GeoJSON", usageCount: uses.length, uses, activeRetainers: [] };
}

function directUses(dashboard, id, kind) {
  const uses = [];
  for (const page of dashboard.pages ?? []) for (const section of page.sections ?? []) for (const panel of section.panels ?? []) {
    const chart = panel.chart ?? panel;
    const placement = dashboard.dataSources?.[chart.sourceId];
    const matches = kind === "media" ? placement?.mediaId === id
      : kind === "csv" ? chart.sourceId === id
        : chart.presentation?.map?.geoSource === id;
    if (matches) uses.push({
      id: `${page.id}:${section.id}:${panel.id}`,
      pageId: page.id, pageLabel: page.label ?? page.title ?? page.id,
      sectionId: section.id, sectionLabel: section.title ?? section.label ?? section.id,
      panelId: panel.id, panelLabel: chart.title ?? panel.id,
    });
  }
  return uses;
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
