import React from "react";

import PlaybackControls from "./PlaybackControls.jsx";
import { usePlayback } from "./PlaybackProvider.jsx";
import PlaybackView from "./PlaybackView.jsx";

export default function PlaybackSurface({
  children,
  entryBlocked = false,
  entryBlockedReason,
  accessibilityEnabled = false,
}) {
  const playback = usePlayback();
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
