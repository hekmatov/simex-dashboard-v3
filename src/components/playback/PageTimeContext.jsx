import React from "react";

import { canonicalPlaybackTime } from "./playbackTimeLabel.js";
import { usePlayback } from "./PlaybackProvider.jsx";

export const PAGE_TIME_OWNER = "page-time";

export default function PageTimeContext() {
  const playback = usePlayback();
  const active = playback.playbackView === true;
  const label = active && playback.activeEpochMs !== null
    ? `${canonicalPlaybackTime(playback.activeEpochMs)} · ${playback.sourceLabel}`
    : active ? `No frames · ${playback.sourceLabel}` : "Latest available";
  const toggle = () => {
    if (active) {
      playback.dispatch({ type: "closeView", owner: PAGE_TIME_OWNER });
      return;
    }
    playback.dispatch({ type: "setGroup", groupId: null });
    playback.dispatch({ type: "setScope", scope: "all-page" });
    playback.dispatch({ type: "openView", owner: PAGE_TIME_OWNER });
  };
  return (
    <div className="page-time-context" data-page-time-active={active ? "true" : "false"}>
      <span className="page-time-context__label">Page time</span>
      <output className="page-time-context__value" aria-live="polite">{label}</output>
      <button type="button" className="secondary page-time-context__toggle" aria-pressed={active} onClick={toggle}>
        {active ? "Exit page time" : "Set page time"}
      </button>
    </div>
  );
}
