import React from "react";
import ChronoDateOverlay from "./ChronoDateOverlay.jsx";
import { usePlayback } from "./PlaybackProvider.jsx";
import { MOBILE_VIEW_QUERY, useMediaQuery } from "../common/useMediaQuery.js";

export default function PlaybackSurface({ children, disabled = false, suspended = false, viewOwned = false }) {
  const playback = usePlayback();
  const phone = useMediaQuery(MOBILE_VIEW_QUERY);
  React.useEffect(() => {
    if (suspended && playback.playing) playback.dispatch({ type: "pause" });
  }, [playback.dispatch, playback.playing, suspended]);
  if (disabled) return children;
  const showStamp = !(viewOwned && phone) && (playback.cursor.mode === "at" || playback.exerciseTime !== null);
  return <>{children}{showStamp && <ChronoDateOverlay epochMs={playback.activeEpochMs} suspended={suspended} />}</>;
}
