import React from "react";

import BalancedTwinCanvas from "./BalancedTwinCanvas.jsx";
import { partitionSceneCharts } from "./sceneDraft.js";

const STAGES = Object.freeze([
  { id: "select", label: "Select charts and frames" },
  { id: "arrange", label: "Arrange and configure" },
]);

export default function SceneEditor({ draft, charts = [], chronoGroups = [], pages = [], disabled = false, onAction }) {
  const value = draft?.value ?? {};
  const busy = disabled || draft?.status === "saving";
  const dirty = ["dirty", "error", "suspended"].includes(draft?.status);
  const selectedIds = new Set((value.members ?? []).map(({ chartId }) => chartId));
  return (
    <section className="scene-studio" aria-labelledby="scene-studio-title">
      <header className="build-surface-heading scene-identity-band">
        <div>
          <p className="eyebrow">Scene draft</p>
          <h2 id="scene-studio-title">{value.name || "Untitled Scene"}</h2>
          <p>{chronoGroups.find(({ id }) => id === value.chronoGroupId)?.name ?? value.chronoGroupId ?? "Choose Chrono Group"} → {value.name || "Untitled Scene"}</p>
        </div>
        <span className="build-draft-status" data-status={draft?.status ?? "clean"}>
          {draft?.status === "saving" ? "Saving Scene" : dirty ? "Unsaved Scene" : "Scene saved"}
        </span>
      </header>
      <nav className="scene-stage-navigation" aria-label="Scene authoring stages">
        {STAGES.map((stage, index) => (
          <button
            type="button"
            key={stage.id}
            aria-current={draft?.stage === stage.id ? "step" : undefined}
            disabled={busy}
            onClick={() => onAction?.({ type: "SET_STAGE", stage: stage.id })}
          >
            <span>{index + 1}</span> {stage.label}
          </button>
        ))}
      </nav>
      {draft?.error && <p className="build-operation-error" role="alert">{draft.error.message}</p>}
      {draft?.stage === "arrange" ? (
        <ArrangeStage value={value} charts={charts} busy={busy} onAction={onAction} />
      ) : (
        <SelectStage value={value} charts={charts} chronoGroups={chronoGroups} pages={pages} selectedIds={selectedIds} busy={busy} onAction={onAction} />
      )}
      <footer className="build-surface-actions">
        <button type="button" disabled={busy || !dirty} onClick={() => onAction?.({ type: "SAVE_REQUEST" })}>Save Scene</button>
        <button type="button" className="secondary" disabled={busy || !dirty} onClick={() => onAction?.({ type: "DISCARD" })}>Discard Scene</button>
      </footer>
    </section>
  );
}

function SelectStage({ value, charts, chronoGroups, pages, selectedIds, busy, onAction }) {
  const regions = partitionSceneCharts(charts, value.members ?? []);
  return (
    <div className="scene-stage-body" data-stage="select">
      <section className="scene-definition-fields" aria-labelledby="scene-define-title">
        <h3 id="scene-define-title">Select and define</h3>
        <label>Scene name<input id="scene-name" value={value.name ?? ""} disabled={busy} onChange={(event) => onAction?.({ type: "SET_NAME", value: event.target.value })} /></label>
        <label>Parent Chrono Group<select value={value.chronoGroupId ?? ""} disabled={busy} onChange={(event) => onAction?.({ type: "SET_CHRONO_GROUP", chronoGroupId: event.target.value })}>
          <option value="">Choose Chrono Group</option>
          {chronoGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
        </select></label>
        <label>Owning page<select value={value.pageId ?? ""} disabled={busy} onChange={(event) => onAction?.({ type: "SET_SCOPE", pageId: event.target.value })}>
          <option value="">Choose page</option>
          {pages.map((page) => <option key={page.id} value={page.id}>{page.label ?? page.title ?? page.id}</option>)}
        </select></label>
      </section>
      <section className="scene-membership-ledger" aria-label="Scene membership availability">
        <SceneLedgerRegion title="Selected for this Scene" charts={regions.selected} selectedIds={selectedIds} busy={busy} onAction={onAction} />
        <SceneLedgerRegion title="Needs attention" charts={regions.needsAttention} selectedIds={selectedIds} busy={busy} onAction={onAction} needsAttention />
        <SceneLedgerRegion title="Available from parent Chrono Group" charts={regions.available} selectedIds={selectedIds} busy={busy} onAction={onAction} />
      </section>
      <label>
        Frame source
        <select
          value={value.frames?.mode === "source" ? value.frames.chartId : "calendar"}
          disabled={busy}
          onChange={(event) => onAction?.({
            type: "SET_FRAMES",
            value: event.target.value === "calendar"
              ? { mode: "calendar", interval: { value: 1, unit: "day" } }
              : { mode: "source", chartId: event.target.value, selection: "all" },
          })}
        >
          {(value.members ?? []).map(({ chartId }) => <option key={chartId} value={chartId}>{chartId}</option>)}
          <option value="calendar">Calendar interval</option>
        </select>
      </label>
    </div>
  );
}

function SceneLedgerRegion({ title, charts, selectedIds, busy, onAction, needsAttention = false }) {
  return <section data-region={needsAttention ? "needs-attention" : undefined}>
    <h3>{title}</h3>
    {charts.length === 0 ? <p>No charts in this region.</p> : charts.map((chart) => (
      <label className="choice-control-row" key={chart.id}>
        <input
          className="choice-control"
          type="checkbox"
          checked={selectedIds.has(chart.id)}
          disabled={busy || (selectedIds.has(chart.id) && selectedIds.size === 1)}
          onChange={() => onAction?.({ type: selectedIds.has(chart.id) ? "REMOVE_MEMBER" : "ADD_MEMBER", chartId: chart.id })}
        />
        <span><strong>{chart.title ?? chart.label ?? chart.id}</strong><small>{chart.pageLabel ?? chart.pageId}</small></span>
      </label>
    ))}
  </section>;
}

function ArrangeStage({ value, charts, busy, onAction }) {
  return (
    <div className="scene-stage-body" data-stage="arrange">
      <BalancedTwinCanvas scene={value} charts={charts} disabled={busy} onAction={onAction} />
      <section className="scene-shared-settings">
        <h3>Shared Scene settings</h3>
        <label>
          Seconds per frame
          <input type="number" min="0.1" step="0.1" value={value.secondsPerFrame ?? ""} placeholder="Inherit group" disabled={busy} onChange={(event) => onAction?.({ type: "SET_SECONDS_PER_FRAME", value: event.target.value })} />
        </label>
        <fieldset>
          <legend>Audience date position</legend>
          {[
            ["xPermille", "Horizontal"],
            ["yPermille", "Vertical"],
            ["widthPermille", "Width"],
          ].map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                type="number"
                min="0"
                max="1000"
                value={value.audience?.datePosition?.[key] ?? ""}
                disabled={busy}
                onChange={(event) => onAction?.({
                  type: "SET_DATE_POSITION",
                  value: { ...value.audience?.datePosition, [key]: Number(event.target.value) },
                })}
              />
            </label>
          ))}
        </fieldset>
      </section>
    </div>
  );
}
