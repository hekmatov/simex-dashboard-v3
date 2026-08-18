import React from "react";

import ChronoController from "./ChronoController.jsx";
import PlaybackControls from "./PlaybackControls.jsx";
import { usePlayback } from "./PlaybackProvider.jsx";
import PlaybackView from "./PlaybackView.jsx";

export default function PlaybackSurface({
  children,
  entryBlocked = false,
  entryBlockedReason,
  accessibilityEnabled = false,
  viewOwned = false,
}) {
  const playback = usePlayback();

  if (viewOwned) {
    return React.createElement(
      React.Fragment,
      null,
      playback.playbackView === true
        ? React.createElement(PlaybackView, { accessibilityEnabled })
        : null,
      children,
      playback.playbackView === true
        ? React.createElement(ChronoController)
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
