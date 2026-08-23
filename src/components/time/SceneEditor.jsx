import React, { useState } from "react";

import { MATCHING_POLICY_LABELS } from "../../charting/time/temporalMatch.js";
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
          <p className="eyebrow">Temporal authoring</p>
          <h2 id="scene-studio-title">Scene Studio</h2>
          <p>{chronoGroups.find(({ id }) => id === value.chronoGroupId)?.name ?? "Choose Chrono Group"} → {value.name || "Untitled Scene"}</p>
        </div>
        <span className="build-draft-status" data-status={draft?.status ?? "clean"}>{draft?.status === "saving" ? "Saving Scene" : dirty ? "Unsaved Scene" : "Scene saved"}</span>
      </header>
      <div className="scene-studio__workspace">
        <main className="scene-studio__main">
          <nav className="scene-stage-navigation" aria-label="Scene authoring stages">
            {STAGES.map((stage, index) => <button type="button" key={stage.id} aria-current={draft?.stage === stage.id ? "step" : undefined} disabled={busy} onClick={() => onAction?.({ type: "SET_STAGE", stage: stage.id })}><span>{index + 1}</span> {stage.label}</button>)}
          </nav>
          {draft?.error && <p className="build-operation-error" role="alert">{draft.error.message}</p>}
          {draft?.stage === "arrange"
            ? <ArrangeStage draft={draft} charts={charts} busy={busy} onAction={onAction} />
            : <SelectStage value={value} charts={charts} selectedIds={selectedIds} busy={busy} onAction={onAction} />}
        </main>
        <SceneDraftPanel draft={draft} charts={charts} chronoGroups={chronoGroups} pages={pages} busy={busy} dirty={dirty} onAction={onAction} />
      </div>
    </section>
  );
}

function SceneDraftPanel({ draft, charts, chronoGroups, pages, busy, dirty, onAction }) {
  const value = draft?.value ?? {};
  const eligibleGroups = chronoGroups.filter((group) => {
    const groupIds = new Set(group.chartIds ?? group.members?.map(({ chartId }) => chartId) ?? []);
    return charts.some((chart) => groupIds.has(chart.id) && chart.pageId === value.pageId);
  });
  const readiness = draft?.error?.message ?? (value.name?.trim() && value.pageId && value.chronoGroupId && value.members?.length ? "Ready to save" : "Complete the required fields and select a chart");
  const periodDates = toDateInputs(value.period);
  const parentPeriod = eligibleGroups.find(({ id }) => id === value.chronoGroupId)?.period;
  const maximumDates = toDateInputs(parentPeriod);
  const setPeriod = (next) => onAction?.({ type: "SET_PERIOD", start: next.start, end: next.end });
  return (
    <aside className="scene-draft-panel" aria-labelledby="scene-draft-panel-title">
      <header><div><p className="eyebrow">Persistent draft</p><h3 id="scene-draft-panel-title">Scene Draft</h3></div><span data-status={draft?.status ?? "clean"}>{dirty ? "Unsaved" : "Saved"}</span></header>
      <label>Scene name<input id="scene-name" value={value.name ?? ""} disabled={busy} onChange={(event) => onAction?.({ type: "SET_NAME", value: event.target.value })} /></label>
      <label>Owning page<select value={value.pageId ?? ""} disabled={busy} onChange={(event) => onAction?.({ type: "SET_PAGE", pageId: event.target.value })}><option value="">Choose page</option>{pages.map((page) => <option key={page.id} value={page.id}>{page.label ?? page.title ?? page.id}</option>)}</select></label>
      <label>Parent Chrono Group<select value={value.chronoGroupId ?? ""} disabled={busy || !value.pageId} onChange={(event) => onAction?.({ type: "SET_CHRONO_GROUP", chronoGroupId: event.target.value || null })}><option value="">Choose Chrono Group</option>{eligibleGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
      <fieldset className="scene-draft-panel__period"><legend>Period</legend><div className="scene-draft-panel__period-inputs"><label>Start date<input type="date" min={maximumDates.start || undefined} max={periodDates.end || maximumDates.end || undefined} value={periodDates.start} disabled={busy || !value.chronoGroupId} onChange={(event) => setPeriod({ ...periodDates, start: event.target.value })} /></label><label>End date<input type="date" min={periodDates.start || maximumDates.start || undefined} max={maximumDates.end || undefined} value={periodDates.end} disabled={busy || !value.chronoGroupId} onChange={(event) => setPeriod({ ...periodDates, end: event.target.value })} /></label></div><small>Maximum: {formatPeriod(parentPeriod)}</small></fieldset>
      <fieldset><legend>Time mode</legend>
        <label className="choice-control-row"><input className="choice-control" type="radio" name="scene-time-mode" checked={value.frames?.mode !== "source"} disabled={busy} onChange={() => onAction?.({ type: "SET_FRAME_MODE", mode: "calendar" })} />Calendar interval</label>
        <label className="choice-control-row"><input className="choice-control" type="radio" name="scene-time-mode" checked={value.frames?.mode === "source"} disabled={busy || !value.members?.length} onChange={() => onAction?.({ type: "SET_FRAME_MODE", mode: "source" })} />Chart observations</label>
      </fieldset>
      {value.frames?.mode !== "source" && <div className="scene-calendar-interval"><label>Calendar interval value<input type="number" min="1" step="1" value={value.frames?.interval?.value ?? 1} disabled={busy} onChange={(event) => onAction?.({ type: "SET_CALENDAR_INTERVAL", value: event.target.value, unit: value.frames?.interval?.unit ?? "day" })} /></label><label>Calendar interval unit<select value={value.frames?.interval?.unit ?? "day"} disabled={busy} onChange={(event) => onAction?.({ type: "SET_CALENDAR_INTERVAL", value: value.frames?.interval?.value ?? 1, unit: event.target.value })}><option value="day">Days</option><option value="month">Months</option><option value="year">Years</option></select></label></div>}
      {value.frames?.mode === "source" && <label>Frame source<select value={value.frames.chartId ?? ""} disabled={busy} onChange={(event) => onAction?.({ type: "SET_FRAME_SOURCE", chartId: event.target.value })}>{(value.members ?? []).map(({ chartId }) => <option key={chartId} value={chartId}>{chartLabel(charts, chartId)}</option>)}</select></label>}
      <label>Default matching<select value={value.defaultMatching ?? "authored"} disabled={busy} onChange={(event) => onAction?.({ type: "SET_DEFAULT_MATCHING", matching: event.target.value })}><option value="authored">Inherit Chrono Group</option>{Object.values(MATCHING_POLICY_LABELS).map((label) => <option key={label} value={label}>{label}</option>)}</select></label>
      <label>Seconds per frame<input type="number" min="0.1" step="0.1" value={value.secondsPerFrame ?? ""} placeholder="Inherit group" disabled={busy} onChange={(event) => onAction?.({ type: "SET_SECONDS_PER_FRAME", value: event.target.value })} /></label>
      <section className="scene-save-readiness" aria-labelledby="scene-save-readiness-title"><h4 id="scene-save-readiness-title">Save readiness</h4><p role="status">{readiness}</p></section>
      <footer className="build-surface-actions"><button type="button" disabled={busy || !dirty} onClick={() => onAction?.({ type: "SAVE_REQUEST" })}>Save Scene</button><button type="button" className="secondary" disabled={busy || !dirty} onClick={() => onAction?.({ type: "DISCARD" })}>Discard Scene</button></footer>
    </aside>
  );
}

function SelectStage({ value, charts, selectedIds, busy, onAction }) {
  const [observationChart, setObservationChart] = useState(null);
  const regions = partitionSceneCharts(charts, value.members ?? []);
  return (
    <div className="scene-stage-body" data-stage="select">
      <header><h3>Select charts and frames</h3><p>Availability comes from the selected page and parent Chrono Group.</p></header>
      <section className="scene-membership-ledger" aria-label="Scene membership availability">
        <SceneLedgerRegion title="Selected for this Scene" charts={regions.selected} selectedIds={selectedIds} busy={busy} onAction={onAction} onInspect={setObservationChart} />
        <SceneLedgerRegion title="Needs attention" charts={regions.needsAttention} selectedIds={selectedIds} busy={busy} onAction={onAction} onInspect={setObservationChart} needsAttention />
        <SceneLedgerRegion title="Available from parent Chrono Group" charts={regions.available} selectedIds={selectedIds} busy={busy} onAction={onAction} onInspect={setObservationChart} />
      </section>
      {value.frames?.mode === "source" && <fieldset className="scene-frame-selection"><legend>Source observations</legend><label className="choice-control-row"><input className="choice-control" type="radio" name="scene-frame-selection" checked={value.frames?.selection !== "selected"} onChange={() => onAction?.({ type: "SET_FRAME_SELECTION", selection: "all" })} />Use all observations</label><label className="choice-control-row"><input className="choice-control" type="radio" name="scene-frame-selection" checked={value.frames?.selection === "selected"} onChange={() => onAction?.({ type: "SET_FRAME_SELECTION", selection: "selected", selectedEpochs: value.frames?.selectedEpochs ?? [] })} />Use selected observations</label><button type="button" className="secondary" onClick={() => setObservationChart(charts.find(({ id }) => id === value.frames?.chartId))}>Choose observations</button></fieldset>}
      {observationChart && <ObservationChecklist chart={observationChart} selectedEpochs={value.frames?.selectedEpochs ?? []} onAction={onAction} onClose={() => setObservationChart(null)} />}
    </div>
  );
}

function SceneLedgerRegion({ title, charts, selectedIds, busy, onAction, onInspect, needsAttention = false }) {
  return <section data-region={needsAttention ? "needs-attention" : undefined}><h3>{title}</h3>{charts.length === 0 ? <p>No charts in this region.</p> : <ol>{charts.map((chart) => <li key={chart.id}><details open={selectedIds.has(chart.id)}><summary><strong>{chart.title ?? chart.label ?? chart.id}</strong><span>{chart.pageLabel ?? chart.pageId} · {chart.sectionLabel ?? chart.sectionId ?? "Unsectioned"}</span></summary><p>{chart.variables?.reduce((count, variable) => count + (variable.observations?.length ?? 0), 0) ?? 0} available observations</p><SceneVariableEvidence chart={chart} /><div className="scene-ledger-actions"><label className="choice-control-row"><input className="choice-control" type="checkbox" checked={selectedIds.has(chart.id)} disabled={busy || (selectedIds.has(chart.id) && selectedIds.size === 1)} onChange={() => onAction?.({ type: selectedIds.has(chart.id) ? "REMOVE_MEMBER" : "ADD_MEMBER", chartId: chart.id })} />{selectedIds.has(chart.id) ? "Included in Scene" : "Include in Scene"}</label><button type="button" className="secondary" onClick={() => onInspect(chart)}>Inspect observations</button></div></details></li>)}</ol>}</section>;
}

function SceneVariableEvidence({ chart }) {
  const epochs = (chart.variables ?? []).flatMap((variable) => variable.observations ?? []).map(({ epochMs }) => epochMs).filter(Number.isFinite);
  let start = null;
  let end = null;
  for (const epochMs of epochs) {
    start = start === null ? epochMs : Math.min(start, epochMs);
    end = end === null ? epochMs : Math.max(end, epochMs);
  }
  return <div className="scene-variable-evidence"><p><strong>Full data</strong> {formatDate(start)}–{formatDate(end)}</p>{(chart.variables ?? []).map((variable) => <div className="scene-variable-evidence__row" key={variable.id ?? variable.label}><span><strong>{variable.label ?? variable.id}</strong><small>{variable.observations?.length ?? 0} observations</small></span><span className="scene-availability-calendar" aria-label={`${variable.label ?? variable.id} observation timeline`}>{(variable.observations ?? []).map((observation, index) => <i key={`${observation.epochMs}-${index}`} style={{ left: tickPosition(observation.epochMs, start, end) }} />)}</span></div>)}</div>;
}

function ObservationChecklist({ chart, selectedEpochs, onAction, onClose }) {
  const epochs = [...new Set((chart.variables ?? []).flatMap((variable) => variable.observations ?? []).map(({ epochMs }) => epochMs).filter(Number.isFinite))].sort();
  return <div className="scene-observation-dialog" role="dialog" aria-modal="true" aria-labelledby="scene-observation-title"><div><header><h3 id="scene-observation-title">{chart.label ?? chart.title ?? chart.id} observations</h3><button type="button" onClick={onClose}>Close</button></header>{epochs.length === 0 ? <p>No observations available.</p> : <ol>{epochs.map((epochMs) => <li key={epochMs}><label className="choice-control-row"><input className="choice-control" type="checkbox" checked={selectedEpochs.includes(epochMs)} onChange={(event) => onAction?.({ type: "SET_FRAME_SELECTION", selection: "selected", selectedEpochs: event.target.checked ? [...selectedEpochs, epochMs].sort() : selectedEpochs.filter((value) => value !== epochMs) })} />{new Date(epochMs).toISOString()}</label></li>)}</ol>}</div></div>;
}

function ArrangeStage({ draft, charts, busy, onAction }) { return <div className="scene-stage-body" data-stage="arrange"><BalancedTwinCanvas scene={draft.value} charts={charts} selectedChartId={draft.selectedChartId} activeBoard={draft.activeBoard} disabled={busy} onAction={onAction} /></div>; }
function chartLabel(charts, chartId) { return charts.find(({ id }) => id === chartId)?.label ?? charts.find(({ id }) => id === chartId)?.title ?? chartId; }
function formatPeriod(period) { if (Number.isFinite(period?.startEpochMs) && Number.isFinite(period?.endEpochMs)) return `${new Date(period.startEpochMs).toISOString().slice(0, 10)} to ${new Date(period.endEpochMs).toISOString().slice(0, 10)}`; if (period?.start && period?.end) return `${String(period.start).slice(0, 10)} to ${String(period.end).slice(0, 10)}`; return "Inherited after choosing a parent"; }
function toDateInputs(period) { return { start: Number.isFinite(period?.startEpochMs) ? new Date(period.startEpochMs).toISOString().slice(0, 10) : String(period?.start ?? "").slice(0, 10), end: Number.isFinite(period?.endEpochMs) ? new Date(period.endEpochMs).toISOString().slice(0, 10) : String(period?.end ?? "").slice(0, 10) }; }
function formatDate(epochMs) { return Number.isFinite(epochMs) ? new Date(epochMs).toISOString().slice(0, 10) : "No observations"; }
function tickPosition(epochMs, start, end) { if (!Number.isFinite(epochMs) || !Number.isFinite(start) || !Number.isFinite(end) || start === end) return "50%"; return `${Math.max(0, Math.min(100, ((epochMs - start) / (end - start)) * 100))}%`; }
