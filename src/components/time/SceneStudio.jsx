import React from "react";

import BalancedTwinCanvas from "./BalancedTwinCanvas.jsx";

const STAGES = Object.freeze([
  { id: "select", label: "Select charts and frames" },
  { id: "arrange", label: "Arrange and configure" },
]);

export default function SceneStudio({ draft, charts = [], disabled = false, onAction }) {
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
          <p>{value.groupId} → {value.name || "Untitled Scene"}</p>
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
        <SelectStage value={value} charts={charts} selectedIds={selectedIds} busy={busy} onAction={onAction} />
      )}
      <footer className="build-surface-actions">
        <button type="button" disabled={busy || !dirty} onClick={() => onAction?.({ type: "SAVE_REQUEST" })}>Save Scene</button>
        <button type="button" className="secondary" disabled={busy || !dirty} onClick={() => onAction?.({ type: "DISCARD" })}>Discard Scene</button>
      </footer>
    </section>
  );
}

function SelectStage({ value, charts, selectedIds, busy, onAction }) {
  return (
    <div className="scene-stage-body" data-stage="select">
      <section>
        <h3>Selected for this Scene</h3>
        <p>Choose charts from the parent Time Group and one Frame source.</p>
        <div className="scene-membership-ledger">
          {charts.map((chart) => (
            <label key={chart.id}>
              <input
                type="checkbox"
                checked={selectedIds.has(chart.id)}
                disabled={busy || (selectedIds.has(chart.id) && selectedIds.size === 1)}
                onChange={() => onAction?.({
                  type: selectedIds.has(chart.id) ? "REMOVE_MEMBER" : "ADD_MEMBER",
                  chartId: chart.id,
                })}
              />
              <span>{chart.title ?? chart.label ?? chart.id}</span>
              <small>{chart.pageLabel ?? value.pageId}</small>
            </label>
          ))}
        </div>
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

function ArrangeStage({ value, charts, busy, onAction }) {
  return (
    <div className="scene-stage-body" data-stage="arrange">
      <BalancedTwinCanvas scene={value} charts={charts} disabled={busy} onAction={onAction} />
      <section className="scene-shared-settings">
        <h3>Shared Scene settings</h3>
        <label>
          Scene name
          <input value={value.name ?? ""} disabled={busy} onChange={(event) => onAction?.({ type: "SET_NAME", value: event.target.value })} />
        </label>
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
