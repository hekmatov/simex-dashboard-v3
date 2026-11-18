import React from "react";
import { APP_VERSION } from "../../lib/appVersion.js";
import "./ExerciseContextStamp.css";

// Shared photographable context. The surface owns placement; the stamp never
// implies content acceptance or introduces controls on passive output.
export default function ExerciseContextStamp({ variant = "compact", className = "" } = {}) {
  const resolvedVariant = ["compact", "fullscreen", "audience"].includes(variant) ? variant : "compact";
  return (
    <span
      className={`exercise-context-stamp exercise-context-stamp--${resolvedVariant}${className ? ` ${className}` : ""}`}
      data-exercise-context-stamp={resolvedVariant}
    >
      <span className="exercise-context-stamp__notice" data-exercise-notice="true">Fictional scenario · Exercise use only</span>
      <span className="exercise-context-stamp__version" data-app-version={APP_VERSION}>App version {APP_VERSION}</span>
    </span>
  );
}
