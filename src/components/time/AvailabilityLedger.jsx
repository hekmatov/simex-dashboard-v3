import React from "react";
import { groupAvailabilityRows } from "./chronoGroupDraft.js";

const REGION_COPY = Object.freeze({
  selected: "Members with at least one observation in the current period.",
  attention: "Still selected, but unavailable after the period changed. Remove it or restore availability explicitly.",
  available: "Eligible dashboard charts not currently selected.",
});

export default function AvailabilityLedger({ rows = [], disabled = false, onToggle }) {
  const regions = groupAvailabilityRows(rows);
  return (
    <section className="time-availability-ledger" id="chrono-group-chart-list" aria-label="Chart availability">
      {rows.length === 0 ? (
        <p role="status">No charts have observations in this period.</p>
      ) : (
        <div className="time-availability-ledger__regions">
          <LedgerRegion title="Selected for this Chrono Group" description={REGION_COPY.selected} rows={regions.selected} empty="No ready charts selected." disabled={disabled} onToggle={onToggle} />
          <LedgerRegion title="Needs attention" description={REGION_COPY.attention} rows={regions.needsAttention} empty="No selected charts need attention." disabled={disabled} onToggle={onToggle} needsAttention />
          <div className="time-availability-ledger__separator" role="separator" aria-label="Selected charts above; available charts below" />
          <LedgerRegion title="Available" description={REGION_COPY.available} rows={regions.available} empty="No additional charts are available in this period." disabled={disabled} onToggle={onToggle} />
        </div>
      )}
    </section>
  );
}

function LedgerRegion({ title, description, rows, empty, disabled, onToggle, needsAttention = false }) {
  const id = `chrono-ledger-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <section className="time-availability-ledger__region" data-region={needsAttention ? "needs-attention" : undefined} aria-labelledby={id}>
      <header className="time-availability-ledger__region-heading">
        <div><h3 id={id}>{title}</h3><p>{description}</p></div>
        <span>{rows.length} {rows.length === 1 ? "chart" : "charts"}</span>
      </header>
      {rows.length === 0 ? <p className="time-availability-ledger__empty">{empty}</p> : <ol>{rows.map((row) => <LedgerRecord key={row.chartId} row={row} disabled={disabled} onToggle={onToggle} />)}</ol>}
    </section>
  );
}

function LedgerRecord({ row, disabled, onToggle }) {
  const chartDateCount = uniqueTicks(row.variables).length;
  return (
    <li data-chart-id={row.chartId} data-status={row.needsAttention ? "needs-attention" : row.selected ? "selected" : "available"}>
      <article className="availability-record">
        <header className="availability-record__header">
          <div className="availability-record__identity">
            <h4>{row.label}</h4>
            <p>{row.pageLabel} · {row.sectionLabel}</p>
            <p>Full chart range {formatEpoch(row.fullRangeStartEpochMs)}–{formatEpoch(row.fullRangeEndEpochMs)}</p>
            {(row.otherGroupNames?.length ?? 0) > 0 && <p className="availability-record__membership">Also in {row.otherGroupNames.join(", ")}</p>}
            {row.needsAttention && <p className="availability-record__attention">{row.statusText}</p>}
          </div>
          <button type="button" className={row.selected ? "secondary danger" : "secondary"} disabled={disabled} onClick={() => onToggle?.(row.chartId, !row.selected)}>
            {row.selected ? "Remove" : "Add to group"}
          </button>
        </header>

        <div className="availability-record__summary">
          <div><strong>{row.variableCount} plotted {row.variableCount === 1 ? "variable" : "variables"}</strong><small>{row.note}</small></div>
          <AvailabilityTrack ticks={uniqueTicks(row.variables)} row={row} label={`${row.label}: ${chartDateCount} chart dates`} />
          <strong>{chartDateCount} chart {chartDateCount === 1 ? "date" : "dates"}</strong>
        </div>

        <details className="availability-record__disclosure" open={row.needsAttention || undefined}>
          <summary>{row.needsAttention ? "Inspect and repair evidence" : "Inspect evidence"}</summary>
          <div className="availability-record__body">
            <p><strong>Other Chrono Groups:</strong> {row.otherGroupNames?.join(", ") || "None"}</p>
            <ul className="availability-calendar" aria-label={`${row.label} variable availability`}>
              {row.variables.map((variable) => <li key={variable.variableId}>
                <span><strong>{variable.label}</strong><small>Full data {formatEpoch(variable.earliestEpochMs)}–{formatEpoch(variable.latestEpochMs)}</small></span>
                <AvailabilityTrack ticks={variable.ticks ?? []} row={row} label={`${variable.label}: ${variable.inPeriodCount} dates represented`} />
                <strong>{variable.inPeriodCount} {variable.inPeriodCount === 1 ? "date" : "dates"}</strong>
              </li>)}
            </ul>
          </div>
        </details>
      </article>
    </li>
  );
}

function AvailabilityTrack({ ticks, row, label }) {
  const [activeTick, setActiveTick] = React.useState(null);
  const handlePointerMove = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width <= 0 || ticks.length === 0) return setActiveTick(null);
    const pointerX = event.clientX - bounds.left;
    const nearest = ticks.reduce((best, tick) => {
      const x = (tickPosition(tick, row) / 100) * bounds.width;
      const distance = Math.abs(pointerX - x);
      return best === null || distance < best.distance ? { tick, distance } : best;
    }, null);
    setActiveTick(nearest?.distance <= 8 ? nearest.tick : null);
  };

  return (
    <span className="availability-ticks" role="img" aria-label={label} onPointerMove={handlePointerMove} onPointerLeave={() => setActiveTick(null)}>
      {ticks.map((tick) => <i aria-hidden="true" data-date={formatEpoch(tick)} key={tick} style={{ "--availability-position": `${tickPosition(tick, row)}%` }} />)}
      {activeTick !== null && <span className="availability-tick-tooltip" role="tooltip" style={{ "--availability-position": `${tickPosition(activeTick, row)}%` }}>{formatEpoch(activeTick)}</span>}
    </span>
  );
}

function uniqueTicks(variables = []) {
  return [...new Set(variables.flatMap(({ ticks = [] }) => ticks))].sort((left, right) => left - right);
}

function formatEpoch(epochMs) {
  return Number.isFinite(epochMs) ? new Date(epochMs).toISOString().slice(0, 10) : "No observations";
}

function tickPosition(epochMs, row) {
  const span = row.periodEndEpochMs - row.periodStartEpochMs;
  if (!Number.isFinite(span) || span <= 0) return 0;
  return Math.max(0, Math.min(100, ((epochMs - row.periodStartEpochMs) / span) * 100));
}
