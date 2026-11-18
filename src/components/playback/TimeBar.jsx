import React from "react";
import { usePlayback } from "./PlaybackProvider.jsx";
import { timeBarKeyboardAction } from "../../charting/time/scrubberModel.js";
import { useMediaQuery, MOBILE_VIEW_QUERY } from "../common/useMediaQuery.js";
import { SimExIcon } from "../common/SimExIcon.js";
import TimeSettings, { TimeMatching } from "./TimeSettings.jsx";
import TimelineScrubber from "./TimelineScrubber.jsx";
import { canonicalPlaybackTime } from "./playbackTimeLabel.js";
import "./TimeBar.css";
import { dashboardOwnedRegionProps } from "../../theme/dashboardRegionRegistry.js";

export default function TimeBar({ onAdvanceExerciseTime, advanceDisabledReason = "", compactView = false } = {}) {
  const playback = usePlayback();
  const phone = useMediaQuery(MOBILE_VIEW_QUERY);
  const phoneView = phone && compactView;
  const [scrubberOpen, setScrubberOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [advancing, setAdvancing] = React.useState(false), [advanceError, setAdvanceError] = React.useState("");
  const instantRef = React.useRef(null), settingsRef = React.useRef(null);
  const barRef = React.useRef(null);
  React.useLayoutEffect(() => {
    const crown = barRef.current?.closest(".dashboard-command-crown");
    if (!crown) return undefined;
    const location = crown.querySelector('[data-command-crown-layer="location"]');
    const notice = crown.querySelector(".exercise-disclaimer");
    const measure = () => {
      crown.style.setProperty("--time-location-height", `${Math.ceil(location?.getBoundingClientRect().height ?? 0)}px`);
      crown.style.setProperty("--time-notice-height", `${Math.ceil(notice?.getBoundingClientRect().height ?? 0)}px`);
    };
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;
    [location, notice].filter(Boolean).forEach(node => observer?.observe(node));
    measure();
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect(); window.removeEventListener("resize", measure);
      crown.style.removeProperty("--time-location-height"); crown.style.removeProperty("--time-notice-height");
    };
  }, [phone]);
  const disclosureId = React.useId(), settingsId = React.useId(), keyboardHelpId = React.useId();
  const { cursor, clock, activeEpochMs, dispatch, playing } = playback;
  const label = Number.isFinite(activeEpochMs) ? canonicalPlaybackTime(activeEpochMs) : "No observation times";
  const live = cursor.mode === "live";
  const hasClock = clock.length > 0;
  const advanceReason = advanceDisabledReason || (!Number.isFinite(activeEpochMs) ? "Choose an available exercise time." :
    playback.exerciseTime && activeEpochMs <= Date.parse(playback.exerciseTime) ? "Choose a time later than the declared exercise time." : "");
  const advance = async () => {
    if (advanceReason || advancing) return;
    setAdvancing(true); setAdvanceError("");
    try { await onAdvanceExerciseTime(activeEpochMs); dispatch({ type: "cursorLive" }); }
    catch (error) { setAdvanceError(error instanceof Error ? error.message : "Exercise time could not be saved."); }
    finally { setAdvancing(false); }
  };
  const atStart = !hasClock || activeEpochMs <= clock[0];
  const atEnd = !hasClock || activeEpochMs >= clock.at(-1);
  const closeScrubber = () => {
    setScrubberOpen(false);
    setSettingsOpen(false);
    instantRef.current?.focus();
  };
  const onKeyDown = event => {
    if (phoneView && !scrubberOpen) return;
    if (phoneView && scrubberOpen && event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      if (settingsOpen) { setSettingsOpen(false); settingsRef.current?.focus(); }
      else closeScrubber();
      return;
    }
    const action = timeBarKeyboardAction({ key: event.key, shiftKey: event.shiftKey, target: event.target,
      altKey: event.altKey, ctrlKey: event.ctrlKey, metaKey: event.metaKey,
      clock, activeEpochMs, playing, scrubberOpen, settingsOpen });
    if (!action) return;
    event.preventDefault(); event.stopPropagation();
    if (action.type === "closeScrubber") { setScrubberOpen(false); instantRef.current?.focus(); }
    else if (action.type === "closeSettings") { setSettingsOpen(false); (phone ? instantRef : settingsRef).current?.focus(); }
    else dispatch(action);
  };
  const scope = <TimeScope playback={playback} phoneView={phoneView} />;
  const settingsButton = <button ref={settingsRef} type="button" className="secondary time-bar__settings-trigger" aria-label={phoneView ? "Time settings" : undefined} aria-expanded={settingsOpen} aria-controls={settingsId}
    title={phoneView ? "Time settings" : undefined} onClick={() => setSettingsOpen(open => !open)}>{phoneView ? <SimExIcon iconId="edit" size={19} /> : "Time settings"}</button>;
  const announcement = <p className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
    {!phoneView || Number.isFinite(activeEpochMs) ? `${live ? "Live" : "At"} ${label} · ${playback.sourceLabel} · ${playing ? "Playing" : "Paused"}` : ""}
  </p>;
  if (phoneView) {
    const toggleLabel = scrubberOpen ? "Hide time controls" : "Time";
    return <section ref={barRef} className="time-bar time-bar--phone-view" aria-label="Dashboard time"
      {...dashboardOwnedRegionProps("view-time-bar")} data-time-mode={cursor.mode} data-time-label={label} onKeyDown={onKeyDown}>
      <button ref={instantRef} type="button" className="secondary time-bar__instant"
        aria-label={toggleLabel} title={toggleLabel} aria-expanded={scrubberOpen} aria-controls={disclosureId}
        onClick={() => scrubberOpen ? closeScrubber() : setScrubberOpen(true)}>
        <SimExIcon iconId={scrubberOpen ? "close" : "time"} size={22} />
      </button>
      <div id={disclosureId} className="time-bar__disclosure time-bar__phone-view-controls" data-has-clock={hasClock} hidden={!scrubberOpen}>
        {scrubberOpen && <>
          {hasClock ? <>
            <div className="time-bar__timeline">
              <TimelineScrubber playback={playback} discrete />
              <span className="time-bar__phone-date" title={`${label} UTC`}>
                <span aria-hidden="true">{label.slice(0, 10)}</span><span className="visually-hidden">{label} UTC</span>
              </span>
            </div>
            <div className="time-bar__row time-bar__transport">
              <button type="button" className="secondary time-bar__live" aria-label={live ? `Live, ${label}` : "Return to Live"} aria-pressed={live} title="Return to Live"
                onClick={() => dispatch({ type: "cursorLive" })}><SimExIcon iconId="reset" size={19} /></button>
              <button type="button" className="secondary time-bar__play" aria-label={playing ? "Pause time" : "Play time"}
                title={playing ? "Pause time" : "Play time"} disabled={!playing && atEnd}
                onClick={() => dispatch({ type: playing ? "pause" : "cursorPlay" })}>
                <SimExIcon iconId={playing ? "pause" : "play"} size={19} />
              </button>
              {scope}
              <TimeMatching playback={playback} compact />
              {settingsButton}
            </div>
            <div id={settingsId} hidden={!settingsOpen}>{settingsOpen && <TimeSettings playback={playback} showMatching={false} />}</div>
          </> : <>{scope}<p className="time-bar__empty">No observations for this selection.</p></>}
        </>}
      </div>
      {announcement}
    </section>;
  }
  return <section ref={barRef} className="time-bar" aria-label="Dashboard time" aria-describedby={keyboardHelpId} {...dashboardOwnedRegionProps("view-time-bar")} data-time-mode={cursor.mode} onKeyDown={onKeyDown}>
    <div className="time-bar__row">
      <button type="button" className="time-bar__live" aria-label={live ? `Live, ${label}` : "Return to Live"} aria-pressed={live}
        onClick={() => dispatch({ type: "cursorLive" })}>● Live</button>
      {typeof onAdvanceExerciseTime === "function" && <button type="button" className="secondary time-bar__advance" disabled={Boolean(advanceReason) || advancing}
        title={advanceReason || undefined} onClick={advance}>{advancing ? "Advancing exercise time…" : "Advance exercise time"}</button>}
      {!phone && <button type="button" className="secondary time-bar__step" aria-label="Previous time" disabled={atStart} onClick={() => dispatch({ type: "cursorStep", direction: -1 })}>◀</button>}
      <button type="button" className="secondary time-bar__play" aria-label={playing ? "Pause time" : "Play time"} disabled={!hasClock || (!playing && atEnd)}
        onClick={() => dispatch({ type: playing ? "pause" : "cursorPlay" })}>{playing ? "Ⅱ" : "▶"}</button>
      {!phone && <button type="button" className="secondary time-bar__step" aria-label="Next time" disabled={atEnd} onClick={() => dispatch({ type: "cursorStep", direction: 1 })}>▶</button>}
      <button ref={instantRef} type="button" className="secondary time-bar__instant" aria-label={`Choose time, ${label}`} aria-expanded={scrubberOpen || (phone && settingsOpen)} aria-controls={disclosureId}
        onClick={() => { if (scrubberOpen || (phone && settingsOpen)) { setScrubberOpen(false); setSettingsOpen(false); } else setScrubberOpen(true); }}>{label} ▾</button>
      {!phone && <>{scope}{settingsButton}</>}
    </div>
    <div id={disclosureId} className="time-bar__disclosure" hidden={!scrubberOpen && !(phone && settingsOpen)}>
      {scrubberOpen && <TimelineScrubber playback={playback} />}
      {phone && <div className="time-bar__phone-options">{scope}{settingsButton}</div>}
    </div>
    <div id={settingsId} hidden={!settingsOpen}>{settingsOpen && <TimeSettings playback={playback} />}</div>
    {!hasClock && <span className="time-bar__empty">No observations in this scope or window.</span>}
    {advanceError && <p role="alert">{advanceError}</p>}
    <p id={keyboardHelpId} className="visually-hidden">On the scrubber, Space plays or pauses; arrow keys step; Home and End jump. Escape closes the scrubber, then settings, then returns Live. Buttons and settings fields keep their native keyboard activation.</p>
    {announcement}
  </section>;
}

function TimeScope({ playback, phoneView = false }) {
  const scope = playback.cursor.scope;
  const value = scope.kind === "storyline" ? `storyline:${scope.id}` : scope.kind;
  return <label className="time-bar__scope"><span>{phoneView ? "Apply time to" : "Scope"}</span><select aria-label={phoneView ? "Apply time to" : "Time scope"} value={value} onChange={event => {
    const [kind, ...parts] = event.target.value.split(":"), id = parts.join(":");
    if (kind === "storyline") playback.dispatch({ type: "setScene", sceneId: id });
    else playback.dispatch({ type: "cursorScope", scope: { kind, id: null } });
  }}><option value="page">{phoneView ? "This page" : "Page"}</option><option value="dashboard">{phoneView ? "All pages" : "Dashboard"}</option>
    {playback.scenes.length > 0 && <optgroup label="Storylines">{playback.scenes.map(scene => <option key={scene.id} value={`storyline:${scene.id}`}>{scene.name}</option>)}</optgroup>}
  </select></label>;
}
