import React from "react";
import { scrubberModel } from "../../charting/time/scrubberModel.js";
import { cursorFrameIndex } from "../../charting/time/cursorModel.js";
import { temporalCoverageRuns } from "../../charting/time/temporalAvailability.js";
import { canonicalPlaybackTime } from "./playbackTimeLabel.js";
import { dashboardOwnedRegionProps } from "../../theme/dashboardRegionRegistry.js";

export default function TimelineScrubber({ playback, discrete = false }) {
  const model = React.useMemo(() => discrete ? null : scrubberModel({ clock: playback.clock, window: playback.cursor.window,
    activeEpochMs: playback.activeEpochMs, exerciseEpochMs: playback.exerciseTime ? Date.parse(playback.exerciseTime) : null,
    coverageRuns: temporalCoverageRuns(playback.observationClock ?? playback.clock) }),
  [discrete, playback.clock, playback.observationClock, playback.cursor.window, playback.activeEpochMs, playback.exerciseTime]);
  if (discrete) {
    const { clock, activeEpochMs } = playback;
    const index = Math.max(0, cursorFrameIndex(clock, activeEpochMs));
    return <section className="timeline-scrubber" aria-label="Timeline scrubber" {...dashboardOwnedRegionProps("view-timeline-scrubber")}>
      <input type="range" aria-label="Selected time" aria-valuetext={clock.length ? `${canonicalPlaybackTime(clock[index])} UTC` : "No observation times"}
        data-frame-epoch={clock[index]} min="0" max={Math.max(0, clock.length - 1)} step="1" value={index} disabled={clock.length < 2}
        onChange={event => playback.dispatch({ type: "cursorSeek", epochMs: clock[Number(event.target.value)] })} />
    </section>;
  }
  const value = Number.isFinite(playback.activeEpochMs) && !model.disabled ? Math.max(model.start, Math.min(model.end, playback.activeEpochMs)) : model.start ?? 0;
  return <section className="timeline-scrubber" aria-label="Timeline scrubber" {...dashboardOwnedRegionProps("view-timeline-scrubber")}>
    <div className="timeline-scrubber__track" aria-hidden="true">
      {model.coverageBands.map(([start, end], index) => <span className="timeline-scrubber__coverage" key={index} style={{ left: `${100 * start}%`, width: `${100 * (end - start)}%` }} />)}
      {model.ticks.map((tick, index) => <i key={index} style={{ left: `${100 * tick}%` }} />)}
      {model.exerciseNow !== null && <span className="timeline-scrubber__now" style={{ left: `${100 * model.exerciseNow}%` }}>now</span>}
    </div>
    <input type="range" aria-label="Selected time" aria-valuetext={Number.isFinite(playback.activeEpochMs) ? `${canonicalPlaybackTime(playback.activeEpochMs)} UTC` : "No observation times"}
      min={model.start ?? 0} max={model.end ?? 0} step="1" value={value} disabled={model.disabled}
      onChange={event => playback.dispatch({ type: "cursorSeek", epochMs: Math.round(Number(event.target.value)) })} />
    <p className="visually-hidden">Ticks show clock frames; shaded bands show observed coverage. Arrow keys step frames; Shift and arrow seek finely. Empty gaps may have no measurement.</p>
  </section>;
}
