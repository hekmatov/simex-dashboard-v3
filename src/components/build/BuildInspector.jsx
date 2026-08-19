import React from "react";

export default function BuildInspector({
  dashboard = {},
  selection,
  dashboardDraft = {},
  pageDrafts = {},
  sectionDrafts = {},
  disabled = false,
  focusLabelKey = 0,
  onDashboardChange,
  onPageChange,
  onSectionChange,
}) {
  const labelRef = React.useRef(null);
  const page = (dashboard.pages ?? []).find(({ id }) => id === selection?.pageId);
  const section = (page?.sections ?? []).find(({ id }) => id === selection?.sectionId);
  const placement = (section?.panels ?? []).find(({ id }) => id === selection?.placementId);
  const chart = placement?.chart ?? placement;
  const group = (dashboard.timeSyncGroups ?? []).find(({ id }) => id === selection?.groupId);

  React.useEffect(() => {
    if (focusLabelKey > 0) labelRef.current?.focus();
  }, [focusLabelKey, selection?.kind, selection?.pageId, selection?.sectionId]);

  if (selection?.kind === "chart" && chart) {
    return (
      <section className="build-inspector build-chart-selection" aria-labelledby="build-inspector-title">
        <p className="eyebrow">Selected chart</p>
        <h2 id="build-inspector-title">{chart.title || "Untitled chart"}</h2>
        <p>Editing in the Unit Orbit attached to this chart.</p>
      </section>
    );
  }
  if (selection?.kind === "timeGroup" && group) {
    return <TimeGroupSummary dashboard={dashboard} group={group} />;
  }
  if (selection?.kind === "section" && page && section) {
    const draft = sectionDrafts[section.id] ?? section;
    return (
      <section className="build-inspector" aria-labelledby="build-inspector-title">
        <p className="eyebrow">Section</p>
        <h2 id="build-inspector-title">{section.title || "Untitled section"}</h2>
        <label>
          Section title
          <input
            ref={labelRef}
            disabled={disabled}
            value={draft.title ?? ""}
            onChange={(event) => onSectionChange?.(section, { title: event.target.value })}
          />
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
        <h2 id="build-inspector-title">{page.label || page.title || "Untitled page"}</h2>
        <label>
          Page label
          <input
            ref={labelRef}
            disabled={disabled}
            value={draft.label ?? ""}
            onChange={(event) => onPageChange?.(page.id, { label: event.target.value })}
          />
        </label>
        <label>
          Page title
          <input
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
      </section>
    );
  }
  return (
    <section className="build-inspector" aria-labelledby="build-inspector-title">
      <p className="eyebrow">Scenario</p>
      <h2 id="build-inspector-title">Scenario details</h2>
      <label>
        Program
        <input
          ref={labelRef}
          disabled={disabled}
          value={dashboardDraft.programLabel ?? ""}
          onChange={(event) => onDashboardChange?.({ programLabel: event.target.value })}
        />
      </label>
      <label>
        Scenario
        <input
          disabled={disabled}
          value={dashboardDraft.scenarioLabel ?? ""}
          onChange={(event) => onDashboardChange?.({ scenarioLabel: event.target.value })}
        />
      </label>
      <label>
        Updated date
        <input
          disabled={disabled}
          value={dashboardDraft.lastUpdated ?? ""}
          onChange={(event) => onDashboardChange?.({ lastUpdated: event.target.value })}
        />
      </label>
    </section>
  );
}

function TimeGroupSummary({ dashboard, group }) {
  const charts = new Map((dashboard.pages ?? []).flatMap((page) => (
    (page.sections ?? []).flatMap((section) => (
      (section.panels ?? []).map((placement) => {
        const chart = placement.chart ?? placement;
        return [chart.id, chart];
      })
    ))
  )));
  return (
    <section className="build-inspector build-time-group-summary" aria-labelledby="build-inspector-title">
      <p className="eyebrow">Time group</p>
      <h2 id="build-inspector-title">{group.name || "Unnamed time group"}</h2>
      <dl>
        <div><dt>Primary clock</dt><dd>{group.primaryClock?.timeField || "Not configured"}</dd></div>
        <div><dt>Matching</dt><dd>{group.matching?.policy || "Not configured"}</dd></div>
      </dl>
      <h3>Member charts</h3>
      <ul>
        {(group.members ?? []).map((member) => (
          <li key={`${member.chartId}:${member.timeRole}`}>
            {charts.get(member.chartId)?.title || member.chartId} — {member.timeRole || "time role"}
          </li>
        ))}
      </ul>
    </section>
  );
}
