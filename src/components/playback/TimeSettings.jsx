import React from "react";

export default function TimeSettings({ playback, showMatching = true }) {
  const { cursor, dispatch } = playback;
  const [dates, setDates] = React.useState(() => windowDates(cursor.window));
  const [error, setError] = React.useState("");
  const [customSpeed, setCustomSpeed] = React.useState(String(playback.speed));
  React.useEffect(() => { setCustomSpeed(String(playback.speed)); }, [playback.speed]);
  React.useEffect(() => { setDates(windowDates(cursor.window)); setError(""); }, [cursor.window?.start, cursor.window?.end]);
  const applyWindow = event => {
    event.preventDefault();
    try {
      if (!dates.start || !dates.end) throw new Error("Choose both window dates, or use whole coverage.");
      dispatch({ type: "cursorWindow", window: { start: `${dates.start}T00:00:00.000Z`, end: `${dates.end}T23:59:59.999Z` } });
      setError("");
    } catch (cause) { setError(cause.message); }
  };
  return <section className="time-settings" aria-label="Time settings">
    <div className="time-settings__controls">
      <label>Speed preset<select value={playback.speed} onChange={event => dispatch({ type: "setSpeed", speed: Number(event.target.value) })}>
        {![1, 2, 5].includes(playback.speed) && <option value={playback.speed}>{playback.speed} seconds</option>}
        {[1, 2, 5].map(value => <option key={value} value={value}>{value} second{value > 1 ? "s" : ""}</option>)}
      </select></label>
      <label>Seconds per frame<input type="number" min="0.001" step="0.001" value={customSpeed}
        aria-invalid={customSpeed === "" || !Number.isFinite(Number(customSpeed)) || Number(customSpeed) <= 0}
        onChange={event => { setCustomSpeed(event.target.value); const speed = Number(event.target.value); if (event.target.value !== "" && Number.isFinite(speed) && speed > 0) dispatch({ type: "setSpeed", speed }); }}
        onBlur={() => { if (!Number.isFinite(Number(customSpeed)) || Number(customSpeed) <= 0) setCustomSpeed(String(playback.speed)); }} /></label>
      {showMatching && <TimeMatching playback={playback} />}
      <label className="time-settings__trace">{showMatching ? "Trace behavior" : "Chart trace"}<select value={playback.traceMode} onChange={event => dispatch({ type: "setTraceMode", mode: event.target.value })}>
        <option value="reveal">Draw up to selected date</option><option value="full">Full trace with date marker</option>
      </select></label>
    </div>
    <form onSubmit={applyWindow} className="time-settings__window"><fieldset><legend>Time window (UTC)</legend>
      <label>Window start<input type="date" value={dates.start} max={dates.end || undefined} onChange={event => setDates(current => ({ ...current, start: event.target.value }))} /></label>
      <label>Window end<input type="date" value={dates.end} min={dates.start || undefined} onChange={event => setDates(current => ({ ...current, end: event.target.value }))} /></label>
      <button type="submit" className="secondary">Apply window</button>
      <button type="button" className="secondary" onClick={() => { dispatch({ type: "cursorWindow", window: null }); setDates(windowDates(null)); setError(""); }}>Whole coverage</button>
    </fieldset>{error && <p role="alert">{error}</p>}</form>
    <label className="choice-control-row time-settings__availability"><input type="checkbox" checked={playback.availabilityVisible} onChange={() => dispatch({ type: "toggleAvailability" })} />Show observation availability</label>
    {playback.availabilityVisible && <aside aria-label="Observation availability"><ul>{playback.frameAvailability.length
      ? playback.frameAvailability.map(entry => <li key={entry.chartId} data-chart-id={entry.chartId} data-availability={entry.status}><strong>{entry.chartLabel}</strong> · {entry.statusLabel} · {entry.detail}</li>)
      : <li>No observation evidence is available at this time.</li>}</ul></aside>}
  </section>;
}

export function TimeMatching({ playback, compact = false }) {
  const { dispatch, matchingOverride, nearestToleranceMs } = playback;
  const [matchingChoice, setMatchingChoice] = React.useState(matchingOverride);
  const [nearestHours, setNearestHours] = React.useState(() => toleranceHours(nearestToleranceMs));
  const [matchingError, setMatchingError] = React.useState("");
  React.useEffect(() => { setMatchingChoice(matchingOverride); }, [matchingOverride]);
  React.useEffect(() => { setNearestHours(toleranceHours(nearestToleranceMs)); }, [nearestToleranceMs]);

  return <>
    <label className="time-settings__matching"><span>{compact ? "Match" : "Matching override"}</span><select aria-label={compact ? "Matching override" : undefined} value={matchingChoice} onChange={event => {
      const policy = event.target.value;
      setMatchingChoice(policy);
      setMatchingError("");
      if (policy !== "closest") dispatch({ type: "setMatchingOverride", policy });
    }}>
      <option value="authored">{compact ? "Defaults" : "Use authored settings"}</option><option value="concurrent">Concurrent</option>
      <option value="latest">{compact ? "Latest" : "Latest at or before"}</option><option value="closest">{compact ? "Closest" : "Closest within tolerance"}</option><option value="interpolate">Interpolate</option>
    </select></label>
    {matchingChoice === "closest" && <div className="time-settings__nearest">
      <label>Nearest maximum distance (hours)<input type="number" min="0" step="any" value={nearestHours} onChange={event => setNearestHours(event.target.value)} /></label>
      <button type="button" className="secondary" onClick={() => {
        const toleranceMs = nearestHours === "" ? NaN : Number(nearestHours) * 3_600_000;
        if (!Number.isFinite(toleranceMs) || toleranceMs < 0) { setMatchingError("Enter an explicit nonnegative maximum distance."); return; }
        dispatch({ type: "setMatchingOverride", policy: "closest", nearestToleranceMs: toleranceMs });
        setMatchingError("");
      }}>Apply nearest override</button>
      <p>{matchingOverride === "closest" && Number.isFinite(nearestToleranceMs)
        ? `Active maximum distance: ${nearestToleranceMs / 3_600_000} hours.`
        : "Set and apply a maximum distance before closest matching takes effect."} Zero matches the selected instant only.</p>
      {matchingError && <p role="alert">{matchingError}</p>}
    </div>}
  </>;
}

function toleranceHours(milliseconds) { return Number.isFinite(milliseconds) ? String(milliseconds / 3_600_000) : ""; }
function windowDates(value) { return { start: value?.start?.slice(0, 10) ?? "", end: value?.end?.slice(0, 10) ?? "" }; }
