import React, { useState } from "react";

import SceneMatchingField from "./SceneMatchingField.jsx";
import ModalFocusScope from "../common/ModalFocusScope.jsx";
import BalancedTwinCanvas from "./BalancedTwinCanvas.jsx";
import StorylineCoveragePicker from "./StorylineCoveragePicker.jsx";
import { buildStorylineCoverage } from "./storylineAuthoring.js";

const STAGES = Object.freeze([
  { id: "details", label: "Storyline details" },
  { id: "select", label: "Select charts and frames" },
  { id: "arrange", label: "Arrange and configure" },
]);

export default function SceneEditor({ dashboard, themeProjection, draft, charts = [], parentCharts = charts, chronoGroups = [], pages = [], disabled = false, onAction }) {
  const value = draft?.value ?? {};
  const busy = disabled || draft?.status === "saving";
  const dirty = ["dirty", "error", "suspended"].includes(draft?.status);
  const readiness = draft?.error?.message ?? (value.name?.trim() && value.members?.length ? "Ready to save" : "Complete the required fields and select a chart");
  return (
    <section className="scene-studio" aria-labelledby="scene-studio-title">
      <header className="build-surface-heading scene-identity-band">
        <div>
          <p className="eyebrow">Temporal authoring</p>
          <h2 id="scene-studio-title">Storyline Studio</h2>
          <p>{value.name || "Untitled Storyline"}</p>
        </div>
        <span className="build-draft-status" data-status={draft?.status ?? "clean"}>{draft?.status === "saving" ? "Saving Storyline" : dirty ? "Unsaved Storyline" : "Storyline draft open"}</span>
      </header>
      <div className="scene-studio__workspace" data-layout="full-width">
        <main className="scene-studio__main">
          <nav className="scene-stage-navigation" aria-label="Storyline authoring stages">
            {STAGES.map((stage, index) => <button type="button" key={stage.id} aria-current={draft?.stage === stage.id ? "step" : undefined} disabled={busy} onClick={() => onAction?.({ type: "SET_STAGE", stage: stage.id })}><span>{index + 1}</span> {stage.label}</button>)}
          </nav>
          {draft?.error && <p className="build-operation-error" role="alert">{draft.error.message}</p>}
          {draft?.stage === "details"
            ? <SceneDetailsStage dashboard={dashboard} draft={draft} charts={charts} parentCharts={parentCharts} chronoGroups={chronoGroups} pages={pages} busy={busy} onAction={onAction} />
            : draft?.stage === "arrange"
              ? <ArrangeStage dashboard={dashboard} themeProjection={themeProjection} draft={draft} charts={charts} busy={busy} onAction={onAction} />
              : <SelectStage dashboard={dashboard} value={value} charts={charts} busy={busy} onAction={onAction} />}
        </main>
        <SceneTransactionFooter readiness={readiness} draft={draft} busy={busy} dirty={dirty} onAction={onAction} />
      </div>
    </section>
  );
}

function SceneDetailsStage({ dashboard, draft, charts, parentCharts, chronoGroups, pages, busy, onAction }) {
  const value = draft?.value ?? {};
  const periodDates = draft.periodDates ?? toDateInputs(value.period);
  const parentPeriod = null;
  const maximumDates = toDateInputs(parentPeriod);
  const setPeriod = (next) => onAction?.({ type: "SET_PERIOD", start: next.start, end: next.end });
  return (
    <section className="scene-details-stage scene-stage-body" data-stage="details" aria-labelledby="scene-details-stage-title">
      <header><h3 id="scene-details-stage-title">Storyline details</h3><p>Define the Storyline scope and shared playback behavior before selecting and arranging charts.</p></header>
      <div className="scene-details-stage__fields">
        <label className="scene-details-stage__wide">Storyline name<input id="scene-name" value={value.name ?? ""} disabled={busy} onChange={(event) => onAction?.({ type: "SET_NAME", value: event.target.value })} /></label>
        <label>Owning page<select value={value.pageId ?? ""} disabled={busy} onChange={(event) => onAction?.({ type: "SET_PAGE", pageId: event.target.value })}><option value="">Across pages</option>{pages.map((page) => <option key={page.id} value={page.id}>{page.label ?? page.title ?? page.id}</option>)}</select></label>
        {value.audience?.collectionLabel && <p>Original collection: {value.audience.collectionLabel}</p>}
        <fieldset className="scene-details-stage__period scene-details-stage__wide"><legend>Period</legend><div className="scene-details-stage__period-inputs"><label>Start date<input type="date" min={maximumDates.start || undefined} max={periodDates.end || maximumDates.end || undefined} value={periodDates.start} disabled={busy} onChange={(event) => setPeriod({ ...periodDates, start: event.target.value })} /></label><label>End date<input type="date" min={periodDates.start || maximumDates.start || undefined} max={maximumDates.end || undefined} value={periodDates.end} disabled={busy} onChange={(event) => setPeriod({ ...periodDates, end: event.target.value })} /></label></div><small>{parentPeriod ? `Maximum: ${formatPeriod(parentPeriod)}` : "Optional: leave blank for whole eligible coverage."}</small>{!value.chronoGroupId && value.period && <button type="button" className="text-button" disabled={busy} onClick={() => onAction?.({ type: "CLEAR_PERIOD" })}>Use whole coverage</button>}</fieldset>
        <fieldset><legend>Time mode</legend>
          <label className="choice-control-row"><input className="choice-control" type="radio" name="scene-time-mode" checked={value.frames?.mode === "union"} disabled={busy} onChange={() => onAction?.({ type: "SET_FRAME_MODE", mode: "union" })} />All member observations</label>
          <label className="choice-control-row"><input className="choice-control" type="radio" name="scene-time-mode" checked={value.frames?.mode === "calendar"} disabled={busy} onChange={() => onAction?.({ type: "SET_FRAME_MODE", mode: "calendar" })} />Calendar interval</label>
          <label className="choice-control-row"><input className="choice-control" type="radio" name="scene-time-mode" checked={value.frames?.mode === "source" || value.frames?.mode === "unresolved"} disabled={busy || !value.members?.length} onChange={() => onAction?.({ type: "SET_FRAME_MODE", mode: "source" })} />Chart observations</label>
        </fieldset>
        {value.frames?.mode === "union" && /^\d{4}-\d{2}-\d{2}$/.test(value.period?.start) && <p>Calendar dates retain the original collection's coverage in {dashboard?.timezone ?? "UTC"}. Choosing another time mode converts this period to UTC day boundaries.</p>}
        {value.frames?.mode === "calendar" && <div className="scene-calendar-interval"><label>Calendar interval value<input type="number" min="1" step="1" value={value.frames?.interval?.value ?? 1} disabled={busy} onChange={(event) => onAction?.({ type: "SET_CALENDAR_INTERVAL", value: event.target.value, unit: value.frames?.interval?.unit ?? "day" })} /></label><label>Calendar interval unit<select value={value.frames?.interval?.unit ?? "day"} disabled={busy} onChange={(event) => onAction?.({ type: "SET_CALENDAR_INTERVAL", value: value.frames?.interval?.value ?? 1, unit: event.target.value })}><option value="day">Days</option><option value="month">Months</option><option value="year">Years</option></select></label></div>}
        {(value.frames?.mode === "source" || value.frames?.mode === "unresolved") && <label>Frame source<select id="scene-frame-source" autoFocus={value.frames.mode === "unresolved"} value={value.frames.mode === "source" ? value.frames.chartId ?? "" : ""} disabled={busy} onChange={(event) => onAction?.({ type: "SET_FRAME_SOURCE", chartId: event.target.value })}><option value="">Choose replacement</option>{(value.members ?? []).map(({ chartId }) => <option key={chartId} value={chartId}>{chartLabel(charts, chartId)}</option>)}</select>{value.frames?.mode === "unresolved" ? <small role="status">Needs attention: choose a replacement Frame source.</small> : null}</label>}
        <SceneMatchingField label="Default matching" value={value.defaultMatching} disabled={busy}
          onChange={matching => onAction?.({ type: "SET_DEFAULT_MATCHING", matching })} />
        <label>Seconds per frame<input type="number" min="0.1" step="0.1" value={value.secondsPerFrame ?? ""} placeholder="1 second" disabled={busy} onChange={(event) => onAction?.({ type: "SET_SECONDS_PER_FRAME", value: event.target.value })} /></label>
      </div>
    </section>
  );
}

function SceneTransactionFooter({ readiness, draft, busy, dirty, onAction }) {
  return <footer className="scene-transaction-footer"><section className="scene-save-readiness" aria-labelledby="scene-save-readiness-title"><h4 id="scene-save-readiness-title">Save readiness</h4><p role="status">{readiness}</p></section><div className="build-surface-actions"><button type="button" data-scene-workflow-id="save-scene" disabled={busy || !dirty} onClick={() => onAction?.({ type: "SAVE_REQUEST" })}>Save Storyline</button><button type="button" className="secondary" disabled={busy} onClick={() => onAction?.({ type: "DISCARD" })}>Discard Storyline</button></div></footer>;
}

function SelectStage({ dashboard, value, charts, busy, onAction }) {
  const [observationChart, setObservationChart] = useState(null);
  const observationCharts = buildStorylineCoverage(dashboard, value.period ?? null).map(candidate => ({ ...candidate.chart, variables: [{ label: "Plotted observations", observations: candidate.epochs.map(epochMs => ({ epochMs })) }] }));
  return (
    <div className="scene-stage-body" data-stage="select">
      <header><h3>Select charts and frames</h3><p>Choose temporal charts across dashboard pages. Coverage reflects plotted observations and saved filters.</p></header>
      <StorylineCoveragePicker dashboard={dashboard} value={value} disabled={busy} onAction={onAction} onInspect={setObservationChart} />
      {value.frames?.mode === "source" && <fieldset className="scene-frame-selection"><legend>Source observations</legend><label className="choice-control-row"><input className="choice-control" type="radio" name="scene-frame-selection" disabled={busy} checked={value.frames?.selection !== "selected"} onChange={() => onAction?.({ type: "SET_FRAME_SELECTION", selection: "all" })} />Use all observations</label><label className="choice-control-row"><input className="choice-control" type="radio" name="scene-frame-selection" disabled={busy} checked={value.frames?.selection === "selected"} onChange={() => onAction?.({ type: "SET_FRAME_SELECTION", selection: "selected", selectedEpochs: value.frames?.selectedEpochs ?? [] })} />Use selected observations</label><button type="button" className="secondary" disabled={busy} onClick={() => setObservationChart(observationCharts.find(({ id }) => id === value.frames?.chartId))}>Choose observations</button></fieldset>}
      {observationChart && <ObservationChecklist disabled={busy} chart={observationChart} selectedEpochs={value.frames?.selectedEpochs ?? []} onAction={onAction} onClose={() => setObservationChart(null)} />}
    </div>
  );
}

export function ObservationChecklist({ chart, selectedEpochs, onAction, onClose, disabled = false }) {
  const epochs = [...new Set((chart.variables ?? []).flatMap((variable) => variable.observations ?? []).map(({ epochMs }) => epochMs).filter(Number.isFinite))].sort((a, b) => a - b);
  return <ModalFocusScope as="div" className="scene-observation-dialog dashboard-dialog-backdrop" role="dialog" aria-modal="true" aria-labelledby="scene-observation-title" initialFocusSelector="[data-scene-observation-close]" onEscape={onClose}><div className="dashboard-dialog dashboard-dialog--utility dashboard-dialog--compact"><header className="dashboard-dialog__header"><h3 id="scene-observation-title">{chart.label ?? chart.title ?? chart.id} observations</h3><button type="button" data-scene-observation-close="true" data-modal-initial-focus="true" onClick={onClose}>Close</button></header><div className="dashboard-dialog__body">{epochs.length === 0 ? <p>No observations available.</p> : <ol>{epochs.map((epochMs) => <li key={epochMs}><label className="choice-control-row"><input className="choice-control" type="checkbox" disabled={disabled} checked={selectedEpochs.includes(epochMs)} onChange={(event) => onAction?.({ type: "SET_FRAME_SELECTION", selection: "selected", selectedEpochs: event.target.checked ? [...selectedEpochs, epochMs].sort((a, b) => a - b) : selectedEpochs.filter((value) => value !== epochMs) })} />{new Date(epochMs).toISOString()}</label></li>)}</ol>}</div></div></ModalFocusScope>;
}

function ArrangeStage({ dashboard, themeProjection, draft, charts, busy, onAction }) { return <div className="scene-stage-body" data-stage="arrange"><BalancedTwinCanvas dashboard={dashboard} themeProjection={themeProjection} scene={draft.value} charts={charts} selectedChartId={draft.selectedChartId} activeBoard={draft.activeBoard} disabled={busy} onAction={onAction} /></div>; }
function chartLabel(charts, chartId) { return charts.find(({ id }) => id === chartId)?.label ?? charts.find(({ id }) => id === chartId)?.title ?? chartId; }
function formatPeriod(period) { if (Number.isFinite(period?.startEpochMs) && Number.isFinite(period?.endEpochMs)) return `${new Date(period.startEpochMs).toISOString().slice(0, 10)} to ${new Date(period.endEpochMs).toISOString().slice(0, 10)}`; if (period?.start && period?.end) return `${String(period.start).slice(0, 10)} to ${String(period.end).slice(0, 10)}`; return "Inherited after choosing a parent"; }
function toDateInputs(period) { return { start: Number.isFinite(period?.startEpochMs) ? new Date(period.startEpochMs).toISOString().slice(0, 10) : String(period?.start ?? "").slice(0, 10), end: Number.isFinite(period?.endEpochMs) ? new Date(period.endEpochMs).toISOString().slice(0, 10) : String(period?.end ?? "").slice(0, 10) }; }
