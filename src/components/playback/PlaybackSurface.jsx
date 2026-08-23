import React from "react";

import ChronoController from "./ChronoController.jsx";
import ChronoDateOverlay from "./ChronoDateOverlay.jsx";
import PlaybackControls from "./PlaybackControls.jsx";
import { usePlayback } from "./PlaybackProvider.jsx";
import PlaybackView from "./PlaybackView.jsx";

export default function PlaybackSurface({
  children,
  entryBlocked = false,
  entryBlockedReason,
  accessibilityEnabled = false,
  disabled = false,
  viewOwned = false,
  suspended = false,
}) {
  const playback = usePlayback();

  React.useEffect(() => {
    if (suspended && playback.playbackView && playback.playing) {
      playback.dispatch({ type: "pause" });
    }
  }, [playback.dispatch, playback.playbackView, playback.playing, suspended]);

  if (disabled) return children;

  if (viewOwned) {
    return React.createElement(
      React.Fragment,
      null,
      children,
      playback.playbackView === true
        ? React.createElement(React.Fragment, null,
            React.createElement("div", {
              hidden: suspended,
              "data-chrono-controller-layer": true,
            }, React.createElement(ChronoController)),
            React.createElement(ChronoDateOverlay, {
              epochMs: playback.activeEpochMs,
              suspended,
            }))
        : null,
    );
  }

  return React.createElement(
    React.Fragment,
    null,
    playback.groups.length > 0
      ? React.createElement(PlaybackControls, {
          entryBlocked,
          entryBlockedReason,
        })
      : null,
    playback.playbackView === true
      ? React.createElement(PlaybackView, { accessibilityEnabled })
      : children,
  );
}
