import React from "react";

export default function AvailabilityLedger({ rows = [], disabled = false, onToggle }) {
  return (
    <section className="time-availability-ledger" aria-label="Chart availability">
      {rows.length === 0 ? (
        <p role="status">No charts have observations in this period.</p>
      ) : (
        <ol>
          {rows.map((row) => (
            <li
              key={row.chartId}
              data-chart-id={row.chartId}
              data-status={row.needsAttention ? "needs-attention" : "available"}
            >
              <header>
                <label>
                  <input
                    type="checkbox"
                    checked={row.selected}
                    disabled={disabled}
                    onChange={(event) => onToggle?.(row.chartId, event.target.checked)}
                  />
                  <strong>{row.label}</strong>
                </label>
                <span>{row.pageLabel} · {row.sectionLabel}</span>
              </header>
              <p role="status">{row.statusText}</p>
              <ul aria-label={`${row.label} variable availability`}>
                {row.variables.map((variable) => (
                  <li key={variable.variableId}>
                    <span>{variable.label}</span>
                    <span>{variable.inPeriodCount} in period</span>
                    <span>
                      {formatEpoch(variable.earliestEpochMs)} to {formatEpoch(variable.latestEpochMs)}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function formatEpoch(epochMs) {
  return Number.isFinite(epochMs)
    ? new Date(epochMs).toISOString().slice(0, 10)
    : "No observations";
}
