import React from "react";
import { groupAvailabilityRows } from "./chronoGroupDraft.js";

export default function AvailabilityLedger({ rows = [], disabled = false, onToggle }) {
  const regions = groupAvailabilityRows(rows);
  return (
    <section className="time-availability-ledger" id="chrono-group-chart-list" aria-label="Chart availability">
      {rows.length === 0 ? (
        <p role="status">No charts have observations in this period.</p>
      ) : (
        <div className="time-availability-ledger__regions">
          <LedgerRegion title="Selected for this Chrono Group" rows={regions.selected} empty="No ready charts selected." disabled={disabled} onToggle={onToggle} />
          <LedgerRegion title="Needs attention" rows={regions.needsAttention} empty="No selected charts need attention." disabled={disabled} onToggle={onToggle} needsAttention />
          <LedgerRegion title="Available" rows={regions.available} empty="No additional charts are available in this period." disabled={disabled} onToggle={onToggle} />
        </div>
      )}
    </section>
  );
}

function LedgerRegion({ title, rows, empty, disabled, onToggle, needsAttention = false }) {
  const id = `chrono-ledger-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <section className="time-availability-ledger__region" data-region={needsAttention ? "needs-attention" : undefined} aria-labelledby={id}>
      <h3 id={id}>{title}</h3>
      {rows.length === 0 ? <p>{empty}</p> : <ol>{rows.map((row) => <LedgerRecord key={row.chartId} row={row} disabled={disabled} onToggle={onToggle} />)}</ol>}
    </section>
  );
}

function LedgerRecord({ row, disabled, onToggle }) {
  return (
    <li data-chart-id={row.chartId} data-status={row.needsAttention ? "needs-attention" : "available"}>
      <details open={row.selected || row.needsAttention}>
        <summary>
          <span><strong>{row.label}</strong><small>{row.pageLabel} · {row.sectionLabel}</small></span>
          <span>{row.statusText}</span>
        </summary>
      <div className="availability-record__body">
        <label className="choice-control-row">
          <input className="choice-control" type="checkbox" checked={row.selected} disabled={disabled} onChange={(event) => onToggle?.(row.chartId, event.target.checked)} />
          <strong>{row.selected ? "Included in this Chrono Group" : "Include in this Chrono Group"}</strong>
        </label>
        <p><strong>Other Chrono Groups:</strong> {row.otherGroupNames?.join(", ") || "None"}</p>
      <ul className="availability-calendar" aria-label={`${row.label} variable availability`}>
        {row.variables.map((variable) => <li key={variable.variableId}>
          <span>{variable.label}</span>
          <span>{variable.inPeriodCount} in period</span>
          <span>{formatEpoch(variable.earliestEpochMs)} to {formatEpoch(variable.latestEpochMs)}</span>
          <span className="availability-ticks" aria-label={`${variable.inPeriodCount} observation ticks`}>{variable.ticks?.map((tick) => <i key={tick} title={formatEpoch(tick)} style={{ "--availability-position": `${tickPosition(tick, row)}%` }} />)}</span>
        </li>)}
      </ul>
      </div>
      </details>
    </li>
  );
}

function formatEpoch(epochMs) {
  return Number.isFinite(epochMs)
    ? new Date(epochMs).toISOString().slice(0, 10)
    : "No observations";
}

function tickPosition(epochMs, row) {
  const span = row.periodEndEpochMs - row.periodStartEpochMs;
  if (!Number.isFinite(span) || span <= 0) return 0;
  return Math.max(0, Math.min(100, ((epochMs - row.periodStartEpochMs) / span) * 100));
}
