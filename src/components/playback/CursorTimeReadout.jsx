import React from "react";
import { canonicalPlaybackTime } from "./playbackTimeLabel.js";

export default function CursorTimeReadout({ mode = "live", epochMs }) {
  const available = Number.isFinite(epochMs);
  const Tag = available ? "time" : "span";
  return <Tag className="cursor-time-readout" aria-live="off" data-cursor-stamp={mode}
    {...(available ? { dateTime: new Date(epochMs).toISOString() } : {})}>
    {mode === "live" ? "Live" : "At"}{available ? ` · ${canonicalPlaybackTime(epochMs)} UTC` : " · No observation time"}
  </Tag>;
}
