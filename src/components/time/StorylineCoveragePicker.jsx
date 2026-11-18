import React from "react";
import { buildStorylineCoverage, filterStorylineCoverage } from "./storylineAuthoring.js";
import { isCalendarUnionPeriod } from "../../charting/time/sceneSchema.js";

export default function StorylineCoveragePicker({ dashboard = {}, value, disabled, onAction, onInspect }) {
  const [filters, setFilters] = React.useState({ sourceId: "all", cadence: "all", query: "" });
  const candidates = React.useMemo(() => buildStorylineCoverage(dashboard, value.period ?? null,
    { calendarPeriod: isCalendarUnionPeriod(value) }), [dashboard, value.period, value.frames?.mode]);
  const visible = filterStorylineCoverage(candidates, filters);
  const selected = new Set(value.members.map(member => member.chartId));
  const blocked = candidate => candidate.reason;
  const grouped = new Map();
  for (const candidate of visible) {
    const key = `${candidate.pageId}\0${candidate.sectionId}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(candidate);
  }
  const unknown = value.members.filter(member => !candidates.some(candidate => candidate.id === member.chartId));
  const selectable = visible.filter(candidate => !selected.has(candidate.id) && !blocked(candidate) && candidate.inWindowCount > 0);
  const setFilter = (key, next) => setFilters(current => ({ ...current, [key]: next }));
  return <section className="storyline-coverage-picker" aria-label="Storyline chart coverage">
    <div className="temporal-studio__filters" role="search">
      <label>Search charts<input type="search" value={filters.query} onChange={event => setFilter("query", event.target.value)} /></label>
      <label>Source<select value={filters.sourceId} onChange={event => setFilter("sourceId", event.target.value)}><option value="all">All sources</option>
        {[...new Map(candidates.map(candidate => [candidate.sourceId, candidate.sourceLabel])).entries()].map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </select></label>
      <label>Typical cadence<select value={filters.cadence} onChange={event => setFilter("cadence", event.target.value)}><option value="all">All cadences</option>
        {[...new Set(candidates.map(candidate => candidate.cadence))].sort().map(cadence => <option key={cadence}>{cadence}</option>)}
      </select></label>
    </div>
    <p role="status">{selected.size} selected · {visible.length} shown. Filters retain your selection and member order.</p>
    <button type="button" className="secondary" disabled={disabled || !selectable.length} onClick={() => selectable.forEach(candidate => onAction({ type: "ADD_MEMBER", chartId: candidate.id }))}>Select all with coverage</button>
    {!visible.length && <p>No temporal charts match these filters.</p>}
    {[...grouped.entries()].map(([key, entries]) => <fieldset key={key} className="storyline-coverage-group"><legend>{entries[0].pageLabel} · {entries[0].sectionLabel}</legend>
      {entries.map(candidate => <div className="storyline-coverage-row" key={candidate.id} data-coverage={candidate.coverage}>
        <label className="choice-control-row"><input type="checkbox" className="choice-control" checked={selected.has(candidate.id)}
          disabled={disabled || (!selected.has(candidate.id) && Boolean(blocked(candidate))) || (selected.has(candidate.id) && selected.size === 1)}
          onChange={() => onAction({ type: selected.has(candidate.id) ? "REMOVE_MEMBER" : "ADD_MEMBER", chartId: candidate.id })} />{candidate.title}</label>
        <small>{candidate.sourceLabel} · {candidate.cadence} · {candidate.inWindowCount} observations in period ({candidate.count} total)</small>
        <div className="storyline-coverage-track" aria-hidden="true">{coverageTicks(candidate, value.period)}</div>
        <p>{candidate.count ? `${date(candidate.start)}–${date(candidate.end)} · ${candidate.coverage === "none" ? "No coverage in this period" : candidate.coverage === "partial" ? "Partial period coverage" : "Available coverage"}` : "No observations available"}</p>
        {blocked(candidate) && <p role="status">{blocked(candidate)}</p>}
        <button type="button" className="text-button" disabled={disabled} onClick={() => onInspect({ ...candidate.chart, variables: [{ label: "Plotted observations", observations: candidate.epochs.map(epochMs => ({ epochMs })) }] })}>Inspect observations</button>
      </div>)}
    </fieldset>)}
    {unknown.length > 0 && <section data-region="needs-attention"><h3>Needs attention</h3>{unknown.map(member => <div key={member.chartId}><p>{member.chartId} · The chart is missing or no longer eligible for temporal composition.</p><button type="button" disabled={disabled || selected.size === 1} onClick={() => onAction({ type: "REMOVE_MEMBER", chartId: member.chartId })}>Remove unavailable chart</button></div>)}</section>}
  </section>;
}

function date(epoch) { return new Date(epoch).toISOString().slice(0, 10); }
function coverageTicks(candidate, period) {
  const inside = candidate.inWindowEpochs ?? candidate.epochs;
  const start = Math.min(period?.start ? Date.parse(period.start) : candidate.start, inside[0] ?? Infinity);
  const end = Math.max(period?.end ? Date.parse(period.end) : candidate.end, inside.at(-1) ?? -Infinity);
  return inside.map(epoch => <i key={epoch} style={{ left: `${start === end ? 50 : 100 * (epoch - start) / (end - start)}%` }} />);
}
