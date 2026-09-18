import React from "react";

export default function BuildPropertiesPane({
  dashboard = {},
  selection,
  dashboardDraft = {},
  pageDrafts = {},
  sectionDrafts = {},
  disabled = false,
  focusLabelKey = 0,
  onDashboardChange,
  onPageChange,
  onPageRemove,
  onSectionChange,
  onEditChart,
  onMoveChart,
  onRemoveChart,
  onStructureCommand,
}) {
  const labelRef = React.useRef(null);
  const page = (dashboard.pages ?? []).find(({ id }) => id === selection?.pageId);
  const section = (page?.sections ?? []).find(({ id }) => id === selection?.sectionId);
  const placement = (section?.panels ?? []).find(({ id }) => id === selection?.placementId);
  const chart = placement?.chart ?? placement;
  const group = (dashboard.chronoGroups ?? []).find(({ id }) => id === selection?.chronoGroupId);

  React.useEffect(() => {
    if (focusLabelKey > 0) labelRef.current?.focus();
  }, [focusLabelKey, selection?.kind, selection?.pageId, selection?.sectionId]);

  if (selection?.kind === "chart" && chart) {
    return (
      <section className="build-inspector build-chart-selection" aria-labelledby="build-inspector-title">
        <p className="eyebrow">Chart</p>
        <h2 id="build-inspector-title">{chart.title || "Untitled chart"}</h2>
        <dl className="build-inspector-facts">
          <div><dt>Type</dt><dd>{chart.typeId}</dd></div>
          <div><dt>Section</dt><dd>{section.title || section.id}</dd></div>
        </dl>
        <div className="build-inspector-actions">
          <button type="button" disabled={disabled} onClick={() => onEditChart?.(placement.id)}>Edit chart</button>
          <button type="button" className="secondary" disabled={disabled} onClick={(event) => onMoveChart?.(placement.id, event.currentTarget)}>Move…</button>
          <button type="button" className="secondary danger" disabled={disabled} onClick={() => onRemoveChart?.(placement.id)}>Remove…</button>
        </div>
      </section>
    );
  }
  if (selection?.kind === "chronoGroup" && group) {
    return <ChronoGroupSummary group={group} />;
  }
  if (selection?.kind === "section" && page && section) {
    const draft = sectionDrafts[section.id] ?? section;
    return (
      <section className="build-inspector" aria-labelledby="build-inspector-title">
        <p className="eyebrow">Section</p>
        <h2 id="build-inspector-title">{draft.title || "Untitled section"}</h2>
        <label>
          Title
          <input ref={labelRef} disabled={disabled} value={draft.title ?? ""} onChange={(event) => onSectionChange?.(section, { title: event.target.value })} />
        </label>
        <label>
          Description
          <textarea
            disabled={disabled}
            value={draft.description ?? ""}
            onChange={(event) => onSectionChange?.(section, { description: event.target.value })}
          />
        </label>
      </section>
    );
  }
  if (selection?.kind === "page" && page) {
    const draft = pageDrafts[page.id] ?? page;
    return (
      <section className="build-inspector" aria-labelledby="build-inspector-title">
        <p className="eyebrow">Page</p>
        <h2 id="build-inspector-title">{draft.label || page.title || "Untitled page"}</h2>
        <label>
          Page title
          <input
            ref={labelRef}
            disabled={disabled}
            value={draft.title ?? ""}
            onChange={(event) => onPageChange?.(page.id, { title: event.target.value })}
          />
        </label>
        <label>
          Description
          <textarea
            disabled={disabled}
            value={draft.description ?? ""}
            onChange={(event) => onPageChange?.(page.id, { description: event.target.value })}
          />
        </label>
        <div className="build-destructive-actions">
          <button
            type="button"
            className="danger"
            aria-label={`Delete ${draft.label || page.title || "Untitled"} page`}
            title={(dashboard.pages ?? []).length <= 1 ? "A dashboard must retain at least one Page." : undefined}
            disabled={disabled || (dashboard.pages ?? []).length <= 1}
            onClick={() => onPageRemove?.(page.id)}
          >
            Delete page…
          </button>
          {(dashboard.pages ?? []).length <= 1 && (
            <small>A dashboard must retain at least one Page.</small>
          )}
        </div>
      </section>
    );
  }
  return (
    <section className="build-inspector build-inspector-empty" aria-labelledby="build-inspector-title">
      <p className="eyebrow">Dashboard</p>
      <h2 id="build-inspector-title">{dashboard.title || "Untitled dashboard"}</h2>
      <p>{(dashboard.pages ?? []).length} pages. Select a Page, Section, or chart in Structure or on the canvas to edit it here. Scenario identity and package controls live in the Scenario Passport.</p>
    </section>
  );
}

function ChronoGroupSummary({ group }) {
  return (
    <section className="build-inspector build-chrono-group-summary" aria-labelledby="build-inspector-title">
      <p className="eyebrow">Chrono Group</p>
      <h2 id="build-inspector-title">{group.name || "Unnamed Chrono Group"}</h2>
      <p>{group.members?.length ?? 0} member charts</p>
      <p>Open this group in Chrono Studio to inspect its content or begin an edit.</p>
    </section>
  );
}
