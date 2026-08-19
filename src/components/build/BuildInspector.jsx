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
  onTimeGroupChange,
  onOpenSceneComposer,
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
    return (
      <TimeGroupEditor
        dashboard={dashboard}
        group={group}
        disabled={disabled}
        labelRef={labelRef}
        onChange={(updates) => onTimeGroupChange?.(group.id, updates)}
        onOpenSceneComposer={onOpenSceneComposer}
      />
    );
  }
  if (selection?.kind === "section" && page && section) {
    const draft = sectionDrafts[section.id] ?? section;
    return (
      <section className="build-inspector" aria-labelledby="build-inspector-title">
        <p className="eyebrow">Section</p>
        <h2 id="build-inspector-title">{draft.title || "Untitled section"}</h2>
        <label>
          Description
          <textarea
            ref={labelRef}
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

function TimeGroupEditor({ dashboard, group, disabled, labelRef, onChange, onOpenSceneComposer }) {
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
      <p className="eyebrow">Time Group</p>
      <h2 id="build-inspector-title">{group.name || "Unnamed Time Group"}</h2>
      <label>
        Name
        <input
          ref={labelRef}
          aria-label="Time Group name"
          disabled={disabled}
          value={group.name ?? ""}
          onChange={(event) => onChange?.({ name: event.target.value })}
        />
      </label>
      <label>
        Start
        <input
          aria-label="Time Group start"
          type="date"
          disabled={disabled}
          value={group.period?.start ?? ""}
          onChange={(event) => {
            const start = event.target.value;
            if (start && (!group.period?.end || start <= group.period.end)) {
              onChange?.({ period: { ...group.period, start } });
            }
          }}
        />
      </label>
      <label>
        End
        <input
          aria-label="Time Group end"
          type="date"
          disabled={disabled}
          value={group.period?.end ?? ""}
          onChange={(event) => {
            const end = event.target.value;
            if (end && (!group.period?.start || end >= group.period.start)) {
              onChange?.({ period: { ...group.period, end } });
            }
          }}
        />
      </label>
      <label>
        Matching
        <select
          aria-label="Time Group matching"
          disabled={disabled}
          value={group.matching?.policy ?? "exact"}
          onChange={(event) => onChange?.({ matching: { policy: event.target.value } })}
        >
          <option value="exact">Concurrent only</option>
          <option value="lastKnown">Snap to latest</option>
        </select>
      </label>
      <label>
        Seconds per frame
        <input
          aria-label="Seconds per frame"
          type="number"
          min="0.1"
          step="0.1"
          disabled={disabled}
          value={group.secondsPerFrame ?? 1}
          onChange={(event) => {
            const secondsPerFrame = Number(event.target.value);
            if (secondsPerFrame > 0) onChange?.({ secondsPerFrame });
          }}
        />
      </label>
      <p>Dashboard timezone: {dashboard.timezone || "Not configured"}</p>
      <h3>Member charts</h3>
      <ul>
        {(group.members ?? []).map((member) => (
          <li key={`${member.chartId}:${member.timeRole}`}>
            {charts.get(member.chartId)?.title || member.chartId} — {member.timeRole || "time role"}
          </li>
        ))}
      </ul>
      <hr />
      <h3>Scenes</h3>
      <p>Compose a live audience Scene from this dashboard in Present.</p>
      <button type="button" disabled={disabled} onClick={onOpenSceneComposer}>
        Open live Scene composer
      </button>
    </section>
  );
}
